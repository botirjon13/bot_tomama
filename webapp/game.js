// game.js
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Telegram SDK ni xavfsiz aniqlash
const tg = window.Telegram?.WebApp || null; 
// Server manzilini aniqlash
const SERVER_URL = 'https://oyinbackent-production.up.railway.app';


canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let highScore = localStorage.getItem('highScore') || 0;
let totalDiamonds = parseInt(localStorage.getItem('totalDiamonds')) || 0;

let assets = {};
let imagesToLoad = 5; // basket, tomato, brand, snow, bomb
let loadedCount = 0;
let assetsLoaded = false;

const path = 'assaets/';

// Rasmlarni yuklash funksiyasi
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

// O‘yin update
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

    // Savat
    if (assetsLoaded && assets.basket.complete) {
        ctx.drawImage(assets.basket, basket.x, basket.y, basket.width, basket.height);
    }

    for (let i = 0; i < items.length; i++) {
        let p = items[i];
        p.y += currentGlobalSpeed * p.speedMod;
        p.x += p.drift;

        if (p.x <= 0) {
            p.x = 0;
            p.drift = Math.abs(p.drift);
        } else if (p.x + p.width >= canvas.width) {
            p.x = canvas.width - p.width;
            p.drift = -Math.abs(p.drift);
        }

        if (assetsLoaded) {
            let img = assets[p.type];
            if (img && img.complete) {
                ctx.drawImage(img, p.x, p.y, p.width, p.height);
            }
        }

        // Collision
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

// UI chizish
function drawUI() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
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
        ctx.font = 'italic bold 26px sans-serif';
        ctx.fillText('🔥 COMBO x' + combo, 30, 155);
    }
}

// Savatni harakatlantirish
function moveBasket(e) {
    let clientX = e.touches ? e.touches[0].clientX : e.clientX;
    let targetX = clientX - basket.width / 2;
    if (targetX < 0) targetX = 0;
    if (targetX + basket.width > canvas.width) targetX = canvas.width - basket.width;
    basket.x = targetX;
}

canvas.addEventListener('touchmove', (e) => { e.preventDefault(); moveBasket(e); }, { passive: false });
canvas.addEventListener('mousemove', moveBasket);

// DATABASE BILAN BOG'LANISH QISMI
function gameOver() {
    if (isGameOver) return;
    isGameOver = true;
    clearInterval(spawnInterval);

    // Telegram foydalanuvchi ma'lumotlarini olish
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    
    // Serverga yuborish uchun ma'lumotlarni tayyorlash
    const gameData = {
        telegram_id: tgUser?.id || 0, 
        username: tgUser?.username || tgUser?.first_name || "Noma'lum",
        score: score
    };

    // Natijani PostgreSQL serveriga yuborish
    fetch(`${SERVER_URL}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gameData)
    })
    .then(() => console.log("Natija serverga saqlandi!"))
    .catch(e => console.error("Server bilan bog'lanishda xato:", e));

    totalDiamonds += currentDiamonds;
    localStorage.setItem('totalDiamonds', totalDiamonds);
    if (score > highScore) localStorage.setItem('highScore', score);

    setTimeout(() => {
        if (window.Telegram?.WebApp) {
            const tg = window.Telegram.WebApp;
            tg.MainButton.offClick();
            tg.MainButton.setText(`NATIJA: ${score} 🍅 | MENYUGA QAYTISH`);
            tg.MainButton.show();
            tg.MainButton.onClick(() => {
                tg.MainButton.hide();
                window.location.reload();
            });
        } else {
            alert(`O'yin tugadi!\nJami pomidorlar: ${score}\nTopilgan almazlar: ${currentDiamonds}`);
            window.location.reload();
        }
    }, 200);
}


// O‘yinni boshlash
window.startGameLoop = function() {
    isGameOver = false;
    score = 0; lives = 3; currentDiamonds = 0; combo = 0;
    items = []; slowModeTimer = 0; gameSpeed = 7;

    if (spawnInterval) clearInterval(spawnInterval);
    spawnInterval = setInterval(spawnItem, 650);

    requestAnimationFrame(update);
    // tg o'zgaruvchisi endi global aniqlangan
    if (tg) tg.MainButton.hide();
};
