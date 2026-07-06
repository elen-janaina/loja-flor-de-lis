// Configuração da URL da API (Backend)
// No Docker usamos '/api' para o Nginx redirecionar
const API_URL = '/api';

const estado = {
  usuario: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token') || null,
  carrinho: JSON.parse(localStorage.getItem('cart') || '[]'),
  produtos: [],
  pedidos: [],
  paginaAtual: 'catalogo'
};

//Função auxiliar para fazer chamadas para o servidor (API)
async function chamarApi(metodo, caminho, corpo) {
  const cabecalhos = { 'Content-Type': 'application/json' };
  
  // Se o usuário estiver logado, envia o token de segurança
  if (estado.token) {
    cabecalhos['Authorization'] = `Bearer ${estado.token}`;
  }

  const resposta = await fetch(`${API_URL}${caminho}`, { 
    method: metodo, 
    headers: cabecalhos, 
    body: corpo ? JSON.stringify(corpo) : undefined 
  });

  const dados = await resposta.json();

  // Se der erro na resposta do servidor
  if (!resposta.ok) {
    throw new Error(dados.erro || 'Ocorreu um erro na requisição');
  }

  return dados;
}

// Função para mostrar mensagens rápidas na tela
function mostrarMensagem(texto, tipo = 'default') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${tipo}`;
  toast.textContent = texto;
  container.appendChild(toast);
  
  // Remove a mensagem depois de 3.5 segundos
  setTimeout(() => toast.remove(), 3500);
}

// Sistema de navegação entre as "páginas" do site
function navegarPara(pagina) {
  // Esconde todas as páginas e remove destaques do menu
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
  
  // Mostra a página desejada
  const elementoPagina = document.getElementById(`page-${pagina}`);
  if (elementoPagina) elementoPagina.classList.add('active');
  
  // Destaca o link no menu
  const linkMenu = document.querySelector(`[data-page="${pagina}"]`);
  if (linkMenu) linkMenu.classList.add('active');
  
  estado.paginaAtual = pagina;

  // Carrega os dados específicos de cada página
  if (pagina === 'catalogo') renderizarCatalogo();
  if (pagina === 'carrinho') renderizarCarrinho();
  if (pagina === 'admin') renderizarAdmin();
  if (pagina === 'vendedor') renderizarVendedor();
  if (pagina === 'meus-pedidos') renderizarMeusPedidos();
}

// Atualiza o menu superior conforme o login do usuário
function atualizarMenu() {
  const navAuth = document.getElementById('navAuth');
  const navUser = document.getElementById('navUser');
  const navAdmin = document.getElementById('navAdmin');
  const navVendedor = document.getElementById('navVendedor');
  const navMeusPedidos = document.getElementById('navMeusPedidos');

  if (estado.usuario) {
    // Se logado, mostra botão de sair e nome do usuário
    navAuth.innerHTML = `<button class="btn btn-outline btn-sm" onclick="fazerLogout()">Sair</button>`;
    navUser.textContent = `Olá, ${estado.usuario.nome.split(' ')[0]}`;
    
    // Mostra menus administrativos se tiver permissão
    navAdmin.style.display = estado.usuario.perfil === 'administrador' ? 'inline' : 'none';
    navVendedor.style.display = estado.usuario.perfil === 'vendedor' ? 'inline' : 'none';
    navMeusPedidos.style.display = estado.usuario.perfil === 'cliente' ? 'inline' : 'none';
  } else {
    // Se não logado, mostra botão de entrar
    navAuth.innerHTML = `<a href="#" class="btn nav-btn-entrar btn-sm" onclick="navegarPara('login')">Entrar</a>`;
    navUser.textContent = '';
    navAdmin.style.display = 'none';
    navVendedor.style.display = 'none';
    navMeusPedidos.style.display = 'none';
  }
  atualizarIconeCarrinho();
}

// Função de Login
async function realizarLogin(evento) {
  evento.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const senha = document.getElementById('loginSenha').value;

  try {
    const dados = await chamarApi('POST', '/auth/login', { email, senha });
    
    // Salva os dados de login no estado e no navegador
    estado.token = dados.token;
    estado.usuario = { nome: dados.nome, perfil: dados.perfil };
    localStorage.setItem('token', dados.token);
    localStorage.setItem('user', JSON.stringify(estado.usuario));

    atualizarMenu();
    mostrarMensagem(`Bem-vindo(a), ${dados.nome}!`, 'success');
    navegarPara('catalogo');
  } catch (erro) { 
    mostrarMensagem(erro.message, 'error'); 
  }
}

// Função de Cadastro de novo cliente
async function realizarCadastro(evento) {
  evento.preventDefault();
  const nome = document.getElementById('regNome').value;
  const email = document.getElementById('regEmail').value;
  const senha = document.getElementById('regSenha').value;

  try {
    await chamarApi('POST', '/auth/registrar', { nome, email, senha, perfil: 'cliente' });
    mostrarMensagem('Conta criada com sucesso! Agora você pode entrar.', 'success');
    navegarPara('login');
  } catch (erro) { 
    mostrarMensagem(erro.message, 'error'); 
  }
}

// Função para sair da conta
function fazerLogout() {
  estado.token = null;
  estado.usuario = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  
  atualizarMenu();
  navegarPara('catalogo');
  mostrarMensagem('Você saiu da sua conta.');
}

// --- Lógica do Carrinho ---

function adicionarAoCarrinho(produto, tamanho) {
  if (!tamanho) { 
    mostrarMensagem('Por favor, selecione um tamanho.', 'error'); 
    return; 
  }

  // Verifica se o item já está no carrinho
  const itemExistente = estado.carrinho.find(item => item.produto_id === produto.id && item.tamanho === tamanho);

  if (itemExistente) {
    itemExistente.quantidade++;
  } else {
    estado.carrinho.push({ 
      produto_id: produto.id, 
      nome: produto.nome, 
      preco: produto.preco, 
      imagem_url: produto.imagem_url, 
      tamanho: tamanho, 
      quantidade: 1 
    });
  }

  salvarCarrinho();
  mostrarMensagem(`${produto.nome} adicionado ao carrinho!`, 'success');
  atualizarIconeCarrinho();
}

function removerDoCarrinho(indice) {
  estado.carrinho.splice(indice, 1);
  salvarCarrinho();
  renderizarCarrinho();
  atualizarIconeCarrinho();
}

function alterarQuantidade(indice, mudanca) {
  estado.carrinho[indice].quantidade = Math.max(1, estado.carrinho[indice].quantidade + mudanca);
  salvarCarrinho();
  renderizarCarrinho();
}

function salvarCarrinho() {
  localStorage.setItem('cart', JSON.stringify(estado.carrinho));
}

function atualizarIconeCarrinho() {
  const badge = document.getElementById('cartBadge');
  const totalItens = estado.carrinho.reduce((soma, item) => soma + item.quantidade, 0);
  badge.textContent = totalItens;
  badge.style.display = totalItens > 0 ? 'flex' : 'none';
}

// --- Lógica do Catálogo de Produtos ---

async function renderizarCatalogo() {
  const busca = document.getElementById('searchInput')?.value || '';
  const filtrosTamanho = [...document.querySelectorAll('.filter-tamanho:checked')].map(c => c.value);
  const filtrosCategoria = [...document.querySelectorAll('.filter-cat:checked')].map(c => c.value);

  // Monta a URL com os filtros
  let url = '/produtos?';
  if (busca) url += `busca=${encodeURIComponent(busca)}&`;
  if (filtrosTamanho.length === 1) url += `tamanho=${filtrosTamanho[0]}&`;
  if (filtrosCategoria.length === 1) url += `categoria=${filtrosCategoria[0]}&`;

  try {
    const produtos = await chamarApi('GET', url);
    estado.produtos = produtos;
    const grid = document.getElementById('productsGrid');

    if (!produtos.length) {
      grid.innerHTML = '<div class="text-center text-muted" style="padding:4rem;grid-column:1/-1;">Nenhum produto encontrado.</div>';
      return;
    }

    grid.innerHTML = produtos.map(p => `
      <div class="product-card" onclick="abrirDetalhesProduto(${p.id})">
        <img src="${p.imagem_url || 'https://via.placeholder.com/400x300?text=Sem+Imagem'}" alt="${p.nome}">
        <div class="product-card-body">
          <div class="product-card-category">${p.categoria || ''}</div>
          <div class="product-card-name">${p.nome}</div>
          <div class="product-card-price">R$ ${parseFloat(p.preco).toFixed(2).replace('.', ',')}</div>
          <div class="size-selector" id="sizes-${p.id}">
            ${(p.tamanhos || 'P,M,G,GG').split(',').map(t => {
              const tam = t.trim();
              const est = p.estoques?.find(e => e.tamanho === tam);
              const semEstoque = !est || est.quantidade_disponivel === 0;
              return `<button class="size-btn ${semEstoque ? 'sem-estoque' : ''}" 
                onclick="event.stopPropagation(); ${semEstoque ? '' : `selecionarTamanho(this, ${p.id})`}">${tam}</button>`;
            }).join('')}
          </div>
          <button class="btn btn-primary btn-sm btn-full" onclick="event.stopPropagation(); adicionarPeloCard(${p.id})">
            + Adicionar
          </button>
        </div>
      </div>
    `).join('');
  } catch (erro) {
    mostrarMensagem('Erro ao carregar os produtos.', 'error');
  }
}

function selecionarTamanho(botao, produtoId) {
  const container = document.getElementById(`sizes-${produtoId}`);
  container.querySelectorAll('.size-btn').forEach(b => b.classList.remove('selected'));
  botao.classList.add('selected');
}

function adicionarPeloCard(produtoId) {
  const produto = estado.produtos.find(p => p.id === produtoId);
  const container = document.getElementById(`sizes-${produtoId}`);
  const selecionado = container?.querySelector('.size-btn.selected');
  
  if (!selecionado) { 
    mostrarMensagem('Selecione um tamanho primeiro.', 'error'); 
    return; 
  }
  
  adicionarAoCarrinho(produto, selecionado.textContent.trim());
}

async function abrirDetalhesProduto(produtoId) {
  const p = estado.produtos.find(p => p.id === produtoId);
  if (!p) return;

  const pagina = document.getElementById('page-produto');
  pagina.innerHTML = `
    <div class="product-detail">
      <div class="breadcrumb">
        <a href="#" onclick="navegarPara('catalogo')" style="color:var(--text-muted);text-decoration:none">Início</a>
        &rsaquo; <span>${p.nome}</span>
      </div>
      <div class="product-detail-grid">
        <img src="${p.imagem_url || 'https://via.placeholder.com/600x400'}" alt="${p.nome}">
        <div class="product-detail-info">
          <div class="product-detail-category">${p.categoria || 'Moda'}</div>
          <h1>${p.nome}</h1>
          <div class="product-detail-price">R$ ${parseFloat(p.preco).toFixed(2).replace('.', ',')}</div>
          <p class="product-detail-desc">${p.descricao || 'Sem descrição disponível.'}</p>
          <div>
            <div class="size-label">Escolha seu tamanho:</div>
            <div class="size-selector" id="detail-sizes-${p.id}">
              ${(p.tamanhos || 'P,M,G,GG').split(',').map(t => {
                const tam = t.trim();
                const est = p.estoques?.find(e => e.tamanho === tam);
                const semEstoque = !est || est.quantidade_disponivel === 0;
                return `<button class="size-btn ${semEstoque ? 'sem-estoque' : ''}" 
                  ${semEstoque ? 'disabled' : `onclick="selecionarTamanhoDetalhe(this, ${p.id})"`}>${tam}</button>`;
              }).join('')}
            </div>
          </div>
          <button class="btn btn-primary" onclick="adicionarPeloDetalhe(${p.id})">
            Adicionar ao carrinho
          </button>
          <button class="btn btn-outline" onclick="navegarPara('catalogo')">
            Voltar para a loja
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.querySelectorAll('.page').forEach(pg => pg.classList.remove('active'));
  pagina.classList.add('active');
}

