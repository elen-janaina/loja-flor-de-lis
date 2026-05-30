const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'loja_roupas',
  process.env.DB_USER || 'loja_user',
  process.env.DB_PASS || 'loja_pass',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 }
  }
);

module.exports = sequelize;
