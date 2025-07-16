import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import QRCode from 'qrcode';
import { Server } from 'socket.io';
import { prisma } from './database';
import * as path from 'path';
import * as fs from 'fs';

interface WhatsAppSessionData {
  id: string;
  companyId: string;
  client: Client;
  isConnected: boolean;
  phoneNumber?: string;
  displayName?: string;
}

export class WhatsAppSessionManager {
  private sessions: Map<string, WhatsAppSessionData> = new Map();
  private io: Server;
  private sessionsDir = path.join(process.cwd(), '.whatsapp-sessions');
  private webSocketController?: any; // Будет установлен через setWebSocketController

  constructor(io: Server) {
    this.io = io;
    this.ensureSessionsDirectory();
  }

  /**
   * Устанавливает WebSocket контроллер для уведомлений
   */
  public setWebSocketController(controller: any): void {
    this.webSocketController = controller;
  }

  private ensureSessionsDirectory(): void {
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
    }
  }

  /**
   * Очистка старых или поврежденных сессий для компании
   */
  async cleanupCompanySessions(companyId: string): Promise<void> {
    try {
      console.log(`[WhatsApp] Очистка старых сессий для компании ${companyId}`);
      
      // Удаляем все неактивные сессии с pending номером
      const deletedSessions = await prisma.whatsAppSession.deleteMany({
        where: {
          companyId,
          phoneNumber: 'pending',
          isActive: false
        }
      });
      
      if (deletedSessions.count > 0) {
        console.log(`[WhatsApp] Удалено ${deletedSessions.count} старых сессий для компании ${companyId}`);
      }
      
      // Удаляем неактивные сессии старше 24 часов
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const deletedOldSessions = await prisma.whatsAppSession.deleteMany({
        where: {
          companyId,
          isActive: false,
          updatedAt: {
            lt: oneDayAgo
          }
        }
      });
      
      if (deletedOldSessions.count > 0) {
        console.log(`[WhatsApp] Удалено ${deletedOldSessions.count} старых неактивных сессий для компании ${companyId}`);
      }
    } catch (error) {
      console.error(`[WhatsApp] Ошибка очистки сессий для компании ${companyId}:`, error);
    }
  }

  /**
   * Создание новой WhatsApp сессии для компании
   */
  async createSession(companyId: string, adminId: string): Promise<string> {
    try {
      console.log(`[WhatsApp] Создаем новую сессию для компании ${companyId}`);

      // Сначала очищаем старые сессии
      await this.cleanupCompanySessions(companyId);

      // Проверяем, нет ли уже активной сессии для компании
      const existingActiveSession = await prisma.whatsAppSession.findFirst({
        where: {
          companyId,
          isActive: true
        }
      });

      if (existingActiveSession) {
        throw new Error('У компании уже есть активная WhatsApp сессия');
      }

      // Проверяем, есть ли сессия с phoneNumber 'pending' (активная или неактивная)
      const existingPendingSession = await prisma.whatsAppSession.findFirst({
        where: {
          companyId,
          phoneNumber: 'pending'
        }
      });

      let sessionRecord;
      
      if (existingPendingSession) {
        // Обновляем существующую сессию
        console.log(`[WhatsApp] Обновляем существующую сессию ${existingPendingSession.id} для компании ${companyId}`);
        sessionRecord = await prisma.whatsAppSession.update({
          where: { id: existingPendingSession.id },
          data: {
            adminId,
            isActive: true,
            isConnected: false,
            qrCode: null,
            sessionData: null,
            lastSeen: null,
            updatedAt: new Date()
          }
        });
      } else {
        // Создаем новую запись в базе данных
        sessionRecord = await prisma.whatsAppSession.create({
          data: {
            companyId,
            adminId,
            phoneNumber: 'pending',
            isActive: true,
            isConnected: false
          }
        });
      }

      // Создаем клиент WhatsApp
      const sessionPath = path.join(this.sessionsDir, `session_${sessionRecord.id}`);
      const client = new Client({
        authStrategy: new LocalAuth({
          clientId: sessionRecord.id,
          dataPath: sessionPath
        }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
          ]
        }
      });

      // Сохраняем сессию
      this.sessions.set(sessionRecord.id, {
        id: sessionRecord.id,
        companyId,
        client,
        isConnected: false
      });

      // Настраиваем обработчики событий
      this.setupClientEventHandlers(sessionRecord.id, client);

      // Инициализируем клиент
      await client.initialize();

      console.log(`[WhatsApp] Сессия ${sessionRecord.id} создана и инициализирована`);
      return sessionRecord.id;

    } catch (error) {
      console.error('[WhatsApp] Ошибка создания сессии:', error);
      throw error;
    }
  }

  /**
   * Настройка обработчиков событий для WhatsApp клиента
   */
  private setupClientEventHandlers(sessionId: string, client: Client): void {
    // QR код для авторизации
    client.on('qr', async (qr) => {
      try {
        console.log(`[WhatsApp] QR код получен для сессии ${sessionId}`);
        
        // Генерируем QR код как base64 изображение
        const qrCodeImage = await QRCode.toDataURL(qr);
        
        // Сохраняем QR код в базу данных
        await prisma.whatsAppSession.update({
          where: { id: sessionId },
          data: { qrCode: qrCodeImage }
        });

        // Отправляем QR код через WebSocket (старый способ для совместимости)
        this.io.of('/whatsapp').to(`session:${sessionId}`).emit('whatsapp:qr', {
          sessionId,
          qrCode: qrCodeImage
        });

        // Новый способ через WebSocket контроллер
        if (this.webSocketController) {
          console.log(`[WhatsApp] Отправляем QR код для сессии ${sessionId} через WebSocket (длина: ${qrCodeImage.length})`);
          this.webSocketController.notifySessionStatus(sessionId, {
            status: 'qr_ready',
            qrCode: qrCodeImage
          });
        }

      } catch (error) {
        console.error(`[WhatsApp] Ошибка обработки QR кода для сессии ${sessionId}:`, error);
      }
    });

    // Успешная авторизация
    client.on('ready', async () => {
      try {
        console.log(`[WhatsApp] Клиент готов для сессии ${sessionId}`);
        
        const sessionData = this.sessions.get(sessionId);
        if (!sessionData) return;

        // Получаем информацию о пользователе
        const clientInfo = client.info;
        const phoneNumber = clientInfo.wid.user;
        const displayName = clientInfo.pushname || 'Unknown';

        // Получаем текущую сессию для компании
        const currentSession = await prisma.whatsAppSession.findUnique({
          where: { id: sessionId },
          select: { companyId: true, phoneNumber: true }
        });

        if (!currentSession) {
          console.error(`[WhatsApp] Сессия ${sessionId} не найдена в базе данных`);
          return;
        }

        // Проверяем, есть ли уже сессия с таким номером для этой компании
        const existingSessionWithPhone = await prisma.whatsAppSession.findFirst({
          where: {
            companyId: currentSession.companyId,
            phoneNumber,
            id: { not: sessionId } // Исключаем текущую сессию
          }
        });

        // Если есть конфликтующая сессия - удаляем её
        if (existingSessionWithPhone) {
          console.log(`[WhatsApp] Удаляем старую сессию ${existingSessionWithPhone.id} с номером ${phoneNumber}`);
          await prisma.whatsAppSession.delete({
            where: { id: existingSessionWithPhone.id }
          });
          
          // Также удаляем из локального кэша если есть
          if (this.sessions.has(existingSessionWithPhone.id)) {
            const oldSessionData = this.sessions.get(existingSessionWithPhone.id);
            if (oldSessionData?.client) {
              try {
                await oldSessionData.client.destroy();
              } catch (error) {
                console.error(`[WhatsApp] Ошибка при уничтожении старого клиента:`, error);
              }
            }
            this.sessions.delete(existingSessionWithPhone.id);
          }
        }

        // Обновляем сессию в базе данных
        try {
          await prisma.whatsAppSession.update({
            where: { id: sessionId },
            data: {
              isConnected: true,
              phoneNumber,
              displayName,
              qrCode: null, // Очищаем QR код после успешной авторизации
              lastSeen: new Date()
            }
          });
        } catch (error: any) {
          // Дополнительная обработка на случай если ошибка всё-таки возникла
          if (error.code === 'P2002' && error.meta?.target?.includes('phoneNumber')) {
            console.error(`[WhatsApp] Конфликт уникального ключа при обновлении сессии ${sessionId}. Повторная попытка после очистки...`);
            
            // Ещё раз пытаемся очистить конфликтующие сессии
            await prisma.whatsAppSession.deleteMany({
              where: {
                companyId: currentSession.companyId,
                phoneNumber,
                id: { not: sessionId }
              }
            });
            
            // Повторная попытка обновления
            await prisma.whatsAppSession.update({
              where: { id: sessionId },
              data: {
                isConnected: true,
                phoneNumber,
                displayName,
                qrCode: null,
                lastSeen: new Date()
              }
            });
          } else {
            throw error; // Перебрасываем другие ошибки
          }
        }

        // Обновляем локальные данные
        sessionData.isConnected = true;
        sessionData.phoneNumber = phoneNumber;
        sessionData.displayName = displayName;

        // Уведомляем клиентов (старый способ для совместимости)
        this.io.of('/whatsapp').to(`session:${sessionId}`).emit('whatsapp:ready', {
          sessionId,
          phoneNumber,
          displayName
        });

        // Новый способ через WebSocket контроллер
        if (this.webSocketController) {
          console.log(`[WhatsApp] Отправляем уведомление о подключении сессии ${sessionId} через WebSocket`);
          this.webSocketController.notifySessionStatus(sessionId, {
            status: 'connected',
            phoneNumber,
            displayName,
            isConnected: true
          });
        }

        console.log(`[WhatsApp] Сессия ${sessionId} успешно авторизована как ${phoneNumber}`);

      } catch (error) {
        console.error(`[WhatsApp] Ошибка при готовности клиента ${sessionId}:`, error);
      }
    });

    // Новое сообщение
    client.on('message', async (message) => {
      try {
        await this.handleIncomingMessage(sessionId, message);
      } catch (error) {
        console.error(`[WhatsApp] Ошибка обработки сообщения для сессии ${sessionId}:`, error);
      }
    });

    // Отключение
    client.on('disconnected', async (reason) => {
      try {
        console.log(`[WhatsApp] Клиент отключен для сессии ${sessionId}, причина: ${reason}`);
        
        const sessionData = this.sessions.get(sessionId);
        if (sessionData) {
          sessionData.isConnected = false;
        }

        // Обновляем базу данных
        await prisma.whatsAppSession.update({
          where: { id: sessionId },
          data: {
            isConnected: false,
            lastSeen: new Date()
          }
        });

        // Уведомляем клиентов (старый способ для совместимости)
        this.io.of('/whatsapp').to(`session:${sessionId}`).emit('whatsapp:disconnected', {
          sessionId,
          reason
        });

        // Новый способ через WebSocket контроллер
        if (this.webSocketController) {
          this.webSocketController.notifySessionStatus(sessionId, {
            status: 'disconnected',
            reason,
            isConnected: false
          });
        }

      } catch (error) {
        console.error(`[WhatsApp] Ошибка при отключении клиента ${sessionId}:`, error);
      }
    });
  }

  /**
   * Проверка, следует ли игнорировать сообщение
   */
  private shouldIgnoreMessage(message: any): boolean {
    const chatId = message.from;
    
    // Игнорируем статусы WhatsApp
    if (chatId === 'status@broadcast') {
      return true;
    }
    
    // Игнорируем групповые сообщения по умолчанию
    if (message.from.endsWith('@g.us')) {
      return true;
    }
    
    // Игнорируем системные уведомления
    if (message.type === 'notification') {
      return true;
    }
    
    return false;
  }

  /**
   * Обработка входящих сообщений
   */
  private async handleIncomingMessage(sessionId: string, message: any): Promise<void> {
    try {
      const sessionData = this.sessions.get(sessionId);
      if (!sessionData) return;

      // Фильтруем нежелательные сообщения
      if (this.shouldIgnoreMessage(message)) {
        console.log(`[WhatsApp] Игнорируем сообщение от: ${message.from}, тип: ${message.type}`);
        return;
      }

      const chatId = message.from;
      const contact = await message.getContact();
      const chat = await message.getChat();

      // Сохраняем или обновляем чат
      let whatsappChat = await prisma.whatsAppChat.findUnique({
        where: {
          sessionId_chatId: {
            sessionId,
            chatId
          }
        }
      });

      if (!whatsappChat) {
        whatsappChat = await prisma.whatsAppChat.create({
          data: {
            sessionId,
            companyId: sessionData.companyId,
            chatId,
            chatName: contact.name || contact.number,
            chatType: chat.isGroup ? 'group' : 'individual',
            isGroup: chat.isGroup,
            lastMessageAt: new Date(message.timestamp * 1000),
            lastMessageText: message.body
          }
        });
      } else {
        whatsappChat = await prisma.whatsAppChat.update({
          where: { id: whatsappChat.id },
          data: {
            lastMessageAt: new Date(message.timestamp * 1000),
            lastMessageText: message.body,
            unreadCount: { increment: message.fromMe ? 0 : 1 }
          }
        });
      }

      // Сохраняем сообщение
      const whatsappMessage = await prisma.whatsAppMessage.create({
        data: {
          chatId: whatsappChat.id,
          sessionId,
          companyId: sessionData.companyId,
          messageId: message.id._serialized,
          fromMe: message.fromMe,
          fromNumber: message.from,
          fromName: contact.name || contact.number,
          body: message.body,
          messageType: message.type,
          timestamp: new Date(message.timestamp * 1000)
        }
      });

      // Отправляем уведомление через WebSocket (старый способ для совместимости)
      this.io.of('/whatsapp').to(`session:${sessionId}`).emit('whatsapp:new_message', {
        sessionId,
        companyId: sessionData.companyId,
        chat: {
          id: whatsappChat.id,
          chatId: whatsappChat.chatId,
          chatName: whatsappChat.chatName,
          chatType: whatsappChat.chatType,
          isGroup: whatsappChat.isGroup,
          lastMessageAt: whatsappChat.lastMessageAt,
          lastMessageText: whatsappChat.lastMessageText,
          unreadCount: whatsappChat.unreadCount
        },
        message: {
          id: whatsappMessage.id,
          messageId: whatsappMessage.messageId,
          fromMe: whatsappMessage.fromMe,
          fromNumber: whatsappMessage.fromNumber,
          fromName: whatsappMessage.fromName,
          body: whatsappMessage.body,
          messageType: whatsappMessage.messageType,
          timestamp: whatsappMessage.timestamp
        }
      });

      // Новый способ через WebSocket контроллер
      if (this.webSocketController) {
        this.webSocketController.notifyNewMessage(sessionId, sessionData.companyId, {
          id: whatsappChat.id,
          chatId: whatsappChat.chatId,
          chatName: whatsappChat.chatName,
          chatType: whatsappChat.chatType,
          isGroup: whatsappChat.isGroup,
          lastMessageAt: whatsappChat.lastMessageAt,
          lastMessageText: whatsappChat.lastMessageText,
          unreadCount: whatsappChat.unreadCount
        }, {
          id: whatsappMessage.id,
          messageId: whatsappMessage.messageId,
          fromMe: whatsappMessage.fromMe,
          fromNumber: whatsappMessage.fromNumber,
          fromName: whatsappMessage.fromName,
          body: whatsappMessage.body,
          messageType: whatsappMessage.messageType,
          timestamp: whatsappMessage.timestamp
        });

        // Уведомляем об обновлении чатов
        this.webSocketController.notifyChatsUpdate(sessionId, sessionData.companyId);
      }

      // Дополнительное событие для обновления списка чатов (старый способ)
      this.io.of('/whatsapp').to(`session:${sessionId}`).emit('whatsapp:chat_updated', {
        sessionId,
        companyId: sessionData.companyId,
        chat: {
          id: whatsappChat.id,
          chatId: whatsappChat.chatId,
          chatName: whatsappChat.chatName,
          chatType: whatsappChat.chatType,
          isGroup: whatsappChat.isGroup,
          lastMessageAt: whatsappChat.lastMessageAt,
          lastMessageText: whatsappChat.lastMessageText,
          unreadCount: whatsappChat.unreadCount
        }
      });

      console.log(`[WhatsApp] Сохранено сообщение для сессии ${sessionId}: ${message.body}`);

    } catch (error) {
      console.error(`[WhatsApp] Ошибка обработки входящего сообщения:`, error);
    }
  }

  /**
   * Отправка сообщения
   */
  async sendMessage(sessionId: string, chatId: string, message: string, managerId?: string): Promise<boolean> {
    try {
      const sessionData = this.sessions.get(sessionId);
      if (!sessionData || !sessionData.isConnected) {
        throw new Error('Сессия не найдена или не подключена');
      }

      // Отправляем сообщение
      const sentMessage = await sessionData.client.sendMessage(chatId, message);

      // Получаем информацию о чате
      let whatsappChat = await prisma.whatsAppChat.findUnique({
        where: {
          sessionId_chatId: {
            sessionId,
            chatId
          }
        }
      });

      if (!whatsappChat) {
        // Создаем новый чат если его нет
        const contact = await sentMessage.getContact();
        const chat = await sentMessage.getChat();
        
        whatsappChat = await prisma.whatsAppChat.create({
          data: {
            sessionId,
            companyId: sessionData.companyId,
            chatId,
            chatName: contact.name || contact.number,
            chatType: chat.isGroup ? 'group' : 'individual',
            isGroup: chat.isGroup,
            lastMessageAt: new Date(),
            lastMessageText: message
          }
        });
      }

      // Сохраняем отправленное сообщение
      const whatsappMessage = await prisma.whatsAppMessage.create({
        data: {
          chatId: whatsappChat.id,
          sessionId,
          companyId: sessionData.companyId,
          messageId: sentMessage.id._serialized,
          fromMe: true,
          fromNumber: sessionData.phoneNumber || 'unknown',
          fromName: sessionData.displayName || 'Me',
          body: message,
          messageType: 'text',
          timestamp: new Date(),
          managerId
        }
      });

      // Обновляем последнее сообщение в чате
      await prisma.whatsAppChat.update({
        where: { id: whatsappChat.id },
        data: {
          lastMessageAt: new Date(),
          lastMessageText: message
        }
      });

      // Уведомляем через WebSocket
      this.io.of('/whatsapp').to(`session:${sessionId}`).emit('whatsapp:message_sent', {
        sessionId,
        chatId: whatsappChat.id,
        message: whatsappMessage
      });

      console.log(`[WhatsApp] Сообщение отправлено для сессии ${sessionId}: ${message}`);
      return true;

    } catch (error) {
      console.error(`[WhatsApp] Ошибка отправки сообщения:`, error);
      throw error;
    }
  }

  /**
   * Получение сессии по ID
   */
  getSession(sessionId: string): WhatsAppSessionData | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Получение активных сессий для компании
   */
  getCompanySessions(companyId: string): WhatsAppSessionData[] {
    return Array.from(this.sessions.values()).filter(
      session => session.companyId === companyId
    );
  }

  /**
   * Уничтожение сессии
   */
  async destroySession(sessionId: string): Promise<void> {
    try {
      const sessionData = this.sessions.get(sessionId);
      if (sessionData) {
        await sessionData.client.destroy();
        this.sessions.delete(sessionId);
      }

      // Обновляем базу данных
      await prisma.whatsAppSession.update({
        where: { id: sessionId },
        data: {
          isActive: false,
          isConnected: false,
          qrCode: null
        }
      });

      // Удаляем файлы сессии
      const sessionPath = path.join(this.sessionsDir, `session_${sessionId}`);
      if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
      }

      console.log(`[WhatsApp] Сессия ${sessionId} уничтожена`);

    } catch (error) {
      console.error(`[WhatsApp] Ошибка уничтожения сессии ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Инициализация существующих сессий при запуске сервера
   */
  async initializeExistingSessions(): Promise<void> {
    try {
      const activeSessions = await prisma.whatsAppSession.findMany({
        where: {
          isActive: true
        }
      });

      console.log(`[WhatsApp] Найдено ${activeSessions.length} активных сессий для восстановления`);

      for (const session of activeSessions) {
        try {
          const sessionPath = path.join(this.sessionsDir, `session_${session.id}`);
          
          // Проверяем, существуют ли файлы сессии
          if (fs.existsSync(sessionPath)) {
            const client = new Client({
              authStrategy: new LocalAuth({
                clientId: session.id,
                dataPath: sessionPath
              }),
              puppeteer: {
                headless: true,
                args: [
                  '--no-sandbox',
                  '--disable-setuid-sandbox',
                  '--disable-dev-shm-usage'
                ]
              }
            });

            this.sessions.set(session.id, {
              id: session.id,
              companyId: session.companyId,
              client,
              isConnected: false,
              phoneNumber: session.phoneNumber || undefined,
              displayName: session.displayName || undefined
            });

            this.setupClientEventHandlers(session.id, client);
            await client.initialize();
            
            console.log(`[WhatsApp] Сессия ${session.id} восстановлена`);
          } else {
            // Если файлов сессии нет, деактивируем запись в БД
            await prisma.whatsAppSession.update({
              where: { id: session.id },
              data: {
                isActive: false,
                isConnected: false
              }
            });
            console.log(`[WhatsApp] Сессия ${session.id} деактивирована (файлы не найдены)`);
          }
        } catch (error) {
          console.error(`[WhatsApp] Ошибка восстановления сессии ${session.id}:`, error);
        }
      }

    } catch (error) {
      console.error('[WhatsApp] Ошибка инициализации существующих сессий:', error);
    }
  }
} 