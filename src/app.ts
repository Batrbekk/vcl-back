import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { VoiceChatController } from './controllers/voiceChat.controller';
import { WhatsAppSessionManager } from './services/whatsappSessionManager';
import { WhatsAppWebSocketController } from './controllers/whatsappWebSocketController';
import { setWhatsAppSessionManager } from './controllers/whatsappController';
import cors from 'cors';
import dotenv from 'dotenv';

// Импортируем роуты
import authRoutes from './routes/authRoutes';
import agentRoutes from './routes/agentRoutes';
import managerRoutes from './routes/managerRoutes';
import phoneRoutes from './routes/phoneRoutes';
import voiceRoutes from './routes/voiceRoutes';
import whatsappRoutes from './routes/whatsappRoutes';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Настройка CORS
app.use(cors({
  origin: '*', // Временно разрешаем все origins для тестирования
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true
}));

app.use(express.json());

// Простой тест роут прямо здесь
app.post('/simple-test', (req, res) => {
  console.log('Простой тест POST роут работает!');
  res.json({ message: 'Simple test works!' });
});

// Инициализация Socket.IO с расширенной конфигурацией
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Временно разрешаем все origins для тестирования
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  transports: ['websocket', 'polling'],
  path: '/socket.io/'
});

// Добавляем логирование для отслеживания подключений
io.on('connection', (socket) => {
  console.log('New client connected, socket id:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected, socket id:', socket.id);
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Базовый маршрут для проверки работы сервера
app.get('/', (req, res) => {
  res.json({
    message: 'VCL Backend API',
    version: '2.0.0',
    database: 'PostgreSQL with Prisma',
    docs: '/api-docs'
  });
});



// Инициализация контроллера для голосового чата
const voiceChatController = new VoiceChatController(io);

// Инициализация WhatsApp Session Manager
const whatsappSessionManager = new WhatsAppSessionManager(io);

// Инициализация WhatsApp WebSocket контроллера
const whatsappWebSocketController = new WhatsAppWebSocketController(io, whatsappSessionManager);

// Связываем WebSocket контроллер с менеджером сессий
whatsappSessionManager.setWebSocketController(whatsappWebSocketController);

// Устанавливаем менеджер сессий в контроллер
setWhatsAppSessionManager(whatsappSessionManager);

// Инициализация существующих WhatsApp сессий при запуске
whatsappSessionManager.initializeExistingSessions().catch(error => {
  console.error('[App] Ошибка инициализации WhatsApp сессий:', error);
});

// Routes
app.get('/api/voice-chat/session', (req, res) => voiceChatController.getSessionInfo(req, res));

// Подключаем роуты API
app.use('/api/auth', authRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/managers', managerRoutes);
app.use('/api/phone', phoneRoutes);
app.use('/api/voice', voiceRoutes);

// WhatsApp роуты
console.log('Подключение WhatsApp роутов...');
app.use('/api/whatsapp', whatsappRoutes);
console.log('WhatsApp роуты подключены');

// Добавляем обработчик для проверки статуса Socket.IO
app.get('/socket.io-status', (req, res) => {
  const connectedSockets = io.sockets.sockets.size;
  res.json({
    status: 'active',
    socketPath: '/socket.io/',
    transports: ['websocket', 'polling'],
    connectedClients: connectedSockets
  });
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Socket.IO server is running with path: /socket.io/`);
}); 