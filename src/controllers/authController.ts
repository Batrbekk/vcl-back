import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { sendVerificationEmail, sendResetPasswordEmail } from '../services/emailService';

interface CustomRequest extends Request {
  user?: {
    userId: string;
  };
}

const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const register = async (req: Request, res: Response) => {
  try {
    const { email, firstName, lastName, companyName, password } = req.body;

    // Проверка существования пользователя
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Пользователь с таким email уже существует' });
    }

    // Создание кода верификации
    const verificationCode = generateVerificationCode();

    // Создание нового пользователя
    const user = new User({
      email,
      firstName,
      lastName,
      companyName,
      password,
      verificationCode
    });

    await user.save();

    res.status(200).json({ 
      message: 'Регистрация успешна',
      email: email
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при регистрации' });
  }
};

export const sendCode = async (req: Request, res: Response) => {
  try {
    const { email, mode } = req.body;

    if (!['register', 'reset'].includes(mode)) {
      return res.status(400).json({ message: 'Неверный режим отправки кода' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    if (mode === 'register' && user.isVerified) {
      return res.status(400).json({ message: 'Email уже подтвержден' });
    }

    const code = generateVerificationCode();

    if (mode === 'register') {
      user.verificationCode = code;
    } else {
      user.resetPasswordCode = code;
    }

    await user.save();

    try {
      if (mode === 'register') {
        await sendVerificationEmail(email, code);
      } else {
        await sendResetPasswordEmail(email, code);
      }
      res.status(200).json({ message: 'Код отправлен на email' });
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      return res.status(500).json({ 
        message: 'Ошибка при отправке кода',
        error: emailError instanceof Error ? emailError.message : 'Unknown error'
      });
    }
  } catch (error) {
    console.error('Code sending error:', error);
    res.status(500).json({ 
      message: 'Ошибка при отправке кода',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { email, code, mode } = req.body;

    if (!['register', 'reset'].includes(mode)) {
      return res.status(400).json({ message: 'Неверный режим верификации' });
    }

    const user = await User.findOne({ 
      email,
      [mode === 'register' ? 'verificationCode' : 'resetPasswordCode']: code 
    });

    if (!user) {
      return res.status(400).json({ message: 'Неверный код' });
    }

    if (mode === 'register') {
      user.isVerified = true;
      user.verificationCode = undefined;
    } else {
      user.resetPasswordCode = undefined;
    }

    await user.save();

    res.json({ message: mode === 'register' ? 'Email успешно подтвержден' : 'Код подтвержден' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при подтверждении' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }

    if (!user.isVerified) {
      return res.status(401).json({ message: 'Email не подтвержден' });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при входе' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, newPassword } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    if (user.resetPasswordCode) {
      return res.status(400).json({ message: 'Сначала подтвердите код сброса пароля' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Пароль успешно изменен' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при сбросе пароля' });
  }
};

export const getMe = async (req: CustomRequest, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: 'Не авторизован' });
    }

    const user = await User.findById(req.user.userId).select('-password -verificationCode -resetPasswordCode');
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при получении данных пользователя' });
  }
}; 