const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Driver = sequelize.define('Driver', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true
  },
  licenseNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  licenseExpiry: {
    type: DataTypes.DATE,
    allowNull: false
  },
  vehicleType: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['truck', 'van', 'trailer', 'container']]
    }
  },
  vehicleCapacity: {
    type: DataTypes.TEXT,
    defaultValue: '{}',
    get() {
      const value = this.getDataValue('vehicleCapacity');
      return value ? JSON.parse(value) : {};
    },
    set(value) {
      this.setDataValue('vehicleCapacity', JSON.stringify(value));
    }
  },
  vehicleNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  documents: {
    type: DataTypes.TEXT,
    defaultValue: '{}',
    get() {
      const value = this.getDataValue('documents');
      return value ? JSON.parse(value) : {};
    },
    set(value) {
      this.setDataValue('documents', JSON.stringify(value));
    }
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  verifiedById: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  verifiedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  rating: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0,
    validate: {
      min: 0,
      max: 5
    }
  },
  completedOrders: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'drivers',
  hooks: {
    afterUpdate: async (driver) => {
      // Хук для автоматического пересчета рейтинга будет вызываться из routes/reviews.js
    }
  }
});

// Метод для пересчета рейтинга водителя
Driver.recalculateRating = async function(userId) {
  const Review = require('./Review');
  const { Op } = require('sequelize');
  
  const driver = await Driver.findOne({ where: { userId } });
  if (!driver) return;
  
  // Получаем все отзывы для этого водителя
  const reviews = await Review.findAll({
    where: { toUserId: userId }
  });
  
  if (reviews.length === 0) {
    await driver.update({ rating: 0 });
    return;
  }
  
  // Вычисляем средний рейтинг
  const totalRating = reviews.reduce((sum, review) => sum + parseFloat(review.rating), 0);
  const averageRating = (totalRating / reviews.length).toFixed(2);
  
  await driver.update({ 
    rating: parseFloat(averageRating),
    completedOrders: reviews.length
  });
};

module.exports = Driver;







