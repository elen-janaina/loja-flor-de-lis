const { Pedido, ItemPedido, Produto, Estoque, Usuario } = require('../models');
const sequelize = require('../config/database');

// Função para o cliente criar um novo pedido (finalizar compra)
async function criar(req, res) {
  const t = await sequelize.transaction(); // Inicia uma transação para garantir que tudo dê certo ou nada seja salvo
  try {
    const { itens } = req.body;
    const usuarioId = req.usuario.id;

    if (!itens || itens.length === 0) {
      return res.status(400).json({ erro: 'O carrinho está vazio.' });
    }

    let valorTotal = 0;
    const freteFixo = 10.00;

    // Criamos o pedido primeiro
    const novoPedido = await Pedido.create({
      usuario_id: usuarioId,
      total: 0, // Vamos atualizar depois de somar os itens
      frete: freteFixo,
      status: 'pendente'
    }, { transaction: t });

    // Agora processamos cada item do carrinho
    for (const item of itens) {
      const produto = await Produto.findByPk(item.produto_id, { transaction: t });
      
      if (!produto || !produto.ativo) {
        throw new Error(`Produto ID ${item.produto_id} não encontrado ou indisponível.`);
      }

      // Criamos o registro do item vinculado ao pedido
      await ItemPedido.create({
        pedido_id: novoPedido.id,
        produto_id: produto.id,
        tamanho: item.tamanho,
        quantidade: item.quantidade,
        preco_unitario: produto.preco
      }, { transaction: t });

      // Somamos ao valor total
      valorTotal += (parseFloat(produto.preco) * item.quantidade);
    }

    // Atualizamos o valor total final do pedido (itens + frete)
    await novoPedido.update({ total: valorTotal + freteFixo }, { transaction: t });

    await t.commit(); // Salva tudo no banco de dados
    return res.status(201).json({ mensagem: 'Pedido realizado com sucesso!', pedido_id: novoPedido.id, total: novoPedido.total });

  } catch (erro) {
    await t.rollback(); // Se der qualquer erro, cancela tudo que foi feito acima
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
