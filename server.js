import express from "express";
import pkg from "pg";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pkg;
const app = express();

app.use(cors());
app.use(express.json());

// PostgreSQL ulanish
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// DB init
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leaderboard (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT UNIQUE,
        username TEXT,
        photo_url TEXT,
        score INT DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ DB ready");
  } catch (err) {
    console.error("❌ DB init error:", err);
  }
}

// API endpoints
app.post("/score", async (req, res) => {
  const { telegram_id, username, photo_url, score } = req.body;
  if (!telegram_id || !score) return res.status(400).json({ error: "Invalid data" });

  try {
    await pool.query(`
      INSERT INTO leaderboard (telegram_id, username, photo_url, score)
      VALUES ($1,$2,$3,$4)
      ON CONFLICT (telegram_id)
      DO UPDATE SET
        score = GREATEST(leaderboard.score, EXCLUDED.score),
        username = EXCLUDED.username,
        photo_url = EXCLUDED.photo_url,
        updated_at = CURRENT_TIMESTAMP
    `, [telegram_id, username, photo_url, score]);

    res.json({ success: true });
  } catch (err) {
    console.error("❌ /score error:", err);
    res.status(500).json({ error: "DB error" });
  }
});

app.get("/top10", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT username, photo_url, score
      FROM leaderboard
      ORDER BY score DESC
      LIMIT 10
    `);
    res.json(rows);
  } catch (err) {
    console.error("❌ /top10 error:", err);
    res.status(500).json({ error: "DB error" });
  }
});

// Static files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(__dirname));
app.use('/assaets', express.static(path.join(__dirname, 'assaets')));

// Start server
async function startServer() {
  await initDB();
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}

startServer();
