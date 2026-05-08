/**
 * Simple Telegram Bot Client
 */
export const telegram = {
  async sendMessage(chatId: string, text: string, options: any = {}) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return;

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          ...options
        }),
      });
      return response.json();
    } catch (error) {
      console.error("Failed to send Telegram message:", error);
    }
  },

  async sendPhoto(chatId: string, photo: string, caption: string, options: any = {}) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return;

    const url = `https://api.telegram.org/bot${token}/sendPhoto`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          photo: photo,
          caption: caption,
          parse_mode: 'HTML',
          ...options
        }),
      });
      return response.json();
    } catch (error) {
      console.error("Failed to send Telegram photo:", error);
    }
  },

  /**
   * Verify data from Telegram WebApp
   */
  async verifyInitData(initData: string): Promise<{ success: boolean; user?: any }> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token || !initData) return { success: false };

    try {
      const urlParams = new URLSearchParams(initData);
      const hash = urlParams.get('hash');
      urlParams.delete('hash');

      const params = Array.from(urlParams.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

      const encoder = new TextEncoder();
      const secretKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode('WebAppData'),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      const signatureKey = await crypto.subtle.sign(
        'HMAC',
        secretKey,
        encoder.encode(token)
      );

      const dataKey = await crypto.subtle.importKey(
        'raw',
        signatureKey,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      const calculatedHash = await crypto.subtle.sign(
        'HMAC',
        dataKey,
        encoder.encode(params)
      );

      const hexHash = Array.from(new Uint8Array(calculatedHash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      if (hexHash !== hash) return { success: false };

      const user = JSON.parse(urlParams.get('user') || '{}');
      return { success: true, user };
    } catch (error) {
      console.error("Auth verification failed:", error);
      return { success: false };
    }
  }
};
