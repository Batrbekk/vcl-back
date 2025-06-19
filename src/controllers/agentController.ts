import { Request, Response } from 'express';
import { ElevenLabsAgent } from '../models/ElevenLabsAgent';
import { User } from '../models/User';
import { elevenLabsService } from '../services/elevenLabsService';
import multer from 'multer';

// Получение и синхронизация списка агентов из ElevenLabs
export const getAgents = async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const { cursor, page_size, search, sync } = req.query;

    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Администратор не найден' });
    }

    // Если запрос включает синхронизацию или база данных пуста
    if (sync === 'true' || await ElevenLabsAgent.countDocuments({ adminId }) === 0) {
      try {
        // Получаем агентов из ElevenLabs
        const elevenLabsResponse = await elevenLabsService.getAgents(
          cursor as string,
          page_size ? parseInt(page_size as string) : 30,
          search as string
        );

        // Синхронизируем с базой данных
        for (const agent of elevenLabsResponse.agents) {
          await ElevenLabsAgent.findOneAndUpdate(
            { agent_id: agent.agent_id },
            {
              ...agent,
              adminId,
              synced_at: new Date()
            },
            { upsert: true, new: true }
          );
        }

        // Возвращаем ответ с данными ElevenLabs
        return res.json({
          agents: elevenLabsResponse.agents,
          next_cursor: elevenLabsResponse.next_cursor,
          has_more: elevenLabsResponse.has_more,
          synced: true,
          synced_at: new Date()
        });
      } catch (elevenLabsError) {
        console.error('ElevenLabs sync error:', elevenLabsError);
        // Fallback: возвращаем данные из MongoDB если синхронизация не удалась
      }
    }

    // Получаем данные из MongoDB
    const filter: any = { adminId };
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    const agents = await ElevenLabsAgent.find(filter)
      .sort({ created_at_unix_secs: -1 })
      .limit(page_size ? parseInt(page_size as string) : 30);

    res.json({
      agents: agents.map(agent => ({
        agent_id: agent.agent_id,
        name: agent.name,
        tags: agent.tags,
        created_at_unix_secs: agent.created_at_unix_secs,
        access_info: agent.access_info
      })),
      next_cursor: null,
      has_more: false,
      synced: false,
      synced_at: agents[0]?.synced_at
    });
  } catch (error: any) {
    console.error('Error getting agents:', error);
    res.status(500).json({ message: 'Ошибка при получении списка агентов' });
  }
};

// Получение детальной информации об агенте по ID
export const getAgentById = async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const agentId = req.params.id;
    const { sync } = req.query;

    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Администратор не найден' });
    }

    // Если запрошена синхронизация или агент не найден в базе
    const localAgent = await ElevenLabsAgent.findOne({ agent_id: agentId, adminId });
    
    if (sync === 'true' || !localAgent) {
      try {
        // Получаем детальную информацию из ElevenLabs
        const elevenLabsAgent = await elevenLabsService.getAgentById(agentId);

        // Сохраняем/обновляем в MongoDB
        const savedAgent = await ElevenLabsAgent.findOneAndUpdate(
          { agent_id: agentId },
          {
            ...elevenLabsAgent,
            tags: elevenLabsAgent.tags || [],
            adminId,
            synced_at: new Date()
          },
          { upsert: true, new: true }
        );

        return res.json({
          ...elevenLabsAgent,
          synced: true,
          synced_at: savedAgent.synced_at
        });
      } catch (elevenLabsError) {
        console.error('ElevenLabs sync error:', elevenLabsError);
        // Fallback: если синхронизация не удалась, попробуем вернуть из MongoDB
      }
    }

    // Возвращаем из MongoDB
    if (localAgent) {
      return res.json({
        agent_id: localAgent.agent_id,
        name: localAgent.name,
        conversation_config: localAgent.conversation_config,
        metadata: localAgent.metadata,
        platform_settings: localAgent.platform_settings,
        phone_numbers: localAgent.phone_numbers,
        access_info: localAgent.access_info,
        tags: localAgent.tags,
        synced: false,
        synced_at: localAgent.synced_at
      });
    }

    res.status(404).json({ message: 'Агент не найден' });
  } catch (error: any) {
    console.error('Error getting agent by ID:', error);
    res.status(500).json({ message: 'Ошибка при получении агента' });
  }
};

