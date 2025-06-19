import express from 'express';
import multer from 'multer';
import {
  getAgents,
  getAgentById,
  syncAgents,
  getSyncStats,
  deleteAgent,
  getLLMPrices,
  getKnowledgeBase,
  getKnowledgeBaseById,
  getRagIndexOverview,
  getConversationSignedUrl,
  createKnowledgeBase,
  createKnowledgeBaseFromText,
  createKnowledgeBaseFromFile,
  deleteKnowledgeBase,
  updateAgent,
  getConversations,
  getConversationById,
  getConversationAudio,
  deleteConversation,
  createAgent
} from '../controllers/agentController';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminMiddleware } from '../middleware/adminMiddleware';

const router = express.Router();

// Настройка multer для загрузки файлов в память
const upload = multer({ storage: multer.memoryStorage() });

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
 *     Conversation:
 *       type: object
 *       properties:
 *         agent_id:
 *           type: string
 *           example: 'yufIbo0uUuoT5yZv5vds'
 *         agent_name:
 *           type: string
 *           example: 'Guzel'
 *         conversation_id:
 *           type: string
 *           example: 'conv_01jxzrqnhcfetb1bsnxtkqn99y'
 *         start_time_unix_secs:
 *           type: number
 *           example: 1750191560
 *         call_duration_secs:
 *           type: number
 *           example: 34
 *         message_count:
 *           type: number
 *           example: 5
 *         status:
 *           type: string
 *           example: 'done'
 *         call_successful:
 *           type: string
 *           enum: [success, failure, unknown]
 *           example: 'success'
 *     ElevenLabsAgentList:
 *       type: object
 *       properties:
 *         agent_id:
 *           type: string
 *           example: 'yufIbo0uUuoT5yZv5vds'
 *         name:
 *           type: string
 *           example: 'Guzel'
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           example: []
 *         created_at_unix_secs:
 *           type: number
 *           example: 1746395226
 *         access_info:
 *           type: object
 *           properties:
 *             is_creator:
 *               type: boolean
 *               example: true
 *             creator_name:
 *               type: string
 *               example: 'Batyrbek Kuandyk'
 *             creator_email:
 *               type: string
 *               example: 'batrbekk@gmail.com'
 *             role:
 *               type: string
 *               example: 'admin'
 *     ElevenLabsAgentDetail:
 *       type: object
 *       properties:
 *         agent_id:
 *           type: string
 *           example: 'yufIbo0uUuoT5yZv5vds'
 *         name:
 *           type: string
 *           example: 'Guzel'
 *         conversation_config:
 *           type: object
 *           properties:
 *             asr:
 *               type: object
 *               properties:
 *                 quality:
 *                   type: string
 *                   example: 'high'
 *                 provider:
 *                   type: string
 *                   example: 'elevenlabs'
 *                 user_input_audio_format:
 *                   type: string
 *                   example: 'pcm_16000'
 *                 keywords:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: []
 *             turn:
 *               type: object
 *               properties:
 *                 turn_timeout:
 *                   type: number
 *                   example: 7
 *                 silence_end_call_timeout:
 *                   type: number
 *                   example: 20
 *                 mode:
 *                   type: string
 *                   example: 'turn'
 *             tts:
 *               type: object
 *               properties:
 *                 model_id:
 *                   type: string
 *                   example: 'eleven_flash_v2_5'
 *                 voice_id:
 *                   type: string
 *                   example: 'FGY2WhTYpPnrIDTdsKH5'
 *                 stability:
 *                   type: number
 *                   example: 0.5
 *                 speed:
 *                   type: number
 *                   example: 1
 *                 similarity_boost:
 *                   type: number
 *                   example: 0.8
 *             agent:
 *               type: object
 *               properties:
 *                 first_message:
 *                   type: string
 *                   example: 'Здравствуйте! Меня зовут Гузель'
 *                 language:
 *                   type: string
 *                   example: 'ru'
 *                 prompt:
 *                   type: object
 *                   properties:
 *                     prompt:
 *                       type: string
 *                       example: 'Ты — вежливый голосовой менеджер'
 *                     llm:
 *                       type: string
 *                       example: 'gemini-2.0-flash-001'
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           example: []
 *         synced:
 *           type: boolean
 *           example: true
 *         synced_at:
 *           type: string
 *           format: date-time
 *           example: '2025-01-15T10:00:00Z'
 */

