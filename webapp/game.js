// game.js (STABLE PREMIUM v2 - o'ynasa bo'ladigan, buzmaydigan variant)
// ✅ 5 ta funksiya:
// 1) Game Over overlay + Restart UI
// 2) Levels (ballga qarab qiyinlashadi)
// 3) Golden Tomato + Rotten Tomato
// 4) Wave system (Normal -> Storm -> Reward)
// 5) Shop (Diamond economy): basket skin + glow + start bonus (localStorage)
//
// Talab: index.html da window.SERVER_URL bo'lishi shart.
const SERVER_URL = window.SERVER_URL;

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// =======================
// RESIZE
// =======================
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  basket.y = canvas.height - 160;
  if (basket.x + basket.width > canvas.width) basket.x = canvas.width - basket.width;
}
window.addEventListener("resize", resizeCanvas);

// =======================
// STORAGE HELPERS
// =======================
const LS = {
  n(key, def = 0) {
    const v = Number(localStorage.getItem(key));
    return Number.isFinite(v) ? v : def;
  },
  setN(key, val) {
    localStorage.setItem(key, String(Math.max(0, Math.floor(val))));
  },
  s(key, def = "") {
    const v = localStorage.getItem(key);
    return typeof v === "string" ? v : def;
  },
  setS(key, val) {
    localStorage.setItem(key, String(val));
  },
  j(key, defObj) {
    try {
      const v = localStorage.getItem(key);
      if (!v) return defObj;
      return JSON.parse(v);
    } catch {
      return defObj;
    }
  },
  setJ(key, obj) {
    localStorage.setItem(key, JSON.stringify(obj));
  },
};

let highScore = LS.n("highScore", 0);

// =======================
// ASSETS
// =======================
let assets = {};
let loadedCount = 0;
let assetsLoaded = false;

// Sizning papka nomingiz shunaqa ekan: assaets/
const path = "assaets/";

const ASSET_LIST = [
  ["basket", "basket.png"],
  ["tomato", "products/tomatoFon.png"],
  ["brand", "products/tomato.png"],
  ["snow", "products/snow.png"],
  ["bomb", "products/bomb.png"],
  ["magnet", "products/magnet.png"],
  ["shield", "products/shield.png"],

  // NEW (bo'lmasa ham ishlaydi)
  ["golden", "products/golden.png"],
  ["rotten", "products/rotten.png"],

  // OPTIONAL skins (bo'lmasa default basket ishlaydi)
  ["basket_premium", "basket_premium.png"],
  ["basket_neon", "basket_neon.png"],
];

const imagesToLoad = ASSET_LIST.length;

function checkAssetsReady() {
  if (loadedCount >= imagesToLoad) assetsLoaded = true;
}

function loadAsset(key, src) {
  assets[key] = new Image();
  assets[key].src = path + src;

  assets[key].onload = () => {
    loadedCount++;
    checkAssetsReady();
  };
  assets[key].onerror = () => {
    console.warn(key + " yuklanmadi:", path + src);
    loadedCount++;
    checkAssetsReady();
  };
}

ASSET_LIST.forEach(([k, s]) => loadAsset(k, s));

// roundRect helper
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
// SHOP (LOCAL)
// =======================
const SHOP_KEY = "tomama_shop_v2";
const shopState = LS.j(SHOP_KEY, {
  owned: {
    skin_default: true,
    skin_premium: false,
    skin_neon: false,
    glow: false,
    start_magnet: false,
    start_life: false,
  },
  equipped: {
    skin: "skin_default",
    glow: false,
    start_magnet: false,
    start_life: false,
  },
});

function saveShop() {
  LS.setJ(SHOP_KEY, shopState);
}

function getTotalDiamonds() {
  return LS.n("totalDiamonds", 0);
}
function setTotalDiamonds(v) {
  LS.setN("totalDiamonds", v);
}
function addTotalDiamonds(delta) {
  setTotalDiamonds(getTotalDiamonds() + delta);
}