// Принудительная синхронизация всех агентов
export const syncAgents = async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;

    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Администратор не найден' });
    }

    let allAgents: any[] = [];
    let cursor: string | null = null;
    let hasMore = true;

    // Получаем всех агентов с пагинацией
    while (hasMore) {
      const response = await elevenLabsService.getAgents(cursor || undefined, 100);
      allAgents = allAgents.concat(response.agents);
      cursor = response.next_cursor;
      hasMore = response.has_more;
    }

    // Синхронизируем с базой данных
    let syncedCount = 0;
    for (const agent of allAgents) {
      await ElevenLabsAgent.findOneAndUpdate(
        { agent_id: agent.agent_id },
        {
          ...agent,
          adminId,
          synced_at: new Date()
        },
        { upsert: true, new: true }
      );
      syncedCount++;
    }

    res.json({
      message: 'Синхронизация завершена',
      synced_count: syncedCount,
      total_agents: allAgents.length,
      synced_at: new Date()
    });
  } catch (error: any) {
    console.error('Error syncing agents:', error);
    res.status(500).json({ message: 'Ошибка при синхронизации агентов' });
  }
};

// Получение статистики синхронизации
export const getSyncStats = async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;

    const totalAgents = await ElevenLabsAgent.countDocuments({ adminId });
    const lastSyncAgent = await ElevenLabsAgent.findOne({ adminId })
      .sort({ synced_at: -1 })
      .select('synced_at');

    res.json({
      total_agents: totalAgents,
      last_sync: lastSyncAgent?.synced_at || null,
      needs_sync: !lastSyncAgent || Date.now() - lastSyncAgent.synced_at.getTime() > 24 * 60 * 60 * 1000 // 24 часа
    });
  } catch (error: any) {
    console.error('Error getting sync stats:', error);
    res.status(500).json({ message: 'Ошибка при получении статистики синхронизации' });
  }
};

// Удаление агента
export const deleteAgent = async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const agentId = req.params.id;

    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Администратор не найден' });
    }

    // Проверяем, существует ли агент в нашей базе
    const localAgent = await ElevenLabsAgent.findOne({ agent_id: agentId, adminId });
    if (!localAgent) {
      return res.status(404).json({ message: 'Агент не найден в локальной базе данных' });
    }

    try {
      // Удаляем агента из ElevenLabs
      await elevenLabsService.deleteAgent(agentId);
      
      // Удаляем агента из MongoDB
      await ElevenLabsAgent.findOneAndDelete({ agent_id: agentId, adminId });

      res.json({
        message: 'Агент успешно удален',
        agent_id: agentId,
        deleted_at: new Date()
      });
    } catch (elevenLabsError: any) {
      // Если не удалось удалить из ElevenLabs, проверяем причину
      if (elevenLabsError.message.includes('404') || elevenLabsError.message.includes('не найден')) {
        // Агент уже не существует в ElevenLabs, удаляем только из MongoDB
        await ElevenLabsAgent.findOneAndDelete({ agent_id: agentId, adminId });
        
        return res.json({
          message: 'Агент удален из локальной базы (не найден в ElevenLabs)',
          agent_id: agentId,
          deleted_at: new Date(),
          warning: 'Агент уже был удален из ElevenLabs'
        });
      }
      
      // Если другая ошибка, не удаляем из MongoDB и возвращаем ошибку
      throw elevenLabsError;
    }
  } catch (error: any) {
    console.error('Error deleting agent:', error);
    res.status(500).json({ 
      message: 'Ошибка при удалении агента',
      details: error.message 
    });
  }
};

// Получение доступных LLM моделей и их цен
export const getLLMPrices = async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const { agent_id } = req.query;

    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Администратор не найден' });
    }

    // Получаем информацию о ценах LLM моделей из ElevenLabs
    const llmPricesData = await elevenLabsService.getLLMPrices(agent_id as string);

    res.json({
      message: 'Информация о доступных LLM моделях получена',
      ...llmPricesData,
      retrieved_at: new Date()
    });
  } catch (error: any) {
    console.error('Error getting LLM prices:', error);
    res.status(500).json({ 
      message: 'Ошибка при получении информации о LLM моделях',
      details: error.message 
    });
  }
};

// Получение списка базы знаний
export const getKnowledgeBase = async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const { cursor, page_size } = req.query;

    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Администратор не найден' });
    }

    // Получаем список базы знаний из ElevenLabs
    const knowledgeBaseData = await elevenLabsService.getKnowledgeBase(
      cursor as string,
      page_size ? parseInt(page_size as string) : 30
    );

    res.json({
      message: 'Список базы знаний получен',
      ...knowledgeBaseData,
      retrieved_at: new Date()
    });
  } catch (error: any) {
    console.error('Error getting knowledge base:', error);
    res.status(500).json({ 
      message: 'Ошибка при получении списка базы знаний',
      details: error.message 
    });
  }
};

