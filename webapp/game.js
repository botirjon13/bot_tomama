// game.js (Takomillashtirilgan: 5 ta funksiyalar qo‘shildi)
// 1) Game Over ekrani (alert o‘rniga) + Restart UI
// 2) Levels (ballga qarab qiyinlashish)
// 3) Golden Tomato + Rotten Tomato
// 4) Wave system (Normal -> Storm -> Reward)
// 5) Shop (Diamond economy): basket skin + glow trail + start bonuslar (eng yengil, localStorage asosida)


// SERVER_URL: index.html da window.SERVER_URL bo'lishi shart!
// game.js ichida qayta declare qilmaymiz.
const SERVER_URL = window.SERVER_URL; // <-- faqat shu

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// =======================
// CANVAS RESIZE
// =======================
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  basket.y = canvas.height - 160;
  if (basket.x + basket.width > canvas.width) basket.x = canvas.width - basket.width;
}
window.addEventListener('resize', resizeCanvas);

// =======================
// STORAGE HELPERS
// =======================
const LS = {
  getNumber(key, def = 0) {
    const v = Number(localStorage.getItem(key));
    return Number.isFinite(v) ? v : def;
  },
  setNumber(key, val) {
    localStorage.setItem(key, String(Math.max(0, Math.floor(val))));
  },
  getString(key, def = "") {
    const v = localStorage.getItem(key);
    return (typeof v === "string" && v.length) ? v : def;
  },
  setString(key, val) {
    localStorage.setItem(key, String(val));
  },
  getJSON(key, defObj) {
    try {
      const v = localStorage.getItem(key);
      if (!v) return defObj;
      return JSON.parse(v);
    } catch {
      return defObj;
    }
  },
  setJSON(key, obj) {
    localStorage.setItem(key, JSON.stringify(obj));
  }
};

let highScore = LS.getNumber('highScore', 0);

// =======================
// SHOP (LOCAL)
// =======================
const SHOP_KEY = "tomama_shop";
const shopState = LS.getJSON(SHOP_KEY, {
  // ownership
  owned: {
    skin_default: true,
    skin_premium: false,
    skin_neon: false,
    glow: false,
    start_magnet: false,
    start_life: false
  },
  // equipped
  equipped: {
    skin: "skin_default",
    glow: false,
    start_magnet: false,
    start_life: false
  }
});

function saveShop() {
  LS.setJSON(SHOP_KEY, shopState);
}

function getTotalDiamonds() {
  return LS.getNumber("totalDiamonds", 0);
}
function setTotalDiamonds(v) {
  LS.setNumber("totalDiamonds", v);
}
function addTotalDiamonds(delta) {
  setTotalDiamonds(getTotalDiamonds() + delta);
}

const SHOP_ITEMS = [
  { id: "skin_premium", title: "Premium savat skin", price: 50, type: "skin" },
  { id: "skin_neon", title: "Neon savat skin", price: 80, type: "skin" },
  { id: "glow", title: "Glow trail (effekt)", price: 40, type: "cosmetic" },
  { id: "start_magnet", title: "Start: 6s magnit", price: 35, type: "boost" },
  { id: "start_life", title: "Start: +1 jon", price: 60, type: "boost" }
];

let uiState = {
  shopOpen: false,
  // UI button rectangles are computed every frame
  buttons: {
    shop: null,
    restart: null,
    closeShop: null,
    buyRows: [] // array of rects per item
  }
};

// =======================
// ASSETS
// =======================
let assets = {};
let loadedCount = 0;
let assetsLoaded = false;

// Papka nomi to'g'riligini tekshiring
const path = 'assaets/';

const ASSET_LIST = [
  ['basket', 'basket.png'],
  ['tomato', 'products/tomatoFon.png'],
  ['brand', 'products/tomato.png'],
  ['snow', 'products/snow.png'],
  ['bomb', 'products/bomb.png'],
  ['magnet', 'products/magnet.png'],
  ['shield', 'products/shield.png'],

  // NEW: Golden + Rotten (agar yo'q bo'lsa, o'yin ishlayveradi)
  ['golden', 'products/golden.png'],
  ['rotten', 'products/rotten.png'],

  // OPTIONAL basket skins (agar qo'shsangiz ishlaydi)
  ['basket_premium', 'basket_premium.png'],
  ['basket_neon', 'basket_neon.png']
];