function selecionarTamanhoDetalhe(botao, produtoId) {
  const container = document.getElementById(`detail-sizes-${produtoId}`);
  container.querySelectorAll('.size-btn').forEach(b => b.classList.remove('selected'));
  botao.classList.add('selected');
}

function adicionarPeloDetalhe(produtoId) {
  const produto = estado.produtos.find(p => p.id === produtoId);
  const container = document.getElementById(`detail-sizes-${produtoId}`);
  const selecionado = container?.querySelector('.size-btn.selected');
  
  if (!selecionado) { 
    mostrarMensagem('Selecione um tamanho primeiro.', 'error'); 
    return; 
  }
  
  adicionarAoCarrinho(produto, selecionado.textContent.trim());
}

// --- Lógica da Página de Carrinho ---

function renderizarCarrinho() {
  const container = document.getElementById('cartItems');
  const resumo = document.getElementById('cartSummary');

  if (!estado.carrinho.length) {
    container.innerHTML = `
      <div class="cart-empty">
        <p>Seu carrinho está vazio no momento.</p>
        <button class="btn btn-primary mt-2" onclick="navegarPara('catalogo')">Ver Produtos</button>
      </div>`;
    resumo.innerHTML = '';
    return;
  }

  const subtotal = estado.carrinho.reduce((soma, item) => soma + parseFloat(item.preco) * item.quantidade, 0);
  const frete = 10;
  const total = subtotal + frete;

  container.innerHTML = estado.carrinho.map((item, idx) => `
    <div class="cart-item">
      <img src="${item.imagem_url || 'https://via.placeholder.com/80'}" alt="${item.nome}">
      <div class="cart-item-info">
        <h4>${item.nome}</h4>
        <p>Tamanho: ${item.tamanho}</p>
        <div class="qty-control">
          <button class="qty-btn" onclick="alterarQuantidade(${idx}, -1)">−</button>
          <span>${item.quantidade}</span>
          <button class="qty-btn" onclick="alterarQuantidade(${idx}, 1)">+</button>
          <button class="btn btn-sm" style="color:red;border:none;background:none;cursor:pointer" onclick="removerDoCarrinho(${idx})">Remover</button>
        </div>
      </div>
      <div class="cart-item-price">R$ ${(parseFloat(item.preco) * item.quantidade).toFixed(2).replace('.', ',')}</div>
    </div>
  `).join('');

  resumo.innerHTML = `
    <div class="cart-summary">
      <h3>Resumo da Compra</h3>
      <div class="summary-row"><span>Subtotal</span><span>R$ ${subtotal.toFixed(2).replace('.', ',')}</span></div>
      <div class="summary-row"><span>Frete</span><span>R$ ${frete.toFixed(2).replace('.', ',')}</span></div>
      <div class="summary-row total"><span>Total</span><span>R$ ${total.toFixed(2).replace('.', ',')}</span></div>
      ${estado.usuario?.perfil === 'cliente' 
        ? `<button class="btn btn-primary btn-full mt-2" onclick="finalizarPedido()">Finalizar Pedido</button>`
        : `<button class="btn btn-secondary btn-full mt-2" onclick="navegarPara('login')">Entre para comprar</button>`}
    </div>
  `;
}

