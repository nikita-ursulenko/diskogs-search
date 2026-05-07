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
export async function GET(req: Request) {
  try {
    // 0. Проверка секретного ключа для безопасности
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');
    
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

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
      const userCurrency = settings?.currency || 'USD';
      const currencyMap: any = { 'USD': '$', 'EUR': '€', 'GBP': '£' };
      const symbol = currencyMap[userCurrency] || '$';

      let hasUpdates = false;
      
      for (const radar of radars) {
        if (!radar.active) continue;
        
        try {
          // 2. Проверяем текущие цены на Discogs с учетом валюты пользователя
          let currentPrice: number | undefined;
          let currentReleaseId = radar.releaseId;
          
          if (radar.masterId) {
            const cheapestVersion = await discogsService.getCheapestFromMaster(radar.masterId, radar.country, userCurrency);
            currentPrice = cheapestVersion?.lowest_price;
            if (cheapestVersion) currentReleaseId = cheapestVersion.id;
          } else if (radar.country) {
            const cheapestInCountry = await discogsService.getCheapestFromRelease(radar.releaseId, radar.country, userCurrency);
            currentPrice = cheapestInCountry?.lowest_price;
            if (cheapestInCountry) currentReleaseId = cheapestInCountry.id;
          } else {
            // Обычное отслеживание (весь мир) - используем поиск чтобы передать валюту
            const cheapestAnywhere = await discogsService.getCheapestFromRelease(radar.releaseId, undefined, userCurrency);
            currentPrice = cheapestAnywhere?.lowest_price;
          }
          
          if (!currentPrice) continue;
          
          const targetPrice = parseFloat(radar.maxPrice);
          
          if (currentPrice <= targetPrice && (!radar.lastPrice || currentPrice < radar.lastPrice)) {
            
            const caption = `🎯 <b>VinylSniper: Находка!</b>\n\n` +
              `📦 <b>${radar.artist} — ${radar.release}</b>\n` +
              `${radar.masterId ? '💿 <i>(Любая версия альбома)</i>\n' : ''}` +
              `${radar.country ? `🌍 Регион: <b>${radar.country}</b>\n` : ''}` +
              `💰 Цена: <b>${currentPrice}${symbol}</b> (Лимит: ${radar.maxPrice}${symbol})`;
            
            const reply_markup = {
              inline_keyboard: [
                [
                  { text: "🛒 Купить на Marketplace", url: `https://www.discogs.com/sell/release/${currentReleaseId}?ev=rb&curr=${userCurrency}` }
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
