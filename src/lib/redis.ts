/**
 * Upstash KV client using native fetch.
 * This avoids dependency issues when @upstash/redis cannot be installed.
 */
export const redis = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const response = await fetch(`${process.env.KV_REST_API_URL}/get/${key}`, {
        headers: {
          Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
        },
        cache: 'no-store', // Always fetch fresh data for radars
      });
      
      if (!response.ok) return null;
      
      const data = await response.json();
      if (data.result === null) return null;
      
      // Upstash REST returns the result as a string if it was stored as an object
      if (typeof data.result === 'string') {
        try {
          return JSON.parse(data.result) as T;
        } catch {
          return data.result as T;
        }
      }
      
      return data.result as T;
    } catch (error) {
      console.error("Redis Get Error:", error);
      return null;
    }
  },

  async set(key: string, value: any): Promise<void> {
    try {
      const response = await fetch(`${process.env.KV_REST_API_URL}/set/${key}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
        },
        body: JSON.stringify(value),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Upstash Error: ${error}`);
      }
    } catch (error) {
      console.error("Redis Set Error:", error);
      throw error;
    }
  }
};
