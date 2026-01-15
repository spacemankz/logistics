const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Driver = require('../models/Driver');
const User = require('../models/User');
const Cargo = require('../models/Cargo');
const { auth, isPaid } = require('../middleware/auth');

// Создание/обновление профиля водителя
router.post('/profile', [auth, isPaid], [
  body('phone').optional().matches(/^\+?[1-9]\d{1,14}$/).withMessage('Некорректный формат номера телефона'),
  body('phone2').optional().matches(/^\+?[1-9]\d{1,14}$/).withMessage('Некорректный формат второго номера телефона'),
  body('licenseNumber').notEmpty().withMessage('Номер лицензии обязателен'),
  body('licenseExpiry').isISO8601().withMessage('Некорректная дата окончания лицензии'),
  body('vehicleType').isIn(['truck', 'van', 'trailer', 'container']).withMessage('Некорректный тип транспорта'),
  body('vehicleNumber').notEmpty().withMessage('Номер транспорта обязателен')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.user.role !== 'driver') {
      return res.status(403).json({ message: 'Только водители могут создавать профиль' });
    }

    const { sanitizePhone, sanitizeString } = require('../utils/sanitize');
    
    // Обновляем телефоны пользователя, если они указаны
    const updateData = {};
    if (req.body.phone !== undefined) {
      updateData.phone = req.body.phone ? sanitizePhone(req.body.phone) : null;
    }
    if (req.body.phone2 !== undefined) {
      updateData.phone2 = req.body.phone2 ? sanitizePhone(req.body.phone2) : null;
    }
    
    if (Object.keys(updateData).length > 0) {
      await User.update(updateData, { where: { id: req.user.id } });
    }

    // Удаляем phone и phone2 из req.body перед сохранением в Driver
    const { phone, phone2, ...driverData } = req.body;
    
    // Санитизация данных водителя
    if (driverData.licenseNumber) {
      driverData.licenseNumber = sanitizeString(driverData.licenseNumber);
    }
    if (driverData.vehicleNumber) {
      driverData.vehicleNumber = sanitizeString(driverData.vehicleNumber);
    }
    
    // Преобразуем licenseExpiry в Date, если это строка
    if (driverData.licenseExpiry) {
      if (typeof driverData.licenseExpiry === 'string') {
        const expiryDate = new Date(driverData.licenseExpiry);
        if (isNaN(expiryDate.getTime())) {
          return res.status(400).json({ message: 'Некорректная дата окончания лицензии' });
        }
        driverData.licenseExpiry = expiryDate;
      }
    } else {
      return res.status(400).json({ message: 'Дата окончания лицензии обязательна' });
    }

    // Проверяем наличие всех обязательных полей
    if (!driverData.licenseNumber) {
      return res.status(400).json({ message: 'Номер лицензии обязателен' });
    }
    if (!driverData.vehicleType) {
      return res.status(400).json({ message: 'Тип транспорта обязателен' });
    }
    if (!driverData.vehicleNumber) {
      return res.status(400).json({ message: 'Номер транспорта обязателен' });
    }

    let driver = await Driver.findOne({ where: { userId: req.user.id } });

    if (driver) {
      // Обновление существующего профиля
      // Обновляем только переданные поля
      const updateFields = {
        licenseNumber: driverData.licenseNumber,
        licenseExpiry: driverData.licenseExpiry,
        vehicleType: driverData.vehicleType,
        vehicleNumber: driverData.vehicleNumber,
        isVerified: false // Сбрасываем верификацию при обновлении
      };
      
      // Обновляем vehicleCapacity и documents только если они переданы
      if (driverData.vehicleCapacity !== undefined) {
        updateFields.vehicleCapacity = driverData.vehicleCapacity;
      }
      if (driverData.documents !== undefined) {
        updateFields.documents = driverData.documents;
      }
      
      await driver.update(updateFields);
    } else {
      // Создание нового профиля
      driver = await Driver.create({
        licenseNumber: driverData.licenseNumber,
        licenseExpiry: driverData.licenseExpiry,
        vehicleType: driverData.vehicleType,
        vehicleNumber: driverData.vehicleNumber,
        vehicleCapacity: driverData.vehicleCapacity || {},
        documents: driverData.documents || {},
        userId: req.user.id,
        isVerified: false
      });
    }

    await driver.reload({
      include: [
        { model: User, as: 'user', attributes: ['id', 'email', 'phone', 'phone2', 'profile'] }
      ]
    });

    res.json({ driver });
  } catch (error) {
    console.error('Ошибка создания профиля водителя:', error);
    res.status(500).json({ 
      message: 'Ошибка создания профиля водителя',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Получение профиля водителя
router.get('/profile', auth, isPaid, async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({ message: 'Только водители могут просматривать профиль' });
    }

    const driver = await Driver.findOne({
      where: { userId: req.user.id },
      include: [
        { model: User, as: 'user', attributes: ['id', 'email', 'phone', 'phone2', 'profile'] }
      ]
    });

    if (!driver) {
      return res.status(404).json({ message: 'Профиль водителя не найден' });
    }

    res.json({ driver });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка получения профиля' });
  }
});

// Получение заказов водителя
router.get('/orders', auth, isPaid, async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({ message: 'Только водители могут просматривать заказы' });
    }

    const driver = await Driver.findOne({ where: { userId: req.user.id } });
    if (!driver) {
      return res.status(404).json({ message: 'Профиль водителя не найден' });
    }

    const orders = await Cargo.findAll({
      where: { assignedDriverId: req.user.id },
      include: [
        { model: User, as: 'shipper', attributes: ['id', 'email', 'profile'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ orders });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка получения заказов' });
  }
});

// Принятие заказа водителем
router.post('/accept-order/:cargoId', auth, isPaid, async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({ message: 'Только водители могут принимать заказы' });
    }

    const driver = await Driver.findOne({ where: { userId: req.user.id } });
    if (!driver) {
      return res.status(404).json({ 
        message: 'Профиль водителя не найден. Пожалуйста, создайте профиль водителя перед принятием заказов.',
        code: 'DRIVER_PROFILE_NOT_FOUND'
      });
    }

    if (!driver.isVerified) {
      return res.status(403).json({ message: 'Профиль водителя не подтвержден администратором' });
    }

    const cargo = await Cargo.findByPk(req.params.cargoId);
    if (!cargo) {
      return res.status(404).json({ message: 'Груз не найден' });
    }

    if (cargo.status !== 'pending') {
      return res.status(400).json({ message: 'Груз уже назначен или доставлен' });
    }

    await cargo.update({
      assignedDriverId: req.user.id,
      status: 'assigned'
    });

    // Загружаем полную информацию о грузе с данными грузоотправителя
    await cargo.reload({
      include: [
        { model: User, as: 'shipper', attributes: ['id', 'email', 'phone', 'phone2', 'profile'] }
      ]
    });

    res.json({ message: 'Заказ принят', cargo });
  } catch (error) {
    console.error('Ошибка принятия заказа:', error);
    res.status(500).json({ message: 'Ошибка принятия заказа', error: error.message });
  }
});

module.exports = router;

