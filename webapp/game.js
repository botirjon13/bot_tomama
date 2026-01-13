const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Ekran o'lchamlari
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Ma'lumotlarni yuklash
let highScore = localStorage.getItem('highScore') || 0;
let totalDiamonds = parseInt(localStorage.getItem('totalDiamonds')) || 0;

let assets = {};
let imagesToLoad = 3; 
let loadedCount = 0;
let assetsLoaded = false;

// Telegram WebApp obyektini tekshirish
//const tg = window.Telegram?.WebApp;

function imageLoaded() {
    loadedCount++;
    if (loadedCount === imagesToLoad) {
        assetsLoaded = true;
    }
}

// RASMLAR YO'LI
const path = 'assaets/'; // Papka nomi 'assets' bo'lsa to'g'irlab qo'ying
assets.basket = new Image();
assets.basket.src = path + 'basket.png';
assets.basket.onload = imageLoaded;

assets.myBrand = new Image();
assets.myBrand.src = path + 'products/tomato.png';
assets.myBrand.onload = imageLoaded;

assets.otherBrand = new Image();
assets.otherBrand.src = path + 'products/other_tomato.png';
assets.otherBrand.onload = imageLoaded;

// Fon rasmi (Majburiy emas, lekin vizual uchun)
const bgImg = new Image();
bgImg.src = path + 'products/tomatoFon.png';

let basket = { 
    x: canvas.width / 2 - 60, 
    y: canvas.height - 150, 
    width: 120, 
    height: 90 
};

let items = [];
let score = 0;
let currentDiamonds = 0;
let lives = 3;
let speed = 4;
let combo = 0; 
let isGameOver = false;
let spawnInterval = null;
let frenzyMode = false;
let frenzyTimer = 0;

function triggerHaptic(type) {
    if (tg && tg.HapticFeedback) {
        if (type === 'impact') tg.HapticFeedback.impactOccurred('medium');
        if (type === 'error') tg.HapticFeedback.notificationOccurred('error');
    }
}

function spawnItem() {
    if (isGameOver) return;
    
    // Har 100 ochkoda tezlik oshadi
    if (!frenzyMode) speed = 4 + Math.floor(score / 100); 

    const isMyBrand = Math.random() > (frenzyMode ? 0.05 : 0.25);
    const itemSize = 65;

    items.push({
        x: Math.random() * (canvas.width - itemSize),
        y: -itemSize,
        width: itemSize,
        height: itemSize,
        type: isMyBrand ? 'myBrand' : 'otherBrand',
        image: isMyBrand ? assets.myBrand : assets.otherBrand,
        isGolden: frenzyMode && isMyBrand
    });
}

function update() {
    if (isGameOver) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fonni chizish
    if (bgImg.complete) {
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
    }

    // Frenzy Mode effekti
    if (frenzyMode) {
        frenzyTimer--;
        ctx.fillStyle = "rgba(255, 215, 0, 0.15)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (frenzyTimer <= 0) {
            frenzyMode = false;
            speed -= 2;
        }
    }

    // Savatni chizish
    if (assetsLoaded) {
        ctx.drawImage(assets.basket, basket.x, basket.y, basket.width, basket.height);
    }

    for (let i = 0; i < items.length; i++) {
        let p = items[i];
        p.y += frenzyMode ? speed + 2 : speed;

        if (assetsLoaded) {
            if (p.isGolden) {
                ctx.shadowBlur = 15;
                ctx.shadowColor = "gold";
            }
            ctx.drawImage(p.image, p.x, p.y, p.width, p.height);
            ctx.shadowBlur = 0;
        }

        // To'qnashuv
        if (p.y + p.height >= basket.y + 20 && p.y <= basket.y + 60 &&
            p.x + p.width >= basket.x && p.x <= basket.x + basket.width) {
            
            if (p.type === 'myBrand') {
                combo++;
                score += 10;
                
                // Combo almaz beradi
                if (combo % 5 === 0) {
                    currentDiamonds += 1;
                    triggerHaptic('impact');
                }

                // Frenzy mode yoqish (15 combo bo'lsa)
                if (combo === 15) {
                    frenzyMode = true;
                    frenzyTimer = 400; // ~7 sekund
                }
            } else {
                lives -= 1;
                combo = 0;
                frenzyMode = false;
                triggerHaptic('error');
            }
            items.splice(i, 1); i--;
            if (lives <= 0) { gameOver(); return; }
            continue;
        }

        // Pastga tushib ketishi
        if (p.y > canvas.height) {
            if (p.type === 'myBrand' && !frenzyMode) {
                lives -= 1;
                combo = 0;
                triggerHaptic('error');
            }
            items.splice(i, 1); i--;
            if (lives <= 0) { gameOver(); return; }
        }
    }

    drawUI();
    requestAnimationFrame(update);
}

function drawUI() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.roundRect(15, 15, 220, 150, 20);
    ctx.fill();

    ctx.fillStyle = 'white';
    ctx.font = 'bold 22px Arial';
    ctx.fillText('🍅 Pomidor: ' + score, 30, 50);
    
    ctx.fillStyle = '#00f2ff'; 
    ctx.fillText('💎 Almaz: ' + currentDiamonds, 30, 85);

    ctx.fillStyle = '#ff4d4d';
    ctx.fillText('❤️ Jon: ' + '❤️'.repeat(Math.max(0, lives)), 30, 120);

    if (combo >= 5) {
        ctx.fillStyle = frenzyMode ? '#FFD700' : '#ADFF2F';
        ctx.font = 'italic bold 24px Arial';
        ctx.fillText(frenzyMode ? '🔥 FRENZY 🔥' : 'Combo x' + combo, 30, 185);
    }
}

function moveBasket(e) {
    let clientX = e.touches ? e.touches[0].clientX : e.clientX;
    let targetX = clientX - basket.width / 2;
    basket.x = Math.max(0, Math.min(canvas.width - basket.width, targetX));
}

canvas.addEventListener('touchmove', (e) => { e.preventDefault(); moveBasket(e); }, { passive: false });
canvas.addEventListener('mousemove', moveBasket);

function gameOver() {
    isGameOver = true;
    clearInterval(spawnInterval);
    
    // Almazlarni saqlash
    totalDiamonds += currentDiamonds;
    localStorage.setItem('totalDiamonds', totalDiamonds);

    if (score > highScore) {
        localStorage.setItem('highScore', score);
    }
    
    if(tg) {
        tg.MainButton.setText(`Tugadi! 💎 +${currentDiamonds} | 🏠 Menyu`);
        tg.MainButton.show();
        tg.MainButton.onClick(() => location.reload());
    } else {
        alert(`O'yin tugadi!\nPomidorlar: ${score}\nAlmazlar: ${currentDiamonds}`);
        location.reload();
    }
}

window.startGameLoop = function() {
    score = 0;
    currentDiamonds = 0;
    lives = 3;
    combo = 0;
    isGameOver = false;
    items = [];
    speed = 4;
    frenzyMode = false;
    
    if(spawnInterval) clearInterval(spawnInterval);
    spawnItem(); 
    spawnInterval = setInterval(spawnItem, 900);
    
    requestAnimationFrame(update);
};