let imagesToLoad = ASSET_LIST.length;

const checkAssetsReady = () => {
  if (loadedCount >= imagesToLoad) assetsLoaded = true;
};

const loadAsset = (key, src) => {
  assets[key] = new Image();
  assets[key].src = path + src;

  assets[key].onload = () => {
    loadedCount++;
    checkAssetsReady();
  };

  assets[key].onerror = () => {
    console.error(key + " yuklanmadi:", path + src);
    loadedCount++;
    checkAssetsReady();
  };
};

for (const [k, s] of ASSET_LIST) loadAsset(k, s);

// =======================
// GAME STATE
// =======================
let basket = { x: 0, y: 0, width: 120, height: 85, originalWidth: 120 };
let items = [];
let particles = []; // glow trail particles (cosmetic)
let score = 0, currentDiamonds = 0, lives = 3, combo = 0;
let isGameOver = false;
let spawnInterval = null;

// Power-up taymerlari
let slowModeTimer = 0, magnetTimer = 0, shieldActive = false, shakeTimer = 0;
let doubleScoreTimer = 0;         // NEW
let diamondBoostTimer = 0;        // NEW
let gameSpeed = 7;

// Levels
let level = 1;
const LEVELS = [
  { min: 0,    level: 1, baseSpeed: 7.0,  spawnMs: 650, bombP: 0.12, brandP: 0.06 },
  { min: 500,  level: 2, baseSpeed: 7.8,  spawnMs: 600, bombP: 0.13, brandP: 0.06 },
  { min: 1200, level: 3, baseSpeed: 8.6,  spawnMs: 560, bombP: 0.14, brandP: 0.07 },
  { min: 2200, level: 4, baseSpeed: 9.6,  spawnMs: 520, bombP: 0.15, brandP: 0.07 },
  { min: 3500, level: 5, baseSpeed: 10.8, spawnMs: 480, bombP: 0.16, brandP: 0.08 }
];

function getLevelConfig(sc) {
  let cfg = LEVELS[0];
  for (const c of LEVELS) if (sc >= c.min) cfg = c;
  return cfg;
}

// Wave system
let wave = {
  phase: "normal",  // "normal" | "storm" | "reward"
  endsAt: 0,
  spawnMultiplier: 1.0,
  rewardNoBomb: false
};

function setWave(phase, durationMs) {
  wave.phase = phase;
  wave.endsAt = Date.now() + durationMs;

  if (phase === "normal") {
    wave.spawnMultiplier = 1.0;
    wave.rewardNoBomb = false;
  } else if (phase === "storm") {
    wave.spawnMultiplier = 0.55; // spawn tezroq (interval ko'paytirish uchun ms * multiplier -> kichrayadi)
    wave.rewardNoBomb = false;
  } else if (phase === "reward") {
    wave.spawnMultiplier = 0.85;
    wave.rewardNoBomb = true; // bomb chiqmasin
  }
}

function waveTick() {
  const now = Date.now();
  if (now < wave.endsAt) return;

  // cycle: normal (20s) -> storm (8s) -> reward (6s) -> normal ...
  if (wave.phase === "normal") setWave("storm", 8000);
  else if (wave.phase === "storm") setWave("reward", 6000);
  else setWave("normal", 20000);
}

// Spawn interval qayta sozlash
let activeSpawnMs = 600;

function resetSpawnTimer(ms) {
  activeSpawnMs = ms;
  clearInterval(spawnInterval);
  spawnInterval = setInterval(spawnItem, activeSpawnMs);
}

// RoundRect helper
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

