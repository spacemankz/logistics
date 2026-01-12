const sequelize = require('../config/database');
const { QueryTypes } = require('sequelize');
const fs = require('fs');
const path = require('path');

const migrateRemoveFirebase = async () => {
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

    // Проверяем существование колонок
    const tableInfo = await sequelize.query(
      "PRAGMA table_info(users)",
      { type: QueryTypes.SELECT }
    );

    const columns = tableInfo.map(col => col.name);
    console.log('📋 Текущие колонки в таблице users:', columns.join(', '));

    const hasFirebaseUid = columns.includes('firebaseUid');
    const hasAuthProvider = columns.includes('authProvider');

    if (!hasFirebaseUid && !hasAuthProvider) {
      console.log('✅ Миграция не требуется - колонки firebaseUid и authProvider уже удалены');
      process.exit(0);
    }

    console.log('\n🔄 Начинаем миграцию...\n');

    // SQLite не поддерживает DROP COLUMN в старых версиях
    // Создаем новую таблицу без этих колонок
    console.log('📝 Создание новой таблицы без Firebase полей...');

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS users_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        lastLogin DATETIME,
        role VARCHAR(255) DEFAULT 'shipper',
        isPaid BOOLEAN DEFAULT 0,
        paymentDate DATETIME,
        paymentId VARCHAR(255),
        profile TEXT DEFAULT '{}',
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL
      )
    `);

    // Копируем данные (исключая firebaseUid и authProvider)
    const columnsToCopy = columns.filter(col => 
      !['firebaseUid', 'authProvider'].includes(col)
    );

    if (columnsToCopy.length > 0) {
      const columnsStr = columnsToCopy.join(', ');
      console.log(`📋 Копирование данных из колонок: ${columnsStr}`);
      
      await sequelize.query(`
        INSERT INTO users_new (${columnsStr})
        SELECT ${columnsStr} FROM users
      `);

      console.log('✅ Данные скопированы');
    }

    // Удаляем старую таблицу и переименовываем новую
    console.log('🔄 Замена таблицы...');
    await sequelize.query('DROP TABLE IF EXISTS users');
    await sequelize.query('ALTER TABLE users_new RENAME TO users');

    // Восстанавливаем индексы
    console.log('📝 Восстановление индексов...');
    await sequelize.query('CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email)');

    console.log('\n✅ Миграция завершена успешно!');
    console.log('📋 Структура таблицы users обновлена');
    console.log('💾 Резервная копия сохранена');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка миграции:', error.message);
    console.error('Детали:', error);
    process.exit(1);
  }
};

migrateRemoveFirebase();
