const sequelize = require('../config/database');
const { QueryTypes } = require('sequelize');
const fs = require('fs');
const path = require('path');

const migrateAddReviews = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Подключение к базе данных установлено');

    const dbPath = process.env.DB_PATH || path.join(__dirname, '../../database.sqlite');
    
    // Создаем резервную копию
    if (fs.existsSync(dbPath)) {
      const backupPath = `${dbPath}.backup.${Date.now()}`;
      fs.copyFileSync(dbPath, backupPath);
      console.log(`✅ Резервная копия создана: ${backupPath}`);
    }

    // Проверяем существование таблицы 'reviews'
    const tables = await sequelize.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='reviews'",
      { type: QueryTypes.SELECT }
    );

    if (tables.length > 0) {
      console.log('✅ Таблица reviews уже существует. Миграция не требуется.');
      process.exit(0);
    }

    console.log('\n🔄 Начинаем миграцию: создание таблицы reviews...\n');

    // Создаем таблицу reviews
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cargoId INTEGER NOT NULL,
        fromUserId INTEGER NOT NULL,
        toUserId INTEGER NOT NULL,
        rating DECIMAL(3,2) NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cargoId) REFERENCES cargos(id) ON DELETE CASCADE,
        FOREIGN KEY (fromUserId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (toUserId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Создаем индексы
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_reviews_cargoId ON reviews(cargoId)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_reviews_fromUserId ON reviews(fromUserId)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_reviews_toUserId ON reviews(toUserId)`);
    await sequelize.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_cargo_from ON reviews(cargoId, fromUserId)`);

    console.log('✅ Таблица reviews успешно создана');
    console.log('✅ Индексы успешно созданы');

    // Проверяем финальную структуру
    const tableInfo = await sequelize.query(
      "PRAGMA table_info(reviews)",
      { type: QueryTypes.SELECT }
    );
    console.log('\n📋 Структура таблицы reviews:', tableInfo.map(col => col.name).join(', '));

    console.log('\n✅ Миграция завершена успешно!');
    console.log('📋 Таблица reviews создана с индексами');
    console.log('💾 Резервная копия сохранена');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка миграции:', error.message);
    console.error('Детали:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

migrateAddReviews();
