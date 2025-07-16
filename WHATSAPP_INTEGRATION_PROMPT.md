# Промпт: Полная интеграция WhatsApp функционала в VCL Frontend

## 🎯 Задача
Необходимо реализовать полный WhatsApp функционал в Next.js 15 приложении VCL с поддержкой WebSocket в реальном времени, основываясь на существующей архитектуре проекта.

## 📋 Технический стек проекта
- **Framework**: Next.js 15.2.4 с App Router
- **React**: 19.0.0
- **TypeScript**: строгая типизация
- **State Management**: Zustand 5.0.4
- **WebSocket**: Socket.IO Client 4.8.1
- **UI**: Radix UI + TailwindCSS 4.1.5
- **HTTP Client**: Axios 1.9.0
- **Forms**: React Hook Form + Zod валидация

## 🏗 Архитектура проекта
```
/vcl/
├── app/dashboard/whatsapp/          # Next.js App Router страницы
├── components/dashboard/whatsapp/   # React компоненты
├── store/whatsapp-store.ts         # Zustand store
├── types/whatsapp.ts               # TypeScript типы
├── lib/                            # Утилиты
└── hooks/                          # Custom hooks
```

## 🔗 Backend API Спецификация

### REST API Endpoints
```typescript
// Базовый URL
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'

// Сессии
POST   /api/whatsapp/sessions                    # Создание сессии (admin only)
GET    /api/whatsapp/sessions                    # Список сессий компании
GET    /api/whatsapp/sessions/:id/qr             # QR код для авторизации
POST   /api/whatsapp/sessions/:id/disconnect     # Отключение сессии (admin only)

// Доступы менеджеров
POST   /api/whatsapp/sessions/:id/access         # Предоставление доступа (admin only)
DELETE /api/whatsapp/sessions/:id/access/:managerId  # Отзыв доступа (admin only)

// Чаты и сообщения (через REST для совместимости)
GET    /api/whatsapp/sessions/:id/chats          # Список чатов
GET    /api/whatsapp/sessions/:sessionId/chats/:chatId/messages  # Сообщения чата
POST   /api/whatsapp/sessions/:sessionId/chats/:chatId/send      # Отправка сообщения

// Статистика
GET    /api/whatsapp/stats                       # Статистика WhatsApp
```

### WebSocket API (Socket.IO)
```typescript
// Namespace: /whatsapp
const socket = io('/whatsapp', {
  auth: { token: localStorage.getItem('authToken') }
})

// События клиент → сервер
socket.emit('whatsapp:join_session', { sessionId })
socket.emit('whatsapp:leave_session', { sessionId })
socket.emit('whatsapp:get_chats', { sessionId, page, limit, includeGroups, includeStatus })
socket.emit('whatsapp:get_messages', { sessionId, chatId, page, limit })
socket.emit('whatsapp:send_message', { sessionId, chatId, message })
socket.emit('whatsapp:get_session_status', { sessionId })

// События сервер → клиент
socket.on('whatsapp:new_message', ({ sessionId, companyId, chat, message }) => {})
socket.on('whatsapp:chats_updated', ({ sessionId, companyId }) => {})
socket.on('whatsapp:session_status', ({ sessionId, status, qrCode, phoneNumber }) => {})
```

## 📱 Компоненты для реализации

### 1. Обновить Zustand Store
```typescript
// store/whatsapp-store.ts
interface WhatsAppStore {
  // WebSocket состояние
  socket: Socket | null
  isConnected: boolean
  currentSessionId: string | null
  permissions: UserPermissions | null
  
  // Основные данные
  sessions: WhatsAppSession[]
  chats: WhatsAppChat[]
  messages: WhatsAppMessage[]
  stats: WhatsAppStats | null
  
  // UI состояние
  isLoading: boolean
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'waiting'
  qrCode: string | null
  
  // WebSocket методы
  initSocket: () => void
  joinSession: (sessionId: string) => Promise<void>
  leaveSession: (sessionId: string) => Promise<void>
  
  // REST + WebSocket гибридные методы
  fetchChats: (sessionId: string) => Promise<void>
  fetchMessages: (sessionId: string, chatId: string) => Promise<void>
  sendMessage: (sessionId: string, chatId: string, message: string) => Promise<void>
}
```

