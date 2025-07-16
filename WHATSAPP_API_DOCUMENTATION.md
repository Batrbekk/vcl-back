# 📱 WhatsApp API - Полная документация

## 🌐 REST API Endpoints

### 🔐 Авторизация
Все запросы требуют JWT токен в заголовке:
```
Authorization: Bearer your_jwt_token
```

---

## 📱 Управление сессиями

### 1. Создать новую сессию
```http
POST /api/whatsapp/sessions
Content-Type: application/json

{
  "displayName": "Основной WhatsApp"
}
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "sessionId": "cmd5u0y7b0001xurbphmqfoe4",
    "displayName": "Основной WhatsApp",
    "companyId": "cmd5rysyd0000le04ha593nam",
    "adminId": "cmd5ryt440002le04l5tumkfr",
    "isActive": true,
    "isConnected": false,
    "qrCode": null,
    "createdAt": "2025-07-16T10:30:00.000Z"
  }
}
```

### 2. Получить список сессий
```http
GET /api/whatsapp/sessions
```

**Ответ:**
```json
{
  "success": true,
  "data": [
    {
      "id": "cmd5u0y7b0001xurbphmqfoe4",
      "displayName": "Основной WhatsApp",
      "phoneNumber": "+77079856339",
      "isActive": true,
      "isConnected": true,
      "lastSeen": "2025-07-16T11:15:00.000Z",
      "admin": {
        "firstName": "Иван",
        "lastName": "Петров",
        "email": "admin@company.com"
      },
      "_count": {
        "chats": 15,
        "messages": 247
      }
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 10
  }
}
```

### 3. Получить QR код для авторизации
```http
GET /api/whatsapp/sessions/{sessionId}/qr
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
  }
}
```

### 4. Отключить сессию
```http
POST /api/whatsapp/sessions/{sessionId}/disconnect
```

**Ответ:**
```json
{
  "success": true,
  "message": "Сессия успешно отключена"
}
```

---

## 💬 Управление чатами

### 5. Получить список чатов
```http
GET /api/whatsapp/sessions/{sessionId}/chats
```

**Параметры запроса:**
- `page` (optional): Номер страницы (по умолчанию: 1)
- `limit` (optional): Количество на странице (по умолчанию: 50)
- `includeGroups` (optional): Включить групповые чаты (по умолчанию: false)
- `includeStatus` (optional): Включить статусы WhatsApp (по умолчанию: false)
- `chatType` (optional): Тип чатов (all, individual, group, status)

**Примеры:**
```http
GET /api/whatsapp/sessions/{sessionId}/chats?includeGroups=true
GET /api/whatsapp/sessions/{sessionId}/chats?chatType=individual
GET /api/whatsapp/sessions/{sessionId}/chats?page=2&limit=20
```

**Ответ:**
```json
{
  "success": true,
  "data": [
    {
      "id": "cmd5v5gkv000vxurb3egeyin3",
      "chatId": "77079856339@c.us",
      "chatName": "Солнышко мое 😊",
      "chatType": "individual",
      "isGroup": false,
      "lastMessageAt": "2025-07-16T11:13:54.000Z",
      "lastMessageText": "Привет! Как дела?",
      "unreadCount": 2,
      "isArchived": false,
      "_count": {
        "messages": 45
      }
    }
  ],
  "pagination": {
    "total": 15,
    "page": 1,
    "limit": 50
  }
}
```

### 6. Получить информацию о чате
```http
GET /api/whatsapp/sessions/{sessionId}/chats/{chatId}
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "id": "cmd5v5gkv000vxurb3egeyin3",
    "chatId": "77079856339@c.us",
    "chatName": "Солнышко мое 😊",
    "chatType": "individual",
    "isGroup": false,
    "lastMessageAt": "2025-07-16T11:13:54.000Z",
    "lastMessageText": "Привет! Как дела?",
    "unreadCount": 2,
    "isArchived": false,
    "createdAt": "2025-07-16T09:30:00.000Z"
  }
}
```

---

## 📩 Управление сообщениями

### 7. Получить сообщения чата
```http
GET /api/whatsapp/sessions/{sessionId}/chats/{chatId}/messages
```

**Параметры запроса:**
- `page` (optional): Номер страницы (по умолчанию: 1)
- `limit` (optional): Количество на странице (по умолчанию: 50)