// Обновление агента
export const updateAgent = async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const agentId = req.params.id;
    const updateData = req.body;

    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Администратор не найден' });
    }

    // Проверяем, существует ли агент в нашей базе
    const localAgent = await ElevenLabsAgent.findOne({ agent_id: agentId, adminId });
    if (!localAgent) {
      return res.status(404).json({ message: 'Агент не найден в локальной базе данных' });
    }

    // Обновляем агента в ElevenLabs
    const updatedAgent = await elevenLabsService.updateAgent(agentId, updateData);

    // Синхронизируем обновленные данные с MongoDB
    const savedAgent = await ElevenLabsAgent.findOneAndUpdate(
      { agent_id: agentId, adminId },
      {
        ...updatedAgent,
        tags: updatedAgent.tags || [],
        adminId,
        synced_at: new Date()
      },
      { new: true }
    );

    res.json({
      message: 'Агент успешно обновлен',
      ...updatedAgent,
      synced: true,
      synced_at: savedAgent?.synced_at || new Date(),
      updated_at: new Date()
    });
  } catch (error: any) {
    console.error('Error updating agent:', error);
    res.status(500).json({ 
      message: 'Ошибка при обновлении агента',
      details: error.message 
    });
  }
};

// Получение списка разговоров агентов
export const getConversations = async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const { 
      cursor, 
      agent_id, 
      call_successful, 
      call_start_before_unix, 
      call_start_after_unix, 
      page_size 
    } = req.query;

    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Администратор не найден' });
    }

    // Получаем список разговоров из ElevenLabs
    const conversationsData = await elevenLabsService.getConversations({
      cursor: cursor as string,
      agent_id: agent_id as string,
      call_successful: call_successful as 'success' | 'failure' | 'unknown',
      call_start_before_unix: call_start_before_unix ? parseInt(call_start_before_unix as string) : undefined,
      call_start_after_unix: call_start_after_unix ? parseInt(call_start_after_unix as string) : undefined,
      page_size: page_size ? parseInt(page_size as string) : 100
    });

    res.json({
      message: 'Список разговоров получен',
      ...conversationsData,
      retrieved_at: new Date()
    });
  } catch (error: any) {
    console.error('Error getting conversations:', error);
    res.status(500).json({ 
      message: 'Ошибка при получении списка разговоров',
      details: error.message 
    });
  }
};

// Получение детальной информации о разговоре по ID
export const getConversationById = async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const conversationId = req.params.id;

    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Администратор не найден' });
    }

    // Получаем детальную информацию о разговоре из ElevenLabs
    const conversationData = await elevenLabsService.getConversationById(conversationId);

    res.json({
      message: 'Детали разговора получены',
      ...conversationData,
      retrieved_at: new Date()
    });
  } catch (error: any) {
    console.error('Error getting conversation details:', error);
    res.status(500).json({ 
      message: 'Ошибка при получении деталей разговора',
      details: error.message 
    });
  }
};

// Получение аудио файла разговора по ID
export const getConversationAudio = async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const conversationId = req.params.id;

    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Администратор не найден' });
    }

    // Получаем аудио файл разговора из ElevenLabs
    const audioBuffer = await elevenLabsService.getConversationAudio(conversationId);

    // Устанавливаем правильные заголовки для аудио файла
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Disposition': `attachment; filename="conversation_${conversationId}.mp3"`,
      'Content-Length': audioBuffer.length.toString()
    });

    res.send(audioBuffer);
  } catch (error: any) {
    console.error('Error getting conversation audio:', error);
    res.status(500).json({ 
      message: 'Ошибка при получении аудио файла разговора',
      details: error.message 
    });
  }
};

// Удаление разговора по ID
export const deleteConversation = async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const conversationId = req.params.id;

    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Администратор не найден' });
    }

    // Удаляем разговор из ElevenLabs
    await elevenLabsService.deleteConversation(conversationId);

    res.json({
      message: 'Разговор успешно удален',
      conversation_id: conversationId,
      deleted_at: new Date()
    });
  } catch (error: any) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ 
      message: 'Ошибка при удалении разговора',
      details: error.message 
    });
  }
};

