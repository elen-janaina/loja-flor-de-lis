# Flor-de-lis — Loja de Roupas Online

Loja com frontend estático, API Node.js/Express e PostgreSQL.

## Segurança de contas

O cadastro público cria somente contas `cliente`. O backend ignora campos de perfil enviados pelo navegador, incluindo tentativas de selecionar `administrador` ou `vendedor`. Não há senha-padrão de administrador nem cadastro público para esses perfis.

Para criar o primeiro administrador, configure `ADMIN_EMAIL` e `ADMIN_PASSWORD` somente nas variáveis privadas do serviço no Railway. A senha deve ter ao menos 12 caracteres, com letras e números. O servidor grava somente o hash bcrypt e não devolve a senha ou o hash pela API. Se o e-mail já pertencer a um cliente, ele não será promovido automaticamente. Se a conta administrativa já existir, atualizar `ADMIN_PASSWORD` nas variáveis e fazer deploy atualiza seu hash.

Não reutilize as credenciais antigas de demonstração. Na inicialização, esta versão bloqueia as contas antigas `admin@loja.com`, `cliente@loja.com` e `vendedor@loja.com`. A chave JWT que estava no Docker Compose também era pública no repositório; substitua `JWT_SECRET` nas variáveis privadas do Railway por um segredo aleatório novo (pelo menos 32 caracteres). Isso invalida as sessões atuais, então todos precisarão entrar novamente. Não publique os valores dessas variáveis nem os coloque no frontend.

## Railway

O `Dockerfile.railway` na raiz usa os arquivos que já existem em `frontend/` e os empacota na imagem do mesmo serviço Node que atende a API. Não cria outra cópia do frontend no Git nem outro serviço.

No serviço Railway já existente:

1. Deixe **Root Directory** vazio para usar a raiz do repositório.
2. Configure `RAILWAY_DOCKERFILE_PATH=/Dockerfile.railway`.
3. Mantenha a referência privada `DATABASE_URL` ao serviço PostgreSQL.
4. Cadastre `JWT_SECRET`, `ADMIN_EMAIL` e `ADMIN_PASSWORD` em **Variables**. Use um e-mail administrativo que não seja uma conta pública antiga de demonstração.
5. Se existir, remova `SEED_DEMO_USERS`; esta versão não cria contas de demonstração.
6. Faça o deploy. A loja abre em `/` e a API de saúde em `/api/health`.

Não é necessário desativar o GitHub Pages para proteger a API. O workflow de Pages continua sendo independente e publica apenas a pasta `frontend`; ele não compartilha o domínio nem a API do Railway.

## Desenvolvimento local

Crie um `.env` local ignorado pelo Git a partir do exemplo e defina `JWT_SECRET` com um valor aleatório. Por exemplo, gere-o com `openssl rand -hex 32` e cole o resultado no `.env`. Não versione esse arquivo.

```bash
cp backend/.env.example .env
docker compose up --build
```

Sem `ADMIN_EMAIL` e `ADMIN_PASSWORD` no `.env`, nenhum administrador é criado localmente. Cadastros feitos pela loja continuam sendo apenas de clientes.

Frontend: http://localhost:8080  
API: http://localhost:3001  
Banco de dados: localhost:5432