// =======================
// SPAWN LOGIC (Levels + Waves + New Items)
// =======================
function spawnItem() {
  if (isGameOver) return;
  if (uiState.shopOpen) return; // shop ochiq bo'lsa o'yin davom etadi, lekin spawnni to'xtatamiz (premium UX)

  waveTick();

  const cfg = getLevelConfig(score);
  level = cfg.level;
  gameSpeed = cfg.baseSpeed;

  // spawn interval: level + wave
  const desiredMs = Math.max(220, Math.floor(cfg.spawnMs * wave.spawnMultiplier));
  if (Math.abs(desiredMs - activeSpawnMs) > 20) resetSpawnTimer(desiredMs);

  // Type probabilities
  // Old: bomb 0.12, brand 0.06, snow 0.04, magnet 0.03, shield 0.03
  // New items: golden 0.015, rotten 0.05 (later levels slightly higher)
  let rand = Math.random();
  let type = 'tomato';

  const pGolden = 0.012 + (level >= 4 ? 0.006 : 0.0);
  const pRotten = 0.04 + (level >= 3 ? 0.02 : 0.0);
  const pBomb = wave.rewardNoBomb ? 0.0 : cfg.bombP;
  const pBrand = cfg.brandP + (wave.phase === "reward" ? 0.04 : 0.0);
  const pSnow = 0.04;
  const pMagnet = 0.03;
  const pShield = 0.03;

  // cumulative
  const thresholds = [
    { t: pBomb, type: 'bomb' },
    { t: pBomb + pBrand, type: 'brand' },
    { t: pBomb + pBrand + pSnow, type: 'snow' },
    { t: pBomb + pBrand + pSnow + pMagnet, type: 'magnet' },
    { t: pBomb + pBrand + pSnow + pMagnet + pShield, type: 'shield' },
    { t: pBomb + pBrand + pSnow + pMagnet + pShield + pGolden, type: 'golden' },
    { t: pBomb + pBrand + pSnow + pMagnet + pShield + pGolden + pRotten, type: 'rotten' }
  ];

  for (const th of thresholds) {
    if (rand < th.t) { type = th.type; break; }
  }

  items.push({
    x: Math.random() * (canvas.width - 65),
    y: -80,
    width: 65,
    height: 65,
    type,
    speedMod: 0.8 + Math.random() * 0.7,
    drift: (Math.random() - 0.5) * 2
  });
}

// =======================
// RENDER HELPERS
// =======================
function drawGradientBackground() {
  // Premium: minimal gradient background
  const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0, "#0b0b0f");
  g.addColorStop(1, "#111827");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawFallbackItem(p) {
  // Asset bo'lmasa ham item ko'rinsin
  ctx.save();
  ctx.translate(p.x + p.width / 2, p.y + p.height / 2);
  ctx.beginPath();
  ctx.arc(0, 0, p.width / 2.2, 0, Math.PI * 2);
  if (p.type === "bomb") ctx.fillStyle = "#ff4d4d";
  else if (p.type === "brand") ctx.fillStyle = "#00f2ff";
  else if (p.type === "snow") ctx.fillStyle = "#7dd3fc";
  else if (p.type === "magnet") ctx.fillStyle = "#f59e0b";
  else if (p.type === "shield") ctx.fillStyle = "#22c55e";
  else if (p.type === "golden") ctx.fillStyle = "#fbbf24";
  else if (p.type === "rotten") ctx.fillStyle = "#a3e635";
  else ctx.fillStyle = "#ef4444";
  ctx.fill();
  ctx.restore();
}

function getBasketAssetKey() {
  const skin = shopState.equipped.skin;
  if (skin === "skin_premium") return "basket_premium";
  if (skin === "skin_neon") return "basket_neon";
  return "basket";
}

