const nodemailer = require('nodemailer');

// Глобальная переменная для тестового транспортера
let testTransporter = null;
let testAccount = null;

// Создание транспортера для отправки email
const createTransporter = async () => {
  // Если указаны SMTP настройки, используем их
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true для 465, false для других портов
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  
  // Для разработки: создаем реальный тестовый аккаунт Ethereal Email
  // В продакшене обязательно настройте SMTP!
  if (!testTransporter) {
    console.warn('⚠️  SMTP не настроен! Создаю тестовый аккаунт Ethereal Email для разработки.');
    console.warn('⚠️  Для продакшена настройте переменные окружения SMTP_* в .env файле');
    
    try {
      testAccount = await nodemailer.createTestAccount();
      testTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      console.log('✅ Тестовый аккаунт Ethereal Email создан');
    } catch (error) {
      console.error('❌ Ошибка создания тестового аккаунта:', error.message);
      // Возвращаем null, чтобы использовать режим разработки без email
      return null;
    }
  }
  
  return testTransporter;
};

// Получение транспортера (создается при первом использовании)
const getTransporter = async () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const transportConfig = {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    };
    
    // Дополнительные настройки для Zoho Mail
    if (process.env.SMTP_HOST.includes('zoho')) {
      transportConfig.requireTLS = true;
      transportConfig.tls = {
        rejectUnauthorized: false,
        ciphers: 'SSLv3'
      };
    }
    
    return nodemailer.createTransport(transportConfig);
  }
  return await createTransporter();
};

// Отправка OTP кода
const sendOTP = async (email, code) => {
  try {
    const transporter = await getTransporter();
    
    // Если транспортер не создан (режим разработки без SMTP)
    if (!transporter) {
      console.log('\n═══════════════════════════════════════════════════════');
      console.log('📧 РЕЖИМ РАЗРАБОТКИ: Email не отправлен');
      console.log('═══════════════════════════════════════════════════════');
      console.log(`Email: ${email}`);
      console.log(`Код подтверждения: ${code}`);
      console.log('═══════════════════════════════════════════════════════\n');
      // В режиме разработки просто возвращаем успех
      return { messageId: 'dev-mode', accepted: [email] };
    }
    
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@shiply.kz',
      to: email,
      subject: 'Код подтверждения email - SHIPLY.KZ',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .code { background: #fff; border: 2px dashed #667eea; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0; color: #667eea; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>SHIPLY.KZ</h1>
              <p>Подтверждение email адреса</p>
            </div>
            <div class="content">
              <p>Здравствуйте!</p>
              <p>Вы получили этот код для подтверждения вашего email адреса при регистрации на платформе SHIPLY.KZ.</p>
              <div class="code">${code}</div>
              <p>Введите этот код на странице регистрации для продолжения.</p>
              <p><strong>Код действителен в течение 10 минут.</strong></p>
              <p>Если вы не запрашивали этот код, просто проигнорируйте это письмо.</p>
            </div>
            <div class="footer">
              <p>© 2026 SHIPLY.KZ. Все права защищены.</p>
              <p>Это автоматическое письмо, пожалуйста, не отвечайте на него.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
SHIPLY.KZ - Подтверждение email

Здравствуйте!

Вы получили этот код для подтверждения вашего email адреса при регистрации на платформе SHIPLY.KZ.

Ваш код подтверждения: ${code}

Введите этот код на странице регистрации для продолжения.

Код действителен в течение 10 минут.

Если вы не запрашивали этот код, просто проигнорируйте это письмо.

© 2026 SHIPLY.KZ. Все права защищены.
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email отправлен:', info.messageId);
    
    // Если используется тестовый аккаунт Ethereal, выводим ссылку для просмотра
    if (info.accepted && info.accepted.length > 0 && info.messageId) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log('\n═══════════════════════════════════════════════════════');
        console.log('📧 ТЕСТОВОЕ ПИСЬМО (Ethereal Email)');
        console.log('═══════════════════════════════════════════════════════');
        console.log('Просмотреть письмо можно по ссылке:');
        console.log(previewUrl);
        console.log('═══════════════════════════════════════════════════════\n');
      }
    }
    
    return info;
  } catch (error) {
    console.error('❌ Ошибка отправки email:', error.message);
    console.error('Детали ошибки:', error);
    console.error('Код ошибки:', error.code);
    console.error('Команда SMTP:', error.command);
    console.error('Ответ SMTP:', error.response);
    
    // В режиме разработки, если не удалось отправить, выводим код в консоль
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('\n═══════════════════════════════════════════════════════');
      console.log('📧 РЕЖИМ РАЗРАБОТКИ: Email не отправлен, но код доступен');
      console.log('═══════════════════════════════════════════════════════');
      console.log(`Email: ${email}`);
      console.log(`Код подтверждения: ${code}`);
      console.log('═══════════════════════════════════════════════════════\n');
      // В режиме разработки возвращаем успех
      return { messageId: 'dev-mode-error', accepted: [email] };
    }
    
    // Формируем более информативное сообщение об ошибке
    let errorMessage = 'Не удалось отправить код подтверждения';
    if (error.response) {
      errorMessage += `: ${error.response}`;
    } else if (error.message) {
      errorMessage += `: ${error.message}`;
    }
    
    throw new Error(errorMessage);
  }
};

