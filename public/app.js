// Глобальное состояние
let currentUser = null;
let token = localStorage.getItem('token');
let allCargos = [];
let allAvailableCargos = [];
let allMyOrders = [];

// Состояние регистрации
let registerEmail = '';
let registerRole = 'shipper';

// API базовый URL
const API_URL = '/api';

// Загрузка курсов валют
let exchangeRatesCache = {};

async function loadExchangeRates() {
    try {
        // Используем серверный endpoint для обхода CORS
        const response = await fetch('/api/exchange/rates');
        
        if (!response.ok) {
            throw new Error('Не удалось загрузить курсы валют');
        }
        
        const data = await response.json();
        
        if (!data.success || !data.rates) {
            throw new Error('Неверный формат данных');
        }
        
        const rates = data.rates;
        
        // Обновляем отображение
        const usdElement = document.getElementById('usdRate');
        const eurElement = document.getElementById('eurRate');
        const rubElement = document.getElementById('rubRate');
        const cnyElement = document.getElementById('cnyRate');
        
        if (usdElement && rates.USD) {
            const oldUsd = exchangeRatesCache.USD;
            const usdRate = rates.USD.toFixed(2);
            usdElement.textContent = usdRate;
            updateRateChange('usdChange', oldUsd, usdRate);
            exchangeRatesCache.USD = usdRate;
        }
        
        if (eurElement && rates.EUR) {
            const oldEur = exchangeRatesCache.EUR;
            const eurRate = rates.EUR.toFixed(2);
            eurElement.textContent = eurRate;
            updateRateChange('eurChange', oldEur, eurRate);
            exchangeRatesCache.EUR = eurRate;
        }
        
        if (rubElement && rates.RUB) {
            const oldRub = exchangeRatesCache.RUB;
            const rubRate = rates.RUB.toFixed(2);
            rubElement.textContent = rubRate;
            updateRateChange('rubChange', oldRub, rubRate);
            exchangeRatesCache.RUB = rubRate;
        }
        
        if (cnyElement && rates.CNY) {
            const oldCny = exchangeRatesCache.CNY;
            const cnyRate = rates.CNY.toFixed(2);
            cnyElement.textContent = cnyRate;
            updateRateChange('cnyChange', oldCny, cnyRate);
            exchangeRatesCache.CNY = cnyRate;
        }
        
        // Обновляем время последнего обновления
        const updateTimeElement = document.getElementById('exchangeRatesUpdateTime');
        if (updateTimeElement) {
            const now = new Date();
            updateTimeElement.textContent = `Обновлено: ${now.toLocaleTimeString('ru-RU')} (${data.source})`;
        }
        
    } catch (error) {
        console.error('Ошибка загрузки курсов валют:', error);
        showExchangeRatesError();
    }
}

// Показ ошибки загрузки курсов
function showExchangeRatesError() {
    const container = document.getElementById('exchangeRatesContainer');
    if (container) {
        container.innerHTML = '<div style="text-align: center; padding: 20px; opacity: 0.8;"><i class="fas fa-exclamation-triangle"></i> Не удалось загрузить курсы валют</div>';
    }
}

// Обновление индикатора изменения курса
function updateRateChange(elementId, oldValue, newValue) {
    const changeElement = document.getElementById(elementId);
    if (!changeElement || !oldValue) return;
    
    const old = parseFloat(oldValue);
    const current = parseFloat(newValue);
    const change = current - old;
    const changePercent = ((change / old) * 100).toFixed(2);
    
    if (change > 0) {
        changeElement.textContent = `+${change.toFixed(2)} (+${changePercent}%)`;
        changeElement.style.color = '#4ade80';
    } else if (change < 0) {
        changeElement.textContent = `${change.toFixed(2)} (${changePercent}%)`;
        changeElement.style.color = '#f87171';
    } else {
        changeElement.textContent = 'Без изменений';
        changeElement.style.color = 'rgba(255, 255, 255, 0.7)';
    }
}

// Экспорт функции для глобального доступа
window.loadExchangeRates = loadExchangeRates;

// Закрытие мобильного меню
function closeMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenu && mobileMenu.classList.contains('active')) {
        mobileMenu.classList.remove('active');
    }
}

// Навигация - переопределяем функцию, которая уже определена в HTML
window.showPage = function(pageId) {
    // Всегда закрываем мобильное меню при переходе на страницу
    closeMobileMenu();
    
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // Обновляем навбар если функция доступна
    if (typeof updateNavbar === 'function') {
        updateNavbar();
    }
    
    // Загрузка данных для страниц
        if (pageId === 'dashboard' && typeof loadDashboard === 'function') loadDashboard();
        if (pageId === 'cargoList' && typeof loadCargoList === 'function') loadCargoList();
        if (pageId === 'availableCargos' && typeof loadAvailableCargos === 'function') loadAvailableCargos();
        if (pageId === 'myOrders' && typeof loadMyOrders === 'function') loadMyOrders();
        if (pageId === 'adminPanel' && typeof loadAdminPanel === 'function') loadAdminPanel();
        if (pageId === 'home' && typeof loadExchangeRates === 'function') loadExchangeRates();
        if (pageId === 'userProfile' && typeof loadUserProfile === 'function') loadUserProfile();
    if (pageId === 'reset-password') {
        // Получаем токен из URL (если еще не установлен)
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const tokenInput = document.getElementById('resetPasswordToken');
        if (token && tokenInput) {
            tokenInput.value = token;
        } else if (!token) {
            // Если токена нет, показываем ошибку и перенаправляем на вход
            const errorDiv = document.getElementById('resetPasswordError');
            if (errorDiv) {
                errorDiv.textContent = 'Токен восстановления не найден или истек. Пожалуйста, запросите новую ссылку.';
                errorDiv.classList.remove('hidden');
            }
            setTimeout(() => showPage('login'), 3000);
        }
    }
};

// Мобильное меню - переопределяем функцию, которая уже определена в HTML
window.toggleMobileMenu = function(event) {
    if (event) {
        event.stopPropagation(); // Предотвращаем всплытие события
    }
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenu) {
        const isActive = mobileMenu.classList.contains('active');
        if (isActive) {
            mobileMenu.classList.remove('active');
        } else {
            mobileMenu.classList.add('active');
        }
    }
};

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    // Проверяем URL на наличие токена восстановления пароля
    const urlParams = new URLSearchParams(window.location.search);
    const resetToken = urlParams.get('token');
    
    if (resetToken) {
        // Если есть токен в URL, показываем страницу восстановления пароля
        showPage('reset-password');
        const tokenInput = document.getElementById('resetPasswordToken');
        if (tokenInput) {
            tokenInput.value = resetToken;
        }
        return; // Не продолжаем обычную инициализацию
    }
    
    if (token) {
        checkAuth();
    } else {
        showPage('home');
    }
    
    // Загружаем курсы валют при загрузке страницы
    if (typeof loadExchangeRates === 'function') {
        loadExchangeRates();
        // Обновляем курсы каждые 5 минут
        setInterval(loadExchangeRates, 5 * 60 * 1000);
    }
    
    // Инициализация валидации пароля
    const passwordInput = document.getElementById('registerPassword');
    const passwordConfirmInput = document.getElementById('registerPasswordConfirm');
    
    if (passwordInput) {
        passwordInput.addEventListener('input', validatePasswordInput);
    }
    if (passwordConfirmInput) {
        passwordConfirmInput.addEventListener('input', validatePasswordInput);
    }
    
    // Валидация пароля для восстановления
    const resetPasswordNew = document.getElementById('resetPasswordNew');
    const resetPasswordConfirm = document.getElementById('resetPasswordConfirm');
    if (resetPasswordNew) {
        resetPasswordNew.addEventListener('input', validateResetPasswordInput);
    }
    if (resetPasswordConfirm) {
        resetPasswordConfirm.addEventListener('input', validateResetPasswordInput);
    }
    
    // Ограничение OTP поля только цифрами
    const otpInput = document.getElementById('registerOTP');
    if (otpInput) {
        otpInput.addEventListener('input', function(e) {
            e.target.value = e.target.value.replace(/\D/g, '');
            if (e.target.value.length > 6) {
                e.target.value = e.target.value.slice(0, 6);
            }
        });
    }
    
    // Сброс формы регистрации при открытии страницы
    const registerPage = document.getElementById('register');
    if (registerPage) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    if (registerPage.classList.contains('active')) {
                        goToRegisterStep(1);
                        const errorDiv = document.getElementById('registerError');
                        const successDiv = document.getElementById('registerSuccess');
                        if (errorDiv) errorDiv.classList.add('hidden');
                        if (successDiv) successDiv.classList.add('hidden');
                        const emailInput = document.getElementById('registerEmail');
                        const otpInput = document.getElementById('registerOTP');
                        const pwdInput = document.getElementById('registerPassword');
                        const pwdConfirmInput = document.getElementById('registerPasswordConfirm');
                        if (emailInput) emailInput.value = '';
                        if (otpInput) otpInput.value = '';
                        if (pwdInput) pwdInput.value = '';
                        if (pwdConfirmInput) pwdConfirmInput.value = '';
                        registerEmail = '';
                    }
                }
            });
        });
        observer.observe(registerPage, { attributes: true });
    }
});

// Обновление навбара
function updateNavbar() {
    const navbarMenu = document.getElementById('navbarMenu');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (currentUser) {
        const menuItems = `
            ${currentUser.role === 'shipper' ? `
                <a href="#" onclick="showPage('cargoForm'); return false;"><i class="fas fa-box"></i> Создать груз</a>
                <a href="#" onclick="showPage('cargoList'); return false;"><i class="fas fa-list"></i> Мои грузы</a>
                <a href="#" onclick="showPage('userProfile'); return false;"><i class="fas fa-user-edit"></i> Мой профиль</a>
            ` : ''}
            ${currentUser.role === 'driver' ? `
                <a href="#" onclick="showPage('driverProfile'); return false;"><i class="fas fa-user"></i> Профиль водителя</a>
                <a href="#" onclick="showPage('userProfile'); return false;"><i class="fas fa-user-edit"></i> Мой профиль</a>
                <a href="#" onclick="showPage('availableCargos'); return false;"><i class="fas fa-search"></i> Доступные</a>
                <a href="#" onclick="showPage('myOrders'); return false;"><i class="fas fa-list"></i> Мои заказы</a>
            ` : ''}
            ${currentUser.role === 'admin' ? `
                <a href="#" onclick="showPage('adminPanel'); return false;"><i class="fas fa-cog"></i> Админ-панель</a>
            ` : ''}
            ${!currentUser.isPaid ? `
                <a href="#" onclick="showPage('payment'); return false;"><i class="fas fa-credit-card"></i> Активировать</a>
            ` : ''}
            <span class="user-badge" style="margin: 0 12px;">${currentUser.email}</span>
            <button onclick="handleLogout(); return false;">Выход</button>
        `;
        
        navbarMenu.innerHTML = menuItems;
        if (mobileMenu) {
            mobileMenu.innerHTML = menuItems;
        }
    } else {
        const menuItems = `
            <a href="#" onclick="showPage('login'); return false;">Вход</a>
            <a href="#" onclick="showPage('register'); return false;">Регистрация</a>
        `;
        navbarMenu.innerHTML = menuItems;
        if (mobileMenu) {
            mobileMenu.innerHTML = menuItems;
        }
    }
}

