const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config();

// Инициализация Firebase Admin SDK
let firebaseApp;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    // Использование файла сервисного аккаунта
    const serviceAccount = require(path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH));
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    // Использование переменных окружения
    const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey
      })
    });
  } else {
    console.warn('⚠️  Firebase не настроен. Google аутентификация будет недоступна.');
    console.warn('   Для настройки добавьте FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY в .env');
  }
} catch (error) {
  console.error('❌ Ошибка инициализации Firebase:', error.message);
  console.warn('⚠️  Google аутентификация будет недоступна.');
}

module.exports = firebaseApp ? admin : null;