/**
 * @swagger
 * /api/agents:
 *   get:
 *     tags: [Agents]
 *     summary: Получение списка агентов ElevenLabs
 *     description: Возвращает список агентов из ElevenLabs с возможностью синхронизации с MongoDB
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: Курсор для пагинации
 *       - in: query
 *         name: page_size
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 30
 *         description: Количество агентов на странице
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Поиск по имени агента
 *       - in: query
 *         name: sync
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Принудительная синхронизация с ElevenLabs
 *     responses:
 *       200:
 *         description: Список агентов получен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 agents:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ElevenLabsAgentList'
 *                 next_cursor:
 *                   type: string
 *                   nullable: true
 *                 has_more:
 *                   type: boolean
 *                 synced:
 *                   type: boolean
 *                 synced_at:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 *       500:
 *         description: Ошибка сервера
 */
router.get('/', [authMiddleware, adminMiddleware], getAgents);

/**
 * @swagger
 * /api/agents:
 *   post:
 *     tags: [Agents]
 *     summary: Создание нового агента
 *     description: Создает нового голосового AI-агента в ElevenLabs с предустановленной конфигурацией
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Имя создаваемого агента
 *                 example: 'Batyrbek'
 *                 minLength: 1
 *                 maxLength: 100
 *           examples:
 *             simple_agent:
 *               summary: Простое создание агента
 *               value:
 *                 name: 'Гузель'
 *             business_agent:
 *               summary: Агент для бизнеса
 *               value:
 *                 name: 'Менеджер по продажам'
 *     responses:
 *       201:
 *         description: Агент успешно создан
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Агент успешно создан'
 *                 agent_id:
 *                   type: string
 *                   example: 'yufIbo0uUuoT5yZv5vds'
 *                 name:
 *                   type: string
 *                   example: 'Batyrbek'
 *                 conversation_config:
 *                   type: object
 *                   description: Конфигурация разговора агента
 *                 platform_settings:
 *                   type: object
 *                   description: Настройки платформы
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     created_at_unix_secs:
 *                       type: number
 *                       example: 1746395226
 *                 access_info:
 *                   type: object
 *                   properties:
 *                     is_creator:
 *                       type: boolean
 *                       example: true
 *                     creator_name:
 *                       type: string
 *                       example: 'Batyrbek Kuandyk'
 *                     creator_email:
 *                       type: string
 *                       example: 'batrbekk@gmail.com'
 *                     role:
 *                       type: string
 *                       example: 'admin'
 *                 synced:
 *                   type: boolean
 *                   example: true
 *                 synced_at:
 *                   type: string
 *                   format: date-time
 *                   example: '2025-01-15T12:00:00Z'
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                   example: '2025-01-15T12:00:00Z'
 *       400:
 *         description: Неверные данные запроса
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Имя агента обязательно и должно быть непустой строкой'
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 *       500:
 *         description: Ошибка сервера
 */
router.post('/', [authMiddleware, adminMiddleware], createAgent);

/**
 * @swagger
 * /api/agents/sync/all:
 *   post:
 *     tags: [Agents]
 *     summary: Принудительная синхронизация всех агентов
 *     description: Синхронизирует всех агентов из ElevenLabs с MongoDB
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Синхронизация завершена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Синхронизация завершена'
 *                 synced_count:
 *                   type: number
 *                   example: 5
 *                 total_agents:
 *                   type: number
 *                   example: 5
 *                 synced_at:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 *       500:
 *         description: Ошибка синхронизации
 */
router.post('/sync/all', [authMiddleware, adminMiddleware], syncAgents);

/**
 * @swagger
 * /api/agents/sync/stats:
 *   get:
 *     tags: [Agents]
 *     summary: Статистика синхронизации
 *     description: Возвращает информацию о состоянии синхронизации агентов
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Статистика получена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_agents:
 *                   type: number
 *                   example: 5
 *                 last_sync:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *                   example: '2025-01-15T10:00:00Z'
 *                 needs_sync:
 *                   type: boolean
 *                   example: false
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 *       500:
 *         description: Ошибка сервера
 */
