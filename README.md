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

## Новые возможности

### Получение информации о LLM моделях и ценах

Добавлен новый эндпоинт для получения доступных LLM моделей и их цен за минуту использования:

**GET** `/api/agents/llm-prices`

#### Параметры запроса:
- `agent_id` (опционально) - ID конкретного агента

#### Пример запроса:
```bash
curl -X GET "http://localhost:3000/api/agents/llm-prices" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Пример ответа:
```json
{
  "message": "Информация о доступных LLM моделях получена",
  "llm_prices": [
    {
      "llm": "gpt-4o-mini",
      "price_per_minute": 0.0006269457946554367
    },
    {
      "llm": "gpt-4o",
      "price_per_minute": 0.010449096577590612
    },
    {
      "llm": "claude-3-5-sonnet",
      "price_per_minute": 0.012956660467721747
    }
  ],
  "retrieved_at": "2025-01-15T12:00:00Z"
}
```

#### Требования:
- Авторизация: Bearer Token (JWT)
- Права доступа: Администратор

#### Документация Swagger:
Эндпоинт задокументирован в Swagger UI по адресу `/api-docs`

### Получение списка базы знаний

Добавлен новый эндпоинт для получения списка документов базы знаний из ElevenLabs:

**GET** `/api/agents/knowledge-base`

#### Параметры запроса:
- `cursor` (опционально) - курсор для пагинации
- `page_size` (опционально) - количество документов на странице (по умолчанию 30)

#### Пример запроса:
```bash
curl -X GET "http://localhost:3000/api/agents/knowledge-base?page_size=10" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Пример ответа:
```json
{
  "message": "Список базы знаний получен",
  "documents": [
    {
      "id": "POWdTREbVATbWkxwau6A",
      "name": "Mycar.kz - Покупка и продажа автомобилей в Казахстане",
      "metadata": {
        "created_at_unix_secs": 1750195117,
        "last_updated_at_unix_secs": 1750195117,
        "size_bytes": 3051
      },
      "supported_usages": ["prompt", "auto"],
      "access_info": {
        "is_creator": true,
        "creator_name": "Batyrbek Kuandyk",
        "creator_email": "batrbekk@gmail.com",
        "role": "admin"
      },
      "dependent_agents": [],
      "type": "url",
      "url": "https://mycar.kz"
    }
  ],
  "next_cursor": null,
  "has_more": false,
  "retrieved_at": "2025-01-15T12:00:00Z"
}
```

#### Требования:
- Авторизация: Bearer Token (JWT)
- Права доступа: Администратор

#### Документация Swagger:
Эндпоинт задокументирован в Swagger UI по адресу `/api-docs`

### Обновление агента

Добавлен новый эндпоинт для обновления данных агента в ElevenLabs с синхронизацией в MongoDB:

**PATCH** `/api/agents/{id}`

#### Параметры:
- `id` (обязательно) - ID агента в ElevenLabs

#### Тело запроса (все поля опциональны):
- `name` - имя агента
- `conversation_config` - конфигурация разговора агента
- `platform_settings` - настройки платформы
- `tags` - массив тегов

#### Пример запроса:
```bash
curl -X PATCH "http://localhost:3000/api/agents/yufIbo0uUuoT5yZv5vds" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"name": "Guzel", "tags": ["sales", "mycar"]}'
```

#### Пример ответа:
```json
{
  "message": "Агент успешно обновлен",
  "agent_id": "yufIbo0uUuoT5yZv5vds",
  "name": "Guzel",
  "conversation_config": {
    "asr": {
      "quality": "high",
      "provider": "elevenlabs"
    }
  },
  "tags": ["sales", "mycar"],
  "synced": true,
  "synced_at": "2025-01-15T12:00:00Z",
  "updated_at": "2025-01-15T12:00:00Z"
}
```

#### Требования:
- Авторизация: Bearer Token (JWT)
- Права доступа: Администратор
- Агент должен существовать в локальной базе данных

#### Особенности:
- Автоматическая синхронизация с MongoDB после успешного обновления
- Возвращает полную конфигурацию обновленного агента
- Поддерживает частичное обновление (можно обновить только нужные поля)

#### Документация Swagger:
Эндпоинт задокументирован в Swagger UI по адресу `/api-docs`