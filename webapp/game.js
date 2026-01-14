const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const tg = window.Telegram?.WebApp;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let assets = {};
let imagesToLoad = 5;
let loadedCount = 0;
let assetsLoaded = false;
const path = 'assaets/';

// Rasmlarni yuklash
const loadAsset = (key, src) => {
    assets[key] = new Image();
    assets[key].src = path + src;
    assets[key].onload = () => {
        loadedCount++;
        if (loadedCount === imagesToLoad) assetsLoaded = true;
    };
};

loadAsset('basket', 'basket.png');
loadAsset('tomato', 'products/tomatoFon.png');
loadAsset('brand', 'products/tomato.png');
loadAsset('snow', 'products/snow.png');
loadAsset('bomb', 'products/bomb.png');

let basket = { x: canvas.width / 2 - 60, y: canvas.height - 160, width: 120, height: 85 };
let items = [], score = 0, currentDiamonds = 0, lives = 3, combo = 0;
let isGameOver = false, spawnInterval = null, slowModeTimer = 0, shakeTimer = 0;

function spawnItem() {
    if (isGameOver) return;
    let r = Math.random();
    let type = r < 0.15 ? 'bomb' : r < 0.25 ? 'brand' : r < 0.32 ? 'snow' : 'tomato';
    items.push({
        x: Math.random() * (canvas.width - 65), y: -80, width: 65, height: 65,
        type: type, speed: (7 + (score / 200)) * (0.9 + Math.random() * 0.8)
    });
}

function update() {
    if (isGameOver) return;
    
    let sx = 0, sy = 0;
    if (shakeTimer > 0) { sx = (Math.random() - 0.5) * 15; sy = (Math.random() - 0.5) * 15; shakeTimer--; }

    ctx.save();
    ctx.translate(sx, sy);
    ctx.clearRect(-20, -20, canvas.width + 40, canvas.height + 40);

    let speedMul = (slowModeTimer > 0) ? 0.5 : 1;
    if (slowModeTimer > 0) {
        slowModeTimer--;
        ctx.fillStyle = "rgba(135, 206, 250, 0.1)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (assetsLoaded) ctx.drawImage(assets.basket, basket.x, basket.y, basket.width, basket.height);

    for (let i = 0; i < items.length; i++) {
        let p = items[i];
        p.y += p.speed * speedMul;

        if (assetsLoaded) ctx.drawImage(assets[p.type], p.x, p.y, p.width, p.height);

        // Tutib olish (Collision)
        if (p.y + p.height >= basket.y + 10 && p.y <= basket.y + 40 &&
            p.x + p.width >= basket.x && p.x <= basket.x + basket.width) {
            
            if (p.type === 'bomb') {
                lives--; shakeTimer = 20; tg?.HapticFeedback.notificationOccurred('error');
            } else {
                combo++;
                if (p.type === 'tomato') score += 10;
                else if (p.type === 'brand') { score += 100; currentDiamonds++; }
                else if (p.type === 'snow') slowModeTimer = 300;
                tg?.HapticFeedback.impactOccurred('medium');
            }
            items.splice(i, 1); i--;
            if (lives <= 0) gameOver();
            continue;
        }

        if (p.y > canvas.height) {
            if (p.type === 'tomato') lives--;
            items.splice(i, 1); i--;
            if (lives <= 0) gameOver();
        }
    }
    ctx.restore();
    drawUI();
    requestAnimationFrame(update);
}

function drawUI() {
    ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.roundRect(15, 15, 200, 110, 15); ctx.fill();
    ctx.fillStyle = 'white'; ctx.font = 'bold 20px Arial';
    ctx.fillText('🍅 Ball: ' + score, 30, 45);
    ctx.fillText('💎 Almaz: ' + currentDiamonds, 30, 75);
    ctx.fillText('❤️ Jon: ' + lives, 30, 105);
}

function gameOver() {
    isGameOver = true;
    clearInterval(spawnInterval);
    
    const user = tg?.initDataUnsafe?.user;
    fetch(`oyinbackent-production.up.railway.app`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: user?.id || 0, username: user?.first_name || "Guest", score: score })
    });

    localStorage.setItem('totalDiamonds', (parseInt(localStorage.getItem('totalDiamonds')) || 0) + currentDiamonds);
    if (score > (localStorage.getItem('highScore') || 0)) localStorage.setItem('highScore', score);

    setTimeout(() => {
        tg?.MainButton.setText(`BALL: ${score} | QAYTADAN BOSHLA`).show().onClick(() => location.reload());
    }, 500);
}

canvas.addEventListener('touchmove', (e) => {
    let tx = e.touches[0].clientX - basket.width / 2;
    basket.x = Math.max(0, Math.min(canvas.width - basket.width, tx));
}, { passive: false });

window.startGameLoop = function() {
    isGameOver = false; score = 0; lives = 3; items = [];
    if (spawnInterval) clearInterval(spawnInterval);
    spawnInterval = setInterval(spawnItem, 700);
    update();
};
