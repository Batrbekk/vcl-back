import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../services/database';
import { sendManagerWelcomeEmail } from '../services/emailService';
import { CustomRequest } from '../types';

// Создание менеджера
export const createManager = async (req: CustomRequest, res: Response) => {
  try {
    const { email, firstName, lastName, password } = req.body;
    const adminId = req.user!.id;
    const companyId = req.user!.companyId;

    // Получаем данные админа и компании
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { id: true, firstName: true, lastName: true, email: true }
    });
    
    if (!admin) {
      return res.status(404).json({ message: 'Администратор не найден' });
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { 
        id: true, 
        name: true, 
        maxManagers: true, 
        _count: { select: { managers: true } } 
      }
    });
    
    if (!company) {
      return res.status(404).json({ message: 'Компания не найдена' });
    }

    // Проверяем лимит менеджеров
    const currentManagersCount = company._count.managers;
    if (currentManagersCount >= company.maxManagers) {
      return res.status(403).json({
        message: 'Достигнут лимит менеджеров для вашего плана',
        current: currentManagersCount,
        limit: company.maxManagers
      });
    }

    // Проверяем уникальность email в рамках компании
    const existingManager = await prisma.manager.findFirst({
      where: { 
        email, 
        companyId 
      }
    });
    
    if (existingManager) {
      return res.status(400).json({ message: 'Менеджер с таким email уже существует в компании' });
    }

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создаем менеджера
    const manager = await prisma.manager.create({
      data: {
        email,
        firstName,
        lastName,
        companyName: company.name,
        password: hashedPassword,
        adminId,
        companyId
      }
    });

    console.log('=== МЕНЕДЖЕР СОЗДАН ===');
    console.log('Manager ID:', manager.id);
    console.log('Email:', manager.email);
    console.log('Company:', company.name);

    // Отправляем приветственное письмо
    await sendManagerWelcomeEmail({
      managerName: `${firstName} ${lastName}`,
      email,
      password,
      adminName: `${admin.firstName} ${admin.lastName}`,
      companyName: company.name
    });

    res.status(201).json({
      message: 'Менеджер успешно создан',
      manager: {
        id: manager.id,
        email: manager.email,
        firstName: manager.firstName,
        lastName: manager.lastName,
        companyName: manager.companyName,
        role: manager.role,
        createdAt: manager.createdAt
      }
    });
  } catch (error) {
    console.error('Ошибка при создании менеджера:', error);
    res.status(500).json({ message: 'Ошибка при создании менеджера' });
  }
};

// Получение списка менеджеров
export const getManagers = async (req: CustomRequest, res: Response) => {
  try {
    const adminId = req.user!.id;
    const companyId = req.user!.companyId;
    
    console.log(`[Company ${companyId}] Fetching managers for admin: ${adminId}`);
    
    const managers = await prisma.manager.findMany({
      where: { 
        adminId, 
        companyId 
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        companyName: true,
        role: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`[Company ${companyId}] Found ${managers.length} managers`);
    
    res.json({
      success: true,
      data: managers,
      count: managers.length
    });
  } catch (error) {
    console.error('Ошибка при получении списка менеджеров:', error);
    res.status(500).json({ message: 'Ошибка при получении списка менеджеров' });
  }
};

// Получение менеджера по ID
export const getManagerById = async (req: CustomRequest, res: Response) => {
  try {
    const adminId = req.user!.id;
    const companyId = req.user!.companyId;
    const { id } = req.params;
    
    console.log(`[Company ${companyId}] Fetching manager: ${id}`);
    
    const manager = await prisma.manager.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        companyName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        adminId: true,
        companyId: true
      }
    });

    if (!manager || manager.adminId !== adminId || manager.companyId !== companyId) {
      return res.status(404).json({ message: 'Менеджер не найден' });
    }

    console.log(`[Company ${companyId}] Manager found: ${manager.id}`);
    
    res.json({
      success: true,
      data: manager
    });
  } catch (error) {
    console.error('Ошибка при получении менеджера:', error);
    res.status(500).json({ message: 'Ошибка при получении менеджера' });
  }
};

// Обновление менеджера
export const updateManager = async (req: CustomRequest, res: Response) => {
  try {
    const { email, firstName, lastName, password } = req.body;
    const adminId = req.user!.id;
    const companyId = req.user!.companyId;
    const { id } = req.params;

    console.log(`[Company ${companyId}] Updating manager: ${id}`);

    // Проверяем существование менеджера
    const existingManager = await prisma.manager.findUnique({
      where: { id }
    });

    if (!existingManager || existingManager.adminId !== adminId || existingManager.companyId !== companyId) {
      return res.status(404).json({ message: 'Менеджер не найден' });
    }

    // Проверяем уникальность email если он изменился
    if (email && email !== existingManager.email) {
      const duplicateManager = await prisma.manager.findFirst({
        where: { 
          email, 
          companyId,
          NOT: { id }
        }
      });
      
      if (duplicateManager) {
        return res.status(400).json({ message: 'Менеджер с таким email уже существует в компании' });
      }
    }

    // Подготавливаем данные для обновления
    const updateData: any = {};
    if (email) updateData.email = email;
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Обновляем менеджера
    const updatedManager = await prisma.manager.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        companyName: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    console.log(`[Company ${companyId}] Manager updated successfully: ${updatedManager.id}`);

    res.json({
      message: 'Менеджер успешно обновлен',
      manager: updatedManager
    });
  } catch (error) {
    console.error('Ошибка при обновлении менеджера:', error);
    res.status(500).json({ message: 'Ошибка при обновлении менеджера' });
  }
};

// Удаление менеджера
export const deleteManager = async (req: CustomRequest, res: Response) => {
  try {
    const adminId = req.user!.id;
    const companyId = req.user!.companyId;
    const { id } = req.params;

    console.log(`[Company ${companyId}] Deleting manager: ${id}`);

    // Проверяем существование менеджера
    const existingManager = await prisma.manager.findUnique({
      where: { id }
    });

    if (!existingManager || existingManager.adminId !== adminId || existingManager.companyId !== companyId) {
      return res.status(404).json({ message: 'Менеджер не найден' });
    }

    // Удаляем менеджера
    await prisma.manager.delete({
      where: { id }
    });

    console.log(`[Company ${companyId}] Manager deleted successfully: ${id}`);

    res.json({
      message: 'Менеджер успешно удален'
    });
  } catch (error) {
    console.error('Ошибка при удалении менеджера:', error);
    res.status(500).json({ message: 'Ошибка при удалении менеджера' });
  }
}; 