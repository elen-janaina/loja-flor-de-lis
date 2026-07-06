# Flor-de-lis — Loja de Roupas Online

Projeto Multidisciplinar — Sistema de e-commerce de roupas

### Pré-requisitos
- [Docker](https://docs.docker.com/get-docker/) instalado
- [Docker Compose](https://docs.docker.com/compose/install/) instalado

### 1. Clone o repositório
```bash
git clone https://github.com/elen-janaina/loja-roupas
cd loja-roupas
```

### 2. Suba os containers
```bash
docker compose up --build
```

Na primeira execução, o sistema cria o banco de dados e insere dados iniciais automaticamente.

### 3. Acesse a aplicação
Frontend (site)  http://localhost:8080 
Backend (API) http://localhost:3001 
Banco de Dados  localhost:5432 

### 4. Contas de Teste
E-mail: admin@loja.com Senha:admin123 Perfil: Administrador
E-mail: cliente@loja.com Senha:cliente123  Perfil: Cliente
E-mail: vendedor@loja.com Senha:vendedor123 Perfil: Vendedor

## Testes Funcionais

Para testar a API manualmente:
```bash
curl http://localhost:3001/api/health

curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"cliente@loja.com","senha":"cliente123"}'

# Listar produtos
curl http://localhost:3001/api/produtos
```

Projeto desenvolvido por Elen Janaína Rodrigues Braga
