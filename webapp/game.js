const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let highScore = localStorage.getItem('highScore') || 0;
let totalDiamonds = parseInt(localStorage.getItem('totalDiamonds')) || 0;

let assets = {};
let imagesToLoad = 4; 
let loadedCount = 0;
let assetsLoaded = false;

//const tg = window.Telegram?.WebApp;

function imageLoaded() {
    loadedCount++;
    if (loadedCount === imagesToLoad) assetsLoaded = true;
}

const path = 'assaets/';

// Rasmlarni yuklash (Xatoliklarni oldini olish uchun onerror qo'shildi)
const loadAsset = (key, src) => {
    assets[key] = new Image();
    assets[key].src = path + src;
    assets[key].onload = imageLoaded;
    assets[key].onerror = () => { console.log(key + " yuklanmadi"); imageLoaded(); };
};

loadAsset('basket', 'basket.png');
loadAsset('tomato', 'products/tomatoFon.png');
loadAsset('brand', 'products/tomato.png');
loadAsset('snow', 'products/snow.png');

let basket = { x: canvas.width / 2 - 60, y: canvas.height - 160, width: 120, height: 85 };
let items = [];
let score = 0, currentDiamonds = 0, lives = 3, combo = 0;
let isGameOver = false;
let spawnInterval = null;
let slowModeTimer = 0, shakeTimer = 0;
let gameSpeed = 6;

function spawnItem() {
    if (isGameOver) return;

    let rand = Math.random();
    let type = 'tomato';
    if (rand < 0.15) type = 'bomb';
    else if (rand < 0.25) type = 'brand';
    else if (rand < 0.32) type = 'snow';

    items.push({
        x: Math.random() * (canvas.width - 65),
        y: -70,
        width: 65,
        height: 65,
        type: type,
        speedMod: 0.8 + Math.random() * 0.7,
        drift: (Math.random() - 0.5) * 2.5 // Shamol effekti kuchaytirildi
    });
}

function update() {
    if (isGameOver) return;

    // Ekran titrashi
    let sx = 0, sy = 0;
    if (shakeTimer > 0) {
        sx = (Math.random() - 0.5) * 20;
        sy = (Math.random() - 0.5) * 20;
        shakeTimer--;
    }

    ctx.save();
    ctx.translate(sx, sy);
    ctx.clearRect(-50, -50, canvas.width + 100, canvas.height + 100);

    let currentGlobalSpeed = (gameSpeed + (score / 250)) * (slowModeTimer > 0 ? 0.5 : 1);

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

        // Obyektlarni chizish
        if (p.type === 'bomb') {
            ctx.font = "50px Arial";
            ctx.fillText("💣", p.x + 5, p.y + 45);
        } else if (assetsLoaded) {
            let img = p.type === 'brand' ? assets.brand : (p.type === 'snow' ? assets.snow : assets.tomato);
            ctx.drawImage(img, p.x, p.y, p.width, p.height);
        }

        // To'qnashuv mantiqi (Hitbox to'g'rilandi)
        if (p.y + p.height - 10 >= basket.y && p.y <= basket.y + 40 &&
            p.x + p.width - 10 >= basket.x && p.x <= basket.x + basket.width) {
            
            if (p.type === 'bomb') {
                lives -= 1;
                combo = 0;
                shakeTimer = 20;
                if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
            } else {
                combo++;
                if (p.type === 'tomato') score += 10 + (Math.floor(combo / 5) * 5);
                else if (p.type === 'brand') { score += 100; currentDiamonds += 1; }
                else if (p.type === 'snow') slowModeTimer = 300;
                if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
            }

            items.splice(i, 1); i--;
            if (lives <= 0) { gameOver(); break; }
            continue;
        }

        // Pastga tushib ketish
        if (p.y > canvas.height) {
            if (p.type === 'tomato' || p.type === 'brand') {
                lives -= 1;
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
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.roundRect(15, 15, 240, 160, 20);
    ctx.fill();

    ctx.fillStyle = 'white';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('🍅 Ball: ' + score, 30, 50);
    ctx.fillStyle = '#00f2ff';
    ctx.fillText('💎 Almaz: ' + currentDiamonds, 30, 85);
    ctx.fillStyle = '#ff4d4d';
    ctx.fillText('❤️ Jon: ' + '❤️'.repeat(Math.max(0, lives)), 30, 120);

    if (combo > 2) {
        ctx.fillStyle = '#FFD700';
        ctx.font = 'italic bold 24px sans-serif';
        ctx.fillText('🔥 COMBO x' + combo, 30, 153);
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

function gameOver() {
    if (isGameOver) return;
    isGameOver = true;
    clearInterval(spawnInterval);
    
    totalDiamonds += currentDiamonds;
    localStorage.setItem('totalDiamonds', totalDiamonds);
    if (score > highScore) localStorage.setItem('highScore', score);
    
    setTimeout(() => {
        if (tg) {
            tg.MainButton.setText(`Tugadi! 💎 +${currentDiamonds} | Qayta boshlash`);
            tg.MainButton.show();
            tg.MainButton.onClick(() => location.reload());
        } else {
            alert(`O'yin tugadi!\nBall: ${score}\nAlmaz: ${currentDiamonds}`);
            location.reload();
        }
    }, 100);
}

window.startGameLoop = function() {
    isGameOver = false;
    score = 0; lives = 3; currentDiamonds = 0; combo = 0;
    items = []; slowModeTimer = 0; gameSpeed = 7;
    
    if (spawnInterval) clearInterval(spawnInterval);
    spawnInterval = setInterval(spawnItem, 700);
    
    requestAnimationFrame(update);
};
