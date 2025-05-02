import express from 'express';
import {
  createManager,
  getManagers,
  getManagerById,
  updateManager,
  deleteManager
} from '../controllers/managerController';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminMiddleware } from '../middleware/adminMiddleware';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Managers
 *   description: Управление менеджерами (только для администраторов)
 */

/**
 * @swagger
 * /api/managers:
 *   post:
 *     tags: [Managers]
 *     summary: Создание нового менеджера
 *     description: |
 *       Создание нового менеджера (только для администраторов). 
 *       CompanyName будет автоматически установлен из данных администратора.
 *       
 *       После успешного создания менеджера, на указанный email будет отправлено приветственное письмо содержащее:
 *       - Данные для входа (email и пароль)
 *       - Ссылку на систему
 *       - Информацию об администраторе
 *       - Название компании
 *     security:
 *       - bearerAuth: []
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
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: manager@example.com
 *               firstName:
 *                 type: string
 *                 example: Петр
 *               lastName:
 *                 type: string
 *                 example: Петров
 *               password:
 *                 type: string
 *                 format: password
 *                 example: password123
 *     responses:
 *       201:
 *         description: Менеджер успешно создан и приветственное письмо отправлено
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Менеджер успешно создан
 *                 manager:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: 507f1f77bcf86cd799439011
 *                     email:
 *                       type: string
 *                       format: email
 *                       example: manager@example.com
 *                     firstName:
 *                       type: string
 *                       example: Петр
 *                     lastName:
 *                       type: string
 *                       example: Петров
 *                     companyName:
 *                       type: string
 *                       example: ООО Ромашка
 *                     role:
 *                       type: string
 *                       example: manager
 *       400:
 *         description: Ошибка валидации или менеджер с таким email уже существует
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Менеджер с таким email уже существует
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 *       404:
 *         description: Администратор не найден
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.post('/', [authMiddleware, adminMiddleware], createManager);

/**
 * @swagger
 * /api/managers:
 *   get:
 *     tags: [Managers]
 *     summary: Получение списка менеджеров
 *     description: Получение списка всех менеджеров, созданных текущим администратором
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список менеджеров
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get('/', [authMiddleware, adminMiddleware], getManagers);

/**
 * @swagger
 * /api/managers/{id}:
 *   get:
 *     tags: [Managers]
 *     summary: Получение менеджера по ID
 *     description: Получение данных конкретного менеджера по ID (только для создавшего его администратора)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Данные менеджера
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 *       404:
 *         description: Менеджер не найден
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get('/:id', [authMiddleware, adminMiddleware], getManagerById);

/**
 * @swagger
 * /api/managers/{id}:
 *   put:
 *     tags: [Managers]
 *     summary: Обновление менеджера
 *     description: Обновление данных менеджера (только для создавшего его администратора). CompanyName нельзя изменить.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: manager@example.com
 *               firstName:
 *                 type: string
 *                 example: Петр
 *               lastName:
 *                 type: string
 *                 example: Петров
 *               password:
 *                 type: string
 *                 format: password
 *                 example: newpassword123
 *     responses:
 *       200:
 *         description: Менеджер успешно обновлен
 *       400:
 *         description: Ошибка валидации
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 *       404:
 *         description: Менеджер не найден
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.put('/:id', [authMiddleware, adminMiddleware], updateManager);

/**
 * @swagger
 * /api/managers/{id}:
 *   delete:
 *     tags: [Managers]
 *     summary: Удаление менеджера
 *     description: Удаление менеджера по ID (только для создавшего его администратора)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Менеджер успешно удален
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 *       404:
 *         description: Менеджер не найден
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.delete('/:id', [authMiddleware, adminMiddleware], deleteManager);

export default router; 