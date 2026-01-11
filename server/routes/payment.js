const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// Активация аккаунта (тестовая оплата)
router.post('/activate', auth, async (req, res) => {
  try {
    if (req.user.isPaid) {
      return res.status(400).json({ message: 'Аккаунт уже активирован' });
    }

    // Просто активируем аккаунт без реальной оплаты (для тестирования)
    await User.update(
      {
        isPaid: true,
        paymentDate: new Date(),
        paymentId: `test_${Date.now()}`
      },
      {
        where: { id: req.user.id }
      }
    );

    // Получаем обновленного пользователя
    const updatedUser = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    res.json({
      message: 'Аккаунт успешно активирован',
      user: updatedUser
    });
  } catch (error) {
    console.error('Ошибка активации аккаунта:', error);
    res.status(500).json({ message: 'Ошибка активации аккаунта' });
  }
});

// Проверка статуса оплаты
router.get('/status', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    res.json({ isPaid: user.isPaid, paymentDate: user.paymentDate });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка проверки статуса оплаты' });
  }
});

module.exports = router;







