const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const { initDatabase } = require('./models');
const {
  helmetConfig,
  apiLimiter,
  sanitizeMiddleware,
  hppMiddleware
} = require('./middleware/security');

dotenv.config();

const app = express();

// Security Middleware (должны быть первыми)
app.use(helmetConfig);

// CORS настройка
const corsOptions = {
  origin: function (origin, callback) {
    // В продакшене разрешаем только свой домен
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3000', 'https://shiply.kz'];
    
    // Разрешаем запросы без origin (например, мобильные приложения, Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Не разрешено политикой CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Защита от HTTP Parameter Pollution
app.use(hppMiddleware);

// Санитизация данных (защита от NoSQL инъекций)
app.use(sanitizeMiddleware);

// Body parser с ограничением размера
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Общий rate limiting для всех API запросов
app.use('/api', apiLimiter);

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/cargo', require('./routes/cargo'));
app.use('/api/driver', require('./routes/driver'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/exchange', require('./routes/exchange'));

// Статические файлы
app.use(express.static(path.join(__dirname, '../public')));

// Все остальные маршруты отдают index.html (для SPA)
// Важно: этот маршрут должен быть ПОСЛЕ всех API маршрутов
app.get('*', (req, res, next) => {
  // Пропускаем API маршруты - они уже должны были быть обработаны
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: 'API endpoint не найден' });
  }
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Обработчики ошибок (должны быть последними)
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
app.use(notFoundHandler);
app.use(errorHandler);

// SQLite Connection
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await initDatabase();
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
      console.log(`📊 База данных SQLite подключена`);
    });
    
    // Обработка ошибок сервера
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Порт ${PORT} уже занят. Попробуйте другой порт или остановите процесс, использующий этот порт.`);
        console.error(`💡 Для остановки процесса используйте: netstat -ano | findstr :${PORT}`);
      } else {
        console.error('Ошибка сервера:', error);
      }
      process.exit(1);
    });
    
  } catch (error) {
    console.error('Ошибка запуска сервера:', error.message);
    process.exit(1);
  }
};

startServer();
