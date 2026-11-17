// Testes de Autenticação - Login e Cadastro
const crypto = require('crypto');
const request = require('supertest');
require('./helpers/authFixtures');
const app = require('../app');
const { Usuario } = require('../models');

const usuarioTeste = {
  nome: 'Usuario Teste',
  email: 'teste_jest_auth@email.com',
  senha: crypto.randomBytes(16).toString('hex'),
  perfil: 'cliente'
};
beforeAll(async () => {
  await Usuario.destroy({ where: { email: usuarioTeste.email } });
});

afterAll(async () => {
  await Usuario.destroy({ where: { email: usuarioTeste.email } });
});

describe('Cadastro de usuário', () => {

  test('deve cadastrar um novo usuário com sucesso', async () => {
    const resposta = await request(app)
      .post('/api/auth/registrar')
      .send(usuarioTeste);

    expect(resposta.status).toBe(201);
    expect(resposta.body).toHaveProperty('id');
    expect(resposta.body.email).toBe(usuarioTeste.email);
    expect(resposta.body.perfil).toBe('cliente');
    expect(resposta.body).not.toHaveProperty('senha');
    expect(resposta.body).not.toHaveProperty('senha_hash');
    const usuarioLido = await Usuario.findByPk(resposta.body.id);
    expect(usuarioLido.get()).not.toHaveProperty('senha_hash');
  });

  test.each(['administrador', 'vendedor'])('não permite cadastro público com perfil %s', async (perfilSolicitado) => {
    const email = `tentativa-${crypto.randomBytes(12).toString('hex')}@example.com`;
    const senha = crypto.randomBytes(16).toString('hex');
    const resposta = await request(app)
      .post('/api/auth/registrar')
      .send({ nome: 'Tentativa de perfil', email, senha, perfil: perfilSolicitado });

    expect(resposta.status).toBe(201);
    expect(resposta.body.perfil).toBe('cliente');
    expect(resposta.body).not.toHaveProperty('senha');
    expect(resposta.body).not.toHaveProperty('senha_hash');

    const usuarioSalvo = await Usuario.findByPk(resposta.body.id);
    expect(usuarioSalvo.perfil).toBe('cliente');
    await Usuario.destroy({ where: { id: resposta.body.id } });
  });

  test('não deve cadastrar com e-mail já existente', async () => {
    // Primeiro cadastro
    await request(app).post('/api/auth/registrar').send(usuarioTeste);
    // Segundo cadastro com mesmo e-mail
    const resposta = await request(app)
      .post('/api/auth/registrar')
      .send(usuarioTeste);

    expect(resposta.status).toBe(409);
    expect(resposta.body.erro).toBe('E-mail já cadastrado.');
  });

  test('não deve cadastrar sem o campo nome', async () => {
    const resposta = await request(app)
      .post('/api/auth/registrar')
      .send({ email: 'sem_nome@email.com', senha: '123456' });

    expect(resposta.status).toBe(400);
  });

  test('não deve cadastrar sem o campo senha', async () => {
    const resposta = await request(app)
      .post('/api/auth/registrar')
      .send({ nome: 'Teste', email: 'sem_senha@email.com' });

    expect(resposta.status).toBe(400);
  });

});

describe('Login de usuário', () => {

  beforeAll(async () => {
    // Garante que o usuário existe antes de testar o login
    await request(app).post('/api/auth/registrar').send(usuarioTeste);
  });

  test('deve fazer login com credenciais corretas', async () => {
    const resposta = await request(app)
      .post('/api/auth/login')
      .send({ email: usuarioTeste.email, senha: usuarioTeste.senha });

    expect(resposta.status).toBe(200);
    expect(resposta.body).toHaveProperty('token');
    expect(resposta.body.perfil).toBe('cliente');
    expect(resposta.body.nome).toBe(usuarioTeste.nome);
    expect(resposta.body).not.toHaveProperty('senha');
    expect(resposta.body).not.toHaveProperty('senha_hash');
  });

  test('não deve fazer login com senha errada', async () => {
    const resposta = await request(app)
      .post('/api/auth/login')
      .send({ email: usuarioTeste.email, senha: crypto.randomBytes(16).toString('hex') });

    expect(resposta.status).toBe(401);
    expect(resposta.body.erro).toBe('Credenciais inválidas.');
  });

  test('não deve fazer login com e-mail inexistente', async () => {
    const resposta = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nao_existe@email.com', senha: '123456' });

    expect(resposta.status).toBe(401);
    expect(resposta.body.erro).toBe('Credenciais inválidas.');
  });

  test('o token retornado deve ser uma string válida', async () => {
    const resposta = await request(app)
      .post('/api/auth/login')
      .send({ email: usuarioTeste.email, senha: usuarioTeste.senha });

    expect(typeof resposta.body.token).toBe('string');
    expect(resposta.body.token.length).toBeGreaterThan(10);
  });

});
