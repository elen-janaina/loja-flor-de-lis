// Testes de Autenticação - Login e Cadastro
// Para rodar: npm test

const request = require('supertest');
const app = require('../app');

// Dados usados nos testes
const usuarioTeste = {
  nome: 'Usuario Teste',
  email: 'teste_jest@email.com',
  senha: 'senha123',
  perfil: 'cliente'
};

// ─── Testes de Cadastro ───────────────────────────────────

describe('Cadastro de usuário', () => {

  test('deve cadastrar um novo usuário com sucesso', async () => {
    const resposta = await request(app)
      .post('/api/auth/registrar')
      .send(usuarioTeste);

    expect(resposta.status).toBe(201);
    expect(resposta.body).toHaveProperty('id');
    expect(resposta.body.email).toBe(usuarioTeste.email);
    expect(resposta.body.perfil).toBe('cliente');
  });

  test('não deve cadastrar com e-mail já existente', async () => {
    // Tenta cadastrar o mesmo e-mail duas vezes
    await request(app).post('/api/auth/registrar').send(usuarioTeste);

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
    expect(resposta.body).toHaveProperty('erro');
  });

  test('não deve cadastrar sem o campo senha', async () => {
    const resposta = await request(app)
      .post('/api/auth/registrar')
      .send({ nome: 'Teste', email: 'sem_senha@email.com' });

    expect(resposta.status).toBe(400);
    expect(resposta.body).toHaveProperty('erro');
  });

});

// ─── Testes de Login ──────────────────────────────────────

describe('Login de usuário', () => {

  // Cadastra o usuário antes de testar o login
  beforeAll(async () => {
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
  });

  test('não deve fazer login com senha errada', async () => {
    const resposta = await request(app)
      .post('/api/auth/login')
      .send({ email: usuarioTeste.email, senha: 'senha_errada' });

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

  test('o token retornado deve ser uma string', async () => {
    const resposta = await request(app)
      .post('/api/auth/login')
      .send({ email: usuarioTeste.email, senha: usuarioTeste.senha });

    expect(typeof resposta.body.token).toBe('string');
    expect(resposta.body.token.length).toBeGreaterThan(10);
  });

});
