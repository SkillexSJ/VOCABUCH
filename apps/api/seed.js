const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Read .env manually
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  console.log('Connecting to NeonDB...');
  const usersBefore = await pool.query('SELECT * FROM users');
  console.log('Users before:', usersBefore.rows);

  await pool.query(`
    INSERT INTO users (id, name, role, "createdAt", "updatedAt")
    VALUES ('default-user', 'Default User', 'USER', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING
  `);

  const usersAfter = await pool.query('SELECT id, name, role FROM users');
  console.log('Users after upsert:', usersAfter.rows);

  const vocabCount = await pool.query('SELECT count(*) FROM user_vocabularies');
  console.log('User vocabularies count:', vocabCount.rows[0].count);

  await pool.end();
  console.log('Database check & seed finished successfully!');
}

main().catch((err) => {
  console.error('Error running seed script:', err);
  process.exit(1);
});
