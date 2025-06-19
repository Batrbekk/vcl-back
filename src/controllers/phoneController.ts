import { Request, Response } from 'express';
import { User } from '../models/User';
import { phoneService } from '../services/phoneService';

/**
 * Получение списка телефонных номеров
 */
export const getPhoneNumbers = async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;

    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Администратор не найден' });
    }

    console.log('=== ПОЛУЧЕНИЕ СПИСКА ТЕЛЕФОННЫХ НОМЕРОВ ===');
    console.log('Admin ID:', adminId);

    // Получаем список телефонных номеров из ElevenLabs
    const phoneNumbers = await phoneService.getPhoneNumbers();

    console.log('Список телефонных номеров успешно получен:', {
      count: phoneNumbers.length,
      admin_id: adminId
    });

    res.status(200).json(phoneNumbers);
  } catch (error: any) {
    console.error('=== ОШИБКА ПОЛУЧЕНИЯ ТЕЛЕФОННЫХ НОМЕРОВ ===');
    console.error('Error getting phone numbers:', error);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({ 
      message: 'Ошибка при получении списка телефонных номеров',
      details: error.message 
    });
  }
};

/**
 * Удаление телефонного номера
 */
export const deletePhoneNumber = async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const { phoneNumberId } = req.params;

    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Администратор не найден' });
    }

    if (!phoneNumberId) {
      return res.status(400).json({ message: 'ID телефонного номера обязателен' });
    }

    console.log('=== УДАЛЕНИЕ ТЕЛЕФОННОГО НОМЕРА ===');
    console.log('Admin ID:', adminId);
    console.log('Phone Number ID:', phoneNumberId);

    // Удаляем телефонный номер в ElevenLabs
    const deleteResult = await phoneService.deletePhoneNumber(phoneNumberId);

    console.log('Телефонный номер успешно удален:', {
      phone_number_id: phoneNumberId,
      admin_id: adminId,
      deleted_at: deleteResult.deleted_at
    });

    res.status(200).json({
      message: 'Телефонный номер успешно удален',
      phone_number_id: deleteResult.phone_number_id,
      deleted_at: deleteResult.deleted_at
    });
  } catch (error: any) {
    console.error('=== ОШИБКА УДАЛЕНИЯ ТЕЛЕФОННОГО НОМЕРА ===');
    console.error('Error deleting phone number:', error);
    console.error('Error stack:', error.stack);
    
    if (error.message.includes('не найден')) {
      return res.status(404).json({ 
        message: error.message
      });
    }
    
    res.status(500).json({ 
      message: 'Ошибка при удалении телефонного номера',
      details: error.message 
    });
  }
};

/**
 * Создание телефонного номера
 */
export const createPhoneNumber = async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const phoneData = req.body;

    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Администратор не найден' });
    }

    // Валидация обязательных полей
    if (!phoneData.phone_number || !phoneData.label || !phoneData.provider) {
      return res.status(400).json({ 
        message: 'Обязательные поля: phone_number, label, provider' 
      });
    }

    // Валидация провайдера
    if (!['twilio', 'sip_trunk'].includes(phoneData.provider)) {
      return res.status(400).json({ 
        message: 'Провайдер должен быть twilio или sip_trunk' 
      });
    }

    // Валидация специфичных полей для Twilio
    if (phoneData.provider === 'twilio') {
      if (!phoneData.sid || !phoneData.token) {
        return res.status(400).json({ 
          message: 'Для Twilio обязательны поля: sid, token' 
        });
      }
    }

    // Валидация специфичных полей для SIP trunk
    if (phoneData.provider === 'sip_trunk') {
      if (!phoneData.termination_uri || !phoneData.credentials || 
          !phoneData.credentials.username || !phoneData.credentials.password ||
          !phoneData.media_encryption || !phoneData.address || !phoneData.transport) {
        return res.status(400).json({ 
          message: 'Для SIP trunk обязательны поля: termination_uri, credentials (username, password), media_encryption, address, transport' 
        });
      }
    }

    console.log('=== СОЗДАНИЕ ТЕЛЕФОННОГО НОМЕРА ===');
    console.log('Admin ID:', adminId);
    console.log('Provider:', phoneData.provider);
    console.log('Phone number:', phoneData.phone_number);

    // Создаем телефонный номер в ElevenLabs
    const createResult = await phoneService.createPhoneNumber(phoneData);

    console.log('Телефонный номер успешно создан:', {
      phone_number_id: createResult.phone_number_id,
      provider: phoneData.provider,
      phone_number: phoneData.phone_number,
      admin_id: adminId
    });

    res.status(201).json({
      message: 'Телефонный номер успешно создан',
      phone_number_id: createResult.phone_number_id,
      provider: phoneData.provider,
      phone_number: phoneData.phone_number,
      label: phoneData.label
    });
  } catch (error: any) {
    console.error('=== ОШИБКА СОЗДАНИЯ ТЕЛЕФОННОГО НОМЕРА ===');
    console.error('Error creating phone number:', error);
    console.error('Error stack:', error.stack);
    
    if (error.message.includes('валидации')) {
      return res.status(422).json({ 
        message: error.message
      });
    }
    
    res.status(500).json({ 
      message: 'Ошибка при создании телефонного номера',
      details: error.message 
    });
  }
};

