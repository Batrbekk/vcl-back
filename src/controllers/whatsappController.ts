import { Request, Response } from 'express';
import { AuthenticatedRequest, CustomRequest } from '../types';
import { prisma } from '../services/database';
import { WhatsAppSessionManager } from '../services/whatsappSessionManager';

// Глобальный экземпляр менеджера сессий (будет инициализирован в app.ts)
let whatsappManager: WhatsAppSessionManager;

export const setWhatsAppSessionManager = (manager: WhatsAppSessionManager) => {
  whatsappManager = manager;
};

/**
 * Создание новой WhatsApp сессии для компании
 */
export const createWhatsAppSession = async (req: CustomRequest, res: Response) => {
  try {
    const { companyId } = req.user!;
    const adminId = req.user!.id;

    console.log(`[WhatsApp Controller] Создание сессии для компании ${companyId}`);

    // Проверяем права администратора
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Только администраторы могут создавать WhatsApp сессии' 
      });
    }

    // Создаем сессию
    const sessionId = await whatsappManager.createSession(companyId, adminId);

    res.json({
      success: true,
      data: {
        sessionId,
        message: 'WhatsApp сессия создана. Ожидайте QR код для авторизации.'
      }
    });

  } catch (error: any) {
    console.error('[WhatsApp Controller] Ошибка создания сессии:', error);
    
    // Специальная обработка ошибки уникального ключа Prisma
    if (error.code === 'P2002' && error.meta?.target?.includes('phoneNumber')) {
      return res.status(409).json({
        success: false,
        message: 'У компании уже существует сессия с таким номером телефона. Попробуйте удалить существующую сессию и создать новую.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Ошибка создания WhatsApp сессии'
    });
  }
};

/**
 * Очистка старых/поврежденных сессий для компании
 */
export const cleanupWhatsAppSessions = async (req: CustomRequest, res: Response) => {
  try {
    const { companyId } = req.user!;

    console.log(`[WhatsApp Controller] Очистка сессий для компании ${companyId}`);

    // Проверяем права администратора
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Только администраторы могут очищать WhatsApp сессии' 
      });
    }

    // Очищаем сессии
    await whatsappManager.cleanupCompanySessions(companyId);

    res.json({
      success: true,
      message: 'Старые сессии очищены. Теперь можно создать новую сессию.'
    });

  } catch (error: any) {
    console.error('[WhatsApp Controller] Ошибка очистки сессий:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Ошибка очистки WhatsApp сессий'
    });
  }
};

/**
 * Получение QR кода для авторизации
 */
export const getQRCode = async (req: CustomRequest, res: Response) => {
  try {
    const { companyId } = req.user!;
    const { sessionId } = req.params;

    // Проверяем, что сессия принадлежит компании
    const session = await prisma.whatsAppSession.findFirst({
      where: {
        id: sessionId,
        companyId,
        isActive: true
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'WhatsApp сессия не найдена'
      });
    }

    if (session.isConnected) {
      return res.json({
        success: true,
        data: {
          isConnected: true,
          phoneNumber: session.phoneNumber,
          displayName: session.displayName,
          message: 'WhatsApp уже подключен'
        }
      });
    }

    if (!session.qrCode) {
      return res.json({
        success: true,
        data: {
          isConnected: false,
          message: 'QR код еще не сгенерирован. Подождите несколько секунд и попробуйте снова.'
        }
      });
    }

    res.json({
      success: true,
      data: {
        isConnected: false,
        qrCode: session.qrCode,
        message: 'Отсканируйте QR код в WhatsApp для авторизации'
      }
    });

  } catch (error: any) {
    console.error('[WhatsApp Controller] Ошибка получения QR кода:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения QR кода'
    });
  }
};

/**
 * Получение списка WhatsApp сессий компании
 */