### 2. WebSocket Service
```typescript
// lib/whatsapp-socket.ts
export class WhatsAppSocketService {
  private socket: Socket | null = null
  
  connect(token: string): Socket {
    this.socket = io('/whatsapp', {
      auth: { token },
      transports: ['websocket', 'polling']
    })
    
    this.setupEventHandlers()
    return this.socket
  }
  
  private setupEventHandlers() {
    this.socket?.on('whatsapp:new_message', this.handleNewMessage)
    this.socket?.on('whatsapp:chats_updated', this.handleChatsUpdate)
    this.socket?.on('whatsapp:session_status', this.handleSessionStatus)
  }
  
  joinSession(sessionId: string): Promise<{ session: WhatsAppSession, permissions: UserPermissions }> {
    return new Promise((resolve, reject) => {
      this.socket?.emit('whatsapp:join_session', { sessionId }, (response) => {
        if (response.success) resolve(response.data)
        else reject(new Error(response.message))
      })
    })
  }
  
  getChats(sessionId: string, options: GetChatsOptions): Promise<{ chats: WhatsAppChat[], pagination: any }> {
    return new Promise((resolve, reject) => {
      this.socket?.emit('whatsapp:get_chats', { sessionId, ...options }, (response) => {
        if (response.success) resolve(response.data)
        else reject(new Error(response.message))
      })
    })
  }
  
  sendMessage(sessionId: string, chatId: string, message: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket?.emit('whatsapp:send_message', { sessionId, chatId, message }, (response) => {
        if (response.success) resolve()
        else reject(new Error(response.message))
      })
    })
  }
}
```

### 3. Компонент управления сессиями
```typescript
// components/dashboard/whatsapp/session-manager.tsx
interface SessionManagerProps {
  userRole: 'admin' | 'manager'
  onSessionSelect: (sessionId: string) => void
}

export function SessionManager({ userRole, onSessionSelect }: SessionManagerProps) {
  const { 
    sessions, 
    currentSessionId,
    isConnected,
    qrCode,
    connectionStatus,
    createSession,
    joinSession,
    disconnectSession 
  } = useWhatsAppStore()

  // Создание новой сессии (только admin)
  const handleCreateSession = async () => {
    if (userRole !== 'admin') return
    
    try {
      const sessionId = await createSession()
      if (sessionId) {
        await joinSession(sessionId)
        onSessionSelect(sessionId)
      }
    } catch (error) {
      toast.error('Ошибка создания сессии')
    }
  }

  // Подключение к существующей сессии
  const handleJoinSession = async (sessionId: string) => {
    try {
      await joinSession(sessionId)
      onSessionSelect(sessionId)
    } catch (error) {
      toast.error('Нет доступа к этой сессии')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>WhatsApp Сессии</CardTitle>
        <CardDescription>
          Управление подключениями к WhatsApp
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Список сессий */}
        <div className="space-y-4">
          {sessions.map(session => (
            <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-4">
                <Avatar>
                  <AvatarFallback>
                    {session.displayName?.[0] || session.phoneNumber?.[0] || 'W'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{session.displayName || session.phoneNumber || 'Новая сессия'}</p>
                  <p className="text-sm text-muted-foreground">
                    {session.isConnected ? '✅ Подключен' : '❌ Отключен'}
                  </p>
                  {session.lastSeen && (
                    <p className="text-xs text-muted-foreground">
                      Последний раз: {new Date(session.lastSeen).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant={currentSessionId === session.id ? "default" : "outline"}
                  onClick={() => handleJoinSession(session.id)}
                >
                  {currentSessionId === session.id ? 'Активна' : 'Подключиться'}
                </Button>
                
                {userRole === 'admin' && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => disconnectSession(session.id)}
                  >
                    Отключить
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* QR код для новой сессии */}
        {qrCode && connectionStatus === 'waiting' && (
          <div className="mt-6 text-center">
            <h3 className="text-lg font-medium mb-4">Сканируйте QR код в WhatsApp</h3>
            <div className="flex justify-center">
              <img src={qrCode} alt="WhatsApp QR Code" className="max-w-xs" />
            </div>
            <div className="mt-4 text-sm text-muted-foreground space-y-1">
              <p>1. Откройте WhatsApp на телефоне</p>
              <p>2. Перейдите в Настройки → Связанные устройства</p>
              <p>3. Нажмите "Привязать устройство"</p>
              <p>4. Отсканируйте этот QR код</p>
            </div>
          </div>
        )}

        {/* Кнопка создания новой сессии */}
        {userRole === 'admin' && (
          <Button
            className="w-full mt-4"
            onClick={handleCreateSession}
            disabled={isLoading}
          >
            <Plus className="w-4 h-4 mr-2" />
            Создать новую сессию
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
```