router.get('/sync/stats', [authMiddleware, adminMiddleware], getSyncStats);

/**
 * @swagger
 * /api/agents/llm-prices:
 *   get:
 *     tags: [Agents]
 *     summary: Получение доступных LLM моделей и цен
 *     description: Возвращает список доступных LLM моделей для агентов с ценами за минуту использования
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: agent_id
 *         schema:
 *           type: string
 *         description: ID конкретного агента (необязательно)
 *     responses:
 *       200:
 *         description: Список LLM моделей и цен получен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Информация о доступных LLM моделях получена'
 *                 llm_prices:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       llm:
 *                         type: string
 *                         example: 'gpt-4o-mini'
 *                       price_per_minute:
 *                         type: number
 *                         format: float
 *                         example: 0.0006269457946554367
 *                 retrieved_at:
 *                   type: string
 *                   format: date-time
 *                   example: '2025-01-15T12:00:00Z'
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 *       500:
 *         description: Ошибка сервера
 */
router.get('/llm-prices', [authMiddleware, adminMiddleware], getLLMPrices);

/**
 * @swagger
 * /api/agents/knowledge-base:
 *   get:
 *     tags: [Agents]
 *     summary: Получение списка базы знаний
 *     description: Возвращает список документов базы знаний из ElevenLabs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: Курсор для пагинации
 *       - in: query
 *         name: page_size
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 30
 *         description: Количество документов на странице
 *     responses:
 *       200:
 *         description: Список базы знаний получен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Список базы знаний получен'
 *                 documents:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: 'POWdTREbVATbWkxwau6A'
 *                       name:
 *                         type: string
 *                         example: 'Mycar.kz - Покупка и продажа автомобилей в Казахстане'
 *                       metadata:
 *                         type: object
 *                         properties:
 *                           created_at_unix_secs:
 *                             type: number
 *                             example: 1750195117
 *                           last_updated_at_unix_secs:
 *                             type: number
 *                             example: 1750195117
 *                           size_bytes:
 *                             type: number
 *                             example: 3051
 *                       supported_usages:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example: ['prompt', 'auto']
 *                       access_info:
 *                         type: object
 *                         properties:
 *                           is_creator:
 *                             type: boolean
 *                             example: true
 *                           creator_name:
 *                             type: string
 *                             example: 'Batyrbek Kuandyk'
 *                           creator_email:
 *                             type: string
 *                             example: 'batrbekk@gmail.com'
 *                           role:
 *                             type: string
 *                             example: 'admin'
 *                       dependent_agents:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                               example: 'yufIbo0uUuoT5yZv5vds'
 *                             name:
 *                               type: string
 *                               example: 'Guzel'
 *                             type:
 *                               type: string
 *                               example: 'available'
 *                             created_at_unix_secs:
 *                               type: number
 *                               example: 1746395226
 *                             access_level:
 *                               type: string
 *                               example: 'admin'
 *                         example: []
 *                       type:
 *                         type: string
 *                         example: 'url'
 *                       url:
 *                         type: string
 *                         example: 'https://mycar.kz'
 *                 next_cursor:
 *                   type: string
 *                   nullable: true
 *                   example: null
 *                 has_more:
 *                   type: boolean
 *                   example: false
 *                 retrieved_at:
 *                   type: string
 *                   format: date-time
 *                   example: '2025-01-15T12:00:00Z'
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 *       500:
 *         description: Ошибка сервера
 */
router.get('/knowledge-base', [authMiddleware, adminMiddleware], getKnowledgeBase);

