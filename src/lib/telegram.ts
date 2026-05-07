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
  }
};
