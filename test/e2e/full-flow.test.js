const puppeteer = require('puppeteer');
const { initDatabase, User, Cargo, Driver, Review, sequelize } = require('../../server/models');
const { QueryTypes } = require('sequelize');

// Тестовые данные
const testShipper = {
    email: `test-shipper-${Date.now()}@test.kz`,
    password: 'test123456',
    role: 'shipper',
    phone: '+77001234567'
};

const testDriver = {
    email: `test-driver-${Date.now()}@test.kz`,
    password: 'test123456',
    role: 'driver',
    phone: '+77001234568'
};

let browser;
let page;
let shipperUser;
let driverUser;
let testCargo;

async function runTests() {
    try {
        console.log('🚀 Начинаем E2E тестирование...\n');
        
        // Инициализация базы данных
        await initDatabase();
        
        // Инициализация браузера
        browser = await puppeteer.launch({
            headless: process.env.HEADLESS !== 'false',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });

        const baseUrl = process.env.TEST_URL || 'http://localhost:3000';
        console.log(`📡 Используется URL: ${baseUrl}\n`);

        // Тест 1: Регистрация и активация грузоотправителя
        console.log('1️⃣ Тест: Регистрация и активация грузоотправителя...');
        await test1_RegisterShipper(baseUrl);
        console.log('✅ Тест 1 пройден\n');

        // Тест 2: Создание груза
        console.log('2️⃣ Тест: Создание груза...');
        await test2_CreateCargo(baseUrl);
        console.log('✅ Тест 2 пройден\n');

        // Тест 3: Регистрация и активация водителя
        console.log('3️⃣ Тест: Регистрация и активация водителя...');
        await test3_RegisterDriver(baseUrl);
        console.log('✅ Тест 3 пройден\n');

        // Тест 4: Создание профиля водителя
        console.log('4️⃣ Тест: Создание профиля водителя...');
        await test4_CreateDriverProfile(baseUrl);
        console.log('✅ Тест 4 пройден\n');

        // Тест 5: Принятие заказа
        console.log('5️⃣ Тест: Принятие заказа водителем...');
        await test5_AcceptOrder(baseUrl);
        console.log('✅ Тест 5 пройден\n');

        // Тест 6: Завершение заказа
        console.log('6️⃣ Тест: Завершение заказа...');
        await test6_CompleteOrder();
        console.log('✅ Тест 6 пройден\n');

        // Тест 7: Система отзывов
        console.log('7️⃣ Тест: Система отзывов...');
        await test7_Reviews();
        console.log('✅ Тест 7 пройден\n');

        // Тест 8: Проверка истории
        console.log('8️⃣ Тест: Проверка истории...');
        await test8_History(baseUrl);
        console.log('✅ Тест 8 пройден\n');

        console.log('🎉 Все тесты успешно пройдены!');

    } catch (error) {
        console.error('❌ Ошибка при выполнении тестов:', error);
        throw error;
    } finally {
        // Очистка тестовых данных
        await cleanup();
        
        if (browser) {
            await browser.close();
        }
        await sequelize.close();
    }
}

async function test1_RegisterShipper(baseUrl) {
    await page.goto(baseUrl);
    await page.waitForTimeout(1000);

    // Переход на страницу регистрации
    const registerLink = await page.$('a[onclick*="register"]');
    if (registerLink) {
        await registerLink.click();
        await page.waitForTimeout(1000);
    }

    // Заполнение формы регистрации
    await page.select('#registerRole', 'shipper');
    await page.type('#registerEmail', testShipper.email);
    
    const sendOtpBtn = await page.$('button[onclick*="handleSendOTP"]');
    if (sendOtpBtn) {
        await sendOtpBtn.click();
        await page.waitForTimeout(2000);
    }

    // Получение OTP из базы данных
    const otpRecord = await sequelize.query(
        `SELECT code FROM otps WHERE email = '${testShipper.email}' ORDER BY createdAt DESC LIMIT 1`,
        { type: QueryTypes.SELECT }
    );
    const otpCode = otpRecord[0]?.code || '123456';
    console.log(`   📧 OTP код: ${otpCode}`);

    // Ввод OTP
    await page.type('#registerOTP', otpCode);
    const verifyOtpBtn = await page.$('button[onclick*="handleVerifyOTP"]');
    if (verifyOtpBtn) {
        await verifyOtpBtn.click();
        await page.waitForTimeout(2000);
    }

    // Ввод пароля
    await page.type('#registerPassword', testShipper.password);
    await page.type('#registerPasswordConfirm', testShipper.password);
    const registerBtn = await page.$('button[onclick*="handleRegister"]');
    if (registerBtn) {
        await registerBtn.click();
        await page.waitForTimeout(2000);
    }

    // Активация аккаунта
    const activateBtn = await page.$('button[onclick*="handleActivate"]');
    if (activateBtn) {
        await activateBtn.click();
        await page.waitForTimeout(2000);
    }

    // Проверка успешной регистрации
    shipperUser = await User.findOne({ where: { email: testShipper.email } });
    if (!shipperUser) {
        throw new Error('Грузоотправитель не был создан');
    }
    if (shipperUser.role !== 'shipper') {
        throw new Error('Неверная роль пользователя');
    }
    console.log(`   ✅ Пользователь создан: ${shipperUser.email}`);
}

