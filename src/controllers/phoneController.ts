import { Response, NextFunction } from 'express';
import { prisma } from '../services/database';
import { elevenLabsService } from '../services/elevenLabsService';
import { CustomRequest, AuthenticatedRequest } from '../types';
import { phoneService } from '../services/phoneService';

// Получить доступные номера телефонов
export const getPhoneNumbers = async (req: CustomRequest, res: Response, next: NextFunction) => {
  try {
    const { companyId } = req.user!;
    
    console.log(`[Company ${companyId}] Fetching phone numbers`);
    
    const phoneNumbers = await prisma.phoneNumber.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`[Company ${companyId}] Found ${phoneNumbers.length} phone numbers`);
    
    res.json({
      success: true,
      data: phoneNumbers,
      count: phoneNumbers.length
    });
  } catch (error) {
    console.error(`[Company ${req.user?.companyId}] Error fetching phone numbers:`, error);
    next(error);
  }
};

// Создать новый номер телефона
export const createPhoneNumber = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { companyId } = req.user!;
    const { phoneNumber, label, provider } = req.body;
    
    console.log(`[Company ${companyId}] Creating phone number: ${phoneNumber}`);
    console.log(`[Company ${companyId}] Request body:`, JSON.stringify(req.body, null, 2));

    // Валидация обязательных полей
    if (!phoneNumber || !label || !provider) {
      return res.status(400).json({
        success: false,
        message: 'Все поля обязательны',
        required: ['phoneNumber', 'label', 'provider'],
        received: { phoneNumber, label, provider }
      });
    }

    // Валидация провайдера
    if (!['twilio', 'sip_trunk'].includes(provider)) {
      return res.status(400).json({
        success: false,
        message: 'Недопустимый провайдер',
        allowed: ['twilio', 'sip_trunk'],
        received: provider
      });
    }

    // Проверяем уникальность номера в компании
    const existingPhone = await prisma.phoneNumber.findFirst({
      where: { 
        phoneNumber, 
        companyId 
      }
    });

    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: 'Номер телефона уже существует в компании'
      });
    }

    let providerData: any = {};
    let elevenLabsResponse: any = null;

    // Подготавливаем данные провайдера и создаем номер в ElevenLabs
    if (provider === 'twilio') {
      const { sid, token } = req.body;
      if (!sid || !token) {
        return res.status(400).json({
          success: false,
          message: 'Для Twilio требуются sid и token',
          required: ['sid', 'token']
        });
      }
      providerData = { sid, token };

      // Создаем номер в ElevenLabs
      elevenLabsResponse = await elevenLabsService.createTwilioPhoneNumber({
        label,
        phone_number: phoneNumber,
        sid,
        token
      });

    } else if (provider === 'sip_trunk') {
      const { 
        transport, 
        media_encryption, 
        address, 
        username, 
        password, 
        headers 
      } = req.body;

      // Для SIP trunk требуется как минимум адрес
      if (!address) {
        return res.status(400).json({
          success: false,
          message: 'Для SIP Trunk требуется адрес SIP сервера',
          required: ['address'],
          example: {
            address: '213.157.55.214:5060',
            transport: 'UDP',
            media_encryption: 'disabled',
            username: '3124531',
            password: 'moN<%02_06?@'
          }
        });
      }

      providerData = { 
        transport: (transport || 'udp').toLowerCase(),
        media_encryption: media_encryption || 'disabled',
        termination_uri: address, // Используем address как termination_uri
        headers: headers || {}
      };

      // Добавляем учетные данные если они переданы
      if (username && password) {
        providerData.credentials = { username, password };
      }

      // Создаем номер в ElevenLabs
      elevenLabsResponse = await elevenLabsService.createSIPTrunkPhoneNumber({
        label,
        phone_number: phoneNumber,
        transport: (transport || 'udp').toLowerCase() as 'auto' | 'udp' | 'tcp' | 'tls',
        media_encryption: media_encryption || 'disabled',
        termination_uri: address!, // address обязательно для SIP trunk
        credentials: (username && password) ? { username, password } : undefined,
        headers: headers || {}
      });
    }

    console.log(`[Company ${companyId}] ElevenLabs response:`, elevenLabsResponse);

    // Сохраняем ID из ElevenLabs в провайдерских данных
    if (elevenLabsResponse?.phone_number_id) {
      providerData.elevenlabs_phone_number_id = elevenLabsResponse.phone_number_id;
      providerData.elevenlabs_status = elevenLabsResponse.status;
      providerData.elevenlabs_created_at = elevenLabsResponse.created_at;
    }

    // Создаем номер телефона в локальной базе данных
    const newPhoneNumber = await prisma.phoneNumber.create({
      data: {
        phoneNumber: phoneNumber as string,
        label: label as string,
        provider: provider as string,
        companyId: companyId as string,
        providerData: JSON.stringify(providerData)
      }
    });

    console.log(`[Company ${companyId}] Phone number created successfully: ${newPhoneNumber.id}`);

    res.status(201).json({
      success: true,
      data: {
        ...newPhoneNumber,
        providerData: JSON.parse(newPhoneNumber.providerData || '{}'),
        elevenLabsResponse
      },
      message: 'Номер телефона успешно создан'
    });
  } catch (error) {
    console.error(`[Company ${req.user?.companyId}] Error creating phone number:`, error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при создании номера телефона',
      error: error instanceof Error ? error.message : 'Неизвестная ошибка'
    });
  }
};

