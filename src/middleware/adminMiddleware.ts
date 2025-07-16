import { Response, NextFunction } from 'express';
import { prisma } from '../services/database';
import { AuthenticatedRequest } from '../types';

export const adminMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Пользователь не авторизован' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        role: true,
        isVerified: true,
        isActive: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: 'Аккаунт не подтвержден' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Аккаунт деактивирован' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Доступ запрещен. Требуются права администратора' });
    }

    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
}; 