function drawBasket() {
  const key = getBasketAssetKey();
  const img = assets[key];

  if (assetsLoaded && img && img.complete) {
    ctx.drawImage(img, basket.x, basket.y, basket.width, basket.height);
  } else if (assetsLoaded && assets.basket && assets.basket.complete) {
    ctx.drawImage(assets.basket, basket.x, basket.y, basket.width, basket.height);
  } else {
    // fallback basket
    ctx.fillStyle = "#e5e7eb";
    ctx.roundRect(basket.x, basket.y, basket.width, basket.height, 14);
    ctx.fill();
  }

  // glow trail cosmetic (visual only)
  if (shopState.equipped.glow) {
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = "#00f2ff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(basket.x + basket.width / 2, basket.y + basket.height / 2, 62, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // shield ring
  if (shieldActive) {
    ctx.beginPath();
    ctx.strokeStyle = '#00f2ff';
    ctx.lineWidth = 4;
    ctx.arc(basket.x + basket.width / 2, basket.y + basket.height / 2, 70, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function addGlowParticles() {
  if (!shopState.equipped.glow) return;
  // basket atrofida kichik trail
  particles.push({
    x: basket.x + basket.width / 2 + (Math.random() - 0.5) * 30,
    y: basket.y + basket.height / 2 + (Math.random() - 0.5) * 15,
    r: 6 + Math.random() * 6,
    life: 24
  });
}

function updateParticles() {
  if (!particles.length) return;
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    p.life -= 1;
    p.r *= 0.96;
    p.y += 0.4;
    if (p.life <= 0 || p.r < 1) { particles.splice(i, 1); i--; }
  }
}

function drawParticles() {
  if (!particles.length) return;
  ctx.save();
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / 24) * 0.35;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = "#00f2ff";
    ctx.fill();
  }
  ctx.restore();
}

// =======================
// GAME LOOP
// =======================
function update() {
  if (isGameOver) {
    // Game over ekranini chizishda ham frame yuradi (premium)
    renderFrame();
    requestAnimationFrame(update);
    return;
  }

  renderFrame();
  requestAnimationFrame(update);
}

function renderFrame() {
  ctx.save();

  let sx = 0, sy = 0;
  if (shakeTimer > 0) {
    sx = (Math.random() - 0.5) * 15;
    sy = (Math.random() - 0.5) * 15;
    shakeTimer--;
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawGradientBackground();
  ctx.translate(sx, sy);

  // overlay effects timers
  let currentGlobalSpeed = (gameSpeed + (score / 250)) * (slowModeTimer > 0 ? 0.5 : 1);

  if (slowModeTimer > 0) {
    slowModeTimer--;
    ctx.fillStyle = "rgba(125, 211, 252, 0.14)";
    ctx.fillRect(-50, -50, canvas.width + 100, canvas.height + 100);
  }
  if (magnetTimer > 0) magnetTimer--;
  if (doubleScoreTimer > 0) doubleScoreTimer--;
  if (diamondBoostTimer > 0) diamondBoostTimer--;

  // basket
  drawBasket();
  addGlowParticles();
  updateParticles();
  drawParticles();

  // items
  for (let i = 0; i < items.length; i++) {
    let it = items[i];

    // magnet effect
    if (magnetTimer > 0 && (it.type === 'tomato' || it.type === 'brand' || it.type === 'golden')) {
      let dx = (basket.x + basket.width / 2) - (it.x + it.width / 2);
      it.x += dx * 0.1;
    }

    it.y += currentGlobalSpeed * it.speedMod;
    it.x += it.drift;

    if (it.x <= 0 || it.x + it.width >= canvas.width) it.drift *= -1;

    // draw
    if (assetsLoaded && assets[it.type] && assets[it.type].complete) {
      ctx.drawImage(assets[it.type], it.x, it.y, it.width, it.height);
    } else {
      drawFallbackItem(it);
    }

    // collision
    if (
      it.y + it.height >= basket.y + 10 && it.y <= basket.y + 50 &&
      it.x + it.width >= basket.x && it.x <= basket.x + basket.width
    ) {
      handleCatch(it.type);
      items.splice(i, 1); i--;
      if (lives <= 0) { gameOver(); break; }
      continue;
    }

    // missed
    if (it.y > canvas.height) {
      if (it.type === 'tomato' || it.type === 'brand' || it.type === 'golden') {
        lives--;
        combo = 0;
        shakeTimer = 10;
      }
      // rotten/snow/magnet/shield/bomb missed -> no penalty
      items.splice(i, 1); i--;
      if (lives <= 0) { gameOver(); break; }
    }
  }

  ctx.restore();

  drawUI();
  if (uiState.shopOpen) drawShopOverlay();
  if (isGameOver) drawGameOverOverlay();
}

// =======================
// SCORING / ITEMS EFFECTS
// =======================
function handleCatch(type) {
  if (type === 'bomb') {
    if (shieldActive) {
      shieldActive = false;
    } else {
      lives--;
      combo = 0;
      shakeTimer = 20;
    }
    return;
  }

  // rotten: penalty
  if (type === "rotten") {
    combo = 0;
    score = Math.max(0, score - 50);
    shakeTimer = 12;
    return;
  }

  // combo increases for positive catches only
  combo++;

  const scoreMultiplier = (doubleScoreTimer > 0 ? 2 : 1);

  if (type === 'tomato') {
    const base = 10 + (Math.floor(combo / 5) * 5);
    score += base * scoreMultiplier;
  } else if (type === 'brand') {
    score += 100 * scoreMultiplier;
    const d = (diamondBoostTimer > 0 ? 2 : 1);
    currentDiamonds += d;
  } else if (type === 'golden') {
    // Golden Tomato: big wow
    score += 250 * scoreMultiplier;
    const d = (diamondBoostTimer > 0 ? 2 : 1);
    currentDiamonds += d; // 1 diamond bonus
    // short double-score as micro reward
    doubleScoreTimer = Math.max(doubleScoreTimer, 180); // ~3s at 60fps
  } else if (type === 'snow') {
    slowModeTimer = 400;
  } else if (type === 'magnet') {
    magnetTimer = 420;
  } else if (type === 'shield') {
    shieldActive = true;
  }
}

// =======================
// UI (HUD + Buttons)
// =======================
function drawUI() {
  // Top-left HUD
  ctx.save();

  // panel
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.roundRect(15, 15, 280, 180, 16);
  ctx.fill();

  ctx.fillStyle = 'white';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('🍅 Ball: ' + score, 30, 45);

  ctx.fillStyle = '#00f2ff';
  ctx.fillText('💎 O‘yin diamond: ' + currentDiamonds, 30, 75);

  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('🏆 HighScore: ' + Math.max(highScore, LS.getNumber('highScore', 0)), 30, 105);

  ctx.fillStyle = '#a7f3d0';
  ctx.fillText('📶 Level: ' + level + '  (' + wave.phase.toUpperCase() + ')', 30, 130);

  ctx.fillStyle = '#ff4d4d';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('❤️ Jon: ' + '❤️'.repeat(Math.max(0, lives)), 30, 160);

  // status line
  ctx.font = 'bold 14px sans-serif';
  if (slowModeTimer > 0) { ctx.fillStyle = '#7dd3fc'; ctx.fillText('❄️ MUZLATISH AKTIV', 320, 40); }
  else if (magnetTimer > 0) { ctx.fillStyle = '#FFD700'; ctx.fillText('🧲 MAGNIT AKTIV', 320, 40); }
  else if (shieldActive) { ctx.fillStyle = '#22c55e'; ctx.fillText('🛡️ QALQON AKTIV', 320, 40); }

  if (doubleScoreTimer > 0) { ctx.fillStyle = '#fbbf24'; ctx.fillText('✨ 2x BALL', 320, 65); }
  if (diamondBoostTimer > 0) { ctx.fillStyle = '#60a5fa'; ctx.fillText('💎 2x DIAMOND', 320, 90); }

  if (combo > 2) {
    ctx.fillStyle = '#FFD700';
    ctx.font = 'italic bold 24px sans-serif';
    ctx.fillText('🔥 x' + combo, canvas.width - 120, 50);
  }

  // Top-right shop button
  const bw = 140, bh = 44;
  const bx = canvas.width - bw - 16;
  const by = 16;

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.roundRect(bx, by, bw, bh, 12);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText("🛒 SHOP", bx + 18, by + 28);

  uiState.buttons.shop = { x: bx, y: by, w: bw, h: bh };

  ctx.restore();
}

// =======================
// SHOP OVERLAY
// =======================
function drawShopOverlay() {
  ctx.save();

  // dim
  ctx.fillStyle = "rgba(0,0,0,0.70)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const w = Math.min(560, canvas.width - 40);
  const h = Math.min(520, canvas.height - 60);
  const x = (canvas.width - w) / 2;
  const y = (canvas.height - h) / 2;

  // card
  ctx.fillStyle = "rgba(17,24,39,0.95)";
  ctx.roundRect(x, y, w, h, 18);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // header
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText("Tomama Shop", x + 22, y + 40);

  const total = getTotalDiamonds();
  ctx.fillStyle = "#00f2ff";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText(`💎 Umumiy diamond: ${total}`, x + 22, y + 68);

  // close button
  const cbw = 110, cbh = 40;
  const cbx = x + w - cbw - 18;
  const cby = y + 22;

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.roundRect(cbx, cby, cbw, cbh, 12);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 15px sans-serif";
  ctx.fillText("YOPISH", cbx + 24, cby + 26);

  uiState.buttons.closeShop = { x: cbx, y: cby, w: cbw, h: cbh };

  // items list
  uiState.buttons.buyRows = [];
  let rowY = y + 100;
  const rowH = 62;

  ctx.font = "bold 16px sans-serif";
  for (let i = 0; i < SHOP_ITEMS.length; i++) {
    const it = SHOP_ITEMS[i];
    const owned = !!shopState.owned[it.id];
    const equipped =
      (it.type === "skin" && shopState.equipped.skin === it.id) ||
      (it.id === "glow" && shopState.equipped.glow) ||
      (it.id === "start_magnet" && shopState.equipped.start_magnet) ||
      (it.id === "start_life" && shopState.equipped.start_life);

    // row bg
    ctx.fillStyle = "rgba(0,0,0,0.30)";
    ctx.roundRect(x + 18, rowY, w - 36, rowH, 14);
    ctx.fill();

    // title
    ctx.fillStyle = "#ffffff";
    ctx.fillText(it.title, x + 34, rowY + 26);

    // price / state
    ctx.font = "bold 14px sans-serif";
    if (!owned) {
      ctx.fillStyle = "#00f2ff";
      ctx.fillText(`Narx: ${it.price} 💎`, x + 34, rowY + 48);
    } else {
      ctx.fillStyle = "#a7f3d0";
      ctx.fillText(`Sizda bor`, x + 34, rowY + 48);
    }

    // action button
    const abw = 130, abh = 40;
    const abx = x + w - abw - 30;
    const aby = rowY + 11;

    let label = "SOTIB OLISH";
    if (owned && it.type === "skin") label = equipped ? "TANLANGAN" : "TANLASH";
    if (owned && it.id === "glow") label = equipped ? "YONIQ" : "YOQISH";
    if (owned && it.id === "start_magnet") label = equipped ? "YONIQ" : "YOQISH";
    if (owned && it.id === "start_life") label = equipped ? "YONIQ" : "YOQISH";
    if (!owned && total < it.price) label = "DIAMOND YETARLI EMAS";

    const disabled = (!owned && total < it.price) || (owned && label === "TANLANGAN");

    ctx.fillStyle = disabled ? "rgba(255,255,255,0.08)" : "rgba(0,242,255,0.18)";
    ctx.roundRect(abx, aby, abw, abh, 12);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.stroke();

    ctx.fillStyle = disabled ? "rgba(255,255,255,0.35)" : "#ffffff";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(label, abx + 12, aby + 25);

    uiState.buttons.buyRows.push({
      id: it.id,
      x: abx, y: aby, w: abw, h: abh,
      disabled
    });

    // reset font for next row
    ctx.font = "bold 16px sans-serif";
    rowY += rowH + 14;
  }

  // hint footer
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "13px sans-serif";
  ctx.fillText("Eslatma: Shop tanlovlari localStorage’da saqlanadi.", x + 22, y + h - 22);

  ctx.restore();
}

function shopAction(itemId) {
  const item = SHOP_ITEMS.find(x => x.id === itemId);
  if (!item) return;

  const owned = !!shopState.owned[itemId];
  const total = getTotalDiamonds();

  if (!owned) {
    if (total < item.price) return;
    setTotalDiamonds(total - item.price);
    shopState.owned[itemId] = true;

    // auto-equip for skins
    if (item.type === "skin") {
      shopState.equipped.skin = itemId;
    } else if (itemId === "glow") {
      shopState.equipped.glow = true;
    } else if (itemId === "start_magnet") {
      shopState.equipped.start_magnet = true;
    } else if (itemId === "start_life") {
      shopState.equipped.start_life = true;
    }
    saveShop();
    return;
  }

  // already owned -> toggle/equip
  if (item.type === "skin") {
    shopState.equipped.skin = itemId;
  } else if (itemId === "glow") {
    shopState.equipped.glow = !shopState.equipped.glow;
  } else if (itemId === "start_magnet") {
    shopState.equipped.start_magnet = !shopState.equipped.start_magnet;
  } else if (itemId === "start_life") {
    shopState.equipped.start_life = !shopState.equipped.start_life;
  }
  saveShop();
}

// =======================
// INPUT
// =======================
function moveBasket(e) {
  if (isGameOver) return;
  if (uiState.shopOpen) return;

  let clientX = e.touches ? e.touches[0].clientX : e.clientX;
  basket.x = clientX - basket.width / 2;
  if (basket.x < 0) basket.x = 0;
  if (basket.x + basket.width > canvas.width) basket.x = canvas.width - basket.width;
}

canvas.addEventListener('touchmove', (e) => { e.preventDefault(); moveBasket(e); }, { passive: false });
canvas.addEventListener('mousemove', moveBasket);

// click/tap handler for UI
function pointFromEvent(e) {
  const isTouch = !!e.touches;
  const p = isTouch ? e.touches[0] : e;
  return { x: p.clientX, y: p.clientY };
}
function inRect(px, py, r) {
  if (!r) return false;
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

function handleTap(e) {
  const { x, y } = pointFromEvent(e);

  // Shop toggle
  if (!uiState.shopOpen && inRect(x, y, uiState.buttons.shop)) {
    uiState.shopOpen = true;
    return;
  }

  if (uiState.shopOpen) {
    // close
    if (inRect(x, y, uiState.buttons.closeShop)) {
      uiState.shopOpen = false;
      return;
    }
    // buy rows
    for (const r of uiState.buttons.buyRows) {
      if (!r.disabled && inRect(x, y, r)) {
        shopAction(r.id);
        return;
      }
    }
    return;
  }

  // Game over restart button
  if (isGameOver && inRect(x, y, uiState.buttons.restart)) {
    restartGame();
  }
}

canvas.addEventListener('mousedown', handleTap);
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handleTap(e); }, { passive: false });

// =======================
// SERVER SAVE
// =======================
async function saveToServer() {
  try {
    const identity = localStorage.getItem("tomama_identity");
    if (!identity) return;

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
      } else {
        // fallback: local total += current earned
        addTotalDiamonds(currentDiamonds);
      }

      // Serverdagi highscore bilan ham sync
      if (typeof data.score === "number") {
        const hs = Math.max(LS.getNumber("highScore", 0), data.score);
        LS.setNumber("highScore", hs);
      }
    } else {
      console.error("Save failed:", data);
      // fallback local
      addTotalDiamonds(currentDiamonds);
    }
  } catch (e) {
    console.error("Saqlashda xato:", e);
    // fallback local
    addTotalDiamonds(currentDiamonds);
  }
}

