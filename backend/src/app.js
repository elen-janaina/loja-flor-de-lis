require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/produtos', require('./routes/produtos'));
app.use('/api/pedidos', require('./routes/pedidos'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'servidor online' });
});

app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada.' });
});

app.use((err, req, res, next) => {
  res.status(500).json({ erro: 'Erro interno.' });
});

// Conecta ao banco quando importado pelos testes
sequelize.authenticate().catch(err => {
  console.error('Erro ao conectar banco nos testes:', err.message);
});

module.exports = app;