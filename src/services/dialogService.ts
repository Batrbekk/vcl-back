import { elevenLabsService } from './elevenLabsService';

interface DialogMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface DialogResponse {
  text: string;
  audio: Buffer;
}

interface DialogSummary {
  transcript: DialogMessage[];
  summary: string;
  duration: string;
}

export class DialogService {
  private conversations: Map<string, DialogMessage[]> = new Map();

  async startDialog(agentId: string): Promise<string> {
    const dialogId = `dialog_${Date.now()}_${agentId}`;
    this.conversations.set(dialogId, []);
    return dialogId;
  }

  async processUserMessage(
    dialogId: string,
    agentId: string,
    voiceId: string,
    voiceSettings: any,
    userMessage: string,
    aiContextPrompt: string
  ): Promise<DialogResponse> {
    const conversation = this.conversations.get(dialogId) || [];
    
    // Добавляем сообщение пользователя
    conversation.push({
      role: 'user',
      content: userMessage
    });

    // TODO: Здесь будет интеграция с AI моделью для генерации ответа
    // Пока используем заглушку
    const assistantResponse = "Спасибо за ваше сообщение. Я обрабатываю ваш запрос.";
    
    // Добавляем ответ ассистента
    conversation.push({
      role: 'assistant',
      content: assistantResponse
    });

    // Сохраняем обновленную беседу
    this.conversations.set(dialogId, conversation);

    // Генерируем аудио ответ
    const audio = await elevenLabsService.generateVoicePreview(
      voiceId,
      assistantResponse,
      voiceSettings
    );

    return {
      text: assistantResponse,
      audio
    };
  }

  async getDialogSummary(dialogId: string): Promise<DialogSummary> {
    const conversation = this.conversations.get(dialogId) || [];
    
    // Создаем транскрипт
    const transcript = conversation;

    // Генерируем саммари
    const summary = "Краткое содержание разговора..."; // TODO: Использовать AI для генерации саммари

    // Вычисляем длительность
    const startTime = parseInt(dialogId.split('_')[1]);
    const duration = this.formatDuration(Date.now() - startTime);

    return {
      transcript,
      summary,
      duration
    };
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    const pad = (num: number) => num.toString().padStart(2, '0');
    
    return `${pad(hours)}:${pad(minutes % 60)}:${pad(seconds % 60)}`;
  }
}

export const dialogService = new DialogService(); 