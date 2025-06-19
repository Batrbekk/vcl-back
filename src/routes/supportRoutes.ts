import express from 'express';
import { sendSupportTicket } from '../controllers/supportController';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Support
 *   description: Служба поддержки
 */

/**
 * @swagger
 * /api/support/ticket:
 *   post:
 *     summary: Отправить обращение в службу поддержки
 *     description: |
 *       Отправляет обращение клиента в службу поддержки VCL. 
 *       Письмо будет отправлено на email службы поддержки с полной информацией об обращении.
 *       
 *       Поддерживаемые типы проблем:
 *       - Техническая проблема
 *       - Вопрос по функционалу  
 *       - Проблема с оплатой
 *       - Предложение по улучшению
 *       - Другое
 *     tags: [Support]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - clientName
 *               - clientEmail
 *               - problemType
 *               - subject
 *               - description
 *             properties:
 *               clientName:
 *                 type: string
 *                 description: Имя клиента
 *                 example: "Иван Иванов"
 *               clientEmail:
 *                 type: string
 *                 format: email
 *                 description: Email клиента для обратной связи
 *                 example: "ivan@example.com"
 *               problemType:
 *                 type: string
 *                 enum: 
 *                   - "Техническая проблема"
 *                   - "Вопрос по функционалу"
 *                   - "Проблема с оплатой"
 *                   - "Предложение по улучшению"
 *                   - "Другое"
 *                 description: Тип проблемы или обращения
 *                 example: "Техническая проблема"
 *               subject:
 *                 type: string
 *                 description: Тема обращения
 *                 example: "Не работает загрузка файлов"
 *               description:
 *                 type: string
 *                 description: Подробное описание проблемы или вопроса
 *                 example: "При попытке загрузить PDF файл размером более 5МБ возникает ошибка. Браузер Chrome, версия 120."
 *     responses:
 *       200:
 *         description: Обращение успешно отправлено
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ваше обращение успешно отправлено в службу поддержки"
 *                 ticket_info:
 *                   type: object
 *                   properties:
 *                     client_name:
 *                       type: string
 *                       example: "Иван Иванов"
 *                     client_email:
 *                       type: string
 *                       example: "ivan@example.com"
 *                     problem_type:
 *                       type: string
 *                       example: "Техническая проблема"
 *                     subject:
 *                       type: string
 *                       example: "Не работает загрузка файлов"
 *                     submitted_at:
 *                       type: string
 *                       format: date-time
 *                     status:
 *                       type: string
 *                       example: "Отправлено"
 *       400:
 *         description: Ошибка валидации данных
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Все поля обязательны для заполнения"
 *                 required_fields:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["clientName", "clientEmail", "problemType", "subject", "description"]
 *       500:
 *         description: Внутренняя ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ошибка при отправке обращения в службу поддержки"
 *                 details:
 *                   type: string
 */
router.post('/ticket', sendSupportTicket);

export default router; 