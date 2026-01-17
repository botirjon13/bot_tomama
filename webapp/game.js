/* game.js (FULL - UPDATED)
   - Tomama Random Edition
   - Profil tayyor bo‘lmaguncha o‘yin boshlamaydi (register tugashini kutadi)
   - Score + Diamonds backendga /save orqali ketadi
   - Menyuga qaytganda UI sync qilish uchun window.updateUIStats() ni chaqiradi (agar bor bo‘lsa)
   - Canvas full-screen + resize
*/

/* =========================
   GLOBALS / CONFIG
========================= */

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d", { alpha: true });

let W = 0, H = 0, DPR = 1;

// Game states
let running = false;
let gameOver = false;
let paused = false;

// Player / score
let score = 0;
let bestScore = Number(localStorage.getItem("highScore") || 0);

// Diamonds (local running total)
let totalDiamonds = Number(localStorage.getItem("totalDiamonds") || 0);
let earnedDiamondsThisRun = 0;

// Profile state (register finished?)
let profileReady = false;
let identity = localStorage.getItem("tomama_identity") || "";

// Controls
let pointerDown = false;
let pointerX = 0;
let pointerY = 0;

// Timing
let lastTs = 0;

/* =========================
   UTILS
========================= */
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function rand(min, max) { return min + Math.random() * (max - min); }
function now() { return performance.now(); }

function isTelegramWebApp() {
  return !!(window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe);
}

