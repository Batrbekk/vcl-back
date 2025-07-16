import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { VoiceChatController } from './controllers/voiceChat.controller';
import cors from 'cors';
import dotenv from 'dotenv';

// Импортируем роуты
import authRoutes from './routes/authRoutes';
import agentRoutes from './routes/agentRoutes';
import managerRoutes from './routes/managerRoutes';
import phoneRoutes from './routes/phoneRoutes';
import voiceRoutes from './routes/voiceRoutes';

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

// Routes
app.get('/api/voice-chat/session', (req, res) => voiceChatController.getSessionInfo(req, res));

// Подключаем роуты API
app.use('/api/auth', authRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/managers', managerRoutes);
app.use('/api/phone', phoneRoutes);
app.use('/api/voice', voiceRoutes);

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