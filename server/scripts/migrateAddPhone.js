const sequelize = require('../config/database');
const { QueryTypes } = require('sequelize');
const fs = require('fs');
const path = require('path');

const migrateAddPhone = async () => {
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

    // Проверяем существование колонки phone
    const tableInfo = await sequelize.query(
      "PRAGMA table_info(users)",
      { type: QueryTypes.SELECT }
    );

    const columns = tableInfo.map(col => col.name);
    console.log('📋 Текущие колонки в таблице users:', columns.join(', '));

    if (columns.includes('phone')) {
      console.log('✅ Колонка phone уже существует, миграция не требуется');
      process.exit(0);
    }

    console.log('\n🔄 Начинаем миграцию...\n');

    // Добавляем колонку phone
    console.log('📝 Добавление колонки phone...');
    await sequelize.query(`
      ALTER TABLE users 
      ADD COLUMN phone VARCHAR(255) NULL
    `);

    console.log('✅ Колонка phone успешно добавлена');

    // Проверяем финальную структуру
    const finalTableInfo = await sequelize.query(
      "PRAGMA table_info(users)",
      { type: QueryTypes.SELECT }
    );
    const finalColumns = finalTableInfo.map(col => col.name);
    console.log('\n📋 Финальная структура таблицы users:', finalColumns.join(', '));

    console.log('\n✅ Миграция завершена успешно!');
    console.log('📋 Колонка phone добавлена в таблицу users');
    console.log('💾 Резервная копия сохранена');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка миграции:', error.message);
    console.error('Детали:', error);
    process.exit(1);
  }
};

migrateAddPhone();
