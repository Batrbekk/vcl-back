# Мультитинантность в VCL-Back

## Обзор

Система мультитинантности позволяет изолировать данные разных компаний в рамках одного приложения. Каждая компания имеет свои агенты, историю звонков, менеджеров, базу знаний и телефонные номера.

## Архитектура

### Основные компоненты

1. **Company** - Модель компании (тенанта)
2. **User** - Пользователи привязаны к компании через `companyId`
3. **Agent** - Агенты принадлежат компании
4. **ElevenLabsAgent** - Агенты ElevenLabs привязаны к компании
5. **Manager** - Менеджеры принадлежат компании

### Поля для мультитинантности

Все модели содержат поле `companyId` для привязки к компании:

```typescript
companyId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Company',
  required: true
}
```

## Middleware

### TenantMiddleware

Проверяет принадлежность пользователя к активной компании:

```typescript
import { tenantMiddleware } from '../middleware/tenantMiddleware';

// Использование в роутах
router.get('/agents', [authMiddleware, tenantMiddleware], getAgents);
```

### CheckCompanyLimits

Проверяет лимиты компании перед выполнением операций:

```typescript
import { checkCompanyLimits } from '../middleware/tenantMiddleware';

// Проверка лимитов агентов
router.post('/agents', [
  authMiddleware, 
  tenantMiddleware, 
  checkCompanyLimits('agents')
], createAgent);
```

## Регистрация и создание компании

При регистрации автоматически создается компания:

```typescript
// POST /api/auth/register
{
  "email": "admin@company.com",
  "firstName": "John",
  "lastName": "Doe",
  "companyName": "My Company",
  "password": "password123"
}
```

## Создание агентов

Агенты создаются в ElevenLabs и параллельно сохраняются в базе с привязкой к компании:

```typescript
// POST /api/agents
{
  "name": "My Agent"
}
```

## Фильтрация данных

Все запросы автоматически фильтруются по `companyId`:

```typescript
// Получение агентов только текущей компании
const agents = await ElevenLabsAgent.find({ companyId });
```

## Лимиты компании

Каждая компания имеет лимиты:

```typescript
limits: {
  max_agents: 10,
  max_phone_numbers: 5,
  max_managers: 3,
  max_monthly_calls: 1000
}
```

## API для управления компанией

### Получение информации о компании
```
GET /api/company/info
```

### Обновление настроек компании
```
PUT /api/company/settings
{
  "settings": {
    "timezone": "Europe/Moscow",
    "currency": "RUB",
    "language": "ru"
  }
}
```

### Статистика использования
```
GET /api/company/usage
```

### Список пользователей компании
```
GET /api/company/users
```

## Миграция существующих данных

Для миграции существующих данных к мультитинантности выполните:

```bash
# Запуск миграции
npm run migration

# Или напрямую
npx ts-node src/scripts/migration.ts
```

Миграция:
1. Создает компании для существующих пользователей
2. Привязывает всех агентов к компаниям
3. Обновляет менеджеров
4. Добавляет индексы для производительности

## Индексы для производительности

Добавлены следующие индексы:

```typescript
// User
userSchema.index({ companyId: 1 });
userSchema.index({ email: 1, companyId: 1 });

// Agent
agentSchema.index({ companyId: 1 });
agentSchema.index({ adminId: 1, companyId: 1 });

// ElevenLabsAgent
elevenLabsAgentSchema.index({ companyId: 1 });
elevenLabsAgentSchema.index({ agent_id: 1, companyId: 1 });

// Manager
managerSchema.index({ companyId: 1 });
managerSchema.index({ email: 1, companyId: 1 });
```

## Безопасность

1. **Изоляция данных**: Пользователи видят только данные своей компании
2. **Проверка активности**: Неактивные компании блокируются
3. **Лимиты**: Каждая компания имеет лимиты использования
4. **Статус подписки**: Проверяется при каждом запросе

## Структура ответов API

### Успешный ответ
```json
{
  "data": "...",
  "company": {
    "id": "company_id",
    "name": "Company Name",
    "slug": "company-name"
  }
}
```

### Ошибка превышения лимитов
```json
{
  "message": "Достигнут лимит для agents",
  "current": 10,
  "limit": 10,
  "subscription_plan": "basic"
}
```

## Мониторинг

Для мониторинга использования:

1. **Логи**: Все операции логируются с указанием компании
2. **Метрики**: Количество агентов, звонков, пользователей по компаниям
3. **Лимиты**: Отслеживание приближения к лимитам

## Тестирование

Для тестирования мультитинантности:

1. Создайте несколько компаний
2. Создайте пользователей в разных компаниях
3. Убедитесь, что данные изолированы
4. Проверьте работу лимитов
5. Протестируйте создание агентов в ElevenLabs

## Troubleshooting

### Частые проблемы:

1. **Пользователь не привязан к компании**: Запустите миграцию
2. **Превышение лимитов**: Обновите план подписки
3. **Компания неактивна**: Проверьте статус компании
4. **Ошибки создания агентов**: Проверьте связь с ElevenLabs API

### Команды для диагностики:

```bash
# Проверка статуса компаний
db.companies.find({ isActive: true }).count()

# Проверка пользователей без компании
db.users.find({ companyId: { $exists: false } }).count()

# Проверка агентов без компании
db.elevenlabsagents.find({ companyId: { $exists: false } }).count()
``` 