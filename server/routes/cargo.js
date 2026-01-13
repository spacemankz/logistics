const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Cargo = require('../models/Cargo');
const User = require('../models/User');
const { auth, isPaid } = require('../middleware/auth');
const { sanitizeString, sanitizeObject } = require('../utils/sanitize');

// Создание груза
router.post('/', [auth, isPaid], [
  body('title').notEmpty().withMessage('Название обязательно'),
  body('weightKg').isNumeric().withMessage('Вес должен быть числом'),
  body('totalPrice').isNumeric().withMessage('Общая стоимость должна быть числом'),
  body('pickupDate').isISO8601().withMessage('Некорректная дата')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.user.role !== 'shipper') {
      return res.status(403).json({ message: 'Только грузоотправители могут создавать грузы' });
    }

    // Автоматический расчет стоимости за 1 км
    const totalPrice = parseFloat(req.body.totalPrice);
    const distance = req.body.distance ? parseFloat(req.body.distance) : null;
    const pricePerKm = (totalPrice && distance && distance > 0) ? (totalPrice / distance) : null;
    
    // Подготовка данных для создания груза
    const cargoData = {
      title: req.body.title,
      description: req.body.description || null,
      cargoType: req.body.cargoType || 'general',
      vehicleType: req.body.vehicleType || 'closed',
      weightKg: parseFloat(req.body.weightKg),
      weightTons: req.body.weightTons ? parseFloat(req.body.weightTons) : (parseFloat(req.body.weightKg) / 1000),
      volume: req.body.volume ? parseFloat(req.body.volume) : null,
      totalPrice: totalPrice,
      pricePerKm: pricePerKm,
      distance: distance,
      comment: req.body.comment || null,
      pickupLocation: req.body.pickupLocation || {},
      deliveryLocation: req.body.deliveryLocation || {},
      pickupDate: req.body.pickupDate,
      deliveryDate: req.body.deliveryDate || null,
      shipperId: req.user.id,
      status: 'pending'
    };

    const cargo = await Cargo.create(cargoData);

    await cargo.reload({
      include: [
        { model: User, as: 'shipper', attributes: ['id', 'email', 'profile'] }
      ]
    });

    res.status(201).json({ cargo });
  } catch (error) {
    console.error('Ошибка создания груза:', error);
    res.status(500).json({ 
      message: 'Ошибка создания груза',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Получение всех грузов пользователя
router.get('/my', auth, isPaid, async (req, res) => {
  try {
    const cargos = await Cargo.findAll({
      where: { shipperId: req.user.id },
      include: [
        { model: User, as: 'assignedDriver', attributes: ['id', 'email', 'phone', 'phone2', 'profile'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.json({ cargos });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка получения грузов' });
  }
});

// Получение всех доступных грузов (для водителей)
router.get('/available', auth, isPaid, async (req, res) => {
  try {
    const cargos = await Cargo.findAll({
      where: { status: 'pending' },
      include: [
        { model: User, as: 'shipper', attributes: ['id', 'email', 'phone', 'phone2', 'profile'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.json({ cargos });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка получения грузов' });
  }
});

// Получение груза по ID
router.get('/:id', auth, isPaid, async (req, res) => {
  try {
    const cargo = await Cargo.findByPk(req.params.id, {
      include: [
        { model: User, as: 'shipper', attributes: ['id', 'email', 'phone', 'phone2', 'profile'] },
        { model: User, as: 'assignedDriver', attributes: ['id', 'email', 'phone', 'phone2', 'profile'] }
      ]
    });
    
    if (!cargo) {
      return res.status(404).json({ message: 'Груз не найден' });
    }

    res.json({ cargo });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка получения груза' });
  }
});

// Обновление груза
router.put('/:id', auth, isPaid, async (req, res) => {
  try {
    const cargo = await Cargo.findByPk(req.params.id);
    
    if (!cargo) {
      return res.status(404).json({ message: 'Груз не найден' });
    }

    if (cargo.shipperId !== req.user.id) {
      return res.status(403).json({ message: 'Нет доступа к этому грузу' });
    }

    await cargo.update(req.body);
    await cargo.reload();

    res.json({ cargo });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка обновления груза' });
  }
});

// Удаление груза
router.delete('/:id', auth, isPaid, async (req, res) => {
  try {
    const cargo = await Cargo.findByPk(req.params.id);
    
    if (!cargo) {
      return res.status(404).json({ message: 'Груз не найден' });
    }

    if (cargo.shipperId !== req.user.id) {
      return res.status(403).json({ message: 'Нет доступа к этому грузу' });
    }

    await cargo.destroy();
    res.json({ message: 'Груз удален' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка удаления груза' });
  }
});

module.exports = router;

