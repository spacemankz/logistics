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

    // Определяем нужные колонки согласно модели User
    const requiredColumns = {
      'id': 'INTEGER PRIMARY KEY AUTOINCREMENT',
      'email': 'VARCHAR(255) NOT NULL UNIQUE',
      'password': 'VARCHAR(255) NOT NULL',
      'lastLogin': 'DATETIME',
      'role': "VARCHAR(255) DEFAULT 'shipper'",
      'isPaid': 'BOOLEAN DEFAULT 0',
      'paymentDate': 'DATETIME',
      'paymentId': 'VARCHAR(255)',
      'profile': "TEXT DEFAULT '{}'",
      'createdAt': 'DATETIME NOT NULL',
      'updatedAt': 'DATETIME NOT NULL'
    };

    const hasFirebaseUid = columns.includes('firebaseUid');
    const hasAuthProvider = columns.includes('authProvider');
    const missingColumns = Object.keys(requiredColumns).filter(col => !columns.includes(col));
    const extraColumns = columns.filter(col => 
      !Object.keys(requiredColumns).includes(col) && 
      !['firebaseUid', 'authProvider'].includes(col)
    );

    if (!hasFirebaseUid && !hasAuthProvider && missingColumns.length === 0) {
      console.log('✅ Миграция не требуется - структура таблицы актуальна');
      process.exit(0);
    }

    console.log('\n🔄 Начинаем миграцию...\n');

    if (hasFirebaseUid || hasAuthProvider || missingColumns.length > 0) {
      console.log('📝 Создание новой таблицы с правильной структурой...');

      // Создаем новую таблицу с правильной структурой
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

      // Копируем данные (только существующие колонки, которые есть в новой структуре)
      const columnsToCopy = columns.filter(col => 
        Object.keys(requiredColumns).includes(col) &&
        !['firebaseUid', 'authProvider'].includes(col)
      );

      if (columnsToCopy.length > 0) {
        const columnsStr = columnsToCopy.join(', ');
        console.log(`📋 Копирование данных из колонок: ${columnsStr}`);
        
        try {
          // Отключаем проверку внешних ключей для копирования
          await sequelize.query('PRAGMA foreign_keys = OFF');
          
          // Копируем данные построчно для обработки ошибок валидации
          const users = await sequelize.query(
            `SELECT ${columnsStr} FROM users`,
            { type: QueryTypes.SELECT }
          );

          if (users.length > 0) {
            console.log(`📋 Найдено записей для копирования: ${users.length}`);
            let copiedCount = 0;
            let skippedCount = 0;

            for (const user of users) {
              try {
                // Формируем значения для INSERT
                const values = columnsToCopy.map(col => {
                  const value = user[col];
                  if (value === null || value === undefined) {
                    return 'NULL';
                  }
                  if (typeof value === 'string') {
                    return `'${value.replace(/'/g, "''")}'`;
                  }
                  return value;
                }).join(', ');

                await sequelize.query(`
                  INSERT INTO users_new (${columnsStr})
                  VALUES (${values})
                `);
                copiedCount++;
              } catch (rowError) {
                console.warn(`⚠️  Пропущена запись ID ${user.id}: ${rowError.message}`);
                skippedCount++;
              }
            }

            console.log(`✅ Скопировано записей: ${copiedCount}`);
            if (skippedCount > 0) {
              console.log(`⚠️  Пропущено записей: ${skippedCount}`);
            }
          } else {
            console.log('ℹ️  Таблица users пуста, копирование не требуется');
          }

          // Включаем проверку внешних ключей обратно
          await sequelize.query('PRAGMA foreign_keys = ON');
        } catch (copyError) {
          console.warn('⚠️  Предупреждение при копировании данных:', copyError.message);
          // Включаем проверку внешних ключей даже при ошибке
          await sequelize.query('PRAGMA foreign_keys = ON');
          // Продолжаем, даже если копирование не удалось (таблица может быть пустой)
        }
      } else {
        console.log('ℹ️  Нет данных для копирования');
      }

    // Отключаем проверку внешних ключей перед удалением таблицы
    console.log('🔄 Отключение проверки внешних ключей...');
    await sequelize.query('PRAGMA foreign_keys = OFF');

    // Удаляем старую таблицу и переименовываем новую
    console.log('🔄 Замена таблицы...');
    await sequelize.query('DROP TABLE IF EXISTS users');
    await sequelize.query('ALTER TABLE users_new RENAME TO users');

    // Включаем проверку внешних ключей обратно
    console.log('🔄 Включение проверки внешних ключей...');
    await sequelize.query('PRAGMA foreign_keys = ON');

      // Восстанавливаем индексы
      console.log('📝 Восстановление индексов...');
      await sequelize.query('CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email)');
    }

    // Проверяем финальную структуру
    const finalTableInfo = await sequelize.query(
      "PRAGMA table_info(users)",
      { type: QueryTypes.SELECT }
    );
    const finalColumns = finalTableInfo.map(col => col.name);
    console.log('\n📋 Финальная структура таблицы users:', finalColumns.join(', '));

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
