import { Server, Socket } from 'socket.io';
import { prisma } from '../services/database';
import { WhatsAppSessionManager } from '../services/whatsappSessionManager';
import jwt from 'jsonwebtoken';

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    role: 'admin' | 'manager';
    companyId: string;
    email: string;
  };
  currentSessionId?: string;
}

export class WhatsAppWebSocketController {
  private io: Server;
  private whatsappManager: WhatsAppSessionManager;

  constructor(io: Server, whatsappManager: WhatsAppSessionManager) {
    this.io = io;
    this.whatsappManager = whatsappManager;
    this.setupNamespace();
  }

  /**
   * Настройка namespace для WhatsApp
   */
  private setupNamespace(): void {
    const whatsappNs = this.io.of('/whatsapp');

    // Middleware для аутентификации
    whatsappNs.use(this.authenticateSocket.bind(this));

    whatsappNs.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`[WhatsApp WebSocket] Пользователь ${socket.user?.email} подключился, socket: ${socket.id}`);
      console.log(`[WhatsApp WebSocket] Transport: ${socket.conn.transport.name}`);
      console.log(`[WhatsApp WebSocket] Company ID: ${socket.user?.companyId}`);
      
      // Присоединяем к комнате компании для получения глобальных уведомлений
      if (socket.user?.companyId) {
        socket.join(`company:${socket.user.companyId}`);
        console.log(`[WhatsApp WebSocket] Пользователь присоединился к комнате компании: company:${socket.user.companyId}`);
      }
      
      this.setupSocketHandlers(socket);
      
      // Отправляем подтверждение подключения
      socket.emit('connection-confirmed', {
        status: 'connected',
        socketId: socket.id,
        user: {
          email: socket.user?.email,
          role: socket.user?.role,
          companyId: socket.user?.companyId
        },
        timestamp: new Date().toISOString()
      });
      
      socket.on('disconnect', (reason) => {
        console.log(`[WhatsApp WebSocket] Пользователь ${socket.user?.email} отключился, причина: ${reason}`);
      });

      socket.on('error', (error) => {
        console.error(`[WhatsApp WebSocket] Ошибка socket ${socket.id}:`, error);
        socket.emit('error', { message: 'Socket error occurred', error: error.message });
      });

