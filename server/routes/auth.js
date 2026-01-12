const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const admin = require('../config/firebase');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { auth } = require('../middleware/auth');
const { sendOTP, isValidEmailDomain } = require('../services/email');
const { validatePassword } = require('../utils/passwordValidator');

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
router.post('/send-otp', [
  body('email').isEmail().withMessage('Некорректный email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

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
    const normalizedEmail = email.toLowerCase().trim();

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
  body('role').optional().isIn(['shipper', 'driver']).withMessage('Некорректная роль')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, role = 'shipper', profile } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

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
      role,
      profile: profile || {},
      authProvider: 'local'
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
router.post('/login', [
  body('email').isEmail().withMessage('Некорректный email'),
  body('password').notEmpty().withMessage('Пароль обязателен')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user) {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }

    // Проверяем, что пользователь использует локальную аутентификацию
    // Если authProvider не установлен (старые пользователи), считаем его 'local'
    if (user.authProvider && user.authProvider !== 'local') {
      return res.status(401).json({ message: 'Этот аккаунт использует другой способ входа' });
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
        role: user.role,
        isPaid: user.isPaid,
        profile: userProfile,
        authProvider: user.authProvider || 'local'
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

// Аутентификация через Google (Firebase)
router.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: 'ID токен не предоставлен' });
    }

    if (!admin) {
      return res.status(503).json({ message: 'Firebase не настроен' });
    }

    // Верификация Firebase токена
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name, picture } = decodedToken;

    // Поиск существующего пользователя по Firebase UID или email
    let user = await User.findOne({
      where: {
        [Op.or]: [
          { firebaseUid: uid },
          { email: email }
        ]
      }
    });

    if (user) {
      // Обновляем Firebase UID если его не было
      if (!user.firebaseUid) {
        await user.update({
          firebaseUid: uid,
          authProvider: 'google',
          lastLogin: new Date()
        });
      } else {
        await user.update({ lastLogin: new Date() });
      }
    } else {
      // Создаем нового пользователя
      user = await User.create({
        email: email,
        firebaseUid: uid,
        authProvider: 'google',
        isPaid: true, // Google пользователи активированы по умолчанию
        paymentDate: new Date(),
        lastLogin: new Date(),
        profile: {
          firstName: name?.split(' ')[0] || '',
          lastName: name?.split(' ').slice(1).join(' ') || '',
          photoURL: picture || ''
        }
      });
    }

    const token = generateToken(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isPaid: user.isPaid,
        profile: user.profile,
        authProvider: user.authProvider
      }
    });
  } catch (error) {
    console.error('Ошибка Google аутентификации:', error);
    res.status(401).json({ message: 'Ошибка аутентификации через Google' });
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

module.exports = router;