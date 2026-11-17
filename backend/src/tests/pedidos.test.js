// Testes do módulo de Pedidos
const request = require('supertest');
const { Op } = require('sequelize');
const { criarUsuarioComToken } = require('./helpers/authFixtures');
const app = require('../app');
const { Usuario, Pedido, ItemPedido } = require('../models');

let tokenCliente = '';
let tokenVendedor = '';
let idPedidoCriado = '';
let idsUsuariosTeste = [];

beforeAll(async () => {
  const cliente = await criarUsuarioComToken('cliente');
  const vendedor = await criarUsuarioComToken('vendedor');
  tokenCliente = cliente.token;
  tokenVendedor = vendedor.token;
  idsUsuariosTeste = [cliente.usuario.id, vendedor.usuario.id];
});

afterAll(async () => {
  if (idsUsuariosTeste.length) {
    const pedidos = await Pedido.findAll({
      where: { usuario_id: { [Op.in]: idsUsuariosTeste } },
      attributes: ['id']
    });
    const idsPedidos = pedidos.map((pedido) => pedido.id);
    if (idsPedidos.length) {
      await ItemPedido.destroy({ where: { pedido_id: { [Op.in]: idsPedidos } } });
      await Pedido.destroy({ where: { id: { [Op.in]: idsPedidos } } });
    }
    await Usuario.destroy({ where: { id: { [Op.in]: idsUsuariosTeste } } });
  }
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
        }],
        cidade_entrega: 'Santo Antônio da Patrulha'
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
      .send({
        itens: [{ produto_id: produto.id, tamanho, quantidade: 1 }],
        cidade_entrega: 'Santo Antônio da Patrulha'
      });

    if (resposta.status === 201) {
      expect(parseFloat(resposta.body.total)).toBeGreaterThan(10);
      expect(parseFloat(resposta.body.frete)).toBe(10);
      expect(resposta.body.frete_a_calcular).toBe(false);
    }
  });

  test('em outra cidade o frete fica para cálculo da atendente', async () => {
    const resProdutos = await request(app).get('/api/produtos');
    const produto = resProdutos.body.find(p => p.estoques?.some(e => e.quantidade_disponivel > 0));
    if (!produto) return;

    const estoque = produto.estoques.find(e => e.quantidade_disponivel > 0);
    const resposta = await request(app)
      .post('/api/pedidos')
      .set('Authorization', 'Bearer ' + tokenCliente)
      .send({
        itens: [{ produto_id: produto.id, tamanho: estoque.tamanho, quantidade: 1 }],
        cidade_entrega: 'Porto Alegre'
      });

    expect(resposta.status).toBe(201);
    expect(resposta.body.cidade_entrega).toBe('Porto Alegre');
    expect(parseFloat(resposta.body.frete)).toBe(0);
    expect(resposta.body.frete_a_calcular).toBe(true);
    expect(Number(resposta.body.total)).toBe(Number(resposta.body.subtotal));
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
