const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Driver = require('../models/Driver');
const User = require('../models/User');
const Cargo = require('../models/Cargo');
const { auth, isPaid } = require('../middleware/auth');

// Создание/обновление профиля водителя
router.post('/profile', [auth, isPaid], [
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

    let driver = await Driver.findOne({ where: { userId: req.user.id } });

    if (driver) {
      // Обновление существующего профиля
      await driver.update({
        ...req.body,
        isVerified: false // Сбрасываем верификацию при обновлении
      });
    } else {
      // Создание нового профиля
      driver = await Driver.create({
        ...req.body,
        userId: req.user.id
      });
    }

    await driver.reload({
      include: [
        { model: User, as: 'user', attributes: ['id', 'email', 'profile'] }
      ]
    });

    res.json({ driver });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка создания профиля водителя' });
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
        { model: User, as: 'user', attributes: ['id', 'email', 'profile'] }
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
      return res.status(404).json({ message: 'Профиль водителя не найден' });
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
        { model: User, as: 'shipper', attributes: ['id', 'email', 'profile'] }
      ]
    });

    res.json({ message: 'Заказ принят', cargo });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка принятия заказа' });
  }
});

module.exports = router;

