import express from 'express';
import { getPhoneNumbers, deletePhoneNumber, createPhoneNumber, getPhoneNumberById, assignAgentToPhoneNumber, makeSipTrunkOutboundCall, makeTwilioOutboundCall, getBatchCalls, getBatchCallById, cancelBatchCall, createBatchCall } from '../controllers/phoneController';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminMiddleware } from '../middleware/adminMiddleware';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Phone
 *   description: Управление телефонными номерами
 */

/**
 * @swagger
 * /api/phone/numbers:
 *   get:
 *     summary: Получить список телефонных номеров
 *     description: Получает список всех телефонных номеров, включая информацию о провайдере и назначенных агентах
 *     tags: [Phone]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список телефонных номеров
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   phone_number:
 *                     type: string
 *                     description: Телефонный номер
 *                     example: "+77273124531"
 *                   label:
 *                     type: string
 *                     description: Метка/название номера
 *                     example: "Test"
 *                   phone_number_id:
 *                     type: string
 *                     description: Уникальный ID номера
 *                     example: "phnum_01jy316neqebrs2yqeya27h8gk"
 *                   assigned_agent:
 *                     type: string
 *                     nullable: true
 *                     description: ID назначенного агента
 *                     example: null
 *                   provider:
 *                     type: string
 *                     description: Провайдер телефонии
 *                     example: "sip_trunk"
 *                   provider_config:
 *                     type: object
 *                     description: Конфигурация провайдера
 *                     properties:
 *                       address:
 *                         type: string
 *                         example: "https://alsan.vpbx.ftel.kz/crmapi/v1"
 *                       transport:
 *                         type: string
 *                         example: "udp"
 *                       media_encryption:
 *                         type: string
 *                         example: "allowed"
 *                       headers:
 *                         type: object
 *                         properties:
 *                           X-API-KEY:
 *                             type: string
 *                             example: "00618a1f-95a9-41d0-8526-ddc251c9cd29"
 *                       has_auth_credentials:
 *                         type: boolean
 *                         example: true
 *                       username:
 *                         type: string
 *                         example: "3124531"
 *                       has_outbound_trunk:
 *                         type: boolean
 *                         example: true
 *       401:
 *         description: Неавторизован
 *       403:
 *         description: Нет прав доступа
 *       404:
 *         description: Администратор не найден
 *       500:
 *         description: Внутренняя ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ошибка при получении списка телефонных номеров"
 *                 details:
 *                   type: string
 */
router.get('/numbers', [authMiddleware, adminMiddleware], getPhoneNumbers);

/**
 * @swagger
 * /api/phone/numbers:
 *   post:
 *     summary: Создать телефонный номер
 *     description: Создает новый телефонный номер в ElevenLabs с поддержкой провайдеров Twilio и SIP trunk
 *     tags: [Phone]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 title: Twilio Provider
 *                 required:
 *                   - phone_number
 *                   - label
 *                   - sid
 *                   - token
 *                   - provider
 *                 properties:
 *                   phone_number:
 *                     type: string
 *                     description: Телефонный номер в международном формате
 *                     example: "+1234567890"
 *                   label:
 *                     type: string
 *                     description: Метка/название номера
 *                     example: "Основной номер поддержки"
 *                   sid:
 *                     type: string
 *                     description: Twilio Account SID
 *                     example: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
 *                   token:
 *                     type: string
 *                     description: Twilio Auth Token
 *                     example: "your_twilio_auth_token"
 *                   provider:
 *                     type: string
 *                     enum: [twilio]
 *                     example: "twilio"
 *               - type: object
 *                 title: SIP Trunk Provider
 *                 required:
 *                   - phone_number
 *                   - label
 *                   - termination_uri
 *                   - provider
 *                   - credentials
 *                   - media_encryption
 *                   - address
 *                   - transport
 *                 properties:
 *                   phone_number:
 *                     type: string
 *                     description: Телефонный номер в международном формате
 *                     example: "+77273124531"
 *                   label:
 *                     type: string
 *                     description: Метка/название номера
 *                     example: "Казахстанский номер"
 *                   termination_uri:
 *                     type: string
 *                     description: URI для завершения вызовов
 *                     example: "sip:3124531@alsan.vpbx.ftel.kz"
 *                   provider:
 *                     type: string
 *                     enum: [sip_trunk]
 *                     example: "sip_trunk"
 *                   credentials:
 *                     type: object
 *                     required:
 *                       - username
 *                       - password
 *                     properties:
 *                       username:
 *                         type: string
 *                         description: Имя пользователя SIP
 *                         example: "3124531"
 *                       password:
 *                         type: string
 *                         description: Пароль SIP
 *                         example: "sip_password"
 *                   media_encryption:
 *                     type: string
 *                     description: Тип шифрования медиа
 *                     example: "allowed"
 *                   headers:
 *                     type: object
 *                     description: Дополнительные заголовки SIP
 *                     additionalProperties:
 *                       type: string
 *                     example:
 *                       X-API-KEY: "00618a1f-95a9-41d0-8526-ddc251c9cd29"
 *                   address:
 *                     type: string
 *                     description: Адрес SIP сервера
 *                     example: "https://alsan.vpbx.ftel.kz/crmapi/v1"
 *                   transport:
 *                     type: string
 *                     description: Протокол транспорта
 *                     example: "udp"
 *           examples:
 *             twilio:
 *               summary: Пример для Twilio
 *               value:
 *                 phone_number: "+1234567890"
 *                 label: "Основной номер поддержки"
 *                 sid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
 *                 token: "your_twilio_auth_token"
 *                 provider: "twilio"
 *             sip_trunk:
 *               summary: Пример для SIP trunk
 *               value:
 *                 phone_number: "+77273124531"
 *                 label: "Казахстанский номер"
 *                 termination_uri: "sip:3124531@alsan.vpbx.ftel.kz"
 *                 provider: "sip_trunk"
 *                 credentials:
 *                   username: "3124531"
 *                   password: "sip_password"
 *                 media_encryption: "allowed"
 *                 headers:
 *                   X-API-KEY: "00618a1f-95a9-41d0-8526-ddc251c9cd29"
 *                 address: "https://alsan.vpbx.ftel.kz/crmapi/v1"
 *                 transport: "udp"
 *     responses:
 *       201:
 *         description: Телефонный номер успешно создан
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Телефонный номер успешно создан"
 *                 phone_number_id:
 *                   type: string
 *                   example: "phnum_01jy316neqebrs2yqeya27h8gk"
 *                 provider:
 *                   type: string
 *                   example: "sip_trunk"
 *                 phone_number:
 *                   type: string
 *                   example: "+77273124531"
 *                 label:
 *                   type: string
 *                   example: "Казахстанский номер"
 *       400:
 *         description: Неверный запрос
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   examples:
 *                     - "Обязательные поля: phone_number, label, provider"
 *                     - "Провайдер должен быть twilio или sip_trunk"
 *                     - "Для Twilio обязательны поля: sid, token"
 *                     - "Для SIP trunk обязательны поля: termination_uri, credentials, media_encryption, address, transport"
 *       401:
 *         description: Неавторизован
 *       403:
 *         description: Нет прав доступа
 *       404:
 *         description: Администратор не найден
 *       422:
 *         description: Ошибка валидации данных
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ошибка валидации данных: Неверные данные для создания номера"
 *       500:
 *         description: Внутренняя ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ошибка при создании телефонного номера"
 *                 details:
 *                   type: string
 */
