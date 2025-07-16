import express from 'express';
import {
  getCompanyInfo,
  updateCompanySettings,
  getCompanyUsage,
  updateCompanyLimits,
  getCompanyUsers
} from '../controllers/companyController';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminMiddleware } from '../middleware/adminMiddleware';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Company
 *   description: Управление компанией
 */

/**
 * @swagger
 * /api/company/info:
 *   get:
 *     tags: [Company]
 *     summary: Получение информации о компании
 *     description: Получение детальной информации о компании текущего пользователя
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Информация о компании
 *       401:
 *         description: Не авторизован
 *       404:
 *         description: Компания не найдена
 */
router.get('/info', authMiddleware, getCompanyInfo);

/**
 * @swagger
 * /api/company/settings:
 *   put:
 *     tags: [Company]
 *     summary: Обновление настроек компании
 *     description: Обновление настроек компании
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               settings:
 *                 type: object
 *                 properties:
 *                   timezone:
 *                     type: string
 *                     example: UTC
 *                   currency:
 *                     type: string
 *                     example: USD
 *                   language:
 *                     type: string
 *                     example: ru
 *     responses:
 *       200:
 *         description: Настройки обновлены
 *       401:
 *         description: Не авторизован
 */
router.put('/settings', authMiddleware, updateCompanySettings);

/**
 * @swagger
 * /api/company/usage:
 *   get:
 *     tags: [Company]
 *     summary: Получение статистики использования
 *     description: Получение статистики использования ресурсов компании
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Статистика использования
 *       401:
 *         description: Не авторизован
 */
router.get('/usage', authMiddleware, getCompanyUsage);

/**
 * @swagger
 * /api/company/limits:
 *   put:
 *     tags: [Company]
 *     summary: Обновление лимитов компании
 *     description: Обновление лимитов компании (только для администраторов)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               limits:
 *                 type: object
 *                 properties:
 *                   max_agents:
 *                     type: integer
 *                     example: 10
 *                   max_phone_numbers:
 *                     type: integer
 *                     example: 5
 *                   max_managers:
 *                     type: integer
 *                     example: 3
 *                   max_monthly_calls:
 *                     type: integer
 *                     example: 1000
 *     responses:
 *       200:
 *         description: Лимиты обновлены
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 */
router.put('/limits', authMiddleware, adminMiddleware, updateCompanyLimits);

/**
 * @swagger
 * /api/company/users:
 *   get:
 *     tags: [Company]
 *     summary: Получение списка пользователей компании
 *     description: Получение списка всех пользователей и менеджеров компании
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список пользователей
 *       401:
 *         description: Не авторизован
 */
router.get('/users', authMiddleware, getCompanyUsers);

export default router; 