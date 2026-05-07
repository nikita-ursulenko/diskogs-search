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

    return { success: true, data };
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