/**
 * @swagger
 * /api/agents/knowledge-base:
 *   post:
 *     tags: [Agents]
 *     summary: Создание базы знаний по URL
 *     description: Создает новый документ в базе знаний на основе указанного URL
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *                 description: URL веб-сайта для добавления в базу знаний
 *                 example: 'https://mycar.kz/market?from=main'
 *     responses:
 *       201:
 *         description: База знаний успешно создана
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'База знаний успешно создана'
 *                 id:
 *                   type: string
 *                   example: 'hZFwYpZcttHeiTVZjSCy'
 *                 name:
 *                   type: string
 *                   example: 'Маркетплейс новых авто от Mycar. Автомобили из салона от официальных дилеров Казахстана.'
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                   example: '2025-01-15T12:00:00Z'
 *       400:
 *         description: Неверные данные запроса
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'URL обязателен для создания базы знаний'
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 *       500:
 *         description: Ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Ошибка при создании базы знаний'
 *                 details:
 *                   type: string
 *                   example: 'Не удалось создать базу знаний'
 */
router.post('/knowledge-base', [authMiddleware, adminMiddleware], createKnowledgeBase);

/**
 * @swagger
 * /api/agents/knowledge-base/text:
 *   post:
 *     tags: [Agents]
 *     summary: Создание базы знаний из текста
 *     description: Создает новый документ в базе знаний на основе предоставленного текста
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *               - name
 *             properties:
 *               text:
 *                 type: string
 *                 description: Текстовое содержимое для добавления в базу знаний
 *                 example: 'Mycar.kz - это ведущая автомобильная платформа в Казахстане, предоставляющая услуги по покупке и продаже автомобилей.'
 *               name:
 *                 type: string
 *                 description: Название документа в базе знаний
 *                 example: 'Информация о Mycar.kz'
 *     responses:
 *       201:
 *         description: База знаний из текста успешно создана
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'База знаний из текста успешно создана'
 *                 id:
 *                   type: string
 *                   example: 'L19Vi8OQIlWh1ZvJItUL'
 *                 name:
 *                   type: string
 *                   example: 'Информация о Mycar.kz'
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                   example: '2025-01-15T12:00:00Z'
 *       400:
 *         description: Неверные данные запроса
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Текст и название обязательны для создания базы знаний'
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 *       500:
 *         description: Ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Ошибка при создании базы знаний из текста'
 *                 details:
 *                   type: string
 *                   example: 'Не удалось создать базу знаний из текста'
 */
router.post('/knowledge-base/text', [authMiddleware, adminMiddleware], createKnowledgeBaseFromText);

/**
 * @swagger
 * /api/agents/knowledge-base/file:
 *   post:
 *     summary: Создать базу знаний из файла
 *     description: Создает новую базу знаний в ElevenLabs на основе загруженного файла
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Файл для создания базы знаний (PDF, TXT, DOCX и др.)
 *     responses:
 *       201:
 *         description: База знаний успешно создана
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "База знаний из файла успешно создана"
 *                 id:
 *                   type: string
 *                   example: "Tuigv9QZwhh5ZBGUc838"
 *                 name:
 *                   type: string
 *                   example: "Kuandyk Batyrbek - frontend.pdf"
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Файл не предоставлен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Файл обязателен для создания базы знаний"
 *       401:
 *         description: Неавторизован
 *       404:
 *         description: Администратор не найден
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.post('/knowledge-base/file', [authMiddleware, adminMiddleware], upload.single('file'), createKnowledgeBaseFromFile);

/**
 * @swagger
 * /api/agents/conversations:
 *   get:
 *     tags: [Agents]
 *     summary: Получение списка разговоров агентов
 *     description: Возвращает список разговоров из ElevenLabs с фильтрацией и пагинацией
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: Курсор для пагинации
 *       - in: query
 *         name: agent_id
 *         schema:
 *           type: string
 *         description: Фильтр по ID агента
 *       - in: query
 *         name: call_successful
 *         schema:
 *           type: string
 *           enum: [success, failure, unknown]
 *         description: Фильтр по результату успешности разговора
 *       - in: query
 *         name: call_start_before_unix
 *         schema:
 *           type: integer
 *         description: Unix timestamp для фильтрации разговоров до указанной даты
 *       - in: query
 *         name: call_start_after_unix
 *         schema:
 *           type: integer
 *         description: Unix timestamp для фильтрации разговоров после указанной даты
 *       - in: query
 *         name: page_size
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Количество разговоров на странице (по умолчанию 10)
 *     responses:
 *       200:
 *         description: Список разговоров получен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Список разговоров получен'
 *                 conversations:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Conversation'
 *                 next_cursor:
 *                   type: string
 *                   nullable: true
 *                   example: null
 *                 has_more:
 *                   type: boolean
 *                   example: false
 *                 retrieved_at:
 *                   type: string
 *                   format: date-time
 *                   example: '2025-01-15T12:00:00Z'
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 *       500:
 *         description: Ошибка сервера
 */
