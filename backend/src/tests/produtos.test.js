// Testes do módulo de produtos
const request = require('supertest');
const app = require('../app');

let tokenAdmin = '';
let tokenCliente = '';
let idProdutoCriado = '';

beforeAll(async () => {
  // Faz login como admin
  const resAdmin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@loja.com', senha: 'admin123' });
  tokenAdmin = resAdmin.body.token;

  // Faz login como cliente
  const resCliente = await request(app)
    .post('/api/auth/login')
    .send({ email: 'cliente@loja.com', senha: 'cliente123' });
  tokenCliente = resCliente.body.token;
});

describe('Listagem de produtos', () => {

  test('deve listar produtos sem precisar de login', async () => {
    const resposta = await request(app).get('/api/produtos');

    expect(resposta.status).toBe(200);
    expect(Array.isArray(resposta.body)).toBe(true);
  });

  test('deve retornar produtos com os campos esperados', async () => {
    const resposta = await request(app).get('/api/produtos');

    if (resposta.body.length > 0) {
      const produto = resposta.body[0];
      expect(produto).toHaveProperty('id');
      expect(produto).toHaveProperty('nome');
      expect(produto).toHaveProperty('preco');
    }
  });

  test('deve filtrar produtos por categoria', async () => {
    const resposta = await request(app).get('/api/produtos?categoria=Casacos');

    expect(resposta.status).toBe(200);
    expect(Array.isArray(resposta.body)).toBe(true);
  });

  test('deve buscar produtos pelo nome', async () => {
    const resposta = await request(app).get('/api/produtos?busca=casaco');

    expect(resposta.status).toBe(200);
    expect(Array.isArray(resposta.body)).toBe(true);
  });

});

describe('Cadastro de produto', () => {

  test('admin deve conseguir cadastrar um produto novo', async () => {
    const novoProduto = {
      nome: 'Blusa Teste Jest',
      descricao: 'Produto criado pelo teste automatizado',
      preco: 99.90,
      tamanhos: 'P,M,G',
      categoria: 'Blusas',
      estoque: [
        { tamanho: 'P', quantidade: 5 },
        { tamanho: 'M', quantidade: 10 },
        { tamanho: 'G', quantidade: 3 }
      ]
    };

    const resposta = await request(app)
      .post('/api/produtos')
      .set('Authorization', 'Bearer ' + tokenAdmin)
      .send(novoProduto);

    expect(resposta.status).toBe(201);
    expect(resposta.body.nome).toBe('Blusa Teste Jest');
    idProdutoCriado = resposta.body.id;
  });

  test('não deve cadastrar produto sem estar logado', async () => {
    const resposta = await request(app)
      .post('/api/produtos')
      .send({ nome: 'Produto Sem Login', preco: 50 });

    expect(resposta.status).toBe(401);
  });

  test('cliente não deve ter permissão para cadastrar produto', async () => {
    const resposta = await request(app)
      .post('/api/produtos')
      .set('Authorization', 'Bearer ' + tokenCliente)
      .send({ nome: 'Produto do Cliente', preco: 50 });

    expect(resposta.status).toBe(403);
  });

  test('não deve cadastrar produto sem nome', async () => {
    const resposta = await request(app)
      .post('/api/produtos')
      .set('Authorization', 'Bearer ' + tokenAdmin)
      .send({ preco: 50.00 });

    expect(resposta.status).toBe(400);
  });

});

describe('Edição e estoque de produto', () => {

  test('admin deve conseguir atualizar o estoque', async () => {
    if (!idProdutoCriado) return;

    const resposta = await request(app)
      .patch('/api/produtos/' + idProdutoCriado + '/estoque')
      .set('Authorization', 'Bearer ' + tokenAdmin)
      .send({ tamanho: 'M', quantidade: 20 });

    expect(resposta.status).toBe(200);
    expect(parseInt(resposta.body.quantidade_disponivel)).toBe(20);
  });

  test('admin deve conseguir editar um produto', async () => {
    if (!idProdutoCriado) return;

    const resposta = await request(app)
      .put('/api/produtos/' + idProdutoCriado)
      .set('Authorization', 'Bearer ' + tokenAdmin)
      .send({ nome: 'Blusa Teste Editada', preco: 79.90 });

    expect(resposta.status).toBe(200);
    expect(resposta.body.nome).toBe('Blusa Teste Editada');
  });

  test('admin deve conseguir desativar um produto', async () => {
    if (!idProdutoCriado) return;

    const resposta = await request(app)
      .delete('/api/produtos/' + idProdutoCriado)
      .set('Authorization', 'Bearer ' + tokenAdmin);

    expect(resposta.status).toBe(200);
    expect(resposta.body.mensagem).toBe('Produto removido (desativado) com sucesso.');
  });

});