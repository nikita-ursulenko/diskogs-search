/**
 * Simple Telegram Bot Client
 */
export const telegram = {
  async sendMessage(chatId: string, text: string, options: any = {}) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.error("TELEGRAM_BOT_TOKEN is not set");
      return;
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          ...options
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("Telegram API Error:", error);
      }
      
      return response.json();
    } catch (error) {
      console.error("Failed to send Telegram message:", error);
    }
  }
};
