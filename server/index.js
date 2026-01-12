const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const { initDatabase } = require('./models');

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/cargo', require('./routes/cargo'));
app.use('/api/driver', require('./routes/driver'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/admin', require('./routes/admin'));

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
