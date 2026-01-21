const express = require('express');
const router = express.Router();
const Cargo = require('../models/Cargo');
const User = require('../models/User');
const Driver = require('../models/Driver');
const Review = require('../models/Review');
const { auth, isPaid } = require('../middleware/auth');
const { Op } = require('sequelize');

// История грузов для грузоотправителя
router.get('/cargos', auth, isPaid, async (req, res) => {
  try {
    if (req.user.role !== 'shipper') {
      return res.status(403).json({ message: 'Только грузоотправители могут просматривать историю грузов' });
    }

    const cargos = await Cargo.findAll({
      where: { shipperId: req.user.id },
      include: [
        { 
          model: User, 
          as: 'assignedDriver', 
          attributes: ['id', 'email', 'phone', 'phone2', 'profile']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Добавляем информацию о водителе для каждого груза
    const cargosWithDriverInfo = await Promise.all(cargos.map(async (cargo) => {
      const cargoData = cargo.toJSON();
      if (cargo.assignedDriverId) {
        const driver = await Driver.findOne({ where: { userId: cargo.assignedDriverId } });
        if (driver) {
          cargoData.driverInfo = {
            rating: driver.rating,
            completedOrders: driver.completedOrders,
            vehicleType: driver.vehicleType,
            vehicleNumber: driver.vehicleNumber
          };
        }
      }
      return cargoData;
    }));

    // Получаем отзывы для каждого груза
    const cargosWithReviews = await Promise.all(cargosWithDriverInfo.map(async (cargoData) => {
      const reviews = await Review.findAll({
        where: { cargoId: cargoData.id },
        include: [
          { model: User, as: 'fromUser', attributes: ['id', 'email', 'profile'] },
          { model: User, as: 'toUser', attributes: ['id', 'email', 'profile'] }
        ]
      });

      cargoData.reviews = reviews;
      return cargoData;
    }));

    // Статистика
    const stats = {
      total: cargosWithReviews.length,
      pending: cargosWithReviews.filter(c => c.status === 'pending').length,
      assigned: cargosWithReviews.filter(c => c.status === 'assigned').length,
      in_transit: cargosWithReviews.filter(c => c.status === 'in_transit').length,
      delivered: cargosWithReviews.filter(c => c.status === 'delivered').length,
      cancelled: cargosWithReviews.filter(c => c.status === 'cancelled').length,
      totalValue: cargosWithReviews.reduce((sum, c) => sum + parseFloat(c.totalPrice || 0), 0)
    };

    res.json({ cargos: cargosWithReviews, stats });
  } catch (error) {
    console.error('Ошибка получения истории грузов:', error);
    res.status(500).json({ message: 'Ошибка получения истории грузов' });
  }
});

// История заказов для водителя
router.get('/orders', auth, isPaid, async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({ message: 'Только водители могут просматривать историю заказов' });
    }

    const driver = await Driver.findOne({ where: { userId: req.user.id } });
    if (!driver) {
      return res.status(404).json({ message: 'Профиль водителя не найден' });
    }

    const orders = await Cargo.findAll({
      where: { assignedDriverId: req.user.id },
      include: [
        { 
          model: User, 
          as: 'shipper', 
          attributes: ['id', 'email', 'phone', 'phone2', 'profile'] 
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Получаем отзывы для каждого заказа
    const ordersWithReviews = await Promise.all(orders.map(async (order) => {
      const reviews = await Review.findAll({
        where: { cargoId: order.id },
        include: [
          { model: User, as: 'fromUser', attributes: ['id', 'email', 'profile'] },
          { model: User, as: 'toUser', attributes: ['id', 'email', 'profile'] }
        ]
      });

      const orderData = order.toJSON();
      orderData.reviews = reviews;
      return orderData;
    }));

    // Статистика
    const stats = {
      total: orders.length,
      assigned: orders.filter(o => o.status === 'assigned').length,
      in_transit: orders.filter(o => o.status === 'in_transit').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
      totalEarnings: orders
        .filter(o => o.status === 'delivered')
        .reduce((sum, o) => sum + parseFloat(o.totalPrice || 0), 0),
      averageRating: driver.rating || 0,
      completedOrders: driver.completedOrders || 0
    };

    res.json({ orders: ordersWithReviews, stats });
  } catch (error) {
    console.error('Ошибка получения истории заказов:', error);
    res.status(500).json({ message: 'Ошибка получения истории заказов' });
  }
});

module.exports = router;
