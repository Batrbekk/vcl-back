import { Response, NextFunction } from 'express';
import { prisma } from '../services/database';
import { elevenLabsService } from '../services/elevenLabsService';
import { CustomRequest, AuthenticatedRequest } from '../types';

// Функция для валидации и преобразования данных обновления агента
const validateAndTransformUpdateData = (updateData: any): any => {
  const transformedData = JSON.parse(JSON.stringify(updateData)); // Deep copy
  
  if (transformedData.conversation_config) {
    const config = transformedData.conversation_config;
    
    // Исправляем ASR настройки
    if (config.asr) {
      // Заменяем "default" на правильное значение
      if (config.asr.provider === 'default') {
        config.asr.provider = 'elevenlabs';
      }
      // Заменяем "wav" на правильный PCM формат
      if (config.asr.user_input_audio_format === 'wav') {
        config.asr.user_input_audio_format = 'pcm_16000';
      }
    }
    
    // Исправляем Turn настройки
    if (config.turn) {
      // Заменяем "auto" на правильное значение
      if (config.turn.mode === 'auto') {
        config.turn.mode = 'turn';
      }
    }
    
    // Исправляем TTS настройки
    if (config.tts) {
      // Заменяем "default" на правильную TTS модель
      if (config.tts.model_id === 'default') {
        config.tts.model_id = 'eleven_turbo_v2_5';
      }
      // Заменяем "wav" на правильный PCM формат
      if (config.tts.agent_output_audio_format === 'wav') {
        config.tts.agent_output_audio_format = 'pcm_16000';
      }
    }
    
    // Исправляем Conversation настройки
    if (config.conversation) {
      // Добавляем обязательные client_events если массив пустой
      if (!config.conversation.client_events || config.conversation.client_events.length === 0) {
        config.conversation.client_events = ['hang_up', 'phone_call_connected'];
      }
    }
    
    // Исправляем Agent настройки
    if (config.agent?.prompt?.rag) {
      // Заменяем "default" на правильную embedding модель
      if (config.agent.prompt.rag.embedding_model === 'default') {
        config.agent.prompt.rag.embedding_model = 'e5_mistral_7b_instruct';
      }
    }
  }
  
  return transformedData;
};

// Получить всех агентов компании
export const getAgents = async (req: CustomRequest, res: Response, next: NextFunction) => {
  try {
    const { companyId } = req.user!;
    
    console.log(`[Company ${companyId}] Fetching agents`);
    
    const agents = await prisma.agent.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`[Company ${companyId}] Found ${agents.length} agents`);

    res.json({
      success: true,
      data: agents,
      count: agents.length
    });
  } catch (error) {
    console.error(`[Company ${req.user?.companyId}] Error fetching agents:`, error);
    next(error);
  }
};

// Создать нового агента
export const createAgent = async (req: CustomRequest, res: Response, next: NextFunction) => {
  try {
    const { companyId } = req.user!;
    const { name } = req.body;
    
    console.log(`[Company ${companyId}] Creating agent: ${name}`);
    
    // Создаем агента в ElevenLabs
    const elevenLabsAgent = await elevenLabsService.createAgent({
      name
    });
    
    // Сохраняем агента в базе данных
    const agent = await prisma.agent.create({
      data: {
        name,
        description: 'Default agent description',
        voiceId: 'default',
        voiceStability: 0.5,
        voiceSimilarityBoost: 0.5,
        voiceStyle: 0.5,
        voiceUseSpeakerBoost: true,
        voiceSpeed: 1.0,
        language: 'ru',
        gender: 'male',
        greetingTemplate: 'Hello! How can I help you today?',
        fallbackTemplate: 'I\'m sorry, I didn\'t understand that. Could you please repeat?',
        summaryTemplate: 'Thank you for your time. Have a great day!',
        allowedHoursStart: '09:00',
        allowedHoursEnd: '17:00',
        allowedHoursTimezone: 'UTC',
        integratedWithAi: true,
        aiModel: 'gpt-3.5-turbo',
        aiContextPrompt: 'You are a helpful assistant.',
        phoneNumber: '',
        isActive: true,
        adminId: req.user!.id,
        companyId,
        elevenLabsAgentId: elevenLabsAgent.agent_id
      }
    });
    
    console.log(`[Company ${companyId}] Agent created successfully: ${agent.id}`);
    
    res.status(201).json({
      success: true,
      data: agent,
      message: 'Agent created successfully'
    });
  } catch (error) {
    console.error(`[Company ${req.user?.companyId}] Error creating agent:`, error);
    next(error);
  }
};

