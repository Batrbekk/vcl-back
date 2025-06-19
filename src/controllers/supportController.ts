import { Request, Response } from 'express';
import { sendSupportEmail } from '../services/emailService';

/**
 * Отправка обращения в службу поддержки
 */
export const sendSupportTicket = async (req: Request, res: Response) => {
  try {
    const { clientName, clientEmail, problemType, subject, description } = req.body;

    // Валидация обязательных полей
    if (!clientName || !clientEmail || !problemType || !subject || !description) {
      return res.status(400).json({ 
        message: 'Все поля обязательны для заполнения',
        required_fields: ['clientName', 'clientEmail', 'problemType', 'subject', 'description']
      });
    }

    // Валидация email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clientEmail)) {
      return res.status(400).json({ message: 'Некорректный формат email' });
    }

    // Валидация типа проблемы
    const validProblemTypes = [
      'Техническая проблема',
      'Вопрос по функционалу',
      'Проблема с оплатой',
      'Предложение по улучшению',
      'Другое'
    ];

    if (!validProblemTypes.includes(problemType)) {
      return res.status(400).json({ 
        message: 'Некорректный тип проблемы',
        valid_types: validProblemTypes
      });
    }

    console.log('=== НОВОЕ ОБРАЩЕНИЕ В СЛУЖБУ ПОДДЕРЖКИ ===');
    console.log('Client Name:', clientName);
    console.log('Client Email:', clientEmail);
    console.log('Problem Type:', problemType);
    console.log('Subject:', subject);
    console.log('Description length:', description.length, 'characters');

    // Отправляем письмо в службу поддержки
    await sendSupportEmail({
      clientName,
      clientEmail,
      problemType,
      subject,
      description
    });

    console.log('Обращение в службу поддержки успешно отправлено');

    res.status(200).json({
      message: 'Ваше обращение успешно отправлено в службу поддержки',
      ticket_info: {
        client_name: clientName,
        client_email: clientEmail,
        problem_type: problemType,
        subject: subject,
        submitted_at: new Date(),
        status: 'Отправлено'
      }
    });
  } catch (error: any) {
    console.error('=== ОШИБКА ОТПРАВКИ ОБРАЩЕНИЯ В СЛУЖБУ ПОДДЕРЖКИ ===');
    console.error('Error sending support ticket:', error);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({ 
      message: 'Ошибка при отправке обращения в службу поддержки',
      details: error.message 
    });
  }
}; 