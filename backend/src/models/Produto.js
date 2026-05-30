const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Produto = sequelize.define('Produto', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nome: { type: DataTypes.STRING(150), allowNull: false },
  descricao: { type: DataTypes.TEXT },
  preco: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0.01 } },
  imagem_url: { type: DataTypes.STRING(500) },
  tamanhos: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'P,M,G,GG' },
  categoria: { type: DataTypes.STRING(80), defaultValue: 'Geral' },
  ativo: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'produtos', timestamps: true });

module.exports = Produto;
