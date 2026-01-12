const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true, // Может быть null для Firebase пользователей
    validate: {
      len: {
        args: [6, 255],
        msg: 'Пароль должен быть от 6 до 255 символов'
      }
    }
  },
  firebaseUid: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  authProvider: {
    type: DataTypes.ENUM('local', 'google', 'firebase'),
    defaultValue: 'local'
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'shipper',
    validate: {
      isIn: [['shipper', 'driver', 'admin']]
    }
  },
  isPaid: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  paymentDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  paymentId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  profile: {
    type: DataTypes.TEXT,
    defaultValue: '{}',
    get() {
      const value = this.getDataValue('profile');
      return value ? JSON.parse(value) : {};
    },
    set(value) {
      this.setDataValue('profile', JSON.stringify(value));
    }
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
  tableName: 'users',
  hooks: {
    beforeCreate: async (user) => {
      if (user.password && user.authProvider === 'local') {
        user.password = await bcrypt.hash(user.password, 10);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password') && user.password && user.authProvider === 'local') {
        user.password = await bcrypt.hash(user.password, 10);
      }
    }
  }
});

User.prototype.comparePassword = async function(candidatePassword) {
  if (!this.password) {
    return false;
  }
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = User;







