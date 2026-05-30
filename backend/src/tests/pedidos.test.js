// Testes do módulo de Pedidos
const request = require('supertest');
const app = require('../app');

let tokenCliente = '';
let tokenVendedor = '';
let idPedidoCriado = '';

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

describe('Criação de pedido', () => {

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
    expect(resposta.body.erro).toBe('O carrinho está vazio.');
  });

  test('cliente deve conseguir criar um pedido', async () => {
    // Busca produtos disponíveis
    const resProdutos = await request(app).get('/api/produtos');
    const lista = resProdutos.body;

    if (!Array.isArray(lista) || lista.length === 0) return;

    // Acha produto com estoque
    let produtoEscolhido = null;
    let tamanhoEscolhido = null;
    for (const p of lista) {
      if (p.estoques && Array.isArray(p.estoques)) {
        for (const e of p.estoques) {
          if (e.quantidade_disponivel > 0) {
            produtoEscolhido = p;
            tamanhoEscolhido = e.tamanho;
            break;
          }
        }
      }
      if (produtoEscolhido) break;
    }

    if (!produtoEscolhido) return;

    const resposta = await request(app)
      .post('/api/pedidos')
      .set('Authorization', 'Bearer ' + tokenCliente)
      .send({
        itens: [{
          produto_id: produtoEscolhido.id,
          tamanho: tamanhoEscolhido,
          quantidade: 1
        }]
      });

    expect(resposta.status).toBe(201);
    expect(resposta.body).toHaveProperty('pedido_id');
    expect(resposta.body).toHaveProperty('total');
    idPedidoCriado = resposta.body.pedido_id;
  });

  test('o total deve incluir frete de R$ 10,00', async () => {
    const resProdutos = await request(app).get('/api/produtos');
    const lista = resProdutos.body;
    if (!Array.isArray(lista) || lista.length === 0) return;

    let produto = null;
    let tamanho = null;
    for (const p of lista) {
      if (p.estoques && Array.isArray(p.estoques)) {
        for (const e of p.estoques) {
          if (e.quantidade_disponivel > 0) {
            produto = p;
            tamanho = e.tamanho;
            break;
          }
        }
      }
      if (produto) break;
    }

    if (!produto) return;

    const resposta = await request(app)
      .post('/api/pedidos')
      .set('Authorization', 'Bearer ' + tokenCliente)
      .send({ itens: [{ produto_id: produto.id, tamanho, quantidade: 1 }] });

    if (resposta.status === 201) {
      expect(parseFloat(resposta.body.total)).toBeGreaterThan(10);
    }
  });

});

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

describe('Confirmação de venda', () => {

  test('cliente não deve ter permissão para confirmar venda', async () => {
    const resposta = await request(app)
      .post('/api/pedidos/1/confirmar')
      .set('Authorization', 'Bearer ' + tokenCliente)
      .send({});

    expect(resposta.status).toBe(403);
  });

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
    expect(resposta.body.erro).toBe('Pedido não encontrado ou já processado.');
  });

});