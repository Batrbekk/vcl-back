import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '../services/database';
import { sendVerificationEmail, sendResetPasswordEmail } from '../services/emailService';
import { AuthenticatedRequest, JWTPayload } from '../types';

const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const generateSlug = (name: string) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

export const register = async (req: Request, res: Response) => {
  try {
    const { email, firstName, lastName, companyName, password } = req.body;

    console.log('=== НАЧАЛО РЕГИСТРАЦИИ ===');
    console.log('Email:', email);
    console.log('Company:', companyName);

    // Проверка существования пользователя
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      console.log('Пользователь уже существует');
      return res.status(400).json({ message: 'Пользователь с таким email уже существует' });
    }

    // Проверка существования компании с таким именем
    const existingCompany = await prisma.company.findFirst({
      where: { name: companyName }
    });
    
    if (existingCompany) {
      console.log('Компания уже существует');
      return res.status(400).json({ message: 'Компания с таким названием уже существует' });
    }

    // Создание кода верификации
    const verificationCode = generateVerificationCode();
    const slug = generateSlug(companyName);

    console.log('Верификационный код:', verificationCode);
    console.log('Slug:', slug);

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Пароль хеширован успешно');

    // Создаем компанию и пользователя в транзакции
    console.log('Начинаем транзакцию...');
    const result = await prisma.$transaction(async (tx) => {
      console.log('Создаем компанию...');
      // Сначала создаем компанию без createdBy
      const company = await tx.company.create({
        data: {
          name: companyName,
          slug,
          timezone: 'UTC',
          currency: 'USD',
          language: 'ru'
        }
      });

      console.log('Компания создана:', company.id);

      console.log('Создаем пользователя...');
      // Создаем пользователя с правильным companyId
      const user = await tx.user.create({
        data: {
          email,
          firstName,
          lastName,
          companyName,
          password: hashedPassword,
          verificationCode,
          companyId: company.id
        }
      });

      console.log('Пользователь создан:', user.id);

      console.log('Обновляем компанию...');
      // Обновляем компанию с правильным createdBy
      const updatedCompany = await tx.company.update({
        where: { id: company.id },
        data: { createdBy: user.id }
      });

      console.log('Компания обновлена');

      return { user, company: updatedCompany };
    });

    console.log('=== РЕГИСТРАЦИЯ УСПЕШНА ===');
    console.log('Пользователь:', email);
    console.log('Компания:', companyName);
    console.log('Company ID:', result.company.id);

    res.status(200).json({ 
      message: 'Регистрация успешна',
      email: email,
      company: companyName
    });
  } catch (error) {
    console.error('=== ОШИБКА РЕГИСТРАЦИИ ===');
    console.error('Ошибка при регистрации:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({ message: 'Ошибка при регистрации' });
  }
};

