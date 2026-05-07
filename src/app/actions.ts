"use server";

import { discogsService } from "@/lib/discogs/services";
import { DiscogsSearchResponse } from "@/lib/discogs/types";
import { telegram } from "@/lib/telegram";
import { redis } from "@/lib/redis";
import { Radar } from "@/lib/discogs/types";

export async function searchDiscogsAction(
  query: string, 
  options?: { format?: string; year?: string; onlyInStock?: boolean; currency?: string }
): Promise<{ success: boolean; data?: DiscogsSearchResponse; error?: string }> {
  try {
    if (!query) {
      return { success: false, error: "Search query is empty" };
    }

    const searchCacheKey = `search_v_aggressive:${query}:${JSON.stringify(options)}`;
    
    // 1. Parallel fetching: Regular search + Marketplace search
    // By adding 'status: for sale', Discogs is more likely to return lowest_price in the results
    const [regularResults, marketResults] = await Promise.all([
      discogsService.searchDatabase(query, {
        format: options?.format !== "Vinyl" ? options?.format : undefined,
        year: options?.year || undefined,
        currency: options?.currency,
        page: 1
      }),
      discogsService.searchDatabase(query, {
        format: options?.format !== "Vinyl" ? options?.format : undefined,
        year: options?.year || undefined,
        currency: options?.currency,
        status: "for sale",
        page: 1
      }).catch(() => ({ results: [] }))
    ]);

    // Combine results from both sources
    let allResults = [...(marketResults.results || []), ...(regularResults.results || [])];
    
    // Deduplicate by ID
    const seen = new Set();
    allResults = allResults.filter(item => {
      if (!item.id || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });

    // 2. BACKGROUND ENRICHMENT: Fetch marketplace stats for the top 15 results
    // We only do this for results that don't have price data yet
    const enrichedResults = await Promise.all(
      allResults.slice(0, 15).map(async (item) => {
        // Try cache first
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
          
          // If NOT in cache and NO price in search result, and it's a Release (not Master)
          // We fetch stats in parallel (limited to 15 to avoid Rate Limit)
          if (!item.lowest_price && item.type === 'release') {
             const stats = await discogsService.getReleaseStats(item.id, options?.currency);
             if (stats && stats.lowest_price) {
               const enrichedItem = {
                 ...item,
                 lowest_price: stats.lowest_price.value,
                 num_for_sale: stats.num_for_sale
               };
               // Save to cache for next time
               await discogsService.redis.set(itemCacheKey, { stats, num_for_sale: stats.num_for_sale }, { ex: 3600 });
               return enrichedItem;
             }
          }
        } catch (e) {}
        return item;
      })
    );

    let finalResults = [
      ...enrichedResults, 
      ...allResults.slice(15)
    ];

    // 3. Sorting: Items with prices ALWAYS first
    finalResults = finalResults.sort((a, b) => {
      const hasA = (a.lowest_price != null || (a.num_for_sale ?? 0) > 0);
      const hasB = (b.lowest_price != null || (b.num_for_sale ?? 0) > 0);
      
      if (hasA && !hasB) return -1;
      if (!hasA && hasB) return 1;
      
      return 0;
    });

    // 4. Filtering for "Only in Stock"
    if (options?.onlyInStock) {
      finalResults = finalResults.filter(r => {
        const hasPrice = (r.lowest_price != null);
        const hasStock = (r.num_for_sale != null && Number(r.num_for_sale) > 0);
        return hasPrice || hasStock;
      });
    }

    const finalData: any = { 
      pagination: regularResults.pagination || { items: 0, per_page: 100, page: 1, pages: 0, urls: {} },
      results: finalResults 
    };

    return { success: true, data: finalData };
  } catch (error: any) {
    console.error("Search Action Error:", error);
    return { success: false, error: "Search service temporarily unavailable" };
  }
}

export async function getReleaseDetailsAction(releaseId: number, currency?: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const cacheKey = `release_market_data:${releaseId}:${currency || 'USD'}`;
    
    // Try cache
    try {
      const cached = await discogsService.redis.get<any>(cacheKey);
      if (cached && cached.stats) return { success: true, data: cached };
    } catch (e) {}

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

    if (enrichedData.stats && !enrichedData.stats.currency && currency) {
      enrichedData.stats.currency = currency;
    }

    try {
      await discogsService.redis.set(cacheKey, enrichedData, { ex: 86400 });
    } catch (e) {}

    return { success: true, data: enrichedData };
  } catch (error: any) {
    console.error("Failed to fetch release details:", error);
    return { success: false, error: error.message || "Failed to fetch details" };
  }
}

/**
 * REDIS ACTIONS FOR RADARS
 */
const RADARS_KEY_PREFIX = "vinyl_radars:";

export async function getRadarsAction(userId: string = "default"): Promise<{ success: boolean; data?: Radar[]; error?: string }> {
  try {
    const radars = await redis.get<Radar[]>(`${RADARS_KEY_PREFIX}${userId}`);
    return { success: true, data: radars || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function saveRadarAction(radar: Radar, userId: string = "default"): Promise<{ success: boolean; error?: string }> {
  try {
    const radars = await redis.get<Radar[]>(`${RADARS_KEY_PREFIX}${userId}`) || [];
    const existingIndex = radars.findIndex(r => r.id === radar.id);
    if (existingIndex > -1) radars[existingIndex] = radar;
    else radars.unshift(radar);
    await redis.set(`${RADARS_KEY_PREFIX}${userId}`, radars);
    return { success: true };
  } catch (error: any) {
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
      `💰 Цена: <b>$25.00</b> (Ваш лимит: $30.00)`;
    await telegram.sendMessage(chatId, sampleCaption, { reply_markup: { inline_keyboard: [[{ text: "🛒 Купить", url: "https://www.discogs.com" }]] } });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