// Получить агента по ID
export const getAgentById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { companyId } = req.user!;
    const { id } = req.params;
    const { sync } = req.query;
    
    console.log(`[Company ${companyId}] Fetching agent: ${id}${sync ? ' (with sync)' : ''}`);
    
    const agent = await prisma.agent.findUnique({
      where: { 
        id,
        companyId 
      }
    });
    
    if (!agent) {
      console.log(`[Company ${companyId}] Agent not found: ${id}`);
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }
    
    console.log(`[Company ${companyId}] Agent found: ${agent.id}`);

    // Если указан параметр sync=true, синхронизируем данные с ElevenLabs
    if (sync === 'true' && agent.elevenLabsAgentId) {
      try {
        console.log(`[Company ${companyId}] Syncing agent data from ElevenLabs: ${agent.elevenLabsAgentId}`);
        
        // Получаем актуальные данные агента из ElevenLabs
        const elevenLabsAgent = await elevenLabsService.getAgentById(agent.elevenLabsAgentId);
        
        // Обновляем локальную базу данных с актуальными данными
        const updatedAgent = await prisma.agent.update({
          where: { id: agent.id },
          data: {
            name: elevenLabsAgent.name,
            language: elevenLabsAgent.conversation_config.agent.language || 'ru',
            voiceId: elevenLabsAgent.conversation_config.tts.voice_id || 'default',
            voiceStability: elevenLabsAgent.conversation_config.tts.stability || 0.5,
            voiceSimilarityBoost: elevenLabsAgent.conversation_config.tts.similarity_boost || 0.5,
            voiceSpeed: elevenLabsAgent.conversation_config.tts.speed || 1.0,
            greetingTemplate: elevenLabsAgent.conversation_config.agent.first_message || 'Hello! How can I help you today?',
            aiModel: elevenLabsAgent.conversation_config.agent.prompt.llm || 'gpt-3.5-turbo',
            aiContextPrompt: elevenLabsAgent.conversation_config.agent.prompt.prompt || 'You are a helpful assistant.',
            allowedHoursStart: '09:00',
            allowedHoursEnd: '17:00',
            allowedHoursTimezone: 'UTC',
            updatedAt: new Date()
          }
        });
        
        console.log(`[Company ${companyId}] Agent data synchronized successfully: ${updatedAgent.id}`);
        
        res.json({
          success: true,
          data: updatedAgent,
          synced: true
        });
      } catch (syncError) {
        console.error(`[Company ${companyId}] Error syncing agent data:`, syncError);
        
        // Если синхронизация не удалась, возвращаем локальные данные
        res.json({
          success: true,
          data: agent,
          synced: false,
          syncError: 'Failed to sync with ElevenLabs'
        });
      }
    } else {
      // Возвращаем локальные данные без синхронизации
      res.json({
        success: true,
        data: agent
      });
    }
  } catch (error) {
    console.error(`[Company ${req.user?.companyId}] Error fetching agent:`, error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error'
    });
  }
};

// Синхронизировать агентов с ElevenLabs
export const syncAgents = async (req: CustomRequest, res: Response, next: NextFunction) => {
  try {
    const { companyId } = req.user!;
    
    console.log(`[Company ${companyId}] Starting agents sync`);
    
    // Получаем всех агентов из ElevenLabs
    const elevenLabsResponse = await elevenLabsService.getAgents();
    
    let syncedCount = 0;
    let createdCount = 0;
    
    for (const elevenLabsAgent of elevenLabsResponse.agents) {
      // Проверяем, есть ли уже такой агент в базе
      const existingAgent = await prisma.agent.findFirst({
        where: {
          elevenLabsAgentId: elevenLabsAgent.agent_id,
          companyId
        }
      });
      
      if (!existingAgent) {
        // Создаем новый агент
        const newAgent = await prisma.agent.create({
          data: {
            name: elevenLabsAgent.name,
            description: 'Synced agent description',
            voiceId: 'default',
            voiceStability: 0.5,
            voiceSimilarityBoost: 0.5,
            voiceStyle: 0.5,
            voiceUseSpeakerBoost: true,
            voiceSpeed: 1.0,
            language: 'ru',
            gender: 'male',
            greetingTemplate: 'Hello! How can I help you today?',
            fallbackTemplate: 'I\'m sorry, I didn\'t understand that. Could you please repeat?',
            summaryTemplate: 'Thank you for your time. Have a great day!',
            allowedHoursStart: '09:00',
            allowedHoursEnd: '17:00',
            allowedHoursTimezone: 'UTC',
            integratedWithAi: true,
            aiModel: 'gpt-3.5-turbo',
            aiContextPrompt: 'You are a helpful assistant.',
            phoneNumber: '',
            isActive: true,
            adminId: req.user!.id,
            companyId,
            elevenLabsAgentId: elevenLabsAgent.agent_id
          }
        });
        
        createdCount++;
        console.log(`[Company ${companyId}] Created new agent: ${newAgent.id}`);
      } else {
        // Обновляем существующий агент
        const updatedAgent = await prisma.agent.update({
          where: { id: existingAgent.id },
          data: { name: elevenLabsAgent.name }
        });
        
        syncedCount++;
        console.log(`[Company ${companyId}] Updated existing agent: ${updatedAgent.id}`);
      }
    }
    
    console.log(`[Company ${companyId}] Sync completed: ${createdCount} created, ${syncedCount} updated`);
    
    res.json({
      success: true,
      message: 'Agents synchronized successfully',
      stats: {
        created: createdCount,
        updated: syncedCount,
        total: elevenLabsResponse.agents.length
      }
    });
  } catch (error) {
    console.error(`[Company ${req.user?.companyId}] Error syncing agents:`, error);
    next(error);
  }
};

