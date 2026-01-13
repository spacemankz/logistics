const { initDatabase, User } = require('../models');
const dotenv = require('dotenv');

dotenv.config();

const createAdmin = async () => {
  try {
    await initDatabase();

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@logistics.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    const existingAdmin = await User.findOne({ where: { email: adminEmail } });
    
    if (existingAdmin) {
      if (existingAdmin.role === 'admin') {
        console.log('Администратор уже существует:');
        console.log(`Email: ${adminEmail}`);
        console.log(`Role: ${existingAdmin.role}`);
        console.log(`ID: ${existingAdmin.id}`);
        console.log('\nЕсли хотите обновить пароль, удалите существующего администратора или измените пароль вручную.');
        process.exit(0);
        return;
      } else {
        // Обновляем роль существующего пользователя на admin
        await existingAdmin.update({ role: 'admin', isPaid: true });
        console.log('Роль пользователя обновлена на администратора:');
        console.log(`Email: ${adminEmail}`);
        console.log(`Password: ${adminPassword}`);
        process.exit(0);
        return;
      }
    }

    const admin = await User.create({
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      isPaid: true,
      profile: {
        firstName: 'Admin',
        lastName: 'User'
      }
    });

    console.log('Администратор успешно создан:');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Ошибка создания администратора:', error);
    process.exit(1);
  }
};

createAdmin();







