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
    
    // Активные пользователи (входили за последние 30 дней)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeUsers = await User.count({
      where: {
        lastLogin: {
          [Op.gte]: thirtyDaysAgo
        }
      }
    });

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
      activeUsers,
      totalDrivers,
      verifiedDrivers,
      totalCargos,
      activeCargos
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка получения статистики' });
  }
});

// Получение всех пользователей
router.get('/users', auth, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, role, isPaid } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (role) where.role = role;
    if (isPaid !== undefined) where.isPaid = isPaid === 'true';

    const { count, rows: users } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      users,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка получения пользователей' });
  }
});

// Получение всех грузов
router.get('/cargos', auth, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, status, cargoType } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;
    if (cargoType) where.cargoType = cargoType;

    const { count, rows: cargos } = await Cargo.findAndCountAll({
      where,
      include: [
        { model: User, as: 'shipper', attributes: ['id', 'email', 'profile'] },
        { model: User, as: 'assignedDriver', attributes: ['id', 'email', 'profile'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      cargos,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка получения грузов' });
  }
});

// Удаление груза (модерация)
router.delete('/cargos/:id', auth, isAdmin, async (req, res) => {
  try {
    const cargo = await Cargo.findByPk(req.params.id);
    
    if (!cargo) {
      return res.status(404).json({ message: 'Груз не найден' });
    }

    await cargo.destroy();
    res.json({ message: 'Груз удален' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка удаления груза' });
  }
});

// Редактирование груза (модерация)
router.put('/cargos/:id', auth, isAdmin, async (req, res) => {
  try {
    const cargo = await Cargo.findByPk(req.params.id);
    
    if (!cargo) {
      return res.status(404).json({ message: 'Груз не найден' });
    }

    await cargo.update(req.body);
    await cargo.reload({
      include: [
        { model: User, as: 'shipper', attributes: ['id', 'email', 'profile'] },
        { model: User, as: 'assignedDriver', attributes: ['id', 'email', 'profile'] }
      ]
    });

    res.json({ cargo });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка обновления груза' });
  }
});

module.exports = router;







