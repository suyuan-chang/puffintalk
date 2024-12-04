const { Pool } = require('pg');

const pool_host = process.env.DB_HOST || 'localhost';
const pool_port = process.env.DB_PORT || 5432;
const pool_database = process.env.POSTGRES_DB;
const pool_user = process.env.POSTGRES_USER;
const pool_password = process.env.POSTGRES_PASSWORD;

console.log(`Database server ${pool_host}:${pool_port} name ${pool_database} user ${pool_user}`);

// Database connection
const pool = new Pool({
  host: pool_host,
  port: pool_port,
  database: pool_database,
  user: pool_user,
  password: pool_password,
});

pool.on('connect', (client) => {
  console.log('Connected to the database');
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

module.exports = pool;
