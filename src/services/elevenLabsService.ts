import axios from 'axios';

const ELEVEN_LABS_API_KEY = 'sk_b4497622adce173cb9b35b5b04f13228fb1d2fc6b63fe35e';
const ELEVEN_LABS_API_URL = 'https://api.elevenlabs.io/v1';

interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
  speed: number;
}

interface Voice {
  voice_id: string;
  name: string;
  category: string;
  description: string;
  preview_url: string;
  labels: {
    accent?: string;
    age?: string;
    gender?: string;
    description?: string;
    use_case?: string;
  };
}

interface LLMPrice {
  llm: string;
  price_per_minute: number;
}

interface LLMPricesResponse {
  llm_prices: LLMPrice[];
}

interface KnowledgeBaseDocument {
  id: string;
  name: string;
  metadata: {
    created_at_unix_secs: number;
    last_updated_at_unix_secs: number;
    size_bytes: number;
  };
  supported_usages: string[];
  access_info: {
    is_creator: boolean;
    creator_name: string;
    creator_email: string;
    role: string;
  };
  dependent_agents: Array<{
    id: string;
    name: string;
    type: string;
    created_at_unix_secs: number;
    access_level: string;
  }>;
  type: string;
  url?: string;
}

interface KnowledgeBaseResponse {
  documents: KnowledgeBaseDocument[];
  next_cursor: string | null;
  has_more: boolean;
}

interface UpdateAgentRequest {
  name?: string;
  conversation_config?: any;
  platform_settings?: any;
  tags?: string[];
}

interface Conversation {
  agent_id: string;
  agent_name: string;
  conversation_id: string;
  start_time_unix_secs: number;
  call_duration_secs: number;
  message_count: number;
  status: string;
  call_successful: 'success' | 'failure' | 'unknown';
}

interface ConversationsResponse {
  conversations: Conversation[];
  next_cursor: string | null;
  has_more: boolean;
}

interface ConversationFilters {
  cursor?: string;
  agent_id?: string;
  call_successful?: 'success' | 'failure' | 'unknown';
  call_start_before_unix?: number;
  call_start_after_unix?: number;
  page_size?: number;
}

interface TranscriptMessage {
  role: 'agent' | 'user';
  message: string;
  tool_calls: any[];
  tool_results: any[];
  feedback: any;
  llm_override: any;
  time_in_call_secs: number;
  conversation_turn_metrics: {
    metrics: {
      convai_llm_service_ttf_sentence?: {
        elapsed_time: number;
      };
      convai_llm_service_ttfb?: {
        elapsed_time: number;
      };
    };
  } | null;
  rag_retrieval_info: any;
  llm_usage: {
    model_usage: {
      [model: string]: {
        input: {
          tokens: number;
          price: number;
        };
        input_cache_read: {
          tokens: number;
          price: number;
        };
        input_cache_write: {
          tokens: number;
          price: number;
        };
        output_total: {
          tokens: number;
          price: number;
        };
      };
    };
  } | null;
  interrupted: boolean;
  original_message: any;
  source_medium: string | null;
}

interface ConversationMetadata {
  start_time_unix_secs: number;
  accepted_time_unix_secs: number;
  call_duration_secs: number;
  cost: number;
  deletion_settings: {
    deletion_time_unix_secs: number;
    deleted_logs_at_time_unix_secs: number | null;
    deleted_audio_at_time_unix_secs: number | null;
    deleted_transcript_at_time_unix_secs: number | null;
    delete_transcript_and_pii: boolean;
    delete_audio: boolean;
  };
  feedback: {
    overall_score: number | null;
    likes: number;
    dislikes: number;
  };
  authorization_method: string;
  charging: {
    dev_discount: boolean;
    is_burst: boolean;
    tier: string;
    llm_usage: any;
    llm_price: number;
  };
  phone_call: any;
  batch_call: any;
  termination_reason: string;
  error: any;
  main_language: string;
  rag_usage: any;
  text_only: boolean;
  features_usage: {
    language_detection: {
      enabled: boolean;
      used: boolean;
    };
    transfer_to_agent: {
      enabled: boolean;
      used: boolean;
    };
    transfer_to_number: {
      enabled: boolean;
      used: boolean;
    };
    multivoice: {
      enabled: boolean;
      used: boolean;
    };
    pii_zrm_workspace: boolean;
    pii_zrm_agent: boolean;
  };
}

interface ConversationAnalysis {
  evaluation_criteria_results: Record<string, any>;
  data_collection_results: Record<string, any>;
  call_successful: 'success' | 'failure' | 'unknown';
  transcript_summary: string;
}

