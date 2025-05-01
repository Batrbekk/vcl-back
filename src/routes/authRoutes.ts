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
 * /api/auth/register:
 *   post:
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
 *     summary: Подтверждение email или кода сброса пароля
 *     description: Подтверждение email при регистрации или кода для сброса пароля
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
 *                 example: user@example.com
 *               code:
 *                 type: string
 *                 example: "123456"
 *               mode:
 *                 type: string
 *                 enum: [register, reset]
 *                 example: register
 *     responses:
 *       200:
 *         description: Код успешно подтвержден
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Email успешно подтвержден
 *       400:
 *         description: Неверный код или режим
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Неверный код
 *       500:
 *         description: Внутренняя ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Ошибка при подтверждении
 */
router.post('/verify-email', guestMiddleware, verifyEmail);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Вход в систему
 *     description: Вход в систему. Возвращает JWT токен для авторизации.
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
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: password123
 *     responses:
 *       200:
 *         description: Успешный вход
 *       401:
 *         description: Ошибка авторизации
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.post('/login', guestMiddleware, login);

/**
 * @swagger
 * /api/auth/send-code:
 *   post:
 *     summary: Отправка кода подтверждения или сброса пароля
 *     description: Отправка кода на email пользователя для подтверждения регистрации или сброса пароля
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
 *                 example: user@example.com
 *               mode:
 *                 type: string
 *                 enum: [register, reset]
 *                 example: register
 *     responses:
 *       200:
 *         description: Код отправлен
 *       400:
 *         description: Неверный режим или email уже подтвержден
 *       404:
 *         description: Пользователь не найден
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.post('/send-code', guestMiddleware, sendCode);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Сброс пароля
 *     description: Сброс пароля после подтверждения кода
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
 *                 example: user@example.com
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 example: newpassword123
 *     responses:
 *       200:
 *         description: Пароль успешно изменен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Пароль успешно изменен
 *       400:
 *         description: Необходимо подтвердить код сброса пароля
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Сначала подтвердите код сброса пароля
 *       404:
 *         description: Пользователь не найден
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Пользователь не найден
 *       500:
 *         description: Внутренняя ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Ошибка при сбросе пароля
 */
router.post('/reset-password', guestMiddleware, resetPassword);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Получение данных пользователя
 *     description: Получение данных текущего авторизованного пользователя.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Успешное получение данных
 *       401:
 *         description: Ошибка авторизации
 *       404:
 *         description: Пользователь не найден
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get('/me', authMiddleware, getMe);

export default router; 