const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Review = require('../models/Review');
const Cargo = require('../models/Cargo');
const Driver = require('../models/Driver');
const User = require('../models/User');
const { auth, isPaid } = require('../middleware/auth');

// Создание отзыва
router.post('/', [auth, isPaid], [
  body('cargoId').isInt().withMessage('ID груза обязателен'),
  body('toUserId').isInt().withMessage('ID получателя обязателен'),
  body('rating').isFloat({ min: 1, max: 5 }).withMessage('Рейтинг должен быть от 1 до 5'),
  body('comment').optional().isString().withMessage('Комментарий должен быть строкой')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { cargoId, toUserId, rating, comment } = req.body;
    const fromUserId = req.user.id;

    // Проверяем, что груз существует и завершен
    const cargo = await Cargo.findByPk(cargoId);
    if (!cargo) {
      return res.status(404).json({ message: 'Груз не найден' });
    }

    if (cargo.status !== 'delivered') {
      return res.status(400).json({ message: 'Отзыв можно оставить только для завершенных заказов' });
    }

    // Проверяем, что пользователь участвовал в заказе
    const isShipper = cargo.shipperId === fromUserId;
    const isDriver = cargo.assignedDriverId === fromUserId;

    if (!isShipper && !isDriver) {
      return res.status(403).json({ message: 'Вы не участвовали в этом заказе' });
    }

    // Проверяем, что получатель отзыва - другая сторона заказа
    const expectedToUserId = isShipper ? cargo.assignedDriverId : cargo.shipperId;
    if (expectedToUserId !== parseInt(toUserId)) {
      return res.status(400).json({ message: 'Некорректный получатель отзыва' });
    }

    // Проверяем, что отзыв еще не оставлен
    const existingReview = await Review.findOne({
      where: { cargoId, fromUserId }
    });

    if (existingReview) {
      return res.status(400).json({ message: 'Вы уже оставили отзыв на этот груз' });
    }

    // Создаем отзыв
    const review = await Review.create({
      cargoId,
      fromUserId,
      toUserId: parseInt(toUserId),
      rating: parseFloat(rating),
      comment: comment || null
    });

    // Пересчитываем рейтинг получателя (если это водитель)
    const toUser = await User.findByPk(toUserId);
    if (toUser && toUser.role === 'driver') {
      await Driver.recalculateRating(toUserId);
    }

    // Загружаем полную информацию об отзыве
    await review.reload({
      include: [
        { model: User, as: 'fromUser', attributes: ['id', 'email', 'profile'] },
        { model: User, as: 'toUser', attributes: ['id', 'email', 'profile'] },
        { model: Cargo, attributes: ['id', 'title'] }
      ]
    });

    res.status(201).json({ review });
  } catch (error) {
    console.error('Ошибка создания отзыва:', error);
    res.status(500).json({ 
      message: 'Ошибка создания отзыва',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Получение отзывов по грузу
router.get('/cargo/:cargoId', auth, async (req, res) => {
  try {
    const reviews = await Review.findAll({
      where: { cargoId: req.params.cargoId },
      include: [
        { model: User, as: 'fromUser', attributes: ['id', 'email', 'profile'] },
        { model: User, as: 'toUser', attributes: ['id', 'email', 'profile'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ reviews });
  } catch (error) {
    console.error('Ошибка получения отзывов:', error);
    res.status(500).json({ message: 'Ошибка получения отзывов' });
  }
});

// Получение всех отзывов пользователя (как получателя)
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const reviews = await Review.findAll({
      where: { toUserId: req.params.userId },
      include: [
        { model: User, as: 'fromUser', attributes: ['id', 'email', 'profile'] },
        { model: Cargo, attributes: ['id', 'title', 'status'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ reviews });
  } catch (error) {
    console.error('Ошибка получения отзывов:', error);
    res.status(500).json({ message: 'Ошибка получения отзывов' });
  }
});

// Обновление отзыва
router.put('/:id', [auth, isPaid], [
  body('rating').optional().isFloat({ min: 1, max: 5 }).withMessage('Рейтинг должен быть от 1 до 5'),
  body('comment').optional().isString().withMessage('Комментарий должен быть строкой')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const review = await Review.findByPk(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Отзыв не найден' });
    }

    // Проверяем, что отзыв принадлежит текущему пользователю
    if (review.fromUserId !== req.user.id) {
      return res.status(403).json({ message: 'Нет доступа к этому отзыву' });
    }

    // Обновляем отзыв
    if (req.body.rating !== undefined) {
      review.rating = parseFloat(req.body.rating);
    }
    if (req.body.comment !== undefined) {
      review.comment = req.body.comment || null;
    }

    await review.save();

    // Пересчитываем рейтинг получателя
    const toUser = await User.findByPk(review.toUserId);
    if (toUser && toUser.role === 'driver') {
      await Driver.recalculateRating(review.toUserId);
    }

    await review.reload({
      include: [
        { model: User, as: 'fromUser', attributes: ['id', 'email', 'profile'] },
        { model: User, as: 'toUser', attributes: ['id', 'email', 'profile'] },
        { model: Cargo, attributes: ['id', 'title'] }
      ]
    });

    res.json({ review });
  } catch (error) {
    console.error('Ошибка обновления отзыва:', error);
    res.status(500).json({ message: 'Ошибка обновления отзыва' });
  }
});

// Удаление отзыва
router.delete('/:id', [auth, isPaid], async (req, res) => {
  try {
    const review = await Review.findByPk(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Отзыв не найден' });
    }

    // Проверяем, что отзыв принадлежит текущему пользователю
    if (review.fromUserId !== req.user.id) {
      return res.status(403).json({ message: 'Нет доступа к этому отзыву' });
    }

    const toUserId = review.toUserId;
    await review.destroy();

    // Пересчитываем рейтинг получателя
    const toUser = await User.findByPk(toUserId);
    if (toUser && toUser.role === 'driver') {
      await Driver.recalculateRating(toUserId);
    }

    res.json({ message: 'Отзыв удален' });
  } catch (error) {
    console.error('Ошибка удаления отзыва:', error);
    res.status(500).json({ message: 'Ошибка удаления отзыва' });
  }
});

module.exports = router;
