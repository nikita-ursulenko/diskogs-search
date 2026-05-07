import { logger } from "../logger";

const DISCOGS_API_URL = "https://api.discogs.com";

export class DiscogsClient {
  private token: string;

  constructor() {
    const token = process.env.DISCOGS_TOKEN;
    if (!token) {
      logger.warn("DISCOGS_TOKEN is missing in environment variables.");
    }
    this.token = token || "";
  }

  /**
   * Internal fetch wrapper that handles Auth, Headers, and basic Rate Limit tracking.
   * Includes a simple retry mechanism for 502/504 errors.
   */
  async request<T>(endpoint: string, options: RequestInit = {}, retries = 2): Promise<T> {
    const url = `${DISCOGS_API_URL}${endpoint}`;
    
    const headers = new Headers(options.headers);
    headers.set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 VinylSniper/1.0");
    headers.set("Accept", "application/json");
    
    if (this.token) {
      headers.set("Authorization", `Discogs token=${this.token}`);
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Basic Rate Limit Logging
      const limitRemaining = response.headers.get("X-Discogs-Ratelimit-Remaining");
      if (limitRemaining && parseInt(limitRemaining, 10) < 5) {
        logger.warn(`Discogs API Rate Limit CRITICAL: ${limitRemaining} remaining`);
      }

      if (!response.ok) {
        // Retry on 502/504 errors which are common for Discogs
        if ((response.status === 502 || response.status === 504) && retries > 0) {
          logger.warn(`Discogs API returned ${response.status}. Retrying... (${retries} left)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return this.request<T>(endpoint, options, retries - 1);
        }

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(`Discogs API Error ${response.status}: ${errorData.message || JSON.stringify(errorData)}`);
        } else {
          throw new Error(`Discogs API returned non-JSON response (Status ${response.status}). The service might be temporarily unavailable.`);
        }
      }

      return (await response.json()) as T;
    } catch (error: any) {
      if (retries > 0 && (error.message.includes("502") || error.message.includes("504"))) {
         return this.request<T>(endpoint, options, retries - 1);
      }
      
      // Don't log 404 or 403 as errors (they are often handled gracefully as "no data")
      if (!error.message.includes("404") && !error.message.includes("403")) {
        logger.error(`Failed to fetch ${endpoint}`, error.message);
      }
      throw error;
    }
  }
}

export const discogs = new DiscogsClient();
