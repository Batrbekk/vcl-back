import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { databaseService } from './src/services/database';
import authRoutes from './src/routes/authRoutes';
import managerRoutes from './src/routes/managerRoutes';
import agentRoutes from './src/routes/agentRoutes';
import voiceRoutes from './src/routes/voiceRoutes';
import supportRoutes from './src/routes/supportRoutes';
import phoneRoutes from './src/routes/phoneRoutes';
import companyRoutes from './src/routes/companyRoutes';
import whatsappRoutes from './src/routes/whatsappRoutes';
import { WhatsAppSessionManager } from './src/services/whatsappSessionManager';
import { WhatsAppWebSocketController } from './src/controllers/whatsappWebSocketController';
import { setWhatsAppSessionManager } from './src/controllers/whatsappController';
import { swaggerSpec } from './src/config/swagger';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Настройка CORS
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Инициализация Socket.IO с улучшенной конфигурацией
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:4000', '*'], // Разрешаем различные порты для разработки
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  transports: ['websocket', 'polling'],
  path: '/socket.io/',
  pingTimeout: 30000, // 30 секунд
  pingInterval: 10000, // 10 секунд  
  connectTimeout: 20000, // 20 секунд на подключение
  serveClient: false, // отключаем служебные файлы
  allowEIO3: true // поддержка старых версий
});

// Логирование подключений к корневому namespace
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Новое подключение: ${socket.id}`);
  console.log(`[Socket.IO] Transport: ${socket.conn.transport.name}`);
  console.log(`[Socket.IO] User Agent: ${socket.handshake.headers['user-agent']}`);
  
  socket.on('disconnect', (reason) => {
    console.log(`[Socket.IO] Отключение ${socket.id}, причина: ${reason}`);
  });

  socket.on('error', (error) => {
    console.error(`[Socket.IO] Ошибка socket ${socket.id}:`, error);
  });

  // Тестовые обработчики
  socket.on('ping', () => {
    socket.emit('pong');
  });

  socket.on('test-connection', () => {
    socket.emit('connection-ok', { 
      socketId: socket.id, 
      timestamp: new Date().toISOString(),
      server: 'VCL Backend'
    });
  });
});

// Swagger UI
const swaggerOptions = {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "VCL API Documentation",
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
  }
};

// Подключение Swagger UI
app.use('/api-docs', swaggerUi.serve);
app.use('/api-docs', swaggerUi.setup(swaggerSpec, swaggerOptions));

// Подключение к базе данных
const initializeDatabase = async () => {
  try {
    await databaseService.connect();
    console.log('✅ Database initialization successful');
  } catch (error: any) {
    console.error('❌ Database initialization failed:', error.message);
    process.exit(1);
  }
};

// Вызываем функцию подключения
initializeDatabase();

// Инициализация WhatsApp Session Manager
const whatsappSessionManager = new WhatsAppSessionManager(io);
setWhatsAppSessionManager(whatsappSessionManager);

// Инициализация WhatsApp WebSocket контроллера для создания namespace /whatsapp
const whatsappWebSocketController = new WhatsAppWebSocketController(io, whatsappSessionManager);
console.log('✅ WhatsApp WebSocket контроллер инициализирован');

// Инициализация существующих WhatsApp сессий при запуске
whatsappSessionManager.initializeExistingSessions().catch(error => {
  console.error('[App] Ошибка инициализации WhatsApp сессий:', error);
});

// Маршруты
app.use('/api/auth', authRoutes);
app.use('/api/managers', managerRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/voices', voiceRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/phone', phoneRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Корневой маршрут
app.get('/', (req, res) => {
  res.json({ 
    message: 'VCL Backend API',
    version: '2.0.0',
    database: 'PostgreSQL with Prisma',
    docs: '/api-docs'
  });
});

// Обработка ошибок
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Что-то пошло не так!' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await databaseService.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await databaseService.shutdown();
  process.exit(0);
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📖 Swagger UI available at http://localhost:${PORT}/api-docs`);
  console.log(`🗄️  Database: PostgreSQL with Prisma (Neon)`);
  console.log(`🔌 Socket.IO server is running with path: /socket.io/`);
});