**Ответ:**
```json
{
  "success": true,
  "data": [
    {
      "id": "cmd5v5gkw000wxurb7h2j8k1m",
      "messageId": "wamid.HBgNNzcwNzk4NTYzMzlBIBE...",
      "fromMe": false,
      "fromNumber": "77079856339@c.us",
      "fromName": "Солнышко мое 😊",
      "body": "Привет! Как дела?",
      "messageType": "text",
      "timestamp": "2025-07-16T11:13:54.000Z",
      "isRead": false,
      "managerId": null,
      "createdAt": "2025-07-16T11:13:54.000Z"
    }
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 50
  }
}
```

### 8. Отправить сообщение
```http
POST /api/whatsapp/sessions/{sessionId}/chats/{chatId}/messages
Content-Type: application/json

{
  "message": "Привет! Как дела?",
  "type": "text"
}
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "id": "cmd5v5gkw000wxurb7h2j8k1m",
    "messageId": "wamid.HBgNNzcwNzk4NTYzMzlFID...",
    "fromMe": true,
    "body": "Привет! Как дела?",
    "messageType": "text",
    "timestamp": "2025-07-16T11:15:00.000Z",
    "chatId": "cmd5v5gkv000vxurb3egeyin3"
  }
}
```

### 9. Отметить сообщения как прочитанные
```http
POST /api/whatsapp/sessions/{sessionId}/chats/{chatId}/read
```

**Ответ:**
```json
{
  "success": true,
  "message": "Сообщения отмечены как прочитанные"
}
```

---

## 👥 Управление менеджерами

### 10. Дать доступ менеджеру к сессии
```http
POST /api/whatsapp/sessions/{sessionId}/managers
Content-Type: application/json

{
  "managerId": "cmd5manager123456789",
  "permissions": ["read", "write"]
}
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "id": "cmd5access123456789",
    "managerId": "cmd5manager123456789",
    "sessionId": "cmd5u0y7b0001xurbphmqfoe4",
    "permissions": ["read", "write"],
    "grantedAt": "2025-07-16T11:20:00.000Z"
  }
}
```

### 11. Отозвать доступ менеджера
```http
DELETE /api/whatsapp/sessions/{sessionId}/managers/{managerId}
```

**Ответ:**
```json
{
  "success": true,
  "message": "Доступ менеджера отозван"
}
```

### 12. Получить список менеджеров с доступом
```http
GET /api/whatsapp/sessions/{sessionId}/managers
```

**Ответ:**
```json
{
  "success": true,
  "data": [
    {
      "id": "cmd5access123456789",
      "manager": {
        "id": "cmd5manager123456789",
        "firstName": "Анна",
        "lastName": "Иванова",
        "email": "manager@company.com"
      },
      "permissions": ["read", "write"],
      "grantedAt": "2025-07-16T11:20:00.000Z"
    }
  ]
}
```

---

## 📊 Статистика

### 13. Получить статистику компании
```http
GET /api/whatsapp/stats
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "sessions": {
      "total": 3,
      "active": 2,
      "connected": 1
    },
    "messages": {
      "total": 1247,
      "today": 45,
      "sent": 823,
      "received": 424
    },
    "chats": {
      "total": 67,
      "individual": 52,
      "groups": 15
    },
    "managers": {
      "total": 5,
      "withAccess": 3
    }
  }
}
```

---

## 🔌 WebSocket События

### Подключение к WebSocket
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  transports: ['websocket', 'polling'],
  path: '/socket.io/'
});