// Удалить агента
export const deleteAgent = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { companyId } = req.user!;
    const { id } = req.params;

    console.log(`[Company ${companyId}] Deleting agent: ${id}`);
    
    const agent = await prisma.agent.findUnique({
      where: { 
        id,
        companyId 
      }
    });
    
    if (!agent) {
      console.log(`[Company ${companyId}] Agent not found for deletion: ${id}`);
      return res.status(404).json({ 
        success: false,
        message: 'Agent not found'
      });
    }
    
    // Удаляем агента из ElevenLabs
    if (agent.elevenLabsAgentId) {
      try {
        await elevenLabsService.deleteAgent(agent.elevenLabsAgentId);
        console.log(`[Company ${companyId}] Agent deleted from ElevenLabs: ${agent.elevenLabsAgentId}`);
      } catch (error) {
        console.error(`[Company ${companyId}] Error deleting agent from ElevenLabs:`, error);
      }
    }
    
    // Удаляем агента из базы данных
    await prisma.agent.delete({
      where: { id }
    });
    
    console.log(`[Company ${companyId}] Agent deleted successfully: ${id}`);
    
    res.json({
      success: true,
      message: 'Agent deleted successfully'
    });
  } catch (error) {
    console.error(`[Company ${req.user?.companyId}] Error deleting agent:`, error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error'
    });
  }
};

// Получить цены LLM моделей
export const getLLMPrices = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { agent_id } = req.query;
    
    console.log(`[Company ${req.user?.companyId}] Fetching LLM prices for agent: ${agent_id}`);
    
    let elevenLabsAgentId: string | undefined;
    
    // Проверяем, что агент принадлежит компании пользователя (если указан)
    if (agent_id) {
      const agent = await prisma.agent.findUnique({
        where: { 
          id: agent_id as string,
          companyId: req.user!.companyId 
        }
      });
      
      if (!agent) {
        console.log(`[Company ${req.user?.companyId}] Agent not found for LLM prices: ${agent_id}`);
        return res.status(404).json({
          success: false,
          message: 'Agent not found'
        });
      }
      
      elevenLabsAgentId = agent.elevenLabsAgentId || undefined;
      console.log(`[Company ${req.user?.companyId}] Using ElevenLabs Agent ID: ${elevenLabsAgentId}`);
    }
    
    // Получаем цены LLM из ElevenLabs
    const llmPrices = await elevenLabsService.getLLMPrices(elevenLabsAgentId);
    
    console.log(`[Company ${req.user?.companyId}] LLM prices fetched successfully`);

    res.json({
      success: true,
      data: llmPrices
    });
  } catch (error) {
    console.error(`[Company ${req.user?.companyId}] Error fetching LLM prices:`, error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error'
    });
  }
};

// Получить базу знаний
export const getKnowledgeBase = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { companyId } = req.user!;
    const { page_size, cursor } = req.query;
    
    console.log(`[Company ${companyId}] Fetching knowledge base with page_size: ${page_size}, cursor: ${cursor}`);
    
    // Получаем список документов компании из локальной базы данных
    const companyDocuments = await prisma.companyKnowledgeBase.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`[Company ${companyId}] Found ${companyDocuments.length} company documents in local DB`);

    // Если у компании нет документов, возвращаем пустой список
    if (companyDocuments.length === 0) {
      console.log(`[Company ${companyId}] No documents found for company`);
      return res.json({
        success: true,
        data: {
          documents: [],
          has_more: false,
          next_cursor: null
        }
      });
    }

    // Получаем полную базу знаний из ElevenLabs
    const elevenLabsKnowledgeBase = await elevenLabsService.getKnowledgeBase(
      cursor as string,
      page_size ? parseInt(page_size as string) : 30
    );
    
    // Фильтруем документы только по тем, которые принадлежат компании
    const companyDocumentIds = new Set(companyDocuments.map(doc => doc.elevenLabsDocumentId));
    const filteredDocuments = elevenLabsKnowledgeBase.documents.filter(doc => 
      companyDocumentIds.has(doc.id)
    );

    // Получаем все агенты компании для маппинга ID
    const localAgents = await prisma.agent.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        elevenLabsAgentId: true
      }
    });
    
    // Создаем маппинг ElevenLabs ID → локальный ID
    const agentIdMapping = new Map<string, {id: string, name: string}>();
    localAgents.forEach(agent => {
      if (agent.elevenLabsAgentId) {
        agentIdMapping.set(agent.elevenLabsAgentId, {
          id: agent.id,
          name: agent.name
        });
      }
    });
    
    // Обновляем dependent_agents в каждом документе
    const updatedDocuments = filteredDocuments.map(doc => {
      if (doc.dependent_agents && doc.dependent_agents.length > 0) {
        const updatedDependentAgents = doc.dependent_agents.map(depAgent => {
          const localAgent = agentIdMapping.get(depAgent.id);
          if (localAgent) {
            return {
              ...depAgent,
              id: localAgent.id,
              name: localAgent.name
            };
          }
          return depAgent; // Если локального агента нет, оставляем как есть
        });
        
        return {
          ...doc,
          dependent_agents: updatedDependentAgents
        };
      }
      return doc;
    });
    
    console.log(`[Company ${companyId}] Knowledge base fetched successfully with ${updatedDocuments.length} documents (filtered from ${elevenLabsKnowledgeBase.documents.length} total)`);
    console.log(`[Company ${companyId}] Mapped ${agentIdMapping.size} agent IDs`);

    res.json({
      success: true,
      data: {
        documents: updatedDocuments,
        has_more: false, // Устанавливаем false, так как мы делаем собственную фильтрацию
        next_cursor: null
      }
    });
  } catch (error) {
    console.error(`[Company ${req.user?.companyId}] Error fetching knowledge base:`, error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error'
    });
  }
};