router.get('/conversations', [authMiddleware, adminMiddleware], getConversations);

/**
 * @swagger
 * /api/agents/conversations/{id}:
 *   get:
 *     tags: [Agents]
 *     summary: Получение детальной информации о разговоре
 *     description: Возвращает полную информацию о конкретном разговоре включая транскрипт, метаданные и анализ
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID разговора
 *         example: 'conv_01jxzrqnhcfetb1bsnxtkqn99y'
 *     responses:
 *       200:
 *         description: Детали разговора получены
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Детали разговора получены'
 *                 agent_id:
 *                   type: string
 *                   example: 'yufIbo0uUuoT5yZv5vds'
 *                 conversation_id:
 *                   type: string
 *                   example: 'conv_01jxzrqnhcfetb1bsnxtkqn99y'
 *                 status:
 *                   type: string
 *                   enum: [initiated, in-progress, processing, done, failed]
 *                   example: 'done'
 *                 transcript:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       role:
 *                         type: string
 *                         enum: [agent, user]
 *                       message:
 *                         type: string
 *                       time_in_call_secs:
 *                         type: number
 *                       source_medium:
 *                         type: string
 *                         nullable: true
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     start_time_unix_secs:
 *                       type: number
 *                     call_duration_secs:
 *                       type: number
 *                     cost:
 *                       type: number
 *                     main_language:
 *                       type: string
 *                     termination_reason:
 *                       type: string
 *                 analysis:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     call_successful:
 *                       type: string
 *                       enum: [success, failure, unknown]
 *                     transcript_summary:
 *                       type: string
 *                 has_audio:
 *                   type: boolean
 *                 has_user_audio:
 *                   type: boolean
 *                 has_response_audio:
 *                   type: boolean
 *                 retrieved_at:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 *       404:
 *         description: Разговор не найден
 *       500:
 *         description: Ошибка сервера
 */
router.get('/conversations/:id', [authMiddleware, adminMiddleware], getConversationById);

/**
 * @swagger
 * /api/agents/conversations/{id}/audio:
 *   get:
 *     tags: [Agents]
 *     summary: Получение аудио файла разговора
 *     description: Возвращает аудио запись конкретного разговора в формате MP3
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID разговора
 *         example: 'conv_01jxzrqnhcfetb1bsnxtkqn99y'
 *     responses:
 *       200:
 *         description: Аудио файл разговора
 *         content:
 *           audio/mpeg:
 *             schema:
 *               type: string
 *               format: binary
 *         headers:
 *           Content-Disposition:
 *             description: Имя файла для скачивания
 *             schema:
 *               type: string
 *               example: 'attachment; filename="conversation_conv_01jxzrqnhcfetb1bsnxtkqn99y.mp3"'
 *           Content-Type:
 *             description: Тип содержимого
 *             schema:
 *               type: string
 *               example: 'audio/mpeg'
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 *       404:
 *         description: Разговор не найден или аудио недоступно
 *       500:
 *         description: Ошибка сервера
 */
router.get('/conversations/:id/audio', [authMiddleware, adminMiddleware], getConversationAudio);

/**
 * @swagger
 * /api/agents/conversations/{id}:
 *   delete:
 *     tags: [Agents]
 *     summary: Удаление разговора
 *     description: Удаляет конкретный разговор из ElevenLabs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID разговора для удаления
 *         example: 'conv_01jxzrqnhcfetb1bsnxtkqn99y'
 *     responses:
 *       200:
 *         description: Разговор успешно удален
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Разговор успешно удален'
 *                 conversation_id:
 *                   type: string
 *                   example: 'conv_01jxzrqnhcfetb1bsnxtkqn99y'
 *                 deleted_at:
 *                   type: string
 *                   format: date-time
 *                   example: '2025-01-15T12:00:00Z'
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 *       404:
 *         description: Разговор не найден
 *       500:
 *         description: Ошибка сервера
 */
