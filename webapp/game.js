// game.js
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  // basket qayta joylash
  basket.y = canvas.height - 160;
  if (basket.x + basket.width > canvas.width) basket.x = canvas.width - basket.width;
}
window.addEventListener('resize', resizeCanvas);

let highScore = localStorage.getItem('highScore') || 0;

let assets = {};
let imagesToLoad = 7; // basket, tomato, brand, snow, bomb, magnet, shield
let loadedCount = 0;
let assetsLoaded = false;

const path = 'assaets/'; // Papka nomi to'g'riligini tekshiring

const loadAsset = (key, src) => {
  assets[key] = new Image();
  assets[key].src = path + src;
  assets[key].onload = () => { loadedCount++; if (loadedCount === imagesToLoad) assetsLoaded = true; };
  assets[key].onerror = () => { console.error(key + " yuklanmadi"); loadedCount++; };
};

// ASSETS yuklash
loadAsset('basket', 'basket.png');
loadAsset('tomato', 'products/tomatoFon.png');
loadAsset('brand', 'products/tomato.png');
loadAsset('snow', 'products/snow.png');
loadAsset('bomb', 'products/bomb.png');
loadAsset('magnet', 'products/magnet.png');
loadAsset('shield', 'products/shield.png');

let basket = { x: 0, y: 0, width: 120, height: 85, originalWidth: 120 };
let items = [];
let score = 0, currentDiamonds = 0, lives = 3, combo = 0;
let isGameOver = false;
let spawnInterval = null;

// Power-up taymerlari
let slowModeTimer = 0, magnetTimer = 0, shieldActive = false, shakeTimer = 0;
let gameSpeed = 7;

// RoundRect helper (ba'zi brauzerlarda yo'q bo'lishi mumkin)
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    this.beginPath();
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
    return this;
  };
}

function spawnItem() {
  if (isGameOver) return;

  let rand = Math.random();
  let type = 'tomato';

  if (rand < 0.12) type = 'bomb';
  else if (rand < 0.18) type = 'brand'; // Olmos
  else if (rand < 0.22) type = 'snow';  // Muzlatish
  else if (rand < 0.25) type = 'magnet';
  else if (rand < 0.28) type = 'shield';

  items.push({
    x: Math.random() * (canvas.width - 65),
    y: -80,
    width: 65,
    height: 65,
    type: type,
    speedMod: 0.8 + Math.random() * 0.7,
    drift: (Math.random() - 0.5) * 2
  });
}