// Создание нового агента
export const createAgent = async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const { name } = req.body;

    console.log('=== КОНТРОЛЛЕР СОЗДАНИЯ АГЕНТА ===');
    console.log('Admin ID:', adminId);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Extracted name:', name);

    // Валидация входных данных
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      console.log('Валидация не прошла: некорректное имя');
      return res.status(400).json({ 
        message: 'Имя агента обязательно и должно быть непустой строкой' 
      });
    }

    const admin = await User.findById(adminId);
    if (!admin) {
      console.log('Администратор не найден');
      return res.status(404).json({ message: 'Администратор не найден' });
    }

    console.log('Администратор найден:', `${admin.firstName} ${admin.lastName}`);
    console.log('Вызываем elevenLabsService.createAgent с именем:', name.trim());

    // Создаем агента в ElevenLabs
    const newAgent = await elevenLabsService.createAgent({ name: name.trim() });

    console.log('Агент успешно создан в ElevenLabs, ID:', newAgent.agent_id);

    // Сохраняем агента в MongoDB
    const savedAgent = await ElevenLabsAgent.findOneAndUpdate(
      { agent_id: newAgent.agent_id },
      {
        ...newAgent,
        adminId,
        synced_at: new Date()
      },
      { upsert: true, new: true }
    );

    console.log('Агент сохранен в MongoDB');

    const response = {
      message: 'Агент успешно создан',
      ...newAgent,
      synced: true,
      synced_at: savedAgent.synced_at,
      created_at: new Date()
    };

    console.log('Отправляем ответ клиенту');
    res.status(201).json(response);
  } catch (error: any) {
    console.error('=== ОШИБКА В КОНТРОЛЛЕРЕ ===');
    console.error('Error creating agent:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Ошибка при создании агента',
      details: error.message 
    });
  }
};

export const createKnowledgeBaseFromFile = async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const file = (req as any).file as Express.Multer.File;

    if (!file) {
      return res.status(400).json({ message: 'Файл обязателен для создания базы знаний' });
    }

    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Администратор не найден' });
    }

    console.log('=== СОЗДАНИЕ БАЗЫ ЗНАНИЙ ИЗ ФАЙЛА ===');
    console.log('Admin ID:', adminId);
    console.log('File info:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });

    // Создаем базу знаний из файла в ElevenLabs
    const knowledgeBaseData = await elevenLabsService.createKnowledgeBaseFromFile({
      file: file.buffer,
      filename: file.originalname,
      mimetype: file.mimetype
    });

    console.log('База знаний из файла успешно создана:', JSON.stringify(knowledgeBaseData, null, 2));

    res.status(201).json({
      message: 'База знаний из файла успешно создана',
      ...knowledgeBaseData,
      created_at: new Date()
    });
  } catch (error: any) {
    console.error('=== ОШИБКА СОЗДАНИЯ БАЗЫ ЗНАНИЙ ИЗ ФАЙЛА ===');
    console.error('Error creating knowledge base from file:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Ошибка при создании базы знаний из файла',
      details: error.message 
    });
  }
};

export const createKnowledgeBaseFromText = async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const { text, name } = req.body;

    if (!text || !name) {
      return res.status(400).json({ message: 'Текст и название обязательны для создания базы знаний' });
    }

    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Администратор не найден' });
    }

    console.log('=== СОЗДАНИЕ БАЗЫ ЗНАНИЙ ИЗ ТЕКСТА ===');
    console.log('Admin ID:', adminId);
    console.log('Name:', name);
    console.log('Text length:', text.length);

    // Создаем базу знаний из текста в ElevenLabs
    const knowledgeBaseData = await elevenLabsService.createKnowledgeBaseFromText({
      text,
      name
    });

    console.log('База знаний из текста успешно создана:', JSON.stringify(knowledgeBaseData, null, 2));

    res.status(201).json({
      message: 'База знаний из текста успешно создана',
      ...knowledgeBaseData,
      created_at: new Date()
    });
  } catch (error: any) {
    console.error('=== ОШИБКА СОЗДАНИЯ БАЗЫ ЗНАНИЙ ИЗ ТЕКСТА ===');
    console.error('Error creating knowledge base from text:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Ошибка при создании базы знаний из текста',
      details: error.message 
    });
  }
};

export const createKnowledgeBase = async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ message: 'URL обязателен для создания базы знаний' });
    }

    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Администратор не найден' });
    }

    console.log('=== СОЗДАНИЕ БАЗЫ ЗНАНИЙ ===');
    console.log('Admin ID:', adminId);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('URL для создания базы знаний:', url);

    // Создаем базу знаний в ElevenLabs
    const knowledgeBaseData = await elevenLabsService.createKnowledgeBase({ url });

    console.log('База знаний успешно создана:', JSON.stringify(knowledgeBaseData, null, 2));

    res.status(201).json({
      message: 'База знаний успешно создана',
      ...knowledgeBaseData,
      created_at: new Date()
    });
  } catch (error: any) {
    console.error('=== ОШИБКА СОЗДАНИЯ БАЗЫ ЗНАНИЙ ===');
    console.error('Error creating knowledge base:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Ошибка при создании базы знаний',
      details: error.message 
    });
  }
};