export const getCompanySessions = async (req: CustomRequest, res: Response) => {
  try {
    const { companyId } = req.user!;

    const sessions = await prisma.whatsAppSession.findMany({
      where: {
        companyId,
        isActive: true
      },
      include: {
        admin: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        _count: {
          select: {
            chats: true,
            messages: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: sessions
    });

  } catch (error: any) {
    console.error('[WhatsApp Controller] Ошибка получения сессий:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения WhatsApp сессий'
    });
  }
};

/**
 * Предоставление доступа менеджеру к WhatsApp сессии
 */
export const grantManagerAccess = async (req: CustomRequest, res: Response) => {
  try {
    const { companyId } = req.user!;
    const adminId = req.user!.id;
    const { sessionId } = req.params;
    const { managerId, canRead = true, canWrite = true, canManageChats = false } = req.body;

    // Проверяем права администратора
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Только администраторы могут управлять доступом к WhatsApp' 
      });
    }

    // Проверяем, что сессия существует и принадлежит компании
    const session = await prisma.whatsAppSession.findFirst({
      where: {
        id: sessionId,
        companyId,
        isActive: true
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'WhatsApp сессия не найдена'
      });
    }

    // Проверяем, что менеджер существует и принадлежит компании
    const manager = await prisma.manager.findFirst({
      where: {
        id: managerId,
        companyId
      }
    });

    if (!manager) {
      return res.status(404).json({
        success: false,
        message: 'Менеджер не найден'
      });
    }

    // Создаем или обновляем доступ
    const access = await prisma.whatsAppManagerAccess.upsert({
      where: {
        sessionId_managerId: {
          sessionId,
          managerId
        }
      },
      update: {
        canRead,
        canWrite,
        canManageChats,
        grantedBy: adminId
      },
      create: {
        sessionId,
        managerId,
        companyId,
        canRead,
        canWrite,
        canManageChats,
        grantedBy: adminId
      },
      include: {
        manager: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: access,
      message: 'Доступ менеджера к WhatsApp успешно настроен'
    });

  } catch (error: any) {
    console.error('[WhatsApp Controller] Ошибка предоставления доступа:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка предоставления доступа'
    });
  }
};

/**
 * Получение списка доступов менеджеров к WhatsApp сессии
 */
export const getManagerAccess = async (req: CustomRequest, res: Response) => {
  try {
    const { companyId } = req.user!;
    const { sessionId } = req.params;

    // Проверяем права администратора
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Только администраторы могут просматривать доступы к WhatsApp' 
      });
    }

    // Проверяем, что сессия существует и принадлежит компании
    const session = await prisma.whatsAppSession.findFirst({
      where: {
        id: sessionId,
        companyId,
        isActive: true
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'WhatsApp сессия не найдена'
      });
    }

    // Получаем список доступов
    const accesses = await prisma.whatsAppManagerAccess.findMany({
      where: {
        sessionId,
        companyId
      },
      include: {
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        grantedByUser: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        grantedAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: accesses
    });

  } catch (error: any) {
    console.error('[WhatsApp Controller] Ошибка получения списка доступов:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения списка доступов'
    });
  }
};

/**
 * Отзыв доступа менеджера к WhatsApp сессии
 */
export const revokeManagerAccess = async (req: CustomRequest, res: Response) => {
  try {
    const { companyId } = req.user!;
    const { sessionId, managerId } = req.params;

    // Проверяем права администратора
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Только администраторы могут управлять доступом к WhatsApp' 
      });
    }

    // Удаляем доступ
    await prisma.whatsAppManagerAccess.delete({
      where: {
        sessionId_managerId: {
          sessionId,
          managerId
        }
      }
    });

    res.json({
      success: true,
      message: 'Доступ менеджера к WhatsApp отозван'
    });

  } catch (error: any) {
    console.error('[WhatsApp Controller] Ошибка отзыва доступа:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка отзыва доступа'
    });
  }
};

/**
 * Получение списка чатов WhatsApp
 */
