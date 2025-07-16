import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import {
  createWhatsAppSession,
  cleanupWhatsAppSessions,
  getQRCode,
  getCompanySessions,
  grantManagerAccess,
  getManagerAccess,
  revokeManagerAccess,
  getChats,
  getChatMessages,
  sendMessage,
  markChatAsRead,
  disconnectSession,
  getWhatsAppStats
} from '../controllers/whatsappController';

const router = Router();

/**
 * @swagger
 * /api/whatsapp/websocket/test-config:
 *   get:
 *     summary: Получить тестовую конфигурацию WebSocket (без авторизации)
 *     description: Возвращает настройки WebSocket для отладки подключения
 *     tags: [WhatsApp]
 *     responses:
 *       200:
 *         description: Тестовая конфигурация WebSocket
 */
router.get('/websocket/test-config', (req, res) => {
  const serverUrl = process.env.NODE_ENV === 'production' 
    ? 'https://vcl-back.vercel.app' 
    : `http://localhost:${process.env.PORT || 3000}`;
    
  res.json({
    message: '🔧 Тестовая конфигурация WebSocket для WhatsApp',
    server_info: {
      url: serverUrl,
      port: process.env.PORT || 3000,
      environment: process.env.NODE_ENV || 'development'
    },
    correct_frontend_config: {
      websocket_url: `${serverUrl}/whatsapp`,
      options: {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        auth: {
          token: 'YOUR_JWT_TOKEN_HERE'
        }
      }
    },
    wrong_config_example: {
      url: 'ws://localhost:3001/socket.io/', // ❌ Неправильно
      note: 'Этот URL НЕ работает - неправильный порт и отсутствует namespace'
    },
    troubleshooting: {
      common_issues: [
        'Неправильный порт (должен быть 3000, не 3001)',
        'Отсутствует namespace /whatsapp',
        'Отсутствует JWT токен в auth.token',
        'Проблемы с CORS'
      ],
      test_command: `curl ${serverUrl}/`,
      test_websocket: `const socket = io('${serverUrl}/whatsapp', { auth: { token: 'YOUR_TOKEN' } });`
    }
  });
});

// Применяем middleware для всех роутов (кроме тестового выше)
router.use(authMiddleware);
router.use(tenantMiddleware);

/**
 * @swagger
 * tags:
 *   name: WhatsApp
 *   description: Управление WhatsApp интеграцией
 */

/**
 * @swagger
 * /api/whatsapp/sessions:
 *   post:
 *     summary: Создание новой WhatsApp сессии
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Сессия создана успешно
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
 *                     sessionId:
 *                       type: string
 *                     message:
 *                       type: string
 *       403:
 *         description: Недостаточно прав (только администраторы)
 *       500:
 *         description: Ошибка сервера
 */
router.post('/sessions', createWhatsAppSession);

/**
 * @swagger
 * /api/whatsapp/sessions/cleanup:
 *   post:
 *     summary: Очистка старых/поврежденных WhatsApp сессий
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Сессии очищены успешно
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       403:
 *         description: Недостаточно прав (только администраторы)
 *       500:
 *         description: Ошибка сервера
 */
router.post('/sessions/cleanup', cleanupWhatsAppSessions);

/**
 * @swagger
 * /api/whatsapp/sessions:
 *   get:
 *     summary: Получение списка WhatsApp сессий компании
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список сессий получен успешно
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get('/sessions', getCompanySessions);

/**
 * @swagger
 * /api/whatsapp/sessions/{sessionId}/qr:
 *   get:
 *     summary: Получение QR кода для авторизации WhatsApp
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID сессии WhatsApp
 *     responses:
 *       200:
 *         description: QR код получен успешно
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
 *                     isConnected:
 *                       type: boolean
 *                     qrCode:
 *                       type: string
 *                       description: Base64 изображение QR кода
 *                     phoneNumber:
 *                       type: string
 *                     displayName:
 *                       type: string
 *                     message:
 *                       type: string
 *       404:
 *         description: Сессия не найдена
 */
router.get('/sessions/:sessionId/qr', getQRCode);

