const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const SERVER_URL = 'https://oyinbackent-production.up.railway.app';
const tg = window.Telegram?.WebApp || null;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let highScore = localStorage.getItem('highScore') || 0;
let totalDiamonds = parseInt(localStorage.getItem('totalDiamonds')) || 0;

let assets = {};
let imagesToLoad = 5;
let loadedCount = 0;
let assetsLoaded = false;
const path = 'assaets/';

const loadAsset = (key, src) => {
    assets[key] = new Image();
    assets[key].src = path + src;
    assets[key].onload = () => { if (++loadedCount === imagesToLoad) assetsLoaded = true; };
};

loadAsset('basket', 'basket.png');
loadAsset('tomato', 'products/tomatoFon.png');
loadAsset('brand', 'products/tomato.png');
loadAsset('snow', 'products/snow.png');
loadAsset('bomb', 'products/bomb.png');

let basket = { x: canvas.width / 2 - 60, y: canvas.height - 160, width: 120, height: 85 };
let items = [], score = 0, currentDiamonds = 0, lives = 3, combo = 0;
let isGameOver = false, spawnInterval = null, slowModeTimer = 0, shakeTimer = 0, gameSpeed = 7;

function spawnItem() {
    if (isGameOver) return;
    let rand = Math.random();
    let type = (rand < 0.15) ? 'bomb' : (rand < 0.25) ? 'brand' : (rand < 0.32) ? 'snow' : 'tomato';
    items.push({
        x: Math.random() * (canvas.width - 65), y: -80, width: 65, height: 65, type: type,
        speedMod: 0.9 + Math.random() * 0.8, drift: (Math.random() - 0.5) * 3
    });
}

function update() {
    if (isGameOver) return;
    let sx = 0, sy = 0;
    if (shakeTimer > 0) { sx = (Math.random() - 0.5) * 20; sy = (Math.random() - 0.5) * 20; shakeTimer--; }

    ctx.save();
    ctx.translate(sx, sy);
    ctx.clearRect(-50, -50, canvas.width + 100, canvas.height + 100);

    if (slowModeTimer > 0) {
        slowModeTimer--;
        ctx.fillStyle = "rgba(135, 206, 250, 0.2)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    let currentGlobalSpeed = (gameSpeed + (score / 200)) * (slowModeTimer > 0 ? 0.5 : 1);

    if (assetsLoaded && assets.basket.complete) {
        ctx.drawImage(assets.basket, basket.x, basket.y, basket.width, basket.height);
    }

    for (let i = 0; i < items.length; i++) {
        let p = items[i];
        p.y += currentGlobalSpeed * p.speedMod;
        p.x += p.drift;

        if (p.x <= 0 || p.x + p.width >= canvas.width) p.drift *= -1;

        if (assetsLoaded && assets[p.type]) ctx.drawImage(assets[p.type], p.x, p.y, p.width, p.height);

        if (p.y + p.height - 15 >= basket.y && p.y <= basket.y + 40 &&
            p.x + p.width - 10 >= basket.x && p.x <= basket.x + basket.width) {
            
            if (p.type === 'bomb') { lives--; combo = 0; shakeTimer = 25; tg?.HapticFeedback.notificationOccurred('error'); }
            else {
                combo++;
                if (p.type === 'tomato') score += 10 + (Math.floor(combo / 5) * 5);
                else if (p.type === 'brand') { score += 100; currentDiamonds += 1; }
                else if (p.type === 'snow') slowModeTimer = 350;
                tg?.HapticFeedback.impactOccurred('medium');
            }
            items.splice(i, 1); i--;
            if (lives <= 0) gameOver();
            continue;
        }

        if (p.y > canvas.height) {
            if (p.type === 'tomato' || p.type === 'brand') { lives--; combo = 0; shakeTimer = 15; tg?.HapticFeedback.notificationOccurred('warning'); }
            items.splice(i, 1); i--;
            if (lives <= 0) gameOver();
        }
    }
    ctx.restore();
    if (!isGameOver) { drawUI(); requestAnimationFrame(update); }
}

function drawUI() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.roundRect(15, 15, 240, 160, 20); ctx.fill();
    ctx.fillStyle = 'white'; ctx.font = 'bold 22px sans-serif';
    ctx.fillText('🍅 Ball: ' + score, 30, 50);
    ctx.fillStyle = '#00f2ff'; ctx.fillText('💎 Almaz: ' + currentDiamonds, 30, 85);
    ctx.fillStyle = '#ff4d4d'; ctx.fillText('❤️ Jon: ' + '❤️'.repeat(Math.max(0, lives)), 30, 120);
    if (combo > 2) { ctx.fillStyle = '#FFD700'; ctx.fillText('🔥 COMBO x' + combo, 30, 155); }
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
    isGameOver = true; clearInterval(spawnInterval);
    const tgUser = tg?.initDataUnsafe?.user;
    fetch(`${SERVER_URL}/save`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: tgUser?.id || 0, username: tgUser?.username || tgUser?.first_name || "Guest", score: score })
    });
    totalDiamonds += currentDiamonds;
    localStorage.setItem('totalDiamonds', totalDiamonds);
    if (score > highScore) localStorage.setItem('highScore', score);

    setTimeout(() => {
        if (tg) {
            tg.MainButton.setText(`NATIJA: ${score} 🍅 | QAYTA BOSHLASH`).show().onClick(() => location.reload());
        } else {
            alert(`O'yin tugadi! Ball: ${score}`);
            location.reload();
        }
    }, 200);
}

window.startGameLoop = function() {
    isGameOver = false; score = 0; lives = 3; currentDiamonds = 0; combo = 0; items = [];
    spawnInterval = setInterval(spawnItem, 650);
    update();
};
