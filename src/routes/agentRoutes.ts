import express from 'express';
import multer from 'multer';
import {
  getAgents,
  getAgentById,
  syncAgents,
  getSyncStats,
  deleteAgent,
  createAgent,
  getLLMPrices,
  getKnowledgeBase,
  updateAgent,
  getConversations,
  getConversationById,
  getConversationAudio,
  getRagIndexOverview,
  createKnowledgeBase,
  createKnowledgeBaseFromText,
  createKnowledgeBaseFromFile,
  getKnowledgeBaseById,
  deleteKnowledgeBase,
  migrateKnowledgeBaseToCompanies
} from '../controllers/agentController';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminMiddleware } from '../middleware/adminMiddleware';
import { tenantMiddleware, checkCompanyLimits } from '../middleware/tenantMiddleware';

// Настройка multer для обработки файлов в памяти
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Разрешаем различные типы документов
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
      'application/rtf',
      'application/vnd.oasis.opendocument.text'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
});

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Agents
 *   description: Управление голосовыми AI-агентами (только для администраторов)
 */

/**
 * @swagger
 * /api/agents:
 *   get:
 *     tags: [Agents]
 *     summary: Получение списка агентов
 *     description: Возвращает список всех агентов компании
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список агентов успешно получен
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 *       500:
 *         description: Ошибка сервера
 */
router.get('/', [authMiddleware, adminMiddleware, tenantMiddleware], getAgents);

/**
 * @swagger
 * /api/agents:
 *   post:
 *     tags: [Agents]
 *     summary: Создание нового агента
 *     description: Создает нового голосового AI-агента
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
 *                 example: 'Виртуальный помощник'
 *     responses:
 *       201:
 *         description: Агент успешно создан
 *       400:
 *         description: Неверные данные запроса
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа или превышен лимит
 *       500:
 *         description: Ошибка сервера
 */
router.post('/', [authMiddleware, adminMiddleware, tenantMiddleware, checkCompanyLimits('agents')], createAgent);

/**
 * @swagger
 * /api/agents/sync/all:
 *   post:
 *     tags: [Agents]
 *     summary: Синхронизация всех агентов
 *     description: Синхронизирует всех агентов из ElevenLabs с локальной базой данных
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Синхронизация завершена успешно
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 *       500:
 *         description: Ошибка синхронизации
 */
router.post('/sync/all', [authMiddleware, adminMiddleware, tenantMiddleware], syncAgents);

/**
 * @swagger
 * /api/agents/sync/stats:
 *   get:
 *     tags: [Agents]
 *     summary: Статистика синхронизации
 *     description: Возвращает статистику синхронизации агентов
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Статистика получена
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
 *     summary: Получение цен LLM моделей
 *     description: Возвращает список доступных LLM моделей и их цены за минуту
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: agent_id
 *         schema:
 *           type: string
 *         description: ID агента (опционально)
 *         example: 'cmd1wqctl0005xudtg203ecgo'
 *     responses:
 *       200:
 *         description: Цены LLM моделей получены успешно
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     llm_prices:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           llm:
 *                             type: string
 *                             example: "gpt-4o-mini"
 *                           price_per_minute:
 *                             type: number
 *                             example: 0.02
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 *       404:
 *         description: Агент не найден
 *       500:
 *         description: Ошибка сервера
 */
router.get('/llm-prices', [authMiddleware, adminMiddleware], getLLMPrices);

/**
 * @swagger
 * /api/agents/knowledge-base:
 *   get:
 *     tags: [Agents]
 *     summary: Получение базы знаний
 *     description: Возвращает список доступных баз знаний из ElevenLabs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page_size
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Количество элементов на странице
 *         example: 30
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: Курсор для пагинации
 *         example: 'eyJpZCI6IjEyMyJ9'
 *     responses:
 *       200:
 *         description: База знаний получена успешно
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     knowledge_bases:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "kb_123"
 *                           name:
 *                             type: string
 *                             example: "Product Knowledge Base"
 *                           type:
 *                             type: string
 *                             example: "url"
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                     has_more:
 *                       type: boolean
 *                       example: false
 *                     next_cursor:
 *                       type: string
 *                       nullable: true
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 *       500:
 *         description: Ошибка сервера
 */