/**
 * @swagger
 * /api/whatsapp/sessions/{sessionId}/disconnect:
 *   post:
 *     summary: Отключение WhatsApp сессии
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID сессии WhatsApp
 *     responses:
 *       200:
 *         description: Сессия отключена успешно
 *       403:
 *         description: Недостаточно прав (только администраторы)
 *       404:
 *         description: Сессия не найдена
 */
router.post('/sessions/:sessionId/disconnect', disconnectSession);

/**
 * @swagger
 * /api/whatsapp/sessions/{sessionId}/access:
 *   post:
 *     summary: Предоставление доступа менеджеру к WhatsApp сессии
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID сессии WhatsApp
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - managerId
 *             properties:
 *               managerId:
 *                 type: string
 *                 description: ID менеджера
 *               canRead:
 *                 type: boolean
 *                 default: true
 *                 description: Разрешение на чтение сообщений
 *               canWrite:
 *                 type: boolean
 *                 default: true
 *                 description: Разрешение на отправку сообщений
 *               canManageChats:
 *                 type: boolean
 *                 default: false
 *                 description: Разрешение на управление чатами
 *     responses:
 *       200:
 *         description: Доступ предоставлен успешно
 *       403:
 *         description: Недостаточно прав (только администраторы)
 *       404:
 *         description: Сессия или менеджер не найдены
 */
router.post('/sessions/:sessionId/access', grantManagerAccess);

/**
 * @swagger
 * /api/whatsapp/sessions/{sessionId}/access:
 *   get:
 *     summary: Получение списка доступов менеджеров к WhatsApp сессии
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID сессии WhatsApp
 *     responses:
 *       200:
 *         description: Список доступов получен успешно
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       sessionId:
 *                         type: string
 *                       managerId:
 *                         type: string
 *                       canRead:
 *                         type: boolean
 *                       canWrite:
 *                         type: boolean
 *                       canManageChats:
 *                         type: boolean
 *                       grantedAt:
 *                         type: string
 *                         format: date-time
 *                       manager:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           firstName:
 *                             type: string
 *                           lastName:
 *                             type: string
 *                           email:
 *                             type: string
 *       403:
 *         description: Недостаточно прав (только администраторы)
 *       404:
 *         description: Сессия не найдена
 */
router.get('/sessions/:sessionId/access', getManagerAccess);

/**
 * @swagger
 * /api/whatsapp/sessions/{sessionId}/access/{managerId}:
 *   delete:
 *     summary: Отзыв доступа менеджера к WhatsApp сессии
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID сессии WhatsApp
 *       - in: path
 *         name: managerId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID менеджера
 *     responses:
 *       200:
 *         description: Доступ отозван успешно
 *       403:
 *         description: Недостаточно прав (только администраторы)
 */
router.delete('/sessions/:sessionId/access/:managerId', revokeManagerAccess);

/**
 * @swagger
 * /api/whatsapp/sessions/{sessionId}/chats:
 *   get:
 *     summary: Получение списка чатов WhatsApp
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID сессии WhatsApp
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Номер страницы
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Количество чатов на странице
 *       - in: query
 *         name: includeGroups
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *           default: 'false'
 *         description: Включать ли групповые чаты
 *       - in: query
 *         name: includeStatus
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *           default: 'false'
 *         description: Включать ли статусы WhatsApp
 *       - in: query
 *         name: chatType
 *         schema:
 *           type: string
 *           enum: ['individual', 'group', 'all']
 *           default: 'individual'
 *         description: Тип чатов для фильтрации
 *     responses:
 *       200:
 *         description: Список чатов получен успешно
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
 *                     chats:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       type: object
 *       403:
 *         description: Нет доступа к сессии
 *       404:
 *         description: Сессия не найдена
 */
router.get('/sessions/:sessionId/chats', getChats);

/**
 * @swagger
 * /api/whatsapp/sessions/{sessionId}/chats/{chatId}/messages:
 *   get:
 *     summary: Получение сообщений чата
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID сессии WhatsApp
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID чата
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Номер страницы
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Количество сообщений на странице
 *     responses:
 *       200:
 *         description: Сообщения получены успешно
 *       403:
 *         description: Нет доступа к сессии
 *       404:
 *         description: Чат не найден
 */
