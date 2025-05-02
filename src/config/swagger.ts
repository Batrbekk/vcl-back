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
        url: 'https://vcl-back.vercel.app',
        description: 'Production server',
      },
      {
        url: 'http://localhost:3000',
        description: 'Локальный сервер разработки',
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