router.post('/numbers', [authMiddleware, adminMiddleware], createPhoneNumber);

/**
 * @swagger
 * /api/phone/numbers/{phoneNumberId}:
 *   get:
 *     summary: Получить телефонный номер по ID
 *     description: Получает детальную информацию о телефонном номере по его ID, включая конфигурацию провайдера и информацию о назначенном агенте. Примечание - поле provider_config доступно только для SIP trunk, для Twilio оно отсутствует
 *     tags: [Phone]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: phoneNumberId
 *         required: true
 *         description: ID телефонного номера
 *         schema:
 *           type: string
 *           example: "phnum_01jy39yp7tef3b40pcwaz0v83y"
 *     responses:
 *       200:
 *         description: Детальная информация о телефонном номере
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 phone_number:
 *                   type: string
 *                   description: Телефонный номер
 *                   example: "+77273124531"
 *                 label:
 *                   type: string
 *                   description: Метка/название номера
 *                   example: "Казахстанский номер"
 *                 phone_number_id:
 *                   type: string
 *                   description: Уникальный ID номера
 *                   example: "phnum_01jy39yp7tef3b40pcwaz0v83y"
 *                 assigned_agent:
 *                   type: string
 *                   nullable: true
 *                   description: ID назначенного агента
 *                   example: null
 *                 provider:
 *                   type: string
 *                   description: Провайдер телефонии
 *                   example: "sip_trunk"
 *                 provider_config:
 *                   type: object
 *                   description: Конфигурация провайдера
 *                   properties:
 *                     address:
 *                       type: string
 *                       example: "https://alsan.vpbx.ftel.kz/crmapi/v1"
 *                     transport:
 *                       type: string
 *                       example: "udp"
 *                     media_encryption:
 *                       type: string
 *                       example: "allowed"
 *                     headers:
 *                       type: object
 *                       properties:
 *                         X-API-KEY:
 *                           type: string
 *                           example: "00618a1f-95a9-41d0-8526-ddc251c9cd29"
 *                     has_auth_credentials:
 *                       type: boolean
 *                       example: true
 *                     username:
 *                       type: string
 *                       example: "3124531"
 *                     has_outbound_trunk:
 *                       type: boolean
 *                       example: true
 *       400:
 *         description: Неверный запрос
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "ID телефонного номера обязателен"
 *       401:
 *         description: Неавторизован
 *       403:
 *         description: Нет прав доступа
 *       404:
 *         description: Номер не найден
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Телефонный номер с ID phnum_01jy39yp7tef3b40pcwaz0v83y не найден"
 *       500:
 *         description: Внутренняя ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ошибка при получении информации о телефонном номере"
 *                 details:
 *                   type: string
 */