// Получить базу знаний по ID
export const getKnowledgeBaseById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { companyId } = req.user!;
    const { id } = req.params;
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID not found'
      });
    }
    
    console.log(`[Company ${companyId}] Getting knowledge base by ID: ${id}`);

    // Проверяем, принадлежит ли документ компании
    const companyDocument = await prisma.companyKnowledgeBase.findFirst({
      where: {
        companyId,
        elevenLabsDocumentId: id
      }
    });

    if (!companyDocument) {
      console.log(`[Company ${companyId}] Document ${id} not found or not owned by company`);
      return res.status(404).json({
        success: false,
        message: 'База знаний не найдена или не принадлежит вашей компании'
      });
    }

    // Получение детальной информации о базе знаний
    const knowledgeBase = await elevenLabsService.getKnowledgeBaseById(id);

    console.log(`[Company ${companyId}] Knowledge base retrieved successfully:`, {
      id: knowledgeBase.id,
      name: knowledgeBase.name,
      type: knowledgeBase.type
    });

    res.json({
      success: true,
      data: knowledgeBase
    });
  } catch (error: any) {
    console.error(`[Company ${req.user?.companyId}] Error getting knowledge base by ID:`, error);
    
    if (error.message.includes('не найдена')) {
      return res.status(404).json({ 
        success: false,
        message: 'База знаний не найдена'
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Ошибка при получении базы знаний'
    });
  }
};

// Удалить базу знаний по ID
export const deleteKnowledgeBase = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { companyId } = req.user!;
    const { id } = req.params;
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID not found'
      });
    }
    
    console.log(`[Company ${companyId}] Deleting knowledge base: ${id}`);

    // Проверяем, принадлежит ли документ компании
    const companyDocument = await prisma.companyKnowledgeBase.findFirst({
      where: {
        companyId,
        elevenLabsDocumentId: id
      }
    });

    if (!companyDocument) {
      console.log(`[Company ${companyId}] Document ${id} not found or not owned by company`);
      return res.status(404).json({
        success: false,
        message: 'База знаний не найдена или не принадлежит вашей компании'
      });
    }

    // Удаление базы знаний из ElevenLabs
    await elevenLabsService.deleteKnowledgeBase(id);

    // Удаляем запись из локальной базы данных
    await prisma.companyKnowledgeBase.delete({
      where: {
        id: companyDocument.id
      }
    });

    console.log(`[Company ${companyId}] Knowledge base deleted successfully: ${id}`);

    res.json({
      success: true,
      message: 'База знаний успешно удалена'
    });
  } catch (error: any) {
    console.error(`[Company ${req.user?.companyId}] Error deleting knowledge base:`, error);
    
    if (error.message.includes('не найдена')) {
      return res.status(404).json({ 
        success: false,
        message: 'База знаний не найдена'
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Ошибка при удалении базы знаний'
    });
  }
};