// Simple toast / alert overlay
function toast(msg) {
  let t = document.getElementById("gameToast");
  if (!t) {
    t = document.createElement("div");
    t.id = "gameToast";
    t.style.cssText = `
      position:fixed;left:50%;top:18px;transform:translateX(-50%);
      max-width:min(520px, calc(100vw - 24px));
      padding:10px 12px;border-radius:12px;
      background:rgba(0,0,0,0.65);border:1px solid rgba(255,255,255,0.12);
      color:#fff;font:600 13px/1.3 system-ui, -apple-system, Segoe UI, Roboto, Arial;
      z-index:99999;backdrop-filter:blur(10px);
      opacity:0;transition:opacity .18s ease;
    `;
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = "1";
  clearTimeout(t._timer);
  t._timer = setTimeout(() => (t.style.opacity = "0"), 1800);
}

async function ensureProfileReady() {
  // Agar index.html autoRegister tugab localStoragega identity yozgan bo‘lsa – ok.
  identity = localStorage.getItem("tomama_identity") || "";
  profileReady = !!identity;

  if (profileReady) return true;

  // Hali tayyor bo‘lmasa 1-2 soniya kutib ko‘ramiz
  toast("Profil yuklanyapti, 1–2 soniya kuting…");
  const t0 = Date.now();
  while (Date.now() - t0 < 2200) {
    await new Promise((r) => setTimeout(r, 120));
    identity = localStorage.getItem("tomama_identity") || "";
    if (identity) {
      profileReady = true;
      return true;
    }
  }

  // Baribir bo‘lmasa – guest yoki register ishlamagan.
  toast("Profil topilmadi. Sahifani yangilang yoki Telegram WebApp orqali oching.");
  return false;
}

/* =========================
   RESIZE / CANVAS
========================= */
function resize() {
  DPR = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  // Canvas hidden bo‘lsa ham, startda full-screen qilish uchun fallback:
  const cssW = rect.width || window.innerWidth;
  const cssH = rect.height || window.innerHeight;

  W = Math.floor(cssW);
  H = Math.floor(cssH);

  canvas.width = Math.floor(W * DPR);
  canvas.height = Math.floor(H * DPR);
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";

  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

window.addEventListener("resize", resize);

/* =========================
   GAME OBJECTS
========================= */
// Player ball
const player = {
  x: 0,
  y: 0,
  r: 22,
  vx: 0,
  vy: 0,
  speed: 520,
};

// Obstacles / targets (tomatoes)
const tomatoes = [];
const bombs = [];

function resetGame() {
  score = 0;
  earnedDiamondsThisRun = 0;
  gameOver = false;
  paused = false;

  player.x = W / 2;
  player.y = H * 0.72;
  player.vx = 0;
  player.vy = 0;

  tomatoes.length = 0;
  bombs.length = 0;

  // Spawn initial
  for (let i = 0; i < 6; i++) spawnTomato(true);
  for (let i = 0; i < 2; i++) spawnBomb(true);
}

function spawnTomato(initial = false) {
  const r = rand(14, 20);
  const x = rand(r + 10, W - r - 10);
  const y = initial ? rand(40, H - 120) : -rand(60, 240);
  const vy = rand(120, 260);

  tomatoes.push({ x, y, r, vy, alive: true });
}

function spawnBomb(initial = false) {
  const r = rand(14, 20);
  const x = rand(r + 10, W - r - 10);
  const y = initial ? rand(30, H - 160) : -rand(80, 360);
  const vy = rand(160, 300);

  bombs.push({ x, y, r, vy, alive: true });
}

function circleHit(ax, ay, ar, bx, by, br) {
  const dx = ax - bx;
  const dy = ay - by;
  const rr = ar + br;
  return dx * dx + dy * dy <= rr * rr;
}

/* =========================
   INPUT
========================= */
function onPointerDown(e) {
  pointerDown = true;
  const p = getPointer(e);
  pointerX = p.x;
  pointerY = p.y;
}
function onPointerMove(e) {
  const p = getPointer(e);
  pointerX = p.x;
  pointerY = p.y;
}
function onPointerUp() {
  pointerDown = false;
}

function getPointer(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = (e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX);
  const clientY = (e.touches && e.touches[0] ? e.touches[0].clientY : e.clientY);
  return {
    x: (clientX - rect.left),
    y: (clientY - rect.top),
  };
}

canvas.addEventListener("mousedown", onPointerDown);
canvas.addEventListener("mousemove", onPointerMove);
window.addEventListener("mouseup", onPointerUp);

canvas.addEventListener("touchstart", onPointerDown, { passive: true });
canvas.addEventListener("touchmove", onPointerMove, { passive: true });
window.addEventListener("touchend", onPointerUp, { passive: true });

/* =========================
   DRAW
========================= */
function drawBackground() {
  // soft gradient background
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "rgba(255, 245, 248, 1)");
  g.addColorStop(1, "rgba(245, 250, 255, 1)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // subtle grid
  ctx.globalAlpha = 0.06;
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 1;
  const step = 42;
  for (let x = 0; x < W; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawHUD() {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.font = "700 16px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(`🍅 Score: ${score}`, 16, 28);
  ctx.fillText(`💎 +${earnedDiamondsThisRun} (Total: ${totalDiamonds})`, 16, 52);

  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.font = "600 12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(profileReady ? "Profil: OK" : "Profil: ...", 16, 72);
  ctx.restore();
}

function drawPlayer() {
  ctx.save();
  // shadow
  ctx.beginPath();
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.ellipse(player.x, player.y + player.r * 0.9, player.r * 0.95, player.r * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();

  // body
  const grad = ctx.createRadialGradient(player.x - 6, player.y - 6, 4, player.x, player.y, player.r);
  grad.addColorStop(0, "rgba(255, 90, 90, 1)");
  grad.addColorStop(1, "rgba(165, 20, 20, 1)");
  ctx.beginPath();
  ctx.fillStyle = grad;
  ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
  ctx.fill();

  // highlight
  ctx.beginPath();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.arc(player.x - 7, player.y - 7, player.r * 0.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawTomato(t) {
  ctx.save();
  ctx.beginPath();
  ctx.fillStyle = "rgba(255, 70, 70, 0.95)";
  ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.arc(t.x - t.r * 0.28, t.y - t.r * 0.28, t.r * 0.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawBomb(b) {
  ctx.save();
  ctx.beginPath();
  ctx.fillStyle = "rgba(20, 20, 20, 0.9)";
  ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.strokeStyle = "rgba(255, 90, 90, 0.9)";
  ctx.lineWidth = 2;
  ctx.arc(b.x, b.y, b.r - 2, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

function drawGameOver() {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#fff";
  ctx.font = "900 34px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.textAlign = "center";
  ctx.fillText("Game Over", W / 2, H / 2 - 30);

  ctx.font = "800 18px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(`Score: ${score}    💎 +${earnedDiamondsThisRun}`, W / 2, H / 2 + 10);

  ctx.font = "700 14px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText("Klik / Tap: qayta boshlash", W / 2, H / 2 + 44);
  ctx.restore();
}

/* =========================
   UPDATE
========================= */
function update(dt) {
  if (paused || gameOver) return;

  // Movement: follow pointer X when pressed, else slow drift
  if (pointerDown) {
    const targetX = clamp(pointerX, player.r + 8, W - player.r - 8);
    const dx = targetX - player.x;
    player.vx = dx * 10; // smoothing
  } else {
    player.vx *= 0.94;
  }

  player.x += player.vx * dt;
  player.x = clamp(player.x, player.r + 8, W - player.r - 8);

  // Spawn speed scaling with score
  const speedBoost = 1 + Math.min(1.2, score / 3500);

  // Update tomatoes
  for (const t of tomatoes) {
    t.y += t.vy * dt * speedBoost;

    // Collision with player
    if (t.alive && circleHit(player.x, player.y, player.r, t.x, t.y, t.r)) {
      t.alive = false;
      score += 45;

      // Diamonds rule: every 250 score earn 1 diamond (approx)
      // Instead of per-catch random, we accumulate by score steps.
      if (score % 250 === 0) {
        earnedDiamondsThisRun += 1;
      }
    }

    // Out of screen => recycle
    if (t.y - t.r > H + 40) {
      t.x = rand(t.r + 10, W - t.r - 10);
      t.y = -rand(60, 220);
      t.r = rand(14, 20);
      t.vy = rand(120, 260);
      t.alive = true;
    }
  }

  // Update bombs
  for (const b of bombs) {
    b.y += b.vy * dt * speedBoost;

    if (b.alive && circleHit(player.x, player.y, player.r, b.x, b.y, b.r)) {
      b.alive = false;
      endGame();
      return;
    }

    if (b.y - b.r > H + 60) {
      b.x = rand(b.r + 10, W - b.r - 10);
      b.y = -rand(120, 360);
      b.r = rand(14, 20);
      b.vy = rand(160, 300);
      b.alive = true;
    }
  }

  // Maintain object count
  // (If you later want harder mode, increase bombs or tomatoes.)
}

/* =========================
   SAVE TO BACKEND
========================= */
async function saveRunToServer() {
  try {
    identity = localStorage.getItem("tomama_identity") || "";
    if (!identity) return;

    // Save best score and earned diamonds this run
    const res = await fetch(`${SERVER_URL}/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identity,
        score,
        earned_diamonds: earnedDiamondsThisRun,
      }),
    });

    const data = await res.json();
    if (data && data.ok) {
      // Sync local values with server response
      bestScore = Math.max(bestScore, Number(data.score || 0));
      totalDiamonds = Number(data.diamonds || totalDiamonds);

      localStorage.setItem("highScore", String(bestScore));
      localStorage.setItem("totalDiamonds", String(totalDiamonds));

      // Update UI in menu if available
      if (typeof window.updateUIStats === "function") {
        window.updateUIStats();
      }
    }
  } catch (e) {
    console.warn("SAVE failed:", e);
  }
}

/* =========================
   GAME END / RESTART
========================= */
function endGame() {
  gameOver = true;
  running = true; // still drawing end screen

  // Update local best immediately
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("highScore", String(bestScore));
  }

  // Sync diamonds local preview
  // (server will confirm on save)
  // Here we do NOT add earned to total locally; we wait server result.
  saveRunToServer();

  // Telegram haptic
  try {
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred("error");
  } catch {}
}

function restart() {
  resetGame();
  lastTs = now();
}

/* =========================
   LOOP
========================= */
function loop(ts) {
  if (!running) return;

  const t = ts || now();
  const dt = Math.min(0.033, (t - lastTs) / 1000 || 0);
  lastTs = t;

  drawBackground();

  // Draw objects
  for (const tmt of tomatoes) if (tmt.alive) drawTomato(tmt);
  for (const b of bombs) if (b.alive) drawBomb(b);

  drawPlayer();
  drawHUD();

  if (!gameOver) update(dt);
  else drawGameOver();

  requestAnimationFrame(loop);
}

/* =========================
   START / EXPOSE API
========================= */
async function startGameLoop() {
  // Ensure canvas size is correct now
  resize();

  // Prevent starting game if profile not ready
  const ok = await ensureProfileReady();
  if (!ok) return;

  // Mark profile ready state for HUD
  profileReady = true;

  // Reset and start
  restart();
  running = true;
  requestAnimationFrame(loop);

  // Telegram feedback
  try {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("medium");
  } catch {}
}

// Game over tap to restart
function onCanvasClick() {
  if (!running) return;
  if (gameOver) {
    restart();
  }
}

canvas.addEventListener("click", onCanvasClick);
canvas.addEventListener("touchend", (e) => {
  // tap to restart on gameover
  if (gameOver) restart();
}, { passive: true });

// Expose to index.html
window.startGameLoop = startGameLoop;

/* =========================
   INITIAL CANVAS SETUP
========================= */
(function init() {
  // Canvas must fill screen when shown
  // If you have CSS controlling canvas size, keep it.
  // Here we just ensure it has a default full screen.
  canvas.style.display = "block";
  canvas.style.position = "fixed";
  canvas.style.inset = "0";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.touchAction = "none";
  resize();

  // Read local best & diamonds
  bestScore = Number(localStorage.getItem("highScore") || 0);
  totalDiamonds = Number(localStorage.getItem("totalDiamonds") || 0);

  // identity may appear later after autoRegister
  identity = localStorage.getItem("tomama_identity") || "";
  profileReady = !!identity;
})();