router.get('/numbers/:phoneNumberId', [authMiddleware, adminMiddleware], getPhoneNumberById);

/**
 * @swagger
 * /api/phone/numbers/{phoneNumberId}/assign-agent:
 *   patch:
 *     summary: Привязать агента к телефонному номеру
 *     description: Привязывает агента к телефонному номеру в ElevenLabs. После привязки на этот номер будет отвечать указанный агент
 *     tags: [Phone]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: phoneNumberId
 *         required: true
 *         description: ID телефонного номера для привязки агента
 *         schema:
 *           type: string
 *           example: "phnum_01jy39yp7tef3b40pcwaz0v83y"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - agent_id
 *             properties:
 *               agent_id:
 *                 type: string
 *                 description: ID агента для привязки к номеру
 *                 example: "yufIbo0uUuoT5yZv5vds"
 *           examples:
 *             assign_agent:
 *               summary: Привязка агента
 *               value:
 *                 agent_id: "yufIbo0uUuoT5yZv5vds"
 *     responses:
 *       200:
 *         description: Агент успешно привязан к телефонному номеру
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Агент успешно привязан к телефонному номеру"
 *                 phone_number_id:
 *                   type: string
 *                   example: "phnum_01jy39yp7tef3b40pcwaz0v83y"
 *                 phone_number:
 *                   type: string
 *                   example: "+77273124531"
 *                 assigned_agent:
 *                   type: object
 *                   properties:
 *                     agent_id:
 *                       type: string
 *                       example: "yufIbo0uUuoT5yZv5vds"
 *                     agent_name:
 *                       type: string
 *                       example: "Guzel"
 *                 provider:
 *                   type: string
 *                   example: "sip_trunk"
 *       400:
 *         description: Неверный запрос
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   examples:
 *                     - "ID телефонного номера обязателен"
 *                     - "ID агента обязателен"
 *       401:
 *         description: Неавторизован
 *       403:
 *         description: Нет прав доступа
 *       404:
 *         description: Номер или агент не найден
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Телефонный номер с ID phnum_01jy39yp7tef3b40pcwaz0v83y или агент с ID yufIbo0uUuoT5yZv5vds не найден"
 *       422:
 *         description: Ошибка валидации данных
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ошибка валидации: Неверные данные для привязки агента"
 *       500:
 *         description: Внутренняя ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ошибка при привязке агента к телефонному номеру"
 *                 details:
 *                   type: string
 */
router.patch('/numbers/:phoneNumberId/assign-agent', [authMiddleware, adminMiddleware], assignAgentToPhoneNumber);

/**
 * @swagger
 * /api/phone/numbers/{phoneNumberId}:
 *   delete:
 *     summary: Удалить телефонный номер
 *     description: Удаляет телефонный номер из ElevenLabs по его ID
 *     tags: [Phone]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: phoneNumberId
 *         required: true
 *         description: ID телефонного номера для удаления
 *         schema:
 *           type: string
 *           example: "phnum_01jy316neqebrs2yqeya27h8gk"
 *     responses:
 *       200:
 *         description: Телефонный номер успешно удален
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Телефонный номер успешно удален"
 *                 phone_number_id:
 *                   type: string
 *                   example: "phnum_01jy316neqebrs2yqeya27h8gk"
 *                 deleted_at:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-01-15T10:30:00.000Z"
 *       400:
 *         description: Неверный запрос
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "ID телефонного номера обязателен"
 *       401:
 *         description: Неавторизован
 *       403:
 *         description: Нет прав доступа
 *       404:
 *         description: Телефонный номер не найден
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Телефонный номер с ID phnum_01jy316neqebrs2yqeya27h8gk не найден"
 *       500:
 *         description: Внутренняя ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ошибка при удалении телефонного номера"
 *                 details:
 *                   type: string
 */
router.delete('/numbers/:phoneNumberId', [authMiddleware, adminMiddleware], deletePhoneNumber);

