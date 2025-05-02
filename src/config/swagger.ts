import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'VCL API',
      version: '1.0.0',
      description: 'API для системы аутентификации VCL',
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://vcl-back.vercel.app' 
          : 'http://localhost:3000',
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Локальный сервер разработки',
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'], // Путь к файлам с маршрутами
};

export const swaggerSpec = swaggerJsdoc(options); 