/**
 * Получение телефонного номера по ID
 */
export const getPhoneNumberById = async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const { phoneNumberId } = req.params;

    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Администратор не найден' });
    }

    if (!phoneNumberId) {
      return res.status(400).json({ message: 'ID телефонного номера обязателен' });
    }

    console.log('=== ПОЛУЧЕНИЕ ТЕЛЕФОННОГО НОМЕРА ПО ID ===');
    console.log('Admin ID:', adminId);
    console.log('Phone Number ID:', phoneNumberId);

    // Получаем детальную информацию о номере из ElevenLabs
    const phoneNumberDetail = await phoneService.getPhoneNumberById(phoneNumberId);

    console.log('Информация о телефонном номере успешно получена:', {
      phone_number_id: phoneNumberId,
      phone_number: phoneNumberDetail.phone_number,
      admin_id: adminId
    });

    res.status(200).json(phoneNumberDetail);
  } catch (error: any) {
    console.error('=== ОШИБКА ПОЛУЧЕНИЯ ТЕЛЕФОННОГО НОМЕРА ПО ID ===');
    console.error('Error getting phone number by ID:', error);
    console.error('Error stack:', error.stack);
    
    if (error.message.includes('не найден')) {
      return res.status(404).json({ 
        message: error.message
      });
    }
    
    res.status(500).json({ 
      message: 'Ошибка при получении информации о телефонном номере',
      details: error.message 
    });
  }
};

/**
 * Привязка агента к телефонному номеру
 */
export const assignAgentToPhoneNumber = async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const { phoneNumberId } = req.params;
    const { agent_id } = req.body;

    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Администратор не найден' });
    }

    if (!phoneNumberId) {
      return res.status(400).json({ message: 'ID телефонного номера обязателен' });
    }

    if (!agent_id) {
      return res.status(400).json({ message: 'ID агента обязателен' });
    }

    console.log('=== ПРИВЯЗКА АГЕНТА К ТЕЛЕФОННОМУ НОМЕРУ ===');
    console.log('Admin ID:', adminId);
    console.log('Phone Number ID:', phoneNumberId);
    console.log('Agent ID:', agent_id);

    // Привязываем агента к номеру в ElevenLabs
    const assignResult = await phoneService.assignAgentToPhoneNumber(phoneNumberId, { agent_id });

    console.log('Агент успешно привязан к номеру:', {
      phone_number_id: phoneNumberId,
      agent_id: assignResult.assigned_agent.agent_id,
      agent_name: assignResult.assigned_agent.agent_name,
      admin_id: adminId
    });

    res.status(200).json({
      message: 'Агент успешно привязан к телефонному номеру',
      phone_number_id: assignResult.phone_number_id,
      phone_number: assignResult.phone_number,
      assigned_agent: assignResult.assigned_agent,
      provider: assignResult.provider
    });
  } catch (error: any) {
    console.error('=== ОШИБКА ПРИВЯЗКИ АГЕНТА К НОМЕРУ ===');
    console.error('Error assigning agent to phone number:', error);
    console.error('Error stack:', error.stack);
    
    if (error.message.includes('не найден')) {
      return res.status(404).json({ 
        message: error.message
      });
    }

    if (error.message.includes('валидации')) {
      return res.status(422).json({ 
        message: error.message
      });
    }
    
    res.status(500).json({ 
      message: 'Ошибка при привязке агента к телефонному номеру',
      details: error.message 
    });
  }
};

/**
 * Исходящий звонок через SIP trunk
 */