router.get('/sessions/:sessionId/chats/:chatId/messages', getChatMessages);

/**
 * @swagger
 * /api/whatsapp/sessions/{sessionId}/chats/{chatId}/send:
 *   post:
 *     summary: Отправка сообщения в WhatsApp чат
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID сессии WhatsApp
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID чата
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 description: Текст сообщения
 *     responses:
 *       200:
 *         description: Сообщение отправлено успешно
 *       400:
 *         description: Пустое сообщение
 *       403:
 *         description: Нет права на отправку сообщений
 *       404:
 *         description: Чат не найден
 */
router.post('/sessions/:sessionId/chats/:chatId/send', sendMessage);

/**
 * @swagger
 * /api/whatsapp/sessions/{sessionId}/chats/{chatId}/read:
 *   post:
 *     summary: Отметить сообщения чата как прочитанные
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID сессии WhatsApp
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID чата
 *     responses:
 *       200:
 *         description: Сообщения отмечены как прочитанные
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     markedCount:
 *                       type: integer
 *                       description: Количество отмеченных сообщений
 *                     chat:
 *                       type: object
 *                       description: Обновленная информация о чате
 *       403:
 *         description: Нет доступа к сессии
 *       404:
 *         description: Чат не найден
 */
router.post('/sessions/:sessionId/chats/:chatId/read', markChatAsRead);

/**
 * @swagger
 * /api/whatsapp/stats:
 *   get:
 *     summary: Получение статистики WhatsApp для компании
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Статистика получена успешно
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
 *                     sessions:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         connected:
 *                           type: integer
 *                         disconnected:
 *                           type: integer
 *                     chats:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                     messages:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         last30Days:
 *                           type: object
 *                           properties:
 *                             total:
 *                               type: integer
 *                             incoming:
 *                               type: integer
 *                             outgoing:
 *                               type: integer
 */
router.get('/stats', getWhatsAppStats);

/**
 * @swagger
 * /api/whatsapp/websocket/config:
 *   get:
 *     summary: Получить конфигурацию WebSocket для подключения
 *     description: Возвращает правильные настройки для подключения к WhatsApp WebSocket
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Конфигурация WebSocket
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 websocket_url:
 *                   type: string
 *                   example: "http://localhost:3000/socket.io/"
 *                 namespace:
 *                   type: string  
 *                   example: "/whatsapp"
 *                 full_url:
 *                   type: string
 *                   example: "http://localhost:3000/whatsapp"
 *                 options:
 *                   type: object
 *                   properties:
 *                     transports:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["websocket", "polling"]
 *                     timeout:
 *                       type: number
 *                       example: 20000
 *       401:
 *         description: Не авторизован
 */
router.get('/websocket/config', authMiddleware, (req, res) => {
  const serverUrl = process.env.NODE_ENV === 'production' 
    ? 'https://vcl-back.vercel.app' 
    : `http://localhost:${process.env.PORT || 3000}`;
    
  res.json({
    message: 'Конфигурация WebSocket для WhatsApp',
    websocket_url: `${serverUrl}/socket.io/`,
    namespace: '/whatsapp',
    full_url: `${serverUrl}/whatsapp`,
    options: {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      path: '/socket.io/',
      auth: {
        token: 'YOUR_JWT_TOKEN_HERE'
      }
    },
    example_frontend_code: {
      connection: `import io from 'socket.io-client';\n\nconst socket = io('${serverUrl}/whatsapp', {\n  transports: ['websocket', 'polling'],\n  timeout: 20000,\n  auth: {\n    token: 'YOUR_JWT_TOKEN'\n  }\n});`,
      handlers: `socket.on('connect', () => {\n  console.log('Connected to WhatsApp WebSocket');\n});\n\nsocket.on('connection-confirmed', (data) => {\n  console.log('Connection confirmed:', data);\n});`
    }
  });
});

export default router; 