import express from 'express';
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
import { swaggerSpec } from './src/config/swagger';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

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

// Маршруты
app.use('/api/auth', authRoutes);
app.use('/api/managers', managerRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/voices', voiceRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/phone', phoneRoutes);
app.use('/api/company', companyRoutes);

// Корневой маршрут
app.get('/', (req, res) => {
  res.json({ 
    message: 'VCL Backend API',
    version: '2.0.0',
    database: 'SQLite with Prisma',
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
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📖 Swagger UI available at http://localhost:${PORT}/api-docs`);
  console.log(`🗄️  Database: SQLite with Prisma`);
});