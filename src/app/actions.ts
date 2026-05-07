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

    // Enrich the first 6 results with prices to avoid "N/A" in the list
    // We limit this to 6 to respect Discogs API rate limits (60/min)
    const enrichedResults = await Promise.all(
      data.results.slice(0, 6).map(async (item) => {
        try {
          // Add a small delay between requests if needed, but parallel is usually okay for 6
          const details = await discogsService.getReleaseDetails(item.id);
          return {
            ...item,
            lowest_price: details.lowest_price,
            num_for_sale: details.num_for_sale
          };
        } catch (e) {
          console.error(`Failed to enrich result ${item.id}:`, e);
          return item;
        }
      })
    );

    return { 
      success: true, 
      data: { 
        ...data, 
        results: [
          ...enrichedResults, 
          ...data.results.slice(6)
        ] 
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