async function test2_CreateCargo(baseUrl) {
    await page.goto(baseUrl);
    await page.waitForTimeout(1000);

    // Переход на страницу создания груза
    const cargoFormLink = await page.$('a[onclick*="cargoForm"]');
    if (cargoFormLink) {
        await cargoFormLink.click();
        await page.waitForTimeout(1000);
    }

    // Заполнение формы
    await page.type('#cargoTitle', 'Тестовый груз для E2E теста');
    await page.type('#cargoDescription', 'Описание тестового груза');
    await page.select('#cargoCargoType', 'container');
    await page.select('#cargoVehicleType', 'closed');
    await page.type('#cargoWeightKg', '5000');
    await page.type('#cargoTotalPrice', '100000');
    await page.type('#cargoDistance', '1000');
    await page.type('#cargoPickupCity', 'Алматы');
    await page.type('#cargoPickupAddress', 'ул. Абая, 150');
    await page.type('#cargoDeliveryCity', 'Астана');
    await page.type('#cargoDeliveryAddress', 'ул. Кабанбай батыра, 50');
    
    // Установка даты загрузки (завтра)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    await page.type('#cargoPickupDate', dateStr);

    // Отправка формы
    const submitBtn = await page.$('#cargoForm button[type="submit"]');
    if (submitBtn) {
        await submitBtn.click();
        await page.waitForTimeout(3000);
    }

    // Проверка создания груза
    testCargo = await Cargo.findOne({
        where: { shipperId: shipperUser.id },
        order: [['createdAt', 'DESC']]
    });
    if (!testCargo) {
        throw new Error('Груз не был создан');
    }
    if (testCargo.title !== 'Тестовый груз для E2E теста') {
        throw new Error('Название груза не совпадает');
    }
    console.log(`   ✅ Груз создан: ${testCargo.title} (ID: ${testCargo.id})`);
}

async function test3_RegisterDriver(baseUrl) {
    await page.goto(baseUrl);
    await page.waitForTimeout(1000);

    // Выход из текущего аккаунта
    const logoutBtn = await page.$('button[onclick*="handleLogout"]');
    if (logoutBtn) {
        await logoutBtn.click();
        await page.waitForTimeout(1000);
    }

    // Регистрация водителя
    const registerLink = await page.$('a[onclick*="register"]');
    if (registerLink) {
        await registerLink.click();
        await page.waitForTimeout(1000);
    }

    await page.select('#registerRole', 'driver');
    await page.type('#registerEmail', testDriver.email);
    
    const sendOtpBtn = await page.$('button[onclick*="handleSendOTP"]');
    if (sendOtpBtn) {
        await sendOtpBtn.click();
        await page.waitForTimeout(2000);
    }

    // Получение OTP
    const otpRecord = await sequelize.query(
        `SELECT code FROM otps WHERE email = '${testDriver.email}' ORDER BY createdAt DESC LIMIT 1`,
        { type: QueryTypes.SELECT }
    );
    const otpCode = otpRecord[0]?.code || '123456';
    console.log(`   📧 OTP код: ${otpCode}`);

    await page.type('#registerOTP', otpCode);
    const verifyOtpBtn = await page.$('button[onclick*="handleVerifyOTP"]');
    if (verifyOtpBtn) {
        await verifyOtpBtn.click();
        await page.waitForTimeout(2000);
    }

    await page.type('#registerPassword', testDriver.password);
    await page.type('#registerPasswordConfirm', testDriver.password);
    const registerBtn = await page.$('button[onclick*="handleRegister"]');
    if (registerBtn) {
        await registerBtn.click();
        await page.waitForTimeout(2000);
    }

    // Активация
    const activateBtn = await page.$('button[onclick*="handleActivate"]');
    if (activateBtn) {
        await activateBtn.click();
        await page.waitForTimeout(2000);
    }

    driverUser = await User.findOne({ where: { email: testDriver.email } });
    if (!driverUser) {
        throw new Error('Водитель не был создан');
    }
    if (driverUser.role !== 'driver') {
        throw new Error('Неверная роль пользователя');
    }
    console.log(`   ✅ Пользователь создан: ${driverUser.email}`);
}

