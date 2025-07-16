# Настройка PostgreSQL для Production на Vercel

## Проблема
SQLite не работает на Vercel из-за serverless архитектуры. Нужна внешняя база данных.

## Решение: Neon PostgreSQL (бесплатно)

### 1. Создание базы данных на Neon

1. Переходим на https://neon.tech
2. Регистрируемся/входим через GitHub
3. Создаем новый проект
4. Выбираем регион (лучше ближайший к вашим пользователям)
5. Копируем строку подключения

### 2. Настройка переменных окружения

#### Локальная разработка (.env):
```env
# Для локальной разработки можете оставить SQLite
DATABASE_URL="file:./dev.db"

# Остальные переменные...
GEMINI="your_gemini_key"
JWT_SECRET="your_jwt_secret"
ELEVENLABS_API_KEY="your_elevenlabs_key"
# и т.д.
```

#### Production на Vercel:
В настройках проекта Vercel добавьте:
```env
DATABASE_URL="postgresql://username:password@host/database?sslmode=require"
```

### 3. Миграция данных

#### Для новой базы (без данных):
```bash
npm run db:push
```

#### Для существующих данных:
1. Экспортируйте данные из SQLite
2. Создайте миграцию:
```bash
npx prisma migrate dev --name init_postgresql
```
3. Примените миграцию:
```bash
npm run db:migrate
```

### 4. Деплой на Vercel

1. Установите переменную `DATABASE_URL` в настройках Vercel
2. Задеплойте проект - миграции применятся автоматически

## Альтернативные провайдеры

- **Supabase**: https://supabase.com (бесплатный тариф)
- **Railway**: https://railway.app (бесплатный тариф) 
- **PlanetScale**: https://planetscale.com (MySQL, бесплатный тариф)

## Автоматические миграции на Vercel

Миграции применяются автоматически при деплое благодаря:
```json
"vercel-build": "prisma generate && tsc"
```

При необходимости можно добавить автоматические миграции:
```json
"vercel-build": "prisma migrate deploy && prisma generate && tsc"
``` 