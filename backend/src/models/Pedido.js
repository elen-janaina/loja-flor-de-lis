const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Pedido = sequelize.define('Pedido', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  usuario_id: { type: DataTypes.INTEGER, allowNull: false },
  total: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  frete: { type: DataTypes.DECIMAL(10, 2), defaultValue: 10.00 },
  status: {
    type: DataTypes.ENUM('pendente', 'em_preparacao', 'enviado', 'cancelado'),
    defaultValue: 'pendente'
  },
  tipo_pagamento: { type: DataTypes.STRING(50), defaultValue: 'simulado' }
}, { tableName: 'pedidos', timestamps: true });

const ItemPedido = sequelize.define('ItemPedido', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  pedido_id: { type: DataTypes.INTEGER, allowNull: false },
  produto_id: { type: DataTypes.INTEGER, allowNull: false },
  tamanho: { type: DataTypes.STRING(5), allowNull: false },
  quantidade: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
  preco_unitario: { type: DataTypes.DECIMAL(10, 2), allowNull: false }
}, { tableName: 'itens_pedido', timestamps: false });

module.exports = { Pedido, ItemPedido };
