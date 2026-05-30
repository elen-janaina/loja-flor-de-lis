const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Usuario = sequelize.define('Usuario', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nome: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(150), allowNull: false, unique: true, validate: { isEmail: true } },
  senha_hash: { type: DataTypes.STRING(255), allowNull: false },
  perfil: {
    type: DataTypes.ENUM('administrador', 'cliente', 'vendedor'),
    allowNull: false,
    defaultValue: 'cliente'
  }
}, { tableName: 'usuarios', timestamps: true });

module.exports = Usuario;