async function finalizarPedido() {
  if (!estado.carrinho.length) return;
  
  try {
    const itens = estado.carrinho.map(i => ({ 
      produto_id: i.produto_id, 
      tamanho: i.tamanho, 
      quantidade: i.quantidade 
    }));

    const dados = await chamarApi('POST', '/pedidos', { itens });
    
    // Limpa o carrinho após a compra
    estado.carrinho = [];
    salvarCarrinho();
    atualizarIconeCarrinho();
    renderizarCarrinho();
    
    mostrarMensagem(`Pedido #${dados.pedido_id} realizado com sucesso!`, 'success');
  } catch (erro) {
    mostrarMensagem(erro.message, 'error');
  }
}

// --- Painel Administrativo ---

async function renderizarAdmin() {
  if (!estado.usuario || estado.usuario.perfil !== 'administrador') {
    navegarPara('login'); 
    return;
  }
  
  try {
    const produtos = await chamarApi('GET', '/produtos');
    const container = document.getElementById('adminProdutos');
    
    container.innerHTML = `
      <div class="section-header">
        <span>Total: ${produtos.length} produtos</span>
        <button class="btn btn-primary btn-sm" onclick="abrirModalNovoProduto()">+ Novo Produto</button>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th><th>Foto</th><th>Nome</th><th>Preço</th><th>Ações</th>
          </tr>
        </thead>
        <tbody>
          ${produtos.map(p => `
            <tr>
              <td>#${p.id}</td>
              <td><img src="${p.imagem_url || ''}" style="width:40px;height:40px;object-fit:cover" onerror="this.style.display='none'"></td>
              <td>${p.nome}</td>
              <td>R$ ${parseFloat(p.preco).toFixed(2).replace('.', ',')}</td>
              <td>
                <button class="btn btn-sm btn-secondary" onclick="abrirModalEstoque(${p.id}, '${p.nome}', ${JSON.stringify(p.estoques || []).replace(/"/g, '&quot;')})">Estoque</button>
                <button class="btn btn-sm" style="color:red" onclick="apagarProduto(${p.id})">Excluir</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (erro) { 
    mostrarMensagem('Erro ao carregar dados do admin.', 'error'); 
  }
}