/**
 * @swagger
 * /api/agents/knowledge-base/rag-index:
 *   get:
 *     tags: [Agents]
 *     summary: Получение информации о RAG индексе
 *     description: Возвращает информацию об использовании RAG индекса
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Информация о RAG индексе успешно получена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_used_bytes:
 *                       type: integer
 *                       description: Общее количество использованных байт
 *                     total_max_bytes:
 *                       type: integer
 *                       description: Максимальное количество доступных байт
 *                     models:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           model:
 *                             type: string
 *                             description: Название модели
 *                           used_bytes:
 *                             type: integer
 *                             description: Количество использованных байт моделью
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 *       500:
 *         description: Ошибка сервера
 */
router.get('/knowledge-base/rag-index', [authMiddleware, adminMiddleware], getRagIndexOverview);

/**
 * @swagger
 * /api/agents/knowledge-base:
 *   post:
 *     tags: [Agents]
 *     summary: Создание новой базы знаний
 *     description: Создает новую базу знаний из URL или текста
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 properties:
 *                   url:
 *                     type: string
 *                     format: uri
 *                     description: URL для создания базы знаний
 *                     example: "https://mycarfinance.kz/"
 *                 required: [url]
 *               - type: object
 *                 properties:
 *                   text:
 *                     type: string
 *                     description: Текст для создания базы знаний
 *                   name:
 *                     type: string
 *                     description: Название базы знаний
 *                 required: [text, name]
 *     responses:
 *       200:
 *         description: База знаний успешно создана
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: ID созданной базы знаний
 *                     name:
 *                       type: string
 *                       description: Название базы знаний
 *                 message:
 *                   type: string
 *       400:
 *         description: Неверные параметры запроса или ошибка чтения URL
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 *       500:
 *         description: Ошибка сервера
 */
router.post('/knowledge-base', [authMiddleware, adminMiddleware], createKnowledgeBase);

/**
 * @swagger
 * /api/agents/knowledge-base/text:
 *   post:
 *     tags: [Agents]
 *     summary: Создание базы знаний из текста
 *     description: Создает новую базу знаний из предоставленного текста
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
 *                 description: Текст для создания базы знаний
 *                 example: "Это важная информация о компании..."
 *               name:
 *                 type: string
 *                 description: Название базы знаний
 *                 example: "Информация о компании"
 *     responses:
 *       200:
 *         description: База знаний из текста успешно создана
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: ID созданной базы знаний
 *                       example: "kb_abc123"
 *                     name:
 *                       type: string
 *                       description: Название базы знаний
 *                       example: "Информация о компании"
 *                 message:
 *                   type: string
 *                   example: "База знаний из текста успешно создана"
 *       400:
 *         description: Неверные параметры запроса
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 *       500:
 *         description: Ошибка сервера
 */
router.post('/knowledge-base/text', [authMiddleware, adminMiddleware], createKnowledgeBaseFromText);

/**
 * @swagger
 * /api/agents/knowledge-base/file:
 *   post:
 *     tags: [Agents]
 *     summary: Создание базы знаний из файла
 *     description: Создает новую базу знаний из загруженного файла (PDF, DOC, DOCX, TXT, MD, RTF, ODT)
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
 *                 description: Файл для создания базы знаний
 *               name:
 *                 type: string
 *                 description: Пользовательское название базы знаний (опционально)
 *                 example: "Техническая документация"
 *     responses:
 *       200:
 *         description: База знаний из файла успешно создана
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: ID созданной базы знаний
 *                       example: "kb_def456"
 *                     name:
 *                       type: string
 *                       description: Название базы знаний (автоматически из имени файла)
 *                       example: "document.pdf"
 *                 message:
 *                   type: string
 *                   example: "База знаний из файла успешно создана"
 *       400:
 *         description: Файл не прикреплен или неподдерживаемый тип файла
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 *       413:
 *         description: Файл слишком большой (максимум 10MB)
 *       500:
 *         description: Ошибка сервера
 */
router.post('/knowledge-base/file', [authMiddleware, adminMiddleware, upload.single('file')], createKnowledgeBaseFromFile);

