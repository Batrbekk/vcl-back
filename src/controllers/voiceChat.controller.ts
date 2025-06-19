import { Server } from 'socket.io';
import { VoiceChatService } from '../services/voiceChat.service';
import { Request, Response } from 'express';

export class VoiceChatController {
  private voiceChatService: VoiceChatService;

  constructor(io: Server) {
    this.voiceChatService = new VoiceChatService(io);
  }

  // REST endpoint для получения информации о текущей сессии
  public async getSessionInfo(req: Request, res: Response): Promise<void> {
    try {
      res.json({
        status: 'active',
        supportedFormats: ['audio/wav'],
        maxAudioDuration: 60, // в секундах
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
} 