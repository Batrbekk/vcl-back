# WhatsApp Integration - Устранение проблемы с роутингом

## Проблема

При интеграции WhatsApp в проект vcl-back возникала ошибка "Cannot POST /api/whatsapp/sessions" при выполнении POST запросов к API роутам WhatsApp.

## Диагностика

### Симптомы:
- GET запросы работали нормально
- POST запросы возвращали HTML ошибку "Cannot POST /api/whatsapp/sessions"
- Другие API роуты (например, auth) работали корректно

### Причина:
В проекте было обнаружено **два Express сервера**, работающих на одном порту (3000):
1. **Основной сервер** (`index.ts`) - содержал роуты auth, managers, agents и т.д.
2. **Дополнительный сервер** (`src/app.ts`) - был создан для WhatsApp интеграции

Дополнительный сервер перекрывал основной, что приводило к недоступности роутов WhatsApp.

## Решение

### 1. Анализ структуры проекта
```
vcl-back/
├── index.ts           # Основной сервер
└── src/app.ts         # Конфликтующий сервер
```

### 2. Интеграция WhatsApp в основной сервер

Все компоненты WhatsApp были перенесены в основной сервер `index.ts`:

**Добавленные импорты:**
```typescript
import { createServer } from 'http';
import { Server } from 'socket.io';
import { WhatsAppSessionManager } from './src/services/whatsappSessionManager';
import { setWhatsAppSessionManager } from './src/controllers/whatsappController';
import whatsappRoutes from './src/routes/whatsappRoutes';
```

**Настройка HTTP сервера и Socket.IO:**
```typescript
const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],
  path: '/socket.io/'
});
```

**Инициализация WhatsApp Session Manager:**
```typescript
const whatsappSessionManager = new WhatsAppSessionManager(io);
setWhatsAppSessionManager(whatsappSessionManager);

whatsappSessionManager.initializeExistingSessions().catch(error => {
  console.error('[App] Ошибка инициализации WhatsApp сессий:', error);
});
```

**Регистрация роутов:**
```typescript
app.use('/api/whatsapp', whatsappRoutes);
```

**Запуск HTTP сервера:**
```typescript
httpServer.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`🔌 Socket.IO server is running with path: /socket.io/`);
});
```

### 3. Удаление конфликтующих файлов

- Удален `src/app.ts` (дополнительный сервер)
- Удалены временные тестовые файлы

## Результат

После интеграции все API роуты WhatsApp работают корректно:

### ✅ Создание сессии:
```bash
curl -X POST http://localhost:3000/api/whatsapp/sessions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "sessionId": "cmd5u0y7b0001xurbphmqfoe4",
    "message": "WhatsApp сессия создана. Ожидайте QR код для авторизации."
  }
}
```

### ✅ Получение QR кода:
```bash
curl -X GET "http://localhost:3000/api/whatsapp/sessions/{sessionId}/qr" \
  -H "Authorization: Bearer <token>"
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "isConnected": false,
    "qrCode": "data:image/png;base64,iVBORw0KGg...",
    "message": "Отсканируйте QR код в WhatsApp для авторизации"
  }
}
```

### ✅ Получение списка сессий:
```bash
curl -X GET "http://localhost:3000/api/whatsapp/sessions" \
  -H "Authorization: Bearer <token>"
```

## Рекомендации

1. **Один сервер на проект** - избегайте создания нескольких Express серверов на одном порту
2. **Проверка портов** - всегда убеждайтесь, что нет конфликтов портов при добавлении новых сервисов
3. **Структура проекта** - используйте основной файл сервера как единую точку входа
4. **Отладка роутинга** - при проблемах с роутами проверяйте порядок регистрации middleware и роутов

## Особенности архитектуры

Интегрированная система включает:
- **Multi-tenancy** - изоляция сессий по компаниям
- **Role-based access** - разграничение прав администраторов и менеджеров
- **WebSocket events** - real-time уведомления о статусе соединения
- **Session persistence** - восстановление сессий после перезапуска сервера
- **Complete API** - полный набор endpoints для управления WhatsApp интеграцией 

# ✅ РЕШЕНО: WhatsApp WebSocket Connection Timeout

## 🎯 Проблема решена!

**Статус**: ✅ **ИСПРАВЛЕНО**  
**Дата**: 16 июля 2025 года  
**Основная причина**: Отсутствовала инициализация `WhatsAppWebSocketController` в главном файле `index.ts`

---

## 🔍 Анализ проблемы

