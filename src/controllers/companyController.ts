import { Request, Response } from 'express';
import { prisma } from '../services/database';
import { AuthenticatedRequest } from '../types';

// Получение информации о компании
export const getCompanyInfo = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        createdByUser: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    if (!company) {
      return res.status(404).json({ message: 'Компания не найдена' });
    }

    // Получаем статистику компании
    const [agentCount, managerCount, userCount] = await Promise.all([
      prisma.agent.count({ where: { companyId } }),
      prisma.manager.count({ where: { companyId } }),
      prisma.user.count({ where: { companyId } })
    ]);

    const stats = {
      total_agents: agentCount,
      total_managers: managerCount,
      total_users: userCount
    };

    res.json({
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        settings: {
          timezone: company.timezone,
          currency: company.currency,
          language: company.language
        },
        subscription: {
          plan: company.subscriptionPlan,
          status: company.subscriptionStatus,
          expiresAt: company.subscriptionExpiresAt
        },
        limits: {
          max_agents: company.maxAgents,
          max_phone_numbers: company.maxPhoneNumbers,
          max_managers: company.maxManagers,
          max_monthly_calls: company.maxMonthlyCalls
        },
        isActive: company.isActive,
        createdBy: company.createdByUser,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt
      },
      stats
    });
  } catch (error) {
    console.error('Error getting company info:', error);
    res.status(500).json({ message: 'Ошибка при получении информации о компании' });
  }
};

// Обновление настроек компании
export const updateCompanySettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { settings } = req.body;

    if (!settings) {
      return res.status(400).json({ message: 'Настройки обязательны' });
    }

    const updateData: any = {};
    if (settings.timezone) updateData.timezone = settings.timezone;
    if (settings.currency) updateData.currency = settings.currency;
    if (settings.language) updateData.language = settings.language;

    const updatedCompany = await prisma.company.update({
      where: { id: companyId },
      data: updateData
    });

    res.json({
      message: 'Настройки компании обновлены',
      settings: {
        timezone: updatedCompany.timezone,
        currency: updatedCompany.currency,
        language: updatedCompany.language
      }
    });
  } catch (error) {
    console.error('Error updating company settings:', error);
    res.status(500).json({ message: 'Ошибка при обновлении настроек компании' });
  }
};

// Получение статистики использования
export const getCompanyUsage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;

    const company = await prisma.company.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      return res.status(404).json({ message: 'Компания не найдена' });
    }

    const [agentCount, managerCount, userCount] = await Promise.all([
      prisma.agent.count({ where: { companyId } }),
      prisma.manager.count({ where: { companyId } }),
      prisma.user.count({ where: { companyId } })
    ]);

    const usage = {
      agents: {
        current: agentCount,
        limit: company.maxAgents
      },
      managers: {
        current: managerCount,
        limit: company.maxManagers
      },
      users: {
        current: userCount,
        limit: null // Нет лимита на пользователей
      }
    };

    res.json({
      usage,
      subscription: {
        plan: company.subscriptionPlan,
        status: company.subscriptionStatus,
        expiresAt: company.subscriptionExpiresAt
      },
      limits: {
        max_agents: company.maxAgents,
        max_phone_numbers: company.maxPhoneNumbers,
        max_managers: company.maxManagers,
        max_monthly_calls: company.maxMonthlyCalls
      }
    });
  } catch (error) {
    console.error('Error getting company usage:', error);
    res.status(500).json({ message: 'Ошибка при получении статистики использования' });
  }
};

// Обновление лимитов компании (только для суперадминов)
export const updateCompanyLimits = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { limits } = req.body;

    if (!limits) {
      return res.status(400).json({ message: 'Лимиты обязательны' });
    }

    const updateData: any = {};
    if (limits.max_agents) updateData.maxAgents = limits.max_agents;
    if (limits.max_phone_numbers) updateData.maxPhoneNumbers = limits.max_phone_numbers;
    if (limits.max_managers) updateData.maxManagers = limits.max_managers;
    if (limits.max_monthly_calls) updateData.maxMonthlyCalls = limits.max_monthly_calls;

    const updatedCompany = await prisma.company.update({
      where: { id: companyId },
      data: updateData
    });

    res.json({
      message: 'Лимиты компании обновлены',
      limits: {
        max_agents: updatedCompany.maxAgents,
        max_phone_numbers: updatedCompany.maxPhoneNumbers,
        max_managers: updatedCompany.maxManagers,
        max_monthly_calls: updatedCompany.maxMonthlyCalls
      }
    });
  } catch (error) {
    console.error('Error updating company limits:', error);
    res.status(500).json({ message: 'Ошибка при обновлении лимитов компании' });
  }
};

// Получение списка пользователей компании
export const getCompanyUsers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;

    const [users, managers] = await Promise.all([
      prisma.user.findMany({
        where: { companyId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          isVerified: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.manager.findMany({
        where: { companyId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    res.json({
      users,
      managers,
      total: users.length + managers.length
    });
  } catch (error) {
    console.error('Error getting company users:', error);
    res.status(500).json({ message: 'Ошибка при получении списка пользователей' });
  }
}; 