# Техническое задание: Интеграция WhatsApp в VCL Frontend

## Обзор

Данное ТЗ описывает требования для интеграции WhatsApp функционала в фронтенд приложение VCL. Функционал работает через WebSocket соединения и обеспечивает взаимодействие с WhatsApp Business API.

## Технические требования

### Стек технологий
- **Frontend Framework**: React/Vue.js/Angular (зависит от существующего стека)
- **WebSocket Client**: Socket.IO Client 4.x
- **State Management**: Redux/Vuex/NgRx или React Context API
- **UI Library**: Material-UI/Ant Design/Vuetify или кастомная библиотека
- **TypeScript**: Обязательно для типизации

### Архитектура

#### 1. WebSocket соединение
```typescript
// Подключение к WhatsApp namespace
import { io, Socket } from 'socket.io-client';

const whatsappSocket: Socket = io('/whatsapp', {
  auth: {
    token: localStorage.getItem('authToken') // JWT токен
  },
  transports: ['websocket', 'polling']
});
```

#### 2. Типы данных

```typescript
interface WhatsAppSession {
  id: string;
  phoneNumber: string;
  displayName?: string;
  isActive: boolean;
  isConnected: boolean;
  lastSeen?: Date;
  qrCode?: string;
  admin: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface WhatsAppChat {
  id: string;
  chatId: string;
  chatName?: string;
  chatType: 'individual' | 'group';
  isGroup: boolean;
  lastMessageAt?: Date;
  lastMessageText?: string;
  unreadCount: number;
  _count: {
    messages: number;
  };
}

interface WhatsAppMessage {
  id: string;
  messageId: string;
  fromMe: boolean;
  fromNumber: string;
  fromName?: string;
  body?: string;
  messageType: string;
  timestamp: Date;
  isRead: boolean;
  manager?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface UserPermissions {
  canRead: boolean;
  canWrite: boolean;
  canManageChats: boolean;
}

interface WebSocketResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}
```

## Основные компоненты

### 1. WhatsAppSessionManager (Компонент управления сессиями)

**Функционал:**
- Отображение списка активных сессий
- Создание новой сессии (только для администраторов)
- Подключение/отключение от сессии
- Отображение QR кода для авторизации
- Управление доступом менеджеров

**Props:**
```typescript
interface WhatsAppSessionManagerProps {
  userRole: 'admin' | 'manager';
  companyId: string;
  onSessionSelect: (sessionId: string, permissions: UserPermissions) => void;
}
```

**Основные методы:**
```typescript
// Создание новой сессии
const createSession = async (): Promise<void> => {
  // Доступно только администраторам
  await fetch('/api/whatsapp/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
};

// Подключение к сессии через WebSocket
const joinSession = (sessionId: string): void => {
  whatsappSocket.emit('whatsapp:join_session', { sessionId }, (response: WebSocketResponse) => {
    if (response.success) {
      // Сохраняем права доступа и информацию о сессии
      setCurrentSession(response.data.session);
      setPermissions(response.data.permissions);
    }
  });
};
```

### 2. WhatsAppChatList (Компонент списка чатов)

**Функционал:**
- Отображение списка чатов в реальном времени
- Фильтрация чатов (по умолчанию только индивидуальные)
- Поиск по чатам
- Отображение количества непрочитанных сообщений
- Обновление при получении новых сообщений

**Props:**
```typescript
interface WhatsAppChatListProps {
  sessionId: string;
  permissions: UserPermissions;
  onChatSelect: (chatId: string) => void;
  selectedChatId?: string;
}
```

**Основные методы:**
```typescript
// Получение списка чатов
const getChats = (page: number = 1): void => {
  whatsappSocket.emit('whatsapp:get_chats', {
    sessionId: currentSession.id,
    page,
    limit: 50,
    includeGroups: false, // По умолчанию исключаем группы
    includeStatus: false  // По умолчанию исключаем статусы
  }, (response: WebSocketResponse<{ chats: WhatsAppChat[], pagination: any }>) => {
    if (response.success) {
      setChats(response.data.chats);
      setPagination(response.data.pagination);
    }
  });
};

// Обработчик обновления чатов
useEffect(() => {
  whatsappSocket.on('whatsapp:chats_updated', ({ sessionId }) => {
    if (sessionId === currentSession.id) {
      getChats(); // Обновляем список чатов
    }
  });

  return () => {
    whatsappSocket.off('whatsapp:chats_updated');
  };
}, [currentSession.id]);
```