// API запросы
async function apiRequest(url, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
        const response = await fetch(`${API_URL}${url}`, {
            ...options,
            headers
        });
        
        // Проверяем Content-Type перед парсингом
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            // Если ответ не JSON, читаем как текст
            const text = await response.text();
            throw new Error(`Ожидался JSON, получен: ${contentType || 'unknown'}. Статус: ${response.status}. Ответ: ${text.substring(0, 200)}`);
        }
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || `Ошибка запроса (${response.status})`);
        }
        
        return data;
    } catch (error) {
        // Если это уже наша ошибка, пробрасываем её
        if (error.message && error.message.includes('Ожидался JSON')) {
            throw error;
        }
        // Если это SyntaxError от JSON.parse, значит получили не JSON
        if (error instanceof SyntaxError || error.message.includes('Unexpected token')) {
            throw new Error(`Сервер вернул не JSON. Проверьте, что API endpoint существует и сервер запущен.`);
        }
        // Пробрасываем остальные ошибки
        throw error;
    }
}

// Проверка авторизации
async function checkAuth() {
    try {
        const data = await apiRequest('/auth/me');
        currentUser = data.user;
        document.getElementById('userEmail').textContent = currentUser.email;
        const roleText = currentUser.role === 'shipper' ? 'Грузоотправитель' : 
            currentUser.role === 'driver' ? 'Водитель' : 'Администратор';
        document.getElementById('userRole').textContent = roleText;
        
        if (!currentUser.isPaid) {
            document.getElementById('paymentWarning').classList.remove('hidden');
        } else {
            document.getElementById('paymentWarning').classList.add('hidden');
        }
        
        showPage('dashboard');
    } catch (error) {
        localStorage.removeItem('token');
        token = null;
        showPage('home');
    }
}

// Регистрация
// Переход к шагу регистрации
function goToRegisterStep(step) {
    document.querySelectorAll('.register-step-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.register-step').forEach((el, idx) => {
        if (idx + 1 === step) {
            el.style.background = 'var(--primary)';
            el.style.color = 'white';
        } else {
            el.style.background = 'var(--gray-300)';
            el.style.color = 'var(--gray-600)';
        }
    });
    
    if (step === 1) {
        document.getElementById('registerStep1Content').classList.remove('hidden');
    } else if (step === 2) {
        document.getElementById('registerStep2Content').classList.remove('hidden');
    } else if (step === 3) {
        document.getElementById('registerStep3Content').classList.remove('hidden');
    }
}

// Отправка OTP
async function handleSendOTP(e) {
    e.preventDefault();
    const errorDiv = document.getElementById('registerError');
    const successDiv = document.getElementById('registerSuccess');
    const btn = document.getElementById('sendOTPBtn');
    errorDiv.classList.add('hidden');
    successDiv.classList.add('hidden');
    
    const email = document.getElementById('registerEmail').value.toLowerCase().trim();
    const role = document.getElementById('registerRole').value;
    
    registerEmail = email;
    registerRole = role;
    
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> Отправка...';
    
    try {
        await apiRequest('/auth/send-otp', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
        
        successDiv.textContent = 'Код подтверждения отправлен на вашу почту!';
        successDiv.classList.remove('hidden');
        document.getElementById('registerEmailDisplay').textContent = email;
        goToRegisterStep(2);
    } catch (error) {
        errorDiv.textContent = error.message || 'Ошибка отправки кода';
        errorDiv.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Отправить код';
    }
}

// Повторная отправка OTP
async function handleResendOTP() {
    const errorDiv = document.getElementById('registerError');
    const successDiv = document.getElementById('registerSuccess');
    errorDiv.classList.add('hidden');
    successDiv.classList.add('hidden');
    
    try {
        await apiRequest('/auth/send-otp', {
            method: 'POST',
            body: JSON.stringify({ email: registerEmail })
        });
        
        successDiv.textContent = 'Код отправлен повторно!';
        successDiv.classList.remove('hidden');
    } catch (error) {
        errorDiv.textContent = error.message || 'Ошибка отправки кода';
        errorDiv.classList.remove('hidden');
    }
}

// Проверка OTP
async function handleVerifyOTP(e) {
    e.preventDefault();
    const errorDiv = document.getElementById('registerError');
    const successDiv = document.getElementById('registerSuccess');
    const btn = document.getElementById('verifyOTPBtn');
    errorDiv.classList.add('hidden');
    successDiv.classList.add('hidden');
    
    const code = document.getElementById('registerOTP').value;
    
    if (code.length !== 6) {
        errorDiv.textContent = 'Код должен содержать 6 цифр';
        errorDiv.classList.remove('hidden');
        return;
    }
    
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> Проверка...';
    
    try {
        await apiRequest('/auth/verify-otp', {
            method: 'POST',
            body: JSON.stringify({ email: registerEmail, code })
        });
        
        successDiv.textContent = 'Email успешно подтвержден!';
        successDiv.classList.remove('hidden');
        goToRegisterStep(3);
    } catch (error) {
        errorDiv.textContent = error.message || 'Неверный код';
        errorDiv.classList.remove('hidden');
        document.getElementById('registerOTP').value = '';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Подтвердить';
    }
}

// Валидация пароля в реальном времени
function validatePasswordInput() {
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
    const matchDiv = document.getElementById('passwordMatch');
    const matchText = document.getElementById('passwordMatchText');
    
    // Проверка требований
    const requirements = {
        min: password.length >= 8,
        upper: /[A-ZА-Я]/.test(password),
        lower: /[a-zа-я]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };
    
    document.getElementById('passwordReqMin').innerHTML = requirements.min 
        ? '<i class="fas fa-check"></i> Минимум 8 символов'
        : '<i class="fas fa-times"></i> Минимум 8 символов';
    document.getElementById('passwordReqMin').className = requirements.min ? 'valid' : 'invalid';
    
    document.getElementById('passwordReqUpper').innerHTML = requirements.upper 
        ? '<i class="fas fa-check"></i> Заглавная буква'
        : '<i class="fas fa-times"></i> Заглавная буква';
    document.getElementById('passwordReqUpper').className = requirements.upper ? 'valid' : 'invalid';
    
    document.getElementById('passwordReqLower').innerHTML = requirements.lower 
        ? '<i class="fas fa-check"></i> Строчная буква'
        : '<i class="fas fa-times"></i> Строчная буква';
    document.getElementById('passwordReqLower').className = requirements.lower ? 'valid' : 'invalid';
    
    document.getElementById('passwordReqNumber').innerHTML = requirements.number 
        ? '<i class="fas fa-check"></i> Цифра'
        : '<i class="fas fa-times"></i> Цифра';
    document.getElementById('passwordReqNumber').className = requirements.number ? 'valid' : 'invalid';
    
    document.getElementById('passwordReqSpecial').innerHTML = requirements.special 
        ? '<i class="fas fa-check"></i> Специальный символ (!@#$%^&*)'
        : '<i class="fas fa-times"></i> Специальный символ (!@#$%^&*)';
    document.getElementById('passwordReqSpecial').className = requirements.special ? 'valid' : 'invalid';
    
    // Проверка совпадения паролей
    if (passwordConfirm.length > 0) {
        matchDiv.style.display = 'block';
        if (password === passwordConfirm) {
            matchText.innerHTML = '<i class="fas fa-check" style="color: var(--success);"></i> Пароли совпадают';
            matchText.style.color = 'var(--success)';
        } else {
            matchText.innerHTML = '<i class="fas fa-times" style="color: var(--error);"></i> Пароли не совпадают';
            matchText.style.color = 'var(--error)';
        }
    } else {
        matchDiv.style.display = 'none';
    }
}

// Регистрация (после проверки OTP)
async function handleRegister(e) {
    e.preventDefault();
    const errorDiv = document.getElementById('registerError');
    const btn = document.getElementById('registerBtn');
    errorDiv.classList.add('hidden');
    
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
    
    if (password !== passwordConfirm) {
        errorDiv.textContent = 'Пароли не совпадают';
        errorDiv.classList.remove('hidden');
        return;
    }
    
    // Проверка требований к паролю
    const requirements = {
        min: password.length >= 8,
        upper: /[A-ZА-Я]/.test(password),
        lower: /[a-zа-я]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };
    
    if (!Object.values(requirements).every(req => req === true)) {
        errorDiv.textContent = 'Пароль не соответствует требованиям безопасности';
        errorDiv.classList.remove('hidden');
        return;
    }
    
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> Регистрация...';
    
    const phone = document.getElementById('registerPhone')?.value.trim() || null;
    
    try {
        const data = await apiRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify({
                email: registerEmail,
                password: password,
                phone: phone,
                phone2: document.getElementById('registerPhone2')?.value.trim() || null,
                role: registerRole
            })
        });
        
        token = data.token;
        localStorage.setItem('token', token);
        currentUser = data.user;
        showPage('payment');
    } catch (error) {
        if (error.errors && Array.isArray(error.errors)) {
            errorDiv.textContent = error.errors.join(', ');
        } else {
            errorDiv.textContent = error.message || 'Ошибка регистрации';
        }
        errorDiv.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Зарегистрироваться';
    }
}

// Вход
async function handleLogin(e) {
    e.preventDefault();
    const errorDiv = document.getElementById('loginError');
    const btn = document.getElementById('loginBtn');
    errorDiv.classList.add('hidden');
    
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> Вход...';
    
    try {
        const data = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                email: document.getElementById('loginEmail').value,
                password: document.getElementById('loginPassword').value
            })
        });
        
        token = data.token;
        localStorage.setItem('token', token);
        currentUser = data.user;
        await checkAuth();
    } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Войти';
    }
}

// Выход
function handleLogout() {
    localStorage.removeItem('token');
    token = null;
    currentUser = null;
    showPage('home');
}