router.delete('/conversations/:id', [authMiddleware, adminMiddleware], deleteConversation);

/**
 * @swagger
 * /api/agents/{id}:
 *   get:
 *     tags: [Agents]
 *     summary: Получение агента по ID
 *     description: Получение детальной информации об агенте ElevenLabs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID агента в ElevenLabs
 *       - in: query
 *         name: sync
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Принудительная синхронизация с ElevenLabs
 *     responses:
 *       200:
 *         description: Данные агента
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ElevenLabsAgentDetail'
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 *       404:
 *         description: Агент не найден
 *       500:
 *         description: Ошибка сервера
 */
router.get('/:id', [authMiddleware, adminMiddleware], getAgentById);

/**
 * @swagger
 * /api/agents/{id}:
 *   patch:
 *     tags: [Agents]
 *     summary: Обновление агента
 *     description: Обновляет данные агента в ElevenLabs и синхронизирует с MongoDB
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID агента в ElevenLabs
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: 'Guzel'
 *               conversation_config:
 *                 type: object
 *                 description: Конфигурация разговора агента
 *               platform_settings:
 *                 type: object
 *                 description: Настройки платформы
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ['sales', 'support']
 *           examples:
 *             simple_name_update:
 *               summary: Простое обновление имени
 *               value:
 *                 name: 'Новое имя агента'
 *             with_tags:
 *               summary: Обновление с тегами
 *               value:
 *                 name: 'Guzel'
 *                 tags: ['sales', 'mycar']
 *     responses:
 *       200:
 *         description: Агент успешно обновлен
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ElevenLabsAgentDetail'
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: 'Агент успешно обновлен'
 *                     synced:
 *                       type: boolean
 *                       example: true
 *                     synced_at:
 *                       type: string
 *                       format: date-time
 *                       example: '2025-01-15T12:00:00Z'
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *                       example: '2025-01-15T12:00:00Z'
 *       400:
 *         description: Неверные данные запроса
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 *       404:
 *         description: Агент не найден
 *       500:
 *         description: Ошибка сервера
 */
router.patch('/:id', [authMiddleware, adminMiddleware], updateAgent);

/**
 * @swagger
 * /api/agents/{id}:
 *   delete:
 *     tags: [Agents]
 *     summary: Удаление агента
 *     description: Удаляет агента из ElevenLabs и синхронизирует с MongoDB
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID агента в ElevenLabs
 *     responses:
 *       200:
 *         description: Агент успешно удален
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Агент успешно удален'
 *                 agent_id:
 *                   type: string
 *                   example: 'yufIbo0uUuoT5yZv5vds'
 *                 deleted_at:
 *                   type: string
 *                   format: date-time
 *                   example: '2025-01-15T12:00:00Z'
 *                 warning:
 *                   type: string
 *                   nullable: true
 *                   example: 'Агент уже был удален из ElevenLabs'
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 *       404:
 *         description: Агент не найден
 *       500:
 *         description: Ошибка сервера
 */
router.delete('/:id', [authMiddleware, adminMiddleware], deleteAgent);

