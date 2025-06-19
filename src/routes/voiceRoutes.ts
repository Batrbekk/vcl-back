import express from 'express';
import { getVoices, generateVoicePreview } from '../controllers/voiceController';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminMiddleware } from '../middleware/adminMiddleware';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Voices
 *   description: Управление голосами из ElevenLabs
 */

/**
 * @swagger
 * /api/voices:
 *   get:
 *     tags: [Voices]
 *     summary: Получение списка доступных голосов
 *     description: Возвращает список всех доступных голосов из ElevenLabs
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список голосов получен
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 */
router.get('/', [authMiddleware, adminMiddleware], getVoices);

/**
 * @swagger
 * /api/voices/{voiceId}/preview:
 *   post:
 *     tags: [Voices]
 *     summary: Генерация превью голоса
 *     description: Генерирует аудио превью для выбранного голоса
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: voiceId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 example: 'Это тестовое превью голоса'
 *               voice_settings:
 *                 $ref: '#/components/schemas/VoiceSettings'
 *     responses:
 *       200:
 *         description: Аудио превью сгенерировано
 *         content:
 *           audio/mpeg:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Ошибка валидации
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 */
router.post('/:voiceId/preview', [authMiddleware, adminMiddleware], generateVoicePreview);

export default router; 