export const getChats = async (req: CustomRequest, res: Response) => {
  try {
    const { companyId } = req.user!;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const { sessionId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    // Проверяем доступ к сессии
    if (userRole === 'admin') {
      // Администратор имеет доступ ко всем сессиям своей компании
      const session = await prisma.whatsAppSession.findFirst({
        where: {
          id: sessionId,
          companyId,
          isActive: true
        }
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'WhatsApp сессия не найдена'
        });
      }
    } else {
      // Менеджер должен иметь доступ к сессии
      const access = await prisma.whatsAppManagerAccess.findFirst({
        where: {
          sessionId,
          managerId: userId,
          companyId,
          canRead: true
        }
      });

      if (!access) {
        return res.status(403).json({
          success: false,
          message: 'У вас нет доступа к этой WhatsApp сессии'
        });
      }
    }

    // Получаем параметры фильтрации
    const { 
      includeGroups = 'false', 
      includeStatus = 'false',
      chatType = 'individual' 
    } = req.query;

    // Строим базовые условия
    const whereConditions: any = {
      sessionId,
      companyId
    };

    // Собираем фильтры исключения
    const excludeConditions: any[] = [];

    // Исключаем статусы WhatsApp по умолчанию
    if (includeStatus === 'false') {
      excludeConditions.push({ chatId: 'status@broadcast' });
    }

    // Исключаем групповые чаты по умолчанию
    if (includeGroups === 'false') {
      excludeConditions.push({ isGroup: true });
    }

    // Фильтр по типу чата
    if (chatType && chatType !== 'all') {
      whereConditions.chatType = chatType;
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
      take: Number(limit)
    });

    const totalChats = await prisma.whatsAppChat.count({
      where: whereConditions
    });

    res.json({
      success: true,
      data: {
        chats,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: totalChats,
          pages: Math.ceil(totalChats / Number(limit))
        }
      }
    });

  } catch (error: any) {
    console.error('[WhatsApp Controller] Ошибка получения чатов:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения чатов'
    });
  }
};

/**
 * Получение сообщений чата
 */
export const getChatMessages = async (req: CustomRequest, res: Response) => {
  try {
    const { companyId } = req.user!;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const { sessionId, chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    // Проверяем доступ к сессии
    if (userRole !== 'admin') {
      const access = await prisma.whatsAppManagerAccess.findFirst({
        where: {
          sessionId,
          managerId: userId,
          companyId,
          canRead: true
        }
      });

      if (!access) {
        return res.status(403).json({
          success: false,
          message: 'У вас нет доступа к этой WhatsApp сессии'
        });
      }
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
      return res.status(404).json({
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
      take: Number(limit)
    });

    const totalMessages = await prisma.whatsAppMessage.count({
      where: {
        chatId,
        sessionId,
        companyId
      }
    });

    // Отмечаем сообщения как прочитанные
    if (messages.length > 0 && userRole === 'manager') {
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
        await prisma.whatsAppChat.update({
          where: {
            id: chatId
          },
          data: {
            unreadCount: 0
          }
        });
      }
    }

    res.json({
      success: true,
      data: {
        chat,
        messages: messages.reverse(), // Возвращаем в хронологическом порядке
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: totalMessages,
          pages: Math.ceil(totalMessages / Number(limit))
        }
      }
    });

  } catch (error: any) {
    console.error('[WhatsApp Controller] Ошибка получения сообщений:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения сообщений'
    });
  }
};

/**
 * Отправка сообщения в WhatsApp чат
 */
export const sendMessage = async (req: CustomRequest, res: Response) => {
  try {
    const { companyId } = req.user!;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const { sessionId, chatId } = req.params;
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Сообщение не может быть пустым'
      });
    }

    // Проверяем доступ к сессии с правом записи
    if (userRole !== 'admin') {
      const access = await prisma.whatsAppManagerAccess.findFirst({
        where: {
          sessionId,
          managerId: userId,
          companyId,
          canWrite: true
        }
      });

      if (!access) {
        return res.status(403).json({
          success: false,
          message: 'У вас нет права отправлять сообщения в этой WhatsApp сессии'
        });
      }
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
      return res.status(404).json({
        success: false,
        message: 'Чат не найден'
      });
    }

    // Отправляем сообщение через WhatsApp
    const managerId = userRole === 'manager' ? userId : undefined;
    const success = await whatsappManager.sendMessage(sessionId, chat.chatId, message.trim(), managerId);

    if (success) {
      res.json({
        success: true,
        message: 'Сообщение отправлено'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Ошибка отправки сообщения'
      });
    }

  } catch (error: any) {
    console.error('[WhatsApp Controller] Ошибка отправки сообщения:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Ошибка отправки сообщения'
    });
  }
};

