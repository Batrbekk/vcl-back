import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { VoiceChatController } from './controllers/voiceChat.controller';
import cors from 'cors';
import dotenv from 'dotenv';

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
  res.send('Server is running');
});

// Инициализация контроллера для голосового чата
const voiceChatController = new VoiceChatController(io);

// Routes
app.get('/api/voice-chat/session', (req, res) => voiceChatController.getSessionInfo(req, res));

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