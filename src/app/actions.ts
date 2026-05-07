"use server";

import { discogsService } from "@/lib/discogs/services";
import { DiscogsSearchResponse } from "@/lib/discogs/types";

export async function searchDiscogsAction(
  query: string, 
  options?: { format?: string; year?: string; onlyInStock?: boolean }
): Promise<{ success: boolean; data?: DiscogsSearchResponse; error?: string }> {
  try {
    if (!query) {
      return { success: false, error: "Search query is empty" };
    }

    const data = await discogsService.searchDatabase(query, {
      format: options?.format !== "Vinyl" ? options?.format : undefined,
      year: options?.year || undefined,
      status: options?.onlyInStock ? "for sale" : undefined,
    });

    // Enrich the first 12 results with prices to avoid "N/A" in the list
    const enrichedResults = await Promise.all(
      data.results.slice(0, 12).map(async (item) => {
        const cacheKey = `release_details:${item.id}`;
        try {
          // 1. Try to get from cache first
          const cached = await discogsService.redis.get<any>(cacheKey);
          if (cached) {
            return {
              ...item,
              lowest_price: cached.lowest_price,
              num_for_sale: cached.num_for_sale
            };
          }

          // 2. If not in cache, fetch from API
          const details = await discogsService.getReleaseDetails(item.id);
          
          // 3. Save to cache for 1 hour (3600 seconds)
          await discogsService.redis.set(cacheKey, {
            lowest_price: details.lowest_price,
            num_for_sale: details.num_for_sale
          }, { ex: 3600 });

          return {
            ...item,
            lowest_price: details.lowest_price,
            num_for_sale: details.num_for_sale
          };
        } catch (e) {
          console.error(`Failed to enrich/cache result ${item.id}:`, e);
          return item;
        }
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

export async function getReleaseDetailsAction(releaseId: number): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    // Parallel fetch for details and marketplace stats
    const [details, stats] = await Promise.all([
      discogsService.getReleaseDetails(releaseId),
      discogsService.getReleaseStats(releaseId).catch(() => null) // Stats might fail if never sold
    ]);

    return { success: true, data: { ...details, stats } };
  } catch (error: any) {
    console.error("Release Details Error:", error);
    return { success: false, error: error.message || "Failed to fetch release details" };
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
