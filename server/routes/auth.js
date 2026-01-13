const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const User = require('../models/User');
const OTP = require('../models/OTP');
const PasswordResetToken = require('../models/PasswordResetToken');
const { auth } = require('../middleware/auth');
const { sendOTP, sendPasswordResetLink, isValidEmailDomain } = require('../services/email');
const { validatePassword } = require('../utils/passwordValidator');
const { sanitizeEmail, sanitizePhone, sanitizeObject } = require('../utils/sanitize');
const { authLimiter, otpLimiter, passwordResetLimiter } = require('../middleware/security');
const crypto = require('crypto');

// Генерация JWT токена
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'secret', {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Генерация OTP кода (6 цифр)
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Отправка OTP кода на email
router.post('/send-otp', otpLimiter, [
  body('email').isEmail().withMessage('Некорректный email').normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    const normalizedEmail = sanitizeEmail(email);
    
    if (!normalizedEmail) {
      return res.status(400).json({ message: 'Некорректный email' });
    }

    // Проверка существования пользователя
    const existingUser = await User.findOne({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(400).json({ message: 'Пользователь с таким email уже зарегистрирован' });
    }

    // Проверка валидности домена email
    const isDomainValid = await isValidEmailDomain(normalizedEmail);
    if (!isDomainValid) {
      return res.status(400).json({ message: 'Некорректный email домен. Используйте действительный email адрес' });
    }

    // Генерация OTP
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 минут

    // Удаление старых неиспользованных OTP для этого email
    await OTP.destroy({
      where: {
        email: normalizedEmail,
        verified: false
      }
    });

    // Сохранение OTP в базе
    await OTP.create({
      email: normalizedEmail,
      code,
      expiresAt,
      verified: false
    });

    // Отправка email
    try {
      await sendOTP(normalizedEmail, code);
      res.json({ 
        message: 'Код подтверждения отправлен на вашу почту',
        expiresIn: 600 // 10 минут в секундах
      });
    } catch (emailError) {
      console.error('Ошибка отправки email:', emailError);
      console.error('Stack trace:', emailError.stack);
      // Удаляем OTP если не удалось отправить email
      await OTP.destroy({ where: { email: normalizedEmail, code } });
      return res.status(500).json({ 
        message: emailError.message || 'Не удалось отправить код подтверждения. Проверьте настройки SMTP сервера.',
        error: process.env.NODE_ENV === 'development' ? emailError.message : undefined
      });
    }
  } catch (error) {
    console.error('Ошибка отправки OTP:', error);
    res.status(500).json({ message: 'Ошибка сервера при отправке кода подтверждения' });
  }
});

// Проверка OTP кода
router.post('/verify-otp', [
  body('email').isEmail().withMessage('Некорректный email'),
  body('code').isLength({ min: 6, max: 6 }).withMessage('Код должен содержать 6 цифр')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, code } = req.body;
    const normalizedEmail = sanitizeEmail(email);
    
    if (!normalizedEmail) {
      return res.status(400).json({ message: 'Некорректный email' });
    }

    // Поиск OTP
    const otpRecord = await OTP.findOne({
      where: {
        email: normalizedEmail,
        code,
        verified: false
      },
      order: [['createdAt', 'DESC']]
    });

    if (!otpRecord) {
      return res.status(400).json({ message: 'Неверный код подтверждения' });
    }

    // Проверка срока действия
    if (new Date() > new Date(otpRecord.expiresAt)) {
      await OTP.destroy({ where: { id: otpRecord.id } });
      return res.status(400).json({ message: 'Код подтверждения истек. Запросите новый код' });
    }

    // Отметка OTP как проверенного
    await otpRecord.update({ verified: true });

    res.json({ 
      message: 'Email успешно подтвержден',
      verified: true
    });
  } catch (error) {
    console.error('Ошибка проверки OTP:', error);
    res.status(500).json({ message: 'Ошибка сервера при проверке кода' });
  }
});

// Регистрация (только после проверки OTP)
router.post('/register', [
  body('email').isEmail().withMessage('Некорректный email'),
  body('password').notEmpty().withMessage('Пароль обязателен'),
  body('phone').optional().matches(/^\+?[1-9]\d{1,14}$/).withMessage('Некорректный формат номера телефона'),
  body('phone2').optional().matches(/^\+?[1-9]\d{1,14}$/).withMessage('Некорректный формат второго номера телефона'),
  body('role').optional().isIn(['shipper', 'driver']).withMessage('Некорректная роль')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, phone, phone2, role = 'shipper', profile } = req.body;
    const normalizedEmail = sanitizeEmail(email);
    const sanitizedPhone = phone ? sanitizePhone(phone) : null;
    const sanitizedPhone2 = phone2 ? sanitizePhone(phone2) : null;
    const sanitizedProfile = profile ? sanitizeObject(profile) : {};
    
    if (!normalizedEmail) {
      return res.status(400).json({ message: 'Некорректный email' });
    }

    // Проверка существования пользователя
    const existingUser = await User.findOne({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(400).json({ message: 'Пользователь с таким email уже существует' });
    }

    // Проверка валидации пароля
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        message: 'Пароль не соответствует требованиям безопасности',
        errors: passwordValidation.errors
      });
    }

    // Проверка, что email был подтвержден через OTP
    const verifiedOTP = await OTP.findOne({
      where: {
        email: normalizedEmail,
        verified: true
      },
      order: [['createdAt', 'DESC']]
    });

    if (!verifiedOTP) {
      return res.status(400).json({ 
        message: 'Email не подтвержден. Пожалуйста, сначала подтвердите ваш email через код OTP' 
      });
    }

    // Проверка, что OTP был использован недавно (в течение 1 часа после подтверждения)
    const otpAge = Date.now() - new Date(verifiedOTP.createdAt).getTime();
    const maxAge = 60 * 60 * 1000; // 1 час
    if (otpAge > maxAge) {
      return res.status(400).json({ 
        message: 'Срок действия подтверждения истек. Пожалуйста, подтвердите email заново' 
      });
    }

    // Создание пользователя (без оплаты)
    const user = await User.create({
      email: normalizedEmail,
      password,
      phone: sanitizedPhone,
      phone2: sanitizedPhone2,
      role,
      profile: sanitizedProfile
    });

    // Удаление использованного OTP
    await OTP.destroy({ where: { id: verifiedOTP.id } });

    const token = generateToken(user.id);

    res.status(201).json({
      message: 'Регистрация успешна. Требуется оплата для активации аккаунта.',
      token,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        phone2: user.phone2,
        role: user.role,
        isPaid: user.isPaid
      }
    });
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    res.status(500).json({ message: 'Ошибка сервера при регистрации' });
  }
});