interface ConversationInitiationClientData {
  conversation_config_override: {
    tts: {
      voice_id: string | null;
    };
    conversation: {
      text_only: boolean | null;
    };
    agent: {
      first_message: string | null;
      language: string | null;
      prompt: string | null;
    };
  };
  custom_llm_extra_body: Record<string, any>;
  dynamic_variables: Record<string, any>;
}

interface ConversationDetail {
  agent_id: string;
  conversation_id: string;
  status: 'initiated' | 'in-progress' | 'processing' | 'done' | 'failed';
  transcript: TranscriptMessage[];
  metadata: ConversationMetadata;
  analysis: ConversationAnalysis | null;
  conversation_initiation_client_data: ConversationInitiationClientData | null;
  has_audio: boolean;
  has_user_audio: boolean;
  has_response_audio: boolean;
}

interface ElevenLabsAgentListResponse {
  agents: Array<{
    agent_id: string;
    name: string;
    tags: string[];
    created_at_unix_secs: number;
    access_info: {
      is_creator: boolean;
      creator_name: string;
      creator_email: string;
      role: string;
    };
  }>;
  next_cursor: string | null;
  has_more: boolean;
}

interface ElevenLabsAgentDetailResponse {
  agent_id: string;
  name: string;
  conversation_config: {
    asr: {
      quality: string;
      provider: string;
      user_input_audio_format: string;
      keywords: string[];
    };
    turn: {
      turn_timeout: number;
      silence_end_call_timeout: number;
      mode: string;
    };
    tts: {
      model_id: string;
      voice_id: string;
      supported_voices: string[];
      agent_output_audio_format: string;
      optimize_streaming_latency: number;
      stability: number;
      speed: number;
      similarity_boost: number;
      pronunciation_dictionary_locators: string[];
    };
    conversation: {
      text_only: boolean;
      max_duration_seconds: number;
      client_events: string[];
    };
    language_presets: Record<string, any>;
    agent: {
      first_message: string;
      language: string;
      dynamic_variables: {
        dynamic_variable_placeholders: Record<string, any>;
      };
      prompt: {
        prompt: string;
        llm: string;
        temperature: number;
        max_tokens: number;
        tools: Array<{
          id: string;
          name: string;
          description: string;
          response_timeout_secs: number;
          type: string;
          params: Record<string, any>;
        }>;
        tool_ids: string[];
        mcp_server_ids: string[];
        native_mcp_server_ids: string[];
        knowledge_base: string[];
        custom_llm: any;
        ignore_default_personality: boolean;
        rag: {
          enabled: boolean;
          embedding_model: string;
          max_vector_distance: number;
          max_documents_length: number;
          max_retrieved_rag_chunks_count: number;
        };
      };
    };
  };
  metadata: {
    created_at_unix_secs: number;
  };
  platform_settings: {
    auth: {
      enable_auth: boolean;
      allowlist: string[];
      shareable_token: string | null;
    };
    evaluation: {
      criteria: string[];
    };
    widget: Record<string, any>;
    data_collection: Record<string, any>;
    overrides: Record<string, any>;
    call_limits: {
      agent_concurrency_limit: number;
      daily_limit: number;
      bursting_enabled: boolean;
    };
    ban: any;
    privacy: {
      record_voice: boolean;
      retention_days: number;
      delete_transcript_and_pii: boolean;
      delete_audio: boolean;
      apply_to_existing_conversations: boolean;
      zero_retention_mode: boolean;
    };
    workspace_overrides: Record<string, any>;
    safety: {
      is_blocked_ivc: boolean;
      is_blocked_non_ivc: boolean;
      ignore_safety_evaluation: boolean;
    };
  };
  phone_numbers: string[];
  access_info: {
    is_creator: boolean;
    creator_name: string;
    creator_email: string;
    role: string;
  };
  tags: string[];
}

interface CreateAgentRequest {
  name: string;
}

interface CreateAgentResponse {
  agent_id: string;
  name: string;
  conversation_config: any;
  platform_settings: any;
  metadata: {
    created_at_unix_secs: number;
  };
  access_info: {
    is_creator: boolean;
    creator_name: string;
    creator_email: string;
    role: string;
  };
  tags: string[];
}

interface CreateKnowledgeBaseRequest {
  url: string;
}

interface CreateKnowledgeBaseTextRequest {
  text: string;
  name: string;
}

interface CreateKnowledgeBaseFileRequest {
  file: Buffer;
  filename: string;
  mimetype: string;
}

interface CreateKnowledgeBaseResponse {
  id: string;
  name: string;
}

interface KnowledgeBaseDetail {
  id: string;
  name: string;
  metadata: {
    created_at_unix_secs: number;
    last_updated_at_unix_secs: number;
    size_bytes: number;
  };
  supported_usages: string[];
  access_info: {
    is_creator: boolean;
    creator_name: string;
    creator_email: string;
    role: string;
  };
  extracted_inner_html: string;
  type: string;
}

