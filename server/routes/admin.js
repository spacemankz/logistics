const express = require('express');
const router = express.Router();
const Driver = require('../models/Driver');
const User = require('../models/User');
const Cargo = require('../models/Cargo');
const { auth, isAdmin } = require('../middleware/auth');
const { Op } = require('sequelize');

// Получение всех водителей для верификации
router.get('/drivers', auth, isAdmin, async (req, res) => {
  try {
    const drivers = await Driver.findAll({
      include: [
        { model: User, as: 'user', attributes: ['id', 'email', 'profile', 'isPaid'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.json({ drivers });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка получения списка водителей' });
  }
});

// Подтверждение профиля водителя
router.post('/verify-driver/:driverId', auth, isAdmin, async (req, res) => {
  try {
    const driver = await Driver.findByPk(req.params.driverId);
    
    if (!driver) {
      return res.status(404).json({ message: 'Профиль водителя не найден' });
    }

    await driver.update({
      isVerified: true,
      verifiedById: req.user.id,
      verifiedAt: new Date()
    });

    await driver.reload();

    res.json({ message: 'Профиль водителя подтвержден', driver });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка подтверждения профиля' });
  }
});

// Отклонение профиля водителя
router.post('/reject-driver/:driverId', auth, isAdmin, async (req, res) => {
  try {
    const driver = await Driver.findByPk(req.params.driverId);
    
    if (!driver) {
      return res.status(404).json({ message: 'Профиль водителя не найден' });
    }

    await driver.update({
      isVerified: false,
      verifiedById: req.user.id
    });

    await driver.reload();

    res.json({ message: 'Профиль водителя отклонен', driver });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка отклонения профиля' });
  }
});

// Получение статистики
router.get('/stats', auth, isAdmin, async (req, res) => {
  try {
    const totalUsers = await User.count();
    const paidUsers = await User.count({ where: { isPaid: true } });
    const totalDrivers = await Driver.count();
    const verifiedDrivers = await Driver.count({ where: { isVerified: true } });
    const totalCargos = await Cargo.count();
    const activeCargos = await Cargo.count({
      where: {
        status: {
          [Op.in]: ['pending', 'assigned', 'in_transit']
        }
      }
    });

    res.json({
      totalUsers,
      paidUsers,
      totalDrivers,
      verifiedDrivers,
      totalCargos,
      activeCargos
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка получения статистики' });
  }
});

module.exports = router;