/**
 * @swagger
 * /api/agents/knowledge-base/{id}:
 *   delete:
 *     summary: Удалить базу знаний
 *     description: Удаляет базу знаний в ElevenLabs по ID
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID базы знаний для удаления
 *         example: "L19Vi8OQIlWh1ZvJItUL"
 *     responses:
 *       200:
 *         description: База знаний успешно удалена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "База знаний успешно удалена"
 *                 knowledge_base_id:
 *                   type: string
 *                   example: "L19Vi8OQIlWh1ZvJItUL"
 *                 deleted_at:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: ID базы знаний не предоставлен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "ID базы знаний обязателен"
 *       401:
 *         description: Неавторизован
 *       404:
 *         description: Администратор не найден или база знаний не найдена
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.delete('/knowledge-base/:id', [authMiddleware, adminMiddleware], deleteKnowledgeBase);

/**
 * @swagger
 * /api/agents/knowledge-base/{id}:
 *   get:
 *     summary: Получить детальную информацию о базе знаний
 *     description: Получает подробную информацию о базе знаний в ElevenLabs по ID, включая метаданные, содержимое и информацию о доступе
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID базы знаний
 *         example: "Tuigv9QZwhh5ZBGUc838"
 *     responses:
 *       200:
 *         description: Детальная информация о базе знаний
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   example: "Tuigv9QZwhh5ZBGUc838"
 *                 name:
 *                   type: string
 *                   example: "Kuandyk Batyrbek - frontend.pdf"
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     created_at_unix_secs:
 *                       type: number
 *                       example: 1750291454
 *                     last_updated_at_unix_secs:
 *                       type: number
 *                       example: 1750291454
 *                     size_bytes:
 *                       type: number
 *                       example: 6489
 *                 supported_usages:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["prompt", "auto"]
 *                 access_info:
 *                   type: object
 *                   properties:
 *                     is_creator:
 *                       type: boolean
 *                       example: true
 *                     creator_name:
 *                       type: string
 *                       example: "Batyrbek Kuandyk"
 *                     creator_email:
 *                       type: string
 *                       example: "batrbekk@gmail.com"
 *                     role:
 *                       type: string
 *                       example: "admin"
 *                 extracted_inner_html:
 *                   type: string
 *                   description: HTML-содержимое извлеченное из документа
 *                 type:
 *                   type: string
 *                   example: "file"
 *       400:
 *         description: ID базы знаний не предоставлен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "ID базы знаний обязателен"
 *       401:
 *         description: Неавторизован
 *       404:
 *         description: База знаний не найдена или администратор не найден
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "База знаний не найдена"
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get('/knowledge-base/:id', [authMiddleware, adminMiddleware], getKnowledgeBaseById);

/**
 * @swagger
 * /api/agents/knowledge-base/rag-index:
 *   get:
 *     summary: Получить информацию о RAG индексе
 *     description: Получает информацию об использовании RAG индекса в ElevenLabs, включая использованные и максимальные байты, а также информацию о моделях
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Информация о RAG индексе
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_used_bytes:
 *                   type: number
 *                   description: Общее количество использованных байт
 *                   example: 3051
 *                 total_max_bytes:
 *                   type: number
 *                   description: Максимальное количество доступных байт
 *                   example: 1048576
 *                 models:
 *                   type: array
 *                   description: Информация о моделях и их использовании
 *                   items:
 *                     type: object
 *                     properties:
 *                       model:
 *                         type: string
 *                         description: Название модели
 *                         example: "e5_mistral_7b_instruct"
 *                       used_bytes:
 *                         type: number
 *                         description: Количество байт, использованных этой моделью
 *                         example: 3051
 *       401:
 *         description: Неавторизован
 *       404:
 *         description: Администратор не найден
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get('/knowledge-base/rag-index', [authMiddleware, adminMiddleware], getRagIndexOverview);

/**
 * @swagger
 * /api/agents/conversation/signed-url:
 *   get:
 *     summary: Получить подписанный URL для WebSocket соединения с агентом
 *     description: Получает подписанный WebSocket URL для начала разговора с конкретным агентом в ElevenLabs
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: agent_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID агента для создания WebSocket соединения
 *         example: "yufIbo0uUuoT5yZv5vds"
 *     responses:
 *       200:
 *         description: Подписанный URL для WebSocket соединения
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 signed_url:
 *                   type: string
 *                   description: WebSocket URL с подписью для безопасного соединения
 *                   example: "wss://api.elevenlabs.io/v1/convai/conversation?agent_id=yufIbo0uUuoT5yZv5vds&conversation_signature=cvtkn_01jy2tnmcrextbp4rhtb6h0e9f"
 *       400:
 *         description: agent_id не предоставлен или некорректен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "agent_id обязателен в query параметрах"
 *       401:
 *         description: Неавторизован
 *       404:
 *         description: Администратор не найден или агент не найден
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get('/conversation/signed-url', [authMiddleware, adminMiddleware], getConversationSignedUrl);

export default router; 