// Проверка валидности email (проверка домена)
const isValidEmailDomain = async (email) => {
  const domain = email.split('@')[1];
  if (!domain) return false;
  
  // Список известных валидных доменов
  const validDomains = [
    'gmail.com', 'yahoo.com', 'mail.ru', 'yandex.ru', 'yandex.kz',
    'outlook.com', 'hotmail.com', 'icloud.com', 'protonmail.com',
    'mail.kz', 'gmail.kz', 'bk.ru', 'inbox.ru', 'list.ru'
  ];
  
  // Если домен в списке известных, считаем валидным
  if (validDomains.includes(domain.toLowerCase())) {
    return true;
  }
  
  // Для других доменов проверяем формат (базовая проверка)
  const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;
  return domainRegex.test(domain);
};

// Отправка ссылки восстановления пароля
const sendPasswordResetLink = async (email, resetLink) => {
  try {
    const transporter = await getTransporter();
    
    // Если транспортер не создан (режим разработки без SMTP)
    if (!transporter) {
      console.log('\n═══════════════════════════════════════════════════════');
      console.log('📧 РЕЖИМ РАЗРАБОТКИ: Email не отправлен');
      console.log('═══════════════════════════════════════════════════════');
      console.log(`Email: ${email}`);
      console.log(`Ссылка восстановления пароля: ${resetLink}`);
      console.log('═══════════════════════════════════════════════════════\n');
      return { messageId: 'dev-mode', accepted: [email] };
    }
    
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@shiply.kz',
      to: email,
      subject: 'Восстановление пароля - SHIPLY.KZ',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .button:hover { background: #1d4ed8; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>SHIPLY.KZ</h1>
              <p>Восстановление пароля</p>
            </div>
            <div class="content">
              <p>Здравствуйте!</p>
              <p>Вы запросили восстановление пароля для вашего аккаунта на платформе SHIPLY.KZ.</p>
              <p style="text-align: center;">
                <a href="${resetLink}" class="button">Восстановить пароль</a>
              </p>
              <p>Или скопируйте и вставьте эту ссылку в браузер:</p>
              <p style="word-break: break-all; color: #2563eb;">${resetLink}</p>
              <div class="warning">
                <p><strong>Важно:</strong></p>
                <p>Ссылка действительна в течение 1 часа.</p>
                <p>Если вы не запрашивали восстановление пароля, просто проигнорируйте это письмо. Ваш пароль останется без изменений.</p>
              </div>
            </div>
            <div class="footer">
              <p>© 2026 SHIPLY.KZ. Все права защищены.</p>
              <p>Это автоматическое письмо, пожалуйста, не отвечайте на него.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
SHIPLY.KZ - Восстановление пароля

Здравствуйте!

Вы запросили восстановление пароля для вашего аккаунта на платформе SHIPLY.KZ.

Перейдите по ссылке для восстановления пароля:
${resetLink}

Ссылка действительна в течение 1 часа.

Если вы не запрашивали восстановление пароля, просто проигнорируйте это письмо. Ваш пароль останется без изменений.

© 2026 SHIPLY.KZ. Все права защищены.
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email с ссылкой восстановления пароля отправлен:', info.messageId);
    
    // Если используется тестовый аккаунт Ethereal, выводим ссылку для просмотра
    if (info.accepted && info.accepted.length > 0 && info.messageId) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log('\n═══════════════════════════════════════════════════════');
        console.log('📧 ТЕСТОВОЕ ПИСЬМО (Ethereal Email)');
        console.log('═══════════════════════════════════════════════════════');
        console.log('Просмотреть письмо можно по ссылке:');
        console.log(previewUrl);
        console.log('═══════════════════════════════════════════════════════\n');
      }
    }
    
    return info;
  } catch (error) {
    console.error('❌ Ошибка отправки email с ссылкой восстановления:', error.message);
    
    // В режиме разработки
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('\n═══════════════════════════════════════════════════════');
      console.log('📧 РЕЖИМ РАЗРАБОТКИ: Email не отправлен, но ссылка доступна');
      console.log('═══════════════════════════════════════════════════════');
      console.log(`Email: ${email}`);
      console.log(`Ссылка восстановления: ${resetLink}`);
      console.log('═══════════════════════════════════════════════════════\n');
      return { messageId: 'dev-mode-error', accepted: [email] };
    }
    
    throw new Error(`Не удалось отправить email с ссылкой восстановления: ${error.message}`);
  }
};

module.exports = {
  sendOTP,
  sendPasswordResetLink,
  isValidEmailDomain,
  getTransporter
};