const SHOP_ITEMS = [
  { id: "skin_premium", title: "Premium savat skin", price: 50, type: "skin" },
  { id: "skin_neon", title: "Neon savat skin", price: 80, type: "skin" },
  { id: "glow", title: "Glow effekt", price: 40, type: "toggle" },
  { id: "start_magnet", title: "Start: 6s magnit", price: 35, type: "toggle" },
  { id: "start_life", title: "Start: +1 jon", price: 60, type: "toggle" },
];

const ui = {
  shopOpen: false,
  buttons: {
    shop: null,
    closeShop: null,
    buyRows: [],
    restart: null,
  },
};

// =======================
// GAME STATE
// =======================
let basket = { x: 0, y: 0, width: 120, height: 85, originalWidth: 120 };
let items = [];
let score = 0,
  currentDiamonds = 0,
  lives = 3,
  combo = 0;

let isGameOver = false;

// Power-up timers
let slowModeTimer = 0,
  magnetTimer = 0,
  shieldActive = false,
  shakeTimer = 0;

// New timers
let doubleScoreTimer = 0;
let diamondBoostTimer = 0;

// Difficulty base
let baseSpeed = 7;
let level = 1;

// Animation loop control
let rafId = null;

// Spawn scheduler (stable)
let nextSpawnAt = 0;

// =======================
// LEVELS
// =======================
const LEVELS = [
  { min: 0, level: 1, baseSpeed: 7.0, spawnMs: 650, bombP: 0.12, brandP: 0.06 },
  { min: 500, level: 2, baseSpeed: 7.8, spawnMs: 600, bombP: 0.13, brandP: 0.06 },
  { min: 1200, level: 3, baseSpeed: 8.6, spawnMs: 560, bombP: 0.14, brandP: 0.07 },
  { min: 2200, level: 4, baseSpeed: 9.6, spawnMs: 520, bombP: 0.15, brandP: 0.07 },
  { min: 3500, level: 5, baseSpeed: 10.8, spawnMs: 480, bombP: 0.16, brandP: 0.08 },
];

function levelCfg(sc) {
  let cfg = LEVELS[0];
  for (const c of LEVELS) if (sc >= c.min) cfg = c;
  return cfg;
}

// =======================
// WAVES (stable)
// =======================
let wave = {
  phase: "normal", // normal | storm | reward
  endsAt: 0,
};

function setWave(phase, durationMs, now) {
  wave.phase = phase;
  wave.endsAt = now + durationMs;
}

function waveTick(now) {
  if (now < wave.endsAt) return;

  // cycle
  if (wave.phase === "normal") setWave("storm", 8000, now);
  else if (wave.phase === "storm") setWave("reward", 6000, now);
  else setWave("normal", 20000, now);
}

// =======================
// SPAWN ITEM (probabilities)
// =======================
function spawnItem() {
  // type probabilities (level+wave)
  const cfg = levelCfg(score);
  level = cfg.level;
  baseSpeed = cfg.baseSpeed;

  const rewardNoBomb = wave.phase === "reward";

  const pBomb = rewardNoBomb ? 0 : cfg.bombP;
  const pBrand = cfg.brandP + (wave.phase === "reward" ? 0.04 : 0.0);
  const pSnow = 0.04;
  const pMagnet = 0.03;
  const pShield = 0.03;
  const pGolden = 0.012 + (level >= 4 ? 0.006 : 0.0);
  const pRotten = 0.04 + (level >= 3 ? 0.02 : 0.0);

  let r = Math.random();
  let type = "tomato";

  const t1 = pBomb;
  const t2 = t1 + pBrand;
  const t3 = t2 + pSnow;
  const t4 = t3 + pMagnet;
  const t5 = t4 + pShield;
  const t6 = t5 + pGolden;
  const t7 = t6 + pRotten;

  if (r < t1) type = "bomb";
  else if (r < t2) type = "brand";
  else if (r < t3) type = "snow";
  else if (r < t4) type = "magnet";
  else if (r < t5) type = "shield";
  else if (r < t6) type = "golden";
  else if (r < t7) type = "rotten";
  else type = "tomato";

  items.push({
    x: Math.random() * (canvas.width - 65),
    y: -80,
    width: 65,
    height: 65,
    type,
    speedMod: 0.8 + Math.random() * 0.7,
    drift: (Math.random() - 0.5) * 2,
  });
}