/**
 * @swagger
 * /api/agents/knowledge-base/{id}:
 *   get:
 *     tags: [Agents]
 *     summary: Получение документа базы знаний по ID
 *     description: Возвращает детальную информацию о конкретном документе базы знаний
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID документа базы знаний
 *         example: 'UO3vFl9au15DPI2ayuHJ'
 *     responses:
 *       200:
 *         description: Документ базы знаний успешно получен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: ID документа
 *                       example: "UO3vFl9au15DPI2ayuHJ"
 *                     name:
 *                       type: string
 *                       description: Название документа
 *                       example: "Техническая документация"
 *                     type:
 *                       type: string
 *                       description: Тип документа (url, text, file)
 *                       example: "file"
 *                     metadata:
 *                       type: object
 *                       properties:
 *                         created_at_unix_secs:
 *                           type: integer
 *                           description: Время создания в Unix секундах
 *                         last_updated_at_unix_secs:
 *                           type: integer
 *                           description: Время последнего обновления в Unix секундах
 *                         size_bytes:
 *                           type: integer
 *                           description: Размер файла в байтах
 *                     access_info:
 *                       type: object
 *                       description: Информация о доступе к документу
 *                     extracted_inner_html:
 *                       type: string
 *                       description: Извлеченный HTML контент (если применимо)
 *       404:
 *         description: Документ базы знаний не найден
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 *       500:
 *         description: Ошибка сервера
 */
router.get('/knowledge-base/:id', [authMiddleware, adminMiddleware], getKnowledgeBaseById);

/**
 * @swagger
 * /api/agents/knowledge-base/{id}:
 *   delete:
 *     tags: [Agents]
 *     summary: Удаление документа базы знаний
 *     description: Удаляет документ из базы знаний ElevenLabs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID документа базы знаний
 *         example: 'UO3vFl9au15DPI2ayuHJ'
 *     responses:
 *       200:
 *         description: Документ базы знаний успешно удален
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "База знаний успешно удалена"
 *       404:
 *         description: Документ базы знаний не найден
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 *       500:
 *         description: Ошибка сервера
 */
router.delete('/knowledge-base/:id', [authMiddleware, adminMiddleware], deleteKnowledgeBase);

router.get('/knowledge-base', [authMiddleware, adminMiddleware], getKnowledgeBase);

/**
 * @swagger
 * /api/agents/migrate-kb:
 *   post:
 *     tags: [Agents]
 *     summary: Миграция баз знаний
 *     description: Мигрирует все базы знаний из ElevenLabs в компанию
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Базы знаний успешно мигрированы
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 *       500:
 *         description: Ошибка сервера
 */
router.post('/migrate-kb', [authMiddleware, adminMiddleware], migrateKnowledgeBaseToCompanies);

/**
 * @swagger
 * /api/agents/{id}:
 *   get:
 *     tags: [Agents]
 *     summary: Получение агента по ID
 *     description: Возвращает информацию о конкретном агенте. При указании параметра sync=true синхронизирует данные с ElevenLabs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID агента
 *       - in: query
 *         name: sync
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Синхронизировать данные с ElevenLabs
 *         example: 'true'
 *     responses:
 *       200:
 *         description: Агент найден
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   description: Данные агента
 *                 synced:
 *                   type: boolean
 *                   description: Были ли данные синхронизированы с ElevenLabs
 *                 syncError:
 *                   type: string
 *                   description: Ошибка синхронизации (если произошла)
 *       404:
 *         description: Агент не найден
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 *       500:
 *         description: Ошибка сервера
 */

/**
 * @swagger
 * /api/agents/conversations:
 *   get:
 *     tags: [Agents]
 *     summary: Получение списка разговоров
 *     description: Возвращает список разговоров агентов с возможностью фильтрации
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
 *         description: ID агента для фильтрации
 *       - in: query
 *         name: call_successful
 *         schema:
 *           type: string
 *           enum: [success, failure, unknown]
 *         description: Статус успешности звонка
 *       - in: query
 *         name: call_start_before_unix
 *         schema:
 *           type: integer
 *         description: Фильтр по времени начала звонка (до указанного времени)
 *       - in: query
 *         name: call_start_after_unix
 *         schema:
 *           type: integer
 *         description: Фильтр по времени начала звонка (после указанного времени)
 *       - in: query
 *         name: page_size
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Количество записей на странице
 *     responses:
 *       200:
 *         description: Список разговоров успешно получен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     conversations:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           agent_id:
 *                             type: string
 *                           agent_name:
 *                             type: string
 *                           conversation_id:
 *                             type: string
 *                           start_time_unix_secs:
 *                             type: integer
 *                           call_duration_secs:
 *                             type: integer
 *                           message_count:
 *                             type: integer
 *                           status:
 *                             type: string
 *                           call_successful:
 *                             type: string
 *                             enum: [success, failure, unknown]
 *                     next_cursor:
 *                       type: string
 *                       nullable: true
 *                     has_more:
 *                       type: boolean
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
 *     summary: Получение деталей разговора
 *     description: Возвращает детальную информацию о конкретном разговоре агента
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID разговора
 *         schema:
 *           type: string
 *           example: conv_01jy2tr9emfd6v78j3svv94v4a
 *     responses:
 *       200:
 *         description: Детали разговора успешно получены
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     agent_id:
 *                       type: string
 *                     agent_name:
 *                       type: string
 *                     conversation_id:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [initiated, in-progress, processing, done, failed]
 *                     transcript:
 *                       type: array
 *                       items:
 *                         type: object
 *                     metadata:
 *                       type: object
 *                     analysis:
 *                       type: object
 *                     has_audio:
 *                       type: boolean
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 *       404:
 *         description: Разговор не найден или не принадлежит вашей компании
 *       500:
 *         description: Ошибка сервера
 */