interface RagIndexOverview {
  total_used_bytes: number;
  total_max_bytes: number;
  models: {
    model: string;
    used_bytes: number;
  }[];
}

interface ConversationSignedUrl {
  signed_url: string;
}

// SIP Trunk Phone Number interfaces
interface CreateSIPTrunkPhoneNumberRequest {
  label: string;
  phone_number: string;
  termination_uri: string; // Обязательное поле для SIP trunk
  transport?: 'auto' | 'udp' | 'tcp' | 'tls';
  media_encryption?: 'disabled' | 'allowed' | 'required';
  credentials?: {
    username: string;
    password: string;
  };
  headers?: Record<string, string>;
}

interface CreateSIPTrunkPhoneNumberResponse {
  phone_number_id: string;
  phone_number: string;
  label: string;
  status: 'active' | 'pending' | 'failed';
  created_at: string;
}

interface CreateTwilioPhoneNumberRequest {
  label: string;
  phone_number: string;
  sid: string;
  token: string;
}

interface CreateTwilioPhoneNumberResponse {
  phone_number_id: string;
  phone_number: string;
  label: string;
  status: 'active' | 'pending' | 'failed';
  created_at: string;
}

// Phone Numbers List interfaces
interface PhoneNumberTwilio {
  phone_number: string;
  label: string;
  phone_number_id: string;
  assigned_agent?: {
    agent_id: string;
    agent_name: string;
  };
  provider: 'twilio';
}

interface PhoneNumberSIPTrunk {
  phone_number: string;
  label: string;
  phone_number_id: string;
  assigned_agent?: {
    agent_id: string;
    agent_name: string;
  };
  provider: 'sip_trunk';
  address?: string;
}

type PhoneNumber = PhoneNumberTwilio | PhoneNumberSIPTrunk;

interface GetPhoneNumbersResponse {
  phone_numbers: PhoneNumber[];
}

export class ElevenLabsService {
  private readonly apiKey: string;
  private readonly apiUrl: string;

  constructor() {
    this.apiKey = ELEVEN_LABS_API_KEY;
    this.apiUrl = ELEVEN_LABS_API_URL;
  }