// =======================
// DRAW HELPERS
// =======================
function drawBackground() {
  // premium gradient background
  const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0, "#0b0b0f");
  g.addColorStop(1, "#111827");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function basketAssetKey() {
  const skin = shopState.equipped.skin;
  if (skin === "skin_premium") return "basket_premium";
  if (skin === "skin_neon") return "basket_neon";
  return "basket";
}

function drawBasket() {
  const key = basketAssetKey();
  const img = assets[key];

  if (assetsLoaded && img && img.complete) ctx.drawImage(img, basket.x, basket.y, basket.width, basket.height);
  else if (assetsLoaded && assets.basket?.complete) ctx.drawImage(assets.basket, basket.x, basket.y, basket.width, basket.height);
  else {
    ctx.fillStyle = "#e5e7eb";
    ctx.roundRect(basket.x, basket.y, basket.width, basket.height, 14);
    ctx.fill();
  }

  // glow cosmetic
  if (shopState.equipped.glow) {
    ctx.save();
    ctx.globalAlpha = 0.35;
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
    ctx.strokeStyle = "#00f2ff";
    ctx.lineWidth = 4;
    ctx.arc(basket.x + basket.width / 2, basket.y + basket.height / 2, 70, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawFallbackItem(p) {
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

// =======================
// GAME LOGIC
// =======================
function handleCatch(type) {
  if (type === "bomb") {
    if (shieldActive) shieldActive = false;
    else {
      lives--;
      combo = 0;
      shakeTimer = 20;
    }
    return;
  }

  if (type === "rotten") {
    combo = 0;
    score = Math.max(0, score - 50);
    shakeTimer = 12;
    return;
  }

  combo++;
  const mult = doubleScoreTimer > 0 ? 2 : 1;

  if (type === "tomato") {
    score += (10 + Math.floor(combo / 5) * 5) * mult;
  } else if (type === "brand") {
    score += 100 * mult;
    currentDiamonds += diamondBoostTimer > 0 ? 2 : 1;
  } else if (type === "golden") {
    score += 250 * mult;
    currentDiamonds += diamondBoostTimer > 0 ? 2 : 1;
    doubleScoreTimer = Math.max(doubleScoreTimer, 180); // ~3s
  } else if (type === "snow") {
    slowModeTimer = 400;
  } else if (type === "magnet") {
    magnetTimer = 420;
  } else if (type === "shield") {
    shieldActive = true;
  }
}

async function saveToServer() {
  try {
    const identity = localStorage.getItem("tomama_identity");
    if (!identity) {
      addTotalDiamonds(currentDiamonds); // guest fallback
      return;
    }

    const res = await fetch(`${SERVER_URL}/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identity,
        score,
        earned_diamonds: currentDiamonds,
      }),
    });

    const data = await res.json();
    if (data?.ok) {
      if (typeof data.diamonds === "number") localStorage.setItem("totalDiamonds", String(data.diamonds));
      else addTotalDiamonds(currentDiamonds);

      if (typeof data.score === "number") {
        const hs = Math.max(LS.n("highScore", 0), data.score);
        LS.setN("highScore", hs);
      }
    } else {
      addTotalDiamonds(currentDiamonds);
    }
  } catch (e) {
    console.warn("save error:", e);
    addTotalDiamonds(currentDiamonds);
  }
}

function gameOver() {
  if (isGameOver) return;
  isGameOver = true;

  if (score > LS.n("highScore", 0)) LS.setN("highScore", score);
  highScore = LS.n("highScore", 0);

  saveToServer();

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

function restartGame() {
  if (window.Telegram?.WebApp) {
    try { window.Telegram.WebApp.MainButton.hide(); } catch {}
  }
  window.startGameLoop();
}

// =======================
// DRAW UI
// =======================
function drawHUD() {
  // left panel
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.roundRect(15, 15, 300, 180, 16);
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.font = "bold 20px sans-serif";
  ctx.fillText("🍅 Ball: " + score, 30, 45);

  ctx.fillStyle = "#00f2ff";
  ctx.fillText("💎 O‘yin diamond: " + currentDiamonds, 30, 75);

  ctx.fillStyle = "#ffd700";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText("🏆 HighScore: " + Math.max(highScore, score), 30, 105);

  ctx.fillStyle = "#a7f3d0";
  ctx.fillText("📶 Level: " + level + "  (" + wave.phase.toUpperCase() + ")", 30, 130);

  ctx.fillStyle = "#ff4d4d";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText("❤️ Jon: " + "❤️".repeat(Math.max(0, lives)), 30, 160);

  // right top Shop button
  const bw = 140, bh = 44;
  const bx = canvas.width - bw - 16;
  const by = 16;

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.roundRect(bx, by, bw, bh, 12);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = "#fff";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText("🛒 SHOP", bx + 18, by + 28);

  ui.buttons.shop = { x: bx, y: by, w: bw, h: bh };

  // status line
  ctx.font = "bold 14px sans-serif";
  if (slowModeTimer > 0) { ctx.fillStyle = "#7dd3fc"; ctx.fillText("❄️ MUZLATISH", 330, 40); }
  else if (magnetTimer > 0) { ctx.fillStyle = "#FFD700"; ctx.fillText("🧲 MAGNIT", 330, 40); }
  else if (shieldActive) { ctx.fillStyle = "#22c55e"; ctx.fillText("🛡️ QALQON", 330, 40); }

  if (doubleScoreTimer > 0) { ctx.fillStyle = "#fbbf24"; ctx.fillText("✨ 2x BALL", 330, 62); }
  if (diamondBoostTimer > 0) { ctx.fillStyle = "#60a5fa"; ctx.fillText("💎 2x DIAMOND", 330, 82); }

  if (combo > 2) {
    ctx.fillStyle = "#FFD700";
    ctx.font = "italic bold 24px sans-serif";
    ctx.fillText("🔥 x" + combo, canvas.width - 120, 50);
  }
}

function drawShopOverlay() {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.72)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const w = Math.min(560, canvas.width - 40);
  const h = Math.min(520, canvas.height - 60);
  const x = (canvas.width - w) / 2;
  const y = (canvas.height - h) / 2;

  ctx.fillStyle = "rgba(17,24,39,0.95)";
  ctx.roundRect(x, y, w, h, 18);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = "#fff";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText("Tomama Shop", x + 22, y + 40);

  const total = getTotalDiamonds();
  ctx.fillStyle = "#00f2ff";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText(`💎 Umumiy diamond: ${total}`, x + 22, y + 68);

  // close
  const cbw = 110, cbh = 40;
  const cbx = x + w - cbw - 18;
  const cby = y + 22;

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.roundRect(cbx, cby, cbw, cbh, 12);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 15px sans-serif";
  ctx.fillText("YOPISH", cbx + 24, cby + 26);
  ui.buttons.closeShop = { x: cbx, y: cby, w: cbw, h: cbh };

  // rows
  ui.buttons.buyRows = [];
  let rowY = y + 100;
  const rowH = 62;

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

    ctx.fillStyle = "#fff";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText(it.title, x + 34, rowY + 26);

    ctx.font = "bold 14px sans-serif";
    if (!owned) {
      ctx.fillStyle = "#00f2ff";
      ctx.fillText(`Narx: ${it.price} 💎`, x + 34, rowY + 48);
    } else {
      ctx.fillStyle = "#a7f3d0";
      ctx.fillText(`Sizda bor`, x + 34, rowY + 48);
    }

    const abw = 140, abh = 40;
    const abx = x + w - abw - 30;
    const aby = rowY + 11;

    let label = "SOTIB OLISH";
    if (owned && it.type === "skin") label = equipped ? "TANLANGAN" : "TANLASH";
    if (owned && it.type !== "skin") label = equipped ? "YONIQ" : "YOQISH";
    if (!owned && total < it.price) label = "YETARLI EMAS";

    const disabled = (!owned && total < it.price) || (owned && label === "TANLANGAN");

    ctx.fillStyle = disabled ? "rgba(255,255,255,0.08)" : "rgba(0,242,255,0.18)";
    ctx.roundRect(abx, aby, abw, abh, 12);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.stroke();

    ctx.fillStyle = disabled ? "rgba(255,255,255,0.35)" : "#fff";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(label, abx + 12, aby + 25);

    ui.buttons.buyRows.push({ id: it.id, x: abx, y: aby, w: abw, h: abh, disabled });

    rowY += rowH + 14;
  }

  ctx.restore();
}

function shopAction(id) {
  const item = SHOP_ITEMS.find((x) => x.id === id);
  if (!item) return;

  const total = getTotalDiamonds();
  const owned = !!shopState.owned[id];

  if (!owned) {
    if (total < item.price) return;
    setTotalDiamonds(total - item.price);
    shopState.owned[id] = true;

    if (item.type === "skin") shopState.equipped.skin = id;
    else if (id === "glow") shopState.equipped.glow = true;
    else if (id === "start_magnet") shopState.equipped.start_magnet = true;
    else if (id === "start_life") shopState.equipped.start_life = true;

    saveShop();
    return;
  }

  // owned -> equip/toggle
  if (item.type === "skin") {
    shopState.equipped.skin = id;
  } else if (id === "glow") {
    shopState.equipped.glow = !shopState.equipped.glow;
  } else if (id === "start_magnet") {
    shopState.equipped.start_magnet = !shopState.equipped.start_magnet;
  } else if (id === "start_life") {
    shopState.equipped.start_life = !shopState.equipped.start_life;
  }
  saveShop();
}

function drawGameOverOverlay() {
  ctx.save();
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

  ctx.fillStyle = "#fff";
  ctx.font = "bold 28px sans-serif";
  ctx.fillText("O‘yin tugadi", x + 22, y + 52);

  ctx.fillStyle = "rgba(255,255,255,0.70)";
  ctx.font = "16px sans-serif";
  ctx.fillText("Natijangiz:", x + 22, y + 82);

  ctx.fillStyle = "#fff";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText(`🍅 Ball: ${score}`, x + 22, y + 120);

  ctx.fillStyle = "#ffd700";
  ctx.fillText(`🏆 HighScore: ${Math.max(highScore, score)}`, x + 22, y + 150);

  ctx.fillStyle = "#00f2ff";
  ctx.fillText(`💎 Olingan diamond: ${currentDiamonds}`, x + 22, y + 180);

  // Restart button
  const bw = 220, bh = 52;
  const bx = x + (w - bw) / 2;
  const by = y + h - bh - 24;

  ctx.fillStyle = "rgba(0,242,255,0.20)";
  ctx.roundRect(bx, by, bw, bh, 14);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.stroke();

  ctx.fillStyle = "#fff";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText("Qayta boshlash", bx + 52, by + 32);

  ui.buttons.restart = { x: bx, y: by, w: bw, h: bh };

  ctx.restore();
}

// =======================
// INPUT
// =======================
function clampBasket() {
  if (basket.x < 0) basket.x = 0;
  if (basket.x + basket.width > canvas.width) basket.x = canvas.width - basket.width;
}

function moveBasket(e) {
  if (isGameOver) return;
  if (ui.shopOpen) return;

  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  basket.x = clientX - basket.width / 2;
  clampBasket();
}

canvas.addEventListener("touchmove", (e) => { e.preventDefault(); moveBasket(e); }, { passive: false });
canvas.addEventListener("mousemove", moveBasket);

function inRect(px, py, r) {
  return r && px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

function pointFromEvent(e) {
  const p = e.touches ? e.touches[0] : e;
  return { x: p.clientX, y: p.clientY };
}

function handleTap(e) {
  const { x, y } = pointFromEvent(e);

  // shop button
  if (!ui.shopOpen && !isGameOver && inRect(x, y, ui.buttons.shop)) {
    ui.shopOpen = true;
    return;
  }

  // shop overlay click
  if (ui.shopOpen) {
    if (inRect(x, y, ui.buttons.closeShop)) {
      ui.shopOpen = false;
      return;
    }
    for (const r of ui.buttons.buyRows) {
      if (!r.disabled && inRect(x, y, r)) {
        shopAction(r.id);
        return;
      }
    }
    return;
  }

  // restart overlay
  if (isGameOver && inRect(x, y, ui.buttons.restart)) {
    restartGame();
  }
}

canvas.addEventListener("mousedown", handleTap);
canvas.addEventListener("touchstart", (e) => { e.preventDefault(); handleTap(e); }, { passive: false });

// =======================
// MAIN LOOP (stable)
// =======================
function frame(now) {
  // schedule next frame first
  rafId = requestAnimationFrame(frame);

  // background + shake
  let sx = 0, sy = 0;
  if (shakeTimer > 0) {
    sx = (Math.random() - 0.5) * 15;
    sy = (Math.random() - 0.5) * 15;
    shakeTimer--;
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawBackground();
  ctx.translate(sx, sy);

  // tick wave/level
  waveTick(now);
  const cfg = levelCfg(score);
  level = cfg.level;
  baseSpeed = cfg.baseSpeed;

  // timers
  if (slowModeTimer > 0) {
    slowModeTimer--;
    ctx.fillStyle = "rgba(125, 211, 252, 0.14)";
    ctx.fillRect(-50, -50, canvas.width + 100, canvas.height + 100);
  }
  if (magnetTimer > 0) magnetTimer--;
  if (doubleScoreTimer > 0) doubleScoreTimer--;
  if (diamondBoostTimer > 0) diamondBoostTimer--;

  // spawn scheduler (NO setInterval resets)
  if (!isGameOver && !ui.shopOpen && now >= nextSpawnAt) {
    // wave affects spawn speed
    const waveMul = wave.phase === "storm" ? 0.55 : wave.phase === "reward" ? 0.85 : 1.0;
    const spawnMs = Math.max(220, Math.floor(cfg.spawnMs * waveMul));
    spawnItem();
    nextSpawnAt = now + spawnMs;
  }

  // speed
  const currentSpeed = (baseSpeed + score / 250) * (slowModeTimer > 0 ? 0.5 : 1);

  // basket
  drawBasket();

  // items
  if (!isGameOver) {
    for (let i = 0; i < items.length; i++) {
      const p = items[i];

      // magnet
      if (magnetTimer > 0 && (p.type === "tomato" || p.type === "brand" || p.type === "golden")) {
        const dx = basket.x + basket.width / 2 - (p.x + p.width / 2);
        p.x += dx * 0.1;
      }

      p.y += currentSpeed * p.speedMod;
      p.x += p.drift;

      if (p.x <= 0 || p.x + p.width >= canvas.width) p.drift *= -1;

      // draw item
      if (assetsLoaded && assets[p.type]?.complete) ctx.drawImage(assets[p.type], p.x, p.y, p.width, p.height);
      else drawFallbackItem(p);

      // collision
      if (p.y + p.height >= basket.y + 10 && p.y <= basket.y + 50 &&
          p.x + p.width >= basket.x && p.x <= basket.x + basket.width) {

        handleCatch(p.type);
        items.splice(i, 1); i--;

        if (lives <= 0) { gameOver(); break; }
        continue;
      }

      // missed
      if (p.y > canvas.height) {
        if (p.type === "tomato" || p.type === "brand" || p.type === "golden") {
          lives--;
          combo = 0;
          shakeTimer = 10;
        }
        items.splice(i, 1); i--;
        if (lives <= 0) { gameOver(); break; }
      }
    }
  }

  // HUD
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawHUD();

  if (ui.shopOpen) drawShopOverlay();
  if (isGameOver) drawGameOverOverlay();
}

// =======================
// PUBLIC START
// =======================
window.startGameLoop = function () {
  // stop previous loop
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;

  resizeCanvas();

  // reset
  ui.shopOpen = false;
  isGameOver = false;

  score = 0;
  currentDiamonds = 0;
  lives = 3;
  combo = 0;

  items = [];

  slowModeTimer = 0;
  magnetTimer = 0;
  shieldActive = false;
  shakeTimer = 0;

  doubleScoreTimer = 0;
  diamondBoostTimer = 0;

  // apply shop start bonuses (equipped)
  if (shopState.equipped.start_magnet) magnetTimer = 360; // 6s
  if (shopState.equipped.start_life) lives += 1;

  // init wave
  const now = performance.now();
  setWave("normal", 20000, now);

  // init basket
  basket.x = canvas.width / 2 - basket.width / 2;
  basket.y = canvas.height - 160;

  // init spawn
  nextSpawnAt = now + 500;

  // start loop
  rafId = requestAnimationFrame(frame);
};
