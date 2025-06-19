import axios from 'axios';

const ELEVEN_LABS_API_KEY = 'sk_b4497622adce173cb9b35b5b04f13228fb1d2fc6b63fe35e';
const ELEVEN_LABS_API_URL = 'https://api.elevenlabs.io/v1';

interface PhoneNumber {
  phone_number: string;
  label: string;
  phone_number_id: string;
  assigned_agent: string | null;
  provider: string;
  provider_config: {
    address: string;
    transport: string;
    media_encryption: string;
    headers: {
      'X-API-KEY': string;
    };
    has_auth_credentials: boolean;
    username: string;
    has_outbound_trunk: boolean;
  };
}

interface DeletePhoneNumberResponse {
  phone_number_id: string;
  deleted_at: string;
}

interface CreateTwilioPhoneNumberRequest {
  phone_number: string;
  label: string;
  sid: string;
  token: string;
  provider: 'twilio';
}

interface CreateSIPTrunkPhoneNumberRequest {
  phone_number: string;
  label: string;
  termination_uri: string;
  provider: 'sip_trunk';
  credentials: {
    username: string;
    password: string;
  };
  media_encryption: string;
  headers: Record<string, string>;
  address: string;
  transport: string;
}

type CreatePhoneNumberRequest = CreateTwilioPhoneNumberRequest | CreateSIPTrunkPhoneNumberRequest;

interface CreatePhoneNumberResponse {
  phone_number_id: string;
}

interface PhoneNumberDetail {
  phone_number: string;
  label: string;
  phone_number_id: string;
  assigned_agent: {
    agent_id: string;
    agent_name: string;
  } | null;
  provider: string;
  provider_config?: {
    address: string;
    transport: string;
    media_encryption: string;
    headers: {
      'X-API-KEY': string;
    };
    has_auth_credentials: boolean;
    username: string;
    has_outbound_trunk: boolean;
  };
}

interface AssignAgentRequest {
  agent_id: string;
}

interface AssignAgentResponse {
  phone_number: string;
  label: string;
  phone_number_id: string;
  assigned_agent: {
    agent_id: string;
    agent_name: string;
  };
  provider: string;
  provider_config?: {
    address: string;
    transport: string;
    media_encryption: string;
    headers: {
      'X-API-KEY': string;
    };
    has_auth_credentials: boolean;
    username: string;
    has_outbound_trunk: boolean;
  };
}

interface OutboundCallRequest {
  agent_id: string;
  agent_phone_number_id: string;
  to_number: string;
}

interface SipTrunkOutboundCallResponse {
  success: boolean;
  message: string;
  conversation_id: string;
  sip_call_id: string;
}

interface TwilioOutboundCallResponse {
  success: boolean;
  message: string;
  conversation_id: string;
  callSid: string;
}

interface BatchCall {
  id: string;
  phone_number_id: string;
  phone_provider: string;
  name: string;
  agent_id: string;
  created_at_unix: number;
  scheduled_time_unix: number;
  total_calls_dispatched: number;
  total_calls_scheduled: number;
  last_updated_at_unix: number;
  status: string;
  agent_name: string;
}

interface BatchCallsResponse {
  batch_calls: BatchCall[];
  next_doc: string | null;
  has_more: boolean;
}

interface ConversationConfigOverride {
  tts: {
    voice_id: string | null;
  };
  conversation: any | null;
  agent: {
    first_message: string;
    language: string;
    prompt: string | null;
  };
}

interface ConversationInitiationClientData {
  conversation_config_override: ConversationConfigOverride;
  custom_llm_extra_body: Record<string, any>;
  dynamic_variables: Record<string, any>;
}

interface BatchCallRecipient {
  id: string;
  phone_number: string;
  status: string;
  created_at_unix: number;
  updated_at_unix: number;
  conversation_id: string | null;
  conversation_initiation_client_data: ConversationInitiationClientData;
}

interface BatchCallDetail extends BatchCall {
  recipients: BatchCallRecipient[];
}

interface CancelBatchCallResponse {
  message: string;
  batch_call_id: string;
}

interface BatchCallRecipientRequest {
  id?: string;
  phone_number: string;
  conversation_initiation_client_data?: {
    conversation_config_override?: {
      agent?: {
        prompt?: string | null;
        first_message?: string | null;
        language?: string;
      };
      tts?: {
        voice_id?: string | null;
      };
      conversation?: any | null;
    };
    custom_llm_extra_body?: Record<string, any>;
    dynamic_variables?: Record<string, any>;
  };
}

