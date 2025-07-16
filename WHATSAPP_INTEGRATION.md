# WhatsApp Интеграция в VCL-Back

## Обзор

Реализована полная интеграция с WhatsApp Web, позволяющая администраторам подключать свои WhatsApp аккаунты и предоставлять доступ менеджерам для работы с клиентами через WhatsApp.

## Основные возможности

✅ **QR-код авторизация** - Администратор сканирует QR-код для подключения WhatsApp  
✅ **Мультитенантность** - Каждая компания имеет изолированные сессии  
✅ **Управление доступом** - Администратор назначает менеджеров и настраивает их права  
✅ **Реальное время** - WebSocket уведомления о новых сообщениях  
✅ **Полная история** - Сохранение всех сообщений и чатов в базе данных  
✅ **Кроссплатформенность** - Менеджеры могут работать с разных устройств  

## Архитектура

```
┌─────────────────┐    ┌──────────────────┐    ┌────────────────┐
│   Администратор │    │ WhatsApp Session │    │   Менеджеры    │
│                 │────│     Manager      │────│                │
│  QR авторизация │    │                  │    │ Чтение/Запись  │
└─────────────────┘    └──────────────────┘    └────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                ┌───▼────┐        ┌─────▼─────┐
                │ Чаты   │        │ Сообщения │
                │ (БД)   │        │   (БД)    │
                └────────┘        └───────────┘
```

## Модели базы данных

### WhatsAppSession
- Основная сессия WhatsApp для компании
- Хранит QR-код, статус подключения, информацию об аккаунте

### WhatsAppManagerAccess  
- Доступ менеджеров к сессиям
- Права: canRead, canWrite, canManageChats

### WhatsAppChat
- Отдельные чаты с клиентами
- Информация о контакте, последнее сообщение, счетчик непрочитанных

### WhatsAppMessage
- Все сообщения чатов
- Метаданные: отправитель, время, тип, статус прочтения

## API Endpoints

### Управление сессиями

#### Создание сессии (только админ)
```http
POST /api/whatsapp/sessions
Authorization: Bearer <jwt_token>
```

#### Получение QR-кода
```http
GET /api/whatsapp/sessions/{sessionId}/qr
Authorization: Bearer <jwt_token>
```

#### Список сессий компании
```http
GET /api/whatsapp/sessions
Authorization: Bearer <jwt_token>
```

#### Отключение сессии (только админ)
```http
POST /api/whatsapp/sessions/{sessionId}/disconnect
Authorization: Bearer <jwt_token>
```

### Управление доступом

#### Предоставление доступа менеджеру (только админ)
```http
POST /api/whatsapp/sessions/{sessionId}/access
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "managerId": "manager_id",
  "canRead": true,
  "canWrite": true,
  "canManageChats": false
}
```

#### Отзыв доступа (только админ)
```http
DELETE /api/whatsapp/sessions/{sessionId}/access/{managerId}
Authorization: Bearer <jwt_token>
```

### Работа с чатами

#### Получение списка чатов
```http
GET /api/whatsapp/sessions/{sessionId}/chats?page=1&limit=50
Authorization: Bearer <jwt_token>
```

#### Получение сообщений чата
```http
GET /api/whatsapp/sessions/{sessionId}/chats/{chatId}/messages?page=1&limit=50
Authorization: Bearer <jwt_token>
```

#### Отправка сообщения
```http
POST /api/whatsapp/sessions/{sessionId}/chats/{chatId}/send
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "message": "Текст сообщения"
}
```

### Статистика

#### Статистика WhatsApp для компании
```http
GET /api/whatsapp/stats
Authorization: Bearer <jwt_token>
```

## WebSocket События

### Клиентские события (от сервера)

#### QR-код для авторизации
```javascript
socket.on('whatsapp:qr', (data) => {
  console.log('QR код:', data.qrCode); // base64 изображение
  console.log('Сессия:', data.sessionId);
});
```

#### Успешная авторизация
```javascript
socket.on('whatsapp:ready', (data) => {
  console.log('WhatsApp подключен:', data.phoneNumber);
  console.log('Имя аккаунта:', data.displayName);
});
```

#### Новое сообщение
```javascript
socket.on('whatsapp:message', (data) => {
  console.log('Новое сообщение:', data.message);
  console.log('Чат:', data.chatId);
});
```

#### Сообщение отправлено
```javascript
socket.on('whatsapp:message_sent', (data) => {
  console.log('Сообщение отправлено:', data.message);
});
```

#### Отключение
```javascript
socket.on('whatsapp:disconnected', (data) => {
  console.log('WhatsApp отключен:', data.reason);
});
```

## Пример использования

### 1. Подключение WhatsApp (Администратор)