router.get('/conversations/:id', [authMiddleware, adminMiddleware], getConversationById);

/**
 * @swagger
 * /api/agents/conversations/{id}/audio:
 *   get:
 *     tags: [Agents]
 *     summary: Получение аудио разговора
 *     description: Возвращает аудио запись разговора в формате MP3
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID разговора
 *         schema:
 *           type: string
 *           example: conv_01jy2tr9emfd6v78j3svv94v4a
 *     responses:
 *       200:
 *         description: Аудио разговора успешно получено
 *         content:
 *           audio/mpeg:
 *             schema:
 *               type: string
 *               format: binary
 *         headers:
 *           Content-Disposition:
 *             description: Указывает имя файла для скачивания
 *             schema:
 *               type: string
 *               example: attachment; filename="conversation_conv_01jy2tr9emfd6v78j3svv94v4a.mp3"
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 *       404:
 *         description: Аудио разговора не найдено или разговор не принадлежит вашей компании
 *       500:
 *         description: Ошибка сервера
 */
router.get('/conversations/:id/audio', [authMiddleware, adminMiddleware], getConversationAudio);

router.get('/:id', [authMiddleware, adminMiddleware], getAgentById);

/**
 * @swagger
 * /api/agents/{id}:
 *   patch:
 *     tags: [Agents]
 *     summary: Обновление агента
 *     description: Обновляет агента в ElevenLabs и локальной базе данных
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID агента
 *         example: 'cmd1wqctk0003xudtynaopij3'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Имя агента
 *                 example: 'Батырбек test'
 *               conversation_config:
 *                 type: object
 *                 description: Конфигурация разговора агента
 *                 properties:
 *                   agent:
 *                     type: object
 *                     properties:
 *                       first_message:
 *                         type: string
 *                         description: Первое сообщение агента
 *                         example: 'Привет! Как дела?'
 *                       language:
 *                         type: string
 *                         description: Язык агента
 *                         example: 'ru'
 *                       prompt:
 *                         type: object
 *                         properties:
 *                           prompt:
 *                             type: string
 *                             description: Промт для AI
 *                             example: 'Ты вежливый помощник'
 *                           llm:
 *                             type: string
 *                             description: Модель LLM
 *                             example: 'gemini-2.0-flash-001'
 *                   tts:
 *                     type: object
 *                     properties:
 *                       voice_id:
 *                         type: string
 *                         description: ID голоса
 *                         example: 'cjVigY5qzO86Huf0OWal'
 *                       stability:
 *                         type: number
 *                         description: Стабильность голоса
 *                         example: 0.5
 *                       similarity_boost:
 *                         type: number
 *                         description: Усиление схожести
 *                         example: 0.8
 *                       speed:
 *                         type: number
 *                         description: Скорость голоса
 *                         example: 1.0
 *               platform_settings:
 *                 type: object
 *                 description: Настройки платформы
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Теги агента
 *                 example: ['sales', 'ru']
 *     responses:
 *       200:
 *         description: Агент успешно обновлен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   description: Обновленные данные агента
 *                 message:
 *                   type: string
 *                   example: 'Agent updated successfully'
 *       400:
 *         description: Неверные данные или агент не синхронизирован с ElevenLabs
 *       404:
 *         description: Агент не найден
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
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
 *     description: Удаляет агента из системы и ElevenLabs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID агента
 *     responses:
 *       200:
 *         description: Агент успешно удален
 *       404:
 *         description: Агент не найден
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 *       500:
 *         description: Ошибка сервера
 */
router.delete('/:id', [authMiddleware, adminMiddleware], deleteAgent);

export default router; 