import express from 'express';
import { getPhoneNumbers, deletePhoneNumber, createPhoneNumber, getPhoneNumberById } from '../controllers/phoneController';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminMiddleware } from '../middleware/adminMiddleware';
import { tenantMiddleware } from '../middleware/tenantMiddleware';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Phone
 *   description: Управление телефонными номерами (только для администраторов)
 */

/**
 * @swagger
 * /api/phone/numbers:
 *   get:
 *     tags: [Phone]
 *     summary: Получение списка телефонных номеров
 *     description: Возвращает список всех телефонных номеров компании
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список телефонных номеров успешно получен
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 *       500:
 *         description: Ошибка сервера
 */
router.get('/numbers', [authMiddleware, adminMiddleware, tenantMiddleware], getPhoneNumbers);

/**
 * @swagger
 * /api/phone/numbers:
 *   post:
 *     tags: [Phone]
 *     summary: Создание нового телефонного номера
 *     description: Создает новый телефонный номер для компании
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone_number
 *               - label
 *               - provider
 *             properties:
 *               phone_number:
 *                 type: string
 *                 description: Номер телефона
 *                 example: '+1234567890'
 *               label:
 *                 type: string
 *                 description: Метка для номера
 *                 example: 'Основной номер'
 *               provider:
 *                 type: string
 *                 enum: [twilio, sip_trunk]
 *                 description: Провайдер телефонии
 *                 example: 'twilio'
 *               sid:
 *                 type: string
 *                 description: SID для Twilio (обязательно для provider=twilio)
 *               token:
 *                 type: string
 *                 description: Token для Twilio (обязательно для provider=twilio)
 *               termination_uri:
 *                 type: string
 *                 description: URI для SIP Trunk (обязательно для provider=sip_trunk)
 *               credentials:
 *                 type: object
 *                 description: Учетные данные для SIP Trunk
 *                 properties:
 *                   username:
 *                     type: string
 *                   password:
 *                     type: string
 *               media_encryption:
 *                 type: string
 *                 description: Шифрование медиа для SIP Trunk
 *               headers:
 *                 type: object
 *                 description: Заголовки для SIP Trunk
 *               address:
 *                 type: string
 *                 description: Адрес для SIP Trunk
 *               transport:
 *                 type: string
 *                 description: Транспорт для SIP Trunk
 *     responses:
 *       201:
 *         description: Телефонный номер успешно создан
 *       400:
 *         description: Неверные данные запроса
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 *       500:
 *         description: Ошибка сервера
 */
router.post('/numbers', [authMiddleware, adminMiddleware], createPhoneNumber);

/**
 * @swagger
 * /api/phone/numbers/{phoneNumberId}:
 *   get:
 *     tags: [Phone]
 *     summary: Получение телефонного номера по ID
 *     description: Возвращает информацию о конкретном телефонном номере
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: phoneNumberId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID телефонного номера
 *     responses:
 *       200:
 *         description: Телефонный номер найден
 *       404:
 *         description: Телефонный номер не найден
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 *       500:
 *         description: Ошибка сервера
 */
router.get('/numbers/:phoneNumberId', [authMiddleware, adminMiddleware], getPhoneNumberById);

/**
 * @swagger
 * /api/phone/numbers/{phoneNumberId}:
 *   delete:
 *     tags: [Phone]
 *     summary: Удаление телефонного номера
 *     description: Удаляет телефонный номер из системы
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: phoneNumberId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID телефонного номера
 *     responses:
 *       200:
 *         description: Телефонный номер успешно удален
 *       404:
 *         description: Телефонный номер не найден
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Нет прав доступа
 *       500:
 *         description: Ошибка сервера
 */
router.delete('/numbers/:phoneNumberId', [authMiddleware, adminMiddleware], deletePhoneNumber);

export default router; 