// Обновить агента
export const updateAgent = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { companyId } = req.user!;
    const { id } = req.params;
    const updateData = req.body;
    
    console.log(`[Company ${companyId}] Updating agent: ${id}`);
    console.log('Original update data:', JSON.stringify(updateData, null, 2));
    
    // Проверяем, что агент существует и принадлежит компании
    const agent = await prisma.agent.findUnique({
      where: { 
        id,
        companyId 
      }
    });
    
    if (!agent) {
      console.log(`[Company ${companyId}] Agent not found for update: ${id}`);
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }
    
    if (!agent.elevenLabsAgentId) {
      console.log(`[Company ${companyId}] Agent has no ElevenLabs ID: ${id}`);
      return res.status(400).json({
        success: false,
        message: 'Agent is not synced with ElevenLabs'
      });
    }
    
    // Валидируем и преобразуем данные для ElevenLabs API
    const transformedUpdateData = validateAndTransformUpdateData(updateData);
    console.log('Transformed update data:', JSON.stringify(transformedUpdateData, null, 2));
    
    // Обновляем агента в ElevenLabs
    const updatedElevenLabsAgent = await elevenLabsService.updateAgent(agent.elevenLabsAgentId, transformedUpdateData);
    
    console.log(`[Company ${companyId}] Agent updated in ElevenLabs: ${agent.elevenLabsAgentId}`);
    
    // Синхронизируем данные с локальной базой данных
    const updatedAgent = await prisma.agent.update({
      where: { id: agent.id },
      data: {
        name: updatedElevenLabsAgent.name,
        language: updatedElevenLabsAgent.conversation_config.agent.language || agent.language,
        voiceId: updatedElevenLabsAgent.conversation_config.tts.voice_id || agent.voiceId,
        voiceStability: updatedElevenLabsAgent.conversation_config.tts.stability || agent.voiceStability,
        voiceSimilarityBoost: updatedElevenLabsAgent.conversation_config.tts.similarity_boost || agent.voiceSimilarityBoost,
        voiceSpeed: updatedElevenLabsAgent.conversation_config.tts.speed || agent.voiceSpeed,
        greetingTemplate: updatedElevenLabsAgent.conversation_config.agent.first_message || agent.greetingTemplate,
        aiModel: updatedElevenLabsAgent.conversation_config.agent.prompt.llm || agent.aiModel,
        aiContextPrompt: updatedElevenLabsAgent.conversation_config.agent.prompt.prompt || agent.aiContextPrompt,
        updatedAt: new Date()
      }
    });
    
    console.log(`[Company ${companyId}] Agent updated successfully: ${updatedAgent.id}`);
    
    res.json({
      success: true,
      data: updatedAgent,
      message: 'Agent updated successfully'
    });
  } catch (error) {
    console.error(`[Company ${req.user?.companyId}] Error updating agent:`, error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error'
    });
  }
};

// Получить статистику синхронизации
export const getSyncStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { companyId } = req.user!;
    
    console.log(`[Company ${companyId}] Fetching sync stats`);
    
    const localAgents = await prisma.agent.findMany({
      where: { companyId }
    });
    const elevenLabsResponse = await elevenLabsService.getAgents();
    
    const stats = {
      localAgents: localAgents.length,
      elevenLabsAgents: elevenLabsResponse.agents.length,
      syncedAgents: localAgents.filter(agent => agent.elevenLabsAgentId).length,
      lastSync: localAgents.length > 0 ? localAgents[0].updatedAt : null
    };
    
    console.log(`[Company ${companyId}] Sync stats:`, stats);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error(`[Company ${req.user?.companyId}] Error fetching sync stats:`, error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error'
    });
  }
};