// =======================
// GAME OVER SCREEN (Premium)
// =======================
function drawGameOverOverlay() {
  ctx.save();

  // dim overlay
  ctx.fillStyle = "rgba(0,0,0,0.72)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const w = Math.min(520, canvas.width - 40);
  const h = 320;
  const x = (canvas.width - w) / 2;
  const y = (canvas.height - h) / 2;

  ctx.fillStyle = "rgba(17,24,39,0.95)";
  ctx.roundRect(x, y, w, h, 18);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px sans-serif";
  ctx.fillText("O‘yin tugadi", x + 22, y + 52);

  ctx.fillStyle = "rgba(255,255,255,0.70)";
  ctx.font = "16px sans-serif";
  ctx.fillText("Natijangiz va mukofotlar:", x + 22, y + 82);

  const hs = LS.getNumber('highScore', 0);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText(`🍅 Ball: ${score}`, x + 22, y + 120);

  ctx.fillStyle = "#ffd700";
  ctx.fillText(`🏆 HighScore: ${Math.max(hs, score)}`, x + 22, y + 150);

  ctx.fillStyle = "#00f2ff";
  ctx.fillText(`💎 Olingan diamond: ${currentDiamonds}`, x + 22, y + 180);

  ctx.fillStyle = "rgba(255,255,255,0.60)";
  ctx.font = "14px sans-serif";
  ctx.fillText("Restart bosish orqali qayta boshlashingiz mumkin.", x + 22, y + 210);

  // Restart button
  const bw = 220, bh = 52;
  const bx = x + (w - bw) / 2;
  const by = y + h - bh - 24;

  ctx.fillStyle = "rgba(0,242,255,0.20)";
  ctx.roundRect(bx, by, bw, bh, 14);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText("Qayta boshlash", bx + 52, by + 32);

  uiState.buttons.restart = { x: bx, y: by, w: bw, h: bh };

  ctx.restore();
}