interface CreateBatchCallRequest {
  call_name: string;
  agent_id: string;
  agent_phone_number_id: string;
  recipients: BatchCallRecipientRequest[];
  scheduled_time_unix?: number;
}

interface CreateBatchCallResponse {
  id: string;
  phone_number_id: string;
  name: string;
  agent_id: string;
  created_at_unix: number;
  scheduled_time_unix: number;
  total_calls_dispatched: number;
  total_calls_scheduled: number;
  last_updated_at_unix: number;
  status: string;
  agent_name: string;
  phone_provider: string;
}

export class PhoneService {
  private apiKey: string;
  private apiUrl: string;

  constructor() {
    this.apiKey = ELEVEN_LABS_API_KEY;
    this.apiUrl = ELEVEN_LABS_API_URL;
  }

  private getHeaders() {
    return {
      'xi-api-key': this.apiKey,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Получение списка телефонных номеров
   */
  async getPhoneNumbers(): Promise<PhoneNumber[]> {
    try {
      console.log('=== ПОЛУЧЕНИЕ СПИСКА ТЕЛЕФОННЫХ НОМЕРОВ В ELEVENLABS ===');
      
      const response = await axios.get(`${this.apiUrl}/convai/phone-numbers/`, {
        headers: this.getHeaders(),
      });
      
      console.log('Успешно получен список телефонных номеров:', {
        count: response.data.length,
        numbers: response.data.map((phone: PhoneNumber) => ({
          phone_number: phone.phone_number,
          label: phone.label,
          provider: phone.provider,
          assigned_agent: phone.assigned_agent
        }))
      });
      
      return response.data;
    } catch (error: any) {
      console.error('=== ОШИБКА ELEVENLABS API (ТЕЛЕФОННЫЕ НОМЕРА) ===');
      console.error('Status:', error.response?.status);
      console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
      
      throw new Error(`Не удалось получить список телефонных номеров: ${error.response?.data?.detail?.message || error.message}`);
    }
  }

  /**
   * Удаление телефонного номера
   */
  async deletePhoneNumber(phoneNumberId: string): Promise<DeletePhoneNumberResponse> {
    try {
      console.log('=== УДАЛЕНИЕ ТЕЛЕФОННОГО НОМЕРА В ELEVENLABS ===');
      console.log('Phone Number ID:', phoneNumberId);
      
      const response = await axios.delete(`${this.apiUrl}/convai/phone-numbers/${phoneNumberId}`, {
        headers: this.getHeaders(),
      });
      
      console.log('Телефонный номер успешно удален:', {
        phone_number_id: phoneNumberId,
        status: response.status
      });
      
      // ElevenLabs может вернуть пустой ответ при успешном удалении
      const deleteResponse: DeletePhoneNumberResponse = {
        phone_number_id: phoneNumberId,
        deleted_at: new Date().toISOString()
      };
      
      return deleteResponse;
    } catch (error: any) {
      console.error('=== ОШИБКА ELEVENLABS API (УДАЛЕНИЕ ТЕЛЕФОННОГО НОМЕРА) ===');
      console.error('Phone Number ID:', phoneNumberId);
      console.error('Status:', error.response?.status);
      console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
      
      if (error.response?.status === 404) {
        throw new Error(`Телефонный номер с ID ${phoneNumberId} не найден`);
      }
      
      throw new Error(`Не удалось удалить телефонный номер: ${error.response?.data?.detail?.message || error.message}`);
    }
  }

  /**
   * Создание телефонного номера
   */
  async createPhoneNumber(phoneData: CreatePhoneNumberRequest): Promise<CreatePhoneNumberResponse> {
    try {
      console.log('=== СОЗДАНИЕ ТЕЛЕФОННОГО НОМЕРА В ELEVENLABS ===');
      console.log('Provider:', phoneData.provider);
      console.log('Phone number:', phoneData.phone_number);
      console.log('Label:', phoneData.label);
      
      const response = await axios.post(`${this.apiUrl}/convai/phone-numbers/create`, phoneData, {
        headers: this.getHeaders(),
      });
      
      console.log('Телефонный номер успешно создан:', {
        phone_number_id: response.data.phone_number_id,
        provider: phoneData.provider,
        phone_number: phoneData.phone_number,
        status: response.status
      });
      
      return response.data;
    } catch (error: any) {
      console.error('=== ОШИБКА ELEVENLABS API (СОЗДАНИЕ ТЕЛЕФОННОГО НОМЕРА) ===');
      console.error('Provider:', phoneData.provider);
      console.error('Phone number:', phoneData.phone_number);
      console.error('Status:', error.response?.status);
      console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
      
      if (error.response?.status === 422) {
        throw new Error(`Ошибка валидации данных: ${error.response?.data?.detail?.message || 'Неверные данные для создания номера'}`);
      }
      
      throw new Error(`Не удалось создать телефонный номер: ${error.response?.data?.detail?.message || error.message}`);
    }
  }

  /**
   * Получение детальной информации о телефонном номере по ID
   */
  async getPhoneNumberById(phoneNumberId: string): Promise<PhoneNumberDetail> {
    try {
      console.log('=== ПОЛУЧЕНИЕ ДЕТАЛЬНОЙ ИНФОРМАЦИИ О ТЕЛЕФОННОМ НОМЕРЕ ===');
      console.log('Phone Number ID:', phoneNumberId);
      
      const response = await axios.get(`${this.apiUrl}/convai/phone-numbers/${phoneNumberId}`, {
        headers: this.getHeaders(),
      });
      
      console.log('Детальная информация о номере успешно получена:', {
        phone_number_id: response.data.phone_number_id,
        phone_number: response.data.phone_number,
        label: response.data.label,
        provider: response.data.provider,
        assigned_agent: response.data.assigned_agent
      });
      
      return response.data;
    } catch (error: any) {
      console.error('=== ОШИБКА ELEVENLABS API (ПОЛУЧЕНИЕ НОМЕРА ПО ID) ===');
      console.error('Phone Number ID:', phoneNumberId);
      console.error('Status:', error.response?.status);
      console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
      
      if (error.response?.status === 404) {
        throw new Error(`Телефонный номер с ID ${phoneNumberId} не найден`);
      }
      
      throw new Error(`Не удалось получить информацию о телефонном номере: ${error.response?.data?.detail?.message || error.message}`);
    }
  }

  /**
   * Привязка агента к телефонному номеру
   */
  async assignAgentToPhoneNumber(phoneNumberId: string, agentData: AssignAgentRequest): Promise<AssignAgentResponse> {
    try {
      console.log('=== ПРИВЯЗКА АГЕНТА К ТЕЛЕФОННОМУ НОМЕРУ ===');
      console.log('Phone Number ID:', phoneNumberId);
      console.log('Agent ID:', agentData.agent_id);
      
      const response = await axios.patch(`${this.apiUrl}/convai/phone-numbers/${phoneNumberId}`, agentData, {
        headers: this.getHeaders(),
      });
      
      console.log('Агент успешно привязан к номеру:', {
        phone_number_id: phoneNumberId,
        agent_id: response.data.assigned_agent?.agent_id,
        agent_name: response.data.assigned_agent?.agent_name,
        phone_number: response.data.phone_number
      });
      
      return response.data;
    } catch (error: any) {
      console.error('=== ОШИБКА ELEVENLABS API (ПРИВЯЗКА АГЕНТА К НОМЕРУ) ===');
      console.error('Phone Number ID:', phoneNumberId);
      console.error('Agent ID:', agentData.agent_id);
      console.error('Status:', error.response?.status);
      console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
      
      if (error.response?.status === 404) {
        throw new Error(`Телефонный номер с ID ${phoneNumberId} или агент с ID ${agentData.agent_id} не найден`);
      }
      
      if (error.response?.status === 422) {
        throw new Error(`Ошибка валидации: ${error.response?.data?.detail?.message || 'Неверные данные для привязки агента'}`);
      }
      
      throw new Error(`Не удалось привязать агента к номеру: ${error.response?.data?.detail?.message || error.message}`);
    }
  }

  /**
   * Исходящий звонок через SIP trunk
   */
  async makeSipTrunkOutboundCall(callData: OutboundCallRequest): Promise<SipTrunkOutboundCallResponse> {
    try {
      console.log('=== ИСХОДЯЩИЙ ЗВОНОК ЧЕРЕЗ SIP TRUNK ===');
      console.log('Agent ID:', callData.agent_id);
      console.log('Phone Number ID:', callData.agent_phone_number_id);
      console.log('To Number:', callData.to_number);
      
      const response = await axios.post(`${this.apiUrl}/convai/sip-trunk/outbound-call`, callData, {
        headers: this.getHeaders(),
      });
      
      console.log('Исходящий звонок через SIP trunk успешно инициирован:', {
        conversation_id: response.data.conversation_id,
        sip_call_id: response.data.sip_call_id,
        success: response.data.success,
        to_number: callData.to_number
      });
      
      return response.data;
    } catch (error: any) {
      console.error('=== ОШИБКА ELEVENLABS API (SIP TRUNK ИСХОДЯЩИЙ ЗВОНОК) ===');
      console.error('Agent ID:', callData.agent_id);
      console.error('Phone Number ID:', callData.agent_phone_number_id);
      console.error('To Number:', callData.to_number);
      console.error('Status:', error.response?.status);
      console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
      
      if (error.response?.status === 404) {
        throw new Error(`Агент с ID ${callData.agent_id} или номер с ID ${callData.agent_phone_number_id} не найден`);
      }
      
      if (error.response?.status === 422) {
        throw new Error(`Ошибка валидации: ${error.response?.data?.detail?.message || 'Неверные данные для звонка'}`);
      }
      
      throw new Error(`Не удалось выполнить исходящий звонок через SIP trunk: ${error.response?.data?.detail?.message || error.message}`);
    }
  }

  /**
   * Исходящий звонок через Twilio
   */
  async makeTwilioOutboundCall(callData: OutboundCallRequest): Promise<TwilioOutboundCallResponse> {
    try {
      console.log('=== ИСХОДЯЩИЙ ЗВОНОК ЧЕРЕЗ TWILIO ===');
      console.log('Agent ID:', callData.agent_id);
      console.log('Phone Number ID:', callData.agent_phone_number_id);
      console.log('To Number:', callData.to_number);
      
      const response = await axios.post(`${this.apiUrl}/convai/twilio/outbound-call`, callData, {
        headers: this.getHeaders(),
      });
      
      console.log('Исходящий звонок через Twilio успешно инициирован:', {
        conversation_id: response.data.conversation_id,
        callSid: response.data.callSid,
        success: response.data.success,
        to_number: callData.to_number
      });
      
      return response.data;
    } catch (error: any) {
      console.error('=== ОШИБКА ELEVENLABS API (TWILIO ИСХОДЯЩИЙ ЗВОНОК) ===');
      console.error('Agent ID:', callData.agent_id);
      console.error('Phone Number ID:', callData.agent_phone_number_id);
      console.error('To Number:', callData.to_number);
      console.error('Status:', error.response?.status);
      console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
      
      if (error.response?.status === 404) {
        throw new Error(`Агент с ID ${callData.agent_id} или номер с ID ${callData.agent_phone_number_id} не найден`);
      }
      
      if (error.response?.status === 422) {
        throw new Error(`Ошибка валидации: ${error.response?.data?.detail?.message || 'Неверные данные для звонка'}`);
      }
      
      throw new Error(`Не удалось выполнить исходящий звонок через Twilio: ${error.response?.data?.detail?.message || error.message}`);
    }
  }

  /**
   * Получение списка batch calls (планируемых исходящих звонков)
   */
  async getBatchCalls(): Promise<BatchCallsResponse> {
    try {
      console.log('=== ПОЛУЧЕНИЕ СПИСКА BATCH CALLS ===');
      
      const response = await axios.get(`${this.apiUrl}/convai/batch-calling/workspace`, {
        headers: this.getHeaders(),
      });
      
      console.log('Список batch calls успешно получен:', {
        count: response.data.batch_calls.length,
        has_more: response.data.has_more,
        batch_calls: response.data.batch_calls.map((batch: BatchCall) => ({
          id: batch.id,
          name: batch.name,
          status: batch.status,
          agent_name: batch.agent_name,
          total_calls: batch.total_calls_scheduled
        }))
      });
      
      return response.data;
    } catch (error: any) {
      console.error('=== ОШИБКА ELEVENLABS API (ПОЛУЧЕНИЕ BATCH CALLS) ===');
      console.error('Status:', error.response?.status);
      console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
      
      throw new Error(`Не удалось получить список batch calls: ${error.response?.data?.detail?.message || error.message}`);
    }
  }

  /**
   * Получение детальной информации о batch call по ID
   */
  async getBatchCallById(batchCallId: string): Promise<BatchCallDetail> {
    try {
      console.log('=== ПОЛУЧЕНИЕ BATCH CALL ПО ID ===');
      console.log('Batch Call ID:', batchCallId);
      
      const response = await axios.get(`${this.apiUrl}/convai/batch-calling/${batchCallId}`, {
        headers: this.getHeaders(),
      });
      
      console.log('Детальная информация о batch call получена:', {
        id: response.data.id,
        name: response.data.name,
        status: response.data.status,
        agent_name: response.data.agent_name,
        total_recipients: response.data.recipients.length,
        recipients_status: response.data.recipients.map((r: BatchCallRecipient) => ({
          id: r.id,
          phone_number: r.phone_number,
          status: r.status,
          conversation_id: r.conversation_id
        }))
      });
      
      return response.data;
    } catch (error: any) {
      console.error('=== ОШИБКА ELEVENLABS API (ПОЛУЧЕНИЕ BATCH CALL ПО ID) ===');
      console.error('Batch Call ID:', batchCallId);
      console.error('Status:', error.response?.status);
      console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
      
      if (error.response?.status === 404) {
        throw new Error(`Batch call с ID ${batchCallId} не найден`);
      }
      
      throw new Error(`Не удалось получить batch call: ${error.response?.data?.detail?.message || error.message}`);
    }
  }

  /**
   * Отмена batch call
   */
  async cancelBatchCall(batchCallId: string): Promise<CancelBatchCallResponse> {
    try {
      console.log('=== ОТМЕНА BATCH CALL ===');
      console.log('Batch Call ID:', batchCallId);
      
      const response = await axios.post(`${this.apiUrl}/convai/batch-calling/${batchCallId}/cancel`, {}, {
        headers: this.getHeaders(),
      });
      
      console.log('Batch call успешно отменен:', {
        batch_call_id: batchCallId,
        status: response.status,
        response_data: response.data
      });
      
      return {
        message: 'Batch call успешно отменен',
        batch_call_id: batchCallId
      };
    } catch (error: any) {
      console.error('=== ОШИБКА ELEVENLABS API (ОТМЕНА BATCH CALL) ===');
      console.error('Batch Call ID:', batchCallId);
      console.error('Status:', error.response?.status);
      console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
      
      if (error.response?.status === 404) {
        throw new Error(`Batch call с ID ${batchCallId} не найден`);
      }
      
      if (error.response?.status === 400) {
        throw new Error(`Невозможно отменить batch call: ${error.response?.data?.detail?.message || 'batch call уже завершен или отменен'}`);
      }
      
      throw new Error(`Не удалось отменить batch call: ${error.response?.data?.detail?.message || error.message}`);
    }
  }

  /**
   * Создание batch call
   */
  async createBatchCall(batchCallData: CreateBatchCallRequest): Promise<CreateBatchCallResponse> {
    try {
      console.log('=== СОЗДАНИЕ BATCH CALL ===');
      console.log('Данные для создания:', {
        call_name: batchCallData.call_name,
        agent_id: batchCallData.agent_id,
        agent_phone_number_id: batchCallData.agent_phone_number_id,
        recipients_count: batchCallData.recipients.length,
        scheduled_time_unix: batchCallData.scheduled_time_unix
      });
      
      console.log('Получатели:', batchCallData.recipients.map(r => ({
        phone_number: r.phone_number,
        dynamic_variables: r.conversation_initiation_client_data?.dynamic_variables,
        first_message: r.conversation_initiation_client_data?.conversation_config_override?.agent?.first_message,
        language: r.conversation_initiation_client_data?.conversation_config_override?.agent?.language
      })));

      const response = await axios.post(`${this.apiUrl}/convai/batch-calling/submit`, batchCallData, {
        headers: this.getHeaders(),
      });
      
      console.log('Batch call успешно создан:', {
        id: response.data.id,
        name: response.data.name,
        status: response.data.status,
        agent_name: response.data.agent_name,
        total_calls_scheduled: response.data.total_calls_scheduled,
        phone_provider: response.data.phone_provider
      });
      
      return response.data;
    } catch (error: any) {
      console.error('=== ОШИБКА ELEVENLABS API (СОЗДАНИЕ BATCH CALL) ===');
      console.error('Request data:', JSON.stringify(batchCallData, null, 2));
      console.error('Status:', error.response?.status);
      console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
      
      if (error.response?.status === 422) {
        throw new Error(`Ошибка валидации данных: ${JSON.stringify(error.response?.data?.detail || error.response?.data)}`);
      }
      
      if (error.response?.status === 400) {
        throw new Error(`Неверные данные для создания batch call: ${error.response?.data?.detail?.message || error.message}`);
      }
      
      throw new Error(`Не удалось создать batch call: ${error.response?.data?.detail?.message || error.message}`);
    }
  }
}

export const phoneService = new PhoneService(); 