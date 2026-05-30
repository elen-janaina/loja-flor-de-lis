const sequelize = require('../config/database');
const Usuario = require('./Usuario');
const Produto = require('./Produto');
const Estoque = require('./Estoque');
const { Pedido, ItemPedido } = require('./Pedido');

// Associations
Usuario.hasMany(Pedido, { foreignKey: 'usuario_id', as: 'pedidos' });
Pedido.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'cliente' });

Pedido.hasMany(ItemPedido, { foreignKey: 'pedido_id', as: 'itens' });
ItemPedido.belongsTo(Pedido, { foreignKey: 'pedido_id' });

Produto.hasMany(ItemPedido, { foreignKey: 'produto_id' });
ItemPedido.belongsTo(Produto, { foreignKey: 'produto_id', as: 'produto' });

Produto.hasMany(Estoque, { foreignKey: 'produto_id', as: 'estoques' });
Estoque.belongsTo(Produto, { foreignKey: 'produto_id' });

module.exports = { sequelize, Usuario, Produto, Estoque, Pedido, ItemPedido };