### 4. Компонент списка чатов
```typescript
// components/dashboard/whatsapp/chat-list.tsx
interface ChatListProps {
  sessionId: string
  permissions: UserPermissions
  onChatSelect: (chat: WhatsAppChat) => void
  selectedChatId?: string
}

export function ChatList({ sessionId, permissions, onChatSelect, selectedChatId }: ChatListProps) {
  const { chats, isLoading, fetchChats } = useWhatsAppStore()
  const [searchQuery, setSearchQuery] = useState('')

  // Загружаем чаты при монтировании
  useEffect(() => {
    if (sessionId && permissions.canRead) {
      fetchChats(sessionId)
    }
  }, [sessionId, permissions.canRead])

  // Фильтрация чатов
  const filteredChats = useMemo(() => {
    return chats.filter(chat => 
      chat.chatName.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [chats, searchQuery])

  if (!permissions.canRead) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          У вас нет прав для просмотра чатов
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Чаты</CardTitle>
          <Badge variant="secondary">{filteredChats.length}</Badge>
        </div>
        
        {/* Поиск */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск чатов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-1 p-4">
              {filteredChats.map(chat => (
                <div
                  key={chat.id}
                  className={cn(
                    "flex items-center space-x-3 p-3 rounded-lg cursor-pointer hover:bg-accent transition-colors",
                    selectedChatId === chat.id && "bg-accent"
                  )}
                  onClick={() => onChatSelect(chat)}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {chat.isGroup ? (
                        <Users className="h-5 w-5" />
                      ) : (
                        chat.chatName[0]?.toUpperCase() || 'U'
                      )}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">{chat.chatName}</p>
                      {chat.lastMessageAt && (
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(chat.lastMessageAt), { 
                            addSuffix: true, 
                            locale: ru 
                          })}
                        </span>
                      )}
                    </div>
                    
                    {chat.lastMessageText && (
                      <p className="text-sm text-muted-foreground truncate">
                        {chat.lastMessageText}
                      </p>
                    )}
                  </div>

                  {chat.unreadCount > 0 && (
                    <Badge variant="default" className="min-w-[1.5rem] h-6 text-xs">
                      {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
```

