const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OTP = sequelize.define('OTP', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false
  },
  verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'otps',
  indexes: [
    {
      fields: ['email', 'verified']
    },
    {
      fields: ['expiresAt']
    }
  ]
});

// Удаление просроченных OTP
OTP.cleanExpired = async () => {
  await OTP.destroy({
    where: {
      expiresAt: {
        [require('sequelize').Op.lt]: new Date()
      }
    }
  });
};

module.exports = OTP;