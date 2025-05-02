import express from 'express';
import {
  register,
  verifyEmail,
  login,
  sendCode,
  resetPassword,
  getMe
} from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';
import { guestMiddleware } from '../middleware/guestMiddleware';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Маршруты аутентификации и авторизации
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Регистрация нового пользователя
 *     description: Регистрация нового пользователя. После регистрации на email придет код подтверждения.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - firstName
 *               - lastName
 *               - companyName
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               firstName:
 *                 type: string
 *                 example: Иван
 *               lastName:
 *                 type: string
 *                 example: Иванов
 *               companyName:
 *                 type: string
 *                 example: ООО Ромашка
 *               password:
 *                 type: string
 *                 format: password
 *                 example: password123
 *     responses:
 *       201:
 *         description: Успешная регистрация
 *       400:
 *         description: Ошибка валидации
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.post('/register', guestMiddleware, register);

/**
 * @swagger
 * /api/auth/verify-email:
 *   post:
 *     tags: [Auth]
 *     summary: Подтверждение email
 *     description: Подтверждение email или кода сброса пароля
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - code
 *               - mode
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               code:
 *                 type: string
 *               mode:
 *                 type: string
 *                 enum: [register, reset]
 *     responses:
 *       200:
 *         description: Email успешно подтвержден
 *       400:
 *         description: Неверный код
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.post('/verify-email', guestMiddleware, verifyEmail);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Вход в систему
 *     description: Вход в систему с получением JWT токена
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Успешный вход
 *       401:
 *         description: Неверные учетные данные
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.post('/login', guestMiddleware, login);

/**
 * @swagger
 * /api/auth/send-code:
 *   post:
 *     tags: [Auth]
 *     summary: Отправка кода
 *     description: Отправка кода подтверждения или сброса пароля
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - mode
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               mode:
 *                 type: string
 *                 enum: [register, reset]
 *     responses:
 *       200:
 *         description: Код отправлен
 *       400:
 *         description: Ошибка отправки кода
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.post('/send-code', guestMiddleware, sendCode);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Сброс пароля
 *     description: Сброс пароля пользователя
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Пароль успешно сброшен
 *       400:
 *         description: Ошибка сброса пароля
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.post('/reset-password', guestMiddleware, resetPassword);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Получение профиля
 *     description: Получение данных текущего пользователя
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Данные пользователя
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get('/me', authMiddleware, getMe);

export default router; 