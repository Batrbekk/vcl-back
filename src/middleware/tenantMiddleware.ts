import { Response, NextFunction } from 'express';
import { prisma } from '../services/database';
import { AuthenticatedRequest, CustomRequest, AuthenticatedUser } from '../types';

export const tenantMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !req.user.companyId) {
      return res.status(401).json({ message: 'Не авторизован' });
    }

    // Получаем полную информацию о компании
    const company = await prisma.company.findUnique({
      where: { id: req.user.companyId },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        subscriptionStatus: true,
        subscriptionPlan: true,
        subscriptionExpiresAt: true
      }
    });

    if (!company || !company.isActive) {
      return res.status(403).json({ message: 'Компания неактивна или не найдена' });
    }

    // Проверяем статус подписки
    if (company.subscriptionStatus === 'expired' || company.subscriptionStatus === 'cancelled') {
      return res.status(403).json({ message: 'Подписка компании истекла' });
    }

    // Проверяем дату истечения подписки
    if (company.subscriptionExpiresAt && company.subscriptionExpiresAt < new Date()) {
      return res.status(403).json({ message: 'Подписка компании истекла' });
    }

    // Создаем полностью аутентифицированного пользователя
    const authenticatedUser: AuthenticatedUser = {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      isActive: req.user.isActive,
      companyId: company.id,
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug
      }
    };

    // Преобразуем запрос в CustomRequest
    (req as CustomRequest).user = authenticatedUser;
    next();
  } catch (error) {
    console.error('Tenant middleware error:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Middleware для проверки лимитов компании
export const checkCompanyLimits = (resourceType: 'agents' | 'managers' | 'phone_numbers') => {
  return async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.user.companyId) {
        return res.status(401).json({ message: 'Не авторизован' });
      }

      const company = await prisma.company.findUnique({
        where: { id: req.user.companyId },
        select: {
          id: true,
          maxAgents: true,
          maxManagers: true,
          maxPhoneNumbers: true,
                  _count: {
          select: {
            agents: true,
            managers: true,
            phoneNumbers: true
          }
        }
        }
      });

      if (!company) {
        return res.status(404).json({ message: 'Компания не найдена' });
      }

      let currentCount = 0;
      let limit = 0;

      switch (resourceType) {
        case 'agents':
          currentCount = company._count.agents;
          limit = company.maxAgents;
          break;
        case 'managers':
          currentCount = company._count.managers;
          limit = company.maxManagers;
          break;
        case 'phone_numbers':
          currentCount = company._count.phoneNumbers;
          limit = company.maxPhoneNumbers;
          break;
      }

      if (currentCount >= limit) {
        return res.status(403).json({ 
          message: `Достигнут лимит на количество ${resourceType} для вашего тарифа`,
          limit,
          current: currentCount
        });
      }

      next();
    } catch (error) {
      console.error('Company limits middleware error:', error);
      res.status(500).json({ message: 'Ошибка сервера' });
    }
  };
}; 