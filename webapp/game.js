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

// Fon rasmi yuklash
const bgImage = new Image();
bgImage.src = 'assaets/products/tomatoFon.png';

function imageLoaded() {
    loadedCount++;
    if (loadedCount === imagesToLoad) assetsLoaded = true;
}

const path = 'assaets/';
assets.basket = new Image();
assets.basket.src = path + 'basket.png';
assets.basket.onload = imageLoaded;

assets.myBrand = new Image();
assets.myBrand.src = path + 'products/tomato.png';
assets.myBrand.onload = imageLoaded;

assets.otherBrand = new Image();
assets.otherBrand.src = path + 'products/other_tomato.png';
assets.otherBrand.onload = imageLoaded;

assets.diamond = new Image(); // Olmos belgisi uchun (ixtiyoriy yoki matn)
assets.diamond.src = 'cdn-icons-png.flaticon.com'; 
assets.diamond.onload = imageLoaded;

let basket = { x: canvas.width / 2 - 60, y: canvas.height - 160, width: 120, height: 85 };
let items = [];
let score = 0;
let diamonds = 0;
let lives = 3;
let speed = 4;
let combo = 0; 
let isGameOver = false;
let frenzyMode = false; // Yangi funksiya: Shiddatli vaqt
let frenzyTimer = 0;

function spawnItem() {
    if (isGameOver) return;
    
    speed = 4 + Math.floor(score / 100); 
    // Frenzy mode paytida ko'proq pomidor tushadi
    let spawnChance = frenzyMode ? 0.95 : 0.8;
    const isMyBrand = Math.random() < spawnChance;

    items.push({
        x: Math.random() * (canvas.width - 65),
        y: -70,
        width: 65,
        height: 65,
        type: isMyBrand ? 'myBrand' : 'otherBrand',
        image: isMyBrand ? assets.myBrand : assets.otherBrand,
        special: frenzyMode && isMyBrand // Frenzy paytida yaltiraydi
    });
}

function update() {
    if (isGameOver) return;
    
    // Fonni chizish
    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);

    if (frenzyMode) {
        frenzyTimer--;
        if (frenzyTimer <= 0) frenzyMode = false;
        ctx.fillStyle = "rgba(255, 215, 0, 0.1)"; // Oltin effekt
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(assets.basket, basket.x, basket.y, basket.width, basket.height);

    for (let i = 0; i < items.length; i++) {
        let p = items[i];
        p.y += frenzyMode ? speed * 1.2 : speed;

        // Frenzy effektini chizish
        if (p.special) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = "gold";
        }
        ctx.drawImage(p.image, p.x, p.y, p.width, p.height);
        ctx.shadowBlur = 0;

        // To'qnashuv
        if (p.y + p.height >= basket.y + 20 && p.y <= basket.y + 50 &&
            p.x + p.width >= basket.x + 10 && p.x <= basket.x + basket.width - 10) {
            
            if (p.type === 'myBrand') {
                combo++;
                score += frenzyMode ? 20 : 10;
                
                // Har 5 combo uchun olmos
                if (combo % 5 === 0) {
                    diamonds += 1;
                    triggerHaptic('impact');
                }
                
                // Frenzy Mode trigger (15 combo)
                if (combo === 15) {
                    frenzyMode = true;
                    frenzyTimer = 300; // ~5-6 soniya
                }
            } else {
                lives -= 1;
                combo = 0;
                frenzyMode = false;
                triggerHaptic('error');
            }
            items.splice(i, 1); i--;
            if (lives <= 0) gameOver();
            continue;
        }

        if (p.y > canvas.height) {
            if (p.type === 'myBrand' && !frenzyMode) {
                lives -= 1;
                combo = 0;
                triggerHaptic('error');
            }
            items.splice(i, 1); i--;
            if (lives <= 0) gameOver();
        }
    }

    drawUI();
    requestAnimationFrame(update);
}

function drawUI() {
    // Shaffof panel
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.beginPath();
    ctx.roundRect(15, 15, 220, 140, 20);
    ctx.fill();

    ctx.fillStyle = 'white';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('🍅 Pomidor: ' + score, 30, 50);
    
    ctx.fillStyle = '#00f2ff'; 
    ctx.fillText('💎 Almaz: ' + diamonds, 30, 85);

    ctx.fillStyle = '#ff4d4d';
    ctx.fillText('❤️ Jon: ' + '❤️'.repeat(lives), 30, 120);

    if (combo >= 5) {
        ctx.fillStyle = frenzyMode ? '#FFD700' : '#ADFF2F';
        ctx.font = 'italic bold 26px Arial';
        ctx.fillText(frenzyMode ? '🔥 FRENZY! 🔥' : 'Combo x' + combo, 30, 180);
    }
}

// Suring funksiyasi (Savat harakati)
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
    totalDiamonds += diamonds;
    localStorage.setItem('totalDiamonds', totalDiamonds);
    if (score > highScore) localStorage.setItem('highScore', score);
    
    alert(`O'yin tugadi!\nYig'ilgan pomidor: ${score}\nTopilgan almazlar: ${diamonds}`);
    location.reload();
}

// O'yinni boshlash
setInterval(spawnItem, 800);
requestAnimationFrame(update);

function triggerHaptic(type) {
    if (window.Telegram?.WebApp?.HapticFeedback) {
        if (type === 'impact') window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
        if (type === 'error') window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
    }
}
