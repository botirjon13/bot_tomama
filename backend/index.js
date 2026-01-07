require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public/game'));

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// --- Helper: haftani olish ---
function getCurrentWeek() {
  const d = new Date();
  const oneJan = new Date(d.getFullYear(),0,1);
  return Math.ceil((((d - oneJan) / 86400000) + oneJan.getDay()+1)/7);
}

// --- Submit Score ---
app.post('/submit-score', async (req,res) => {
  try {
    const { telegram_id, name, score } = req.body;
    const week = getCurrentWeek();

    await pool.query(
      `INSERT INTO users (telegram_id, name)
       VALUES ($1,$2) ON CONFLICT (telegram_id) DO NOTHING`,
      [telegram_id, name]
    );

    await pool.query(
      `INSERT INTO scores (telegram_id, score, week)
       VALUES ($1,$2,$3)`,
      [telegram_id, score, week]
    );

    res.json({ status:'ok' });
  } catch(e){ console.error(e); res.status(500).send('Error'); }
});

// --- Top-10 ---
app.get('/top10', async (req,res) => {
  try {
    const week = getCurrentWeek();
    const { rows } = await pool.query(
      `SELECT u.name, s.score
       FROM scores s
       JOIN users u ON s.telegram_id = u.telegram_id
       WHERE s.week = $1
       ORDER BY s.score DESC
       LIMIT 10`, [week]
    );
    res.json(rows);
  } catch(e){ console.error(e); res.status(500).send('Error'); }
});

// --- Kupon generator ---
function generateCoupon(percent){
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'TOMAMA-' + percent + '-';
  for(let i=0;i<5;i++) code += chars[Math.floor(Math.random()*chars.length)];
  return code;
}

// --- Haftalik kupon cron (Dushanba 00:00) ---
cron.schedule('0 0 * * 1', async () => {
  try{
    const week = getCurrentWeek() - 1; // o'tgan hafta
    const { rows } = await pool.query(
      `SELECT telegram_id, score
       FROM scores
       WHERE week = $1
       ORDER BY score DESC
       LIMIT 3`, [week]
    );
    const prizes = [7,5,3];
    rows.forEach((row,idx)=>{
      const coupon = generateCoupon(prizes[idx]);
      bot.sendMessage(row.telegram_id,
        `🎉 Tabriklaymiz! Siz ${idx+1}-o‘rinni oldingiz 🥇\nKupon: ${coupon}`
      );
    });
  } catch(e){ console.error(e); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log(`Server ishga tushdi: ${PORT}`));