      // Обработчик для тестирования соединения
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: new Date().toISOString() });
      });
    });

    // Логирование ошибок namespace
    whatsappNs.on('error', (error) => {
      console.error('[WhatsApp WebSocket] Namespace error:', error);
    });

    console.log('[WhatsApp WebSocket] Namespace /whatsapp настроен');
  }

  /**
   * Middleware для аутентификации WebSocket соединений
   */
  private async authenticateSocket(socket: AuthenticatedSocket, next: Function): Promise<void> {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Токен авторизации не предоставлен'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      let user;

      // Используем userType из токена вместо role
      const userType = decoded.userType || 'user'; // по умолчанию 'user' для обратной совместимости

      if (userType === 'user') {
        const adminUser = await prisma.user.findUnique({
          where: { id: decoded.userId }, // используем userId из токена
          select: {
            id: true,
            email: true,
            role: true,
            companyId: true,
            isActive: true,
            isVerified: true
          }
        });

        if (!adminUser) {
          return next(new Error('Пользователь не найден'));
        }

        if (!adminUser.isActive || !adminUser.isVerified) {
          return next(new Error('Аккаунт не активен или не верифицирован'));
        }

        user = adminUser;
      } else if (userType === 'manager') {
        user = await prisma.manager.findUnique({
          where: { id: decoded.userId }, // используем userId из токена
          select: {
            id: true,
            email: true,
            role: true,
            companyId: true
          }
        });

        if (!user) {
          return next(new Error('Менеджер не найден'));
        }
      } else {
        return next(new Error('Недопустимый тип пользователя'));
      }

      if (!user) {
        return next(new Error('Пользователь не найден'));
      }

      socket.user = {
        id: user.id,
        role: user.role as 'admin' | 'manager',
        companyId: user.companyId,
        email: user.email
      };

      next();
    } catch (error) {
      console.error('[WhatsApp WebSocket] Ошибка аутентификации:', error);
      next(new Error('Ошибка аутентификации'));
    }
  }

  /**
   * Настройка обработчиков событий для сокета
   */
  private setupSocketHandlers(socket: AuthenticatedSocket): void {
    // Подключение к WhatsApp сессии
    socket.on('whatsapp:join_session', async (data, callback) => {
      await this.handleJoinSession(socket, data, callback);
    });

    // Отключение от WhatsApp сессии
    socket.on('whatsapp:leave_session', async (data, callback) => {
      await this.handleLeaveSession(socket, data, callback);
    });

    // Получение списка чатов
    socket.on('whatsapp:get_chats', async (data, callback) => {
      await this.handleGetChats(socket, data, callback);
    });

    // Получение сообщений чата
    socket.on('whatsapp:get_messages', async (data, callback) => {
      await this.handleGetMessages(socket, data, callback);
    });

    // Отправка сообщения
    socket.on('whatsapp:send_message', async (data, callback) => {
      await this.handleSendMessage(socket, data, callback);
    });

    // Получение статуса сессии
    socket.on('whatsapp:get_session_status', async (data, callback) => {
      await this.handleGetSessionStatus(socket, data, callback);
    });

    // Отметка сообщений как прочитанных
    socket.on('whatsapp:mark_chat_as_read', async (data, callback) => {
      await this.handleMarkChatAsRead(socket, data, callback);
    });
  }

  /**
   * Обработчик подключения к WhatsApp сессии
   */
  private async handleJoinSession(socket: AuthenticatedSocket, data: { sessionId: string }, callback: Function): Promise<void> {
    try {
      const { sessionId } = data;
      const { companyId, role, id: userId } = socket.user!;

      // Проверяем доступ к сессии
      const hasAccess = await this.checkSessionAccess(sessionId, userId, role, companyId);
      
      if (!hasAccess.allowed) {
        return callback({ 
          success: false, 
          message: hasAccess.message 
        });
      }

      // Присоединяемся к комнате сессии
      await socket.join(`session:${sessionId}`);
      socket.currentSessionId = sessionId;

      // Получаем информацию о сессии
      const session = await prisma.whatsAppSession.findUnique({
        where: { id: sessionId },
        include: {
          admin: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      console.log(`[WhatsApp WebSocket] Пользователь ${socket.user?.email} подключился к сессии ${sessionId}`);

      callback({
        success: true,
        data: {
          session,
          permissions: hasAccess.permissions
        }
      });

    } catch (error) {
      console.error('[WhatsApp WebSocket] Ошибка подключения к сессии:', error);
      callback({ 
        success: false, 
        message: 'Ошибка подключения к сессии' 
      });
    }
  }

  /**
   * Обработчик отключения от WhatsApp сессии
   */
  private async handleLeaveSession(socket: AuthenticatedSocket, data: { sessionId: string }, callback: Function): Promise<void> {
    try {
      const { sessionId } = data;
      
      await socket.leave(`session:${sessionId}`);
      socket.currentSessionId = undefined;

      console.log(`[WhatsApp WebSocket] Пользователь ${socket.user?.email} отключился от сессии ${sessionId}`);
      
      callback({ success: true });
    } catch (error) {
      console.error('[WhatsApp WebSocket] Ошибка отключения от сессии:', error);
      callback({ 
        success: false, 
        message: 'Ошибка отключения от сессии' 
      });
    }
  }

  /**
   * Обработчик получения списка чатов
   */
  private async handleGetChats(socket: AuthenticatedSocket, data: { 
    sessionId: string; 
    page?: number; 
    limit?: number; 
    includeGroups?: boolean;
    includeStatus?: boolean;
  }, callback: Function): Promise<void> {
    try {
      const { sessionId, page = 1, limit = 50, includeGroups = false, includeStatus = false } = data;
      const { companyId, role, id: userId } = socket.user!;

      // Проверяем доступ к сессии
      const hasAccess = await this.checkSessionAccess(sessionId, userId, role, companyId);
      
      if (!hasAccess.allowed || !hasAccess.permissions?.canRead) {
        return callback({ 
          success: false, 
          message: 'У вас нет права на просмотр чатов' 
        });
      }

      const offset = (page - 1) * limit;

      // Строим условия фильтрации
      const whereConditions: any = {
        sessionId,
        companyId
      };

      // Исключения
      const excludeConditions: any[] = [];

      // Исключаем статусы WhatsApp (по умолчанию)
      if (!includeStatus) {
        excludeConditions.push({ chatId: 'status@broadcast' });
      }

      // Исключаем группы (по умолчанию)
      if (!includeGroups) {
        excludeConditions.push({ isGroup: true });
      }

      // Применяем исключения
      if (excludeConditions.length > 0) {
        whereConditions.NOT = excludeConditions.length === 1 
          ? excludeConditions[0] 
          : { OR: excludeConditions };
      }

      // Получаем чаты
      const chats = await prisma.whatsAppChat.findMany({
        where: whereConditions,
        include: {
          _count: {
            select: {
              messages: true
            }
          }
        },
        orderBy: {
          lastMessageAt: 'desc'
        },
        skip: offset,
        take: limit
      });

      const totalChats = await prisma.whatsAppChat.count({
        where: whereConditions
      });

      callback({
        success: true,
        data: {
          chats,
          pagination: {
            page,
            limit,
            total: totalChats,
            pages: Math.ceil(totalChats / limit)
          }
        }
      });

    } catch (error) {
      console.error('[WhatsApp WebSocket] Ошибка получения чатов:', error);
      callback({ 
        success: false, 
        message: 'Ошибка получения чатов' 
      });
    }
  }

  /**
   * Обработчик получения сообщений чата
   */
  private async handleGetMessages(socket: AuthenticatedSocket, data: { 
    sessionId: string; 
    chatId: string;
    page?: number; 
    limit?: number; 
  }, callback: Function): Promise<void> {
    try {
      const { sessionId, chatId, page = 1, limit = 50 } = data;
      const { companyId, role, id: userId } = socket.user!;

      // Проверяем доступ к сессии
      const hasAccess = await this.checkSessionAccess(sessionId, userId, role, companyId);
      
      if (!hasAccess.allowed || !hasAccess.permissions?.canRead) {
        return callback({ 
          success: false, 
          message: 'У вас нет права на просмотр сообщений' 
        });
      }

      const offset = (page - 1) * limit;

      // Проверяем, что чат принадлежит сессии и компании
      const chat = await prisma.whatsAppChat.findFirst({
        where: {
          id: chatId,
          sessionId,
          companyId
        }
      });

      if (!chat) {
        return callback({ 
          success: false, 
          message: 'Чат не найден' 
        });
      }

      // Получаем сообщения
      const messages = await prisma.whatsAppMessage.findMany({
        where: {
          chatId,
          sessionId,
          companyId
        },
        include: {
          manager: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: {
          timestamp: 'desc'
        },
        skip: offset,
        take: limit
      });

      const totalMessages = await prisma.whatsAppMessage.count({
        where: {
          chatId,
          sessionId,
          companyId
        }
      });

      // Отмечаем сообщения как прочитанные для менеджеров
      if (messages.length > 0 && role === 'manager') {
        const unreadMessagesCount = await prisma.whatsAppMessage.count({
          where: {
            chatId,
            sessionId,
            companyId,
            fromMe: false,
            isRead: false
          }
        });

        if (unreadMessagesCount > 0) {
          await prisma.whatsAppMessage.updateMany({
            where: {
              chatId,
              sessionId,
              companyId,
              fromMe: false,
              isRead: false
            },
            data: {
              isRead: true
            }
          });

          // Обнуляем счетчик непрочитанных сообщений в чате
          const updatedChat = await prisma.whatsAppChat.update({
            where: {
              id: chatId
            },
            data: {
              unreadCount: 0
            },
            include: {
              _count: {
                select: {
                  messages: true
                }
              }
            }
          });

          // Уведомляем всех пользователей сессии об обновлении чата
          this.io.of('/whatsapp').to(`session:${sessionId}`).emit('whatsapp:chat_updated', {
            sessionId,
            companyId,
            chat: updatedChat
          });
        }
      }

      callback({
        success: true,
        data: {
          chat,
          messages: messages.reverse(), // Возвращаем в хронологическом порядке
          pagination: {
            page,
            limit,
            total: totalMessages,
            pages: Math.ceil(totalMessages / limit)
          }
        }
      });

    } catch (error) {
      console.error('[WhatsApp WebSocket] Ошибка получения сообщений:', error);
      callback({ 
        success: false, 
        message: 'Ошибка получения сообщений' 
      });
    }
  }

  /**
   * Обработчик отправки сообщения
   */
  private async handleSendMessage(socket: AuthenticatedSocket, data: { 
    sessionId: string; 
    chatId: string;
    message: string;
  }, callback: Function): Promise<void> {
    try {
      const { sessionId, chatId, message } = data;
      const { companyId, role, id: userId } = socket.user!;

      if (!message || message.trim().length === 0) {
        return callback({ 
          success: false, 
          message: 'Сообщение не может быть пустым' 
        });
      }

      // Проверяем доступ к сессии
      const hasAccess = await this.checkSessionAccess(sessionId, userId, role, companyId);
      
      if (!hasAccess.allowed || !hasAccess.permissions?.canWrite) {
        return callback({ 
          success: false, 
          message: 'У вас нет права на отправку сообщений' 
        });
      }

      // Получаем информацию о чате
      const chat = await prisma.whatsAppChat.findFirst({
        where: {
          id: chatId,
          sessionId,
          companyId
        }
      });

      if (!chat) {
        return callback({ 
          success: false, 
          message: 'Чат не найден' 
        });
      }

      // Отправляем сообщение через WhatsApp
      const managerId = role === 'manager' ? userId : undefined;
      const success = await this.whatsappManager.sendMessage(sessionId, chat.chatId, message.trim(), managerId);

      if (success) {
        callback({
          success: true,
          message: 'Сообщение отправлено'
        });
      } else {
        callback({
          success: false,
          message: 'Ошибка отправки сообщения'
        });
      }

    } catch (error) {
      console.error('[WhatsApp WebSocket] Ошибка отправки сообщения:', error);
      callback({ 
        success: false, 
        message: 'Ошибка отправки сообщения' 
      });
    }
  }

  /**
   * Обработчик получения статуса сессии
   */
  private async handleGetSessionStatus(socket: AuthenticatedSocket, data: { sessionId: string }, callback: Function): Promise<void> {
    try {
      const { sessionId } = data;
      const { companyId, role, id: userId } = socket.user!;

      // Проверяем доступ к сессии
      const hasAccess = await this.checkSessionAccess(sessionId, userId, role, companyId);
      
      if (!hasAccess.allowed) {
        return callback({ 
          success: false, 
          message: hasAccess.message 
        });
      }

      const session = await prisma.whatsAppSession.findUnique({
        where: { id: sessionId },
        select: {
          id: true,
          phoneNumber: true,
          displayName: true,
          isActive: true,
          isConnected: true,
          lastSeen: true,
          qrCode: true
        }
      });

      callback({
        success: true,
        data: session
      });

    } catch (error) {
      console.error('[WhatsApp WebSocket] Ошибка получения статуса сессии:', error);
      callback({ 
        success: false, 
        message: 'Ошибка получения статуса сессии' 
      });
    }
  }

  /**
   * Проверка доступа к WhatsApp сессии
   */
  private async checkSessionAccess(sessionId: string, userId: string, role: string, companyId: string): Promise<{
    allowed: boolean;
    message?: string;
    permissions?: {
      canRead: boolean;
      canWrite: boolean;
      canManageChats: boolean;
    };
  }> {
    try {
      if (role === 'admin') {
        // Администратор имеет доступ ко всем сессиям своей компании
        const session = await prisma.whatsAppSession.findFirst({
          where: {
            id: sessionId,
            companyId,
            isActive: true
          }
        });

        if (!session) {
          return {
            allowed: false,
            message: 'WhatsApp сессия не найдена'
          };
        }

        return {
          allowed: true,
          permissions: {
            canRead: true,
            canWrite: true,
            canManageChats: true
          }
        };
      } else {
        // Менеджер должен иметь доступ к сессии
        const access = await prisma.whatsAppManagerAccess.findFirst({
          where: {
            sessionId,
            managerId: userId,
            companyId
          }
        });

        if (!access) {
          return {
            allowed: false,
            message: 'У вас нет доступа к этой WhatsApp сессии'
          };
        }

        return {
          allowed: true,
          permissions: {
            canRead: access.canRead,
            canWrite: access.canWrite,
            canManageChats: access.canManageChats
          }
        };
      }
    } catch (error) {
      console.error('[WhatsApp WebSocket] Ошибка проверки доступа:', error);
      return {
        allowed: false,
        message: 'Ошибка проверки доступа'
      };
    }
  }

  /**
   * Отправка обновления списка чатов всем подключенным пользователям сессии
   */
  public notifyChatsUpdate(sessionId: string, companyId: string): void {
    this.io.of('/whatsapp').to(`session:${sessionId}`).emit('whatsapp:chats_updated', {
      sessionId,
      companyId
    });
  }

  /**
   * Отправка нового сообщения всем подключенным пользователям сессии
   */
  public notifyNewMessage(sessionId: string, companyId: string, chat: any, message: any): void {
    this.io.of('/whatsapp').to(`session:${sessionId}`).emit('whatsapp:new_message', {
      sessionId,
      companyId,
      chat,
      message
    });
  }

  /**
   * Обработчик отметки сообщений чата как прочитанных
   */
  private async handleMarkChatAsRead(socket: AuthenticatedSocket, data: { 
    sessionId: string; 
    chatId: string;
  }, callback: Function): Promise<void> {
    try {
      const { sessionId, chatId } = data;
      const { companyId, role, id: userId } = socket.user!;

      // Проверяем доступ к сессии
      const hasAccess = await this.checkSessionAccess(sessionId, userId, role, companyId);
      
      if (!hasAccess.allowed || !hasAccess.permissions?.canRead) {
        return callback({ 
          success: false, 
          message: 'У вас нет права на просмотр сообщений' 
        });
      }

      // Проверяем, что чат принадлежит сессии и компании
      const chat = await prisma.whatsAppChat.findFirst({
        where: {
          id: chatId,
          sessionId,
          companyId
        }
      });

      if (!chat) {
        return callback({ 
          success: false, 
          message: 'Чат не найден' 
        });
      }

      // Считаем количество непрочитанных сообщений
      const unreadMessagesCount = await prisma.whatsAppMessage.count({
        where: {
          chatId,
          sessionId,
          companyId,
          fromMe: false,
          isRead: false
        }
      });

      if (unreadMessagesCount > 0) {
        // Отмечаем все входящие сообщения как прочитанные
        await prisma.whatsAppMessage.updateMany({
          where: {
            chatId,
            sessionId,
            companyId,
            fromMe: false,
            isRead: false
          },
          data: {
            isRead: true
          }
        });

        // Обнуляем счетчик непрочитанных сообщений в чате
        const updatedChat = await prisma.whatsAppChat.update({
          where: {
            id: chatId
          },
          data: {
            unreadCount: 0
          },
          include: {
            _count: {
              select: {
                messages: true
              }
            }
          }
        });

        console.log(`[WhatsApp WebSocket] Отмечено ${unreadMessagesCount} сообщений как прочитанные в чате ${chatId}`);

        // Уведомляем всех пользователей сессии об обновлении чата
        this.io.of('/whatsapp').to(`session:${sessionId}`).emit('whatsapp:chat_updated', {
          sessionId,
          companyId,
          chat: updatedChat
        });

        callback({
          success: true,
          message: 'Сообщения отмечены как прочитанные',
          data: {
            markedCount: unreadMessagesCount,
            chat: updatedChat
          }
        });
      } else {
        callback({
          success: true,
          message: 'Нет непрочитанных сообщений',
          data: {
            markedCount: 0,
            chat
          }
        });
      }

    } catch (error) {
      console.error('[WhatsApp WebSocket] Ошибка отметки сообщений как прочитанные:', error);
      callback({ 
        success: false, 
        message: 'Ошибка отметки сообщений как прочитанные' 
      });
    }
  }

  /**
   * Отправка уведомления об изменении статуса сессии
   */
  public notifySessionStatus(sessionId: string, status: any): void {
    // Сначала получаем информацию о сессии чтобы узнать companyId
    prisma.whatsAppSession.findUnique({
      where: { id: sessionId },
      select: { companyId: true }
    }).then((session) => {
      if (session) {
        const eventData = {
          sessionId,
          ...status
        };

        // Отправляем в комнату сессии (для подключенных к сессии)
        this.io.of('/whatsapp').to(`session:${sessionId}`).emit('whatsapp:session_status', eventData);
        
        // Также отправляем всем клиентам компании (для тех кто просто подключен к WebSocket)
        this.io.of('/whatsapp').to(`company:${session.companyId}`).emit('whatsapp:session_status', eventData);
        
        console.log(`[WhatsApp WebSocket] Отправлено уведомление о статусе сессии ${sessionId} для компании ${session.companyId}:`, status);
      }
    }).catch((error) => {
      console.error('[WhatsApp WebSocket] Ошибка при отправке уведомления о статусе сессии:', error);
    });
  }
} 