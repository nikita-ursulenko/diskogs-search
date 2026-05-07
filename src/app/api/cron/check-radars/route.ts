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
          let currentPrice: number | undefined;
          let currentReleaseId = radar.releaseId;
          
          if (radar.masterId) {
            // Если включено отслеживание Master Release — ищем самое дешевое предложение среди всех версий
            const cheapestVersion = await discogsService.getCheapestFromMaster(radar.masterId);
            currentPrice = cheapestVersion?.lowest_price;
            if (cheapestVersion) currentReleaseId = cheapestVersion.id;
          } else {
            // Обычное отслеживание конкретного релиза
            const details = await discogsService.getReleaseDetails(radar.releaseId);
            currentPrice = details.lowest_price;
          }
          
          if (!currentPrice) continue;
          
          const targetPrice = parseFloat(radar.maxPrice);
          
          // 3. Условие уведомления:
          // - Цена ниже или равна лимиту пользователя
          // - И цена изменилась (упала) по сравнению с последним уведомлением
          if (currentPrice <= targetPrice && (!radar.lastPrice || currentPrice < radar.lastPrice)) {
            
            const caption = `🎯 <b>VinylSniper: Находка!</b>\n\n` +
              `📦 <b>${radar.artist} — ${radar.release}</b>\n` +
              `${radar.masterId ? '💿 <i>(Любая версия альбома)</i>\n' : ''}` +
              `💰 Цена: <b>$${currentPrice}</b> (Лимит: $${radar.maxPrice})`;
            
            const reply_markup = {
              inline_keyboard: [
                [
                  { text: "🛒 Купить на Marketplace", url: `https://www.discogs.com/sell/release/${currentReleaseId}?ev=rb` }
                ],
                [
                  { text: "🔍 Детали релиза", url: `https://www.discogs.com/release/${currentReleaseId}` }
                ]
              ]
            };

            if (radar.thumb) {
              await telegram.sendPhoto(chatId, radar.thumb, caption, { reply_markup });
            } else {
              await telegram.sendMessage(chatId, caption, { reply_markup });
            }
            
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