### 3. WhatsAppChatWindow (Компонент окна чата)

**Функционал:**
- Отображение истории сообщений
- Автоскролл к новым сообщениям
- Отправка сообщений (если есть права)
- Загрузка истории при скролле вверх
- Отображение статуса прочтения
- Показ информации об отправителе

**Props:**
```typescript
interface WhatsAppChatWindowProps {
  sessionId: string;
  chatId: string;
  permissions: UserPermissions;
  chat: WhatsAppChat;
}
```

**Основные методы:**
```typescript
// Получение сообщений чата
const getMessages = (page: number = 1): void => {
  whatsappSocket.emit('whatsapp:get_messages', {
    sessionId,
    chatId,
    page,
    limit: 50
  }, (response: WebSocketResponse<{ messages: WhatsAppMessage[], pagination: any }>) => {
    if (response.success) {
      if (page === 1) {
        setMessages(response.data.messages);
      } else {
        setMessages(prev => [...response.data.messages, ...prev]);
      }
    }
  });
};

// Отправка сообщения
const sendMessage = (messageText: string): void => {
  if (!permissions.canWrite) {
    showNotification('У вас нет прав на отправку сообщений', 'error');
    return;
  }

  whatsappSocket.emit('whatsapp:send_message', {
    sessionId,
    chatId,
    message: messageText.trim()
  }, (response: WebSocketResponse) => {
    if (response.success) {
      // Сообщение отправлено, оно придет через whatsapp:new_message
      setMessageInput('');
    } else {
      showNotification(response.message || 'Ошибка отправки сообщения', 'error');
    }
  });
};

// Обработчик новых сообщений
useEffect(() => {
  whatsappSocket.on('whatsapp:new_message', ({ sessionId: msgSessionId, chat, message }) => {
    if (msgSessionId === sessionId && chat.id === chatId) {
      setMessages(prev => [...prev, message]);
      scrollToBottom();
    }
  });

  return () => {
    whatsappSocket.off('whatsapp:new_message');
  };
}, [sessionId, chatId]);
```

### 4. QRCodeDisplay (Компонент отображения QR кода)

**Функционал:**
- Отображение QR кода для авторизации WhatsApp
- Автообновление статуса подключения
- Показ статуса авторизации

**Props:**
```typescript
interface QRCodeDisplayProps {
  sessionId: string;
}
```

**Основные методы:**
```typescript
// Получение QR кода
const getQRCode = async (): Promise<void> => {
  try {
    const response = await fetch(`/api/whatsapp/sessions/${sessionId}/qr`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    
    if (data.success) {
      if (data.data.isConnected) {
        setConnectionStatus('connected');
        setQrCode(null);
      } else {
        setQrCode(data.data.qrCode);
        setConnectionStatus('waiting');
      }
    }
  } catch (error) {
    console.error('Ошибка получения QR кода:', error);
  }
};

// Обработчик изменения статуса сессии
useEffect(() => {
  whatsappSocket.on('whatsapp:session_status', ({ sessionId: statusSessionId, status }) => {
    if (statusSessionId === sessionId) {
      if (status === 'connected') {
        setConnectionStatus('connected');
        setQrCode(null);
      } else if (status === 'qr_ready') {
        setQrCode(status.qrCode);
        setConnectionStatus('waiting');
      }
    }
  });

  return () => {
    whatsappSocket.off('whatsapp:session_status');
  };
}, [sessionId]);
```

### 5. WhatsAppPermissionsManager (Компонент управления доступами)

**Функционал:**
- Управление доступом менеджеров к сессии (только для администраторов)
- Предоставление/отзыв прав доступа
- Настройка разрешений (чтение, запись, управление чатами)

**Props:**
```typescript
interface WhatsAppPermissionsManagerProps {
  sessionId: string;
  managers: Manager[];
  currentAccess: WhatsAppManagerAccess[];
}
```

## Структура состояния (State Management)

