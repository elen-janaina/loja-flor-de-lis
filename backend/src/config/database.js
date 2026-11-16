const { Sequelize } = require('sequelize');

const opcoesComuns = {
  dialect: 'postgres',
  logging: false,
  pool: { max: 5, min: 0, acquire: 30000, idle: 10000 }
};

// Como proteger a conexão com o banco:
//  - verify-full: SSL com verificação do certificado (Neon, e a maioria dos bancos)
//  - no-verify:   SSL sem verificar o certificado (Railway usa certificado autoassinado,
//                 mas a conexão interna do Railway já é privada e criptografada)
//  - disable:     sem SSL (só para testes locais)
// Pode ser forçado com a variável DB_SSL_MODE.
function modoSsl(hostname) {
  const forcado = (process.env.DB_SSL_MODE || '').toLowerCase();
  if (['verify-full', 'no-verify', 'disable'].includes(forcado)) return forcado;
  if (/(railway\.internal|rlwy\.net|railway\.app)$/.test(hostname)) return 'no-verify';
  return 'verify-full';
}

let sequelize;

if (process.env.DATABASE_URL) {
  const url = new URL(process.env.DATABASE_URL.trim());
  // Removemos parâmetros que o driver do Node não entende ou que conflitam com o SSL abaixo
  url.searchParams.delete('channel_binding');
  url.searchParams.delete('sslmode');
  url.searchParams.delete('ssl');

  const modo = modoSsl(url.hostname);
  const dialectOptions = {};
  if (modo === 'verify-full') dialectOptions.ssl = { rejectUnauthorized: true };
  if (modo === 'no-verify') dialectOptions.ssl = { rejectUnauthorized: false };

  sequelize = new Sequelize(url.toString(), { ...opcoesComuns, dialectOptions });
} else {
  // Local (docker-compose): variáveis separadas, sem SSL
  sequelize = new Sequelize(
    process.env.DB_NAME || 'loja_roupas',
    process.env.DB_USER || 'loja_user',
    process.env.DB_PASS || 'loja_pass',
    {
      ...opcoesComuns,
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432
    }
  );
}

module.exports = sequelize;
