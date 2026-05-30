// Testes do módulo de Pedidos
// Para rodar: npm test

const request = require('supertest');
const app = require('../app');

let tokenCliente = '';
let tokenVendedor = '';
let idPedidoCriado = '';

// Faz login antes de todos os testes
beforeAll(async () => {
  const resCliente = await request(app)
    .post('/api/auth/login')
    .send({ email: 'cliente@loja.com', senha: 'cliente123' });
  tokenCliente = resCliente.body.token;

  const resVendedor = await request(app)
    .post('/api/auth/login')
    .send({ email: 'vendedor@loja.com', senha: 'vendedor123' });
  tokenVendedor = resVendedor.body.token;
});

// ─── Testes de Criação de Pedido ─────────────────────────

describe('Criação de pedido', () => {

  test('cliente deve conseguir criar um pedido', async () => {
    // Primeiro pega um produto disponível
    const resProdutos = await request(app).get('/api/produtos');
    const produtos = resProdutos.body;

    if (produtos.length === 0) {
      console.log('Sem produtos cadastrados para testar pedido');
      return;
    }

    // Pega o primeiro produto com estoque
    const produto = produtos.find(p =>
      p.estoques && p.estoques.some(e => e.quantidade_disponivel > 0)
    );

    if (!produto) {
      console.log('Sem produtos com estoque para testar');
      return;
    }

    const tamanhoDisponivel = produto.estoques.find(e => e.quantidade_disponivel > 0);

    const resposta = await request(app)
      .post('/api/pedidos')
      .set('Authorization', 'Bearer ' + tokenCliente)
      .send({
        itens: [{
          produto_id: produto.id,
          tamanho: tamanhoDisponivel.tamanho,
          quantidade: 1
        }]
      });

    expect(resposta.status).toBe(201);
    expect(resposta.body).toHaveProperty('pedido_id');
    expect(resposta.body).toHaveProperty('total');
    idPedidoCriado = resposta.body.pedido_id;
  });

  test('não deve criar pedido sem estar logado', async () => {
    const resposta = await request(app)
      .post('/api/pedidos')
      .send({ itens: [{ produto_id: 1, tamanho: 'M', quantidade: 1 }] });

    expect(resposta.status).toBe(401);
  });

  test('não deve criar pedido com carrinho vazio', async () => {
    const resposta = await request(app)
      .post('/api/pedidos')
      .set('Authorization', 'Bearer ' + tokenCliente)
      .send({ itens: [] });

    expect(resposta.status).toBe(400);
    expect(resposta.body.erro).toBe('Carrinho vazio.');
  });

  test('o frete fixo deve ser R$ 10,00', async () => {
    const resProdutos = await request(app).get('/api/produtos');
    const produto = resProdutos.body.find(p =>
      p.estoques && p.estoques.some(e => e.quantidade_disponivel > 0)
    );

    if (!produto) return;

    const tamanho = produto.estoques.find(e => e.quantidade_disponivel > 0);

    const resposta = await request(app)
      .post('/api/pedidos')
      .set('Authorization', 'Bearer ' + tokenCliente)
      .send({
        itens: [{ produto_id: produto.id, tamanho: tamanho.tamanho, quantidade: 1 }]
      });

    if (resposta.status === 201) {
      // Total deve ser preço do produto + R$10 de frete
      expect(parseFloat(resposta.body.total)).toBeGreaterThan(10);
    }
  });

});

// ─── Testes de Listagem de Pedidos ───────────────────────

describe('Listagem de pedidos', () => {

  test('vendedor deve ver todos os pedidos', async () => {
    const resposta = await request(app)
      .get('/api/pedidos')
      .set('Authorization', 'Bearer ' + tokenVendedor);

    expect(resposta.status).toBe(200);
    expect(Array.isArray(resposta.body)).toBe(true);
  });

  test('cliente deve ver apenas seus próprios pedidos', async () => {
    const resposta = await request(app)
      .get('/api/pedidos')
      .set('Authorization', 'Bearer ' + tokenCliente);

    expect(resposta.status).toBe(200);
    expect(Array.isArray(resposta.body)).toBe(true);
  });

  test('não deve listar pedidos sem login', async () => {
    const resposta = await request(app).get('/api/pedidos');

    expect(resposta.status).toBe(401);
  });

});

// ─── Testes de Confirmação de Venda ──────────────────────

describe('Confirmação de venda', () => {

  test('vendedor deve conseguir confirmar um pedido pendente', async () => {
    if (!idPedidoCriado) return;

    const resposta = await request(app)
      .post('/api/pedidos/' + idPedidoCriado + '/confirmar')
      .set('Authorization', 'Bearer ' + tokenVendedor)
      .send({});

    expect(resposta.status).toBe(200);
    expect(resposta.body).toHaveProperty('mensagem');
  });

  test('não deve confirmar o mesmo pedido duas vezes', async () => {
    if (!idPedidoCriado) return;

    const resposta = await request(app)
      .post('/api/pedidos/' + idPedidoCriado + '/confirmar')
      .set('Authorization', 'Bearer ' + tokenVendedor)
      .send({});

    expect(resposta.status).toBe(400);
    expect(resposta.body.erro).toBe('Apenas pedidos pendentes podem ser confirmados.');
  });

  test('cliente não deve ter permissão para confirmar venda', async () => {
    const resposta = await request(app)
      .post('/api/pedidos/1/confirmar')
      .set('Authorization', 'Bearer ' + tokenCliente)
      .send({});

    expect(resposta.status).toBe(403);
  });

});