/**
 * @swagger
 * /api/phone/outbound-call/sip-trunk:
 *   post:
 *     summary: Исходящий звонок через SIP trunk
 *     description: Инициирует исходящий звонок через SIP trunk провайдер с использованием указанного агента и номера
 *     tags: [Phone]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - agent_id
 *               - agent_phone_number_id
 *               - to_number
 *             properties:
 *               agent_id:
 *                 type: string
 *                 description: ID агента для звонка
 *                 example: "agent_01jy35zzvjfwrabtpprtc08wxz"
 *               agent_phone_number_id:
 *                 type: string
 *                 description: ID телефонного номера агента
 *                 example: "phnum_01jy39yp7tef3b40pcwaz0v83y"
 *               to_number:
 *                 type: string
 *                 description: Номер телефона получателя в международном формате
 *                 example: "+77758221235"
 *           examples:
 *             sip_trunk_call:
 *               summary: Исходящий звонок через SIP trunk
 *               value:
 *                 agent_id: "agent_01jy35zzvjfwrabtpprtc08wxz"
 *                 agent_phone_number_id: "phnum_01jy39yp7tef3b40pcwaz0v83y"
 *                 to_number: "+77758221235"
 *     responses:
 *       200:
 *         description: Исходящий звонок успешно инициирован
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Исходящий звонок через SIP trunk успешно инициирован"
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 conversation_id:
 *                   type: string
 *                   example: "conv_01jy3czrwae3sayn8khra60mj0"
 *                 sip_call_id:
 *                   type: string
 *                   example: "SCL_ie7cADvzSaRQ"
 *                 to_number:
 *                   type: string
 *                   example: "+77758221235"
 *       400:
 *         description: Неверный запрос
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Обязательные поля: agent_id, agent_phone_number_id, to_number"
 *       401:
 *         description: Неавторизован
 *       403:
 *         description: Нет прав доступа
 *       404:
 *         description: Агент или номер не найден
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Агент с ID agent_01jy35zzvjfwrabtpprtc08wxz или номер с ID phnum_01jy39yp7tef3b40pcwaz0v83y не найден"
 *       422:
 *         description: Ошибка валидации данных
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ошибка валидации: Неверные данные для звонка"
 *       500:
 *         description: Внутренняя ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ошибка при выполнении исходящего звонка через SIP trunk"
 *                 details:
 *                   type: string
 */
router.post('/outbound-call/sip-trunk', [authMiddleware, adminMiddleware], makeSipTrunkOutboundCall);

/**
 * @swagger
 * /api/phone/outbound-call/twilio:
 *   post:
 *     summary: Исходящий звонок через Twilio
 *     description: Инициирует исходящий звонок через Twilio провайдер с использованием указанного агента и номера
 *     tags: [Phone]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - agent_id
 *               - agent_phone_number_id
 *               - to_number
 *             properties:
 *               agent_id:
 *                 type: string
 *                 description: ID агента для звонка
 *                 example: "agent_01jy35zzvjfwrabtpprtc08wxz"
 *               agent_phone_number_id:
 *                 type: string
 *                 description: ID телефонного номера агента
 *                 example: "phnum_01jy39yp7tef3b40pcwaz0v83y"
 *               to_number:
 *                 type: string
 *                 description: Номер телефона получателя в международном формате
 *                 example: "+77758221235"
 *           examples:
 *             twilio_call:
 *               summary: Исходящий звонок через Twilio
 *               value:
 *                 agent_id: "agent_01jy35zzvjfwrabtpprtc08wxz"
 *                 agent_phone_number_id: "phnum_01jy39yp7tef3b40pcwaz0v83y"
 *                 to_number: "+77758221235"
 *     responses:
 *       200:
 *         description: Исходящий звонок успешно инициирован
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Исходящий звонок через Twilio успешно инициирован"
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 conversation_id:
 *                   type: string
 *                   example: "conv_01jy3d3mrefmgrt6qn10dw0cj3"
 *                 callSid:
 *                   type: string
 *                   example: "CA92fbce9599b4145a761373e96c63502f"
 *                 to_number:
 *                   type: string
 *                   example: "+77758221235"
 *       400:
 *         description: Неверный запрос
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Обязательные поля: agent_id, agent_phone_number_id, to_number"
 *       401:
 *         description: Неавторизован
 *       403:
 *         description: Нет прав доступа
 *       404:
 *         description: Агент или номер не найден
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Агент с ID agent_01jy35zzvjfwrabtpprtc08wxz или номер с ID phnum_01jy39yp7tef3b40pcwaz0v83y не найден"
 *       422:
 *         description: Ошибка валидации данных
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ошибка валидации: Неверные данные для звонка"
 *       500:
 *         description: Внутренняя ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ошибка при выполнении исходящего звонка через Twilio"
 *                 details:
 *                   type: string
 */
router.post('/outbound-call/twilio', [authMiddleware, adminMiddleware], makeTwilioOutboundCall);