socket.auth = {
  token: 'your_jwt_token'
};
```

---

## 📨 События сообщений

### 1. Новое сообщение
```javascript
socket.on('whatsapp:new-message', (data) => {
  console.log('Новое сообщение:', data);
  
  // Структура данных:
  {
    sessionId: "cmd5u0y7b0001xurbphmqfoe4",
    companyId: "cmd5rysyd0000le04ha593nam",
    chat: {
      id: "cmd5v5gkv000vxurb3egeyin3",
      chatId: "77079856339@c.us",
      chatName: "Солнышко мое 😊",
      chatType: "individual",
      isGroup: false,
      lastMessageAt: "2025-07-16T11:13:54.000Z",
      lastMessageText: "Привет! Как дела?",
      unreadCount: 1
    },
    message: {
      id: "cmd5v5gkw000wxurb7h2j8k1m",
      messageId: "wamid.HBgNNzcwNzk4NTYzMzlBIBE...",
      fromMe: false,
      fromNumber: "77079856339@c.us",
      fromName: "Солнышко мое 😊",
      body: "Привет! Как дела?",
      messageType: "text",
      timestamp: "2025-07-16T11:13:54.000Z"
    }
  }
});
```

### 2. Обновление чата
```javascript
socket.on('whatsapp:chat-updated', (data) => {
  console.log('Чат обновлен:', data);
  
  // Структура данных:
  {
    sessionId: "cmd5u0y7b0001xurbphmqfoe4",
    companyId: "cmd5rysyd0000le04ha593nam",
    chatId: "cmd5v5gkv000vxurb3egeyin3",
    lastMessageAt: "2025-07-16T11:13:54.000Z",
    lastMessageText: "Привет! Как дела?",
    unreadCount: 1
  }
});
```

---

## 🔗 События сессий

### 3. QR код обновлен
```javascript
socket.on('whatsapp:qr-updated', (data) => {
  console.log('QR код обновлен:', data);
  
  // Структура данных:
  {
    sessionId: "cmd5u0y7b0001xurbphmqfoe4",
    qrCode: "data:image/png;base64,iVBORw0KGg..."
  }
});
```

### 4. Сессия подключена
```javascript
socket.on('whatsapp:session-connected', (data) => {
  console.log('WhatsApp подключен:', data);
  
  // Структура данных:
  {
    sessionId: "cmd5u0y7b0001xurbphmqfoe4",
    phoneNumber: "+77079856339",
    displayName: "Основной WhatsApp"
  }
});
```

### 5. Сессия отключена
```javascript
socket.on('whatsapp:session-disconnected', (data) => {
  console.log('WhatsApp отключен:', data);
  
  // Структура данных:
  {
    sessionId: "cmd5u0y7b0001xurbphmqfoe4",
    reason: "client_logout"
  }
});
```

---

## 📊 События статистики

### 6. Обновление статистики
```javascript
socket.on('whatsapp:stats-updated', (data) => {
  console.log('Статистика обновлена:', data);
  
  // Структура данных:
  {
    companyId: "cmd5rysyd0000le04ha593nam",
    stats: {
      totalChats: 15,
      unreadChats: 3,
      totalMessages: 247,
      todayMessages: 12,
      connectedSessions: 1
    }
  }
});
```

---

## ⚡ События активности

### 7. Статус печатания
```javascript
socket.on('whatsapp:typing-status', (data) => {
  console.log('Статус печатания:', data);
  
  // Структура данных:
  {
    sessionId: "cmd5u0y7b0001xurbphmqfoe4",
    chatId: "77079856339@c.us",
    isTyping: true,
    participantId: "77079856339@c.us",
    timestamp: "2025-07-16T11:15:30.000Z"
  }
});
```

### 8. Статус доставки сообщения
```javascript
socket.on('whatsapp:message-status', (data) => {
  console.log('Статус сообщения:', data);
  
  // Структура данных:
  {
    sessionId: "cmd5u0y7b0001xurbphmqfoe4",
    messageId: "wamid.HBgNNzcwNzk4NTYzMzlFID...",
    status: "delivered", // sent, delivered, read
    timestamp: "2025-07-16T11:15:35.000Z"
  }
});
```

---

## 🚨 События ошибок

### 9. Ошибка сессии
```javascript
socket.on('whatsapp:session-error', (data) => {
  console.error('Ошибка сессии:', data);
  
  // Структура данных:
  {
    sessionId: "cmd5u0y7b0001xurbphmqfoe4",
    errorType: "connection_lost",
    message: "Соединение с WhatsApp потеряно",
    timestamp: "2025-07-16T11:16:00.000Z"
  }
});
```

### 10. Ошибка отправки сообщения
```javascript
socket.on('whatsapp:send-error', (data) => {
  console.error('Ошибка отправки:', data);
  
  // Структура данных:
  {
    sessionId: "cmd5u0y7b0001xurbphmqfoe4",
    chatId: "cmd5v5gkv000vxurb3egeyin3",
    messageText: "Текст сообщения",
    errorType: "rate_limit",
    message: "Превышен лимит отправки сообщений",
    timestamp: "2025-07-16T11:16:05.000Z"
  }
});
```

---

## 👥 События доступа менеджеров

### 11. Доступ предоставлен
```javascript
socket.on('whatsapp:manager-access-granted', (data) => {
  console.log('Доступ предоставлен:', data);
  
  // Структура данных:
  {
    sessionId: "cmd5u0y7b0001xurbphmqfoe4",
    managerId: "cmd5manager123456789",
    managerName: "Анна Иванова",
    permissions: ["read", "write"],
    grantedBy: "cmd5ryt440002le04l5tumkfr",
    timestamp: "2025-07-16T11:20:00.000Z"
  }
});
```

### 12. Доступ отозван
```javascript
socket.on('whatsapp:manager-access-revoked', (data) => {
  console.log('Доступ отозван:', data);
  
  // Структура данных:
  {
    sessionId: "cmd5u0y7b0001xurbphmqfoe4",
    managerId: "cmd5manager123456789",
    managerName: "Анна Иванова",
    revokedBy: "cmd5ryt440002le04l5tumkfr",
    timestamp: "2025-07-16T11:25:00.000Z"
  }
});
```

---

## 🎯 Полный список WebSocket событий:

1. 📨 `whatsapp:new-message` - Новое сообщение
2. 💬 `whatsapp:chat-updated` - Обновление чата  
3. 📱 `whatsapp:qr-updated` - Обновление QR кода
4. ✅ `whatsapp:session-connected` - Сессия подключена
5. ❌ `whatsapp:session-disconnected` - Сессия отключена
6. 📊 `whatsapp:stats-updated` - Обновление статистики
7. ⚡ `whatsapp:typing-status` - Статус печатания
8. 📋 `whatsapp:message-status` - Статус доставки сообщения
9. 🚨 `whatsapp:session-error` - Ошибка сессии
10. ⚠️ `whatsapp:send-error` - Ошибка отправки сообщения
11. 👤 `whatsapp:manager-access-granted` - Доступ менеджера предоставлен
12. 🔒 `whatsapp:manager-access-revoked` - Доступ менеджера отозван

---

## 📚 Полный список REST API endpoints:

### Сессии:
- `POST /api/whatsapp/sessions` - Создать сессию
- `GET /api/whatsapp/sessions` - Список сессий
- `GET /api/whatsapp/sessions/{sessionId}/qr` - Получить QR код
- `POST /api/whatsapp/sessions/{sessionId}/disconnect` - Отключить сессию

### Чаты:
- `GET /api/whatsapp/sessions/{sessionId}/chats` - Список чатов
- `GET /api/whatsapp/sessions/{sessionId}/chats/{chatId}` - Информация о чате

### Сообщения:
- `GET /api/whatsapp/sessions/{sessionId}/chats/{chatId}/messages` - Сообщения чата
- `POST /api/whatsapp/sessions/{sessionId}/chats/{chatId}/messages` - Отправить сообщение
- `POST /api/whatsapp/sessions/{sessionId}/chats/{chatId}/read` - Отметить как прочитанное

### Менеджеры:
- `POST /api/whatsapp/sessions/{sessionId}/managers` - Дать доступ менеджеру
- `DELETE /api/whatsapp/sessions/{sessionId}/managers/{managerId}` - Отозвать доступ
- `GET /api/whatsapp/sessions/{sessionId}/managers` - Список менеджеров

### Статистика:
- `GET /api/whatsapp/stats` - Статистика компании

---

## 🔧 Коды ошибок

| Код | Описание |
|-----|----------|
| 400 | Неверные параметры запроса |
| 401 | Не авторизован |
| 403 | Нет доступа к ресурсу |
| 404 | Ресурс не найден |
| 409 | Конфликт (сессия уже существует) |
| 429 | Превышен лимит запросов |
| 500 | Внутренняя ошибка сервера |

---

## 🎯 Примеры интеграции

### React Hook для WhatsApp
```typescript
import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

export const useWhatsApp = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    const newSocket = io('http://localhost:3000');
    
    newSocket.on('whatsapp:new-message', (data) => {
      setMessages(prev => [...prev, data.message]);
    });
    
    newSocket.on('whatsapp:session-connected', (data) => {
      setSessions(prev => prev.map(session =>
        session.id === data.sessionId
          ? { ...session, isConnected: true, phoneNumber: data.phoneNumber }
          : session
      ));
    });
    
    setSocket(newSocket);
    
    return () => newSocket.close();
  }, []);

  const sendMessage = async (sessionId: string, chatId: string, message: string) => {
    const response = await fetch(`/api/whatsapp/sessions/${sessionId}/chats/${chatId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ message, type: 'text' })
    });
    
    return response.json();
  };

  return { socket, messages, sessions, sendMessage };
};
```

**Real-time WhatsApp интеграция готова!** 🚀 