export const makeSipTrunkOutboundCall = async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const { agent_id, agent_phone_number_id, to_number } = req.body;

    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Администратор не найден' });
    }

    // Валидация обязательных полей
    if (!agent_id || !agent_phone_number_id || !to_number) {
      return res.status(400).json({ 
        message: 'Обязательные поля: agent_id, agent_phone_number_id, to_number' 
      });
    }

    console.log('=== ИСХОДЯЩИЙ ЗВОНОК ЧЕРЕЗ SIP TRUNK ===');
    console.log('Admin ID:', adminId);
    console.log('Agent ID:', agent_id);
    console.log('Phone Number ID:', agent_phone_number_id);
    console.log('To Number:', to_number);

    // Выполняем исходящий звонок через SIP trunk
    const callResult = await phoneService.makeSipTrunkOutboundCall({
      agent_id,
      agent_phone_number_id,
      to_number
    });

    console.log('Исходящий звонок через SIP trunk успешно инициирован:', {
      conversation_id: callResult.conversation_id,
      sip_call_id: callResult.sip_call_id,
      to_number,
      admin_id: adminId
    });

    res.status(200).json({
      message: 'Исходящий звонок через SIP trunk успешно инициирован',
      success: callResult.success,
      conversation_id: callResult.conversation_id,
      sip_call_id: callResult.sip_call_id,
      to_number
    });
  } catch (error: any) {
    console.error('=== ОШИБКА ИСХОДЯЩЕГО ЗВОНКА ЧЕРЕЗ SIP TRUNK ===');
    console.error('Error making SIP trunk outbound call:', error);
    console.error('Error stack:', error.stack);
    
    if (error.message.includes('не найден')) {
      return res.status(404).json({ 
        message: error.message
      });
    }

    if (error.message.includes('валидации')) {
      return res.status(422).json({ 
        message: error.message
      });
    }
    
    res.status(500).json({ 
      message: 'Ошибка при выполнении исходящего звонка через SIP trunk',
      details: error.message 
    });
  }
};

/**
 * Исходящий звонок через Twilio
 */
export const makeTwilioOutboundCall = async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const { agent_id, agent_phone_number_id, to_number } = req.body;

    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Администратор не найден' });
    }

    // Валидация обязательных полей
    if (!agent_id || !agent_phone_number_id || !to_number) {
      return res.status(400).json({ 
        message: 'Обязательные поля: agent_id, agent_phone_number_id, to_number' 
      });
    }

    console.log('=== ИСХОДЯЩИЙ ЗВОНОК ЧЕРЕЗ TWILIO ===');
    console.log('Admin ID:', adminId);
    console.log('Agent ID:', agent_id);
    console.log('Phone Number ID:', agent_phone_number_id);
    console.log('To Number:', to_number);

    // Выполняем исходящий звонок через Twilio
    const callResult = await phoneService.makeTwilioOutboundCall({
      agent_id,
      agent_phone_number_id,
      to_number
    });

    console.log('Исходящий звонок через Twilio успешно инициирован:', {
      conversation_id: callResult.conversation_id,
      callSid: callResult.callSid,
      to_number,
      admin_id: adminId
    });

    res.status(200).json({
      message: 'Исходящий звонок через Twilio успешно инициирован',
      success: callResult.success,
      conversation_id: callResult.conversation_id,
      callSid: callResult.callSid,
      to_number
    });
  } catch (error: any) {
    console.error('=== ОШИБКА ИСХОДЯЩЕГО ЗВОНКА ЧЕРЕЗ TWILIO ===');
    console.error('Error making Twilio outbound call:', error);
    console.error('Error stack:', error.stack);
    
    if (error.message.includes('не найден')) {
      return res.status(404).json({ 
        message: error.message
      });
    }

    if (error.message.includes('валидации')) {
      return res.status(422).json({ 
        message: error.message
      });
    }
    
    res.status(500).json({ 
      message: 'Ошибка при выполнении исходящего звонка через Twilio',
      details: error.message 
    });
  }
};

/**
 * Получение списка batch calls (планируемых исходящих звонков)
 */
export const getBatchCalls = async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;

    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Администратор не найден' });
    }

    console.log('=== ПОЛУЧЕНИЕ СПИСКА BATCH CALLS ===');
    console.log('Admin ID:', adminId);

    // Получаем список batch calls из ElevenLabs
    const batchCallsData = await phoneService.getBatchCalls();

    console.log('Список batch calls успешно получен:', {
      count: batchCallsData.batch_calls.length,
      has_more: batchCallsData.has_more,
      admin_id: adminId
    });

    res.status(200).json(batchCallsData);
  } catch (error: any) {
    console.error('=== ОШИБКА ПОЛУЧЕНИЯ BATCH CALLS ===');
    console.error('Error getting batch calls:', error);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({ 
      message: 'Ошибка при получении списка batch calls',
      details: error.message 
    });
  }
};

/**
 * Получение детальной информации о batch call по ID
 */
