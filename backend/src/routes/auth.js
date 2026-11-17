const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { registrar, login } = require('../controllers/authController');

// Limita tentativas de login: 5 por IP a cada 15 minutos
const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Muitas tentativas de login. Tente novamente em alguns minutos.' }
});

// Limita cadastros: 10 por IP a cada hora (evita spam de contas)
const limiteRegistro = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Muitas tentativas de cadastro. Tente novamente mais tarde.' }
});

router.post('/registrar', limiteRegistro, registrar);
router.post('/login', limiteLogin, login);

module.exports = router;
