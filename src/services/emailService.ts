import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

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