/**
 * @swagger
 * /api/phone/batch-calls:
 *   get:
 *     summary: Получить список планируемых исходящих звонков
 *     description: Получает список всех batch calls (планируемых исходящих звонков) из ElevenLabs workspace, включая информацию о статусе, агентах и количестве звонков
 *     tags: [Phone]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список batch calls
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 batch_calls:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: ID batch call
 *                         example: "btcal_01jy3g992ffsra0smjqrt927t6"
 *                       phone_number_id:
 *                         type: string
 *                         description: ID телефонного номера
 *                         example: "phnum_01jy3dcyfaf9mvrcpqp9709yn6"
 *                       phone_provider:
 *                         type: string
 *                         description: Провайдер телефонии
 *                         example: "twilio"
 *                       name:
 *                         type: string
 *                         description: Название batch call
 *                         example: "Untitled Batch"
 *                       agent_id:
 *                         type: string
 *                         description: ID агента
 *                         example: "yufIbo0uUuoT5yZv5vds"
 *                       created_at_unix:
 *                         type: number
 *                         description: Время создания в Unix timestamp
 *                         example: 1750316917
 *                       scheduled_time_unix:
 *                         type: number
 *                         description: Запланированное время в Unix timestamp
 *                         example: 1750316916
 *                       total_calls_dispatched:
 *                         type: number
 *                         description: Количество отправленных звонков
 *                         example: 2
 *                       total_calls_scheduled:
 *                         type: number
 *                         description: Общее количество запланированных звонков
 *                         example: 2
 *                       last_updated_at_unix:
 *                         type: number
 *                         description: Время последнего обновления в Unix timestamp
 *                         example: 1750316918
 *                       status:
 *                         type: string
 *                         description: Статус batch call
 *                         example: "completed"
 *                         enum: ["scheduled", "in_progress", "completed", "failed", "cancelled"]
 *                       agent_name:
 *                         type: string
 *                         description: Имя агента
 *                         example: "Guzel"
 *                 next_doc:
 *                   type: string
 *                   nullable: true
 *                   description: Токен для получения следующей страницы
 *                   example: null
 *                 has_more:
 *                   type: boolean
 *                   description: Есть ли еще данные для загрузки
 *                   example: false
 *             examples:
 *               batch_calls_response:
 *                 summary: Пример ответа со списком batch calls
 *                 value:
 *                   batch_calls:
 *                     - id: "btcal_01jy3g992ffsra0smjqrt927t6"
 *                       phone_number_id: "phnum_01jy3dcyfaf9mvrcpqp9709yn6"
 *                       phone_provider: "twilio"
 *                       name: "Untitled Batch"
 *                       agent_id: "yufIbo0uUuoT5yZv5vds"
 *                       created_at_unix: 1750316917
 *                       scheduled_time_unix: 1750316916
 *                       total_calls_dispatched: 2
 *                       total_calls_scheduled: 2
 *                       last_updated_at_unix: 1750316918
 *                       status: "completed"
 *                       agent_name: "Guzel"
 *                     - id: "btcal_01jy37jc12f2ysgpd91p9ffw19"
 *                       phone_number_id: "phnum_01jy35m43bfaxbx96fa560tfn9"
 *                       phone_provider: "twilio"
 *                       name: "Untitled Batch"
 *                       agent_id: "agent_01jy35zzvjfwrabtpprtc08wxz"
 *                       created_at_unix: 1750307778
 *                       scheduled_time_unix: 1750307777
 *                       total_calls_dispatched: 2
 *                       total_calls_scheduled: 2
 *                       last_updated_at_unix: 1750316581
 *                       status: "completed"
 *                       agent_name: "Батырбек"
 *                   next_doc: null
 *                   has_more: false
 *       401:
 *         description: Неавторизован
 *       403:
 *         description: Нет прав доступа
 *       404:
 *         description: Администратор не найден
 *       500:
 *         description: Внутренняя ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ошибка при получении списка batch calls"
 *                 details:
 *                   type: string
 */
router.get('/batch-calls', [authMiddleware, adminMiddleware], getBatchCalls);