function abrirModalNovoProduto() {
  document.getElementById('modalNovoProduto').classList.add('open');
}

async function salvarProduto(evento) {
  evento.preventDefault();
  const dados = {
    nome: document.getElementById('pNome').value,
    descricao: document.getElementById('pDesc').value,
    preco: document.getElementById('pPreco').value,
    imagem_url: document.getElementById('pImagem').value,
    tamanhos: document.getElementById('pTamanhos').value,
    categoria: document.getElementById('pCategoria').value,
  };
  
  // Cria estoque inicial padrão
  dados.estoque = dados.tamanhos.split(',').map(t => ({ tamanho: t.trim(), quantidade: 10 }));

  try {
    await chamarApi('POST', '/produtos', dados);
    fecharModal('modalNovoProduto');
    mostrarMensagem('Produto cadastrado com sucesso!', 'success');
    renderizarAdmin();
  } catch (erro) { 
    mostrarMensagem(erro.message, 'error'); 
  }
}

function abrirModalEstoque(id, nome, estoques) {
  const modal = document.getElementById('modalEstoque');
  modal.querySelector('h3').textContent = `Estoque de: ${nome}`;
  modal.dataset.produtoId = id;
  
  const lista = modal.querySelector('#estoqueList');
  lista.innerHTML = (estoques || []).map(e => `
    <div style="display:flex;align-items:center;gap:1rem;margin-bottom:0.8rem">
      <span style="font-weight:bold;min-width:30px">${e.tamanho}</span>
      <input type="number" value="${e.quantidade_disponivel}" min="0" 
        onchange="atualizarEstoqueServidor(${id}, '${e.tamanho}', this.value)">
      <span>unidades</span>
    </div>
  `).join('') || '<p>Sem estoque cadastrado.</p>';
  
  modal.classList.add('open');
}

