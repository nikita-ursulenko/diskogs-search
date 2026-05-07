import { discogs } from "./client";
import { DiscogsSearchResponse } from "./types";

export const discogsService = {
  /**
   * Search the Discogs Database for releases.
   * @param query General search query (Artist + Title)
   * @param params Optional filters like year or format
   */
  async searchDatabase(
    query: string,
    params?: { year?: string; format?: string; type?: "release" | "master"; status?: string }
  ): Promise<DiscogsSearchResponse> {
    const searchParams = new URLSearchParams();
    
    if (query) searchParams.append("q", query);
    
    searchParams.append("per_page", "50");
    
    // We strictly want to track "releases" or "masters" for the sniper
    searchParams.append("type", params?.type || "release");
    
    if (params?.status) searchParams.append("status", params.status);
    if (params?.year) searchParams.append("year", params.year);
    if (params?.format && params.format !== "Vinyl") searchParams.append("format", params.format);
    
    // For general "Любой винил", we can pass "Vinyl" to Discogs format
    if (params?.format === "Vinyl") {
      searchParams.append("format", "Vinyl");
    }

    const endpoint = `/database/search?${searchParams.toString()}`;
    return discogs.request<DiscogsSearchResponse>(endpoint);
  },

  /**
   * Get specific details about a release.
   */
  async getReleaseDetails(releaseId: number) {
    const endpoint = `/releases/${releaseId}`;
    return discogs.request<any>(endpoint);
  },

  /**
   * Get marketplace stats (low, median, high price history).
   */
  async getReleaseStats(releaseId: number) {
    const endpoint = `/marketplace/stats/${releaseId}`;
    return discogs.request<any>(endpoint);
  },

  /**
   * Find the cheapest available release within a Master Release.
   */
  async getCheapestFromMaster(masterId: number, shipsFrom?: string) {
    const searchParams = new URLSearchParams({
      master_id: masterId.toString(),
      type: "release",
      sort: "price",
      sort_order: "asc",
      per_page: "1"
    });
    if (shipsFrom) searchParams.append("ships_from", shipsFrom);

    const endpoint = `/database/search?${searchParams.toString()}`;
    const response = await discogs.request<DiscogsSearchResponse>(endpoint);
    return response.results?.[0] || null;
  },

  /**
   * Find the cheapest available listing for a specific release with country filter.
   */
  async getCheapestFromRelease(releaseId: number, shipsFrom?: string) {
    const searchParams = new URLSearchParams({
      release_id: releaseId.toString(),
      type: "release",
      sort: "price",
      sort_order: "asc",
      per_page: "1"
    });
    if (shipsFrom) searchParams.append("ships_from", shipsFrom);

    const endpoint = `/database/search?${searchParams.toString()}`;
    const response = await discogs.request<DiscogsSearchResponse>(endpoint);
    return response.results?.[0] || null;
  }
};
