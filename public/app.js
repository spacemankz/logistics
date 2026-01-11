// Глобальное состояние
let currentUser = null;
let token = localStorage.getItem('token');
let allCargos = [];
let allAvailableCargos = [];
let allMyOrders = [];

// API базовый URL
const API_URL = '/api';

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
    if (token) {
        checkAuth();
    } else {
        showPage('home');
    }
});

// Обновление навбара
function updateNavbar() {
    const navbarMenu = document.getElementById('navbarMenu');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (currentUser) {
        const menuItems = `
            ${currentUser.role === 'shipper' ? `
                <a href="#" onclick="showPage('cargoForm'); return false;">📦 Создать груз</a>
                <a href="#" onclick="showPage('cargoList'); return false;">📋 Мои грузы</a>
            ` : ''}
            ${currentUser.role === 'driver' ? `
                <a href="#" onclick="showPage('driverProfile'); return false;">👤 Профиль</a>
                <a href="#" onclick="showPage('availableCargos'); return false;">🔍 Доступные</a>
                <a href="#" onclick="showPage('myOrders'); return false;">📋 Мои заказы</a>
            ` : ''}
            ${currentUser.role === 'admin' ? `
                <a href="#" onclick="showPage('adminPanel'); return false;">⚙️ Админ-панель</a>
            ` : ''}
            ${!currentUser.isPaid ? `
                <a href="#" onclick="showPage('payment'); return false;">💳 Активировать</a>
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
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Ошибка запроса');
        }
        
        return data;
    } catch (error) {
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
    
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> Регистрация...';
    
    try {
        const data = await apiRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify({
                email: document.getElementById('registerEmail').value,
                password: password,
                role: document.getElementById('registerRole').value
            })
        });
        
        token = data.token;
        localStorage.setItem('token', token);
        currentUser = data.user;
        showPage('payment');
    } catch (error) {
        errorDiv.textContent = error.message;
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
        alert('✅ Аккаунт успешно активирован!');
        showPage('dashboard');
    } catch (error) {
        alert('❌ Ошибка: ' + error.message);
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
        
        alert('✅ Груз успешно создан!');
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
                <div class="empty-state-icon">📦</div>
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
                            <strong style="color: var(--gray-700);">📍 Откуда:</strong>
                            <p style="margin-top: 4px;">${cargo.pickupLocation?.city || ''}, ${cargo.pickupLocation?.address || ''}</p>
                        </div>
                        <div>
                            <strong style="color: var(--gray-700);">🎯 Куда:</strong>
                            <p style="margin-top: 4px;">${cargo.deliveryLocation?.city || ''}, ${cargo.deliveryLocation?.address || ''}</p>
                        </div>
                    </div>
                    <div style="margin-top: 12px; display: flex; gap: 24px; flex-wrap: wrap;">
                        <div>
                            <strong style="color: var(--gray-700); font-size: 13px;">📅 Загрузка:</strong>
                            <span style="margin-left: 8px;">${new Date(cargo.pickupDate).toLocaleDateString('ru-RU')}</span>
                        </div>
                        ${cargo.deliveryDate ? `
                        <div>
                            <strong style="color: var(--gray-700); font-size: 13px;">📅 Доставка:</strong>
                            <span style="margin-left: 8px;">${new Date(cargo.deliveryDate).toLocaleDateString('ru-RU')}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
                
                ${cargo.comment ? `
                <div style="margin-top: 16px; padding: 12px; background: #fef3c7; border-left: 4px solid var(--warning); border-radius: var(--radius);">
                    <strong style="color: var(--gray-700);">💬 Комментарий:</strong>
                    <p style="margin-top: 4px; color: var(--gray-700);">${cargo.comment}</p>
                </div>
                ` : ''}
                
                ${cargo.assignedDriver ? `
                <div class="contact-card" style="margin-top: 16px;">
                    <h4 style="margin-bottom: 12px;">👤 Водитель назначен</h4>
                    <div class="contact-info">
                        <div class="contact-item">
                            <strong>Email:</strong>
                            <span>${cargo.assignedDriver.email}</span>
                        </div>
                        ${cargo.assignedDriver.profile?.phone ? `
                        <div class="contact-item">
                            <strong>Телефон:</strong>
                            <a href="tel:${cargo.assignedDriver.profile.phone}" style="color: white; text-decoration: underline;">
                                ${cargo.assignedDriver.profile.phone}
                            </a>
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
                    <span style="font-size: 32px;">📦</span>
                    <span>Создать груз</span>
                </button>
                <button class="btn btn-secondary" onclick="showPage('cargoList')" style="padding: 24px; flex-direction: column; gap: 12px;">
                    <span style="font-size: 32px;">📋</span>
                    <span>Мои грузы</span>
                </button>
            </div>
        `;
    } else if (currentUser.role === 'driver') {
        content.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-top: 24px;">
                <button class="btn btn-primary" onclick="showPage('driverProfile')" style="padding: 24px; flex-direction: column; gap: 12px;">
                    <span style="font-size: 32px;">👤</span>
                    <span>Мой профиль</span>
                </button>
                <button class="btn btn-secondary" onclick="showPage('availableCargos')" style="padding: 24px; flex-direction: column; gap: 12px;">
                    <span style="font-size: 32px;">🔍</span>
                    <span>Доступные грузы</span>
                </button>
                <button class="btn btn-success" onclick="showPage('myOrders')" style="padding: 24px; flex-direction: column; gap: 12px;">
                    <span style="font-size: 32px;">📋</span>
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
    
    try {
        await apiRequest('/driver/profile', {
            method: 'POST',
            body: JSON.stringify({
                licenseNumber: document.getElementById('driverLicense').value,
                licenseExpiry: document.getElementById('driverLicenseExpiry').value,
                vehicleType: document.getElementById('driverVehicleType').value,
                vehicleNumber: document.getElementById('driverVehicleNumber').value
            })
        });
        
        successDiv.innerHTML = '<strong>✅ Профиль сохранен!</strong> Ожидайте подтверждения администратором.';
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
                <div class="empty-state-icon">📭</div>
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
                            <strong style="color: var(--gray-700);">📍 Откуда:</strong>
                            <p style="margin-top: 4px;">${cargo.pickupLocation?.city || ''}, ${cargo.pickupLocation?.address || ''}</p>
                        </div>
                        <div>
                            <strong style="color: var(--gray-700);">🎯 Куда:</strong>
                            <p style="margin-top: 4px;">${cargo.deliveryLocation?.city || ''}, ${cargo.deliveryLocation?.address || ''}</p>
                        </div>
                    </div>
                    <div style="margin-top: 12px;">
                        <strong style="color: var(--gray-700); font-size: 13px;">📅 Дата загрузки:</strong>
                        <span style="margin-left: 8px;">${new Date(cargo.pickupDate).toLocaleDateString('ru-RU')}</span>
                    </div>
                </div>
                
                ${cargo.comment ? `
                <div style="margin-top: 16px; padding: 12px; background: #fef3c7; border-left: 4px solid var(--warning); border-radius: var(--radius);">
                    <strong style="color: var(--gray-700);">💬 Комментарий:</strong>
                    <p style="margin-top: 4px; color: var(--gray-700);">${cargo.comment}</p>
                </div>
                ` : ''}
                
                ${cargo.shipper ? `
                <div style="margin-top: 16px; padding: 12px; background: var(--gray-100); border-radius: var(--radius);">
                    <strong style="color: var(--gray-700); font-size: 13px;">📧 Грузоотправитель:</strong>
                    <span style="margin-left: 8px;">${cargo.shipper.email}</span>
                </div>
                ` : ''}
                
                <button class="btn btn-success" onclick="acceptOrder(${cargo.id})" style="width: 100%; margin-top: 16px;">
                    ✅ Принять заказ
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
        
        // Получаем полную информацию о грузе с контактами грузоотправителя
        const cargoData = await apiRequest(`/cargo/${cargoId}`);
        const cargo = cargoData.cargo;
        
        // Показываем контактную информацию
        const contactInfo = `
            <div class="contact-card" style="margin-top: 20px;">
                <h4 style="margin-bottom: 16px;">✅ Заказ принят! Контакты грузоотправителя:</h4>
                <div class="contact-info">
                    <div class="contact-item">
                        <strong>📧 Email:</strong>
                        <a href="mailto:${cargo.shipper.email}" style="color: white; text-decoration: underline;">
                            ${cargo.shipper.email}
                        </a>
                    </div>
                    ${cargo.shipper.profile?.phone ? `
                    <div class="contact-item">
                        <strong>📱 Телефон:</strong>
                        <a href="tel:${cargo.shipper.profile.phone}" style="color: white; text-decoration: underline;">
                            ${cargo.shipper.profile.phone}
                        </a>
                    </div>
                    ` : ''}
                    ${cargo.shipper.profile?.company ? `
                    <div class="contact-item">
                        <strong>🏢 Компания:</strong>
                        <span>${cargo.shipper.profile.company}</span>
                    </div>
                    ` : ''}
                    ${cargo.shipper.profile?.firstName || cargo.shipper.profile?.lastName ? `
                    <div class="contact-item">
                        <strong>👤 Контактное лицо:</strong>
                        <span>${cargo.shipper.profile.firstName || ''} ${cargo.shipper.profile.lastName || ''}</span>
                    </div>
                    ` : ''}
                </div>
                <div style="margin-top: 16px; padding: 12px; background: rgba(255,255,255,0.2); border-radius: var(--radius);">
                    <strong>💡 Совет:</strong> Свяжитесь с грузоотправителем для уточнения деталей доставки
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
                <h2 style="margin-bottom: 20px;">✅ Заказ принят!</h2>
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
        alert('❌ Ошибка: ' + error.message);
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
                <div class="empty-state-icon">📭</div>
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
                                <strong style="color: var(--gray-700);">📍 Откуда:</strong>
                                <p style="margin-top: 4px;">${cargo.pickupLocation?.city || ''}, ${cargo.pickupLocation?.address || ''}</p>
                            </div>
                            <div>
                                <strong style="color: var(--gray-700);">🎯 Куда:</strong>
                                <p style="margin-top: 4px;">${cargo.deliveryLocation?.city || ''}, ${cargo.deliveryLocation?.address || ''}</p>
                            </div>
                        </div>
                        <div style="margin-top: 12px; display: flex; gap: 24px; flex-wrap: wrap;">
                            <div>
                                <strong style="color: var(--gray-700); font-size: 13px;">📅 Загрузка:</strong>
                                <span style="margin-left: 8px;">${new Date(cargo.pickupDate).toLocaleDateString('ru-RU')}</span>
                            </div>
                            ${cargo.deliveryDate ? `
                            <div>
                                <strong style="color: var(--gray-700); font-size: 13px;">📅 Доставка:</strong>
                                <span style="margin-left: 8px;">${new Date(cargo.deliveryDate).toLocaleDateString('ru-RU')}</span>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    ${cargo.comment ? `
                    <div style="margin-top: 16px; padding: 12px; background: #fef3c7; border-left: 4px solid var(--warning); border-radius: var(--radius);">
                        <strong style="color: var(--gray-700);">💬 Комментарий:</strong>
                        <p style="margin-top: 4px; color: var(--gray-700);">${cargo.comment}</p>
                    </div>
                    ` : ''}
                    
                    ${cargo.shipper ? `
                    <div class="contact-card" style="margin-top: 16px;">
                        <h4 style="margin-bottom: 12px;">📞 Контакты грузоотправителя</h4>
                        <div class="contact-info">
                            <div class="contact-item">
                                <strong>📧 Email:</strong>
                                <a href="mailto:${cargo.shipper.email}" style="color: white; text-decoration: underline;">
                                    ${cargo.shipper.email}
                                </a>
                            </div>
                            ${cargo.shipper.profile?.phone ? `
                            <div class="contact-item">
                                <strong>📱 Телефон:</strong>
                                <a href="tel:${cargo.shipper.profile.phone}" style="color: white; text-decoration: underline;">
                                    ${cargo.shipper.profile.phone}
                                </a>
                            </div>
                            ` : ''}
                            ${cargo.shipper.profile?.company ? `
                            <div class="contact-item">
                                <strong>🏢 Компания:</strong>
                                <span>${cargo.shipper.profile.company}</span>
                            </div>
                            ` : ''}
                            ${cargo.shipper.profile?.firstName || cargo.shipper.profile?.lastName ? `
                            <div class="contact-item">
                                <strong>👤 Контактное лицо:</strong>
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

// Загрузка админ-панели
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
        
        content.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 32px;">
                <div class="card" style="text-align: center;">
                    <div style="font-size: 32px; margin-bottom: 8px;">👥</div>
                    <div style="font-size: 24px; font-weight: 600; color: var(--primary);">${statsData.totalUsers}</div>
                    <div style="color: var(--gray-600); font-size: 14px;">Всего пользователей</div>
                </div>
                <div class="card" style="text-align: center;">
                    <div style="font-size: 32px; margin-bottom: 8px;">✅</div>
                    <div style="font-size: 24px; font-weight: 600; color: var(--success);">${statsData.paidUsers}</div>
                    <div style="color: var(--gray-600); font-size: 14px;">Оплативших</div>
                </div>
                <div class="card" style="text-align: center;">
                    <div style="font-size: 32px; margin-bottom: 8px;">🚚</div>
                    <div style="font-size: 24px; font-weight: 600; color: var(--primary);">${statsData.totalDrivers}</div>
                    <div style="color: var(--gray-600); font-size: 14px;">Всего водителей</div>
                </div>
                <div class="card" style="text-align: center;">
                    <div style="font-size: 32px; margin-bottom: 8px;">✓</div>
                    <div style="font-size: 24px; font-weight: 600; color: var(--success);">${statsData.verifiedDrivers}</div>
                    <div style="color: var(--gray-600); font-size: 14px;">Подтвержденных</div>
                </div>
                <div class="card" style="text-align: center;">
                    <div style="font-size: 32px; margin-bottom: 8px;">📦</div>
                    <div style="font-size: 24px; font-weight: 600; color: var(--primary);">${statsData.totalCargos}</div>
                    <div style="color: var(--gray-600); font-size: 14px;">Всего грузов</div>
                </div>
                <div class="card" style="text-align: center;">
                    <div style="font-size: 32px; margin-bottom: 8px;">🔄</div>
                    <div style="font-size: 24px; font-weight: 600; color: var(--warning);">${statsData.activeCargos}</div>
                    <div style="color: var(--gray-600); font-size: 14px;">Активных</div>
                </div>
            </div>
            
            <h3 style="margin-bottom: 20px;">Водители на подтверждение</h3>
            ${driversData.drivers.length === 0 ? `
                <div class="empty-state">
                    <div class="empty-state-icon">✅</div>
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
                                    ✓ Подтвердить
                                </button>
                            ` : `
                                <button class="btn btn-danger btn-sm" onclick="rejectDriver(${driver.id})">
                                    ✗ Отклонить
                                </button>
                            `}
                        </div>
                    </div>
                </div>
            `).join('')}
        `;
    } catch (error) {
        document.getElementById('adminContent').innerHTML = 
            `<div class="alert alert-error">${error.message}</div>`;
    }
}

// Подтверждение водителя
async function verifyDriver(driverId) {
    try {
        await apiRequest(`/admin/verify-driver/${driverId}`, {
            method: 'POST'
        });
        alert('✅ Водитель подтвержден!');
        loadAdminPanel();
    } catch (error) {
        alert('❌ Ошибка: ' + error.message);
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
        alert('❌ Ошибка: ' + error.message);
    }
}

// Экспортируем все функции в window для использования в onclick
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleLogout = handleLogout;
window.handleActivate = handleActivate;
window.handleCreateCargo = handleCreateCargo;
window.handleSaveDriverProfile = handleSaveDriverProfile;
window.acceptOrder = acceptOrder;
window.verifyDriver = verifyDriver;
window.rejectDriver = rejectDriver;
window.filterCargos = filterCargos;
window.clearCargoFilters = clearCargoFilters;
window.filterAvailableCargos = filterAvailableCargos;
window.clearAvailableFilters = clearAvailableFilters;
window.filterMyOrders = filterMyOrders;
window.clearMyOrdersFilters = clearMyOrdersFilters;
window.calculatePricePerKm = calculatePricePerKm;
window.updateWeightTons = updateWeightTons;
window.updateWeightKg = updateWeightKg;
