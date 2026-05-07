"use server";

import { discogsService } from "@/lib/discogs/services";
import { DiscogsSearchResponse } from "@/lib/discogs/types";
import { telegram } from "@/lib/telegram";

export async function searchDiscogsAction(
  query: string, 
  options?: { format?: string; year?: string; onlyInStock?: boolean; currency?: string }
): Promise<{ success: boolean; data?: DiscogsSearchResponse; error?: string }> {
  try {
    if (!query) {
      return { success: false, error: "Search query is empty" };
    }

    // Try to get from cache first
    const searchCacheKey = `search_v2:${query}:${JSON.stringify(options)}`;
    try {
      const cachedSearch = await discogsService.redis.get<any>(searchCacheKey);
      if (cachedSearch) {
        return { success: true, data: cachedSearch };
      }
    } catch (e) {
      console.error("Search cache error:", e);
    }

    const data = await discogsService.searchDatabase(query, {
      format: options?.format !== "Vinyl" ? options?.format : undefined,
      year: options?.year || undefined,
      status: options?.onlyInStock ? "for sale" : undefined,
      currency: options?.currency
    });

    // Enrich the first 12 results with prices to avoid "N/A" in the list
    const enrichedResults = await Promise.all(
      data.results.slice(0, 12).map(async (item) => {
        const itemCacheKey = `release_market_data:${item.id}:${options?.currency || 'USD'}`;
        try {
          const cached = await discogsService.redis.get<any>(itemCacheKey);
          if (cached) {
            return {
              ...item,
              lowest_price: cached.stats?.lowest_price?.value || cached.lowest_price || item.lowest_price,
              num_for_sale: cached.num_for_sale ?? item.num_for_sale
            };
          }
        } catch (e) {}
        return item;
      })
    );

    let finalResults = [
      ...enrichedResults, 
      ...data.results.slice(12)
    ];

    // If onlyInStock is true, filter out everything that doesn't have a price or stock count
    if (options?.onlyInStock) {
      finalResults = finalResults.filter(r => (r.num_for_sale ?? 0) > 0 || (r.lowest_price !== undefined && r.lowest_price !== null));
    }

    return { 
      success: true, 
      data: { 
        ...data, 
        results: finalResults
      } 
    };
  } catch (error: any) {
    console.error("Server Action Error:", error);
    return { success: false, error: error.message || "Failed to search Discogs" };
  }
}

export async function getReleaseDetailsAction(releaseId: number, currency?: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const cacheKey = `release_market_data:${releaseId}:${currency || 'USD'}`;
    
    // 1. Try to get from cache first
    try {
      const cached = await discogsService.redis.get<any>(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }
    } catch (e) {
      console.error("Redis cache error:", e);
    }

    // 2. Fetch fresh data in parallel
    const [details, stats, suggestions] = await Promise.all([
      discogsService.getReleaseDetails(releaseId),
      discogsService.getReleaseStats(releaseId, currency),
      discogsService.getPriceSuggestions(releaseId, currency)
    ]);

    const enrichedData = {
      ...details,
      stats: stats || details.community?.rating || {},
      suggestions: suggestions || {}
    };

    // Add fallback currency info if stats are present
    if (enrichedData.stats && !enrichedData.stats.currency && currency) {
      enrichedData.stats.currency = currency;
    }

    // 3. Save to cache (24 hours)
    try {
      await discogsService.redis.set(cacheKey, enrichedData, { ex: 86400 });
    } catch (e) {
      console.error("Redis save error:", e);
    }

    return { success: true, data: enrichedData };
  } catch (error: any) {
    console.error("Failed to fetch release details:", error);
    return { success: false, error: error.message || "Failed to fetch details from Discogs" };
  }
}

/**
 * REDIS ACTIONS FOR RADARS
 */
import { redis } from "@/lib/redis";
import { Radar } from "@/lib/discogs/types";

const RADARS_KEY_PREFIX = "vinyl_radars:";

