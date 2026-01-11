const { initDatabase, User, Cargo } = require('../models');
const dotenv = require('dotenv');

dotenv.config();

const citiesKZ = [
  { name: 'Алматы', lat: 43.2220, lng: 76.8512 },
  { name: 'Астана', lat: 51.1694, lng: 71.4491 },
  { name: 'Шымкент', lat: 42.3419, lng: 69.5901 },
  { name: 'Караганда', lat: 49.8014, lng: 73.1059 },
  { name: 'Актобе', lat: 50.2833, lng: 57.1667 },
  { name: 'Тараз', lat: 42.9000, lng: 71.3667 },
  { name: 'Павлодар', lat: 52.2833, lng: 76.9667 },
  { name: 'Усть-Каменогорск', lat: 49.9481, lng: 82.6289 }
];

const cargoTypes = ['container', 'pallets', 'bulk', 'liquid', 'fragile', 'perishable', 'general'];
const vehicleTypes = ['open', 'closed'];
const statuses = ['pending', 'assigned', 'in_transit', 'delivered'];

const mockCargos = [
  {
    title: 'Доставка контейнера с оборудованием',
    description: 'Требуется доставка контейнера 20 футов с промышленным оборудованием',
    cargoType: 'container',
    vehicleType: 'closed',
    weightKg: 15000,
    weightTons: 15,
    volume: 33.2,
    totalPrice: 450000,
    pricePerKm: 150,
    distance: 3000,
    comment: 'Требуется аккуратная погрузка и разгрузка. Оборудование хрупкое.',
    status: 'pending'
  },
  {
    title: 'Перевозка паллет с продуктами',
    description: 'Доставка паллет с продуктами питания в супермаркет',
    cargoType: 'pallets',
    vehicleType: 'closed',
    weightKg: 8500,
    weightTons: 8.5,
    volume: 45.5,
    totalPrice: 320000,
    pricePerKm: 120,
    distance: 2667,
    comment: 'Требуется рефрижератор. Температура хранения +2 до +8 градусов.',
    status: 'pending'
  },
  {
    title: 'Транспортировка зерна',
    description: 'Перевозка пшеницы насыпью',
    cargoType: 'bulk',
    vehicleType: 'open',
    weightKg: 25000,
    weightTons: 25,
    volume: 35,
    totalPrice: 280000,
    pricePerKm: 100,
    distance: 2800,
    comment: 'Зерно должно быть сухим. Требуется защита от осадков.',
    status: 'assigned'
  },
  {
    title: 'Доставка строительных материалов',
    description: 'Перевозка цемента и кирпича на строительную площадку',
    cargoType: 'bulk',
    vehicleType: 'open',
    weightKg: 18000,
    weightTons: 18,
    volume: 28,
    totalPrice: 240000,
    pricePerKm: 110,
    distance: 2182,
    comment: 'Цемент в мешках, кирпич на поддонах. Защита от влаги обязательна.',
    status: 'pending'
  },
  {
    title: 'Перевозка мебели',
    description: 'Доставка офисной мебели в новое здание',
    cargoType: 'fragile',
    vehicleType: 'closed',
    weightKg: 3200,
    weightTons: 3.2,
    volume: 25,
    totalPrice: 180000,
    pricePerKm: 130,
    distance: 1385,
    comment: 'Мебель требует аккуратной погрузки. Упаковка в пленку обязательна.',
    status: 'in_transit'
  },
  {
    title: 'Доставка химических реагентов',
    description: 'Транспортировка жидких химических веществ',
    cargoType: 'liquid',
    vehicleType: 'closed',
    weightKg: 12000,
    weightTons: 12,
    volume: 15,
    totalPrice: 380000,
    pricePerKm: 160,
    distance: 2375,
    comment: 'Опасный груз. Требуется специальная лицензия и сопровождение.',
    status: 'pending'
  },
  {
    title: 'Перевозка овощей и фруктов',
    description: 'Доставка свежих овощей и фруктов на рынок',
    cargoType: 'perishable',
    vehicleType: 'closed',
    weightKg: 6500,
    weightTons: 6.5,
    volume: 30,
    totalPrice: 220000,
    pricePerKm: 125,
    distance: 1760,
    comment: 'Требуется рефрижератор. Быстрая доставка в течение 24 часов.',
    status: 'delivered'
  },
  {
    title: 'Транспортировка техники',
    description: 'Перевозка строительной техники',
    cargoType: 'general',
    vehicleType: 'open',
    weightKg: 22000,
    weightTons: 22,
    volume: 50,
    totalPrice: 520000,
    pricePerKm: 180,
    distance: 2889,
    comment: 'Техника на колесах. Требуется низкорамный трал.',
    status: 'pending'
  }
];

