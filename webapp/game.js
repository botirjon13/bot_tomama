// game.js - 2026 Updated Version
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const tg = window.Telegram?.WebApp;

// Ekran o'lchamlari
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let highScore = localStorage.getItem('highScore') || 0;
let totalDiamonds = parseInt(localStorage.getItem('totalDiamonds')) || 0;

let assets = {};
let imagesToLoad = 5;
let loadedCount = 0;
let assetsLoaded = false;

const path = 'assaets/'; // Papka nomini tekshiring (assets/ bo'lishi mumkin)

// Rasmlarni yuklash
const loadAsset = (key, src) => {
    assets[key] = new Image();
    assets[key].src = path + src;
    assets[key].onload = imageLoaded;
    assets[key].onerror = () => {
        console.error(key + " yuklanmadi: " + src);
        imageLoaded();
    };
};

function imageLoaded() {
    loadedCount++;
    if (loadedCount === imagesToLoad) assetsLoaded = true;
}

// ASSETS
loadAsset('basket', 'basket.png');
loadAsset('tomato', 'products/tomatoFon.png');
loadAsset('brand', 'products/tomato.png');
loadAsset('snow', 'products/snow.png');
loadAsset('bomb', 'products/bomb.png');

let basket = { x: canvas.width / 2 - 60, y: canvas.height - 160, width: 120, height: 85 };
let items = [];
let score = 0, currentDiamonds = 0, lives = 3, combo = 0;
let isGameOver = false;
let spawnInterval = null;
let slowModeTimer = 0, shakeTimer = 0;
let gameSpeed = 7;

// Obyektlarni yaratish
function spawnItem() {
    if (isGameOver) return;

    let rand = Math.random();
    let type = 'tomato';
    if (rand < 0.15) type = 'bomb';
    else if (rand < 0.25) type = 'brand';
    else if (rand < 0.32) type = 'snow';

    items.push({
        x: Math.random() * (canvas.width - 65),
        y: -80,
        width: 65,
        height: 65,
        type: type,
        speedMod: 0.9 + Math.random() * 0.8,
        drift: (Math.random() - 0.5) * 3
    });
}