export async function getRadarsAction(userId: string = "default"): Promise<{ success: boolean; data?: Radar[]; error?: string }> {
  try {
    const radars = await redis.get<Radar[]>(`${RADARS_KEY_PREFIX}${userId}`);
    return { success: true, data: radars || [] };
  } catch (error: any) {
    console.error("Redis Get Error:", error);
    return { success: false, error: error.message };
  }
}

export async function saveRadarAction(radar: Radar, userId: string = "default"): Promise<{ success: boolean; error?: string }> {
  try {
    const radars = await redis.get<Radar[]>(`${RADARS_KEY_PREFIX}${userId}`) || [];
    const existingIndex = radars.findIndex(r => r.id === radar.id);
    
    if (existingIndex > -1) {
      radars[existingIndex] = radar;
    } else {
      radars.unshift(radar);
    }
    
    await redis.set(`${RADARS_KEY_PREFIX}${userId}`, radars);
    return { success: true };
  } catch (error: any) {
    console.error("Redis Save Error:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteRadarAction(radarId: string, userId: string = "default"): Promise<{ success: boolean; error?: string }> {
  try {
    const radars = await redis.get<Radar[]>(`${RADARS_KEY_PREFIX}${userId}`) || [];
    const filtered = radars.filter(r => r.id !== radarId);
    await redis.set(`${RADARS_KEY_PREFIX}${userId}`, filtered);
    return { success: true };
  } catch (error: any) {
    console.error("Redis Delete Error:", error);
    return { success: false, error: error.message };
  }
}

export async function toggleRadarAction(radarId: string, userId: string = "default"): Promise<{ success: boolean; error?: string }> {
  try {
    const radars = await redis.get<Radar[]>(`${RADARS_KEY_PREFIX}${userId}`) || [];
    const updated = radars.map(r => r.id === radarId ? { ...r, active: !r.active } : r);
    await redis.set(`${RADARS_KEY_PREFIX}${userId}`, updated);
    return { success: true };
  } catch (error: any) {
    console.error("Redis Toggle Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * USER SETTINGS ACTIONS
 */
export type UserSettings = {
  notifications: boolean;
  autoSearch: boolean;
  currency: string;
};

const SETTINGS_KEY_PREFIX = "user_settings:";

export async function getUserSettingsAction(userId: string = "default"): Promise<{ success: boolean; data?: UserSettings; error?: string }> {
  try {
    const settings = await redis.get<UserSettings>(`${SETTINGS_KEY_PREFIX}${userId}`);
    return { 
      success: true, 
      data: settings || { notifications: true, autoSearch: true, currency: "USD" } 
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateUserSettingsAction(userId: string, settings: Partial<UserSettings>): Promise<{ success: boolean; error?: string }> {
  try {
    const current = await redis.get<UserSettings>(`${SETTINGS_KEY_PREFIX}${userId}`) || { notifications: true, autoSearch: true, currency: "USD" };
    const updated = { ...current, ...settings };
    await redis.set(`${SETTINGS_KEY_PREFIX}${userId}`, updated);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
export async function testNotificationAction(chatId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const sampleCaption = `🎯 <b>VinylSniper: ТЕСТОВАЯ НАХОДКА!</b>\n\n` +
      `📦 <b>Pink Floyd — The Dark Side Of The Moon</b>\n` +
      `💿 <i>(Limited Edition, Remastered)</i>\n` +
      `🌍 Регион: <b>United Kingdom</b>\n` +
      `💰 Цена: <b>$25.00</b> (Ваш лимит: $30.00)`;
    
    const reply_markup = {
      inline_keyboard: [
        [
          { text: "🛒 Тест покупки", url: "https://www.discogs.com" }
        ]
      ]
    };

    await telegram.sendMessage(chatId, sampleCaption, { reply_markup });
    
    return { success: true };
  } catch (error: any) {
    console.error("Test Notification Error:", error);
    return { success: false, error: error.message };
  }
}
