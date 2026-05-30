require('dotenv').config();
const bcrypt = require('bcryptjs');
const app = require('./app');
const { sequelize, Usuario, Produto, Estoque } = require('./models');

// Função para criar dados iniciais no banco
async function criarDadosIniciais() {
  const totalUsuarios = await Usuario.count();
  if (totalUsuarios > 0) return;

  console.log('Populando o banco de dados com informações de teste...');

  const senhaAdmin    = await bcrypt.hash('admin123', 10);
  const senhaCliente  = await bcrypt.hash('cliente123', 10);
  const senhaVendedor = await bcrypt.hash('vendedor123', 10);

  await Usuario.bulkCreate([
    { nome: 'Administrador', email: 'admin@loja.com', senha_hash: senhaAdmin, perfil: 'administrador' },
    { nome: 'Cliente Teste', email: 'cliente@loja.com', senha_hash: senhaCliente, perfil: 'cliente' },
    { nome: 'Vendedor Teste', email: 'vendedor@loja.com', senha_hash: senhaVendedor, perfil: 'vendedor' }
  ]);

  const produtosCriados = await Produto.bulkCreate([
    { nome: 'Casaco de Pele Preto', descricao: 'Um casaco elegante e quente para o inverno.', preco: 389.90, tamanhos: 'P,M,G', categoria: 'Casacos', imagem_url: 'https://i.postimg.cc/y8DqYBcX/IMG-0429.jpg' },
    { nome: 'Casaco Alongado Biamar', descricao: 'Casaco de alta qualidade, modelo alongado.', preco: 449.90, tamanhos: 'P,M,G', categoria: 'Casacos', imagem_url: 'https://i.postimg.cc/mr4SpyLN/139EA59F-9CF5-4E4D-88CE-3E7CCE045185.jpg' },
    { nome: 'Parka Marrom', descricao: 'Parka ideal para enfrentar dias de frio intenso.', preco: 259.90, tamanhos: 'P,M,G,GG', categoria: 'Casacos', imagem_url: 'https://i.postimg.cc/W4V7YwNw/IMG-0430.jpg' },
  ]);

  for (const produto of produtosCriados) {
    for (const tamanho of produto.tamanhos.split(',')) {
      await Estoque.create({ produto_id: produto.id, tamanho: tamanho.trim(), quantidade_disponivel: 10 });
    }
  }

  console.log('Dados de teste criados com sucesso!');
}

const PORTA = process.env.PORT || 3001;

sequelize.sync({ alter: true })
  .then(async () => {
    await criarDadosIniciais();
    app.listen(PORTA, () => {
      console.log(`>>> Servidor rodando na porta ${PORTA}`);
    });
  })
  .catch(erro => {
    console.error('Erro ao conectar ao banco:', erro);
    process.exit(1);
  });
