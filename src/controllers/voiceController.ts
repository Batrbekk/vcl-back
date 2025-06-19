import { Request, Response } from 'express';
import { elevenLabsService } from '../services/elevenLabsService';

// Получение списка доступных голосов
export const getVoices = async (req: Request, res: Response) => {
  try {
    const voices = await elevenLabsService.getVoices();
    res.json(voices);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при получении списка голосов' });
  }
};

// Генерация превью голоса
export const generateVoicePreview = async (req: Request, res: Response) => {
  try {
    const { voiceId } = req.params;
    const { text, voice_settings } = req.body;

    if (!text) {
      return res.status(400).json({ message: 'Текст для превью обязателен' });
    }

    const audioBuffer = await elevenLabsService.generateVoicePreview(voiceId, text, voice_settings);
    
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length,
    });
    
    res.send(audioBuffer);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при генерации превью голоса' });
  }
}; 