/**
 * Отметить сообщения чата как прочитанные
 */
export const markChatAsRead = async (req: CustomRequest, res: Response) => {
  try {
    const { companyId } = req.user!;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const { sessionId, chatId } = req.params;

    // Проверяем доступ к сессии
    if (userRole !== 'admin') {
      const access = await prisma.whatsAppManagerAccess.findFirst({
        where: {
          sessionId,
          managerId: userId,
          companyId,
          canRead: true
        }
      });

      if (!access) {
        return res.status(403).json({
          success: false,
          message: 'У вас нет доступа к этой WhatsApp сессии'
        });
      }
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
      return res.status(404).json({
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

      console.log(`[WhatsApp Controller] Отмечено ${unreadMessagesCount} сообщений как прочитанные в чате ${chatId}`);

      res.json({
        success: true,
        message: 'Сообщения отмечены как прочитанные',
        data: {
          markedCount: unreadMessagesCount,
          chat: updatedChat
        }
      });
    } else {
      res.json({
        success: true,
        message: 'Нет непрочитанных сообщений',
        data: {
          markedCount: 0,
          chat
        }
      });
    }

  } catch (error: any) {
    console.error('[WhatsApp Controller] Ошибка отметки сообщений как прочитанные:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка отметки сообщений как прочитанные'
    });
  }
};

/**
 * Отключение WhatsApp сессии
 */
export const disconnectSession = async (req: CustomRequest, res: Response) => {
  try {
    const { companyId } = req.user!;
    const { sessionId } = req.params;

    // Проверяем права администратора
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Только администраторы могут отключать WhatsApp сессии' 
      });
    }

    // Проверяем, что сессия принадлежит компании
    const session = await prisma.whatsAppSession.findFirst({
      where: {
        id: sessionId,
        companyId,
        isActive: true
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'WhatsApp сессия не найдена'
      });
    }

    // Уничтожаем сессию
    await whatsappManager.destroySession(sessionId);

    res.json({
      success: true,
      message: 'WhatsApp сессия отключена'
    });

  } catch (error: any) {
    console.error('[WhatsApp Controller] Ошибка отключения сессии:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка отключения WhatsApp сессии'
    });
  }
};

/**
 * Получение статистики WhatsApp для компании
 */
export const getWhatsAppStats = async (req: CustomRequest, res: Response) => {
  try {
    const { companyId } = req.user!;

    const stats = await prisma.whatsAppSession.findMany({
      where: {
        companyId,
        isActive: true
      },
      include: {
        _count: {
          select: {
            chats: true,
            messages: true
          }
        }
      }
    });

    const totalSessions = stats.length;
    const connectedSessions = stats.filter(s => s.isConnected).length;
    const totalChats = stats.reduce((sum, s) => sum + s._count.chats, 0);
    const totalMessages = stats.reduce((sum, s) => sum + s._count.messages, 0);

    // Получаем статистику сообщений за последние 30 дней
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentMessages = await prisma.whatsAppMessage.count({
      where: {
        companyId,
        timestamp: {
          gte: thirtyDaysAgo
        }
      }
    });

    const recentIncomingMessages = await prisma.whatsAppMessage.count({
      where: {
        companyId,
        fromMe: false,
        timestamp: {
          gte: thirtyDaysAgo
        }
      }
    });

    const recentOutgoingMessages = await prisma.whatsAppMessage.count({
      where: {
        companyId,
        fromMe: true,
        timestamp: {
          gte: thirtyDaysAgo
        }
      }
    });

    res.json({
      success: true,
      data: {
        sessions: {
          total: totalSessions,
          connected: connectedSessions,
          disconnected: totalSessions - connectedSessions
        },
        chats: {
          total: totalChats
        },
        messages: {
          total: totalMessages,
          last30Days: {
            total: recentMessages,
            incoming: recentIncomingMessages,
            outgoing: recentOutgoingMessages
          }
        }
      }
    });

  } catch (error: any) {
    console.error('[WhatsApp Controller] Ошибка получения статистики:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения статистики WhatsApp'
    });
  }
}; 