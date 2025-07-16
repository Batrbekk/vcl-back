import { Request } from 'express';
import { User, Company, Agent, Manager, ElevenLabsAgent, PhoneNumber } from '../../generated/prisma';

// Базовые типы пользователей для аутентификации
export interface BaseUser {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
}

// Расширенный пользователь после аутентификации
export interface ExtendedUser extends BaseUser {
  companyId?: string;
  company?: {
    id: string;
    name: string;
    slug: string;
  };
}

// Полностью аутентифицированный пользователь с информацией о компании
export interface AuthenticatedUser extends ExtendedUser {
  companyId: string;
  company: {
    id: string;
    name: string;
    slug: string;
  };
}

// Типы запросов для разных уровней middleware
export interface AuthenticatedRequest extends Request {
  user?: ExtendedUser;
}

export interface CustomRequest extends Request {
  user?: AuthenticatedUser;
}

// Типы для JWT токенов
export interface JWTPayload {
  userId: string;
  userType?: 'user' | 'manager';
  iat?: number;
  exp?: number;
}

// Интерфейсы для моделей данных (экспортируются из Prisma)
export type IUser = User;
export type ICompany = Company;
export type IAgent = Agent;
export type IManager = Manager;
export type IElevenLabsAgent = ElevenLabsAgent;
export type IPhoneNumber = PhoneNumber;

// Типы для создания сущностей
export interface CreateUserData {
  email: string;
  firstName: string;
  lastName: string;
  companyName: string;
  password: string;
  companyId: string;
}

export interface CreateCompanyData {
  name: string;
  slug: string;
  createdBy: string;
  timezone?: string;
  currency?: string;
  language?: string;
}

export interface CreateAgentData {
  name: string;
  description: string;
  voiceId: string;
  language: string;
  gender: string;
  greetingTemplate: string;
  fallbackTemplate: string;
  summaryTemplate: string;
  aiModel: string;
  aiContextPrompt: string;
  allowedHoursStart: string;
  allowedHoursEnd: string;
  allowedHoursTimezone: string;
  adminId: string;
  companyId: string;
}

export interface CreateManagerData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  adminId: string;
  companyId: string;
  companyName?: string;
}

export interface CreateElevenLabsAgentData {
  agentId: string;
  name: string;
  tags: string[];
  createdAtUnixSecs: number;
  isCreator: boolean;
  creatorName: string;
  creatorEmail: string;
  creatorRole: string;
  adminId: string;
  companyId: string;
}

// Типы для обновления сущностей
export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  companyName?: string;
  password?: string;
  isVerified?: boolean;
  verificationCode?: string;
  resetPasswordCode?: string;
}

export interface UpdateCompanyData {
  name?: string;
  slug?: string;
  timezone?: string;
  currency?: string;
  language?: string;
  subscriptionPlan?: string;
  subscriptionStatus?: string;
  subscriptionExpiresAt?: Date;
  maxAgents?: number;
  maxPhoneNumbers?: number;
  maxManagers?: number;
  maxMonthlyCalls?: number;
  isActive?: boolean;
}

export interface UpdateAgentData {
  name?: string;
  description?: string;
  voiceId?: string;
  language?: string;
  gender?: string;
  greetingTemplate?: string;
  fallbackTemplate?: string;
  summaryTemplate?: string;
  phoneNumber?: string;
  isActive?: boolean;
  integratedWithAi?: boolean;
  aiModel?: string;
  aiContextPrompt?: string;
  elevenLabsAgentId?: string;
  voiceStability?: number;
  voiceSimilarityBoost?: number;
  voiceStyle?: number;
  voiceUseSpeakerBoost?: boolean;
  voiceSpeed?: number;
  allowedHoursStart?: string;
  allowedHoursEnd?: string;
  allowedHoursTimezone?: string;
}

// Типы для ElevenLabs API
export interface ElevenLabsAgentResponse {
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
  conversation_config?: any;
  metadata?: any;
  platform_settings?: any;
  phone_numbers?: string[];
}

export interface ElevenLabsAgentListResponse {
  agents: ElevenLabsAgentResponse[];
}

// Типы для валидации
export interface ValidationError {
  field: string;
  message: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: ValidationError[];
}

// Типы для пагинации
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// Типы для фильтрации
export interface CompanyFilter {
  isActive?: boolean;
  subscriptionStatus?: string;
  subscriptionPlan?: string;
  createdBy?: string;
} 