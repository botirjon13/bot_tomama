const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const SERVER_URL = 'https://oyinbackent-production.up.railway.app';
const tg = window.Telegram?.WebApp;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

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

let basket = { x: canvas.width / 2 - 60, y: canvas.height - 140, width: 100, height: 70 };
let items = [], score = 0, currentDiamonds = 0, lives = 3, combo = 0, isGameOver = false;
let spawnInterval, slowModeTimer = 0, gameSpeed = 6;

function spawnItem() {
    if (isGameOver) return;
    let r = Math.random(), type = 'tomato';
    if (r < 0.12) type = 'bomb';
    else if (r < 0.22) type = 'brand';
    else if (r < 0.28) type = 'snow';
    items.push({ x: Math.random() * (canvas.width - 60), y: -60, width: 60, height: 60, type, speed: 1 + Math.random() });
}

function update() {
    if (isGameOver) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let speed = (gameSpeed + (score / 300)) * (slowModeTimer > 0 ? 0.5 : 1);
    if (slowModeTimer > 0) slowModeTimer--;

    if (assetsLoaded) ctx.drawImage(assets.basket, basket.x, basket.y, basket.width, basket.height);

    items.forEach((p, i) => {
        p.y += speed * p.speed;
        if (assetsLoaded) ctx.drawImage(assets[p.type], p.x, p.y, p.width, p.height);

        if (p.y + p.height > basket.y && p.x + p.width > basket.x && p.x < basket.x + basket.width) {
            if (p.type === 'bomb') { lives--; combo = 0; tg?.HapticFeedback.notificationOccurred('error'); }
            else {
                combo++;
                if (p.type === 'tomato') score += 10 + Math.floor(combo/5)*5;
                else if (p.type === 'brand') { score += 100; currentDiamonds++; }
                else if (p.type === 'snow') slowModeTimer = 300;
                tg?.HapticFeedback.impactOccurred('light');
            }
            items.splice(i, 1);
        } else if (p.y > canvas.height) {
            if (p.type !== 'bomb' && p.type !== 'snow') { lives--; combo = 0; }
            items.splice(i, 1);
        }
        if (lives <= 0) gameOver();
    });

    drawUI();
    if (!isGameOver) requestAnimationFrame(update);
}

function drawUI() {
    ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(10, 10, 180, 100);
    ctx.fillStyle = "white"; ctx.font = "bold 18px Arial";
    ctx.fillText("🍅 Score: " + score, 20, 35);
    ctx.fillText("💎 Diamonds: " + currentDiamonds, 20, 60);
    ctx.fillText("❤️ Lives: " + "❤️".repeat(lives), 20, 85);
}

function gameOver() {
    isGameOver = true; clearInterval(spawnInterval);
    const user = tg?.initDataUnsafe?.user;
    fetch(`${SERVER_URL}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: user?.id || 0, username: user?.first_name || "Guest", score: score })
    });
    
    let totalD = (parseInt(localStorage.getItem('totalDiamonds')) || 0) + currentDiamonds;
    localStorage.setItem('totalDiamonds', totalD);
    if (score > (localStorage.getItem('highScore') || 0)) localStorage.setItem('highScore', score);

    tg.MainButton.setText("O'YIN TUGADI - QAYTA BOSHLASH").show().onClick(() => location.reload());
}

canvas.addEventListener('touchmove', (e) => {
    let x = e.touches[0].clientX - basket.width / 2;
    basket.x = Math.max(0, Math.min(canvas.width - basket.width, x));
}, { passive: false });

window.startGameLoop = () => {
    isGameOver = false; score = 0; lives = 3; items = [];
    spawnInterval = setInterval(spawnItem, 700);
    update();
};
