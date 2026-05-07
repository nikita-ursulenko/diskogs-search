import { NextResponse } from 'next/server';
import { telegram } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

/**
 * TELEGRAM WEBHOOK HANDLER
 * Принимает сообщения от бота и отвечает на них.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Проверяем, что это сообщение
    if (body.message && body.message.text) {
      const chatId = body.message.chat.id;
      const text = body.message.text;

      if (text === '/start') {
        const welcomeMessage = 
          `👋 <b>Привет! Я VinylSniper.</b>\n\n` +
          `Я помогу тебе найти редкие пластинки на Discogs по твоим ценам.\n\n` +
          `🚀 Нажми на кнопку ниже, чтобы запустить приложение и настроить свой первый радар!`;

        await telegram.sendMessage(chatId, welcomeMessage, {
          reply_markup: {
            inline_keyboard: [
              [
                { 
                  text: "🛰 Запустить VinylSniper", 
                  web_app: { url: "https://diskogs-search.vercel.app/" } 
                }
              ]
            ]
          }
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

/**
 * Метод для быстрой проверки статуса
 */
export async function GET() {
  return NextResponse.json({ status: "Webhook is active" });
}
