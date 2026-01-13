const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Ma'lumotlarni saqlash
let highScore = localStorage.getItem('highScore') || 0;
let totalDiamonds = parseInt(localStorage.getItem('totalDiamonds')) || 0;

let assets = {};
let imagesToLoad = 4; 
let loadedCount = 0;
let assetsLoaded = false;

// Telegram Haptic
const tg = window.Telegram?.WebApp;

function imageLoaded() {
    loadedCount++;
    if (loadedCount === imagesToLoad) assetsLoaded = true;
}

const path = 'assaets/';

// Rasmlarni yuklash
assets.basket = new Image();
assets.basket.src = path + 'basket.png';
assets.basket.onload = imageLoaded;

assets.tomato = new Image();
assets.tomato.src = path + 'products/tomatoFon.png'; 
assets.tomato.onload = imageLoaded;

assets.brand = new Image();
assets.brand.src = path + 'products/tomato.png'; 
assets.brand.onload = imageLoaded;

assets.snow = new Image();
assets.snow.src = path + 'products/snow.png';
assets.snow.onload = imageLoaded;
assets.snow.onerror = () => imageLoaded(); 

let basket = { x: canvas.width / 2 - 60, y: canvas.height - 160, width: 120, height: 85 };
let items = [];
let score = 0;
let currentDiamonds = 0;
let lives = 3;
let combo = 0;
let isGameOver = false;
let spawnInterval = null;
let slowModeTimer = 0;
let shakeTimer = 0; // Ekran titrashi uchun
let gameSpeed = 6;  // Boshlang'ich tezlik (Adrenalin uchun yuqori)

function spawnItem() {
    if (isGameOver) return;

    let rand = Math.random();
    let type;

    // Ehtimolliklar:
    if (rand < 0.15) type = 'bomb';    // 15% Bomba (Xavf)
    else if (rand < 0.25) type = 'brand'; // 10% Brend Banka (Almaz + 100 ball)
    else if (rand < 0.30) type = 'snow';  // 5% Qor (Sekinlashuv)
    else type = 'tomato';                 // 70% Oddiy pomidor

    items.push({
        x: Math.random() * (canvas.width - 65),
        y: -70,
        width: 65,
        height: 65,
        type: type,
        speedMod: 0.8 + Math.random() * 0.6, // Har bir obyekt tezligi har xil
        drift: (Math.random() - 0.5) * 2     // Shamol effekti (sal qiya tushish)
    });
}

function update() {
    if (isGameOver) return;

    // Ekran titrashi mantiqi
    let sx = 0, sy = 0;
    if (shakeTimer > 0) {
        sx = (Math.random() - 0.5) * 15;
        sy = (Math.random() - 0.5) * 15;
        shakeTimer--;
    }

    ctx.save();
    ctx.translate(sx, sy); // Butun ekranni titratish
    ctx.clearRect(-20, -20, canvas.width + 40, canvas.height + 40);

    // Tezlik ochkoga qarab doimiy oshib boradi
    let currentGlobalSpeed = (gameSpeed + (score / 300)) * (slowModeTimer > 0 ? 0.5 : 1);

    if (slowModeTimer > 0) {
        slowModeTimer--;
        ctx.fillStyle = "rgba(135, 206, 250, 0.15)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (assetsLoaded) {
        ctx.drawImage(assets.basket, basket.x, basket.y, basket.width, basket.height);
    }

    for (let i = 0; i < items.length; i++) {
        let p = items[i];
        p.y += currentGlobalSpeed * p.speedMod;
        p.x += p.drift; // Yon tomonga siljish

        if (assetsLoaded) {
            if (p.type === 'bomb') {
                // Bomba uchun vizual effekt (agar bomb.png bo'lmasa qizil doira)
                ctx.fillStyle = 'black';
                ctx.beginPath(); ctx.arc(p.x + 32, p.y + 32, 30, 0, Math.PI*2); ctx.fill();
                ctx.font = "30px Arial"; ctx.fillText("💣", p.x + 15, p.y + 45);
            } else {
                let img = p.type === 'brand' ? assets.brand : (p.type === 'snow' ? assets.snow : assets.tomato);
                ctx.drawImage(img, p.x, p.y, p.width, p.height);
            }
        }

        // To'qnashuv (Collision)
        if (p.y + p.height >= basket.y + 20 && p.y <= basket.y + 60 &&
            p.x + p.width >= basket.x && p.x <= basket.x + basket.width) {
            
            if (p.type === 'bomb') {
                lives--;
                combo = 0;
                shakeTimer = 15; // Ekran qaltiraydi
                if (tg) tg.HapticFeedback.notificationOccurred('error');
            } else if (p.type === 'tomato') {
                combo++;
                score += 10 + (Math.floor(combo / 5) * 5); // Combo bonus
            } else if (p.type === 'brand') {
                combo++;
                score += 100;
                currentDiamonds += 1;
                if (tg) tg.HapticFeedback.impactOccurred('medium');
            } else if (p.type === 'snow') {
                slowModeTimer = 300;
            }

            items.splice(i, 1); i--;
            if (lives <= 0) gameOver();
            continue;
        }

        // Pastga tushib ketishi
        if (p.y > canvas.height) {
            if (p.type === 'tomato' || p.type === 'brand') {
                lives--;
                combo = 0;
                shakeTimer = 10;
            }
            items.splice(i, 1); i--;
            if (lives <= 0) gameOver();
        }
    }

    ctx.restore(); // Titrashni tugatish
    drawUI();
    requestAnimationFrame(update);
}

function drawUI() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.roundRect(15, 15, 230, 165, 20);
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
        ctx.fillText('🔥 COMBO x' + combo, 30, 155);
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
    isGameOver = true;
    clearInterval(spawnInterval);
    totalDiamonds += currentDiamonds;
    localStorage.setItem('totalDiamonds', totalDiamonds);
    if (score > highScore) localStorage.setItem('highScore', score);
    
    if (tg) {
        tg.MainButton.setText("O'yin tugadi. Qayta boshlash?");
        tg.MainButton.show();
        tg.MainButton.onClick(() => location.reload());
    } else {
        alert("O'yin tugadi! Ball: " + score);
        location.reload();
    }
}

window.startGameLoop = function() {
    isGameOver = false;
    score = 0;
    lives = 3;
    currentDiamonds = 0;
    combo = 0;
    items = [];
    slowModeTimer = 0;
    gameSpeed = 6;
    
    if(spawnInterval) clearInterval(spawnInterval);
    spawnInterval = setInterval(spawnItem, 750); // Tezroq tushish
    
    requestAnimationFrame(update);
};