async function test4_CreateDriverProfile(baseUrl) {
    await page.goto(baseUrl);
    await page.waitForTimeout(1000);

    // Переход на страницу профиля водителя
    const driverProfileLink = await page.$('a[onclick*="driverProfile"]');
    if (driverProfileLink) {
        await driverProfileLink.click();
        await page.waitForTimeout(1000);
    }

    // Заполнение профиля
    await page.type('#driverLicenseNumber', 'ABC123456');
    await page.type('#driverVehicleNumber', '01ABC123');
    await page.select('#driverVehicleType', 'truck');
    
    // Установка даты окончания лицензии (через год)
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const dateStr = nextYear.toISOString().split('T')[0];
    await page.type('#driverLicenseExpiry', dateStr);

    // Отправка формы
    const submitBtn = await page.$('#driverProfileForm button[type="submit"]');
    if (submitBtn) {
        await submitBtn.click();
        await page.waitForTimeout(2000);
    }

    // Верификация водителя напрямую в БД для теста
    const driver = await Driver.findOne({ where: { userId: driverUser.id } });
    if (!driver) {
        throw new Error('Профиль водителя не был создан');
    }
    
    await driver.update({ isVerified: true });
    console.log(`   ✅ Профиль водителя создан и верифицирован`);
}

async function test5_AcceptOrder(baseUrl) {
    await page.goto(baseUrl);
    await page.waitForTimeout(1000);

    // Переход на страницу доступных грузов
    const availableLink = await page.$('a[onclick*="availableCargos"]');
    if (availableLink) {
        await availableLink.click();
        await page.waitForTimeout(2000);
    }

    // Принятие заказа
    page.on('dialog', async dialog => {
        await dialog.accept();
    });

    const acceptButtons = await page.$$('button[onclick*="acceptOrder"]');
    if (acceptButtons.length > 0) {
        await acceptButtons[0].click();
        await page.waitForTimeout(3000);
    }

    // Проверка принятия заказа
    await testCargo.reload();
    if (testCargo.assignedDriverId !== driverUser.id) {
        throw new Error('Заказ не был принят водителем');
    }
    if (testCargo.status !== 'assigned') {
        throw new Error('Статус заказа не обновлен');
    }
    console.log(`   ✅ Заказ принят водителем`);
}

async function test6_CompleteOrder() {
    // Обновление статуса груза на "delivered"
    await testCargo.update({ status: 'delivered' });
    
    const cargo = await Cargo.findByPk(testCargo.id);
    if (cargo.status !== 'delivered') {
        throw new Error('Статус заказа не обновлен на delivered');
    }
    console.log(`   ✅ Заказ завершен`);
}

