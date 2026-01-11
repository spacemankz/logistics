const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Cargo = sequelize.define('Cargo', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  shipperId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Вес в килограммах
  weightKg: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  // Вес в тоннах
  weightTons: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: true
  },
  // Объем в м³
  volume: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  // Тип груза (Контейнер, Паллеты, Насыпной и т.д.)
  cargoType: {
    type: DataTypes.STRING,
    defaultValue: 'general',
    validate: {
      isIn: [['container', 'pallets', 'bulk', 'liquid', 'fragile', 'perishable', 'hazardous', 'general']]
    }
  },
  // Тип машины (открытый/закрытый)
  vehicleType: {
    type: DataTypes.STRING,
    defaultValue: 'closed',
    validate: {
      isIn: [['open', 'closed']]
    }
  },
  pickupLocation: {
    type: DataTypes.TEXT,
    defaultValue: '{}',
    get() {
      const value = this.getDataValue('pickupLocation');
      return value ? JSON.parse(value) : {};
    },
    set(value) {
      this.setDataValue('pickupLocation', JSON.stringify(value));
    }
  },
  deliveryLocation: {
    type: DataTypes.TEXT,
    defaultValue: '{}',
    get() {
      const value = this.getDataValue('deliveryLocation');
      return value ? JSON.parse(value) : {};
    },
    set(value) {
      this.setDataValue('deliveryLocation', JSON.stringify(value));
    }
  },
  pickupDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  deliveryDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Общая стоимость в тенге
  totalPrice: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  // Стоимость за 1 км в тенге
  pricePerKm: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  // Расстояние в км
  distance: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  // Комментарий к заказу
  comment: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'pending',
    validate: {
      isIn: [['pending', 'assigned', 'in_transit', 'delivered', 'cancelled']]
    }
  },
  assignedDriverId: {
    type: DataTypes.INTEGER,
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
  tableName: 'cargos'
});

module.exports = Cargo;
