import express from 'express';
import {
  createAgent,
  getAgents,
  getAgentById,
  updateAgent,
  deleteAgent,
  updateAgentStatus,
  startAgentCall,
  getCallSummary,
  generateVoicePreview,
  updateVoiceSettings
} from '../controllers/agentController';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminMiddleware } from '../middleware/adminMiddleware';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Agents
 *   description: Управление голосовыми AI-агентами (только для администраторов)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     VoiceSettings:
 *       type: object
 *       required:
 *         - stability
 *         - similarity_boost
 *         - speaking_rate
 *         - pitch
 *         - emotion
 *       properties:
 *         stability:
 *           type: number
 *           minimum: 0
 *           maximum: 1
 *           example: 0.75
 *         similarity_boost:
 *           type: number
 *           minimum: 0
 *           maximum: 1
 *           example: 0.85
 *         speaking_rate:
 *           type: number
 *           minimum: 0.5
 *           maximum: 2.0
 *           example: 1.0
 *         pitch:
 *           type: number
 *           minimum: -20
 *           maximum: 20
 *           example: 0
 *         emotion:
 *           type: string
 *           enum: [cheerful, neutral, sad, angry]
 *           example: cheerful
 *     AllowedHours:
 *       type: object
 *       required:
 *         - start
 *         - end
 *         - timezone
 *       properties:
 *         start:
 *           type: string
 *           pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *           example: '10:00'
 *         end:
 *           type: string
 *           pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *           example: '18:00'
 *         timezone:
 *           type: string
 *           example: 'Asia/Almaty'
 *     Agent:
 *       type: object
 *       required:
 *         - name
 *         - description
 *         - voice_id
 *         - voice_settings
 *         - language
 *         - gender
 *         - greeting_template
 *         - fallback_template
 *         - summary_template
 *         - allowed_hours
 *         - ai_model
 *         - ai_context_prompt
 *         - phone_number
 *       properties:
 *         name:
 *           type: string
 *           example: 'Анна'
 *         description:
 *           type: string
 *           example: 'AI-агент по первичным продажам'
 *         voice_id:
 *           type: string
 *           example: 'ru-anna-v1'
 *         voice_settings:
 *           $ref: '#/components/schemas/VoiceSettings'
 *         language:
 *           type: string
 *           example: 'ru-RU'
 *         gender:
 *           type: string
 *           enum: [male, female]
 *           example: 'female'
 *         greeting_template:
 *           type: string
 *           example: 'Здравствуйте! Я Анна, менеджер компании VCL.'
 *         fallback_template:
 *           type: string
 *           example: 'Извините, я не расслышала. Можете повторить?'
 *         summary_template:
 *           type: string
 *           example: 'Подвести итог разговора и отправить менеджеру'
 *         allowed_hours:
 *           $ref: '#/components/schemas/AllowedHours'
 *         integrated_with_ai:
 *           type: boolean
 *           default: true
 *           example: true
 *         ai_model:
 *           type: string
 *           example: 'gemini-1.5-flash'
 *         ai_context_prompt:
 *           type: string
 *           example: 'Ты профессиональный голосовой ассистент, который мягко продает продукт.'
 *         phone_number:
 *           type: string
 *           pattern: '^\+[1-9]\d{10,14}$'
 *           example: '+77271234567'
 *         is_active:
 *           type: boolean
 *           default: true
 *           example: true
 */

/**
 * @swagger
 * /api/agents:
 *   post:
 *     tags: [Agents]
 *     summary: Создание нового голосового агента
 *     description: Создает нового AI-агента с настройками голоса, AI и звонков
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Agent'
 *     responses:
 *       201:
 *         description: Агент успешно создан
 *       400:
 *         description: Ошибка валидации
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 */
router.post('/', [authMiddleware, adminMiddleware], createAgent);

/**
 * @swagger
 * /api/agents:
 *   get:
 *     tags: [Agents]
 *     summary: Получение списка агентов
 *     description: Возвращает все созданные агенты с возможностью фильтрации
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Фильтр по имени агента
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Фильтр по статусу активности
 *     responses:
 *       200:
 *         description: Список агентов
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 */
router.get('/', [authMiddleware, adminMiddleware], getAgents);

