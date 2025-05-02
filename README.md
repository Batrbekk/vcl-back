# VCL Backend API

Бэкенд API для проекта VCL, хостинг на Vercel.

## 🚀 Технологии

- **Backend:** Node.js, TypeScript, Express.js
- **База данных:** MongoDB (Mongoose)
- **Аутентификация:** JWT, bcryptjs
- **Документация:** Swagger
- **Email:** Nodemailer
- **Хостинг:** Vercel

## 📋 Требования

- Node.js (версия 14 или выше)
- MongoDB
- npm или yarn

## 🔧 Установка

1. Клонируйте репозиторий:
```bash
git clone https://github.com/your-username/vcl-back.git
cd vcl-back
```

2. Установите зависимости:
```bash
npm install
```

3. Создайте файл .env в корне проекта:
```env
# Основные настройки
PORT=3000
NODE_ENV=development # или production для продакшена

# База данных
MONGODB_URI=your_mongodb_uri

# JWT
JWT_SECRET=your_jwt_secret

# Email
EMAIL_USER=your_email
EMAIL_PASS=your_email_password
```

## 🚀 Запуск

### Разработка
```bash
npm run dev
```

### Продакшн
```bash
npm run build
npm start
```

## 📚 Документация API

Документация API доступна по адресу `/api-docs` после запуска сервера. Используется Swagger UI для интерактивной документации.

## 🌐 Хостинг

Проект хостится на Vercel. Для деплоя используется автоматический CI/CD через GitHub.

### Деплой на Vercel

1. Убедитесь, что у вас есть аккаунт на Vercel
2. Подключите ваш GitHub репозиторий
3. Настройте переменные окружения в Vercel:
   - NODE_ENV=production
   - MONGODB_URI
   - JWT_SECRET
   - EMAIL_USER
   - EMAIL_PASS

## 📁 Структура проекта

```
vcl-back/
├── src/            # Исходный код
├── public/         # Статические файлы
├── views/          # Шаблоны
├── .vscode/        # Настройки VS Code
├── .gitignore      # Игнорируемые файлы Git
├── package.json    # Зависимости и скрипты
├── tsconfig.json   # Конфигурация TypeScript
├── vcl-api.yaml    # Swagger документация
└── vercel.json     # Конфигурация Vercel
```

## 🔒 Безопасность

- JWT аутентификация
- Хеширование паролей с помощью bcrypt
- CORS настройки
- Защита конфиденциальных данных через .env

## 📝 Лицензия

ISC