export const deleteKnowledgeBase = async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'ID базы знаний обязателен' });
    }

    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Администратор не найден' });
    }

    console.log('=== УДАЛЕНИЕ БАЗЫ ЗНАНИЙ ===');
    console.log('Admin ID:', adminId);
    console.log('Knowledge Base ID:', id);

    // Удаляем базу знаний в ElevenLabs
    await elevenLabsService.deleteKnowledgeBase(id);

    console.log('База знаний успешно удалена:', id);

    res.status(200).json({
      message: 'База знаний успешно удалена',
      knowledge_base_id: id,
      deleted_at: new Date()
    });
  } catch (error: any) {
    console.error('=== ОШИБКА УДАЛЕНИЯ БАЗЫ ЗНАНИЙ ===');
    console.error('Error deleting knowledge base:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Ошибка при удалении базы знаний',
      details: error.message 
    });
  }
};

export const getKnowledgeBaseById = async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'ID базы знаний обязателен' });
    }

    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Администратор не найден' });
    }

    console.log('=== ПОЛУЧЕНИЕ БАЗЫ ЗНАНИЙ ПО ID ===');
    console.log('Admin ID:', adminId);
    console.log('Knowledge Base ID:', id);

    // Получаем детальную информацию о базе знаний из ElevenLabs
    const knowledgeBaseDetail = await elevenLabsService.getKnowledgeBaseById(id);

    console.log('База знаний успешно получена:', {
      id: knowledgeBaseDetail.id,
      name: knowledgeBaseDetail.name,
      type: knowledgeBaseDetail.type
    });

    res.status(200).json(knowledgeBaseDetail);
  } catch (error: any) {
    console.error('=== ОШИБКА ПОЛУЧЕНИЯ БАЗЫ ЗНАНИЙ ===');
    console.error('Error getting knowledge base:', error);
    console.error('Error stack:', error.stack);
    
    if (error.message === 'База знаний не найдена') {
      return res.status(404).json({ 
        message: 'База знаний не найдена',
        details: error.message 
      });
    }
    
    res.status(500).json({ 
      message: 'Ошибка при получении базы знаний',
      details: error.message 
    });
  }
};

export const getRagIndexOverview = async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;

    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Администратор не найден' });
    }

    console.log('=== ПОЛУЧЕНИЕ RAG INDEX OVERVIEW ===');
    console.log('Admin ID:', adminId);

    // Получаем информацию о RAG индексе из ElevenLabs
    const ragIndexData = await elevenLabsService.getRagIndexOverview();

    console.log('RAG Index Overview успешно получен:', {
      total_used_bytes: ragIndexData.total_used_bytes,
      total_max_bytes: ragIndexData.total_max_bytes,
      models_count: ragIndexData.models.length
    });

    res.status(200).json(ragIndexData);
  } catch (error: any) {
    console.error('=== ОШИБКА ПОЛУЧЕНИЯ RAG INDEX OVERVIEW ===');
    console.error('Error getting RAG index overview:', error);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({ 
      message: 'Ошибка при получении информации о RAG индексе',
      details: error.message 
    });
  }
};

export const getConversationSignedUrl = async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const { agent_id } = req.query;

    if (!agent_id || typeof agent_id !== 'string') {
      return res.status(400).json({ message: 'agent_id обязателен в query параметрах' });
    }

    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Администратор не найден' });
    }

    console.log('=== ПОЛУЧЕНИЕ ПОДПИСАННОГО URL ДЛЯ РАЗГОВОРА ===');
    console.log('Admin ID:', adminId);
    console.log('Agent ID:', agent_id);

    // Получаем подписанный URL для WebSocket соединения из ElevenLabs
    const signedUrlData = await elevenLabsService.getConversationSignedUrl(agent_id);

    console.log('Подписанный URL успешно получен для агента:', agent_id);

    res.status(200).json(signedUrlData);
  } catch (error: any) {
    console.error('=== ОШИБКА ПОЛУЧЕНИЯ ПОДПИСАННОГО URL ===');
    console.error('Error getting conversation signed URL:', error);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({ 
      message: 'Ошибка при получении подписанного URL для разговора',
      details: error.message 
    });
  }
}; 