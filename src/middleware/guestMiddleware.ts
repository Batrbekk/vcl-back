import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const guestMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (token) {
      return res.status(400).json({ message: 'Вы уже авторизованы' });
    }

    next();
  } catch (error) {
    next();
  }
}; 