# Настройка Firebase для Google аутентификации

Для использования Google аутентификации через Firebase необходимо настроить Firebase проект.

## Шаг 1: Создание Firebase проекта

1. Перейдите на [Firebase Console](https://console.firebase.google.com/)
2. Нажмите "Add project" (Добавить проект)
3. Введите название проекта (например: `logistics-platform`)
4. Следуйте инструкциям для создания проекта

## Шаг 2: Включение Google Authentication

1. В Firebase Console выберите ваш проект
2. Перейдите в **Authentication** > **Sign-in method**
3. Включите **Google** как провайдер входа
4. Укажите email поддержки проекта
5. Сохраните изменения

## Шаг 3: Получение сервисного аккаунта

1. Перейдите в **Project Settings** (⚙️) > **Service accounts**
2. Нажмите "Generate new private key"
3. Сохраните JSON файл (например: `firebase-service-account.json`)
4. Поместите файл в корень проекта (не коммитьте в Git!)

## Шаг 4: Настройка .env

Откройте файл `.env` и добавьте один из вариантов:

### Вариант 1: Использование пути к JSON файлу (рекомендуется)

```env
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
```

### Вариант 2: Использование переменных окружения

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Важно:** При использовании переменных окружения убедитесь, что `FIREBASE_PRIVATE_KEY` содержит полный приватный ключ с символами `\n`.

## Шаг 5: Настройка клиентской части (опционально)

Если вы хотите использовать Firebase JS SDK на клиенте (для прямого входа через Google):

1. В Firebase Console перейдите в **Project Settings** > **General**
2. Прокрутите вниз до "Your apps"
3. Добавьте веб-приложение (Web app) если еще не добавлено
4. Скопируйте конфигурацию Firebase (firebaseConfig)
5. Добавьте в `public/index.html` перед закрывающим тегом `</body>`:

```html
<script type="module">
  import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
  import { getAuth, GoogleAuthProvider, signInWithPopup } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';

  const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
  };

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();

  window.handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      
      // Отправка токена на сервер
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });
      
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('token', data.token);
        location.reload();
      } else {
        alert('Ошибка входа: ' + data.message);
      }
    } catch (error) {
      console.error('Ошибка Google входа:', error);
      alert('Ошибка входа через Google');
    }
  };
</script>
```

## Текущая реализация

В текущей версии приложения используется **серверная верификация** Firebase токенов через Firebase Admin SDK. Это означает:

- ✅ Безопасная верификация на сервере
- ✅ Не требуется Firebase JS SDK на клиенте
- ⚠️ Для входа через Google нужна интеграция Google OAuth на клиенте

### Альтернатива: Google OAuth 2.0 напрямую

Вместо Firebase можно использовать Google OAuth 2.0 напрямую через Google Sign-In API. Это требует:

1. Создание OAuth 2.0 credentials в [Google Cloud Console](https://console.cloud.google.com/)
2. Добавление библиотеки Google Sign-In на фронтенде
3. Отправка ID токена на сервер для верификации

## Безопасность

- ⚠️ **Никогда не коммитьте** файл `firebase-service-account.json` в Git
- ⚠️ Добавьте `firebase-service-account.json` в `.gitignore`
- ✅ Используйте переменные окружения в продакшене
- ✅ Храните приватные ключи безопасно

## Проверка настройки

После настройки Firebase проверьте:

1. Сервер запускается без ошибок
2. В консоли сервера нет предупреждений о Firebase
3. API endpoint `/api/auth/google` отвечает (но для тестирования нужен токен)

## Поддержка

Если у вас возникли проблемы с настройкой Firebase, убедитесь, что:

1. Firebase проект создан и активен
2. Google Authentication включен в Firebase Console
3. Сервисный аккаунт настроен правильно
4. Переменные окружения в `.env` корректны
5. Файл `firebase-service-account.json` существует (если используется путь)
