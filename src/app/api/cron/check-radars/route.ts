import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { discogsService } from '@/lib/discogs/services';
import { telegram } from '@/lib/telegram';
import { Radar } from '@/lib/discogs/types';

export const dynamic = 'force-dynamic';

/**
 * CRON Job: Проверка всех активных радаров и отправка уведомлений.
 * Вызывается внешним планировщиком (например, Vercel Cron).
 */
export async function GET() {
  try {
    // 1. Получаем все ключи радаров (всех пользователей)
    const keys = await redis.keys('vinyl_radars:*');
    let notificationsSent = 0;
    
    for (const key of keys) {
      const chatId = key.replace('vinyl_radars:', '');
      
      // 1.5 Проверяем настройки пользователя: включен ли авто-поиск
      const settings = await redis.get<any>(`user_settings:${chatId}`);
      if (settings && settings.autoSearch === false) {
        continue; // Пропускаем пользователя, если авто-поиск выключен
      }

      const radars = await redis.get<Radar[]>(key) || [];
      let hasUpdates = false;
      
      for (const radar of radars) {
        if (!radar.active) continue;
        
        try {
          // 2. Проверяем текущие цены на Discogs
          const details = await discogsService.getReleaseDetails(radar.releaseId);
          const currentPrice = details.lowest_price;
          
          if (!currentPrice) continue;
          
          const targetPrice = parseFloat(radar.maxPrice);
          
          // 3. Условие уведомления:
          // - Цена ниже или равна лимиту пользователя
          // - И цена изменилась (упала) по сравнению с последним уведомлением
          if (currentPrice <= targetPrice && (!radar.lastPrice || currentPrice < radar.lastPrice)) {
            
            const message = `🎯 <b>VinylSniper: Находка!</b>\n\n` +
              `📦 <b>${radar.artist} — ${radar.release}</b>\n` +
              `💰 Цена упала до: <b>$${currentPrice}</b>\n` +
              `📉 Ваш лимит: $${radar.maxPrice}\n\n` +
              `🔗 <a href="https://www.discogs.com/release/${radar.releaseId}">Открыть на Discogs</a>`;
            
            await telegram.sendMessage(chatId, message);
            
            radar.lastPrice = currentPrice;
            hasUpdates = true;
            notificationsSent++;
          }
        } catch (e) {
          console.error(`Error checking radar ${radar.id}:`, e);
        }
      }
      
      // 4. Если цены обновились, сохраняем изменения
      if (hasUpdates) {
        await redis.set(key, radars);
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      processed_keys: keys.length,
      notifications_sent: notificationsSent 
    });
  } catch (error: any) {
    console.error("Cron Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
