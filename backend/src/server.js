require('dotenv').config();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const app = require('./app');
const { sequelize, Usuario, Produto, Estoque } = require('./models');

// Trava de segurança: nunca rodar sem uma chave JWT forte configurada
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('ERRO FATAL: defina a variável de ambiente JWT_SECRET com pelo menos 32 caracteres antes de iniciar o servidor.');
  process.exit(1);
}

// Endereços de contas de demonstração antigas, bloqueadas na inicialização.
const EMAILS_DEMO = ['admin@loja.com', 'cliente@loja.com', 'vendedor@loja.com'];

function senhaAdminForte(senha) {
  return typeof senha === 'string'
    && senha.length >= 12
    && /[a-zA-Z]/.test(senha)
    && /[0-9]/.test(senha);
}

// Troca a senha das contas de demonstração por uma aleatória que ninguém conhece
async function bloquearContasDemo() {
  const hashAleatorio = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
  const [qtd] = await Usuario.update(
    { senha_hash: hashAleatorio },
    { where: { email: { [Op.in]: EMAILS_DEMO } } }
  );
  if (qtd > 0) console.log(`Contas de demonstração bloqueadas: ${qtd}`);
}

// Cria o administrador somente por variáveis privadas do ambiente do servidor.
async function garantirAdministrador() {
  const email = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  const senha = process.env.ADMIN_PASSWORD;

  if (!email || !senha) {
    const admins = await Usuario.count({
      where: { perfil: 'administrador', email: { [Op.notIn]: EMAILS_DEMO } }
    });
    if (admins === 0) {
      console.warn('AVISO: não existe administrador. Defina ADMIN_EMAIL e ADMIN_PASSWORD para criar o primeiro.');
    }
    return;
  }

  if (!senhaAdminForte(senha)) {
    console.error('ERRO FATAL: ADMIN_PASSWORD precisa ter no mínimo 12 caracteres, com letras e números.');
    process.exit(1);
  }

  if (EMAILS_DEMO.includes(email)) {
    console.error('ADMIN_EMAIL não pode usar um endereço de demonstração público. Administrador não criado.');
    return;
  }

  const existente = await Usuario.unscoped().findOne({ where: { email } });
  if (existente) {
    if (existente.perfil !== 'administrador') {
      console.error('ADMIN_EMAIL já pertence a uma conta que não é administradora. Use outro e-mail privado; conta não promovida.');
      return;
    }
    const senhaAtualValida = await bcrypt.compare(senha, existente.senha_hash);
    if (!senhaAtualValida) {
      await existente.update({ senha_hash: await bcrypt.hash(senha, 12) });
      console.log('Senha administrativa atualizada a partir da variável privada.');
    }
    return;
  }

  await Usuario.create({
    nome: process.env.ADMIN_NAME || 'Administrador',
    email,
    senha_hash: await bcrypt.hash(senha, 12),
    perfil: 'administrador'
  });
  console.log('Administrador criado com sucesso.');
}

// Produtos iniciais (só se a tabela estiver vazia)
async function criarProdutosIniciais() {
  if ((await Produto.count()) > 0) return;

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
  console.log('Produtos iniciais criados.');
}

const PORTA = process.env.PORT || 3001;

sequelize.sync({ alter: true })
  .then(async () => {
    await criarProdutosIniciais();
    // Invalida contas de teste antigas mesmo se a variável antiga de seed ainda existir.
    await bloquearContasDemo();
    if (process.env.SEED_DEMO_USERS === 'true') {
      console.warn('SEED_DEMO_USERS não cria contas: o cadastro de usuários de demonstração foi removido.');
    }
    await garantirAdministrador();
    app.listen(PORTA, () => {
      console.log(`>>> Servidor rodando na porta ${PORTA}`);
    });
  })
  .catch(erro => {
    console.error('Erro ao iniciar o servidor:', erro);
    process.exit(1);
  });
