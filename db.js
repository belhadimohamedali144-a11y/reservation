const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres_db',
  user: process.env.DB_USER || 'myuser',
  password: process.env.DB_PASSWORD || '123',
  database: process.env.DB_NAME || 'reservation_db',
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function query(text, params) {
  return pool.query(text, params);
}

async function initDB() {
  await query(`
    CREATE TABLE IF NOT EXISTS reservations (
      id BIGINT PRIMARY KEY,
      type VARCHAR(20) NOT NULL,
      nom VARCHAR(255),
      telephone VARCHAR(50),
      email VARCHAR(255),
      nombre_personnes VARCHAR(50),
      date VARCHAR(50),
      experience VARCHAR(100),
      message TEXT,
      agence VARCHAR(255),
      responsable VARCHAR(255),
      type_groupe VARCHAR(100),
      nombre_visiteurs VARCHAR(50),
      programme TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS feedback (
      id BIGINT PRIMARY KEY,
      nom VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      note INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS admin (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL
    )
  `);

  await query(`ALTER TABLE reservations ALTER COLUMN nombre_personnes TYPE VARCHAR(50)`).catch(() => {});
  await query(`ALTER TABLE reservations ALTER COLUMN nombre_visiteurs TYPE VARCHAR(50)`).catch(() => {});

  console.log('Tables PostgreSQL prêtes');
}

module.exports = { query, initDB, pool };