  private getHeaders() {
    return {
      'xi-api-key': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  async getVoices(): Promise<Voice[]> {
    try {
      const response = await axios.get(`${this.apiUrl}/voices`, {
        headers: this.getHeaders(),
      });
      return response.data.voices;
    } catch (error) {
      throw new Error('Failed to fetch voices from ElevenLabs');
    }
  }

  async generatePreview(voiceId: string, text: string): Promise<Buffer> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/text-to-speech/${voiceId}`,
        { text },
        {
          headers: this.getHeaders(),
          responseType: 'arraybuffer',
        }
      );
      return Buffer.from(response.data);
    } catch (error) {
      throw new Error('Failed to generate voice preview');
    }
  }

  async generateVoicePreview(voiceId: string, text: string, settings?: VoiceSettings): Promise<Buffer> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/text-to-speech/${voiceId}`,
        {
          text,
          voice_settings: settings,
          model_id: 'eleven_multilingual_v2'
        },
        {
          headers: this.getHeaders(),
          responseType: 'arraybuffer',
        }
      );
      return Buffer.from(response.data);
    } catch (error: any) {
      if (error.response?.data) {
        const errorBuffer = Buffer.from(error.response.data);
        console.error('ElevenLabs API Error:', errorBuffer.toString());
      } else {
        console.error('ElevenLabs API Error:', error.message);
      }
      throw new Error('Failed to generate voice preview with settings');
    }
  }

  async getAgents(cursor?: string, pageSize: number = 30, search?: string): Promise<ElevenLabsAgentListResponse> {
    try {
      const params = new URLSearchParams();
      if (cursor) params.append('cursor', cursor);
      params.append('page_size', pageSize.toString());
      if (search) params.append('search', search);

      const response = await axios.get(`${this.apiUrl}/convai/agents?${params.toString()}`, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error: any) {
      console.error('ElevenLabs API Error:', error.response?.data || error.message);
      throw new Error('Не удалось получить список агентов из ElevenLabs');
    }
  }

  async getAgentById(agentId: string): Promise<ElevenLabsAgentDetailResponse> {
    try {
      const response = await axios.get(`${this.apiUrl}/convai/agents/${agentId}`, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error: any) {
      console.error('ElevenLabs API Error:', error.response?.data || error.message);
      throw new Error('Не удалось получить агента из ElevenLabs');
    }
  }

  async deleteAgent(agentId: string): Promise<void> {
    try {
      await axios.delete(`${this.apiUrl}/convai/agents/${agentId}`, {
        headers: this.getHeaders(),
      });
    } catch (error: any) {
      console.error('ElevenLabs API Error:', error.response?.data || error.message);
      throw new Error('Не удалось удалить агента из ElevenLabs');
    }
  }

  /**
   * Получение доступных LLM моделей и их цен за минуту для агентов
   */
  async getLLMPrices(agentId?: string): Promise<LLMPricesResponse> {
    try {
      // Сначала попробуем получить список агентов, чтобы взять первый доступный
      let targetAgentId = agentId;
      
      if (!targetAgentId) {
        try {
          const agentsResponse = await this.getAgents(undefined, 1);
          if (agentsResponse.agents.length > 0) {
            targetAgentId = agentsResponse.agents[0].agent_id;
          } else {
            // Если агентов нет, используем placeholder ID
            targetAgentId = 'placeholder-agent-id';
          }
        } catch (agentError) {
          // Если не удалось получить агентов, используем placeholder
          targetAgentId = 'placeholder-agent-id';
        }
      }
      
      const response = await axios.post(
        `${this.apiUrl}/convai/agent/${targetAgentId}/llm-usage/calculate`,
        {},
        {
          headers: this.getHeaders(),
        }
      );
      
      return response.data;
    } catch (error: any) {
      console.error('ElevenLabs API Error:', error.response?.data || error.message);
      throw new Error('Не удалось получить информацию о ценах LLM моделей');
    }
  }

  /**
   * Получение списка базы знаний
   */
  async getKnowledgeBase(cursor?: string, pageSize: number = 100): Promise<KnowledgeBaseResponse> {
    try {
      const params = new URLSearchParams();
      if (cursor) params.append('cursor', cursor);
      params.append('page_size', pageSize.toString());

      const response = await axios.get(`${this.apiUrl}/convai/knowledge-base?${params.toString()}`, {
        headers: this.getHeaders(),
      });
      
      return response.data;
    } catch (error: any) {
      console.error('ElevenLabs API Error:', error.response?.data || error.message);
      throw new Error('Не удалось получить список базы знаний');
    }
  }

  /**
   * Обновление агента
   */
  async updateAgent(agentId: string, updateData: UpdateAgentRequest): Promise<ElevenLabsAgentDetailResponse> {
    try {
      const response = await axios.patch(`${this.apiUrl}/convai/agents/${agentId}`, updateData, {
        headers: this.getHeaders(),
      });
      
      return response.data;
    } catch (error: any) {
      console.error('ElevenLabs API Error:', error.response?.data || error.message);
      throw new Error('Не удалось обновить агента');
    }
  }

  /**
   * Получение списка разговоров агентов
   */
  async getConversations(filters: ConversationFilters = {}): Promise<ConversationsResponse> {
    try {
      const params = new URLSearchParams();
      
      // Устанавливаем значения по умолчанию
      const pageSize = filters.page_size || 10;
      
      if (filters.cursor) params.append('cursor', filters.cursor);
      if (filters.agent_id) params.append('agent_id', filters.agent_id);
      if (filters.call_successful) params.append('call_successful', filters.call_successful);
      if (filters.call_start_before_unix) params.append('call_start_before_unix', filters.call_start_before_unix.toString());
      if (filters.call_start_after_unix) params.append('call_start_after_unix', filters.call_start_after_unix.toString());
      params.append('page_size', pageSize.toString());

      const response = await axios.get(`${this.apiUrl}/convai/conversations?${params.toString()}`, {
        headers: this.getHeaders(),
      });
      
      return response.data;
    } catch (error: any) {
      console.error('ElevenLabs API Error:', error.response?.data || error.message);
      throw new Error('Не удалось получить список конверсаций');
    }
  }

  /**
   * Получение детальной информации о разговоре по ID
   */
  async getConversationById(conversationId: string): Promise<ConversationDetail> {
    try {
      const response = await axios.get(`${this.apiUrl}/convai/conversations/${conversationId}`, {
        headers: this.getHeaders(),
      });
      
      return response.data;
    } catch (error: any) {
      console.error('ElevenLabs API Error:', error.response?.data || error.message);
      throw new Error('Не удалось получить детали разговора');
    }
  }

  /**
   * Получение аудио файла разговора по ID
   */
  async getConversationAudio(conversationId: string): Promise<Buffer> {
    try {
      const response = await axios.get(`${this.apiUrl}/convai/conversations/${conversationId}/audio`, {
        headers: this.getHeaders(),
        responseType: 'arraybuffer',
      });
      
      return Buffer.from(response.data);
    } catch (error: any) {
      console.error('ElevenLabs API Error:', error.response?.data || error.message);
      throw new Error('Не удалось получить аудио файл разговора');
    }
  }

  /**
   * Удаление разговора по ID
   */
  async deleteConversation(conversationId: string): Promise<void> {
    try {
      await axios.delete(`${this.apiUrl}/convai/conversations/${conversationId}`, {
        headers: this.getHeaders(),
      });
    } catch (error: any) {
      console.error('ElevenLabs API Error:', error.response?.data || error.message);
      throw new Error('Не удалось удалить разговор');
    }
  }

  /**
   * Создание базы знаний по URL
   */
  async createKnowledgeBase(knowledgeData: CreateKnowledgeBaseRequest): Promise<CreateKnowledgeBaseResponse> {
    try {
      console.log('=== СОЗДАНИЕ БАЗЫ ЗНАНИЙ В ELEVENLABS ===');
      console.log('URL:', knowledgeData.url);
      
      const response = await axios.post(`${this.apiUrl}/convai/knowledge-base/url`, knowledgeData, {
        headers: this.getHeaders(),
      });
      
      console.log('Успешно создана база знаний:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error: any) {
      console.error('=== ОШИБКА ELEVENLABS API ===');
      console.error('URL:', knowledgeData.url);
      console.error('Status:', error.response?.status);
      console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
      
      if (error.response?.data?.detail?.status === 'ReadabilityError') {
        throw new Error(`Не удалось прочитать содержимое URL: ${knowledgeData.url}. Возможные причины: страница требует JavaScript, блокирует боты, или имеет сложную структуру. Попробуйте другой URL с этого сайта.`);
      }
      
      throw new Error(`Не удалось создать базу знаний: ${error.response?.data?.detail?.message || error.message}`);
    }
  }

  /**
   * Создание базы знаний по тексту
   */
  async createKnowledgeBaseFromText(knowledgeData: CreateKnowledgeBaseTextRequest): Promise<CreateKnowledgeBaseResponse> {
    try {
      console.log('=== СОЗДАНИЕ БАЗЫ ЗНАНИЙ ИЗ ТЕКСТА В ELEVENLABS ===');
      console.log('Name:', knowledgeData.name);
      console.log('Text length:', knowledgeData.text.length, 'characters');
      
      const response = await axios.post(`${this.apiUrl}/convai/knowledge-base/text`, knowledgeData, {
        headers: this.getHeaders(),
      });
      
      console.log('Успешно создана база знаний из текста:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error: any) {
      console.error('=== ОШИБКА ELEVENLABS API (ТЕКСТ) ===');
      console.error('Name:', knowledgeData.name);
      console.error('Text length:', knowledgeData.text.length);
      console.error('Status:', error.response?.status);
      console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
      
      throw new Error(`Не удалось создать базу знаний из текста: ${error.response?.data?.detail?.message || error.message}`);
    }
  }

  /**
   * Создание базы знаний по файлу
   */
  async createKnowledgeBaseFromFile(knowledgeData: CreateKnowledgeBaseFileRequest): Promise<CreateKnowledgeBaseResponse> {
    try {
      console.log('=== СОЗДАНИЕ БАЗЫ ЗНАНИЙ ИЗ ФАЙЛА В ELEVENLABS ===');
      console.log('Filename:', knowledgeData.filename);
      console.log('Mimetype:', knowledgeData.mimetype);
      console.log('File size:', knowledgeData.file.length, 'bytes');
      
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('file', knowledgeData.file, {
        filename: knowledgeData.filename,
        contentType: knowledgeData.mimetype
      });
      
      const response = await axios.post(`${this.apiUrl}/convai/knowledge-base/file`, formData, {
        headers: {
          'xi-api-key': this.apiKey,
          ...formData.getHeaders()
        },
      });
      
      console.log('Успешно создана база знаний из файла:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error: any) {
      console.error('=== ОШИБКА ELEVENLABS API (ФАЙЛ) ===');
      console.error('Filename:', knowledgeData.filename);
      console.error('Mimetype:', knowledgeData.mimetype);
      console.error('Status:', error.response?.status);
      console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
      
      throw new Error(`Не удалось создать базу знаний из файла: ${error.response?.data?.detail?.message || error.message}`);
    }
  }

  /**
   * Создание нового агента
   */
  async createAgent(agentData: CreateAgentRequest): Promise<CreateAgentResponse> {
    try {
      const createAgentPayload = {
        "name": agentData.name,
        "conversation_config": {
          "agent": {
            "language": "ru",
            "prompt": {
              "prompt": "You are a helpful assistant.",
              "llm": "gemini-2.0-flash-001",
              "tools": [
                {
                  "type": "system",
                  "name": "end_call",
                  "description": "",
                  "params": {
                    "system_tool_type": "end_call"
                  }
                }
              ],
              "knowledge_base": [],
              "mcp_server_ids": [],
              "native_mcp_server_ids": [],
              "temperature": 0,
              "max_tokens": -1
            },
            "first_message": "",
            "dynamic_variables": {
              "dynamic_variable_placeholders": {}
            }
          },
          "asr": {
            "quality": "high",
            "provider": "elevenlabs",
            "user_input_audio_format": "pcm_16000",
            "keywords": []
          },
          "tts": {
            "model_id": "eleven_flash_v2_5",
            "agent_output_audio_format": "pcm_16000",
            "optimize_streaming_latency": 3,
            "stability": 0.5,
            "similarity_boost": 0.8
          },
          "turn": {
            "turn_timeout": 7,
            "silence_end_call_timeout": 20
          },
          "conversation": {
            "max_duration_seconds": 300,
            "client_events": [
              "audio",
              "interruption",
              "user_transcript",
              "agent_response",
              "agent_response_correction"
            ]
          },
          "language_presets": {},
          "is_blocked_ivc": false,
          "is_blocked_non_ivc": false,
          "ignore_safety_evaluation": false
        },
        "platform_settings": {
          "widget": {
            "variant": "full",
            "avatar": {
              "type": "orb",
              "color_1": "#2792DC",
              "color_2": "#9CE6E6"
            },
            "feedback_mode": "during",
            "terms_text": "#### Terms and conditions\n\nBy clicking \"Agree,\" and each time I interact with this AI agent, I consent to the recording, storage, and sharing of my communications with third-party service providers, and as described in the Privacy Policy.\nIf you do not wish to have your conversations recorded, please refrain from using this service.",
            "show_avatar_when_collapsed": true
          },
          "evaluation": {},
          "auth": {
            "allowlist": []
          },
          "overrides": {
            "conversation_config_override": {
              "conversation": {
                "text_only": true
              }
            }
          },
          "call_limits": {
            "agent_concurrency_limit": -1,
            "daily_limit": 100000
          },
          "privacy": {
            "record_voice": true,
            "retention_days": 730,
            "delete_transcript_and_pii": true,
            "delete_audio": true,
            "apply_to_existing_conversations": false,
            "zero_retention_mode": false
          },
          "data_collection": {},
          "workspace_overrides": {}
        }
      };

      console.log('=== СОЗДАНИЕ АГЕНТА (ПОЛНАЯ КОНФИГУРАЦИЯ С RU) ===');
      console.log('Входящие данные:', JSON.stringify(agentData, null, 2));
      console.log('Отправляемый payload в ElevenLabs:');
      console.log(JSON.stringify(createAgentPayload, null, 2));
      console.log('URL:', `${this.apiUrl}/convai/agents/create`);
      console.log('Headers:', JSON.stringify(this.getHeaders(), null, 2));

      const response = await axios.post(`${this.apiUrl}/convai/agents/create`, createAgentPayload, {
        headers: this.getHeaders(),
      });
      
      console.log('Успешный ответ от ElevenLabs:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error: any) {
      console.error('=== ОШИБКА СОЗДАНИЯ АГЕНТА ===');
      console.error('ElevenLabs API Error:', error.response?.data || error.message);
      console.error('Status:', error.response?.status);
      console.error('Headers:', error.response?.headers);
      if (error.response?.data) {
        console.error('Error details:', JSON.stringify(error.response.data, null, 2));
      }
      throw new Error('Не удалось создать агента');
    }
  }

  /**
   * Удаление базы знаний по ID
   */
  async deleteKnowledgeBase(knowledgeBaseId: string): Promise<void> {
    try {
      console.log('=== УДАЛЕНИЕ БАЗЫ ЗНАНИЙ В ELEVENLABS ===');
      console.log('Knowledge Base ID:', knowledgeBaseId);
      
      await axios.delete(`${this.apiUrl}/convai/knowledge-base/${knowledgeBaseId}`, {
        headers: this.getHeaders(),
      });
      
      console.log('База знаний успешно удалена:', knowledgeBaseId);
    } catch (error: any) {
      console.error('=== ОШИБКА ELEVENLABS API (УДАЛЕНИЕ БАЗЫ ЗНАНИЙ) ===');
      console.error('Knowledge Base ID:', knowledgeBaseId);
      console.error('Status:', error.response?.status);
      console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
      
      throw new Error(`Не удалось удалить базу знаний: ${error.response?.data?.detail?.message || error.message}`);
    }
  }

  /**
   * Получение детальной информации о базе знаний по ID
   */
  async getKnowledgeBaseById(knowledgeBaseId: string): Promise<KnowledgeBaseDetail> {
    try {
      console.log('=== ПОЛУЧЕНИЕ БАЗЫ ЗНАНИЙ ПО ID В ELEVENLABS ===');
      console.log('Knowledge Base ID:', knowledgeBaseId);
      
      const response = await axios.get(`${this.apiUrl}/convai/knowledge-base/${knowledgeBaseId}`, {
        headers: this.getHeaders(),
      });
      
      console.log('Успешно получена база знаний:', {
        id: response.data.id,
        name: response.data.name,
        type: response.data.type,
        size_bytes: response.data.metadata?.size_bytes,
        created_at: response.data.metadata?.created_at_unix_secs
      });
      
      return response.data;
    } catch (error: any) {
      console.error('=== ОШИБКА ELEVENLABS API (ПОЛУЧЕНИЕ БАЗЫ ЗНАНИЙ) ===');
      console.error('Knowledge Base ID:', knowledgeBaseId);
      console.error('Status:', error.response?.status);
      console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
      
      if (error.response?.status === 404) {
        throw new Error('База знаний не найдена');
      }
      
      throw new Error(`Не удалось получить детали базы знаний: ${error.response?.data?.detail?.message || error.message}`);
    }
  }

  /**
   * Получение информации о RAG индексе
   */
  async getRagIndexOverview(): Promise<RagIndexOverview> {
    try {
      console.log('=== ПОЛУЧЕНИЕ RAG INDEX OVERVIEW В ELEVENLABS ===');
      
      const response = await axios.get(`${this.apiUrl}/convai/knowledge-base/rag-index`, {
        headers: this.getHeaders(),
      });
      
      console.log('Успешно получена информация о RAG индексе:', {
        total_used_bytes: response.data.total_used_bytes,
        total_max_bytes: response.data.total_max_bytes,
        models_count: response.data.models?.length || 0,
        usage_percentage: ((response.data.total_used_bytes / response.data.total_max_bytes) * 100).toFixed(2) + '%'
      });
      
      return response.data;
    } catch (error: any) {
      console.error('=== ОШИБКА ELEVENLABS API (RAG INDEX OVERVIEW) ===');
      console.error('Status:', error.response?.status);
      console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
      
      throw new Error(`Не удалось получить информацию о RAG индексе: ${error.response?.data?.detail?.message || error.message}`);
    }
  }

  /**
   * Получение подписанного URL для WebSocket соединения с агентом
   */
  async getConversationSignedUrl(agentId: string): Promise<ConversationSignedUrl> {
    try {
      console.log('=== ПОЛУЧЕНИЕ ПОДПИСАННОГО URL ДЛЯ РАЗГОВОРА В ELEVENLABS ===');
      console.log('Agent ID:', agentId);
      
      const response = await axios.get(`${this.apiUrl}/convai/conversation/get-signed-url`, {
        headers: this.getHeaders(),
        params: {
          agent_id: agentId
        }
      });
      
      console.log('Успешно получен подписанный URL:', {
        agent_id: agentId,
        url_received: !!response.data.signed_url,
        url_preview: response.data.signed_url?.substring(0, 50) + '...'
      });
      
      return response.data;
    } catch (error: any) {
      console.error('=== ОШИБКА ELEVENLABS API (ПОДПИСАННЫЙ URL) ===');
      console.error('Agent ID:', agentId);
      console.error('Status:', error.response?.status);
      console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
      
      throw new Error(`Не удалось получить подписанный URL для разговора: ${error.response?.data?.detail?.message || error.message}`);
    }
  }

  /**
   * Создание SIP trunk номера телефона через API Eleven Labs
   */
  async createSIPTrunkPhoneNumber(phoneData: CreateSIPTrunkPhoneNumberRequest): Promise<CreateSIPTrunkPhoneNumberResponse> {
    try {
      console.log('=== СОЗДАНИЕ SIP TRUNK НОМЕРА В ELEVENLABS ===');
      console.log('Phone data:', {
        label: phoneData.label,
        phone_number: phoneData.phone_number,
        transport: phoneData.transport,
        media_encryption: phoneData.media_encryption,
        termination_uri: phoneData.termination_uri,
        has_credentials: !!phoneData.credentials
      });

      // Подготавливаем тело запроса согласно документации
      const requestBody = {
        label: phoneData.label,
        phone_number: phoneData.phone_number,
        termination_uri: phoneData.termination_uri,
        ...(phoneData.transport && { transport: phoneData.transport }),
        ...(phoneData.media_encryption && { media_encryption: phoneData.media_encryption }),
        ...(phoneData.credentials && { credentials: phoneData.credentials }),
        ...(phoneData.headers && { headers: phoneData.headers })
      };

      console.log('Отправляем запрос к API Eleven Labs:', requestBody);

      const response = await axios.post(
        `${this.apiUrl}/v1/convai/phone-numbers/create`,
        requestBody,
        {
          headers: this.getHeaders(),
          timeout: 30000
        }
      );

      console.log('=== SIP TRUNK НОМЕР УСПЕШНО СОЗДАН ===');
      console.log('API Response:', response.data);

      // Возвращаем phone_number_id из ответа API
      return {
        phone_number_id: response.data.phone_number_id,
        phone_number: phoneData.phone_number,
        label: phoneData.label,
        status: 'active',
        created_at: new Date().toISOString()
      };

    } catch (error: any) {
      console.error('=== ОШИБКА СОЗДАНИЯ SIP TRUNK НОМЕРА ===');
      console.error('Phone data:', phoneData);
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      
      if (error.response?.status === 422) {
        const validationErrors = error.response?.data?.detail || [];
        const errorMessages = Array.isArray(validationErrors) 
          ? validationErrors.map((err: any) => typeof err === 'object' ? JSON.stringify(err) : err).join('; ')
          : validationErrors;
        console.error('Детали ошибок валидации:', errorMessages);
        throw new Error(`Ошибка валидации данных: ${errorMessages}`);
      } else if (error.response?.status === 401) {
        throw new Error('Ошибка авторизации: проверьте API ключ Eleven Labs');
      } else if (error.response?.status >= 500) {
        throw new Error('Ошибка сервера Eleven Labs, попробуйте позже');
      }
      
      throw new Error(`Не удалось создать SIP trunk номер: ${error.response?.data?.detail?.message || error.message}`);
    }
  }

  /**
   * Создание Twilio номера телефона через API Eleven Labs
   */
  async createTwilioPhoneNumber(phoneData: CreateTwilioPhoneNumberRequest): Promise<CreateTwilioPhoneNumberResponse> {
    try {
      console.log('=== СОЗДАНИЕ TWILIO НОМЕРА В ELEVENLABS ===');
      console.log('Phone data:', {
        label: phoneData.label,
        phone_number: phoneData.phone_number,
        sid: phoneData.sid
      });

      // Подготавливаем тело запроса согласно документации
      const requestBody = {
        label: phoneData.label,
        phone_number: phoneData.phone_number,
        sid: phoneData.sid,
        token: phoneData.token
      };

      console.log('Отправляем запрос к API Eleven Labs:', { ...requestBody, token: '[СКРЫТО]' });

      const response = await axios.post(
        `${this.apiUrl}/v1/convai/phone-numbers/create`,
        requestBody,
        {
          headers: this.getHeaders(),
          timeout: 30000
        }
      );

      console.log('=== TWILIO НОМЕР УСПЕШНО СОЗДАН ===');
      console.log('API Response:', response.data);

      // Возвращаем phone_number_id из ответа API
      return {
        phone_number_id: response.data.phone_number_id,
        phone_number: phoneData.phone_number,
        label: phoneData.label,
        status: 'active',
        created_at: new Date().toISOString()
      };

    } catch (error: any) {
      console.error('=== ОШИБКА СОЗДАНИЯ TWILIO НОМЕРА ===');
      console.error('Phone data:', { ...phoneData, token: '[СКРЫТО]' });
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      
      if (error.response?.status === 422) {
        const validationErrors = error.response?.data?.detail || [];
        const errorMessages = Array.isArray(validationErrors) 
          ? validationErrors.map((err: any) => typeof err === 'object' ? JSON.stringify(err) : err).join('; ')
          : validationErrors;
        console.error('Детали ошибок валидации:', errorMessages);
        throw new Error(`Ошибка валидации данных: ${errorMessages}`);
      } else if (error.response?.status === 401) {
        throw new Error('Ошибка авторизации: проверьте API ключ Eleven Labs');
      } else if (error.response?.status >= 500) {
        throw new Error('Ошибка сервера Eleven Labs, попробуйте позже');
      }
      
      throw new Error(`Не удалось создать Twilio номер: ${error.response?.data?.detail?.message || error.message}`);
    }
  }

  /**
   * Получение списка номеров телефона
   */
  async getPhoneNumbers(): Promise<GetPhoneNumbersResponse> {
    try {
      console.log('=== ПОЛУЧЕНИЕ СПИСКА НОМЕРОВ ТЕЛЕФОНА В ELEVENLABS ===');
      
      const response = await axios.get(`${this.apiUrl}/convai/phone-numbers`, {
        headers: this.getHeaders(),
      });
      
             console.log('Успешно получен список номеров телефона:', {
         total_phone_numbers: response.data.phone_numbers.length,
         phone_numbers: response.data.phone_numbers.map((p: any) => ({
           phone_number: p.phone_number,
           label: p.label,
           phone_number_id: p.phone_number_id,
           provider: p.provider,
           assigned_agent: p.assigned_agent ? {
             agent_id: p.assigned_agent.agent_id,
             agent_name: p.assigned_agent.agent_name
           } : undefined
         }))
       });
      
      return response.data;
    } catch (error: any) {
      console.error('=== ОШИБКА ELEVENLABS API (СПИСОК НОМЕРОВ) ===');
      console.error('Status:', error.response?.status);
      console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
      
      throw new Error(`Не удалось получить список номеров телефона: ${error.response?.data?.detail?.message || error.message}`);
    }
  }
}

export const elevenLabsService = new ElevenLabsService(); 