/**
 * @swagger
 * /api/agents/{id}:
 *   get:
 *     tags: [Agents]
 *     summary: Получение агента по ID
 *     description: Получение всех настроек и состояния конкретного агента
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Данные агента
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 *       404:
 *         description: Агент не найден
 */
router.get('/:id', [authMiddleware, adminMiddleware], getAgentById);

/**
 * @swagger
 * /api/agents/{id}:
 *   put:
 *     tags: [Agents]
 *     summary: Обновление агента
 *     description: Полное или частичное обновление настроек агента
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Agent'
 *     responses:
 *       200:
 *         description: Агент успешно обновлен
 *       400:
 *         description: Ошибка валидации
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 *       404:
 *         description: Агент не найден
 */
router.put('/:id', [authMiddleware, adminMiddleware], updateAgent);

/**
 * @swagger
 * /api/agents/{id}:
 *   delete:
 *     tags: [Agents]
 *     summary: Удаление агента
 *     description: Удаляет голосового агента из базы данных
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Агент успешно удален
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 *       404:
 *         description: Агент не найден
 */
router.delete('/:id', [authMiddleware, adminMiddleware], deleteAgent);

/**
 * @swagger
 * /api/agents/{id}/status:
 *   patch:
 *     tags: [Agents]
 *     summary: Активация/деактивация агента
 *     description: Обновляет статус активности агента
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               - is_active
 *             properties:
 *               is_active:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Статус агента успешно обновлен
 *       400:
 *         description: Ошибка валидации
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 *       404:
 *         description: Агент не найден
 */
router.patch('/:id/status', [authMiddleware, adminMiddleware], updateAgentStatus);

/**
 * @swagger
 * /api/agents/{id}/call:
 *   post:
 *     tags: [Agents]
 *     summary: Запуск AI-звонка
 *     description: Отправляет агента звонить по лиду
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               - leadId
 *               - phone
 *             properties:
 *               leadId:
 *                 type: string
 *                 example: '507f1f77bcf86cd799439011'
 *               phone:
 *                 type: string
 *                 pattern: '^\+[1-9]\d{10,14}$'
 *                 example: '+77001234567'
 *     responses:
 *       200:
 *         description: Звонок успешно инициирован
 *       400:
 *         description: Ошибка валидации
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 *       404:
 *         description: Агент не найден
 */
router.post('/:id/call', [authMiddleware, adminMiddleware], startAgentCall);

/**
 * @swagger
 * /api/agents/{id}/summary:
 *   get:
 *     tags: [Agents]
 *     summary: Получение итогов звонка
 *     description: Возвращает итоги звонка и запись разговора
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: leadId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Итоги звонка получены
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 *       404:
 *         description: Агент не найден
 */
router.get('/:id/summary', [authMiddleware, adminMiddleware], getCallSummary);

/**
 * @swagger
 * /api/agents/{id}/preview:
 *   post:
 *     tags: [Agents]
 *     summary: Генерация демо-записи
 *     description: Генерирует короткую аудиодемонстрацию голоса агента
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *                 example: 'Здравствуйте, это демо голосового агента Анна.'
 *     responses:
 *       200:
 *         description: Демо-запись успешно сгенерирована
 *       400:
 *         description: Ошибка валидации
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 *       404:
 *         description: Агент не найден
 */
router.post('/:id/preview', [authMiddleware, adminMiddleware], generateVoicePreview);

/**
 * @swagger
 * /api/agents/{id}/voice-settings:
 *   patch:
 *     tags: [Agents]
 *     summary: Обновление голосовых настроек
 *     description: Обновляет параметры голоса агента
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               - voice_settings
 *             properties:
 *               voice_settings:
 *                 $ref: '#/components/schemas/VoiceSettings'
 *     responses:
 *       200:
 *         description: Голосовые настройки успешно обновлены
 *       400:
 *         description: Ошибка валидации
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 *       404:
 *         description: Агент не найден
 */
router.patch('/:id/voice-settings', [authMiddleware, adminMiddleware], updateVoiceSettings);

export default router; 