### Исходные ошибки:
1. `Error: timeout` - таймаут подключения
2. `Error: Invalid namespace` - namespace `/whatsapp` не существовал
3. `WebSocket connection to 'ws://localhost:3001/socket.io/' failed`

### Причины:
1. ❌ **Неправильный порт**: Фронтенд подключался к `3001`, сервер работал на `3000`
2. ❌ **Отсутствующий namespace**: `WhatsAppWebSocketController` не инициализировался  
3. ❌ **Неправильный URL**: Использовался `ws://` протокол вместо `http://`

---

## 🛠️ Исправления на бэкенде (выполнено)

### ✅ 1. Добавлена инициализация WhatsAppWebSocketController

**Файл**: `index.ts`
```typescript
// Добавлен импорт
import { WhatsAppWebSocketController } from './src/controllers/whatsappWebSocketController';

// Добавлена инициализация
const whatsappWebSocketController = new WhatsAppWebSocketController(io, whatsappSessionManager);
console.log('✅ WhatsApp WebSocket контроллер инициализирован');
```

### ✅ 2. Улучшена конфигурация Socket.IO
- Увеличены таймауты: `pingTimeout: 30000`, `connectTimeout: 20000`
- Добавлено подробное логирование подключений
- Исправлены CORS настройки для поддержки разных портов

### ✅ 3. Добавлены тестовые эндпоинты
- `/api/whatsapp/websocket/test-config` - получение правильной конфигурации

---

## 📱 Инструкции для фронтенда

### 🔧 Исправление whatsapp-socket.ts

**❌ Неправильный код (вызывал ошибки):**
```typescript
const socket = io('ws://localhost:3001/socket.io/', {
  transports: ['websocket', 'polling']
});
```

**✅ Правильный код:**
```typescript
import io from 'socket.io-client';

const BACKEND_URL = process.env.NODE_ENV === 'production' 
  ? 'https://vcl-back.vercel.app' 
  : 'http://localhost:3000';

const socket = io(`${BACKEND_URL}/whatsapp`, {
  transports: ['websocket', 'polling'],
  timeout: 20000,
  retries: 3,
  auth: {
    token: localStorage.getItem('token') // Ваш JWT токен
  }
});

// Обработчики подключения
socket.on('connect', () => {
  console.log('✅ Подключен к WhatsApp WebSocket');
});

socket.on('connection-confirmed', (data) => {
  console.log('✅ Подключение подтверждено:', data);
});

socket.on('connect_error', (error) => {
  console.error('❌ Ошибка подключения:', error.message);
  
  // Retry logic
  setTimeout(() => {
    socket.connect();
  }, 2000);
});

socket.on('disconnect', (reason) => {
  console.log('⚠️ Отключен от WebSocket:', reason);
});

export default socket;
```

### 🎯 Ключевые изменения:
1. **Порт**: `3001` → `3000`
2. **Протокол**: `ws://` → `http://`  
3. **Namespace**: добавлен `/whatsapp`
4. **Аутентификация**: добавлен `auth.token`
5. **Retry логика**: автопереподключение при ошибках

---

## 🧪 Тестирование (выполнено)

### ✅ Результаты тестов:
```
🧪 Тестирование WhatsApp WebSocket подключения...
✅ Успешно подключен к WhatsApp WebSocket!
✅ Подключение подтверждено сервером
✅ Ping-pong тест прошел
🏁 Тест завершен успешно
```

### 🔍 Проверка конфигурации:
```bash
curl http://localhost:3000/api/whatsapp/websocket/test-config
```

---

## 📋 Итоговый чеклист

### Бэкенд (✅ Готово):
- ✅ Инициализирован `WhatsAppWebSocketController`
- ✅ Namespace `/whatsapp` создается при запуске
- ✅ Улучшена конфигурация Socket.IO
- ✅ Добавлены обработчики ошибок
- ✅ Создан тестовый API эндпоинт

### Фронтенд (❗ Требует изменений):
- ❗ Изменить URL: `ws://localhost:3001/socket.io/` → `http://localhost:3000/whatsapp`
- ❗ Добавить JWT токен в `auth.token`
- ❗ Добавить обработчик `connection-confirmed`
- ❗ Добавить retry логику при ошибках

---

## 🎯 Главное решение

**Основная проблема была в отсутствии инициализации `WhatsAppWebSocketController` в файле `index.ts`.**

После добавления этой строки кода:
```typescript
const whatsappWebSocketController = new WhatsAppWebSocketController(io, whatsappSessionManager);
```

Все проблемы с "Invalid namespace" и "timeout" были решены.

**Теперь фронтенд должен подключаться к `http://localhost:3000/whatsapp` с валидным JWT токеном.** 