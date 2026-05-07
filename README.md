# 🎯 VinylSniper

**VinylSniper** — это премиальное Telegram Mini App для коллекционеров винила, которое позволяет отслеживать редкие релизы на маркетплейсе Discogs в реальном времени.

![VinylSniper Logo](./public/icon.png)

## ✨ Особенности

- **Умный поиск:** Мгновенный поиск по всей базе Discogs с фильтрацией по формату и году.
- **Мониторинг цен:** Быстрый просмотр минимальных цен и статистики продаж без лишних кликов.
- **Система Радаров:** Добавляйте интересующие вас издания в список отслеживания.
- **Telegram Native:** Полная интеграция с Telegram WebApp для бесшовного пользовательского опыта.
- **Премиальный UI:** Современный темный интерфейс с акцентами в стиле Glassmorphism и плавными анимациями.

## 🛠 Технологический стек

- **Framework:** [Next.js 16 (App Router)](https://nextjs.org/)
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com/)
- **Components:** [Shadcn UI](https://ui.shadcn.com/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **API:** [Discogs API](https://www.discogs.com/developers)
- **Integration:** [Telegram Web Apps SDK](https://core.telegram.org/bots/webapps)

## 🚀 Быстрый старт

### Требования
- Node.js 18+
- [Discogs API Token](https://www.discogs.com/settings/developers)

### Установка

1. Клонируйте репозиторий:
   ```bash
   git clone https://github.com/your-username/vinyl-sniper.git
   cd vinyl-sniper
   ```

2. Установите зависимости:
   ```bash
   npm install
   ```

3. Создайте файл `.env.local` в корне проекта:
   ```env
   DISCOGS_TOKEN=ваш_токен_здесь
   ```

4. Запустите сервер для разработки:
   ```bash
   npm run dev
   ```

## 🌍 Деплой на Vercel

1. Загрузите проект на GitHub.
2. Подключите репозиторий в [Vercel Dashboard](https://vercel.com).
3. Добавьте переменную окружения `DISCOGS_TOKEN`.
4. Нажмите **Deploy**.

## 📱 Настройка Telegram Бота

1. Создайте бота через [@BotFather](https://t.me/botfather).
2. Используйте команду `/newapp`, чтобы создать Mini App.
3. В качестве URL укажите адрес вашего деплоя на Vercel.
4. Настройте `inline mode` для быстрого доступа к приложению.

---
*Сделано с любовью к музыке и коду.* 🎧