const createMocks = async () => {
  try {
    await initDatabase();

    // Создаем тестового грузоотправителя если его нет
    let shipper = await User.findOne({ where: { email: 'shipper@test.kz' } });
    if (!shipper) {
      shipper = await User.create({
        email: 'shipper@test.kz',
        password: 'test123',
        role: 'shipper',
        isPaid: true,
        profile: {
          firstName: 'Тестовый',
          lastName: 'Грузоотправитель',
          company: 'ТОО "Тест Логистик"',
          phone: '+7 777 123 4567'
        }
      });
      console.log('Тестовый грузоотправитель создан: shipper@test.kz / test123');
    }

    // Создаем тестового водителя если его нет
    let driver = await User.findOne({ where: { email: 'driver@test.kz' } });
    if (!driver) {
      driver = await User.create({
        email: 'driver@test.kz',
        password: 'test123',
        role: 'driver',
        isPaid: true,
        profile: {
          firstName: 'Тестовый',
          lastName: 'Водитель',
          phone: '+7 777 765 4321'
        }
      });
      console.log('Тестовый водитель создан: driver@test.kz / test123');
    }

    // Генерируем случайные маршруты для мокапов
    const getRandomCities = () => {
      const from = citiesKZ[Math.floor(Math.random() * citiesKZ.length)];
      let to = citiesKZ[Math.floor(Math.random() * citiesKZ.length)];
      while (to.name === from.name) {
        to = citiesKZ[Math.floor(Math.random() * citiesKZ.length)];
      }
      return { from, to };
    };

    // Создаем мокапы грузов
    const existingCargos = await Cargo.count();
    if (existingCargos === 0) {
      for (let i = 0; i < mockCargos.length; i++) {
        const mock = mockCargos[i];
        const { from, to } = getRandomCities();
        
        // Генерируем даты
        const pickupDate = new Date();
        pickupDate.setDate(pickupDate.getDate() + Math.floor(Math.random() * 30) + 1);
        const deliveryDate = new Date(pickupDate);
        deliveryDate.setDate(deliveryDate.getDate() + Math.floor(Math.random() * 7) + 1);

        await Cargo.create({
          ...mock,
          shipperId: shipper.id,
          pickupLocation: {
            country: 'Казахстан',
            city: from.name,
            address: `ул. Тестовая, ${Math.floor(Math.random() * 100) + 1}`,
            coordinates: { lat: from.lat, lng: from.lng }
          },
          deliveryLocation: {
            country: 'Казахстан',
            city: to.name,
            address: `ул. Доставки, ${Math.floor(Math.random() * 100) + 1}`,
            coordinates: { lat: to.lat, lng: to.lng }
          },
          pickupDate,
          deliveryDate
        });
      }
      console.log(`Создано ${mockCargos.length} тестовых грузов`);
    } else {
      console.log('Грузы уже существуют. Пропуск создания мокапов.');
    }

    console.log('\n✅ Мокапы успешно созданы!');
    console.log('\nТестовые аккаунты:');
    console.log('Грузоотправитель: shipper@test.kz / test123');
    console.log('Водитель: driver@test.kz / test123');
    console.log('Администратор: admin@logistics.com / admin123');
    
    process.exit(0);
  } catch (error) {
    console.error('Ошибка создания мокапов:', error);
    process.exit(1);
  }
};

createMocks();







