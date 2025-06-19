import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import authRoutes from './src/routes/authRoutes';
import managerRoutes from './src/routes/managerRoutes';
import agentRoutes from './src/routes/agentRoutes';
import voiceRoutes from './src/routes/voiceRoutes';
import supportRoutes from './src/routes/supportRoutes';
import phoneRoutes from './src/routes/phoneRoutes';
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

// Подключение к MongoDB с расширенными настройками
const connectToMongoDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }

    console.log('Attempting to connect to MongoDB...');
    console.log('MongoDB URI (masked):', mongoUri.replace(/\/\/.*@/, '//***:***@'));

    await mongoose.connect(mongoUri, {
      // Настройки для продакшена
      maxPoolSize: 10, // Максимальное количество подключений в пуле
      serverSelectionTimeoutMS: 10000, // Тайм-аут выбора сервера
      socketTimeoutMS: 45000, // Тайм-аут сокета
      retryWrites: true, // Повторные попытки записи
    });

    console.log('✅ Successfully connected to MongoDB Atlas');
    
    // Обработка событий подключения
    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });

  } catch (error: any) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    
    // Дополнительная информация для отладки
    if (error.message.includes('IP')) {
      console.error('💡 Suggestion: Check MongoDB Atlas IP whitelist');
      console.error('💡 Add your server IP to Network Access in MongoDB Atlas');
    }
    
    if (error.message.includes('authentication')) {
      console.error('💡 Suggestion: Check MongoDB username/password in connection string');
    }
    
    // Завершаем процесс при критической ошибке подключения
    process.exit(1);
  }
};

// Вызываем функцию подключения
connectToMongoDB();

// Маршруты
app.use('/api/auth', authRoutes);
app.use('/api/managers', managerRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/voices', voiceRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/phone', phoneRoutes);

// Корневой маршрут
app.get('/', (req, res) => {
  res.json({ message: 'Hello World' });
});

// Обработка ошибок
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Что-то пошло не так!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Swagger UI available at http://localhost:${PORT}/api-docs`);
});