const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Estoque = sequelize.define('Estoque', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  produto_id: { type: DataTypes.INTEGER, allowNull: false },
  tamanho: { type: DataTypes.STRING(5), allowNull: false },
  quantidade_disponivel: { type: DataTypes.INTEGER, defaultValue: 0, allowNull: false }
}, { tableName: 'estoque', timestamps: true });

module.exports = Estoque;
