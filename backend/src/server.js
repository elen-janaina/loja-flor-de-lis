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

// Contas de demonstração antigas (senhas públicas). Em produção ficam TRANCADAS.
const EMAILS_DEMO = ['admin@loja.com', 'cliente@loja.com', 'vendedor@loja.com'];
// Só use SEED_DEMO_USERS=true no seu computador (docker-compose). Nunca no Render.
const USAR_DEMO = process.env.SEED_DEMO_USERS === 'true';

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

// Cria o administrador real a partir de variáveis de ambiente (só quem acessa o Render conhece)
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

  const existente = await Usuario.findOne({ where: { email } });
  if (existente) return; // nunca sobrescreve uma conta que já existe

  await Usuario.create({
    nome: process.env.ADMIN_NAME || 'Administrador',
    email,
    senha_hash: await bcrypt.hash(senha, 12),
    perfil: 'administrador'
  });
  console.log('Administrador criado com sucesso.');
}

// Só para testes locais (docker-compose): cria as contas de demonstração
async function criarUsuariosDemo() {
  if ((await Usuario.count()) > 0) return;
  console.log('Criando contas de demonstração (apenas ambiente local)...');
  await Usuario.bulkCreate([
    { nome: 'Administrador', email: 'admin@loja.com', senha_hash: await bcrypt.hash('admin123', 10), perfil: 'administrador' },
    { nome: 'Cliente Teste', email: 'cliente@loja.com', senha_hash: await bcrypt.hash('cliente123', 10), perfil: 'cliente' },
    { nome: 'Vendedor Teste', email: 'vendedor@loja.com', senha_hash: await bcrypt.hash('vendedor123', 10), perfil: 'vendedor' }
  ]);
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
    if (USAR_DEMO) {
      await criarUsuariosDemo();
    } else {
      await bloquearContasDemo();
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
