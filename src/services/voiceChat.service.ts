import { Server, Socket } from 'socket.io';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';

export class VoiceChatService {
  private io: Server;
  private genAI: GoogleGenerativeAI;

  constructor(io: Server) {
    this.io = io;
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI || '');
    this.setupSocketHandlers();
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log('Client connected');

      socket.on('start-stream', async () => {
        // Инициализация сессии
        console.log('Stream started');
      });

      socket.on('audio-data', async (audioData: ArrayBuffer) => {
        try {
          // 1. Конвертируем аудио в текст через ElevenLabs
          const text = await this.convertSpeechToText(audioData);
          
          // 2. Получаем ответ от Gemini
          const response = await this.getGeminiResponse(text);
          
          // 3. Конвертируем ответ в аудио
          const audioResponse = await this.convertTextToSpeech(response);
          
          // 4. Отправляем аудио ответ клиенту
          socket.emit('audio-response', audioResponse);
        } catch (error) {
          console.error('Error processing audio:', error);
          socket.emit('error', { message: 'Error processing audio' });
        }
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected');
      });
    });
  }

  private async convertSpeechToText(audioData: ArrayBuffer): Promise<string> {
    try {
      // Здесь будет реализация конвертации через ElevenLabs API
      const response = await axios.post('https://api.elevenlabs.io/v1/speech-to-text', audioData, {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'audio/wav'
        }
      });
      return response.data.text;
    } catch (error) {
      console.error('Speech to text conversion error:', error);
      throw error;
    }
  }

  private async getGeminiResponse(text: string): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
      const result = await model.generateContent(text);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini API error:', error);
      throw error;
    }
  }

  private async convertTextToSpeech(text: string): Promise<ArrayBuffer> {
    try {
      // Здесь будет реализация конвертации через ElevenLabs API
      const response = await axios.post('https://api.elevenlabs.io/v1/text-to-speech', 
        { text },
        {
          headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer'
        }
      );
      return response.data;
    } catch (error) {
      console.error('Text to speech conversion error:', error);
      throw error;
    }
  }
} 