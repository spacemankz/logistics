const { initDatabase, User, Driver, Cargo, OTP, PasswordResetToken, sequelize } = require('../models');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const clearUsers = async () => {
  try {
    console.log('🔄 Начинаем очистку пользователей...');
    
    await initDatabase();

    // Создаем резервную копию базы данных
    const dbPath = sequelize.options.storage;
    const backupDir = path.join(path.dirname(dbPath), 'backups');
    
    // Создаем директорию для бэкапов, если её нет
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const backupPath = path.join(backupDir, `database_${Date.now()}.sqlite`);
    fs.copyFileSync(dbPath, backupPath);
    console.log(`✅ Резервная копия создана: ${backupPath}`);

    // Получаем всех пользователей кроме администраторов
    const usersToDelete = await User.findAll({
      where: {
        role: { [sequelize.Sequelize.Op.ne]: 'admin' }
      }
    });

    console.log(`📋 Найдено пользователей для удаления: ${usersToDelete.length}`);

    if (usersToDelete.length === 0) {
      console.log('ℹ️ Нет пользователей для удаления (кроме администраторов)');
      await sequelize.close();
      process.exit(0);
      return;
    }

    // Получаем email и ID пользователей для удаления
    const userIds = usersToDelete.map(u => u.id);
    const emails = usersToDelete.map(u => u.email);

    console.log('📋 Пользователи для удаления:');
    usersToDelete.forEach(user => {
      console.log(`   - ${user.email} (ID: ${user.id}, Role: ${user.role})`);
    });

    // Удаляем связанные данные
    console.log('\n🗑️ Удаляем профили водителей...');
    const deletedDrivers = await Driver.destroy({
      where: {
        userId: { [sequelize.Sequelize.Op.in]: userIds }
      }
    });
    console.log(`   ✅ Удалено профилей водителей: ${deletedDrivers}`);

    console.log('🗑️ Удаляем грузы...');
    const deletedCargos = await Cargo.destroy({
      where: {
        [sequelize.Sequelize.Op.or]: [
          { shipperId: { [sequelize.Sequelize.Op.in]: userIds } },
          { assignedDriverId: { [sequelize.Sequelize.Op.in]: userIds } }
        ]
      }
    });
    console.log(`   ✅ Удалено грузов: ${deletedCargos}`);

    console.log('🗑️ Удаляем OTP коды...');
    const deletedOTPs = await OTP.destroy({
      where: {
        email: { [sequelize.Sequelize.Op.in]: emails }
      }
    });
    console.log(`   ✅ Удалено OTP кодов: ${deletedOTPs}`);

    console.log('🗑️ Удаляем токены сброса пароля...');
    const deletedTokens = await PasswordResetToken.destroy({
      where: {
        userId: { [sequelize.Sequelize.Op.in]: userIds }
      }
    });
    console.log(`   ✅ Удалено токенов: ${deletedTokens}`);

    console.log('🗑️ Удаляем пользователей...');
    const deletedUsers = await User.destroy({
      where: {
        id: { [sequelize.Sequelize.Op.in]: userIds }
      }
    });

    console.log(`\n✅ Успешно удалено ${deletedUsers} пользователей`);
    console.log('✅ Все связанные данные удалены');
    console.log(`\n💾 Резервная копия сохранена: ${backupPath}`);
    
    // Проверяем оставшихся пользователей
    const remainingUsers = await User.findAll();
    console.log(`\n📊 Оставшиеся пользователи в базе: ${remainingUsers.length}`);
    remainingUsers.forEach(user => {
      console.log(`   - ${user.email} (ID: ${user.id}, Role: ${user.role})`);
    });
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при очистке пользователей:', error);
    await sequelize.close();
    process.exit(1);
  }
};

clearUsers();
