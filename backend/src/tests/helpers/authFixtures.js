const crypto = require('crypto');

// Isola os testes da configuração JWT de produção sem registrar segredo fixo no repositório.
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
}

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Usuario } = require('../../models');

async function criarUsuarioComToken(perfil) {
  const identificador = crypto.randomBytes(16).toString('hex');
  const senhaDescartavel = crypto.randomBytes(32).toString('hex');
  const nome = `Usuário de teste ${perfil}`;
  const email = `teste-${perfil}-${identificador}@example.com`;
  const usuario = await Usuario.create({
    nome,
    email,
    senha_hash: await bcrypt.hash(senhaDescartavel, 12),
    perfil
  });

  const token = jwt.sign(
    { id: usuario.id, nome: usuario.nome, perfil: usuario.perfil },
    process.env.JWT_SECRET,
    { expiresIn: '5m' }
  );

  return { usuario, token };
}

async function removerUsuario(id) {
  await Usuario.destroy({ where: { id } });
}

module.exports = { criarUsuarioComToken, removerUsuario };
