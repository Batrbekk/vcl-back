import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';

export const adminMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: 'Требуется авторизация' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Доступ запрещен. Требуются права администратора' });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при проверке прав доступа' });
  }
}; 