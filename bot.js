require('dotenv').config();

import Replicate from "replicate";

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

const { Telegraf } = require('telegraf');
const axios = require('axios');

// Токены из .env
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

// Проверка, что токены загружены
if (!TELEGRAM_TOKEN || !REPLICATE_API_TOKEN) {
    console.error('Ошибка: TELEGRAM_TOKEN или REPLICATE_API_TOKEN не указаны в .env');
    process.exit(1);
}

// Базовый промпт для олдскул-стиля
const BASE_PROMPT = 'old school tattoo style, bold lines, vintage design, black and white, ';

// Инициализация бота
const bot = new Telegraf(TELEGRAM_TOKEN);

// Функция для генерации изображения через Replicate
async function generateImage(prompt) {
    try {
        // Отправляем запрос на генерацию

        const input = {
            raw: false,
            prompt: BASE_PROMPT + prompt,
            aspect_ratio: "3:2",
            output_format: "jpg",
            safety_tolerance: 2,
            image_prompt_strength: 0.1
        };
        const response = await replicate.run("black-forest-labs/flux-1.1-pro-ultra", { input });

        return response.url()

    } catch (error) {
        console.error('Error generating image:', error.message);
        return null;
    }
}

// Обработчик команды /start
bot.command('start', (ctx) => {
    ctx.reply('Привет! Напиши, что должно быть на тату (например, "орёл и череп"), и я сгенерирую эскиз в олдскул-стиле!');
});

// Обработчик текстовых сообщений
bot.on('text', async (ctx) => {
    const userInput = ctx.message.text;
    await ctx.reply('Генерирую эскиз, подожди немного...');

    // Генерируем изображение
    const imageUrl = await generateImage(userInput);
    if (imageUrl) {
        await ctx.replyWithPhoto(imageUrl);
    } else {
        await ctx.reply('Что-то пошло не так, попробуй снова!');
    }
});

// Запуск бота
bot.launch().then(() => {
    console.log('Бот запущен...');
});

// Обработка graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));