/**
 * @swagger
 * /api/phone/batch-calls/{batchCallId}:
 *   get:
 *     summary: Получить детальную информацию о batch call
 *     description: Получает детальную информацию о конкретном batch call по ID, включая список получателей и их статусы
 *     tags: [Phone]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: batchCallId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID batch call
 *         example: "btcal_01jy37jc12f2ysgpd91p9ffw19"
 *     responses:
 *       200:
 *         description: Детальная информация о batch call
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: ID batch call
 *                   example: "btcal_01jy37jc12f2ysgpd91p9ffw19"
 *                 phone_number_id:
 *                   type: string
 *                   description: ID телефонного номера
 *                   example: "phnum_01jy35m43bfaxbx96fa560tfn9"
 *                 phone_provider:
 *                   type: string
 *                   description: Провайдер телефонии
 *                   example: "twilio"
 *                 name:
 *                   type: string
 *                   description: Название batch call
 *                   example: "Untitled Batch"
 *                 agent_id:
 *                   type: string
 *                   description: ID агента
 *                   example: "agent_01jy35zzvjfwrabtpprtc08wxz"
 *                 created_at_unix:
 *                   type: number
 *                   description: Время создания в Unix timestamp
 *                   example: 1750307778
 *                 scheduled_time_unix:
 *                   type: number
 *                   description: Запланированное время в Unix timestamp
 *                   example: 1750307777
 *                 total_calls_dispatched:
 *                   type: number
 *                   description: Количество отправленных звонков
 *                   example: 2
 *                 total_calls_scheduled:
 *                   type: number
 *                   description: Общее количество запланированных звонков
 *                   example: 2
 *                 last_updated_at_unix:
 *                   type: number
 *                   description: Время последнего обновления в Unix timestamp
 *                   example: 1750316581
 *                 status:
 *                   type: string
 *                   description: Статус batch call
 *                   example: "completed"
 *                   enum: ["scheduled", "in_progress", "completed", "failed", "cancelled"]
 *                 agent_name:
 *                   type: string
 *                   description: Имя агента
 *                   example: "Батырбек"
 *                 recipients:
 *                   type: array
 *                   description: Список получателей
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: ID получателя
 *                         example: "rcpt_01jy37jc1fe3ntzbyq5sbhwfek"
 *                       phone_number:
 *                         type: string
 *                         description: Номер телефона получателя
 *                         example: "+77758221235"
 *                       status:
 *                         type: string
 *                         description: Статус звонка получателю
 *                         example: "pending"
 *                         enum: ["pending", "in_progress", "completed", "failed", "cancelled"]
 *                       created_at_unix:
 *                         type: number
 *                         description: Время создания в Unix timestamp
 *                         example: 1750307778
 *                       updated_at_unix:
 *                         type: number
 *                         description: Время обновления в Unix timestamp
 *                         example: 1750316570
 *                       conversation_id:
 *                         type: string
 *                         nullable: true
 *                         description: ID разговора (если звонок состоялся)
 *                         example: null
 *                       conversation_initiation_client_data:
 *                         type: object
 *                         description: Данные для инициации разговора
 *                         properties:
 *                           conversation_config_override:
 *                             type: object
 *                             properties:
 *                               tts:
 *                                 type: object
 *                                 properties:
 *                                   voice_id:
 *                                     type: string
 *                                     nullable: true
 *                                     example: null
 *                               conversation:
 *                                 type: object
 *                                 nullable: true
 *                                 example: null
 *                               agent:
 *                                 type: object
 *                                 properties:
 *                                   first_message:
 *                                     type: string
 *                                     description: Первое сообщение агента
 *                                     example: "Привет Батыр"
 *                                   language:
 *                                     type: string
 *                                     description: Язык разговора
 *                                     example: "ru"
 *                                   prompt:
 *                                     type: string
 *                                     nullable: true
 *                                     example: null
 *                           custom_llm_extra_body:
 *                             type: object
 *                             description: Дополнительные параметры для LLM
 *                             example: {}
 *                           dynamic_variables:
 *                             type: object
 *                             description: Динамические переменные для разговора
 *                             example: {"city": "Almaty"}
 *             examples:
 *               batch_call_detail:
 *                 summary: Пример детальной информации о batch call
 *                 value:
 *                   id: "btcal_01jy37jc12f2ysgpd91p9ffw19"
 *                   phone_number_id: "phnum_01jy35m43bfaxbx96fa560tfn9"
 *                   phone_provider: "twilio"
 *                   name: "Untitled Batch"
 *                   agent_id: "agent_01jy35zzvjfwrabtpprtc08wxz"
 *                   created_at_unix: 1750307778
 *                   scheduled_time_unix: 1750307777
 *                   total_calls_dispatched: 2
 *                   total_calls_scheduled: 2
 *                   last_updated_at_unix: 1750316581
 *                   status: "completed"
 *                   agent_name: "Батырбек"
 *                   recipients:
 *                     - id: "rcpt_01jy37jc1fe3ntzbyq5sbhwfek"
 *                       phone_number: "+77758221235"
 *                       status: "pending"
 *                       created_at_unix: 1750307778
 *                       updated_at_unix: 1750316570
 *                       conversation_id: null
 *                       conversation_initiation_client_data:
 *                         conversation_config_override:
 *                           tts:
 *                             voice_id: null
 *                           conversation: null
 *                           agent:
 *                             first_message: "Привет Батыр"
 *                             language: "ru"
 *                             prompt: null
 *                         custom_llm_extra_body: {}
 *                         dynamic_variables:
 *                           city: "Almaty"
 *                     - id: "rcpt_01jy37jc1gfg5amveh7s69kn4p"
 *                       phone_number: "+77758221235"
 *                       status: "pending"
 *                       created_at_unix: 1750307778
 *                       updated_at_unix: 1750316570
 *                       conversation_id: null
 *                       conversation_initiation_client_data:
 *                         conversation_config_override:
 *                           tts:
 *                             voice_id: null
 *                           conversation: null
 *                           agent:
 *                             first_message: "Привет Гуля"
 *                             language: "ru"
 *                             prompt: null
 *                         custom_llm_extra_body: {}
 *                         dynamic_variables:
 *                           city: "Astana"
 *       400:
 *         description: Неверные параметры запроса
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "ID batch call обязателен"
 *       401:
 *         description: Неавторизован
 *       403:
 *         description: Нет прав доступа
 *       404:
 *         description: Batch call не найден
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Batch call не найден"
 *                 details:
 *                   type: string
 *       500:
 *         description: Внутренняя ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ошибка при получении batch call"
 *                 details:
 *                   type: string
 */
router.get('/batch-calls/:batchCallId', [authMiddleware, adminMiddleware], getBatchCallById);

