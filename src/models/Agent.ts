import mongoose, { Document, Schema } from 'mongoose';

export interface IAgent extends Document {
  name: string;
  description: string;
  voice_id: string;
  voice_settings: {
    stability: number;
    similarity_boost: number;
    style: number;
    use_speaker_boost: boolean;
    speed: number;
  };
  language: string;
  gender: string;
  greeting_template: string;
  fallback_template: string;
  summary_template: string;
  allowed_hours: {
    start: string;
    end: string;
    timezone: string;
  };
  integrated_with_ai: boolean;
  ai_model: string;
  ai_context_prompt: string;
  phone_number: string;
  is_active: boolean;
  adminId: mongoose.Types.ObjectId;
}

const agentSchema = new Schema<IAgent>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  voice_id: {
    type: String,
    required: true,
    trim: true
  },
  voice_settings: {
    stability: {
      type: Number,
      required: true,
      min: 0,
      max: 1
    },
    similarity_boost: {
      type: Number,
      required: true,
      min: 0,
      max: 1
    },
    style: {
      type: Number,
      required: true,
      min: 0,
      max: 1
    },
    use_speaker_boost: {
      type: Boolean,
      required: true,
      default: true
    },
    speed: {
      type: Number,
      required: true,
      min: 0.1,
      max: 5.0,
      default: 1
    }
  },
  language: {
    type: String,
    required: true,
    trim: true
  },
  gender: {
    type: String,
    required: true,
    enum: ['male', 'female']
  },
  greeting_template: {
    type: String,
    required: true,
    trim: true
  },
  fallback_template: {
    type: String,
    required: true,
    trim: true
  },
  summary_template: {
    type: String,
    required: true,
    trim: true
  },
  allowed_hours: {
    start: {
      type: String,
      required: true,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    },
    end: {
      type: String,
      required: true,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    },
    timezone: {
      type: String,
      required: true,
      trim: true
    }
  },
  integrated_with_ai: {
    type: Boolean,
    default: true
  },
  ai_model: {
    type: String,
    required: true,
    trim: true
  },
  ai_context_prompt: {
    type: String,
    required: true,
    trim: true
  },
  phone_number: {
    type: String,
    required: false,
    trim: true,
    match: /^\+[1-9]\d{10,14}$/
  },
  is_active: {
    type: Boolean,
    default: true
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

export const Agent = mongoose.model<IAgent>('Agent', agentSchema); 