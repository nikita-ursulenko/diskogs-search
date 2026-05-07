/**
 * Upstash KV client using native fetch.
 * This avoids dependency issues when @upstash/redis cannot be installed.
 */
export const redis = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const url = process.env.KV_REST_API_URL;
      const token = process.env.KV_REST_API_TOKEN;

      if (!url || !token) {
        console.error("Critical: Redis environment variables are missing!", { url: !!url, token: !!token });
        return null;
      }

      const response = await fetch(`${url}/get/${key}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
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

  async set(key: string, value: any, options?: { ex?: number }): Promise<void> {
    try {
      const url = process.env.KV_REST_API_URL;
      const token = process.env.KV_REST_API_TOKEN;

      if (!url || !token) {
        console.error("Critical: Redis environment variables are missing (SET)!");
        return;
      }

      let fetchUrl = `${url}/set/${key}`;
      if (options?.ex) {
        fetchUrl += `?ex=${options.ex}`;
      }
      
      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: typeof value === 'string' ? value : JSON.stringify(value),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Upstash Error: ${error}`);
      }
    } catch (error) {
      console.error("Redis Set Error:", error);
      throw error;
    }
  },

  async keys(pattern: string): Promise<string[]> {
    try {
      const url = process.env.KV_REST_API_URL;
      const token = process.env.KV_REST_API_TOKEN;

      if (!url || !token) {
        console.error("Critical: Redis environment variables are missing (KEYS)!");
        return [];
      }

      const response = await fetch(`${url}/keys/${pattern}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data.result || [];
    } catch (error) {
      console.error("Redis Keys Error:", error);
      return [];
    }
  }
};
