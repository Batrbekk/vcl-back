import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../services/database';
import { AuthenticatedRequest, ExtendedUser, JWTPayload } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Не авторизован' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    
    // Определяем тип пользователя (по умолчанию 'user' для обратной совместимости)
    const userType = decoded.userType || 'user';
    
    if (userType === 'user') {
      // Получаем пользователя с информацией о компании
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              slug: true,
              isActive: true
            }
          }
        }
      });
      
      if (!user || !Boolean(user.isVerified)) {
        return res.status(401).json({ message: 'Не авторизован' });
      }

      // Проверяем активность компании
      if (!user.company || !Boolean(user.company.isActive)) {
        return res.status(401).json({ message: 'Компания неактивна' });
      }

      // Создаем расширенного пользователя для middleware
      const extendedUser: ExtendedUser = {
        id: user.id,
        email: user.email,
        role: user.role,
        isActive: Boolean(user.isVerified),
        companyId: user.companyId,
        company: {
          id: user.company.id,
          name: user.company.name,
          slug: user.company.slug
        }
      };

      req.user = extendedUser;
      next();
    } else if (userType === 'manager') {
      // Получаем менеджера с информацией о компании
      const manager = await prisma.manager.findUnique({
        where: { id: decoded.userId },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              slug: true,
              isActive: true
            }
          }
        }
      });
      
      if (!manager) {
        return res.status(401).json({ message: 'Не авторизован' });
      }

      // Проверяем активность компании
      if (!manager.company || !Boolean(manager.company.isActive)) {
        return res.status(401).json({ message: 'Компания неактивна' });
      }

      // Создаем расширенного пользователя для middleware
      const extendedUser: ExtendedUser = {
        id: manager.id,
        email: manager.email,
        role: manager.role,
        isActive: true, // Менеджеры всегда активны
        companyId: manager.companyId,
        company: {
          id: manager.company.id,
          name: manager.company.name,
          slug: manager.company.slug
        }
      };

      req.user = extendedUser;
      next();
    } else {
      return res.status(401).json({ message: 'Недопустимый тип пользователя' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Не авторизован' });
  }
};

// Проверка роли администратора
export const adminMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Нет прав доступа' });
  }
  next();
};

// Проверка роли гостя
export const guestMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'guest') {
    return res.status(403).json({ message: 'Нет прав доступа' });
  }
  next();
}; 