// Активация аккаунта
async function handleActivate() {
    const btn = document.getElementById('activateBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> Активация...';
    
    try {
        const data = await apiRequest('/payment/activate', {
            method: 'POST'
        });
        
        currentUser = data.user;
        alert('Аккаунт успешно активирован!');
        showPage('dashboard');
    } catch (error) {
        alert('Ошибка: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Активировать аккаунт';
    }
}

// Автоматический расчет стоимости за 1 км
function calculatePricePerKm() {
    const totalPrice = parseFloat(document.getElementById('cargoTotalPrice').value);
    const distance = parseFloat(document.getElementById('cargoDistance').value);
    
    if (totalPrice && distance && distance > 0) {
        const pricePerKm = (totalPrice / distance).toFixed(2);
        document.getElementById('cargoPricePerKm').value = pricePerKm;
    } else {
        document.getElementById('cargoPricePerKm').value = '';
    }
}

// Обновление веса в тоннах при изменении кг
function updateWeightTons() {
    const weightKg = parseFloat(document.getElementById('cargoWeightKg').value);
    if (weightKg && !isNaN(weightKg)) {
        document.getElementById('cargoWeightTons').value = (weightKg / 1000).toFixed(3);
    }
}

// Обновление веса в кг при изменении тонн
function updateWeightKg() {
    const weightTons = parseFloat(document.getElementById('cargoWeightTons').value);
    if (weightTons && !isNaN(weightTons)) {
        document.getElementById('cargoWeightKg').value = (weightTons * 1000).toFixed(2);
    }
}

// Создание груза
async function handleCreateCargo(e) {
    e.preventDefault();
    const errorDiv = document.getElementById('cargoError');
    const btn = document.getElementById('createCargoBtn');
    errorDiv.classList.add('hidden');
    
    try {
        const title = document.getElementById('cargoTitle').value.trim();
        const weightKg = parseFloat(document.getElementById('cargoWeightKg').value);
        const totalPrice = parseFloat(document.getElementById('cargoTotalPrice').value);
        const distance = parseFloat(document.getElementById('cargoDistance').value);
        const pickupDate = document.getElementById('cargoPickupDate').value;
        const pickupCity = document.getElementById('cargoPickupCity').value.trim();
        const deliveryCity = document.getElementById('cargoDeliveryCity').value.trim();
        
        // Валидация
        if (!title) throw new Error('Название груза обязательно');
        if (!weightKg || isNaN(weightKg) || weightKg <= 0) throw new Error('Вес должен быть положительным числом');
        if (!totalPrice || isNaN(totalPrice) || totalPrice <= 0) throw new Error('Общая стоимость должна быть положительным числом');
        if (!distance || isNaN(distance) || distance <= 0) throw new Error('Расстояние должно быть положительным числом');
        if (!pickupDate) throw new Error('Дата загрузки обязательна');
        if (!pickupCity) throw new Error('Город отправления обязателен');
        if (!deliveryCity) throw new Error('Город доставки обязателен');
        
        // Автоматический расчет стоимости за 1 км
        const pricePerKm = totalPrice / distance;
        const weightTons = weightKg / 1000;
        const volumeValue = document.getElementById('cargoVolume').value;
        
        btn.disabled = true;
        btn.innerHTML = '<span class="loading"></span> Создание...';
        
        const cargoData = {
            title: title,
            description: document.getElementById('cargoDescription').value.trim() || null,
            cargoType: document.getElementById('cargoType').value,
            vehicleType: document.getElementById('cargoVehicleType').value,
            weightKg: weightKg,
            weightTons: weightTons,
            volume: volumeValue ? parseFloat(volumeValue) : null,
            totalPrice: totalPrice,
            pricePerKm: pricePerKm,
            distance: distance,
            comment: document.getElementById('cargoComment').value.trim() || null,
            pickupLocation: {
                country: 'Казахстан',
                city: pickupCity,
                address: document.getElementById('cargoPickupAddress').value.trim() || ''
            },
            deliveryLocation: {
                country: 'Казахстан',
                city: deliveryCity,
                address: document.getElementById('cargoDeliveryAddress').value.trim() || ''
            },
            pickupDate: pickupDate,
            deliveryDate: document.getElementById('cargoDeliveryDate').value || null
        };
        
        await apiRequest('/cargo', {
            method: 'POST',
            body: JSON.stringify(cargoData)
        });
        
        alert('Груз успешно создан!');
        document.querySelector('#cargoForm form').reset();
        showPage('cargoList');
    } catch (error) {
        errorDiv.textContent = error.message || 'Ошибка создания груза';
        errorDiv.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Создать груз';
    }
}

// Фильтрация грузов
function filterCargos() {
    const statusFilter = document.getElementById('cargoStatusFilter').value.toLowerCase();
    const typeFilter = document.getElementById('cargoTypeFilter').value.toLowerCase();
    const pickupCityFilter = document.getElementById('cargoPickupCityFilter').value.toLowerCase();
    const deliveryCityFilter = document.getElementById('cargoDeliveryCityFilter').value.toLowerCase();
    
    const filtered = allCargos.filter(cargo => {
        const matchStatus = !statusFilter || cargo.status.toLowerCase() === statusFilter;
        const matchType = !typeFilter || cargo.cargoType.toLowerCase() === typeFilter;
        const matchPickup = !pickupCityFilter || (cargo.pickupLocation?.city || '').toLowerCase().includes(pickupCityFilter);
        const matchDelivery = !deliveryCityFilter || (cargo.deliveryLocation?.city || '').toLowerCase().includes(deliveryCityFilter);
        
        return matchStatus && matchType && matchPickup && matchDelivery;
    });
    
    renderCargoList(filtered);
}

// Очистка фильтров грузов
function clearCargoFilters() {
    document.getElementById('cargoStatusFilter').value = '';
    document.getElementById('cargoTypeFilter').value = '';
    document.getElementById('cargoPickupCityFilter').value = '';
    document.getElementById('cargoDeliveryCityFilter').value = '';
    filterCargos();
}

// Рендеринг списка грузов
function renderCargoList(cargos) {
    const content = document.getElementById('cargoListContent');
    
    if (!content) {
        console.error('Элемент cargoListContent не найден');
        return;
    }
    
    if (cargos.length === 0) {
        content.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon"><i class="fas fa-box" style="font-size: 64px;"></i></div>
                <h3>Грузы не найдены</h3>
                <p style="margin-top: 8px;">Попробуйте изменить фильтры</p>
            </div>
        `;
        return;
    }
    
    const statusLabels = {
        pending: { text: 'Ожидает', class: 'badge-warning' },
        assigned: { text: 'Назначен', class: 'badge-info' },
        in_transit: { text: 'В пути', class: 'badge-info' },
        delivered: { text: 'Доставлен', class: 'badge-success' },
        cancelled: { text: 'Отменен', class: 'badge-danger' }
    };
    
    const cargoTypeLabels = {
        container: 'Контейнер',
        pallets: 'Паллеты',
        bulk: 'Насыпной',
        liquid: 'Жидкость',
        fragile: 'Хрупкий',
        perishable: 'Скоропортящийся',
        general: 'Обычный'
    };
    
    const vehicleTypeLabels = {
        open: 'Открытый',
        closed: 'Закрытый тент'
    };
    
    content.innerHTML = cargos.map(cargo => {
        const status = statusLabels[cargo.status] || { text: cargo.status, class: 'badge-info' };
        return `
            <div class="card cargo-card">
                <div class="cargo-header">
                    <div>
                        <h3 style="margin-bottom: 8px;">${cargo.title}</h3>
                        <span class="badge ${status.class}">${status.text}</span>
                    </div>
                </div>
                ${cargo.description ? `<p style="color: var(--gray-600); margin-bottom: 16px;">${cargo.description}</p>` : ''}
                
                <div class="cargo-meta">
                    <div class="cargo-meta-item">
                        <span class="cargo-meta-label">Тип груза</span>
                        <span class="cargo-meta-value">${cargoTypeLabels[cargo.cargoType] || cargo.cargoType}</span>
                    </div>
                    <div class="cargo-meta-item">
                        <span class="cargo-meta-label">Тип машины</span>
                        <span class="cargo-meta-value">${vehicleTypeLabels[cargo.vehicleType] || cargo.vehicleType}</span>
                    </div>
                    <div class="cargo-meta-item">
                        <span class="cargo-meta-label">Вес</span>
                        <span class="cargo-meta-value">${parseFloat(cargo.weightKg).toLocaleString('ru-RU')} кг ${cargo.weightTons ? `(${parseFloat(cargo.weightTons).toFixed(2)} т)` : ''}</span>
                    </div>
                    ${cargo.volume ? `
                    <div class="cargo-meta-item">
                        <span class="cargo-meta-label">Объем</span>
                        <span class="cargo-meta-value">${parseFloat(cargo.volume).toFixed(2)} м³</span>
                    </div>
                    ` : ''}
                    <div class="cargo-meta-item">
                        <span class="cargo-meta-label">Общая стоимость</span>
                        <span class="cargo-meta-value" style="color: var(--success);">${parseFloat(cargo.totalPrice).toLocaleString('ru-RU')} ₸</span>
                    </div>
                    ${cargo.pricePerKm ? `
                    <div class="cargo-meta-item">
                        <span class="cargo-meta-label">Стоимость за 1 км</span>
                        <span class="cargo-meta-value">${parseFloat(cargo.pricePerKm).toLocaleString('ru-RU')} ₸</span>
                    </div>
                    ` : ''}
                    ${cargo.distance ? `
                    <div class="cargo-meta-item">
                        <span class="cargo-meta-label">Расстояние</span>
                        <span class="cargo-meta-value">${parseFloat(cargo.distance).toLocaleString('ru-RU')} км</span>
                    </div>
                    ` : ''}
                </div>
                
                <div style="margin-top: 16px; padding: 16px; background: var(--gray-50); border-radius: var(--radius);">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                        <div>
                            <strong style="color: var(--gray-700);"><i class="fas fa-map-marker-alt"></i> Откуда:</strong>
                            <p style="margin-top: 4px;">${cargo.pickupLocation?.city || ''}, ${cargo.pickupLocation?.address || ''}</p>
                        </div>
                        <div>
                            <strong style="color: var(--gray-700);"><i class="fas fa-map-marked-alt"></i> Куда:</strong>
                            <p style="margin-top: 4px;">${cargo.deliveryLocation?.city || ''}, ${cargo.deliveryLocation?.address || ''}</p>
                        </div>
                    </div>
                    <div style="margin-top: 12px; display: flex; gap: 24px; flex-wrap: wrap;">
                        <div>
                            <strong style="color: var(--gray-700); font-size: 13px;"><i class="fas fa-calendar"></i> Загрузка:</strong>
                            <span style="margin-left: 8px;">${new Date(cargo.pickupDate).toLocaleDateString('ru-RU')}</span>
                        </div>
                        ${cargo.deliveryDate ? `
                        <div>
                            <strong style="color: var(--gray-700); font-size: 13px;"><i class="fas fa-calendar"></i> Доставка:</strong>
                            <span style="margin-left: 8px;">${new Date(cargo.deliveryDate).toLocaleDateString('ru-RU')}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
                
                ${cargo.comment ? `
                <div style="margin-top: 16px; padding: 12px; background: #fef3c7; border-left: 4px solid var(--warning); border-radius: var(--radius);">
                    <strong style="color: var(--gray-700);"><i class="fas fa-comment"></i> Комментарий:</strong>
                    <p style="margin-top: 4px; color: var(--gray-700);">${cargo.comment}</p>
                </div>
                ` : ''}
                
                ${cargo.assignedDriver ? `
                <div class="contact-card" style="margin-top: 16px;">
                    <h4 style="margin-bottom: 12px;"><i class="fas fa-user"></i> Водитель назначен</h4>
                    <div class="contact-info">
                        <div class="contact-item">
                            <strong>Email:</strong>
                            <span>${cargo.assignedDriver.email}</span>
                        </div>
                        ${cargo.assignedDriver.phone || cargo.assignedDriver.phone2 ? `
                        <div style="margin-top: 12px; display: flex; gap: 8px;">
                            ${cargo.assignedDriver.phone ? `
                            <a href="tel:${cargo.assignedDriver.phone}" class="btn btn-primary" style="flex: 1; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 8px;">
                                <i class="fas fa-phone"></i> Позвонить
                            </a>
                            ` : ''}
                            ${cargo.assignedDriver.phone2 ? `
                            <a href="tel:${cargo.assignedDriver.phone2}" class="btn btn-secondary" style="flex: 1; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 8px;">
                                <i class="fas fa-phone-alt"></i> Второй номер
                            </a>
                            ` : ''}
                        </div>
                        ` : ''}
                        ${cargo.assignedDriver.profile?.firstName || cargo.assignedDriver.profile?.lastName ? `
                        <div class="contact-item">
                            <strong>Имя:</strong>
                            <span>${cargo.assignedDriver.profile.firstName || ''} ${cargo.assignedDriver.profile.lastName || ''}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

// Загрузка списка грузов
async function loadCargoList() {
    try {
        const data = await apiRequest('/cargo/my');
        allCargos = data.cargos;
        filterCargos();
    } catch (error) {
        const content = document.getElementById('cargoListContent');
        if (content) {
            content.innerHTML = `<div class="alert alert-error">${error.message}</div>`;
        }
    }
}

// Загрузка дашборда
async function loadDashboard() {
    const content = document.getElementById('dashboardContent');
    if (!content) {
        console.error('Элемент dashboardContent не найден');
        return;
    }
    
    if (currentUser.role === 'shipper') {
        content.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-top: 24px;">
                <button class="btn btn-primary" onclick="showPage('cargoForm')" style="padding: 24px; flex-direction: column; gap: 12px;">
                    <i class="fas fa-box" style="font-size: 32px;"></i>
                    <span>Создать груз</span>
                </button>
                <button class="btn btn-secondary" onclick="showPage('cargoList')" style="padding: 24px; flex-direction: column; gap: 12px;">
                    <i class="fas fa-list" style="font-size: 32px;"></i>
                    <span>Мои грузы</span>
                </button>
                <button class="btn btn-info" onclick="showPage('userProfile')" style="padding: 24px; flex-direction: column; gap: 12px;">
                    <i class="fas fa-user-edit" style="font-size: 32px;"></i>
                    <span>Мой профиль</span>
                </button>
            </div>
        `;
    } else if (currentUser.role === 'driver') {
        content.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-top: 24px;">
                <button class="btn btn-primary" onclick="showPage('driverProfile')" style="padding: 24px; flex-direction: column; gap: 12px;">
                    <i class="fas fa-user" style="font-size: 32px;"></i>
                    <span>Профиль водителя</span>
                </button>
                <button class="btn btn-info" onclick="showPage('userProfile')" style="padding: 24px; flex-direction: column; gap: 12px;">
                    <i class="fas fa-user-edit" style="font-size: 32px;"></i>
                    <span>Мой профиль</span>
                </button>
                <button class="btn btn-secondary" onclick="showPage('availableCargos')" style="padding: 24px; flex-direction: column; gap: 12px;">
                    <i class="fas fa-search" style="font-size: 32px;"></i>
                    <span>Доступные грузы</span>
                </button>
                <button class="btn btn-success" onclick="showPage('myOrders')" style="padding: 24px; flex-direction: column; gap: 12px;">
                    <i class="fas fa-list" style="font-size: 32px;"></i>
                    <span>Мои заказы</span>
                </button>
            </div>
        `;
    }
}

// Сохранение профиля водителя
async function handleSaveDriverProfile(e) {
    e.preventDefault();
    const errorDiv = document.getElementById('driverError');
    const successDiv = document.getElementById('driverSuccess');
    const btn = document.getElementById('saveDriverBtn');
    
    errorDiv.classList.add('hidden');
    successDiv.classList.add('hidden');
    
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> Сохранение...';
    
    const phone = document.getElementById('driverPhone')?.value.trim() || null;
    const phone2 = document.getElementById('driverPhone2')?.value.trim() || null;
    
    try {
        await apiRequest('/driver/profile', {
            method: 'POST',
            body: JSON.stringify({
                phone: phone,
                phone2: phone2,
                licenseNumber: document.getElementById('driverLicense').value,
                licenseExpiry: document.getElementById('driverLicenseExpiry').value,
                vehicleType: document.getElementById('driverVehicleType').value,
                vehicleNumber: document.getElementById('driverVehicleNumber').value
            })
        });
        
        successDiv.innerHTML = '<strong><i class="fas fa-check-circle"></i> Профиль сохранен!</strong> Ожидайте подтверждения администратором.';
        successDiv.classList.remove('hidden');
        errorDiv.classList.add('hidden');
    } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.classList.remove('hidden');
        successDiv.classList.add('hidden');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Сохранить профиль';
    }
}

// Загрузка профиля пользователя
async function loadUserProfile() {
    if (!currentUser) return;
    
    const emailInput = document.getElementById('userProfileEmail');
    const phoneInput = document.getElementById('userProfilePhone');
    const phone2Input = document.getElementById('userProfilePhone2');
    
    if (emailInput) emailInput.value = currentUser.email || '';
    if (phoneInput) phoneInput.value = currentUser.phone || '';
    if (phone2Input) phone2Input.value = currentUser.phone2 || '';
}

// Сохранение профиля пользователя
async function handleSaveUserProfile(e) {
    e.preventDefault();
    const errorDiv = document.getElementById('userProfileError');
    const successDiv = document.getElementById('userProfileSuccess');
    const btn = document.getElementById('saveUserProfileBtn');
    
    errorDiv.classList.add('hidden');
    successDiv.classList.add('hidden');
    
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> Сохранение...';
    
    const phone = document.getElementById('userProfilePhone')?.value.trim() || null;
    const phone2 = document.getElementById('userProfilePhone2')?.value.trim() || null;
    
    try {
        const data = await apiRequest('/auth/update-profile', {
            method: 'PUT',
            body: JSON.stringify({
                phone: phone,
                phone2: phone2
            })
        });
        
        // Обновляем текущего пользователя
        currentUser.phone = data.user.phone;
        currentUser.phone2 = data.user.phone2;
        
        successDiv.innerHTML = '<strong><i class="fas fa-check-circle"></i> Профиль успешно обновлен!</strong>';
        successDiv.classList.remove('hidden');
        errorDiv.classList.add('hidden');
    } catch (error) {
        errorDiv.textContent = error.message || 'Ошибка сохранения профиля';
        errorDiv.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Сохранить изменения';
    }
}

// Фильтрация доступных грузов
function filterAvailableCargos() {
    const pickupCityFilter = document.getElementById('availablePickupCityFilter')?.value.toLowerCase() || '';
    const deliveryCityFilter = document.getElementById('availableDeliveryCityFilter')?.value.toLowerCase() || '';
    const cargoTypeFilter = document.getElementById('availableCargoTypeFilter')?.value.toLowerCase() || '';
    const vehicleTypeFilter = document.getElementById('availableVehicleTypeFilter')?.value.toLowerCase() || '';
    const minPrice = parseFloat(document.getElementById('availableMinPriceFilter')?.value) || 0;
    const maxPrice = parseFloat(document.getElementById('availableMaxPriceFilter')?.value) || Infinity;
    
    const filtered = allAvailableCargos.filter(cargo => {
        const matchPickup = !pickupCityFilter || (cargo.pickupLocation?.city || '').toLowerCase().includes(pickupCityFilter);
        const matchDelivery = !deliveryCityFilter || (cargo.deliveryLocation?.city || '').toLowerCase().includes(deliveryCityFilter);
        const matchCargoType = !cargoTypeFilter || cargo.cargoType.toLowerCase() === cargoTypeFilter;
        const matchVehicleType = !vehicleTypeFilter || cargo.vehicleType.toLowerCase() === vehicleTypeFilter;
        const matchPrice = cargo.totalPrice >= minPrice && cargo.totalPrice <= maxPrice;
        
        return matchPickup && matchDelivery && matchCargoType && matchVehicleType && matchPrice;
    });
    
    renderAvailableCargos(filtered);
}

// Очистка фильтров доступных грузов
function clearAvailableFilters() {
    const pickupFilter = document.getElementById('availablePickupCityFilter');
    const deliveryFilter = document.getElementById('availableDeliveryCityFilter');
    const cargoTypeFilter = document.getElementById('availableCargoTypeFilter');
    const vehicleTypeFilter = document.getElementById('availableVehicleTypeFilter');
    const minPriceFilter = document.getElementById('availableMinPriceFilter');
    const maxPriceFilter = document.getElementById('availableMaxPriceFilter');
    
    if (pickupFilter) pickupFilter.value = '';
    if (deliveryFilter) deliveryFilter.value = '';
    if (cargoTypeFilter) cargoTypeFilter.value = '';
    if (vehicleTypeFilter) vehicleTypeFilter.value = '';
    if (minPriceFilter) minPriceFilter.value = '';
    if (maxPriceFilter) maxPriceFilter.value = '';
    
    filterAvailableCargos();
}

// Загрузка доступных грузов (для водителей)
async function loadAvailableCargos() {
    try {
        const data = await apiRequest('/cargo/available');
        allAvailableCargos = data.cargos;
        filterAvailableCargos();
    } catch (error) {
        document.getElementById('availableCargosContent').innerHTML = 
            `<div class="alert alert-error">${error.message}</div>`;
    }
}

// Рендеринг доступных грузов (вспомогательная функция)
function renderAvailableCargos(cargos) {
    const content = document.getElementById('availableCargosContent');
    
    if (!content) {
        console.error('Элемент availableCargosContent не найден');
        return;
    }
    
    if (cargos.length === 0) {
        content.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon"><i class="fas fa-inbox" style="font-size: 64px;"></i></div>
                <h3>Грузы не найдены</h3>
                <p style="margin-top: 8px;">Попробуйте изменить фильтры</p>
            </div>
        `;
        return;
    }
    
    const cargoTypeLabels = {
            container: 'Контейнер',
            pallets: 'Паллеты',
            bulk: 'Насыпной',
            liquid: 'Жидкость',
            fragile: 'Хрупкий',
            perishable: 'Скоропортящийся',
            general: 'Обычный'
        };
        
        const vehicleTypeLabels = {
            open: 'Открытый',
            closed: 'Закрытый тент'
        };
        
        content.innerHTML = cargos.map(cargo => `
            <div class="card cargo-card">
                <div class="cargo-header">
                    <div>
                        <h3 style="margin-bottom: 8px;">${cargo.title}</h3>
                        <span class="badge badge-warning">Ожидает водителя</span>
                    </div>
                </div>
                ${cargo.description ? `<p style="color: var(--gray-600); margin-bottom: 16px;">${cargo.description}</p>` : ''}
                
                <div class="cargo-meta">
                    <div class="cargo-meta-item">
                        <span class="cargo-meta-label">Тип груза</span>
                        <span class="cargo-meta-value">${cargoTypeLabels[cargo.cargoType] || cargo.cargoType}</span>
                    </div>
                    <div class="cargo-meta-item">
                        <span class="cargo-meta-label">Тип машины</span>
                        <span class="cargo-meta-value">${vehicleTypeLabels[cargo.vehicleType] || cargo.vehicleType}</span>
                    </div>
                    <div class="cargo-meta-item">
                        <span class="cargo-meta-label">Вес</span>
                        <span class="cargo-meta-value">${parseFloat(cargo.weightKg).toLocaleString('ru-RU')} кг ${cargo.weightTons ? `(${parseFloat(cargo.weightTons).toFixed(2)} т)` : ''}</span>
                    </div>
                    ${cargo.volume ? `
                    <div class="cargo-meta-item">
                        <span class="cargo-meta-label">Объем</span>
                        <span class="cargo-meta-value">${parseFloat(cargo.volume).toFixed(2)} м³</span>
                    </div>
                    ` : ''}
                    <div class="cargo-meta-item">
                        <span class="cargo-meta-label">Общая стоимость</span>
                        <span class="cargo-meta-value" style="color: var(--success); font-size: 18px;">${parseFloat(cargo.totalPrice).toLocaleString('ru-RU')} ₸</span>
                    </div>
                    ${cargo.pricePerKm ? `
                    <div class="cargo-meta-item">
                        <span class="cargo-meta-label">Стоимость за 1 км</span>
                        <span class="cargo-meta-value">${parseFloat(cargo.pricePerKm).toLocaleString('ru-RU')} ₸</span>
                    </div>
                    ` : ''}
                    ${cargo.distance ? `
                    <div class="cargo-meta-item">
                        <span class="cargo-meta-label">Расстояние</span>
                        <span class="cargo-meta-value">${parseFloat(cargo.distance).toLocaleString('ru-RU')} км</span>
                    </div>
                    ` : ''}
                </div>
                
                <div style="margin-top: 16px; padding: 16px; background: var(--gray-50); border-radius: var(--radius);">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                        <div>
                            <strong style="color: var(--gray-700);"><i class="fas fa-map-marker-alt"></i> Откуда:</strong>
                            <p style="margin-top: 4px;">${cargo.pickupLocation?.city || ''}, ${cargo.pickupLocation?.address || ''}</p>
                        </div>
                        <div>
                            <strong style="color: var(--gray-700);"><i class="fas fa-map-marked-alt"></i> Куда:</strong>
                            <p style="margin-top: 4px;">${cargo.deliveryLocation?.city || ''}, ${cargo.deliveryLocation?.address || ''}</p>
                        </div>
                    </div>
                    <div style="margin-top: 12px;">
                        <strong style="color: var(--gray-700); font-size: 13px;"><i class="fas fa-calendar"></i> Дата загрузки:</strong>
                        <span style="margin-left: 8px;">${new Date(cargo.pickupDate).toLocaleDateString('ru-RU')}</span>
                    </div>
                </div>
                
                ${cargo.comment ? `
                <div style="margin-top: 16px; padding: 12px; background: #fef3c7; border-left: 4px solid var(--warning); border-radius: var(--radius);">
                    <strong style="color: var(--gray-700);"><i class="fas fa-comment"></i> Комментарий:</strong>
                    <p style="margin-top: 4px; color: var(--gray-700);">${cargo.comment}</p>
                </div>
                ` : ''}
                
                ${cargo.shipper ? `
                <div style="margin-top: 16px; padding: 12px; background: var(--gray-100); border-radius: var(--radius);">
                    <strong style="color: var(--gray-700); font-size: 13px;"><i class="fas fa-envelope"></i> Грузоотправитель:</strong>
                    <span style="margin-left: 8px;">${cargo.shipper.email}</span>
                </div>
                ` : ''}
                
                ${cargo.shipper && (cargo.shipper.phone || cargo.shipper.phone2) ? `
                <div style="margin-top: 12px; display: flex; gap: 8px;">
                    ${cargo.shipper.phone ? `
                    <a href="tel:${cargo.shipper.phone}" class="btn btn-primary" style="flex: 1; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 8px;">
                        <i class="fas fa-phone"></i> Позвонить
                    </a>
                    ` : ''}
                    ${cargo.shipper.phone2 ? `
                    <a href="tel:${cargo.shipper.phone2}" class="btn btn-secondary" style="flex: 1; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 8px;">
                        <i class="fas fa-phone-alt"></i> Второй номер
                    </a>
                    ` : ''}
                </div>
                ` : ''}
                
                <button class="btn btn-success" onclick="acceptOrder(${cargo.id})" style="width: 100%; margin-top: 16px;">
                    <i class="fas fa-check"></i> Принять заказ
                </button>
            </div>
        `).join('');
}

// Принятие заказа водителем
async function acceptOrder(cargoId) {
    if (!confirm('Вы уверены, что хотите принять этот заказ?')) {
        return;
    }
    
    try {
        const data = await apiRequest(`/driver/accept-order/${cargoId}`, {
            method: 'POST'
        });
        
        // Используем данные из ответа API, если они есть, иначе получаем отдельно
        let cargo = data.cargo;
        if (!cargo) {
            const cargoData = await apiRequest(`/cargo/${cargoId}`);
            cargo = cargoData.cargo;
        }
        
        if (!cargo || !cargo.shipper) {
            throw new Error('Не удалось получить информацию о грузе');
        }
        
        // Показываем контактную информацию
        const contactInfo = `
            <div class="contact-card" style="margin-top: 20px;">
                <h4 style="margin-bottom: 16px;"><i class="fas fa-check-circle"></i> Заказ принят! Контакты грузоотправителя:</h4>
                <div class="contact-info">
                    <div class="contact-item">
                        <strong><i class="fas fa-envelope"></i> Email:</strong>
                        <a href="mailto:${cargo.shipper.email || ''}" style="color: white; text-decoration: underline;">
                            ${cargo.shipper.email || 'Не указан'}
                        </a>
                    </div>
                    ${cargo.shipper.phone ? `
                    <div class="contact-item">
                        <strong><i class="fas fa-phone"></i> Телефон:</strong>
                        <a href="tel:${cargo.shipper.phone}" style="color: white; text-decoration: underline;">
                            ${cargo.shipper.phone}
                        </a>
                    </div>
                    ` : ''}
                    ${cargo.shipper.phone2 ? `
                    <div class="contact-item">
                        <strong><i class="fas fa-phone"></i> Телефон 2:</strong>
                        <a href="tel:${cargo.shipper.phone2}" style="color: white; text-decoration: underline;">
                            ${cargo.shipper.phone2}
                        </a>
                    </div>
                    ` : ''}
                    ${cargo.shipper.profile?.company ? `
                    <div class="contact-item">
                        <strong><i class="fas fa-building"></i> Компания:</strong>
                        <span>${cargo.shipper.profile.company}</span>
                    </div>
                    ` : ''}
                    ${cargo.shipper.profile?.firstName || cargo.shipper.profile?.lastName ? `
                    <div class="contact-item">
                        <strong><i class="fas fa-user"></i> Контактное лицо:</strong>
                        <span>${cargo.shipper.profile.firstName || ''} ${cargo.shipper.profile.lastName || ''}</span>
                    </div>
                    ` : ''}
                </div>
                <div style="margin-top: 16px; padding: 12px; background: rgba(255,255,255,0.2); border-radius: var(--radius);">
                    <strong><i class="fas fa-lightbulb"></i> Совет:</strong> Свяжитесь с грузоотправителем для уточнения деталей доставки
                </div>
            </div>
        `;
        
        // Показываем модальное окно с контактами
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'orderModal';
        
        const closeModal = () => {
            if (modal && modal.parentNode) {
                modal.remove();
            }
            // Обновляем список после закрытия модального окна
            setTimeout(() => {
                loadAvailableCargos();
            }, 100);
        };
        
        modal.innerHTML = `
            <div class="card" style="max-width: 600px; width: 100%; position: relative; max-height: 90vh; overflow-y: auto;">
                <button id="closeModalBtn" class="modal-close-btn" type="button">×</button>
                <h2 style="margin-bottom: 20px;"><i class="fas fa-check-circle"></i> Заказ принят!</h2>
                ${contactInfo}
                <button id="understandBtn" class="btn btn-primary" type="button" style="width: 100%; margin-top: 20px;">
                    Понятно
                </button>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Добавляем обработчики событий после вставки в DOM
        setTimeout(() => {
            const closeBtn = document.getElementById('closeModalBtn');
            const understandBtn = document.getElementById('understandBtn');
            
            if (closeBtn) {
                closeBtn.addEventListener('click', closeModal);
            }
            
            if (understandBtn) {
                understandBtn.addEventListener('click', closeModal);
            }
        }, 0);
        
        // Закрытие при клике вне модального окна
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
        
        // Закрытие по Escape
        const handleEscape = (e) => {
            if (e.key === 'Escape' && document.getElementById('orderModal')) {
                closeModal();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    } catch (error) {
        console.error('Ошибка при принятии заказа:', error);
        const errorMessage = error.message || 'Произошла ошибка при принятии заказа';
        
        // Специальная обработка для отсутствующего профиля водителя
        if (errorMessage.includes('Профиль водителя не найден')) {
            const shouldGoToProfile = confirm(
                'Для принятия заказов необходимо создать профиль водителя.\n\n' +
                'Нажмите "OK" чтобы перейти на страницу создания профиля.'
            );
            if (shouldGoToProfile) {
                showPage('driverProfile');
                return;
            }
        } else {
            alert('Ошибка: ' + errorMessage);
        }
        
        // Обновляем список доступных грузов в случае ошибки
        setTimeout(() => {
            loadAvailableCargos();
        }, 100);
    }
}

// Фильтрация моих заказов
function filterMyOrders() {
    const statusFilter = document.getElementById('myOrdersStatusFilter').value.toLowerCase();
    const pickupCityFilter = document.getElementById('myOrdersPickupCityFilter').value.toLowerCase();
    const deliveryCityFilter = document.getElementById('myOrdersDeliveryCityFilter').value.toLowerCase();
    
    const filtered = allMyOrders.filter(cargo => {
        const matchStatus = !statusFilter || cargo.status.toLowerCase() === statusFilter;
        const matchPickup = !pickupCityFilter || (cargo.pickupLocation?.city || '').toLowerCase().includes(pickupCityFilter);
        const matchDelivery = !deliveryCityFilter || (cargo.deliveryLocation?.city || '').toLowerCase().includes(deliveryCityFilter);
        
        return matchStatus && matchPickup && matchDelivery;
    });
    
    renderMyOrders(filtered);
}

// Очистка фильтров моих заказов
function clearMyOrdersFilters() {
    document.getElementById('myOrdersStatusFilter').value = '';
    document.getElementById('myOrdersPickupCityFilter').value = '';
    document.getElementById('myOrdersDeliveryCityFilter').value = '';
    filterMyOrders();
}

// Рендеринг моих заказов
function renderMyOrders(orders) {
    const content = document.getElementById('myOrdersContent');
    
    if (!content) {
        console.error('Элемент myOrdersContent не найден');
        return;
    }
    
    if (orders.length === 0) {
        content.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon"><i class="fas fa-inbox" style="font-size: 64px;"></i></div>
                <h3>Заказы не найдены</h3>
                <p style="margin-top: 8px;">Попробуйте изменить фильтры</p>
            </div>
        `;
        return;
    }
        
        const statusLabels = {
            pending: { text: 'Ожидает', class: 'badge-warning' },
            assigned: { text: 'Назначен', class: 'badge-info' },
            in_transit: { text: 'В пути', class: 'badge-info' },
            delivered: { text: 'Доставлен', class: 'badge-success' },
            cancelled: { text: 'Отменен', class: 'badge-danger' }
        };
        
        const cargoTypeLabels = {
            container: 'Контейнер',
            pallets: 'Паллеты',
            bulk: 'Насыпной',
            liquid: 'Жидкость',
            fragile: 'Хрупкий',
            perishable: 'Скоропортящийся',
            general: 'Обычный'
        };
        
        const vehicleTypeLabels = {
            open: 'Открытый',
            closed: 'Закрытый тент'
        };
        
        content.innerHTML = orders.map(cargo => {
            const status = statusLabels[cargo.status] || { text: cargo.status, class: 'badge-info' };
            return `
                <div class="card cargo-card">
                    <div class="cargo-header">
                        <div>
                            <h3 style="margin-bottom: 8px;">${cargo.title}</h3>
                            <span class="badge ${status.class}">${status.text}</span>
                        </div>
                    </div>
                    ${cargo.description ? `<p style="color: var(--gray-600); margin-bottom: 16px;">${cargo.description}</p>` : ''}
                    
                    <div class="cargo-meta">
                        <div class="cargo-meta-item">
                            <span class="cargo-meta-label">Тип груза</span>
                            <span class="cargo-meta-value">${cargoTypeLabels[cargo.cargoType] || cargo.cargoType}</span>
                        </div>
                        <div class="cargo-meta-item">
                            <span class="cargo-meta-label">Тип машины</span>
                            <span class="cargo-meta-value">${vehicleTypeLabels[cargo.vehicleType] || cargo.vehicleType}</span>
                        </div>
                        <div class="cargo-meta-item">
                            <span class="cargo-meta-label">Вес</span>
                            <span class="cargo-meta-value">${parseFloat(cargo.weightKg).toLocaleString('ru-RU')} кг ${cargo.weightTons ? `(${parseFloat(cargo.weightTons).toFixed(2)} т)` : ''}</span>
                        </div>
                        ${cargo.volume ? `
                        <div class="cargo-meta-item">
                            <span class="cargo-meta-label">Объем</span>
                            <span class="cargo-meta-value">${parseFloat(cargo.volume).toFixed(2)} м³</span>
                        </div>
                        ` : ''}
                        <div class="cargo-meta-item">
                            <span class="cargo-meta-label">Общая стоимость</span>
                            <span class="cargo-meta-value" style="color: var(--success); font-size: 18px;">${parseFloat(cargo.totalPrice).toLocaleString('ru-RU')} ₸</span>
                        </div>
                        ${cargo.pricePerKm ? `
                        <div class="cargo-meta-item">
                            <span class="cargo-meta-label">Стоимость за 1 км</span>
                            <span class="cargo-meta-value">${parseFloat(cargo.pricePerKm).toLocaleString('ru-RU')} ₸</span>
                        </div>
                        ` : ''}
                        ${cargo.distance ? `
                        <div class="cargo-meta-item">
                            <span class="cargo-meta-label">Расстояние</span>
                            <span class="cargo-meta-value">${parseFloat(cargo.distance).toLocaleString('ru-RU')} км</span>
                        </div>
                        ` : ''}
                    </div>
                    
                    <div style="margin-top: 16px; padding: 16px; background: var(--gray-50); border-radius: var(--radius);">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                            <div>
                                <strong style="color: var(--gray-700);"><i class="fas fa-map-marker-alt"></i> Откуда:</strong>
                                <p style="margin-top: 4px;">${cargo.pickupLocation?.city || ''}, ${cargo.pickupLocation?.address || ''}</p>
                            </div>
                            <div>
                                <strong style="color: var(--gray-700);"><i class="fas fa-map-marked-alt"></i> Куда:</strong>
                                <p style="margin-top: 4px;">${cargo.deliveryLocation?.city || ''}, ${cargo.deliveryLocation?.address || ''}</p>
                            </div>
                        </div>
                        <div style="margin-top: 12px; display: flex; gap: 24px; flex-wrap: wrap;">
                            <div>
                                <strong style="color: var(--gray-700); font-size: 13px;"><i class="fas fa-calendar"></i> Загрузка:</strong>
                                <span style="margin-left: 8px;">${new Date(cargo.pickupDate).toLocaleDateString('ru-RU')}</span>
                            </div>
                            ${cargo.deliveryDate ? `
                            <div>
                                <strong style="color: var(--gray-700); font-size: 13px;"><i class="fas fa-calendar"></i> Доставка:</strong>
                                <span style="margin-left: 8px;">${new Date(cargo.deliveryDate).toLocaleDateString('ru-RU')}</span>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    ${cargo.comment ? `
                    <div style="margin-top: 16px; padding: 12px; background: #fef3c7; border-left: 4px solid var(--warning); border-radius: var(--radius);">
                        <strong style="color: var(--gray-700);"><i class="fas fa-comment"></i> Комментарий:</strong>
                        <p style="margin-top: 4px; color: var(--gray-700);">${cargo.comment}</p>
                    </div>
                    ` : ''}
                    
                    ${cargo.shipper ? `
                    <div class="contact-card" style="margin-top: 16px;">
                        <h4 style="margin-bottom: 12px;">📞 Контакты грузоотправителя</h4>
                        <div class="contact-info">
                            <div class="contact-item">
                                <strong><i class="fas fa-envelope"></i> Email:</strong>
                                <a href="mailto:${cargo.shipper.email}" style="color: white; text-decoration: underline;">
                                    ${cargo.shipper.email}
                                </a>
                            </div>
                            ${cargo.shipper.profile?.phone ? `
                            <div class="contact-item">
                                <strong><i class="fas fa-phone"></i> Телефон:</strong>
                                <a href="tel:${cargo.shipper.profile.phone}" style="color: white; text-decoration: underline;">
                                    ${cargo.shipper.profile.phone}
                                </a>
                            </div>
                            ` : ''}
                            ${cargo.shipper.profile?.company ? `
                            <div class="contact-item">
                                <strong><i class="fas fa-building"></i> Компания:</strong>
                                <span>${cargo.shipper.profile.company}</span>
                            </div>
                            ` : ''}
                            ${cargo.shipper.profile?.firstName || cargo.shipper.profile?.lastName ? `
                            <div class="contact-item">
                                <strong><i class="fas fa-user"></i> Контактное лицо:</strong>
                                <span>${cargo.shipper.profile.firstName || ''} ${cargo.shipper.profile.lastName || ''}</span>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    ` : ''}
                </div>
            `;
        }).join('');
}

// Вспомогательная функция для форматирования даты
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Вспомогательная функция для статуса груза
function getCargoStatusBadge(status) {
    const statusMap = {
        'pending': { text: 'Ожидает', class: 'badge-warning' },
        'assigned': { text: 'Назначен', class: 'badge-info' },
        'in_transit': { text: 'В пути', class: 'badge-info' },
        'delivered': { text: 'Доставлен', class: 'badge-success' },
        'cancelled': { text: 'Отменен', class: 'badge-danger' }
    };
    const statusInfo = statusMap[status] || { text: status, class: 'badge-secondary' };
    return `<span class="badge ${statusInfo.class}">${statusInfo.text}</span>`;
}

// Загрузка админ-панели
let currentAdminTab = 'stats';

async function loadAdminPanel() {
    try {
        const [driversData, statsData] = await Promise.all([
            apiRequest('/admin/drivers'),
            apiRequest('/admin/stats')
        ]);
        
        const content = document.getElementById('adminContent');
        if (!content) {
            console.error('Элемент adminContent не найден');
            return;
        }
        
        // Вкладки
        const tabs = `
            <div style="display: flex; gap: 8px; margin-bottom: 24px; border-bottom: 2px solid var(--gray-200); flex-wrap: wrap;">
                <button class="btn ${currentAdminTab === 'stats' ? 'btn-primary' : 'btn-secondary'}" 
                        onclick="switchAdminTab('stats')" 
                        style="border-radius: 8px 8px 0 0; border: none; border-bottom: ${currentAdminTab === 'stats' ? '3px solid var(--primary)' : 'none'};">
                    <i class="fas fa-chart-bar"></i> Статистика
                </button>
                <button class="btn ${currentAdminTab === 'users' ? 'btn-primary' : 'btn-secondary'}" 
                        onclick="switchAdminTab('users')"
                        style="border-radius: 8px 8px 0 0; border: none; border-bottom: ${currentAdminTab === 'users' ? '3px solid var(--primary)' : 'none'};">
                    <i class="fas fa-users"></i> Пользователи
                </button>
                <button class="btn ${currentAdminTab === 'cargos' ? 'btn-primary' : 'btn-secondary'}" 
                        onclick="switchAdminTab('cargos')"
                        style="border-radius: 8px 8px 0 0; border: none; border-bottom: ${currentAdminTab === 'cargos' ? '3px solid var(--primary)' : 'none'};">
                    <i class="fas fa-box"></i> Грузы
                </button>
                <button class="btn ${currentAdminTab === 'drivers' ? 'btn-primary' : 'btn-secondary'}" 
                        onclick="switchAdminTab('drivers')"
                        style="border-radius: 8px 8px 0 0; border: none; border-bottom: ${currentAdminTab === 'drivers' ? '3px solid var(--primary)' : 'none'};">
                    <i class="fas fa-truck"></i> Водители
                </button>
            </div>
        `;
        
        let tabContent = '';
        
        if (currentAdminTab === 'stats') {
            tabContent = `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                    <div class="card" style="text-align: center;">
                        <div style="font-size: 32px; margin-bottom: 8px;"><i class="fas fa-users"></i></div>
                        <div style="font-size: 24px; font-weight: 600; color: var(--primary);">${statsData.totalUsers}</div>
                        <div style="color: var(--gray-600); font-size: 14px;">Всего пользователей</div>
                    </div>
                    <div class="card" style="text-align: center;">
                        <div style="font-size: 32px; margin-bottom: 8px;"><i class="fas fa-circle" style="color: var(--success);"></i></div>
                        <div style="font-size: 24px; font-weight: 600; color: var(--success);">${statsData.activeUsers || 0}</div>
                        <div style="color: var(--gray-600); font-size: 14px;">Активных (30 дней)</div>
                    </div>
                    <div class="card" style="text-align: center;">
                        <div style="font-size: 32px; margin-bottom: 8px;"><i class="fas fa-check-circle"></i></div>
                        <div style="font-size: 24px; font-weight: 600; color: var(--success);">${statsData.paidUsers}</div>
                        <div style="color: var(--gray-600); font-size: 14px;">Оплативших</div>
                    </div>
                    <div class="card" style="text-align: center;">
                        <div style="font-size: 32px; margin-bottom: 8px;"><i class="fas fa-truck"></i></div>
                        <div style="font-size: 24px; font-weight: 600; color: var(--primary);">${statsData.totalDrivers}</div>
                        <div style="color: var(--gray-600); font-size: 14px;">Всего водителей</div>
                    </div>
                    <div class="card" style="text-align: center;">
                        <div style="font-size: 32px; margin-bottom: 8px;"><i class="fas fa-check"></i></div>
                        <div style="font-size: 24px; font-weight: 600; color: var(--success);">${statsData.verifiedDrivers}</div>
                        <div style="color: var(--gray-600); font-size: 14px;">Подтвержденных</div>
                    </div>
                    <div class="card" style="text-align: center;">
                        <div style="font-size: 32px; margin-bottom: 8px;"><i class="fas fa-box"></i></div>
                        <div style="font-size: 24px; font-weight: 600; color: var(--primary);">${statsData.totalCargos}</div>
                        <div style="color: var(--gray-600); font-size: 14px;">Всего грузов</div>
                    </div>
                    <div class="card" style="text-align: center;">
                        <div style="font-size: 32px; margin-bottom: 8px;"><i class="fas fa-sync-alt"></i></div>
                        <div style="font-size: 24px; font-weight: 600; color: var(--warning);">${statsData.activeCargos}</div>
                        <div style="color: var(--gray-600); font-size: 14px;">Активных</div>
                    </div>
                </div>
            `;
        } else if (currentAdminTab === 'users') {
            tabContent = await renderAdminUsers();
        } else if (currentAdminTab === 'cargos') {
            tabContent = await renderAdminCargos();
        } else if (currentAdminTab === 'drivers') {
            tabContent = `
                <h3 style="margin-bottom: 20px;">Водители на подтверждение</h3>
                ${driversData.drivers.length === 0 ? `
                    <div class="empty-state">
                        <div class="empty-state-icon"><i class="fas fa-check-circle" style="font-size: 64px;"></i></div>
                        <h3>Все водители подтверждены</h3>
                    </div>
                ` : driversData.drivers.map(driver => `
                    <div class="card" style="margin-bottom: 16px;">
                        <div style="display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap; gap: 16px;">
                            <div style="flex: 1;">
                                <h4 style="margin-bottom: 12px;">${driver.user?.profile?.firstName || ''} ${driver.user?.profile?.lastName || ''}</h4>
                                <div style="display: flex; flex-direction: column; gap: 8px;">
                                    <div><strong>Email:</strong> ${driver.user?.email}</div>
                                    <div><strong>Номер лицензии:</strong> ${driver.licenseNumber}</div>
                                    <div><strong>Тип транспорта:</strong> ${driver.vehicleType}</div>
                                    <div><strong>Номер транспорта:</strong> ${driver.vehicleNumber}</div>
                                    <div>
                                        <strong>Статус:</strong> 
                                        ${driver.isVerified ? 
                                            '<span class="badge badge-success">Подтвержден</span>' : 
                                            '<span class="badge badge-warning">Ожидает подтверждения</span>'
                                        }
                                    </div>
                                </div>
                            </div>
                            <div style="display: flex; gap: 8px;">
                                ${!driver.isVerified ? `
                                    <button class="btn btn-success btn-sm" onclick="verifyDriver(${driver.id})">
                                        <i class="fas fa-check"></i> Подтвердить
                                    </button>
                                ` : `
                                    <button class="btn btn-danger btn-sm" onclick="rejectDriver(${driver.id})">
                                        <i class="fas fa-times"></i> Отклонить
                                    </button>
                                `}
                            </div>
                        </div>
                    </div>
                `).join('')}
            `;
        }
        
        content.innerHTML = tabs + tabContent;
    } catch (error) {
        document.getElementById('adminContent').innerHTML = 
            `<div class="alert alert-error">${error.message}</div>`;
    }
}

// Переключение вкладок админ-панели
function switchAdminTab(tab) {
    currentAdminTab = tab;
    loadAdminPanel();
}

// Рендер пользователей для админ-панели
async function renderAdminUsers(page = 1) {
    try {
        const usersData = await apiRequest(`/admin/users?page=${page}&limit=20`);
        
        return `
            <div style="margin-bottom: 20px;">
                <h3 style="margin-bottom: 16px;">Все пользователи (${usersData.total})</h3>
                ${usersData.users.length === 0 ? `
                    <div class="empty-state">
                        <div class="empty-state-icon"><i class="fas fa-users" style="font-size: 64px;"></i></div>
                        <h3>Пользователи не найдены</h3>
                    </div>
                ` : `
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: var(--gray-100); border-bottom: 2px solid var(--gray-200);">
                                    <th style="padding: 12px; text-align: left;">ID</th>
                                    <th style="padding: 12px; text-align: left;">Email</th>
                                    <th style="padding: 12px; text-align: left;">Роль</th>
                                    <th style="padding: 12px; text-align: left;">Статус оплаты</th>
                                    <th style="padding: 12px; text-align: left;">Вход</th>
                                    <th style="padding: 12px; text-align: left;">Регистрация</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${usersData.users.map(user => `
                                    <tr style="border-bottom: 1px solid var(--gray-200);">
                                        <td style="padding: 12px;">${user.id}</td>
                                        <td style="padding: 12px;">${user.email}</td>
                                        <td style="padding: 12px;">
                                            <span class="badge ${user.role === 'admin' ? 'badge-danger' : user.role === 'driver' ? 'badge-info' : 'badge-secondary'}">
                                                ${user.role === 'admin' ? 'Админ' : user.role === 'driver' ? 'Водитель' : 'Грузоотправитель'}
                                            </span>
                                        </td>
                                        <td style="padding: 12px;">
                                            ${user.isPaid ? 
                                                '<span class="badge badge-success">Оплачен</span>' : 
                                                '<span class="badge badge-warning">Не оплачен</span>'
                                            }
                                        </td>
                                        <td style="padding: 12px; font-size: 13px; color: var(--gray-600);">
                                            ${formatDate(user.lastLogin)}
                                        </td>
                                        <td style="padding: 12px; font-size: 13px; color: var(--gray-600);">
                                            ${formatDate(user.createdAt)}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    ${usersData.totalPages > 1 ? `
                        <div style="display: flex; justify-content: center; gap: 8px; margin-top: 20px;">
                            <button class="btn btn-secondary btn-sm" ${page <= 1 ? 'disabled' : ''} 
                                    onclick="switchAdminUsersPage(${page - 1})">
                                ← Назад
                            </button>
                            <span style="padding: 8px 16px; align-self: center;">Страница ${page} из ${usersData.totalPages}</span>
                            <button class="btn btn-secondary btn-sm" ${page >= usersData.totalPages ? 'disabled' : ''} 
                                    onclick="switchAdminUsersPage(${page + 1})">
                                Вперед →
                            </button>
                        </div>
                    ` : ''}
                `}
            </div>
        `;
    } catch (error) {
        return `<div class="alert alert-error">Ошибка загрузки пользователей: ${error.message}</div>`;
    }
}

// Переключение страницы пользователей
async function switchAdminUsersPage(page) {
    currentAdminTab = 'users';
    const content = document.getElementById('adminContent');
    if (!content) return;
    
    const tabs = content.innerHTML.split('<h3')[0];
    const usersContent = await renderAdminUsers(page);
    content.innerHTML = tabs + usersContent;
}

// Рендер грузов для админ-панели
async function renderAdminCargos(page = 1) {
    try {
        const cargosData = await apiRequest(`/admin/cargos?page=${page}&limit=20`);
        
        return `
            <div style="margin-bottom: 20px;">
                <h3 style="margin-bottom: 16px;">Все грузы (${cargosData.total})</h3>
                ${cargosData.cargos.length === 0 ? `
                    <div class="empty-state">
                        <div class="empty-state-icon"><i class="fas fa-box" style="font-size: 64px;"></i></div>
                        <h3>Грузы не найдены</h3>
                    </div>
                ` : cargosData.cargos.map(cargo => `
                    <div class="card" style="margin-bottom: 16px;">
                        <div style="display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap; gap: 16px;">
                            <div style="flex: 1; min-width: 300px;">
                                <h4 style="margin-bottom: 12px;">${cargo.title}</h4>
                                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 12px;">
                                    <div>
                                        <strong>Откуда:</strong> ${cargo.pickupLocation?.city || '-'}<br>
                                        <strong>Куда:</strong> ${cargo.deliveryLocation?.city || '-'}
                                    </div>
                                    <div>
                                        <strong>Вес:</strong> ${cargo.weightKg} кг (${cargo.weightTons} т)<br>
                                        <strong>Цена:</strong> ${parseFloat(cargo.totalPrice).toLocaleString('ru-RU')} ₸
                                    </div>
                                    <div>
                                        <strong>Статус:</strong> ${getCargoStatusBadge(cargo.status)}<br>
                                        <strong>Тип:</strong> ${cargo.cargoType || '-'}
                                    </div>
                                    <div>
                                        <strong>Грузоотправитель:</strong> ${cargo.shipper?.email || '-'}<br>
                                        <strong>Водитель:</strong> ${cargo.assignedDriver?.email || 'Не назначен'}
                                    </div>
                                </div>
                                <div style="font-size: 13px; color: var(--gray-600);">
                                    Создан: ${formatDate(cargo.createdAt)}
                                </div>
                            </div>
                            <div style="display: flex; gap: 8px; flex-direction: column;">
                                <button class="btn btn-danger btn-sm" onclick="deleteCargoAdmin(${cargo.id})" title="Удалить">
                                    <i class="fas fa-trash"></i> Удалить
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('')}
                ${cargosData.totalPages > 1 ? `
                    <div style="display: flex; justify-content: center; gap: 8px; margin-top: 20px;">
                        <button class="btn btn-secondary btn-sm" ${page <= 1 ? 'disabled' : ''} 
                                onclick="switchAdminCargosPage(${page - 1})">
                            ← Назад
                        </button>
                        <span style="padding: 8px 16px; align-self: center;">Страница ${page} из ${cargosData.totalPages}</span>
                        <button class="btn btn-secondary btn-sm" ${page >= cargosData.totalPages ? 'disabled' : ''} 
                                onclick="switchAdminCargosPage(${page + 1})">
                            Вперед →
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    } catch (error) {
        return `<div class="alert alert-error">Ошибка загрузки грузов: ${error.message}</div>`;
    }
}

// Переключение страницы грузов
async function switchAdminCargosPage(page) {
    currentAdminTab = 'cargos';
    const content = document.getElementById('adminContent');
    if (!content) return;
    
    const tabs = content.innerHTML.split('<h3')[0];
    const cargosContent = await renderAdminCargos(page);
    content.innerHTML = tabs + cargosContent;
}

// Удаление груза (модерация)
async function deleteCargoAdmin(cargoId) {
    if (!confirm('Вы уверены, что хотите удалить этот груз? Это действие нельзя отменить.')) {
        return;
    }
    
    try {
        await apiRequest(`/admin/cargos/${cargoId}`, {
            method: 'DELETE'
        });
        alert('Груз удален');
        loadAdminPanel();
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
}

// Подтверждение водителя
async function verifyDriver(driverId) {
    try {
        await apiRequest(`/admin/verify-driver/${driverId}`, {
            method: 'POST'
        });
        alert('Водитель подтвержден!');
        loadAdminPanel();
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
}

// Отклонение водителя
async function rejectDriver(driverId) {
    if (!confirm('Вы уверены, что хотите отклонить этого водителя?')) {
        return;
    }
    
    try {
        await apiRequest(`/admin/reject-driver/${driverId}`, {
            method: 'POST'
        });
        alert('Водитель отклонен');
        loadAdminPanel();
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
}

// Восстановление пароля
async function handleForgotPassword(e) {
    e.preventDefault();
    const errorDiv = document.getElementById('forgotPasswordError');
    const successDiv = document.getElementById('forgotPasswordSuccess');
    const btn = document.getElementById('forgotPasswordBtn');
    errorDiv.classList.add('hidden');
    successDiv.classList.add('hidden');
    
    const email = document.getElementById('forgotPasswordEmail').value.toLowerCase().trim();
    
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> Отправка...';
    
    try {
        await apiRequest('/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
        
        successDiv.textContent = 'Если email существует в системе, на него будет отправлена ссылка для восстановления пароля. Проверьте почту.';
        successDiv.classList.remove('hidden');
        document.getElementById('forgotPasswordEmail').value = '';
    } catch (error) {
        errorDiv.textContent = error.message || 'Ошибка отправки запроса';
        errorDiv.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Отправить ссылку';
    }
}

// Сброс пароля
async function handleResetPassword(e) {
    e.preventDefault();
    const errorDiv = document.getElementById('resetPasswordError');
    const successDiv = document.getElementById('resetPasswordSuccess');
    const btn = document.getElementById('resetPasswordBtn');
    errorDiv.classList.add('hidden');
    successDiv.classList.add('hidden');
    
    const token = document.getElementById('resetPasswordToken').value;
    const password = document.getElementById('resetPasswordNew').value;
    const passwordConfirm = document.getElementById('resetPasswordConfirm').value;
    
    if (password !== passwordConfirm) {
        errorDiv.textContent = 'Пароли не совпадают';
        errorDiv.classList.remove('hidden');
        return;
    }
    
    // Проверка требований к паролю
    const requirements = {
        min: password.length >= 8,
        upper: /[A-ZА-Я]/.test(password),
        lower: /[a-zа-я]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };
    
    if (!Object.values(requirements).every(req => req === true)) {
        errorDiv.textContent = 'Пароль не соответствует требованиям безопасности';
        errorDiv.classList.remove('hidden');
        return;
    }
    
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> Изменение...';
    
    try {
        await apiRequest('/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ token, password })
        });
        
        successDiv.textContent = 'Пароль успешно изменен! Вы будете перенаправлены на страницу входа.';
        successDiv.classList.remove('hidden');
        
        setTimeout(() => {
            showPage('login');
        }, 2000);
    } catch (error) {
        if (error.errors && Array.isArray(error.errors)) {
            errorDiv.textContent = error.errors.join(', ');
        } else {
            errorDiv.textContent = error.message || 'Ошибка сброса пароля';
        }
        errorDiv.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Изменить пароль';
    }
}

// Валидация пароля для восстановления
function validateResetPasswordInput() {
    const password = document.getElementById('resetPasswordNew').value;
    const passwordConfirm = document.getElementById('resetPasswordConfirm').value;
    const matchDiv = document.getElementById('resetPasswordMatch');
    const matchText = document.getElementById('resetPasswordMatchText');
    
    // Проверка требований
    const requirements = {
        min: password.length >= 8,
        upper: /[A-ZА-Я]/.test(password),
        lower: /[a-zа-я]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };
    
    const reqElements = {
        min: document.getElementById('resetPasswordReqMin'),
        upper: document.getElementById('resetPasswordReqUpper'),
        lower: document.getElementById('resetPasswordReqLower'),
        number: document.getElementById('resetPasswordReqNumber'),
        special: document.getElementById('resetPasswordReqSpecial')
    };
    
    if (reqElements.min) {
        reqElements.min.innerHTML = requirements.min 
            ? '<i class="fas fa-check"></i> Минимум 8 символов'
            : '<i class="fas fa-times"></i> Минимум 8 символов';
        reqElements.min.style.color = requirements.min ? 'var(--success)' : 'var(--gray-500)';
    }
    
    if (reqElements.upper) {
        reqElements.upper.innerHTML = requirements.upper 
            ? '<i class="fas fa-check"></i> Заглавная буква'
            : '<i class="fas fa-times"></i> Заглавная буква';
        reqElements.upper.style.color = requirements.upper ? 'var(--success)' : 'var(--gray-500)';
    }
    
    if (reqElements.lower) {
        reqElements.lower.innerHTML = requirements.lower 
            ? '<i class="fas fa-check"></i> Строчная буква'
            : '<i class="fas fa-times"></i> Строчная буква';
        reqElements.lower.style.color = requirements.lower ? 'var(--success)' : 'var(--gray-500)';
    }
    
    if (reqElements.number) {
        reqElements.number.innerHTML = requirements.number 
            ? '<i class="fas fa-check"></i> Цифра'
            : '<i class="fas fa-times"></i> Цифра';
        reqElements.number.style.color = requirements.number ? 'var(--success)' : 'var(--gray-500)';
    }
    
    if (reqElements.special) {
        reqElements.special.innerHTML = requirements.special 
            ? '<i class="fas fa-check"></i> Специальный символ (!@#$%^&*)'
            : '<i class="fas fa-times"></i> Специальный символ (!@#$%^&*)';
        reqElements.special.style.color = requirements.special ? 'var(--success)' : 'var(--gray-500)';
    }
    
    // Проверка совпадения паролей
    if (passwordConfirm.length > 0) {
        matchDiv.style.display = 'block';
        if (password === passwordConfirm) {
            matchText.innerHTML = '<i class="fas fa-check" style="color: var(--success);"></i> Пароли совпадают';
            matchText.style.color = 'var(--success)';
        } else {
            matchText.innerHTML = '<i class="fas fa-times" style="color: var(--error);"></i> Пароли не совпадают';
            matchText.style.color = 'var(--error)';
        }
    } else {
        matchDiv.style.display = 'none';
    }
}

// Экспортируем все функции в window для использования в onclick
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleSendOTP = handleSendOTP;
window.handleVerifyOTP = handleVerifyOTP;
window.handleResendOTP = handleResendOTP;
window.goToRegisterStep = goToRegisterStep;
window.handleLogout = handleLogout;
window.handleActivate = handleActivate;
window.handleCreateCargo = handleCreateCargo;
window.handleSaveDriverProfile = handleSaveDriverProfile;
window.handleSaveUserProfile = handleSaveUserProfile;
window.loadUserProfile = loadUserProfile;
window.handleForgotPassword = handleForgotPassword;
window.handleResetPassword = handleResetPassword;
window.acceptOrder = acceptOrder;
window.verifyDriver = verifyDriver;
window.rejectDriver = rejectDriver;
window.switchAdminTab = switchAdminTab;
window.switchAdminUsersPage = switchAdminUsersPage;
window.switchAdminCargosPage = switchAdminCargosPage;
window.deleteCargoAdmin = deleteCargoAdmin;
window.filterCargos = filterCargos;
window.clearCargoFilters = clearCargoFilters;
window.filterAvailableCargos = filterAvailableCargos;
window.clearAvailableFilters = clearAvailableFilters;
window.filterMyOrders = filterMyOrders;
window.clearMyOrdersFilters = clearMyOrdersFilters;
window.calculatePricePerKm = calculatePricePerKm;
window.updateWeightTons = updateWeightTons;
window.updateWeightKg = updateWeightKg;