// Авторизация
router.post('/login', authLimiter, [
  body('email').isEmail().withMessage('Некорректный email').normalizeEmail(),
  body('password').notEmpty().withMessage('Пароль обязателен')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const normalizedEmail = sanitizeEmail(email);
    
    if (!normalizedEmail) {
      return res.status(400).json({ message: 'Некорректный email' });
    }

    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user) {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }

    // Проверяем, что пароль установлен
    if (!user.password) {
      return res.status(401).json({ message: 'Пароль не установлен для этого аккаунта' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }

    // Обновляем время последнего входа
    await user.update({ lastLogin: new Date() });

    const token = generateToken(user.id);

    // Безопасное получение профиля
    let userProfile = {};
    try {
      userProfile = user.profile || {};
    } catch (e) {
      console.warn('Ошибка получения профиля:', e);
    }

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        phone2: user.phone2,
        role: user.role,
        isPaid: user.isPaid,
        profile: userProfile
      }
    });
  } catch (error) {
    console.error('Ошибка при авторизации:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      message: 'Ошибка сервера при авторизации',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Получение текущего пользователя
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Запрос на восстановление пароля
router.post('/forgot-password', passwordResetLimiter, [
  body('email').isEmail().withMessage('Некорректный email').normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // Ищем пользователя
    const user = await User.findOne({ where: { email: normalizedEmail } });
    
    // Всегда возвращаем успех для безопасности (чтобы не раскрывать существование email)
    if (!user) {
      return res.json({ 
        message: 'Если email существует в системе, на него будет отправлена ссылка для восстановления пароля' 
      });
    }

    // Генерируем токен восстановления
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Токен действителен 1 час

    // Сохраняем токен в базе
    await PasswordResetToken.create({
      userId: user.id,
      token: resetToken,
      expiresAt,
      used: false
    });

    // Формируем ссылку восстановления
    const resetLink = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}`;

    // Отправляем email
    try {
      await sendPasswordResetLink(normalizedEmail, resetLink);
      res.json({ 
        message: 'Если email существует в системе, на него будет отправлена ссылка для восстановления пароля' 
      });
    } catch (emailError) {
      console.error('Ошибка отправки email:', emailError);
      // Удаляем токен если не удалось отправить email
      await PasswordResetToken.destroy({ where: { token: resetToken } });
      res.status(500).json({ 
        message: 'Не удалось отправить email. Попробуйте позже.' 
      });
    }
  } catch (error) {
    console.error('Ошибка запроса восстановления пароля:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Сброс пароля по токену
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Токен обязателен'),
  body('password').notEmpty().withMessage('Пароль обязателен')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, password } = req.body;

    // Ищем токен
    const resetToken = await PasswordResetToken.findOne({
      where: { token },
      include: [{ model: User }]
    });

    if (!resetToken) {
      return res.status(400).json({ message: 'Неверный или истекший токен восстановления' });
    }

    // Проверяем, не использован ли токен
    if (resetToken.used) {
      return res.status(400).json({ message: 'Токен уже был использован' });
    }

    // Проверяем срок действия
    if (new Date() > resetToken.expiresAt) {
      return res.status(400).json({ message: 'Срок действия токена истек' });
    }

    // Проверка валидации пароля
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        message: 'Пароль не соответствует требованиям безопасности',
        errors: passwordValidation.errors
      });
    }

    // Обновляем пароль пользователя
    const user = resetToken.User;
    user.password = password;
    await user.save();

    // Помечаем токен как использованный
    resetToken.used = true;
    await resetToken.save();

    res.json({ message: 'Пароль успешно изменен' });
  } catch (error) {
    console.error('Ошибка сброса пароля:', error);
    res.status(500).json({ message: 'Ошибка сервера при сбросе пароля' });
  }
});

// Обновление профиля пользователя
router.put('/update-profile', auth, [
  body('phone').optional().matches(/^\+?[1-9]\d{1,14}$/).withMessage('Некорректный формат номера телефона'),
  body('phone2').optional().matches(/^\+?[1-9]\d{1,14}$/).withMessage('Некорректный формат второго номера телефона')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phone, phone2 } = req.body;
    const updateData = {};
    
    if (phone !== undefined) {
      updateData.phone = phone ? sanitizePhone(phone) : null;
    }
    if (phone2 !== undefined) {
      updateData.phone2 = phone2 ? sanitizePhone(phone2) : null;
    }

    await User.update(updateData, { where: { id: req.user.id } });
    
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    res.json({
      message: 'Профиль успешно обновлен',
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        phone2: user.phone2,
        role: user.role,
        isPaid: user.isPaid
      }
    });
  } catch (error) {
    console.error('Ошибка обновления профиля:', error);
    res.status(500).json({ message: 'Ошибка сервера при обновлении профиля' });
  }
});

module.exports = router;