/**
 * @swagger
 * /api/phone/batch-calls/{batchCallId}/cancel:
 *   post:
 *     summary: Отменить batch call
 *     description: Отменяет (останавливает) процесс выполнения batch call. Можно отменить только batch calls в статусе "scheduled" или "in_progress"
 *     tags: [Phone]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: batchCallId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID batch call для отмены
 *         example: "btcal_01jy37jc12f2ysgpd91p9ffw19"
 *     responses:
 *       200:
 *         description: Batch call успешно отменен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Сообщение об успешной отмене
 *                   example: "Batch call успешно отменен"
 *                 batch_call_id:
 *                   type: string
 *                   description: ID отмененного batch call
 *                   example: "btcal_01jy37jc12f2ysgpd91p9ffw19"
 *             examples:
 *               cancel_success:
 *                 summary: Успешная отмена batch call
 *                 value:
 *                   message: "Batch call успешно отменен"
 *                   batch_call_id: "btcal_01jy37jc12f2ysgpd91p9ffw19"
 *       400:
 *         description: Невозможно отменить batch call (уже завершен или отменен)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Невозможно отменить batch call"
 *                 details:
 *                   type: string
 *                   example: "batch call уже завершен или отменен"
 *             examples:
 *               already_completed:
 *                 summary: Batch call уже завершен
 *                 value:
 *                   message: "Невозможно отменить batch call"
 *                   details: "batch call уже завершен или отменен"
 *               missing_id:
 *                 summary: Отсутствует ID batch call
 *                 value:
 *                   message: "ID batch call обязателен"
 *       401:
 *         description: Неавторизован
 *       403:
 *         description: Нет прав доступа
 *       404:
 *         description: Batch call не найден
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Batch call не найден"
 *                 details:
 *                   type: string
 *             examples:
 *               not_found:
 *                 summary: Batch call не найден
 *                 value:
 *                   message: "Batch call не найден"
 *                   details: "Batch call с ID btcal_01jy37jc12f2ysgpd91p9ffw19 не найден"
 *               admin_not_found:
 *                 summary: Администратор не найден
 *                 value:
 *                   message: "Администратор не найден"
 *       500:
 *         description: Внутренняя ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ошибка при отмене batch call"
 *                 details:
 *                   type: string
 */
router.post('/batch-calls/:batchCallId/cancel', [authMiddleware, adminMiddleware], cancelBatchCall);

