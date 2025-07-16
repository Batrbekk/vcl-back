# WhatsApp WebSocket Events - Real-time Updates

## 🔌 Подключение к WebSocket

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  transports: ['websocket', 'polling'],
  path: '/socket.io/'
});

// Добавляем токен для авторизации (если требуется)
socket.auth = {
  token: 'your_jwt_token'
};
```

## 📨 События чатов и сообщений

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
    displayName: "Мой WhatsApp"
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

## 🎯 Практическое использование в React

### Zustand Store для WebSocket
```typescript
import { create } from 'zustand';
import io, { Socket } from 'socket.io-client';

interface WhatsAppStore {
  socket: Socket | null;
  messages: Message[];
  chats: Chat[];
  sessions: Session[];
  
  // Actions
  initSocket: () => void;
  disconnectSocket: () => void;
  addMessage: (message: Message) => void;
  updateChat: (chatId: string, updates: Partial<Chat>) => void;
}

export const useWhatsAppStore = create<WhatsAppStore>((set, get) => ({
  socket: null,
  messages: [],
  chats: [],
  sessions: [],
  
  initSocket: () => {
    const socket = io('http://localhost:3000');
    
    // Обработчики событий
    socket.on('whatsapp:new-message', (data) => {
      set((state) => ({
        messages: [...state.messages, data.message],
        chats: state.chats.map(chat => 
          chat.id === data.chat.id 
            ? { ...chat, ...data.chat }
            : chat
        )
      }));
    });
    
    socket.on('whatsapp:chat-updated', (data) => {
      set((state) => ({
        chats: state.chats.map(chat =>
          chat.id === data.chatId
            ? { 
                ...chat, 
                lastMessageAt: data.lastMessageAt,
                lastMessageText: data.lastMessageText,
                unreadCount: data.unreadCount
              }
            : chat
        )
      }));
    });
    
    socket.on('whatsapp:session-connected', (data) => {
      set((state) => ({
        sessions: state.sessions.map(session =>
          session.id === data.sessionId
            ? { 
                ...session, 
                isConnected: true,
                phoneNumber: data.phoneNumber,
                displayName: data.displayName
              }
            : session
        )
      }));
    });
    
    set({ socket });
  },
  
  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null });
    }
  },
  
  addMessage: (message) => {
    set((state) => ({
      messages: [...state.messages, message]
    }));
  },
  
  updateChat: (chatId, updates) => {
    set((state) => ({
      chats: state.chats.map(chat =>
        chat.id === chatId ? { ...chat, ...updates } : chat
      )
    }));
  }
}));
```

### React Hook для WebSocket
```typescript
import { useEffect } from 'react';
import { useWhatsAppStore } from '../stores/whatsapp-store';

export const useWhatsAppSocket = () => {
  const { initSocket, disconnectSocket } = useWhatsAppStore();
  
  useEffect(() => {
    initSocket();
    
    return () => {
      disconnectSocket();
    };
  }, []);
};
```

### Компонент чата с real-time обновлениями
```typescript
import React, { useEffect } from 'react';
import { useWhatsAppStore } from '../stores/whatsapp-store';
import { useWhatsAppSocket } from '../hooks/useWhatsAppSocket';

export const ChatList: React.FC = () => {
  const { chats, messages } = useWhatsAppStore();
  
  // Инициализация WebSocket
  useWhatsAppSocket();
  
  return (
    <div className="space-y-2">
      {chats.map(chat => (
        <div 
          key={chat.id}
          className="p-4 border rounded-lg hover:bg-gray-50"
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium">{chat.chatName}</h3>
              <p className="text-sm text-gray-600">
                {chat.lastMessageText}
              </p>
            </div>
            
            <div className="text-right">
              <div className="text-xs text-gray-500">
                {new Date(chat.lastMessageAt).toLocaleTimeString()}
              </div>
              
              {chat.unreadCount > 0 && (
                <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                  {chat.unreadCount}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
```

## 🚫 Фильтрация сообщений

### Автоматически игнорируются:
- ✅ **Статусы WhatsApp** (`status@broadcast`)
- ✅ **Системные уведомления** (`type: 'notification'`)
- 🔧 **Групповые сообщения** (опционально)

### Настройка фильтров в API:
```javascript
// Получение только индивидуальных чатов (по умолчанию)
fetch('/api/whatsapp/sessions/{sessionId}/chats')

// Включение групповых чатов
fetch('/api/whatsapp/sessions/{sessionId}/chats?includeGroups=true')

// Получение всех типов чатов
fetch('/api/whatsapp/sessions/{sessionId}/chats?chatType=all')

// Только групповые чаты
fetch('/api/whatsapp/sessions/{sessionId}/chats?chatType=group')
```

## ⚡ Оптимизация производительности

### 1. Фильтрация событий по компании
```javascript
socket.on('whatsapp:new-message', (data) => {
  // Проверяем, что сообщение для нашей компании
  if (data.companyId === currentUser.companyId) {
    // Обрабатываем событие
    handleNewMessage(data);
  }
});
```

### 2. Дебаунс для массовых обновлений
```javascript
import { debounce } from 'lodash';

const debouncedChatUpdate = debounce((updates) => {
  // Групповое обновление чатов
  updateChats(updates);
}, 300);

socket.on('whatsapp:chat-updated', debouncedChatUpdate);
```

### 3. Подписка только на нужные события
```javascript
// Подписка только при открытом чате
useEffect(() => {
  if (isWhatsAppPageOpen) {
    socket.on('whatsapp:new-message', handleNewMessage);
    socket.on('whatsapp:chat-updated', handleChatUpdate);
    
    return () => {
      socket.off('whatsapp:new-message', handleNewMessage);
      socket.off('whatsapp:chat-updated', handleChatUpdate);
    };
  }
}, [isWhatsAppPageOpen]);
```

## 🔧 Отладка WebSocket

### Логирование всех событий
```javascript
const originalEmit = socket.emit;
socket.emit = function(...args) {
  console.log('→ Отправка:', args);
  return originalEmit.apply(this, args);
};

socket.onAny((eventName, ...args) => {
  console.log('← Получено:', eventName, args);
});
```

### Проверка подключения
```javascript
socket.on('connect', () => {
  console.log('✅ WebSocket подключен:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('❌ WebSocket отключен:', reason);
});

socket.on('connect_error', (error) => {
  console.error('🚨 Ошибка подключения:', error);
});
```

## 📱 События для мобильного приложения

```javascript
// Уведомления для мобильного приложения
socket.on('whatsapp:new-message', (data) => {
  if (!data.message.fromMe) {
    // Показываем push-уведомление
    showPushNotification({
      title: data.chat.chatName,
      body: data.message.body,
      icon: '/whatsapp-icon.png',
      data: {
        sessionId: data.sessionId,
        chatId: data.chat.id
      }
    });
  }
});
```

## 🎯 Итоговые WebSocket события:

1. 📨 `whatsapp:new-message` - Новое сообщение
2. 💬 `whatsapp:chat-updated` - Обновление чата  
3. 📱 `whatsapp:qr-updated` - Обновление QR кода
4. ✅ `whatsapp:session-connected` - Сессия подключена
5. ❌ `whatsapp:session-disconnected` - Сессия отключена

**Real-time коммуникация готова!** 🚀 