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
  tableName: 'drivers'
});

module.exports = Driver;