// Получить номер телефона по ID
export const getPhoneNumberById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { companyId } = req.user!;
    const { id } = req.params;
    
    console.log(`[Company ${companyId}] Fetching phone number: ${id}`);
    
    const phoneNumber = await prisma.phoneNumber.findUnique({
      where: { id }
    });
    
    if (!phoneNumber || phoneNumber.companyId !== companyId) {
      console.log(`[Company ${companyId}] Phone number not found: ${id}`);
      return res.status(404).json({
        success: false,
        message: 'Номер телефона не найден'
      });
    }
    
    console.log(`[Company ${companyId}] Phone number found: ${phoneNumber.id}`);
    
    res.json({
      success: true,
      data: phoneNumber
    });
  } catch (error) {
    console.error(`[Company ${req.user?.companyId}] Error fetching phone number:`, error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении номера телефона'
    });
  }
};

// Удалить номер телефона
export const deletePhoneNumber = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { companyId } = req.user!;
    const { phoneNumberId } = req.params;

    console.log(`[Company ${companyId}] Deleting phone number: ${phoneNumberId}`);

    // Получаем номер телефона из базы
    const phoneNumber = await prisma.phoneNumber.findUnique({
      where: { id: phoneNumberId }
    });

    if (!phoneNumber || phoneNumber.companyId !== companyId) {
      console.log(`[Company ${companyId}] Phone number not found: ${phoneNumberId}`);
      return res.status(404).json({
        success: false,
        message: 'Номер телефона не найден'
      });
    }

    // Получаем ID номера в ElevenLabs
    let elevenLabsPhoneNumberId: string | undefined;
    try {
      const providerData = phoneNumber.providerData ? JSON.parse(phoneNumber.providerData) : {};
      elevenLabsPhoneNumberId = providerData.elevenlabs_phone_number_id;
    } catch (e) {
      console.warn(`[Company ${companyId}] Не удалось распарсить providerData для номера: ${phoneNumberId}`);
    }

    // Удаляем номер в ElevenLabs, если есть ID
    if (elevenLabsPhoneNumberId) {
      try {
        await phoneService.deletePhoneNumber(elevenLabsPhoneNumberId);
        console.log(`[Company ${companyId}] Phone number deleted in ElevenLabs: ${elevenLabsPhoneNumberId}`);
      } catch (err: any) {
        console.error(`[Company ${companyId}] Ошибка при удалении номера в ElevenLabs:`, err.message);
        return res.status(500).json({
          success: false,
          message: `Ошибка при удалении номера в ElevenLabs: ${err.message}`
        });
      }
    } else {
      console.warn(`[Company ${companyId}] Нет elevenlabs_phone_number_id для номера: ${phoneNumberId}`);
    }

    // Удаляем номер из локальной базы
    await prisma.phoneNumber.delete({
      where: { id: phoneNumberId }
    });

    console.log(`[Company ${companyId}] Phone number deleted successfully: ${phoneNumberId}`);

    res.json({
      success: true,
      message: 'Номер телефона успешно удален'
    });
  } catch (error: any) {
    console.error(`[Company ${req.user?.companyId}] Error deleting phone number:`, error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при удалении номера телефона',
      error: error.message || error
    });
  }
}; 