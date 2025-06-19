import mongoose, { Document, Schema } from 'mongoose';

export interface IElevenLabsAgent extends Document {
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
  conversation_config?: {
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
  metadata?: {
    created_at_unix_secs: number;
  };
  platform_settings?: {
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
  phone_numbers?: string[];
  synced_at: Date;
  adminId: mongoose.Types.ObjectId;
}

const elevenLabsAgentSchema = new Schema<IElevenLabsAgent>({
  agent_id: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  created_at_unix_secs: {
    type: Number,
    required: true
  },
  access_info: {
    is_creator: {
      type: Boolean,
      required: true
    },
    creator_name: {
      type: String,
      required: true,
      trim: true
    },
    creator_email: {
      type: String,
      required: true,
      trim: true
    },
    role: {
      type: String,
      required: true,
      trim: true
    }
  },
  conversation_config: {
    type: Schema.Types.Mixed
  },
  metadata: {
    type: Schema.Types.Mixed
  },
  platform_settings: {
    type: Schema.Types.Mixed
  },
  phone_numbers: [{
    type: String,
    trim: true
  }],
  synced_at: {
    type: Date,
    default: Date.now
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Индекс для быстрого поиска по agent_id
elevenLabsAgentSchema.index({ agent_id: 1 });
elevenLabsAgentSchema.index({ adminId: 1 });

export const ElevenLabsAgent = mongoose.model<IElevenLabsAgent>('ElevenLabsAgent', elevenLabsAgentSchema); 