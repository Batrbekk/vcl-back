import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { getManagerWelcomeEmailTemplate } from './emailTemplates';

dotenv.config();

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
  throw new Error('Email credentials are not properly configured in environment variables');
}

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  debug: true,
  logger: true
});

export const sendVerificationEmail = async (email: string, code: string) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Подтверждение регистрации VCL',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Добро пожаловать в VCL!</h2>
        <p>Спасибо за регистрацию. Для подтверждения вашего email используйте следующий код:</p>
        <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #333; margin: 0;">${code}</h1>
        </div>
        <p>Этот код действителен в течение 24 часов.</p>
        <p>Если вы не регистрировались в VCL, проигнорируйте это письмо.</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">© 2024 VCL. Все права защищены.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

export const sendResetPasswordEmail = async (email: string, code: string) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Сброс пароля VCL',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Сброс пароля VCL</h2>
        <p>Для сброса вашего пароля используйте следующий код:</p>
        <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #333; margin: 0;">${code}</h1>
        </div>
        <p>Этот код действителен в течение 1 часа.</p>
        <p>Если вы не запрашивали сброс пароля, проигнорируйте это письмо.</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">© 2024 VCL. Все права защищены.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

interface ManagerEmailData {
  managerName: string;
  email: string;
  password: string;
  adminName: string;
  companyName: string;
}

interface SupportTicketData {
  clientName: string;
  clientEmail: string;
  problemType: string;
  subject: string;
  description: string;
}

export const sendManagerWelcomeEmail = async (data: ManagerEmailData) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: data.email,
    subject: 'Добро пожаловать в VCL - Ваши учетные данные',
    html: getManagerWelcomeEmailTemplate(
      data.managerName,
      data.email,
      data.password,
      data.adminName,
      data.companyName
    )
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending manager welcome email:', error);
    // Не выбрасываем ошибку, так как это не критичная операция
  }
};

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

// Создаем транспорт для отправки писем
const transporterForEmail = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

// Функция для отправки email
export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    await transporterForEmail.sendMail({
      from: `"VCL" <${process.env.SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html
    });
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email');
  }
};

/**
 * Отправка обращения в службу поддержки
 */
export const sendSupportEmail = async (data: SupportTicketData) => {
  const supportEmail = process.env.EMAIL_USER; // Отправляем самому себе
  
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: supportEmail,
    subject: `[VCL Support] ${data.problemType}: ${data.subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #9077FF; margin: 0 0 20px 0;">🎧 Новое обращение в службу поддержки VCL</h2>
        </div>
        
        <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #333; margin-bottom: 15px;">📋 Информация о клиенте</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #555; width: 120px;">Имя:</td>
              <td style="padding: 8px 0; color: #333;">${data.clientName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #555;">Email:</td>
              <td style="padding: 8px 0; color: #333;">${data.clientEmail}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #555;">Тип проблемы:</td>
              <td style="padding: 8px 0; color: #333;">${data.problemType}</td>
            </tr>
          </table>
        </div>
        
        <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #333; margin-bottom: 15px;">📝 Детали обращения</h3>
          <div style="margin-bottom: 15px;">
            <strong style="color: #555;">Тема:</strong>
            <div style="padding: 10px; background-color: #f8f9fa; border-radius: 4px; margin-top: 5px;">
              ${data.subject}
            </div>
          </div>
          <div>
            <strong style="color: #555;">Описание:</strong>
            <div style="padding: 15px; background-color: #f8f9fa; border-radius: 4px; margin-top: 5px; line-height: 1.6;">
              ${data.description.replace(/\n/g, '<br>')}
            </div>
          </div>
        </div>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0; color: #856404;">
            <strong>📧 Для ответа клиенту:</strong> ${data.clientEmail}
          </p>
        </div>
        
        <div style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p>Это автоматическое уведомление от системы VCL</p>
          <p>Дата получения: ${new Date().toLocaleString('ru-RU')}</p>
          <p>&copy; ${new Date().getFullYear()} VCL. Все права защищены.</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Support email sent successfully to:', supportEmail);
  } catch (error) {
    console.error('Error sending support email:', error);
    throw new Error('Не удалось отправить обращение в службу поддержки');
  }
}; 