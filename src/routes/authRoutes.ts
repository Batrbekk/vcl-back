import express from 'express';
import {
  register,
  verifyEmail,
  login,
  sendCode,
  resetPassword,
  getMe,
  updateProfile,
  changePassword
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

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     tags: [Auth]
 *     summary: Обновление профиля пользователя
 *     description: |
 *       Обновляет профиль текущего авторизованного пользователя.
 *       Пользователь может изменить только имя, фамилию и название компании.
 *       Email и пароль изменяются через отдельные endpoints.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 description: Имя пользователя
 *                 example: "Иван"
 *               lastName:
 *                 type: string
 *                 description: Фамилия пользователя
 *                 example: "Иванов"
 *               companyName:
 *                 type: string
 *                 description: Название компании
 *                 example: "ООО Новая Компания"
 *           examples:
 *             full_update:
 *               summary: Обновление всех полей
 *               value:
 *                 firstName: "Иван"
 *                 lastName: "Петров"
 *                 companyName: "ООО Новая Компания"
 *             partial_update:
 *               summary: Частичное обновление
 *               value:
 *                 firstName: "Петр"
 *                 companyName: "ИП Петров"
 *     responses:
 *       200:
 *         description: Профиль успешно обновлен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Профиль успешно обновлен"
 *                 user:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "507f1f77bcf86cd799439011"
 *                     email:
 *                       type: string
 *                       format: email
 *                       example: "user@example.com"
 *                     firstName:
 *                       type: string
 *                       example: "Иван"
 *                     lastName:
 *                       type: string
 *                       example: "Петров"
 *                     companyName:
 *                       type: string
 *                       example: "ООО Новая Компания"
 *                     role:
 *                       type: string
 *                       example: "admin"
 *                     isVerified:
 *                       type: boolean
 *                       example: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Ошибка валидации - не переданы поля для обновления
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Необходимо указать хотя бы одно поле для обновления"
 *                 allowed_fields:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["firstName", "lastName", "companyName"]
 *       401:
 *         description: Не авторизован
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Не авторизован"
 *       404:
 *         description: Пользователь не найден
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Пользователь не найден"
 *       500:
 *         description: Внутренняя ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ошибка при обновлении профиля"
 */
router.put('/profile', authMiddleware, updateProfile);

/**
 * @swagger
 * /api/auth/change-password:
 *   put:
 *     tags: [Auth]
 *     summary: Смена пароля авторизованным пользователем
 *     description: |
 *       Позволяет авторизованному пользователю сменить свой пароль.
 *       Требует ввод текущего пароля для подтверждения.
 *       Отличается от reset-password тем, что требует авторизации и знания текущего пароля.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *                 description: Текущий пароль пользователя
 *                 example: "oldpassword123"
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 description: Новый пароль (минимум 6 символов)
 *                 example: "newpassword123"
 *           example:
 *             currentPassword: "oldpassword123"
 *             newPassword: "newpassword123"
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
 *                   example: "Пароль успешно изменен"
 *                 changed_at:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-01-15T10:30:00.000Z"
 *       400:
 *         description: Ошибка валидации
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Текущий пароль и новый пароль обязательны"
 *                     required_fields:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["currentPassword", "newPassword"]
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Неверный текущий пароль"
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Новый пароль должен содержать минимум 6 символов"
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Новый пароль должен отличаться от текущего"
 *       401:
 *         description: Не авторизован
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Не авторизован"
 *       404:
 *         description: Пользователь не найден
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Пользователь не найден"
 *       500:
 *         description: Внутренняя ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ошибка при смене пароля"
 */
router.put('/change-password', authMiddleware, changePassword);

export default router; 