// Получить список разговоров
export const getConversations = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { companyId } = req.user!;
    const { 
      cursor, 
      agent_id, 
      call_successful, 
      call_start_before_unix, 
      call_start_after_unix, 
      page_size = 10 
    } = req.query;
    
    console.log(`[Company ${companyId}] Fetching conversations with filters:`, {
      cursor,
      agent_id,
      call_successful,
      call_start_before_unix,
      call_start_after_unix,
      page_size
    });

    // Получаем всех агентов компании
    const companyAgents = await prisma.agent.findMany({
      where: { 
        companyId,
        elevenLabsAgentId: { not: null }
      },
      select: {
        id: true,
        name: true,
        elevenLabsAgentId: true
      }
    });

    console.log(`[Company ${companyId}] Found ${companyAgents.length} agents for company`);

    // Если у компании нет агентов, возвращаем пустой список
    if (companyAgents.length === 0) {
      console.log(`[Company ${companyId}] No agents found for company`);
      return res.json({
        success: true,
        data: {
          conversations: [],
          has_more: false,
          next_cursor: null
        }
      });
    }

    let targetAgentElevenLabsIds: string[] = [];

    // Если указан конкретный agent_id, проверяем что он принадлежит компании
    if (agent_id) {
      const agent = companyAgents.find(agent => agent.id === agent_id);
      
      if (!agent) {
        console.log(`[Company ${companyId}] Agent not found or doesn't belong to company: ${agent_id}`);
        return res.status(404).json({
          success: false,
          message: 'Agent not found'
        });
      }

      if (!agent.elevenLabsAgentId) {
        console.log(`[Company ${companyId}] Agent has no ElevenLabs ID: ${agent_id}`);
        return res.json({
          success: true,
          data: {
            conversations: [],
            has_more: false,
            next_cursor: null
          }
        });
      }

      targetAgentElevenLabsIds = [agent.elevenLabsAgentId];
    } else {
      // Если agent_id не указан, используем всех агентов компании
      targetAgentElevenLabsIds = companyAgents
        .filter(agent => agent.elevenLabsAgentId)
        .map(agent => agent.elevenLabsAgentId!);
    }

    console.log(`[Company ${companyId}] Filtering conversations by agent IDs:`, targetAgentElevenLabsIds);

    // Получаем разговоры для каждого агента и объединяем результаты
    let allConversations: any[] = [];
    let hasMore = false;
    let nextCursor: string | null = null;

    // Для оптимизации, сначала попробуем получить разговоры без фильтра по агенту
    // и затем отфильтруем их локально
    const filters: any = {};
    if (cursor) filters.cursor = cursor as string;
    if (call_successful) filters.call_successful = call_successful as string;
    if (call_start_before_unix) filters.call_start_before_unix = parseInt(call_start_before_unix as string);
    if (call_start_after_unix) filters.call_start_after_unix = parseInt(call_start_after_unix as string);
    
    // Увеличиваем page_size чтобы получить больше данных для фильтрации
    // Ограничиваем максимальным значением 100 чтобы не превышать лимиты ElevenLabs API
    const requestPageSize = Math.min(Math.max(parseInt(page_size as string) * 2, 50), 100);
    filters.page_size = requestPageSize;

    // Получаем разговоры из ElevenLabs
    const conversationsResponse = await elevenLabsService.getConversations(filters);
    
    // Фильтруем разговоры только по агентам компании
    const filteredConversations = conversationsResponse.conversations.filter(conversation => 
      targetAgentElevenLabsIds.includes(conversation.agent_id)
    );

    // Создаем маппинг ElevenLabs Agent ID → локальный Agent
    const agentIdMapping = new Map<string, {id: string, name: string}>();
    companyAgents.forEach(agent => {
      if (agent.elevenLabsAgentId) {
        agentIdMapping.set(agent.elevenLabsAgentId, {
          id: agent.id,
          name: agent.name
        });
      }
    });

    // Обновляем agent_id в каждом разговоре на локальный ID
    const updatedConversations = filteredConversations.map(conversation => {
      const localAgent = agentIdMapping.get(conversation.agent_id);
      if (localAgent) {
        return {
          ...conversation,
          agent_id: localAgent.id,
          agent_name: localAgent.name
        };
      }
      return conversation;
    });

    // Ограничиваем результат до запрошенного page_size
    const requestedPageSize = parseInt(page_size as string);
    const paginatedConversations = updatedConversations.slice(0, requestedPageSize);
    
    // Определяем есть ли еще данные
    hasMore = updatedConversations.length > requestedPageSize || conversationsResponse.has_more;
    nextCursor = hasMore ? conversationsResponse.next_cursor : null;
    
    console.log(`[Company ${companyId}] Retrieved ${paginatedConversations.length} conversations (filtered from ${conversationsResponse.conversations.length} total)`);
    console.log(`[Company ${companyId}] Mapped ${agentIdMapping.size} agent IDs`);

    res.json({
      success: true,
      data: {
        conversations: paginatedConversations,
        has_more: hasMore,
        next_cursor: nextCursor
      }
    });
  } catch (error) {
    console.error(`[Company ${req.user?.companyId}] Error fetching conversations:`, error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error'
    });
  }
};

// Получить детали конкретного разговора
export const getConversationById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { companyId } = req.user!;
    const { id } = req.params;
    
    console.log(`[Company ${companyId}] Fetching conversation details: ${id}`);

    // Получаем всех агентов компании для проверки доступа
    const companyAgents = await prisma.agent.findMany({
      where: { 
        companyId,
        elevenLabsAgentId: { not: null }
      },
      select: {
        id: true,
        name: true,
        elevenLabsAgentId: true
      }
    });

    if (companyAgents.length === 0) {
      console.log(`[Company ${companyId}] No agents found for company`);
      return res.status(404).json({
        success: false,
        message: 'У компании нет агентов'
      });
    }

    // Получаем детали разговора из ElevenLabs
    const conversation = await elevenLabsService.getConversationById(id);
    
    // Проверяем, принадлежит ли разговор агентам компании
    const companyAgentIds = companyAgents
      .filter(agent => agent.elevenLabsAgentId)
      .map(agent => agent.elevenLabsAgentId!);
    
    if (!companyAgentIds.includes(conversation.agent_id)) {
      console.log(`[Company ${companyId}] Conversation ${id} does not belong to company agents`);
      return res.status(404).json({
        success: false,
        message: 'Разговор не найден или не принадлежит вашей компании'
      });
    }

    // Создаем маппинг ElevenLabs Agent ID → локальный Agent
    const agentIdMapping = new Map<string, {id: string, name: string}>();
    companyAgents.forEach(agent => {
      if (agent.elevenLabsAgentId) {
        agentIdMapping.set(agent.elevenLabsAgentId, {
          id: agent.id,
          name: agent.name
        });
      }
    });

    // Обновляем agent_id в разговоре на локальный ID и добавляем agent_name
    const localAgent = agentIdMapping.get(conversation.agent_id);
    const updatedConversation = {
      ...conversation,
      agent_id: localAgent ? localAgent.id : conversation.agent_id,
      agent_name: localAgent ? localAgent.name : 'Unknown Agent'
    };
    
    console.log(`[Company ${companyId}] Conversation details retrieved successfully: ${id}`);

    res.json({
      success: true,
      data: updatedConversation
    });
  } catch (error: any) {
    console.error(`[Company ${req.user?.companyId}] Error fetching conversation details:`, error);
    
    if (error.message && (error.message.includes('не найден') || error.message.includes('not found'))) {
      return res.status(404).json({ 
        success: false,
        message: 'Разговор не найден'
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Internal server error'
    });
  }
};

