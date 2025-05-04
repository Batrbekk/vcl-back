import { Request, Response } from 'express';
import { Agent } from '../models/Agent';
import { User } from '../models/User';

// Создание агента
export const createAgent = async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const admin = await User.findById(adminId);
    
    if (!admin) {
      return res.status(404).json({ message: 'Администратор не найден' });
    }

    const agent = new Agent({
      ...req.body,
      adminId
    });

    await agent.save();

    res.status(201).json({
      message: 'Агент успешно создан',
      agent
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при создании агента' });
  }
};

// Получение списка агентов
export const getAgents = async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const { name, is_active } = req.query;
    
    const filter: any = { adminId };
    
    if (name) {
      filter.name = { $regex: name, $options: 'i' };
    }
    
    if (is_active !== undefined) {
      filter.is_active = is_active === 'true';
    }
    
    const agents = await Agent.find(filter);
    res.json(agents);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при получении списка агентов' });
  }
};

// Получение агента по ID
export const getAgentById = async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const agent = await Agent.findOne({
      _id: req.params.id,
      adminId
    });

    if (!agent) {
      return res.status(404).json({ message: 'Агент не найден' });
    }
    res.json(agent);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при получении агента' });
  }
};

// Обновление агента
export const updateAgent = async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const agentId = req.params.id;

    const agent = await Agent.findOneAndUpdate(
      { _id: agentId, adminId },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!agent) {
      return res.status(404).json({ message: 'Агент не найден' });
    }

    res.json({
      message: 'Агент успешно обновлен',
      agent
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при обновлении агента' });
  }
};

// Удаление агента
export const deleteAgent = async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const agent = await Agent.findOneAndDelete({
      _id: req.params.id,
      adminId
    });

    if (!agent) {
      return res.status(404).json({ message: 'Агент не найден' });
    }
    res.json({ message: 'Агент успешно удален' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при удалении агента' });
  }
};

// Обновление статуса активности
export const updateAgentStatus = async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ message: 'Неверный формат статуса' });
    }

    const agent = await Agent.findOneAndUpdate(
      { _id: req.params.id, adminId },
      { $set: { is_active } },
      { new: true }
    );

    if (!agent) {
      return res.status(404).json({ message: 'Агент не найден' });
    }

    res.json({
      message: 'Статус агента успешно обновлен',
      agent
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при обновлении статуса агента' });
  }
};

// Запуск AI-звонка
export const startAgentCall = async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const { leadId, phone } = req.body;

    const agent = await Agent.findOne({
      _id: req.params.id,
      adminId,
      is_active: true
    });

    if (!agent) {
      return res.status(404).json({ message: 'Агент не найден или неактивен' });
    }

    // TODO: Здесь будет логика интеграции с сервисом звонков
    res.json({
      message: 'Звонок успешно инициирован',
      callDetails: {
        agentId: agent._id,
        leadId,
        phone,
        status: 'initiated'
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при инициации звонка' });
  }
};

// Получение итогов звонка
export const getCallSummary = async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const { leadId } = req.query;

    const agent = await Agent.findOne({
      _id: req.params.id,
      adminId
    });

    if (!agent) {
      return res.status(404).json({ message: 'Агент не найден' });
    }

    // TODO: Здесь будет логика получения итогов звонка
    res.json({
      message: 'Итоги звонка получены',
      summary: {
        agentId: agent._id,
        leadId,
        status: 'completed',
        duration: '00:02:35',
        recording_url: 'https://example.com/recording.mp3',
        transcript: 'Текст разговора...',
        summary: 'Краткое содержание разговора...'
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при получении итогов звонка' });
  }
};

// Генерация демо-записи
export const generateVoicePreview = async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const { text } = req.body;

    const agent = await Agent.findOne({
      _id: req.params.id,
      adminId
    });

    if (!agent) {
      return res.status(404).json({ message: 'Агент не найден' });
    }

    // TODO: Здесь будет логика генерации демо-записи
    res.json({
      message: 'Демо-запись успешно сгенерирована',
      preview: {
        agentId: agent._id,
        text,
        audio_url: 'https://example.com/preview.mp3'
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при генерации демо-записи' });
  }
};

// Обновление голосовых настроек
export const updateVoiceSettings = async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const { voice_settings } = req.body;

    const agent = await Agent.findOneAndUpdate(
      { _id: req.params.id, adminId },
      { $set: { voice_settings } },
      { new: true, runValidators: true }
    );

    if (!agent) {
      return res.status(404).json({ message: 'Агент не найден' });
    }

    res.json({
      message: 'Голосовые настройки успешно обновлены',
      agent
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при обновлении голосовых настроек' });
  }
}; 