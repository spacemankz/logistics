/**
 * Тестовый скрипт для проверки готовности приложения к запуску
 */

const dotenv = require('dotenv');
dotenv.config();

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

async function testDatabaseConnection() {
  info('Проверка подключения к базе данных...');
  try {
    const sequelize = require('./server/config/database');
    await sequelize.authenticate();
    success('Подключение к базе данных SQLite успешно');
    return true;
  } catch (err) {
    error(`Ошибка подключения к базе данных: ${err.message}`);
    return false;
  }
}

async function testModels() {
  info('Проверка моделей...');
  try {
    const { User, Cargo, Driver } = require('./server/models');
    
    // Проверка существования моделей
    if (!User || !Cargo || !Driver) {
      error('Не все модели загружены');
      return false;
    }
    
    success('Все модели загружены корректно');
    
    // Проверка синхронизации
    const sequelize = require('./server/config/database');
    await sequelize.sync({ alter: false });
    success('Модели синхронизированы с базой данных');
    
    return true;
  } catch (err) {
    error(`Ошибка при проверке моделей: ${err.message}`);
    return false;
  }
}

async function testEnvironmentVariables() {
  info('Проверка переменных окружения...');
  const required = ['JWT_SECRET'];
  const missing = [];
  
  required.forEach(key => {
    if (!process.env[key]) {
      missing.push(key);
    }
  });
  
  if (missing.length > 0) {
    warning(`Отсутствуют переменные окружения: ${missing.join(', ')}`);
    warning('Используются значения по умолчанию');
  } else {
    success('Все необходимые переменные окружения установлены');
  }
  
  // Проверка значений по умолчанию
  info(`PORT: ${process.env.PORT || 3000}`);
  info(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  info(`DB_PATH: ${process.env.DB_PATH || './database.sqlite'}`);
  
  return true;
}

async function testFileStructure() {
  info('Проверка структуры файлов...');
  const fs = require('fs');
  const path = require('path');
  
  const requiredFiles = [
    'server/index.js',
    'server/config/database.js',
    'server/models/User.js',
    'server/models/Cargo.js',
    'server/models/Driver.js',
    'server/models/index.js',
    'server/routes/auth.js',
    'server/routes/cargo.js',
    'server/routes/driver.js',
    'server/routes/payment.js',
    'server/routes/admin.js',
    'public/index.html',
    'public/app.js',
    'package.json'
  ];
  
  const missing = [];
  
  requiredFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
      missing.push(file);
    }
  });
  
  if (missing.length > 0) {
    error(`Отсутствуют файлы: ${missing.join(', ')}`);
    return false;
  } else {
    success('Все необходимые файлы на месте');
    return true;
  }
}

async function testDependencies() {
  info('Проверка зависимостей...');
  const required = [
    'express',
    'sequelize',
    'sqlite3',
    'bcryptjs',
    'jsonwebtoken',
    'dotenv',
    'express-validator'
  ];
  
  const missing = [];
  
  required.forEach(dep => {
    try {
      require(dep);
    } catch (err) {
      missing.push(dep);
    }
  });
  
  if (missing.length > 0) {
    error(`Отсутствуют зависимости: ${missing.join(', ')}`);
    error('Запустите: npm install');
    return false;
  } else {
    success('Все зависимости установлены');
    return true;
  }
}

async function runTests() {
  console.log('\n' + '='.repeat(50));
  log('🧪 ТЕСТИРОВАНИЕ ГОТОВНОСТИ ПРИЛОЖЕНИЯ', 'blue');
  console.log('='.repeat(50) + '\n');
  
  const results = {
    fileStructure: await testFileStructure(),
    dependencies: await testDependencies(),
    environment: await testEnvironmentVariables(),
    database: await testDatabaseConnection(),
    models: false
  };
  
  // Модели проверяем только если БД подключена
  if (results.database) {
    results.models = await testModels();
  }
  
  console.log('\n' + '='.repeat(50));
  log('📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ', 'blue');
  console.log('='.repeat(50));
  
  Object.entries(results).forEach(([test, passed]) => {
    if (passed) {
      success(`${test}: PASSED`);
    } else {
      error(`${test}: FAILED`);
    }
  });
  
  const allPassed = Object.values(results).every(r => r === true);
  
  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    success('✅ ВСЕ ТЕСТЫ ПРОЙДЕНЫ! Приложение готово к запуску.');
    console.log('\n💡 Для запуска приложения используйте:');
    log('   npm start', 'green');
    console.log('   или');
    log('   npm run dev', 'green');
  } else {
    error('❌ НЕКОТОРЫЕ ТЕСТЫ НЕ ПРОЙДЕНЫ. Исправьте ошибки перед запуском.');
    process.exit(1);
  }
  console.log('='.repeat(50) + '\n');
  
  // Закрываем подключение к БД
  try {
    const sequelize = require('./server/config/database');
    await sequelize.close();
  } catch (err) {
    // Игнорируем ошибки закрытия
  }
}

// Запуск тестов
runTests().catch(err => {
  error(`Критическая ошибка: ${err.message}`);
  console.error(err);
  process.exit(1);
});

