export const getManagerWelcomeEmailTemplate = (
  managerName: string,
  email: string,
  password: string,
  adminName: string,
  companyName: string
): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          background-color: #ffffff;
          border-radius: 10px;
          padding: 30px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .header img {
          max-width: 150px;
          margin-bottom: 20px;
        }
        .welcome {
          font-size: 24px;
          color: #9077FF;
          margin-bottom: 20px;
          text-align: center;
        }
        .content {
          margin-bottom: 30px;
        }
        .credentials {
          background-color: #f3f4f6;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .credentials p {
          margin: 10px 0;
        }
        .button {
          display: inline-block;
          background-color: #9077FF;
          color: #ffffff!important;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          color: #6b7280;
          font-size: 14px;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2 style="color: #333;">Добро пожаловать в VCL!</h2>
          <h1 class="welcome">Добро пожаловать в команду!</h1>
        </div>
        
        <div class="content">
          <p>Уважаемый(ая) ${managerName},</p>
          
          <p>Вас назначили менеджером в компании "${companyName}". Ваш администратор, ${adminName}, предоставил вам доступ к системе управления.</p>
          
          <div class="credentials">
            <h3>Ваши данные для входа:</h3>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Пароль:</strong> ${password}</p>
          </div>
          
          <p>Для начала работы перейдите по ссылке ниже и войдите в систему, используя предоставленные учетные данные:</p>
          
          <center>
            <a href="https://vcl-delta.vercel.app/" class="button">Войти в систему</a>
          </center>
          
          <p>После первого входа рекомендуем сменить пароль на более надежный.</p>
        </div>
        
        <div class="footer">
          <p>Это автоматическое письмо, пожалуйста, не отвечайте на него.</p>
          <p>По всем вопросам обращайтесь к вашему администратору: ${adminName}</p>
          <p>&copy; ${new Date().getFullYear()} VCL. Все права защищены.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}; 