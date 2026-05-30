const { Produto, Estoque } = require('../models');
const { Op } = require('sequelize');

// Função para listar todos os produtos com filtros opcionais
async function listar(req, res) {
  try {
    const { busca, tamanho, categoria } = req.query;
    
    // Filtro inicial: apenas produtos ativos
    const filtro = { ativo: true };

    // Se o usuário digitou algo na busca, filtramos pelo nome
    if (busca) {
      filtro.nome = { [Op.iLike]: `%${busca}%` };
    }

    // Se escolheu uma categoria, filtramos por ela
    if (categoria) {
      filtro.categoria = categoria;
    }

    // Se escolheu um tamanho, filtramos nos tamanhos disponíveis
    if (tamanho) {
      filtro.tamanhos = { [Op.iLike]: `%${tamanho}%` };
    }

    // Buscamos no banco trazendo também as informações de estoque
    const produtos = await Produto.findAll({ 
      where: filtro, 
      include: [{ model: Estoque, as: 'estoques' }] 
    });

    return res.json(produtos);
  } catch (erro) {
    return res.status(500).json({ erro: 'Erro ao buscar produtos: ' + erro.message });
  }
}

// Função para ver os detalhes de um único produto pelo ID
async function detalhar(req, res) {
  try {
    const id = req.params.id;
    const produto = await Produto.findByPk(id, { 
      include: [{ model: Estoque, as: 'estoques' }] 
    });

    // Se não achar o produto ou ele estiver inativo
    if (!produto || !produto.ativo) {
      return res.status(404).json({ erro: 'Produto não encontrado.' });
    }

    return res.json(produto);
  } catch (erro) {
    return res.status(500).json({ erro: 'Erro ao buscar detalhes: ' + erro.message });
  }
}

// Função para o administrador criar um novo produto
async function criar(req, res) {
  try {
    const { nome, descricao, preco, imagem_url, tamanhos, categoria, estoque } = req.body;

    // Validação simples de campos obrigatórios
    if (!nome || !preco) {
      return res.status(400).json({ erro: 'O nome e o preço são obrigatórios.' });
    }

    // Cria o produto no banco
    const novoProduto = await Produto.create({ 
      nome, 
      descricao, 
      preco, 
      imagem_url, 
      tamanhos, 
      categoria 
    });

    // Se enviou informações de estoque inicial, criamos os registros
    if (estoque && Array.isArray(estoque)) {
      for (const item of estoque) {
        await Estoque.create({ 
          produto_id: novoProduto.id, 
          tamanho: item.tamanho, 
          quantidade_disponivel: item.quantidade 
        });
      }
    }

    return res.status(201).json(novoProduto);
  } catch (erro) {
    return res.status(500).json({ erro: 'Erro ao criar produto: ' + erro.message });
  }
}

// Função para atualizar os dados de um produto existente
async function atualizar(req, res) {
  try {
    const id = req.params.id;
    const produto = await Produto.findByPk(id);

    if (!produto) {
      return res.status(404).json({ erro: 'Produto não encontrado para atualizar.' });
    }

    // Atualiza com os dados que vieram no corpo da requisição
    await produto.update(req.body);
    
    return res.json(produto);
  } catch (erro) {
    return res.status(500).json({ erro: 'Erro ao atualizar produto: ' + erro.message });
  }
}

// Função para "remover" um produto (nós apenas desativamos ele)
async function remover(req, res) {
  try {
    const id = req.params.id;
    const produto = await Produto.findByPk(id);

    if (!produto) {
      return res.status(404).json({ erro: 'Produto não encontrado.' });
    }

    // Em vez de apagar do banco, mudamos o status para inativo (Soft Delete)
    await produto.update({ ativo: false });
    
    return res.json({ mensagem: 'Produto removido (desativado) com sucesso.' });
  } catch (erro) {
    return res.status(500).json({ erro: 'Erro ao remover produto: ' + erro.message });
  }
}

// Função para atualizar a quantidade em estoque de um tamanho específico
async function atualizarEstoque(req, res) {
  try {
    const produtoId = req.params.id;
    const { tamanho, quantidade } = req.body;

    // Procura se já existe estoque para esse tamanho
    let registro = await Estoque.findOne({ 
      where: { produto_id: produtoId, tamanho: tamanho } 
    });

    if (!registro) {
      // Se não existe, cria um novo registro de estoque
      registro = await Estoque.create({ 
        produto_id: produtoId, 
        tamanho: tamanho, 
        quantidade_disponivel: quantidade 
      });
    } else {
      // Se já existe, apenas atualiza a quantidade
      await registro.update({ quantidade_disponivel: quantidade });
    }

    return res.json(registro);
  } catch (erro) {
    return res.status(500).json({ erro: 'Erro ao atualizar estoque: ' + erro.message });
  }
}

// Exportando as funções para serem usadas nas rotas
module.exports = { 
  listar, 
  detalhar, 
  criar, 
  atualizar, 
  remover, 
  atualizarEstoque 
};