### Redux Store (пример)
```typescript
interface WhatsAppState {
  // Сессии
  sessions: WhatsAppSession[];
  currentSession: WhatsAppSession | null;
  permissions: UserPermissions | null;
  
  // Чаты
  chats: WhatsAppChat[];
  selectedChatId: string | null;
  
  // Сообщения
  messages: { [chatId: string]: WhatsAppMessage[] };
  
  // UI состояние
  isConnecting: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'waiting';
  qrCode: string | null;
  
  // Загрузка
  isLoadingChats: boolean;
  isLoadingMessages: boolean;
  isSendingMessage: boolean;
}

// Actions
const whatsappActions = {
  // Сессии
  setSessions: (sessions: WhatsAppSession[]) => ({ type: 'SET_SESSIONS', payload: sessions }),
  setCurrentSession: (session: WhatsAppSession) => ({ type: 'SET_CURRENT_SESSION', payload: session }),
  setPermissions: (permissions: UserPermissions) => ({ type: 'SET_PERMISSIONS', payload: permissions }),
  
  // Чаты
  setChats: (chats: WhatsAppChat[]) => ({ type: 'SET_CHATS', payload: chats }),
  updateChat: (chat: WhatsAppChat) => ({ type: 'UPDATE_CHAT', payload: chat }),
  selectChat: (chatId: string) => ({ type: 'SELECT_CHAT', payload: chatId }),
  
  // Сообщения
  setMessages: (chatId: string, messages: WhatsAppMessage[]) => 
    ({ type: 'SET_MESSAGES', payload: { chatId, messages } }),
  addMessage: (chatId: string, message: WhatsAppMessage) => 
    ({ type: 'ADD_MESSAGE', payload: { chatId, message } }),
  
  // UI
  setConnectionStatus: (status: string) => ({ type: 'SET_CONNECTION_STATUS', payload: status }),
  setQRCode: (qrCode: string | null) => ({ type: 'SET_QR_CODE', payload: qrCode }),
  setLoadingState: (key: string, isLoading: boolean) => 
    ({ type: 'SET_LOADING_STATE', payload: { key, isLoading } })
};
```

## Пользовательский интерфейс

### 1. Главная страница WhatsApp
```
┌─────────────────────────────────────────────────────────────┐
│ WhatsApp Integration                                     [⚙️] │
├─────────────────────────────────────────────────────────────┤
│ Sessions                                                     │
│ ┌─────────────────┐                                         │
│ │ 📱 +7123456789  │ ✅ Connected    [Manage] [Disconnect]   │
│ │ John Doe        │                                         │
│ │ Last seen: 2m   │                                         │
│ └─────────────────┘                                         │
│ [+ Create New Session]                                      │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────────────────────────────────┐ │
│ │ Chats       │ │ Chat: Alice Johnson                     │ │
│ │             │ │ ┌─────────────────────────────────────┐ │ │
│ │ 📞 Alice J. │ │ │ Alice: Hello, I need help           │ │ │
│ │ 💬 2        │ │ │ 10:30                               │ │ │
│ │             │ │ │                                     │ │ │
│ │ 📞 Bob K.   │ │ │ You: How can I help you?            │ │ │
│ │ ✅ 0        │ │ │ 10:32                               │ │ │
│ │             │ │ │                                     │ │ │
│ │ 📞 Carol L. │ │ │ Alice: I have a problem with...     │ │ │
│ │ 💬 1        │ │ │ 10:35                               │ │ │
│ │             │ │ └─────────────────────────────────────┘ │ │
│ └─────────────┘ │ [Type your message...] [Send]           │ │
│                 └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 2. QR Code страница (для новых сессий)
```
┌─────────────────────────────────────────────┐
│ WhatsApp Authorization                      │
├─────────────────────────────────────────────┤
│                                             │
│    ┌─────────────────────────────────┐      │
│    │                                 │      │
│    │         QR CODE HERE            │      │
│    │                                 │      │
│    │     ████ ██   █ ████ ████      │      │
│    │     █  █ █ █ █   █  █ █   █     │      │
│    │     ████  ██  █   ████ ████     │      │
│    │                                 │      │
│    └─────────────────────────────────┘      │
│                                             │
│ 1. Open WhatsApp on your phone             │
│ 2. Go to Settings > Linked Devices         │
│ 3. Tap "Link a Device"                     │
│ 4. Scan this QR code                       │
│                                             │
│ Status: Waiting for scan...                 │
│                                             │
│ [Cancel] [Refresh QR Code]                  │
└─────────────────────────────────────────────┘
```

## API Integration

### REST API эндпоинты
- `GET /api/whatsapp/sessions` - Получение списка сессий
- `POST /api/whatsapp/sessions` - Создание новой сессии
- `GET /api/whatsapp/sessions/:id/qr` - Получение QR кода
- `POST /api/whatsapp/sessions/:id/disconnect` - Отключение сессии
- `POST /api/whatsapp/sessions/:id/access` - Предоставление доступа менеджеру
- `DELETE /api/whatsapp/sessions/:id/access/:managerId` - Отзыв доступа

### WebSocket события

#### Клиент → Сервер
- `whatsapp:join_session` - Подключение к сессии
- `whatsapp:leave_session` - Отключение от сессии
- `whatsapp:get_chats` - Получение списка чатов
- `whatsapp:get_messages` - Получение сообщений чата
- `whatsapp:send_message` - Отправка сообщения
- `whatsapp:get_session_status` - Получение статуса сессии

#### Сервер → Клиент
- `whatsapp:new_message` - Новое сообщение
- `whatsapp:chats_updated` - Обновление списка чатов
- `whatsapp:session_status` - Изменение статуса сессии

## Обработка ошибок

### Типы ошибок
1. **Ошибки подключения** - Отсутствие интернета, проблемы с WebSocket
2. **Ошибки авторизации** - Неверный токен, истекшая сессия
3. **Ошибки доступа** - Недостаточно прав, сессия не найдена
4. **Ошибки WhatsApp** - Проблемы с отправкой сообщений, отключение от WhatsApp

### Обработка
```typescript
// Обработчик ошибок WebSocket
whatsappSocket.on('connect_error', (error) => {
  console.error('WebSocket connection error:', error);
  showNotification('Ошибка подключения к серверу', 'error');
  setConnectionStatus('disconnected');
});