/**
 * @swagger
 * /api/phone/batch-calls:
 *   post:
 *     summary: Создать batch call
 *     description: Создает новый batch call для массовых исходящих звонков с персонализированными настройками для каждого получателя. Основано на ElevenLabs Batch Calling API
 *     tags: [Phone]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - call_name
 *               - agent_id
 *               - agent_phone_number_id
 *               - recipients
 *             properties:
 *               call_name:
 *                 type: string
 *                 description: Название batch call
 *                 example: "Untitled Batch"
 *               agent_id:
 *                 type: string
 *                 description: ID агента для проведения звонков
 *                 example: "agent_01jy35zzvjfwrabtpprtc08wxz"
 *               agent_phone_number_id:
 *                 type: string
 *                 description: ID телефонного номера агента
 *                 example: "phnum_01jy39yp7tef3b40pcwaz0v83y"
 *               recipients:
 *                 type: array
 *                 description: Список получателей звонков
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - phone_number
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Уникальный идентификатор получателя (опционально)
 *                       example: "5811b73b-614d-4c47-824e-216044c33a83"
 *                     phone_number:
 *                       type: string
 *                       description: Номер телефона получателя
 *                       example: "+77758221235"
 *                     conversation_initiation_client_data:
 *                       type: object
 *                       description: Данные для персонализации разговора
 *                       properties:
 *                         conversation_config_override:
 *                           type: object
 *                           description: Настройки разговора для конкретного получателя
 *                           properties:
 *                             agent:
 *                               type: object
 *                               properties:
 *                                 prompt:
 *                                   type: string
 *                                   nullable: true
 *                                   description: Персонализированный промпт для получателя
 *                                   example: null
 *                                 first_message:
 *                                   type: string
 *                                   nullable: true
 *                                   description: Первое сообщение агента для получателя
 *                                   example: "Привет, Батырбек!"
 *                                 language:
 *                                   type: string
 *                                   description: Язык разговора
 *                                   example: "ru"
 *                             tts:
 *                               type: object
 *                               properties:
 *                                 voice_id:
 *                                   type: string
 *                                   nullable: true
 *                                   description: ID голоса для TTS
 *                                   example: null
 *                             conversation:
 *                               type: object
 *                               nullable: true
 *                               description: Дополнительные настройки разговора
 *                               example: null
 *                         custom_llm_extra_body:
 *                           type: object
 *                           description: Дополнительные параметры для LLM
 *                           example: {}
 *                         dynamic_variables:
 *                           type: object
 *                           description: Динамические переменные для персонализации
 *                           example: {"Name": "Batyrbek", "City": "Almaty"}
 *               scheduled_time_unix:
 *                 type: integer
 *                 description: Время запуска batch call в Unix timestamp (опционально, если не указано - запуск немедленно)
 *                 example: 1750324845
 *           examples:
 *             simple_batch_call:
 *               summary: Простой batch call
 *               value:
 *                 call_name: "Тестовые звонки"
 *                 agent_id: "agent_01jy35zzvjfwrabtpprtc08wxz"
 *                 agent_phone_number_id: "phnum_01jy39yp7tef3b40pcwaz0v83y"
 *                 recipients:
 *                   - phone_number: "+77758221235"
 *                   - phone_number: "+77012345678"
 *             personalized_batch_call:
 *               summary: Персонализированный batch call
 *               value:
 *                 call_name: "Персонализированные звонки"
 *                 agent_id: "agent_01jy35zzvjfwrabtpprtc08wxz"
 *                 agent_phone_number_id: "phnum_01jy39yp7tef3b40pcwaz0v83y"
 *                 recipients:
 *                   - id: "5811b73b-614d-4c47-824e-216044c33a83"
 *                     phone_number: "+77758221235"
 *                     conversation_initiation_client_data:
 *                       conversation_config_override:
 *                         agent:
 *                           prompt: null
 *                           first_message: "Привет, Батырбек!"
 *                           language: "ru"
 *                         tts:
 *                           voice_id: null
 *                       custom_llm_extra_body: {}
 *                       dynamic_variables:
 *                         Name: "Batyrbek"
 *                         City: "Almaty"
 *                   - id: "de477356-6c66-4ba6-850e-13bbec776deb"
 *                     phone_number: "+77012345678"
 *                     conversation_initiation_client_data:
 *                       conversation_config_override:
 *                         agent:
 *                           first_message: "Здравствуйте, Гуля!"
 *                           language: "ru"
 *                       dynamic_variables:
 *                         Name: "Guzal"
 *                         City: "Astana"
 *                 scheduled_time_unix: 1750324845
 *     responses:
 *       201:
 *         description: Batch call успешно создан
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: ID созданного batch call
 *                   example: "btcal_01jy3g992ffsra0smjqrt927t6"
 *                 phone_number_id:
 *                   type: string
 *                   description: ID телефонного номера
 *                   example: "phnum_01jy39yp7tef3b40pcwaz0v83y"
 *                 name:
 *                   type: string
 *                   description: Название batch call
 *                   example: "Untitled Batch"
 *                 agent_id:
 *                   type: string
 *                   description: ID агента
 *                   example: "agent_01jy35zzvjfwrabtpprtc08wxz"
 *                 created_at_unix:
 *                   type: number
 *                   description: Время создания в Unix timestamp
 *                   example: 1750322743
 *                 scheduled_time_unix:
 *                   type: number
 *                   description: Запланированное время в Unix timestamp
 *                   example: 1750324845
 *                 total_calls_dispatched:
 *                   type: number
 *                   description: Количество отправленных звонков
 *                   example: 0
 *                 total_calls_scheduled:
 *                   type: number
 *                   description: Общее количество запланированных звонков
 *                   example: 2
 *                 last_updated_at_unix:
 *                   type: number
 *                   description: Время последнего обновления в Unix timestamp
 *                   example: 1750322743
 *                 status:
 *                   type: string
 *                   description: Статус batch call
 *                   example: "pending"
 *                   enum: ["pending", "in_progress", "completed", "failed", "cancelled"]
 *                 agent_name:
 *                   type: string
 *                   description: Имя агента
 *                   example: "Батырбек"
 *                 phone_provider:
 *                   type: string
 *                   description: Провайдер телефонии
 *                   example: "twilio"
 *                   enum: ["twilio", "sip_trunk"]
 *             examples:
 *               created_batch_call:
 *                 summary: Успешно созданный batch call
 *                 value:
 *                   id: "btcal_01jy3g992ffsra0smjqrt927t6"
 *                   phone_number_id: "phnum_01jy39yp7tef3b40pcwaz0v83y"
 *                   name: "Untitled Batch"
 *                   agent_id: "agent_01jy35zzvjfwrabtpprtc08wxz"
 *                   created_at_unix: 1750322743
 *                   scheduled_time_unix: 1750324845
 *                   total_calls_dispatched: 0
 *                   total_calls_scheduled: 2
 *                   last_updated_at_unix: 1750322743
 *                   status: "pending"
 *                   agent_name: "Батырбек"
 *                   phone_provider: "twilio"
 *       400:
 *         description: Неверные параметры запроса
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 details:
 *                   type: string
 *             examples:
 *               missing_call_name:
 *                 summary: Отсутствует название
 *                 value:
 *                   message: "Название batch call обязательно"
 *               missing_agent_id:
 *                 summary: Отсутствует ID агента
 *                 value:
 *                   message: "ID агента обязателен"
 *               missing_recipients:
 *                 summary: Отсутствуют получатели
 *                 value:
 *                   message: "Список получателей обязателен и должен содержать минимум одного получателя"
 *               invalid_phone:
 *                 summary: Неверный номер телефона
 *                 value:
 *                   message: "Номер телефона обязателен для каждого получателя"
 *       401:
 *         description: Неавторизован
 *       403:
 *         description: Нет прав доступа
 *       404:
 *         description: Администратор не найден
 *       422:
 *         description: Ошибка валидации данных ElevenLabs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ошибка валидации данных"
 *                 details:
 *                   type: string
 *       500:
 *         description: Внутренняя ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ошибка при создании batch call"
 *                 details:
 *                   type: string
 */
router.post('/batch-calls', [authMiddleware, adminMiddleware], createBatchCall);

export default router; 