const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');

// Regra de senha forte: mínimo 8 caracteres, pelo menos 1 letra e 1 número
function senhaForte(senha) {
  return typeof senha === 'string'
    && senha.length >= 8
    && /[a-zA-Z]/.test(senha)
    && /[0-9]/.test(senha);
}

function emailValido(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function registrar(req, res) {
  try {
    const { nome, email, senha } = req.body;
    // perfil NUNCA vem do corpo da requisição pública — sempre 'cliente'
    const perfil = 'cliente';

    if (!nome || !email || !senha) {
      return res.status(400).json({ erro: 'nome, email e senha são obrigatórios.' });
    }
    if (!emailValido(email)) {
      return res.status(400).json({ erro: 'E-mail inválido.' });
    }
    if (!senhaForte(senha)) {
      return res.status(400).json({ erro: 'A senha deve ter no mínimo 8 caracteres, incluindo letras e números.' });
    }

    const existe = await Usuario.findOne({ where: { email: email.toLowerCase().trim() } });
    if (existe) return res.status(409).json({ erro: 'E-mail já cadastrado.' });

    const senha_hash = await bcrypt.hash(senha, 12);
    const usuario = await Usuario.create({
      nome: nome.trim(),
      email: email.toLowerCase().trim(),
      senha_hash,
      perfil
    });

    return res.status(201).json({ id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil });
  } catch (err) {
    console.error('Erro ao registrar usuário:', err);
    return res.status(500).json({ erro: 'Não foi possível concluir o cadastro. Tente novamente.' });
  }
}

async function login(req, res) {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ erro: 'E-mail e senha são obrigatórios.' });
    }

    const usuario = await Usuario.findOne({ where: { email: email.toLowerCase().trim() } });

    // Mensagem idêntica para "não existe" e "senha errada" — evita vazar quais e-mails têm conta
    if (!usuario) {
      // Executa um hash "fake" para gastar tempo semelhante e dificultar timing attack
      await bcrypt.compare(senha, '$2a$12$invalidinvalidinvalidinvalidinvalidinva');
      return res.status(401).json({ erro: 'Credenciais inválidas.' });
    }

    const valido = await bcrypt.compare(senha, usuario.senha_hash);
    if (!valido) return res.status(401).json({ erro: 'Credenciais inválidas.' });

    const token = jwt.sign(
      { id: usuario.id, nome: usuario.nome, perfil: usuario.perfil },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );
    return res.json({ token, perfil: usuario.perfil, nome: usuario.nome });
  } catch (err) {
    console.error('Erro ao fazer login:', err);
    return res.status(500).json({ erro: 'Não foi possível concluir o login. Tente novamente.' });
  }
}

module.exports = { registrar, login };