// O‘yinni yangilab turish (Loop)
function update() {
    if (isGameOver) return;

    let sx = 0, sy = 0;
    if (shakeTimer > 0) {
        sx = (Math.random() - 0.5) * 20;
        sy = (Math.random() - 0.5) * 20;
        shakeTimer--;
    }

    ctx.save();
    ctx.translate(sx, sy);
    ctx.clearRect(-50, -50, canvas.width + 100, canvas.height + 100);

    let currentGlobalSpeed = (gameSpeed + (score / 200)) * (slowModeTimer > 0 ? 0.5 : 1);

    if (slowModeTimer > 0) {
        slowModeTimer--;
        ctx.fillStyle = "rgba(135, 206, 250, 0.2)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Savatni chizish
    if (assetsLoaded && assets.basket.complete) {
        ctx.drawImage(assets.basket, basket.x, basket.y, basket.width, basket.height);
    }

    for (let i = 0; i < items.length; i++) {
        let p = items[i];
        p.y += currentGlobalSpeed * p.speedMod;
        p.x += p.drift;

        // Devorga urilish
        if (p.x <= 0 || p.x + p.width >= canvas.width) p.drift *= -1;

        if (assetsLoaded && assets[p.type]) {
            ctx.drawImage(assets[p.type], p.x, p.y, p.width, p.height);
        }

        // To'qnashuvni aniqlash (Collision)
        if (p.y + p.height - 15 >= basket.y && p.y <= basket.y + 40 &&
            p.x + p.width - 10 >= basket.x && p.x <= basket.x + basket.width) {

            if (p.type === 'bomb') {
                lives--;
                combo = 0;
                shakeTimer = 25;
                if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
            } else {
                combo++;
                if (p.type === 'tomato') score += 10 + (Math.floor(combo / 5) * 5);
                else if (p.type === 'brand') { score += 100; currentDiamonds += 1; }
                else if (p.type === 'snow') slowModeTimer = 350;
                if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
            }
            items.splice(i, 1); i--;
            if (lives <= 0) { gameOver(); break; }
            continue;
        }

        // Pastga tushib ketish
        if (p.y > canvas.height) {
            if (p.type === 'tomato' || p.type === 'brand') {
                lives--;
                combo = 0;
                shakeTimer = 15;
                if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('warning');
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
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.roundRect(15, 15, 220, 140, 15);
    ctx.fill();

    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('🍅 Ball: ' + score, 30, 45);
    ctx.fillStyle = '#00f2ff';
    ctx.fillText('💎 Almaz: ' + currentDiamonds, 30, 80);
    ctx.fillStyle = '#ff4d4d';
    ctx.fillText('❤️ Jon: ' + '❤️'.repeat(Math.max(0, lives)), 30, 115);
}

function moveBasket(e) {
    let clientX = e.touches ? e.touches[0].clientX : e.clientX;
    let targetX = clientX - basket.width / 2;
    basket.x = Math.max(0, Math.min(canvas.width - basket.width, targetX));
}

canvas.addEventListener('touchmove', (e) => { e.preventDefault(); moveBasket(e); }, { passive: false });
canvas.addEventListener('mousemove', moveBasket);

// Reytingni serverdan olish va ko'rsatish
async function showLeaderboard() {
    const modal = document.getElementById('leaderboardModal');
    const list = document.getElementById('leaderboardList');
    if(!modal || !list) return;

    modal.style.display = 'block';
    list.innerHTML = "<p style='text-align:center'>Yuklanmoqda...</p>";

    try {
        const res = await fetch('oyinbackent-production.up.railway.app');
        const data = await res.json();
        list.innerHTML = "";
        data.forEach((p, i) => {
            list.innerHTML += `
                <div style="display:flex; justify-content:space-between; padding:8px; border-bottom:1px solid #444;">
                    <span>${i+1}. ${p.username}</span>
                    <span style="color:#ffde00">${p.score} 🍅</span>
                </div>`;
        });
    } catch (e) {
        list.innerHTML = "<p>Xatolik yuz berdi.</p>";
    }
}

function closeLeaderboard() {
    document.getElementById('leaderboardModal').style.display = 'none';
}

// O'yin tugashi
function gameOver() {
    if (isGameOver) return;
    isGameOver = true;
    clearInterval(spawnInterval);

    const tgUser = tg?.initDataUnsafe?.user;
    
    // Serverga saqlash (PostgreSQL)
    fetch('https://oyinbackent-production.up.railway.app/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            telegram_id: tgUser?.id || 0,
            username: tgUser?.username || tgUser?.first_name || "Oyinchi",
            score: score
        })
    }).catch(e => console.error("Saqlashda xato:", e));

    totalDiamonds += currentDiamonds;
    localStorage.setItem('totalDiamonds', totalDiamonds);
    if (score > highScore) localStorage.setItem('highScore', score);

    if (tg) {
        tg.MainButton.setText(`BALL: ${score} | QAYTA O'YNASH`);
        tg.MainButton.show();
        tg.MainButton.onClick(() => {
            tg.MainButton.hide();
            window.location.reload();
        });
    } else {
        setTimeout(() => {
            alert("O'yin tugadi! Ball: " + score);
            window.location.reload();
        }, 500);
    }
}

window.startGameLoop = function() {
    document.getElementById('mainMenu').style.display = 'none';
    isGameOver = false;
    score = 0; lives = 3; currentDiamonds = 0; combo = 0;
    items = []; slowModeTimer = 0;
    
    if (spawnInterval) clearInterval(spawnInterval);
    spawnInterval = setInterval(spawnItem, 650);
    requestAnimationFrame(update);
};

// Global funksiyalarni bog'lash (HTML uchun)
window.showLeaderboard = showLeaderboard;
window.closeLeaderboard = closeLeaderboard;