// Получить аудио разговора
export const getConversationAudio = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { companyId } = req.user!;
    const { id } = req.params;
    
    console.log(`[Company ${companyId}] Fetching conversation audio: ${id}`);

    // Получаем всех агентов компании для проверки доступа
    const companyAgents = await prisma.agent.findMany({
      where: { 
        companyId,
        elevenLabsAgentId: { not: null }
      },
      select: {
        elevenLabsAgentId: true
      }
    });

    if (companyAgents.length === 0) {
      console.log(`[Company ${companyId}] No agents found for company`);
      return res.status(404).json({
        success: false,
        message: 'У компании нет агентов'
      });
    }

    // Сначала получаем детали разговора для проверки доступа
    const conversation = await elevenLabsService.getConversationById(id);
    
    // Проверяем, принадлежит ли разговор агентам компании
    const companyAgentIds = companyAgents
      .filter(agent => agent.elevenLabsAgentId)
      .map(agent => agent.elevenLabsAgentId!);
    
    if (!companyAgentIds.includes(conversation.agent_id)) {
      console.log(`[Company ${companyId}] Conversation ${id} does not belong to company agents`);
      return res.status(404).json({
        success: false,
        message: 'Разговор не найден или не принадлежит вашей компании'
      });
    }

    // Получаем аудио из ElevenLabs
    const audioBuffer = await elevenLabsService.getConversationAudio(id);
    
    console.log(`[Company ${companyId}] Conversation audio retrieved successfully: ${id}`);

    // Устанавливаем правильные заголовки для аудио
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length.toString(),
      'Content-Disposition': `attachment; filename="conversation_${id}.mp3"`
    });

    res.send(audioBuffer);
  } catch (error: any) {
    console.error(`[Company ${req.user?.companyId}] Error fetching conversation audio:`, error);
    
    if (error.message && (error.message.includes('не найден') || error.message.includes('not found'))) {
      return res.status(404).json({ 
        success: false,
        message: 'Аудио разговора не найдено'
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Internal server error'
    });
  }
};

// Получить информацию о RAG индексе
export const getRagIndexOverview = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { companyId } = req.user!;
    
    console.log(`[Company ${companyId}] Fetching RAG index overview`);
    
    // Получаем информацию о RAG индексе из ElevenLabs
    const ragIndexData = await elevenLabsService.getRagIndexOverview();
    
    console.log(`[Company ${companyId}] RAG index overview retrieved successfully`, {
      totalUsedBytes: ragIndexData.total_used_bytes,
      totalMaxBytes: ragIndexData.total_max_bytes,
      modelsCount: ragIndexData.models?.length || 0
    });

    res.json({
      success: true,
      data: ragIndexData
    });
  } catch (error) {
    console.error(`[Company ${req.user?.companyId}] Error fetching RAG index overview:`, error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error'
    });
  }
};

// Создать базу знаний
export const createKnowledgeBase = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { companyId } = req.user!;
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID not found'
      });
    }
    
    const { url, text, name } = req.body;
    
    console.log(`[Company ${companyId}] Creating knowledge base`, { url, text: text ? 'provided' : 'not provided', name });

    let knowledgeBase;

    if (url) {
      // Создание базы знаний из URL
      console.log(`[Company ${companyId}] Creating knowledge base from URL: ${url}`);
      knowledgeBase = await elevenLabsService.createKnowledgeBase({ url });
    } else if (text && name) {
      // Создание базы знаний из текста
      console.log(`[Company ${companyId}] Creating knowledge base from text: ${name}`);
      knowledgeBase = await elevenLabsService.createKnowledgeBaseFromText({ text, name });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Необходимо указать либо URL, либо text и name'
      });
    }

    // Сохраняем связь документа с компанией в локальной базе данных
    await prisma.companyKnowledgeBase.create({
      data: {
        companyId,
        elevenLabsDocumentId: knowledgeBase.id,
        documentName: knowledgeBase.name,
        documentType: url ? 'url' : 'text',
        createdBy: req.user!.id
      }
    });

    console.log(`[Company ${companyId}] Knowledge base created successfully and linked to company:`, {
      id: knowledgeBase.id,
      name: knowledgeBase.name
    });

    res.json({
      success: true,
      data: knowledgeBase,
      message: 'База знаний успешно создана'
    });
  } catch (error: any) {
    console.error(`[Company ${req.user?.companyId}] Error creating knowledge base:`, error);
    
    // Возвращаем более детальное сообщение об ошибке
    if (error.message.includes('ReadabilityError') || error.message.includes('прочитать содержимое')) {
      return res.status(400).json({ 
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Ошибка при создании базы знаний'
    });
  }
};