function restartGame() {
  // Telegram MainButton bo‘lsa, hammasini tozalab restart
  if (window.Telegram?.WebApp) {
    const tg = window.Telegram.WebApp;
    try { tg.MainButton.hide(); } catch {}
  }
  window.startGameLoop();
}

// =======================
// GAME OVER
// =======================
function gameOver() {
  if (isGameOver) return;
  isGameOver = true;
  clearInterval(spawnInterval);

  // local highscore
  const localHS = LS.getNumber('highScore', 0);
  if (score > localHS) LS.setNumber('highScore', score);

  highScore = LS.getNumber('highScore', 0);

  // serverga yuborish (awaitsiz, tez)
  saveToServer();

  // Telegram tugmasi (qoladi, lekin overlay ham bor)
  if (window.Telegram?.WebApp) {
    const tg = window.Telegram.WebApp;
    tg.MainButton.setText(`NATIJA: ${score} 🍅 | QAYTA BOSHLASH`);
    tg.MainButton.show();
    tg.MainButton.onClick(() => {
      tg.MainButton.hide();
      restartGame();
    });
  }
}

// =======================
// START GAME LOOP (Public)
// =======================
window.startGameLoop = function () {
  resizeCanvas();

  // basket start
  basket.x = canvas.width / 2 - 60;
  basket.y = canvas.height - 160;

  // reset
  isGameOver = false;
  uiState.shopOpen = false;

  score = 0;
  lives = 3;
  currentDiamonds = 0;
  combo = 0;
  items = [];
  particles = [];

  slowModeTimer = 0;
  magnetTimer = 0;
  shieldActive = false;
  shakeTimer = 0;
  doubleScoreTimer = 0;
  diamondBoostTimer = 0;

  // apply shop start bonuses (equipped)
  if (shopState.equipped.start_magnet) {
    magnetTimer = 360; // ~6s
  }
  if (shopState.equipped.start_life) {
    lives += 1;
  }

  // wave init
  setWave("normal", 20000);

  // level/spawn init
  const cfg = getLevelConfig(score);
  level = cfg.level;
  gameSpeed = cfg.baseSpeed;

  resetSpawnTimer(cfg.spawnMs);
  requestAnimationFrame(update);
};

// Auto-start agar siz xohlasangiz (ixtiyoriy)
// window.startGameLoop();