export const getBatchCallById = async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const { batchCallId } = req.params;

    // Валидация параметров
    if (!batchCallId) {
      return res.status(400).json({ message: 'ID batch call обязателен' });
    }

    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Администратор не найден' });
    }

    console.log('=== ПОЛУЧЕНИЕ BATCH CALL ПО ID ===');
    console.log('Admin ID:', adminId);
    console.log('Batch Call ID:', batchCallId);

    // Получаем детальную информацию о batch call из ElevenLabs
    const batchCallData = await phoneService.getBatchCallById(batchCallId);

    console.log('Детальная информация о batch call успешно получена:', {
      id: batchCallData.id,
      name: batchCallData.name,
      status: batchCallData.status,
      recipients_count: batchCallData.recipients.length,
      admin_id: adminId
    });

    res.status(200).json(batchCallData);
  } catch (error: any) {
    console.error('=== ОШИБКА ПОЛУЧЕНИЯ BATCH CALL ПО ID ===');
    console.error('Error getting batch call by ID:', error);
    console.error('Error stack:', error.stack);
    
    if (error.message.includes('не найден')) {
      return res.status(404).json({ 
        message: 'Batch call не найден',
        details: error.message 
      });
    }
    
    res.status(500).json({ 
      message: 'Ошибка при получении batch call',
      details: error.message 
    });
  }
};

/**
 * Отмена batch call
 */
export const cancelBatchCall = async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const { batchCallId } = req.params;

    // Валидация параметров
    if (!batchCallId) {
      return res.status(400).json({ message: 'ID batch call обязателен' });
    }

    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Администратор не найден' });
    }

    console.log('=== ОТМЕНА BATCH CALL ===');
    console.log('Admin ID:', adminId);
    console.log('Batch Call ID:', batchCallId);

    // Отменяем batch call через ElevenLabs API
    const cancelResult = await phoneService.cancelBatchCall(batchCallId);

    console.log('Batch call успешно отменен:', {
      batch_call_id: batchCallId,
      admin_id: adminId,
      result: cancelResult
    });

    res.status(200).json(cancelResult);
  } catch (error: any) {
    console.error('=== ОШИБКА ОТМЕНЫ BATCH CALL ===');
    console.error('Error canceling batch call:', error);
    console.error('Error stack:', error.stack);
    
    if (error.message.includes('не найден')) {
      return res.status(404).json({ 
        message: 'Batch call не найден',
        details: error.message 
      });
    }
    
    if (error.message.includes('Невозможно отменить')) {
      return res.status(400).json({ 
        message: 'Невозможно отменить batch call',
        details: error.message 
      });
    }
    
    res.status(500).json({ 
      message: 'Ошибка при отмене batch call',
      details: error.message 
    });
  }
};

/**
 * Создание batch call
 */
export const createBatchCall = async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const { call_name, agent_id, agent_phone_number_id, recipients, scheduled_time_unix } = req.body;

    // Валидация обязательных полей
    if (!call_name) {
      return res.status(400).json({ message: 'Название batch call обязательно' });
    }

    if (!agent_id) {
      return res.status(400).json({ message: 'ID агента обязателен' });
    }

    if (!agent_phone_number_id) {
      return res.status(400).json({ message: 'ID телефонного номера агента обязателен' });
    }

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ message: 'Список получателей обязателен и должен содержать минимум одного получателя' });
    }

    // Валидация получателей
    for (const recipient of recipients) {
      if (!recipient.phone_number) {
        return res.status(400).json({ message: 'Номер телефона обязателен для каждого получателя' });
      }
    }

    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Администратор не найден' });
    }

    console.log('=== СОЗДАНИЕ BATCH CALL ===');
    console.log('Admin ID:', adminId);
    console.log('Call name:', call_name);
    console.log('Recipients count:', recipients.length);

    // Создаем batch call через ElevenLabs API
    const batchCallData = {
      call_name,
      agent_id,
      agent_phone_number_id,
      recipients,
      ...(scheduled_time_unix && { scheduled_time_unix })
    };

    const createdBatchCall = await phoneService.createBatchCall(batchCallData);

    console.log('Batch call успешно создан:', {
      id: createdBatchCall.id,
      name: createdBatchCall.name,
      status: createdBatchCall.status,
      total_calls_scheduled: createdBatchCall.total_calls_scheduled,
      admin_id: adminId
    });

    res.status(201).json(createdBatchCall);
  } catch (error: any) {
    console.error('=== ОШИБКА СОЗДАНИЯ BATCH CALL ===');
    console.error('Error creating batch call:', error);
    console.error('Error stack:', error.stack);
    
    if (error.message.includes('валидации')) {
      return res.status(422).json({ 
        message: 'Ошибка валидации данных',
        details: error.message 
      });
    }
    
    if (error.message.includes('Неверные данные')) {
      return res.status(400).json({ 
        message: 'Неверные данные для создания batch call',
        details: error.message 
      });
    }
    
    res.status(500).json({ 
      message: 'Ошибка при создании batch call',
      details: error.message 
    });
  }
}; 