// Создать базу знаний из текста
export const createKnowledgeBaseFromText = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { companyId } = req.user!;
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID not found'
      });
    }
    
    const { text, name } = req.body;
    
    console.log(`[Company ${companyId}] Creating knowledge base from text: ${name}`);

    if (!text || !name) {
      return res.status(400).json({
        success: false,
        message: 'Необходимо указать text и name'
      });
    }

    // Создание базы знаний из текста
    const knowledgeBase = await elevenLabsService.createKnowledgeBaseFromText({ text, name });

    // Сохраняем связь документа с компанией в локальной базе данных
    await prisma.companyKnowledgeBase.create({
      data: {
        companyId,
        elevenLabsDocumentId: knowledgeBase.id,
        documentName: knowledgeBase.name,
        documentType: 'text',
        createdBy: req.user!.id
      }
    });

    console.log(`[Company ${companyId}] Knowledge base created from text successfully and linked to company:`, {
      id: knowledgeBase.id,
      name: knowledgeBase.name
    });

    res.json({
      success: true,
      data: knowledgeBase,
      message: 'База знаний из текста успешно создана'
    });
  } catch (error: any) {
    console.error(`[Company ${req.user?.companyId}] Error creating knowledge base from text:`, error);
    
    res.status(500).json({ 
      success: false,
      message: 'Ошибка при создании базы знаний из текста'
    });
  }
};

// Создать базу знаний из файла
export const createKnowledgeBaseFromFile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { companyId } = req.user!;
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID not found'
      });
    }
    
    const { name } = req.body;
    const file = req.file;
    
    console.log(`[Company ${companyId}] Creating knowledge base from file: ${file?.originalname}`);

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'Необходимо прикрепить файл'
      });
    }

    // Создание базы знаний из файла
    const knowledgeBase = await elevenLabsService.createKnowledgeBaseFromFile({
      file: file.buffer,
      filename: file.originalname,
      mimetype: file.mimetype
    });

    // Сохраняем связь документа с компанией в локальной базе данных
    await prisma.companyKnowledgeBase.create({
      data: {
        companyId,
        elevenLabsDocumentId: knowledgeBase.id,
        documentName: knowledgeBase.name,
        documentType: 'file',
        createdBy: req.user!.id
      }
    });

    console.log(`[Company ${companyId}] Knowledge base created from file successfully and linked to company:`, {
      id: knowledgeBase.id,
      name: knowledgeBase.name,
      filename: file.originalname
    });

    res.json({
      success: true,
      data: knowledgeBase,
      message: 'База знаний из файла успешно создана'
    });
  } catch (error: any) {
    console.error(`[Company ${req.user?.companyId}] Error creating knowledge base from file:`, error);
    
    res.status(500).json({ 
      success: false,
      message: 'Ошибка при создании базы знаний из файла'
    });
  }
};

// Миграция существующих документов базы знаний к компаниям
export const migrateKnowledgeBaseToCompanies = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { companyId } = req.user!;
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID not found'
      });
    }
    
    console.log(`[Company ${companyId}] Starting knowledge base migration`);

    // Получаем все документы из ElevenLabs
    const elevenLabsKnowledgeBase = await elevenLabsService.getKnowledgeBase();
    
    // Получаем уже существующие связи
    const existingMappings = await prisma.companyKnowledgeBase.findMany({
      select: { elevenLabsDocumentId: true }
    });
    const existingIds = new Set(existingMappings.map(m => m.elevenLabsDocumentId));

    // Фильтруем только те документы, которые еще не привязаны к компаниям
    const unmappedDocuments = elevenLabsKnowledgeBase.documents.filter(doc => 
      !existingIds.has(doc.id)
    );

    if (unmappedDocuments.length === 0) {
      console.log(`[Company ${companyId}] No unmapped documents found for migration`);
      return res.json({
        success: true,
        message: 'Нет непривязанных документов для миграции',
        data: {
          migrated: 0,
          skipped: existingMappings.length
        }
      });
    }

    // Создаем связи для всех непривязанных документов к текущей компании
    const migrationsData = unmappedDocuments.map(doc => ({
      companyId,
      elevenLabsDocumentId: doc.id,
      documentName: doc.name,
      documentType: doc.type,
      createdBy: req.user!.id
    }));

    await prisma.companyKnowledgeBase.createMany({
      data: migrationsData
    });

    console.log(`[Company ${companyId}] Migrated ${unmappedDocuments.length} knowledge base documents to company`);

    res.json({
      success: true,
      message: `Успешно мигрировано ${unmappedDocuments.length} документов к компании`,
      data: {
        migrated: unmappedDocuments.length,
        skipped: existingMappings.length,
        documents: unmappedDocuments.map(doc => ({
          id: doc.id,
          name: doc.name,
          type: doc.type
        }))
      }
    });
  } catch (error: any) {
    console.error(`[Company ${req.user?.companyId}] Error migrating knowledge base:`, error);
    
    res.status(500).json({ 
      success: false,
      message: 'Ошибка при миграции базы знаний'
    });
  }
};