import { Request, Response } from 'express';
import { Manager } from '../models/Manager';
import { User } from '../models/User';
import { sendManagerWelcomeEmail } from '../services/emailService';

// Создание менеджера
export const createManager = async (req: Request, res: Response) => {
  try {
    const { email, firstName, lastName, password } = req.body;
    const adminId = req.user!.userId;

    // Получаем данные админа для companyName
    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Администратор не найден' });
    }

    const existingManager = await Manager.findOne({ email });
    if (existingManager) {
      return res.status(400).json({ message: 'Менеджер с таким email уже существует' });
    }

    const manager = new Manager({
      email,
      firstName,
      lastName,
      companyName: admin.companyName,
      password,
      adminId
    });

    await manager.save();

    // Отправляем приветственное письмо
    await sendManagerWelcomeEmail({
      managerName: `${firstName} ${lastName}`,
      email,
      password,
      adminName: `${admin.firstName} ${admin.lastName}`,
      companyName: admin.companyName
    });

    res.status(201).json({
      message: 'Менеджер успешно создан',
      manager: {
        id: manager._id,
        email: manager.email,
        firstName: manager.firstName,
        lastName: manager.lastName,
        companyName: manager.companyName,
        role: manager.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при создании менеджера' });
  }
};

// Получение списка менеджеров
export const getManagers = async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const managers = await Manager.find({ adminId }).select('-password');
    res.json(managers);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при получении списка менеджеров' });
  }
};

// Получение менеджера по ID
export const getManagerById = async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const manager = await Manager.findOne({
      _id: req.params.id,
      adminId
    }).select('-password');

    if (!manager) {
      return res.status(404).json({ message: 'Менеджер не найден' });
    }
    res.json(manager);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при получении менеджера' });
  }
};

// Обновление менеджера
export const updateManager = async (req: Request, res: Response) => {
  try {
    const { email, firstName, lastName, password } = req.body;
    const adminId = req.user!.userId;
    const managerId = req.params.id;

    const manager = await Manager.findOne({ _id: managerId, adminId });
    if (!manager) {
      return res.status(404).json({ message: 'Менеджер не найден' });
    }

    if (email && email !== manager.email) {
      const existingManager = await Manager.findOne({ email });
      if (existingManager) {
        return res.status(400).json({ message: 'Менеджер с таким email уже существует' });
      }
      manager.email = email;
    }

    if (firstName) manager.firstName = firstName;
    if (lastName) manager.lastName = lastName;
    if (password) manager.password = password;

    await manager.save();

    res.json({
      message: 'Менеджер успешно обновлен',
      manager: {
        id: manager._id,
        email: manager.email,
        firstName: manager.firstName,
        lastName: manager.lastName,
        companyName: manager.companyName,
        role: manager.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при обновлении менеджера' });
  }
};

// Удаление менеджера
export const deleteManager = async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const manager = await Manager.findOneAndDelete({
      _id: req.params.id,
      adminId
    });

    if (!manager) {
      return res.status(404).json({ message: 'Менеджер не найден' });
    }
    res.json({ message: 'Менеджер успешно удален' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при удалении менеджера' });
  }
}; 