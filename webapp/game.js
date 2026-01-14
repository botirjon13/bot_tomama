// game.js - 2026 FULL REPAIR
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Telegram SDK ni xavfsiz aniqlash
const tg = window.Telegram?.WebApp || null;

if (tg) {
    tg.ready();
    tg.expand();
}

// Ekran o'lchami
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ... qolgan kodlar (assets, update, draw)


let highScore = localStorage.getItem('highScore') || 0;
let totalDiamonds = parseInt(localStorage.getItem('totalDiamonds')) || 0;

let assets = {};
let imagesToLoad = 5;
let loadedCount = 0;
let assetsLoaded = false;

// SIZDA SHU PAPKA NOMI TO'G'RI:
const path = 'assaets/'; 
const SERVER_URL = 'https://oyinbackent-production.up.railway.app';

const loadAsset = (key, src) => {
    assets[key] = new Image();
    assets[key].src = path + src;
    assets[key].onload = () => {
        loadedCount++;
        if (loadedCount === imagesToLoad) assetsLoaded = true;
    };
    assets[key].onerror = () => {
        console.error(key + " yuklanmadi: " + path + src);
        loadedCount++; // Xato bo'lsa ham o'yinni davom ettirish
    };
};

// ASSETS yuklash
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

    // Savatni chizish
    if (assetsLoaded && assets.basket && assets.basket.complete) {
        ctx.drawImage(assets.basket, basket.x, basket.y, basket.width, basket.height);
    }

    for (let i = 0; i < items.length; i++) {
        let p = items[i];
        p.y += currentGlobalSpeed * p.speedMod;
        p.x += p.drift;

        if (p.x <= 0 || p.x + p.width >= canvas.width) p.drift *= -1;

        if (assetsLoaded && assets[p.type]) {
            ctx.drawImage(assets[p.type], p.x, p.y, p.width, p.height);
        }

        // To'qnashuv (Collision)
        if (p.y + p.height - 15 >= basket.y && p.y <= basket.y + 40 &&
            p.x + p.width - 10 >= basket.x && p.x <= basket.x + basket.width) {
            if (p.type === 'bomb') {
                lives--; combo = 0; shakeTimer = 25;
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

        if (p.y > canvas.height) {
            if (p.type === 'tomato' || p.type === 'brand') {
                lives--; combo = 0; shakeTimer = 15;
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

function gameOver() {
    if (isGameOver) return;
    isGameOver = true;
    clearInterval(spawnInterval);

    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    const userId = tgUser?.id || 12345;
    const userName = tgUser?.username || tgUser?.first_name || "Oyinchi";

    fetch(`${SERVER_URL}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: userId, username: userName, score: score })
    }).catch(err => console.log("Saqlashda xato"));

    if (tg) {
        tg.MainButton.setText(`BALL: ${score} | QAYTA O'YNASH`);
        tg.MainButton.show();
        tg.MainButton.onClick(() => window.location.reload());
    } else {
        alert("O'yin tugadi! Ball: " + score);
        window.location.reload();
    }
}

window.startGameLoop = function() {
    isGameOver = false;
    score = 0; lives = 3; currentDiamonds = 0;
    items = [];
    if (spawnInterval) clearInterval(spawnInterval);
    spawnInterval = setInterval(spawnItem, 650);
    requestAnimationFrame(update);
};
