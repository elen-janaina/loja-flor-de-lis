// app.js - Configuração do Express separada do servidor
// Esse arquivo é importado pelos testes automatizados

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Rotas da API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/produtos', require('./routes/produtos'));
app.use('/api/pedidos', require('./routes/pedidos'));

// Rota de saúde do servidor
app.get('/api/health', (req, res) => {
  res.json({ status: 'servidor online', horario: new Date() });
});

// Rota não encontrada
app.use((req, res) => {
  res.status(404).json({ erro: 'Essa rota não foi encontrada.' });
});

// Tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro no servidor:', err);
  res.status(500).json({ erro: 'Houve um erro interno no servidor.' });
});

module.exports = app;
