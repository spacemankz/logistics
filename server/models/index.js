const sequelize = require('../config/database');
const User = require('./User');
const Cargo = require('./Cargo');
const Driver = require('./Driver');
const OTP = require('./OTP');

// Определяем связи после загрузки всех моделей
Cargo.belongsTo(User, { as: 'shipper', foreignKey: 'shipperId' });
Cargo.belongsTo(User, { as: 'assignedDriver', foreignKey: 'assignedDriverId' });

Driver.belongsTo(User, { as: 'user', foreignKey: 'userId' });
Driver.belongsTo(User, { as: 'verifiedBy', foreignKey: 'verifiedById' });

// Инициализация базы данных
const initDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('Подключение к SQLite установлено');

    // Синхронизация моделей (создание таблиц без изменения структуры)
    // Используем sync() без alter для избежания проблем с миграциями
    await sequelize.sync({ alter: false });
    console.log('Модели синхронизированы с базой данных');
  } catch (error) {
    // Если есть ошибка, пробуем создать таблицы заново только если их нет
    if (error.name === 'SequelizeUniqueConstraintError' || error.message.includes('UNIQUE constraint')) {
      console.log('Попытка безопасной синхронизации...');
      try {
        await sequelize.sync({ force: false });
        console.log('Модели синхронизированы с базой данных');
      } catch (syncError) {
        console.error('Ошибка синхронизации базы данных:', syncError.message);
        // Продолжаем работу, возможно таблицы уже существуют
        console.log('Продолжаем работу с существующей структурой базы данных');
      }
    } else {
      console.error('Ошибка подключения к базе данных:', error.message);
      throw error;
    }
  }
};

module.exports = {
  sequelize,
  User,
  Cargo,
  Driver,
  OTP,
  initDatabase
};

