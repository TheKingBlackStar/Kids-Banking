import { createClient } from '@libsql/client';

const db = createClient({
  url: 'file:local.db',
});

// Initialize database tables
async function initDB() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      is_admin BOOLEAN DEFAULT FALSE,
      points_balance INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      description TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Create admin account if it doesn't exist
  await db.execute({
    sql: 'INSERT OR IGNORE INTO users (id, username, password, is_admin, points_balance) VALUES (?, ?, ?, ?, ?)',
    args: [crypto.randomUUID(), 'admin', 'admin', true, 0]
  });
}

initDB().catch(console.error);

export { db };