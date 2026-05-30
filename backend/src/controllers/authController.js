const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');

async function registrar(req, res) {
  try {
    const { nome, email, senha, perfil } = req.body;
    if (!nome || !email || !senha) {
      return res.status(400).json({ erro: 'nome, email e senha são obrigatórios.' });
    }
    const existe = await Usuario.findOne({ where: { email } });
    if (existe) return res.status(409).json({ erro: 'E-mail já cadastrado.' });

    const senha_hash = await bcrypt.hash(senha, 10);
    const usuario = await Usuario.create({ nome, email, senha_hash, perfil: perfil || 'cliente' });
    return res.status(201).json({ id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil });
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
}

async function login(req, res) {
  try {
    const { email, senha } = req.body;
    const usuario = await Usuario.findOne({ where: { email } });
    if (!usuario) return res.status(401).json({ erro: 'Credenciais inválidas.' });

    const valido = await bcrypt.compare(senha, usuario.senha_hash);
    if (!valido) return res.status(401).json({ erro: 'Credenciais inválidas.' });

    const token = jwt.sign(
      { id: usuario.id, nome: usuario.nome, perfil: usuario.perfil },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );
    return res.json({ token, perfil: usuario.perfil, nome: usuario.nome });
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
}

module.exports = { registrar, login };