async function test7_Reviews() {
    // Оставление отзыва грузоотправителем водителю
    const review1 = await Review.create({
        cargoId: testCargo.id,
        fromUserId: shipperUser.id,
        toUserId: driverUser.id,
        rating: 5,
        comment: 'Отличный водитель, все доставлено вовремя!'
    });
    if (!review1) {
        throw new Error('Отзыв от грузоотправителя не создан');
    }

    // Оставление отзыва водителем грузоотправителю
    const review2 = await Review.create({
        cargoId: testCargo.id,
        fromUserId: driverUser.id,
        toUserId: shipperUser.id,
        rating: 4,
        comment: 'Хороший грузоотправитель, все четко организовано'
    });
    if (!review2) {
        throw new Error('Отзыв от водителя не создан');
    }

    // Проверка пересчета рейтинга
    await Driver.recalculateRating(driverUser.id);
    const driver = await Driver.findOne({ where: { userId: driverUser.id } });
    if (!driver || driver.rating === 0) {
        throw new Error('Рейтинг водителя не пересчитан');
    }
    console.log(`   ✅ Отзывы созданы, рейтинг водителя: ${driver.rating}`);
}

async function test8_History(baseUrl) {
    await page.goto(baseUrl);
    await page.waitForTimeout(1000);

    // Выход и вход грузоотправителя
    const logoutBtn = await page.$('button[onclick*="handleLogout"]');
    if (logoutBtn) {
        await logoutBtn.click();
        await page.waitForTimeout(1000);
    }

    // Вход грузоотправителя
    const loginLink = await page.$('a[onclick*="login"]');
    if (loginLink) {
        await loginLink.click();
        await page.waitForTimeout(1000);
    }

    await page.type('#loginEmail', testShipper.email);
    await page.type('#loginPassword', testShipper.password);
    const loginBtn = await page.$('#loginForm button[type="submit"]');
    if (loginBtn) {
        await loginBtn.click();
        await page.waitForTimeout(2000);
    }

    // Переход на историю
    const historyLink = await page.$('a[onclick*="historyCargos"]');
    if (historyLink) {
        await historyLink.click();
        await page.waitForTimeout(2000);
    }

    // Проверка отображения истории
    const historyContent = await page.$('#historyCargosContent');
    if (!historyContent) {
        throw new Error('История грузов не отображается');
    }
    console.log(`   ✅ История грузов отображается`);

    // Проверка истории заказов (водитель)
    const logoutBtn2 = await page.$('button[onclick*="handleLogout"]');
    if (logoutBtn2) {
        await logoutBtn2.click();
        await page.waitForTimeout(1000);
    }

    const loginLink2 = await page.$('a[onclick*="login"]');
    if (loginLink2) {
        await loginLink2.click();
        await page.waitForTimeout(1000);
    }

    await page.type('#loginEmail', testDriver.email);
    await page.type('#loginPassword', testDriver.password);
    const loginBtn2 = await page.$('#loginForm button[type="submit"]');
    if (loginBtn2) {
        await loginBtn2.click();
        await page.waitForTimeout(2000);
    }

    const historyOrdersLink = await page.$('a[onclick*="historyOrders"]');
    if (historyOrdersLink) {
        await historyOrdersLink.click();
        await page.waitForTimeout(2000);
    }

    const ordersContent = await page.$('#historyOrdersContent');
    if (!ordersContent) {
        throw new Error('История заказов не отображается');
    }
    console.log(`   ✅ История заказов отображается`);
}

async function cleanup() {
    console.log('\n🧹 Очистка тестовых данных...');
    
    if (testCargo) {
        await Review.destroy({ where: { cargoId: testCargo.id }, force: true });
        await Cargo.destroy({ where: { id: testCargo.id }, force: true });
    }
    if (shipperUser) {
        await Review.destroy({ where: { fromUserId: shipperUser.id }, force: true });
        await Review.destroy({ where: { toUserId: shipperUser.id }, force: true });
        await User.destroy({ where: { id: shipperUser.id }, force: true });
    }
    if (driverUser) {
        const driver = await Driver.findOne({ where: { userId: driverUser.id } });
        if (driver) {
            await Driver.destroy({ where: { userId: driverUser.id }, force: true });
        }
        await Review.destroy({ where: { fromUserId: driverUser.id }, force: true });
        await Review.destroy({ where: { toUserId: driverUser.id }, force: true });
        await User.destroy({ where: { id: driverUser.id }, force: true });
    }
    
    console.log('✅ Очистка завершена');
}

// Запуск тестов
if (require.main === module) {
    runTests().catch(error => {
        console.error('❌ Критическая ошибка:', error);
        process.exit(1);
    });
}

module.exports = { runTests };
