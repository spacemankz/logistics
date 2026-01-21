const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Review = sequelize.define('Review', {
  id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true 
  },
  cargoId: { 
    type: DataTypes.INTEGER, 
    allowNull: false 
  },
  fromUserId: { 
    type: DataTypes.INTEGER, 
    allowNull: false 
  },
  toUserId: { 
    type: DataTypes.INTEGER, 
    allowNull: false 
  },
  rating: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: false,
    validate: { min: 1, max: 5 }
  },
  comment: { 
    type: DataTypes.TEXT, 
    allowNull: true 
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
  tableName: 'reviews',
  indexes: [
    { fields: ['cargoId'] },
    { fields: ['fromUserId'] },
    { fields: ['toUserId'] },
    { unique: true, fields: ['cargoId', 'fromUserId'] } // Один отзыв от пользователя на груз
  ]
});

module.exports = Review;
