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
      console.log('Администратор уже существует');
      process.exit(0);
      return;
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