```javascript
// 1. Создать сессию
const response = await fetch('/api/whatsapp/sessions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const { data } = await response.json();
const sessionId = data.sessionId;

// 2. Получить QR-код
const qrResponse = await fetch(`/api/whatsapp/sessions/${sessionId}/qr`, {
  headers: { 'Authorization': `Bearer ${token}` }
});

const qrData = await qrResponse.json();
if (qrData.data.qrCode) {
  // Показать QR-код пользователю
  displayQRCode(qrData.data.qrCode);
}

// 3. Слушать события подключения
socket.on('whatsapp:ready', (data) => {
  console.log(`WhatsApp подключен: ${data.phoneNumber}`);
  // Скрыть QR-код, показать интерфейс управления
});
```

### 2. Предоставление доступа менеджеру

```javascript
// Получить список менеджеров
const managers = await fetch('/api/managers', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Предоставить доступ менеджеру
await fetch(`/api/whatsapp/sessions/${sessionId}/access`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    managerId: 'manager_id',
    canRead: true,
    canWrite: true,
    canManageChats: false
  })
});
```

### 3. Работа с чатами (Менеджер)

```javascript
// Получить список чатов
const chats = await fetch(`/api/whatsapp/sessions/${sessionId}/chats`, {
  headers: { 'Authorization': `Bearer ${managerToken}` }
});

// Получить сообщения чата
const messages = await fetch(`/api/whatsapp/sessions/${sessionId}/chats/${chatId}/messages`, {
  headers: { 'Authorization': `Bearer ${managerToken}` }
});

// Отправить сообщение
await fetch(`/api/whatsapp/sessions/${sessionId}/chats/${chatId}/send`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${managerToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: 'Здравствуйте! Как дела?'
  })
});

// Слушать новые сообщения
socket.on('whatsapp:message', (data) => {
  if (data.chatId === currentChatId) {
    // Добавить сообщение в интерфейс чата
    addMessageToChat(data.message);
  }
});
```

## Права доступа

### Администратор (admin)
- ✅ Создание и отключение WhatsApp сессий
- ✅ Получение QR-кодов для авторизации  
- ✅ Управление доступом менеджеров
- ✅ Просмотр всех чатов и сообщений
- ✅ Отправка сообщений
- ✅ Просмотр статистики

### Менеджер (manager)
- ❌ Создание сессий (только просмотр назначенных)
- ✅ Просмотр чатов (при наличии доступа canRead)
- ✅ Отправка сообщений (при наличии доступа canWrite)
- ✅ Управление чатами (при наличии доступа canManageChats)

## Безопасность

1. **Изоляция по компаниям** - Каждая компания видит только свои сессии
2. **Проверка прав доступа** - Менеджеры работают только с назначенными сессиями  
3. **Аутентификация** - Все запросы требуют JWT токен
4. **Логирование** - Все действия записываются в логи

## Мониторинг

### Логи
```bash
# Создание сессии
[WhatsApp] Создаем новую сессию для компании cm123
[WhatsApp] Сессия cm456 создана и инициализирована

# Авторизация
[WhatsApp] QR код получен для сессии cm456
[WhatsApp] Сессия cm456 успешно авторизована как 1234567890

# Сообщения
[WhatsApp] Сохранено сообщение для сессии cm456: Привет!
[WhatsApp] Сообщение отправлено для сессии cm456: Как дела?
```

### Статистика
- Количество активных сессий
- Общее количество чатов  
- Статистика сообщений за 30 дней
- Входящие/исходящие сообщения

## Ограничения

1. **Одна сессия на компанию** - Можно подключить только один WhatsApp аккаунт
2. **Зависимость от WhatsApp Web** - При изменениях в WhatsApp могут потребоваться обновления
3. **Требования к серверу** - Puppeteer требует установки Chrome/Chromium
4. **Файлы сессий** - Хранятся локально в папке `.whatsapp-sessions`

## Развертывание

### Требования
- Node.js 18+ 
- Chrome/Chromium (устанавливается автоматически с Puppeteer)
- PostgreSQL база данных

### Переменные окружения
Не требуются дополнительные переменные - используется существующая конфигурация.

### Docker
При развертывании в Docker добавить в Dockerfile:
```dockerfile
# Установка зависимостей для Puppeteer  
RUN apt-get update && apt-get install -y \
    chromium-browser \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV CHROME_BIN=/usr/bin/chromium-browser
```

## Устранение неисправностей

### Проблемы с QR-кодом
- Проверить, что Puppeteer может запустить браузер
- Убедиться, что нет блокировки файрвола
- Проверить логи на ошибки инициализации

### Сессия не подключается
- Удалить папку `.whatsapp-sessions/{sessionId}` 
- Создать новую сессию
- Проверить стабильность интернет-соединения

### Сообщения не доставляются
- Проверить статус подключения сессии
- Убедиться, что номер корректен (формат: номер@c.us)
- Проверить права доступа менеджера

Интеграция готова к использованию! 🚀 