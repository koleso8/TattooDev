require('dotenv').config();
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
        const response = await axios.post(
            'https://api.replicate.com/v1/predictions',
            {
                version: 'stability-ai/stable-diffusion:db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5',
                input: {
                    prompt: BASE_PROMPT + prompt,
                    num_outputs: 1,
                    num_inference_steps: 50,
                    guidance_scale: 7.5,
                },
            },
            {
                headers: {
                    Authorization: `Token ${REPLICATE_API_TOKEN}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const predictionId = response.data.id;

        // Ждём, пока изображение сгенерируется
        while (true) {
            const statusResponse = await axios.get(
                `https://api.replicate.com/v1/predictions/${predictionId}`,
                {
                    headers: {
                        Authorization: `Token ${REPLICATE_API_TOKEN}`,
                    },
                }
            );

            const status = statusResponse.data;
            if (status.status === 'succeeded') {
                return status.output[0]; // URL изображения
            } else if (status.status === 'failed') {
                throw new Error('Failed to generate image');
            }
            // Задержка перед следующим запросом
            await new Promise((resolve) => setTimeout(resolve, 2000));
        }
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