### 5. Компонент окна чата
```typescript
// components/dashboard/whatsapp/chat-window.tsx
interface ChatWindowProps {
  sessionId: string
  chat: WhatsAppChat
  permissions: UserPermissions
}

export function ChatWindow({ sessionId, chat, permissions }: ChatWindowProps) {
  const { 
    messages, 
    isLoading, 
    fetchMessages, 
    sendMessage 
  } = useWhatsAppStore()
  
  const [messageText, setMessageText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Загружаем сообщения при смене чата
  useEffect(() => {
    if (chat.id && permissions.canRead) {
      fetchMessages(sessionId, chat.id)
    }
  }, [chat.id, sessionId, permissions.canRead])

  // Автоскролл к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Отправка сообщения
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!messageText.trim() || !permissions.canWrite || isSending) return

    setIsSending(true)
    try {
      await sendMessage(sessionId, chat.id, messageText.trim())
      setMessageText('')
    } catch (error) {
      toast.error('Ошибка отправки сообщения')
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(e)
    }
  }

  if (!permissions.canRead) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          У вас нет прав для просмотра сообщений
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      {/* Заголовок чата */}
      <CardHeader className="border-b">
        <div className="flex items-center space-x-3">
          <Avatar>
            <AvatarFallback>
              {chat.isGroup ? (
                <Users className="h-5 w-5" />
              ) : (
                chat.chatName[0]?.toUpperCase() || 'U'
              )}
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-lg">{chat.chatName}</CardTitle>
            <CardDescription>
              {chat.isGroup ? 'Группа' : 'Личный чат'} • {chat._count.messages} сообщений
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      {/* Область сообщений */}
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full p-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map(message => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isFromMe={message.fromMe}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
      </CardContent>

      {/* Поле ввода сообщения */}
      {permissions.canWrite && (
        <div className="border-t p-4">
          <form onSubmit={handleSendMessage} className="flex space-x-2">
            <Textarea
              placeholder="Введите сообщение..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isSending}
              className="flex-1 min-h-[60px] max-h-[120px] resize-none"
            />
            <Button
              type="submit"
              disabled={!messageText.trim() || isSending}
              className="self-end"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      )}
    </Card>
  )
}

// Компонент сообщения
function MessageBubble({ message, isFromMe }: { message: WhatsAppMessage, isFromMe: boolean }) {
  return (
    <div className={cn("flex", isFromMe ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-lg p-3 space-y-1",
          isFromMe 
            ? "bg-primary text-primary-foreground" 
            : "bg-muted"
        )}
      >
        {!isFromMe && (
          <p className="text-xs font-medium opacity-70">{message.fromName}</p>
        )}
        
        <p className="text-sm">{message.body}</p>
        
        <div className="flex items-center justify-end space-x-1 text-xs opacity-70">
          <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
          {isFromMe && (
            <div className="flex">
              {message.isRead ? (
                <CheckCheck className="h-3 w-3 text-blue-400" />
              ) : (
                <Check className="h-3 w-3" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

### 6. Главная страница WhatsApp
```typescript
// app/dashboard/whatsapp/page.tsx
export default function WhatsAppPage() {
  const { user } = useUserStore()
  const { 
    sessions, 
    currentSessionId, 
    permissions,
    isConnected,
    initSocket,
    fetchSessions 
  } = useWhatsAppStore()
  
  const [selectedChat, setSelectedChat] = useState<WhatsAppChat | null>(null)

  // Инициализация при загрузке
  useEffect(() => {
    initSocket()
    fetchSessions()
  }, [])

  const handleSessionSelect = (sessionId: string) => {
    // При выборе сессии сбрасываем выбранный чат
    setSelectedChat(null)
  }

  const handleChatSelect = (chat: WhatsAppChat) => {
    setSelectedChat(chat)
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Статус подключения */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">WhatsApp</h1>
        <div className="flex items-center space-x-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
          )} />
          <span className="text-sm">
            {isConnected ? 'Подключен' : 'Отключен'}
          </span>
        </div>
      </div>

      <Tabs defaultValue="chats" className="space-y-6">
        <TabsList>
          <TabsTrigger value="chats">Чаты</TabsTrigger>
          <TabsTrigger value="sessions">Сессии</TabsTrigger>
          <TabsTrigger value="stats">Статистика</TabsTrigger>
        </TabsList>

        <TabsContent value="chats" className="space-y-6">
          {currentSessionId && permissions ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[800px]">
              {/* Список чатов */}
              <div className="lg:col-span-1">
                <ChatList
                  sessionId={currentSessionId}
                  permissions={permissions}
                  onChatSelect={handleChatSelect}
                  selectedChatId={selectedChat?.id}
                />
              </div>

              {/* Окно чата */}
              <div className="lg:col-span-2">
                {selectedChat ? (
                  <ChatWindow
                    sessionId={currentSessionId}
                    chat={selectedChat}
                    permissions={permissions}
                  />
                ) : (
                  <Card className="h-full flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground" />
                      <h3 className="text-lg font-medium">Выберите чат</h3>
                      <p className="text-muted-foreground">
                        Выберите чат из списка для начала общения
                      </p>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Сначала подключитесь к WhatsApp сессии во вкладке "Сессии"
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="sessions">
          <SessionManager
            userRole={user?.role as 'admin' | 'manager'}
            onSessionSelect={handleSessionSelect}
          />
        </TabsContent>

        <TabsContent value="stats">
          <StatsView />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

## 🔧 TypeScript типы

### Дополнить types/whatsapp.ts
```typescript
// Права доступа пользователя
export interface UserPermissions {
  canRead: boolean
  canWrite: boolean
  canManageChats: boolean
}

// WebSocket response
export interface WebSocketResponse<T = any> {
  success: boolean
  message?: string
  data?: T
}

// Опции для получения чатов
export interface GetChatsOptions {
  page?: number
  limit?: number
  includeGroups?: boolean
  includeStatus?: boolean
  chatType?: 'individual' | 'group' | 'all'
}

// События WebSocket (клиент → сервер)
export interface ClientToServerEvents {
  'whatsapp:join_session': (data: { sessionId: string }, callback: (response: WebSocketResponse<{ session: WhatsAppSession, permissions: UserPermissions }>) => void) => void
  'whatsapp:leave_session': (data: { sessionId: string }, callback: (response: WebSocketResponse) => void) => void
  'whatsapp:get_chats': (data: { sessionId: string } & GetChatsOptions, callback: (response: WebSocketResponse<{ chats: WhatsAppChat[], pagination: any }>) => void) => void
  'whatsapp:get_messages': (data: { sessionId: string, chatId: string, page?: number, limit?: number }, callback: (response: WebSocketResponse<{ messages: WhatsAppMessage[], pagination: any }>) => void) => void
  'whatsapp:send_message': (data: { sessionId: string, chatId: string, message: string }, callback: (response: WebSocketResponse) => void) => void
  'whatsapp:get_session_status': (data: { sessionId: string }, callback: (response: WebSocketResponse<WhatsAppSession>) => void) => void
}

// События WebSocket (сервер → клиент)
export interface ServerToClientEvents {
  'whatsapp:new_message': (data: { sessionId: string, companyId: string, chat: WhatsAppChat, message: WhatsAppMessage }) => void
  'whatsapp:chats_updated': (data: { sessionId: string, companyId: string }) => void
  'whatsapp:session_status': (data: { sessionId: string, status: string, qrCode?: string, phoneNumber?: string, displayName?: string, isConnected?: boolean }) => void
}
```

## 🚀 Пошаговая реализация

### Этап 1: WebSocket интеграция (1-2 дня)
1. Обновить `store/whatsapp-store.ts` с WebSocket поддержкой
2. Создать `lib/whatsapp-socket.ts` сервис
3. Добавить обработчики событий реального времени

### Этап 2: Компоненты управления сессиями (2-3 дня)
1. Обновить `SessionManager` с WebSocket методами
2. Добавить QR код авторизацию
3. Реализовать управление доступами менеджеров

### Этап 3: Компоненты чатов (3-4 дня)
1. Создать `ChatList` с фильтрацией и поиском
2. Реализовать `ChatWindow` с историей сообщений
3. Добавить отправку сообщений через WebSocket

### Этап 4: Оптимизация UX (1-2 дня)
1. Добавить оптимистичные обновления
2. Реализовать статусы сообщений
3. Добавить индикаторы загрузки

### Этап 5: Тестирование и полировка (1-2 дня)
1. Интеграционное тестирование
2. Обработка edge cases
3. Оптимизация производительности
```

## 🎯 Критерии готовности
- ✅ WebSocket подключение к `/whatsapp` namespace
- ✅ Создание и управление сессиями (admin only)
- ✅ QR код авторизация
- ✅ Список чатов в реальном времени (исключены группы и статусы)
- ✅ История сообщений
- ✅ Отправка сообщений через WebSocket
- ✅ Управление доступами менеджеров
- ✅ Статистика использования
- ✅ Обработка ошибок и переподключение
- ✅ Responsive дизайн

---

**Важно**: Следуйте существующим паттернам проекта VCL, используйте те же UI компоненты и архитектурные подходы для консистентности. 