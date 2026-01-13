const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');

// Настройка Helmet для защиты заголовков
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      scriptSrcAttr: ["'unsafe-hashes'"], // Разрешаем inline event handlers (onclick, onsubmit и т.д.)
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null // Только в продакшене
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
});

// Rate limiting для авторизации (защита от брутфорса)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 5, // максимум 5 запросов с одного IP
  message: 'Слишком много попыток входа. Попробуйте позже.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

// Rate limiting для OTP (защита от спама)
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 3, // максимум 3 запроса с одного IP
  message: 'Слишком много запросов кода. Попробуйте позже.',
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting для восстановления пароля
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 час
  max: 3, // максимум 3 запроса с одного IP
  message: 'Слишком много запросов восстановления пароля. Попробуйте позже.',
  standardHeaders: true,
  legacyHeaders: false
});

// Общий rate limiting для API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // максимум 100 запросов с одного IP
  message: 'Слишком много запросов. Попробуйте позже.',
  standardHeaders: true,
  legacyHeaders: false
});

// Санитизация данных (защита от NoSQL инъекций)
const sanitizeMiddleware = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`Попытка NoSQL инъекции заблокирована: ${key} в запросе ${req.path}`);
  }
});

// Защита от HTTP Parameter Pollution
const hppMiddleware = hpp({
  whitelist: ['page', 'limit', 'sort', 'filter'] // Разрешенные параметры для дублирования
});

module.exports = {
  helmetConfig,
  authLimiter,
  otpLimiter,
  passwordResetLimiter,
  apiLimiter,
  sanitizeMiddleware,
  hppMiddleware
};
