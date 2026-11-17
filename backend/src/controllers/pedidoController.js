const { Pedido, ItemPedido, Produto, Estoque, Usuario } = require('../models');
const sequelize = require('../config/database');

// Função para o cliente criar um novo pedido (finalizar compra)
async function criar(req, res) {
  const { itens, cidade_entrega: cidadeInformada } = req.body || {};
  const usuarioId = req.usuario.id;

  if (!Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ erro: 'O carrinho está vazio.' });
  }
  if (typeof cidadeInformada !== 'string' || !cidadeInformada.trim()) {
    return res.status(400).json({ erro: 'Informe a cidade de entrega.' });
  }

  const cidade_entrega = cidadeInformada.trim().replace(/\s+/g, ' ');
  if (cidade_entrega.length > 100) {
    return res.status(400).json({ erro: 'A cidade deve ter no máximo 100 caracteres.' });
  }

  const cidadeNormalizada = cidade_entrega
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const cidadeBase = cidadeNormalizada.split(',')[0]
    .replace(/\s*-\s*(rs|rio grande do sul)$/i, '')
    .trim();
  const freteFixo = cidadeBase === 'santo antonio da patrulha' ? 10 : 0;
  const frete_a_calcular = freteFixo === 0;
  let t;

  try {
    t = await sequelize.transaction();
    let subtotalCentavos = 0;

    const novoPedido = await Pedido.create({
      usuario_id: usuarioId,
      total: 0,
      frete: freteFixo,
      cidade_entrega,
      status: 'pendente'
    }, { transaction: t });

    for (const item of itens) {
      const quantidade = Number(item.quantidade);
      if (!Number.isInteger(quantidade) || quantidade < 1) {
        throw new Error('A quantidade dos itens do pedido é inválida.');
      }

      const produto = await Produto.findByPk(item.produto_id, { transaction: t });
      if (!produto || !produto.ativo) {
        throw new Error(`Produto ID ${item.produto_id} não encontrado ou indisponível.`);
      }

      await ItemPedido.create({
        pedido_id: novoPedido.id,
        produto_id: produto.id,
        tamanho: item.tamanho,
        quantidade,
        preco_unitario: produto.preco
      }, { transaction: t });

      subtotalCentavos += Math.round(Number(produto.preco) * 100) * quantidade;
    }

    const subtotal = subtotalCentavos / 100;
    const total = (subtotalCentavos + Math.round(freteFixo * 100)) / 100;
    await novoPedido.update({ total, frete: freteFixo }, { transaction: t });

    await t.commit();
    return res.status(201).json({
      mensagem: 'Pedido registrado com sucesso!',
      pedido_id: novoPedido.id,
      cidade_entrega,
      subtotal: subtotal.toFixed(2),
      frete: freteFixo.toFixed(2),
      frete_a_calcular,
      total: total.toFixed(2)
    });

  } catch (erro) {
    if (t && !t.finished) await t.rollback();
    return res.status(500).json({ erro: 'Erro ao processar pedido: ' + erro.message });
  }
}

// Função para listar os pedidos (vendedor vê todos, cliente vê só os dele)
async function listar(req, res) {
  try {
    const filtro = {};
    
    // Se for cliente, só mostramos os pedidos dele mesmo
    if (req.usuario.perfil === 'cliente') {
      filtro.usuario_id = req.usuario.id;
    }

    const pedidos = await Pedido.findAll({
      where: filtro,
      include: [
        { model: Usuario, as: 'cliente', attributes: ['nome', 'email'] },
        { model: ItemPedido, as: 'itens', include: [{ model: Produto, as: 'produto' }] }
      ],
      order: [['createdAt', 'DESC']] // Mais recentes primeiro
    });

    return res.json(pedidos);
  } catch (erro) {
    return res.status(500).json({ erro: 'Erro ao listar pedidos: ' + erro.message });
  }
}

// Função para ver detalhes de um pedido específico
async function detalhar(req, res) {
  try {
    const pedido = await Pedido.findByPk(req.params.id, {
      include: [
        { model: ItemPedido, as: 'itens', include: [{ model: Produto, as: 'produto' }] },
        { model: Usuario, as: 'cliente', attributes: ['nome', 'email'] }
      ]
    });

    if (!pedido) {
      return res.status(404).json({ erro: 'Pedido não encontrado.' });
    }

    // Segurança: cliente só vê o próprio pedido
    if (req.usuario.perfil === 'cliente' && pedido.usuario_id !== req.usuario.id) {
      return res.status(403).json({ erro: 'Você não tem permissão para ver este pedido.' });
    }

    return res.json(pedido);
  } catch (erro) {
    return res.status(500).json({ erro: 'Erro ao detalhar pedido: ' + erro.message });
  }
}

// Função para o vendedor confirmar a venda e baixar o estoque
async function confirmarVenda(req, res) {
  const t = await sequelize.transaction();
  try {
    const pedido = await Pedido.findByPk(req.params.id, {
      include: [{ model: ItemPedido, as: 'itens' }],
      transaction: t
    });

    if (!pedido || pedido.status !== 'pendente') {
      return res.status(400).json({ erro: 'Pedido não encontrado ou já processado.' });
    }

    // Baixar o estoque de cada item do pedido
    for (const item of pedido.itens) {
      const estoque = await Estoque.findOne({
        where: { produto_id: item.produto_id, tamanho: item.tamanho },
        transaction: t
      });

      if (!estoque || estoque.quantidade_disponivel < item.quantidade) {
        throw new Error(`Estoque insuficiente para o produto ID ${item.produto_id} no tamanho ${item.tamanho}`);
      }

      // Subtrai a quantidade vendida do estoque
      await estoque.update({
        quantidade_disponivel: estoque.quantidade_disponivel - item.quantidade
      }, { transaction: t });
    }

    // Muda o status do pedido para "em preparação"
    await pedido.update({ status: 'em_preparacao' }, { transaction: t });

    await t.commit();
    return res.json({ mensagem: 'Venda confirmada e estoque atualizado!' });

  } catch (erro) {
    await t.rollback();
    return res.status(500).json({ erro: 'Erro ao confirmar venda: ' + erro.message });
  }
}

// Função para atualizar o status do pedido (ex: enviado, cancelado)
async function atualizarStatus(req, res) {
  try {
    const { status } = req.body;
    const pedido = await Pedido.findByPk(req.params.id);

    if (!pedido) {
      return res.status(404).json({ erro: 'Pedido não encontrado.' });
    }

    // Lista de status permitidos
    const statusValidos = ['pendente', 'em_preparacao', 'enviado', 'cancelado'];
    if (!statusValidos.includes(status)) {
      return res.status(400).json({ erro: 'Status inválido.' });
    }

    await pedido.update({ status });
    return res.json({ mensagem: 'Status atualizado para ' + status });

  } catch (erro) {
    return res.status(500).json({ erro: 'Erro ao atualizar status: ' + erro.message });
  }
}

module.exports = { 
  criar, 
  listar, 
  detalhar, 
  confirmarVenda, 
  atualizarStatus 
};