export const sendCode = async (req: Request, res: Response) => {
  try {
    const { email, mode } = req.body;

    if (!['register', 'reset'].includes(mode)) {
      return res.status(400).json({ message: 'Неверный режим отправки кода' });
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    if (mode === 'register' && user.isVerified) {
      return res.status(400).json({ message: 'Email уже подтвержден' });
    }

    const code = generateVerificationCode();

    await prisma.user.update({
      where: { email },
      data: {
        [mode === 'register' ? 'verificationCode' : 'resetPasswordCode']: code
      }
    });

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

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(400).json({ message: 'Пользователь не найден' });
    }

    const storedCode = mode === 'register' ? user.verificationCode : user.resetPasswordCode;
    if (!storedCode || storedCode !== code) {
      return res.status(400).json({ message: 'Неверный код' });
    }

    await prisma.user.update({
      where: { email },
      data: {
        isVerified: mode === 'register' ? true : user.isVerified,
        verificationCode: mode === 'register' ? null : user.verificationCode,
        resetPasswordCode: mode === 'reset' ? null : user.resetPasswordCode
      }
    });

    res.json({ message: mode === 'register' ? 'Email успешно подтвержден' : 'Код подтвержден' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при подтверждении' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Сначала проверяем пользователей (User)
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (user) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Неверный email или пароль' });
      }

      if (!user.isVerified) {
        return res.status(401).json({ message: 'Email не подтвержден' });
      }

      const token = jwt.sign(
        { userId: user.id, userType: 'user' },
        process.env.JWT_SECRET!,
        { expiresIn: '24h' }
      );

      console.log('=== УСПЕШНЫЙ ЛОГИН ПОЛЬЗОВАТЕЛЯ ===');
      console.log('User ID:', user.id);
      console.log('Email:', user.email);
      console.log('Role:', user.role);

      return res.json({ token });
    }

    // Если пользователь не найден, проверяем менеджеров (Manager)
    const manager = await prisma.manager.findUnique({
      where: { email }
    });
    
    if (!manager) {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }

    const isMatch = await bcrypt.compare(password, manager.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }

    const token = jwt.sign(
      { userId: manager.id, userType: 'manager' },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    console.log('=== УСПЕШНЫЙ ЛОГИН МЕНЕДЖЕРА ===');
    console.log('Manager ID:', manager.id);
    console.log('Email:', manager.email);
    console.log('Role:', manager.role);
    console.log('Company ID:', manager.companyId);

    res.json({ token });
  } catch (error) {
    console.error('Ошибка при входе:', error);
    res.status(500).json({ message: 'Ошибка при входе' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, newPassword } = req.body;

    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    if (user.resetPasswordCode) {
      return res.status(400).json({ message: 'Сначала подтвердите код сброса пароля' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword }
    });

    res.json({ message: 'Пароль успешно изменен' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при сбросе пароля' });
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Не авторизован' });
    }

    // Получаем токен и декодируем его для определения типа пользователя
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'Не авторизован' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    const userType = decoded.userType || 'user';

    if (userType === 'user') {
      // Ищем в таблице User
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          companyName: true,
          role: true,
          isVerified: true,
          createdAt: true,
          updatedAt: true,
          company: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        }
      });
      
      if (!user) {
        return res.status(404).json({ message: 'Пользователь не найден' });
      }

      console.log('=== ПОЛУЧЕН ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ ===');
      console.log('User ID:', user.id);
      console.log('Email:', user.email);
      console.log('Role:', user.role);

      res.json(user);
    } else if (userType === 'manager') {
      // Ищем в таблице Manager
      const manager = await prisma.manager.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          companyName: true,
          role: true,
          companyId: true,
          createdAt: true,
          updatedAt: true,
          company: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        }
      });
      
      if (!manager) {
        return res.status(404).json({ message: 'Менеджер не найден' });
      }

      console.log('=== ПОЛУЧЕН ПРОФИЛЬ МЕНЕДЖЕРА ===');
      console.log('Manager ID:', manager.id);
      console.log('Email:', manager.email);
      console.log('Role:', manager.role);
      console.log('Company ID:', manager.companyId);

      // Возвращаем данные в том же формате, что и для пользователей
      res.json({
        ...manager,
        isVerified: true // Менеджеры всегда считаются "подтвержденными"
      });
    } else {
      return res.status(401).json({ message: 'Недопустимый тип пользователя' });
    }
  } catch (error) {
    console.error('Ошибка при получении данных пользователя:', error);
    res.status(500).json({ message: 'Ошибка при получении данных пользователя' });
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Не авторизован' });
    }

    const { firstName, lastName, companyName } = req.body;

    // Валидация: проверяем что передан хотя бы один из допустимых полей
    if (!firstName && !lastName && !companyName) {
      return res.status(400).json({ 
        message: 'Необходимо указать хотя бы одно поле для обновления',
        allowed_fields: ['firstName', 'lastName', 'companyName']
      });
    }

    console.log('=== ОБНОВЛЕНИЕ ПРОФИЛЯ ПОЛЬЗОВАТЕЛЯ ===');
    console.log('User ID:', req.user.id);
    console.log('Updates:', { firstName, lastName, companyName });

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(companyName && { companyName })
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        companyName: true,
        role: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true
      }
    });

    console.log('Профиль успешно обновлен');

    res.json({
      message: 'Профиль успешно обновлен',
      user: updatedUser
    });
  } catch (error) {
    console.error('=== ОШИБКА ОБНОВЛЕНИЯ ПРОФИЛЯ ===');
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Ошибка при обновлении профиля' });
  }
};

export const changePassword = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Не авторизован' });
    }

    const { currentPassword, newPassword } = req.body;

    // Валидация обязательных полей
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        message: 'Текущий пароль и новый пароль обязательны',
        required_fields: ['currentPassword', 'newPassword']
      });
    }

    // Валидация длины нового пароля
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        message: 'Новый пароль должен содержать минимум 6 символов' 
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    console.log('=== СМЕНА ПАРОЛЯ ===');
    console.log('User ID:', req.user.id);

    // Проверка текущего пароля
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      console.log('Неверный текущий пароль');
      return res.status(400).json({ message: 'Неверный текущий пароль' });
    }

    // Хешируем новый пароль
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Устанавливаем новый пароль
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedNewPassword }
    });

    console.log('Пароль успешно изменен');

    res.json({ message: 'Пароль успешно изменен' });
  } catch (error) {
    console.error('=== ОШИБКА СМЕНЫ ПАРОЛЯ ===');
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Ошибка при смене пароля' });
  }
}; 