function update() {
  if (isGameOver) return;

  ctx.save();

  let sx = 0, sy = 0;
  if (shakeTimer > 0) {
    sx = (Math.random() - 0.5) * 15;
    sy = (Math.random() - 0.5) * 15;
    shakeTimer--;
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.translate(sx, sy);

  let currentGlobalSpeed = (gameSpeed + (score / 250)) * (slowModeTimer > 0 ? 0.5 : 1);

  if (slowModeTimer > 0) {
    slowModeTimer--;
    ctx.fillStyle = "rgba(135, 206, 250, 0.2)";
    ctx.fillRect(-50, -50, canvas.width + 100, canvas.height + 100);
  }

  if (magnetTimer > 0) magnetTimer--;

  // Savat
  if (assetsLoaded && assets.basket.complete) {
    ctx.drawImage(assets.basket, basket.x, basket.y, basket.width, basket.height);

    if (shieldActive) {
      ctx.beginPath();
      ctx.strokeStyle = '#00f2ff';
      ctx.lineWidth = 4;
      ctx.arc(basket.x + basket.width / 2, basket.y + basket.height / 2, 70, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  for (let i = 0; i < items.length; i++) {
    let p = items[i];

    if (magnetTimer > 0 && (p.type === 'tomato' || p.type === 'brand')) {
      let dx = (basket.x + basket.width / 2) - (p.x + p.width / 2);
      p.x += dx * 0.1;
    }

    p.y += currentGlobalSpeed * p.speedMod;
    p.x += p.drift;

    if (p.x <= 0 || p.x + p.width >= canvas.width) p.drift *= -1;

    if (assetsLoaded && assets[p.type]) {
      ctx.drawImage(assets[p.type], p.x, p.y, p.width, p.height);
    }

    // To'qnashuv
    if (p.y + p.height >= basket.y + 10 && p.y <= basket.y + 50 &&
      p.x + p.width >= basket.x && p.x <= basket.x + basket.width) {

      if (p.type === 'bomb') {
        if (shieldActive) {
          shieldActive = false;
        } else {
          lives--;
          combo = 0;
          shakeTimer = 20;
        }
      } else {
        combo++;
        if (p.type === 'tomato') score += 10 + (Math.floor(combo / 5) * 5);
        else if (p.type === 'brand') { score += 100; currentDiamonds += 1; }
        else if (p.type === 'snow') slowModeTimer = 400;
        else if (p.type === 'magnet') magnetTimer = 420;
        else if (p.type === 'shield') shieldActive = true;
      }

      items.splice(i, 1); i--;
      if (lives <= 0) { gameOver(); break; }
      continue;
    }

    if (p.y > canvas.height) {
      if (p.type === 'tomato' || p.type === 'brand') {
        lives--;
        combo = 0;
        shakeTimer = 10;
      }
      items.splice(i, 1); i--;
      if (lives <= 0) { gameOver(); break; }
    }
  }

  ctx.restore();

  if (!isGameOver) {
    drawUI();
    requestAnimationFrame(update);
  }
}

function drawUI() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.roundRect(15, 15, 250, 150, 15);
  ctx.fill();

  ctx.fillStyle = 'white';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('🍅 Ball: ' + score, 30, 45);

  ctx.fillStyle = '#00f2ff';
  ctx.fillText('💎 Almaz: ' + currentDiamonds, 30, 75);

  ctx.fillStyle = '#ff4d4d';
  ctx.fillText('❤️ Jon: ' + '❤️'.repeat(Math.max(0, lives)), 30, 105);

  ctx.font = 'bold 14px sans-serif';
  if (slowModeTimer > 0) { ctx.fillStyle = '#00f2ff'; ctx.fillText('❄️ MUZLATISH AKTIV', 30, 135); }
  else if (magnetTimer > 0) { ctx.fillStyle = '#FFD700'; ctx.fillText('🧲 MAGNIT AKTIV', 30, 135); }
  else if (shieldActive) { ctx.fillStyle = '#00ff00'; ctx.fillText('🛡️ QALQON AKTIV', 30, 135); }

  if (combo > 2) {
    ctx.fillStyle = '#FFD700';
    ctx.font = 'italic bold 24px sans-serif';
    ctx.fillText('🔥 x' + combo, canvas.width - 100, 50);
  }
}

function moveBasket(e) {
  let clientX = e.touches ? e.touches[0].clientX : e.clientX;
  basket.x = clientX - basket.width / 2;
  if (basket.x < 0) basket.x = 0;
  if (basket.x + basket.width > canvas.width) basket.x = canvas.width - basket.width;
}

canvas.addEventListener('touchmove', (e) => { e.preventDefault(); moveBasket(e); }, { passive: false });
canvas.addEventListener('mousemove', moveBasket);

async function saveToServer() {
  try {
    const identity = localStorage.getItem("tomama_identity");
    if (!identity) return;

    // SERVER_URL index.html da global
    const res = await fetch(`${SERVER_URL}/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identity,
        score,
        earned_diamonds: currentDiamonds
      })
    });

    const data = await res.json();
    if (data?.ok) {
      // Server diamonds qaytarsa localga yozamiz
      if (typeof data.diamonds === "number") {
        localStorage.setItem("totalDiamonds", String(data.diamonds));
      }
      // Serverdagi highscore bilan ham sync
      if (typeof data.score === "number") {
        const hs = Math.max(Number(localStorage.getItem("highScore") || 0), data.score);
        localStorage.setItem("highScore", String(hs));
      }
    } else {
      console.error("Save failed:", data);
    }
  } catch (e) {
    console.error("Saqlashda xato:", e);
  }
}

function gameOver() {
  if (isGameOver) return;
  isGameOver = true;
  clearInterval(spawnInterval);

  // local highscore
  const localHS = Number(localStorage.getItem('highScore') || 0);
  if (score > localHS) localStorage.setItem('highScore', String(score));

  // serverga yuborish (awaitsiz, tez)
  saveToServer();

  // Telegram tugmasi
  if (window.Telegram?.WebApp) {
    const tg = window.Telegram.WebApp;
    tg.MainButton.setText(`NATIJA: ${score} 🍅 | MENYUGA QAYTISH`);
    tg.MainButton.show();
    tg.MainButton.onClick(() => {
      tg.MainButton.hide();
      window.location.reload();
    });
  } else {
    alert(`O'yin tugadi! Ball: ${score}`);
    window.location.reload();
  }
}

window.startGameLoop = function () {
  // canvas ko‘rinadigan bo‘lgach resize
  resizeCanvas();

  // basket boshlang‘ich
  basket.x = canvas.width / 2 - 60;
  basket.y = canvas.height - 160;

  isGameOver = false;
  score = 0; lives = 3; currentDiamonds = 0; combo = 0;
  items = [];
  slowModeTimer = 0; magnetTimer = 0; shieldActive = false; shakeTimer = 0;

  clearInterval(spawnInterval);
  spawnInterval = setInterval(spawnItem, 600);
  requestAnimationFrame(update);
};