// Обработчик отключения
whatsappSocket.on('disconnect', (reason) => {
  console.log('WebSocket disconnected:', reason);
  if (reason === 'io server disconnect') {
    // Сервер принудительно отключил соединение
    showNotification('Соединение разорвано сервером', 'warning');
  }
  setConnectionStatus('disconnected');
});

// Переподключение
const reconnect = () => {
  if (whatsappSocket.disconnected) {
    whatsappSocket.connect();
  }
};
```

## Тестирование

### Unit тесты
- Тестирование компонентов в изоляции
- Тестирование бизнес-логики
- Тестирование WebSocket событий (с мокированием)

### Integration тесты
- Тестирование взаимодействия компонентов
- Тестирование API вызовов
- Тестирование WebSocket интеграции

### E2E тесты
- Полный флоу создания сессии
- Отправка и получение сообщений
- Управление доступами

## Производительность

### Оптимизации
1. **Виртуализация списков** - Для больших списков чатов и сообщений
2. **Мемоизация** - React.memo, useMemo для предотвращения лишних рендеров
3. **Debouncing** - Для поиска и фильтрации
4. **Pagination** - Ленивая загрузка сообщений и чатов
5. **Connection pooling** - Переиспользование WebSocket соединений

### Кэширование
```typescript
// Кэш сообщений
const messageCache = new Map<string, WhatsAppMessage[]>();

// Кэш чатов
const chatCache = new Map<string, WhatsAppChat[]>();

// Очистка кэша при отключении
const clearCache = () => {
  messageCache.clear();
  chatCache.clear();
};
```

## Безопасность

### Меры безопасности
1. **JWT валидация** - Проверка токена при каждом WebSocket подключении
2. **Права доступа** - Проверка разрешений перед выполнением действий
3. **Санитизация** - Очистка пользовательского ввода
4. **Rate limiting** - Ограничение частоты отправки сообщений
5. **HTTPS/WSS** - Шифрование соединений

## Мобильная версия

### Responsive дизайн
- Адаптивная верстка для мобильных устройств
- Touch-friendly интерфейс
- Оптимизация для сенсорного ввода

### PWA поддержка
- Service Worker для офлайн работы
- Push уведомления о новых сообщениях
- Установка как мобильное приложение

## Заключение

Данное ТЗ описывает полную интеграцию WhatsApp функционала в фронтенд приложение VCL. Реализация должна обеспечивать надежную работу в реальном времени, удобный пользовательский интерфейс и правильную обработку всех edge cases.

### Приоритеты реализации
1. **Высокий**: Основные компоненты чатов и сообщений
2. **Средний**: Управление доступами и QR код авторизация
3. **Низкий**: Дополнительные фичи и оптимизации

### Временные рамки
- **Phase 1** (2-3 недели): Базовый функционал чтов и сообщений
- **Phase 2** (1-2 недели): Управление сессиями и доступами  
- **Phase 3** (1 неделя): Оптимизации и полировка UI 