async function atualizarEstoqueServidor(produtoId, tamanho, quantidade) {
  try {
    await chamarApi('PATCH', `/produtos/${produtoId}/estoque`, { tamanho, quantidade: parseInt(quantidade) });
    mostrarMensagem('Estoque atualizado!', 'success');
  } catch (erro) { 
    mostrarMensagem(erro.message, 'error'); 
  }
}

async function apagarProduto(id) {
  if (!confirm('Tem certeza que deseja remover este produto?')) return;
  try {
    await chamarApi('DELETE', `/produtos/${id}`);
    mostrarMensagem('Produto removido.');
    renderizarAdmin();
  } catch (erro) { 
    mostrarMensagem(erro.message, 'error'); 
  }
}

// --- Meus Pedidos (Cliente) ---

async function renderizarMeusPedidos() {
  if (!estado.usuario || estado.usuario.perfil !== 'cliente') {
    navegarPara('login');
    return;
  }

  try {
    // O backend já filtra automaticamente para trazer só os pedidos deste cliente
    const pedidos = await chamarApi('GET', '/pedidos');
    const container = document.getElementById('meusPedidosLista');

    if (!pedidos.length) {
      container.innerHTML = `<p>Você ainda não fez nenhum pedido.</p>`;
      return;
    }

    container.innerHTML = `
      <table class="data-table">
        <thead>
          <tr><th>ID</th><th>Data</th><th>Total</th><th>Status</th><th>Ações</th></tr>
        </thead>
        <tbody>
          ${pedidos.map(p => `
            <tr>
              <td>#${p.id}</td>
              <td>${new Date(p.createdAt).toLocaleDateString('pt-BR')}</td>
              <td>R$ ${parseFloat(p.total).toFixed(2).replace('.', ',')}</td>
              <td><span class="status-badge status-${p.status}">${formatarStatus(p.status)}</span></td>
              <td><button class="btn btn-sm btn-secondary" onclick="visualizarPedido(${p.id})">Ver detalhes</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (erro) {
    mostrarMensagem('Erro ao carregar seus pedidos.', 'error');
  }
}

// Deixa o texto do status mais amigável para o cliente
function formatarStatus(status) {
  const nomes = {
    pendente: 'Pendente',
    em_preparacao: 'Em preparação',
    enviado: 'Enviado',
    cancelado: 'Cancelado'
  };
  return nomes[status] || status;
}

// --- Painel do Vendedor ---

async function renderizarVendedor() {
  if (!estado.usuario || estado.usuario.perfil !== 'vendedor') {
    navegarPara('login'); 
    return;
  }

  try {
    const pedidos = await chamarApi('GET', '/pedidos');
    const container = document.getElementById('vendedorPedidos');
    
    container.innerHTML = `
      <div class="section-header">
        <span>Total de pedidos: ${pedidos.length}</span>
      </div>
      <table class="data-table">
        <thead>
          <tr><th>ID</th><th>Cliente</th><th>Total</th><th>Status</th><th>Ações</th></tr>
        </thead>
        <tbody>
          ${pedidos.map(p => `
            <tr>
              <td>#${p.id}</td>
              <td>${p.cliente?.nome || '—'}</td>
              <td>R$ ${parseFloat(p.total).toFixed(2).replace('.', ',')}</td>
              <td>${p.status}</td>
              <td>
                <button class="btn btn-sm btn-secondary" onclick="visualizarPedido(${p.id})">Ver</button>
                ${p.status === 'pendente' ? `<button class="btn btn-sm btn-success" onclick="confirmarPedidoVenda(${p.id})">Confirmar</button>` : ''}
                ${p.status !== 'pendente' ? `
                  <select class="status-select" onchange="alterarStatusPedido(${p.id}, this.value)">
                    <option value="">Alterar status...</option>
                    <option value="em_preparacao" ${p.status === 'em_preparacao' ? 'selected' : ''}>Em preparação</option>
                    <option value="enviado" ${p.status === 'enviado' ? 'selected' : ''}>Enviado</option>
                    <option value="cancelado" ${p.status === 'cancelado' ? 'selected' : ''}>Cancelado</option>
                  </select>
                ` : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (erro) { 
    mostrarMensagem('Erro ao carregar pedidos.', 'error'); 
  }
}

async function confirmarPedidoVenda(id) {
  if (!confirm('Deseja confirmar esta venda e baixar o estoque?')) return;
  try {
    await chamarApi('POST', `/pedidos/${id}/confirmar`, {});
    mostrarMensagem('Venda confirmada!', 'success');
    renderizarVendedor();
  } catch (erro) { 
    mostrarMensagem(erro.message, 'error'); 
  }
}

// Permite ao vendedor avançar o pedido para "enviado" ou "cancelado"
// depois que ele já saiu de "pendente" (usa a rota PATCH /pedidos/:id/status,
// que já existia no backend mas não tinha nenhum botão ligado a ela no frontend)
async function alterarStatusPedido(id, novoStatus) {
  if (!novoStatus) return;
  if (!confirm(`Deseja alterar o status deste pedido para "${novoStatus}"?`)) {
    renderizarVendedor();
    return;
  }
  try {
    await chamarApi('PATCH', `/pedidos/${id}/status`, { status: novoStatus });
    mostrarMensagem('Status atualizado!', 'success');
    renderizarVendedor();
  } catch (erro) {
    mostrarMensagem(erro.message, 'error');
  }
}

async function visualizarPedido(id) {
  try {
    const pedido = await chamarApi('GET', `/pedidos/${id}`);
    const modal = document.getElementById('modalPedido');
    modal.querySelector('h3').textContent = `Detalhes do Pedido #${pedido.id}`;
    
    modal.querySelector('#pedidoInfo').innerHTML = `
      <p><strong>Cliente:</strong> ${pedido.cliente?.nome}</p>
      <p><strong>Status:</strong> ${pedido.status}</p>
      <p><strong>Data:</strong> ${new Date(pedido.createdAt).toLocaleDateString('pt-BR')}</p>
      <hr>
      <ul>
        ${pedido.itens?.map(i => `
          <li>${i.produto?.nome} (${i.tamanho}) - Qtd: ${i.quantidade}</li>
        `).join('')}
      </ul>
      <p><strong>Total:</strong> R$ ${parseFloat(pedido.total).toFixed(2).replace('.', ',')}</p>
    `;
    modal.classList.add('open');
  } catch (erro) { 
    mostrarMensagem(erro.message, 'error'); 
  }
}

function fecharModal(id) {
  document.getElementById(id).classList.remove('open');
}

// Executa quando o site termina de carregar
document.addEventListener('DOMContentLoaded', () => {
  atualizarMenu();
  atualizarIconeCarrinho();
  navegarPara('catalogo');

  // Configura a busca em tempo real
  document.getElementById('searchInput')?.addEventListener('input', () => renderizarCatalogo());
  
  // Configura os filtros laterais
  document.querySelectorAll('.filter-tamanho, .filter-cat').forEach(checkbox => {
    checkbox.addEventListener('change', renderizarCatalogo);
  });
});