const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let highScore = localStorage.getItem('highScore') || 0;
let totalDiamonds = parseInt(localStorage.getItem('totalDiamonds')) || 0;

let assets = {};
let imagesToLoad = 4; // basket, tomato, brand, snow
let loadedCount = 0;
let assetsLoaded = false;

function imageLoaded() {
    loadedCount++;
    if (loadedCount === imagesToLoad) {
        assetsLoaded = true;
        console.log("Barcha rasmlar tayyor!");
    }
}

const path = 'assaets/';

// Rasmlarni yuklash
assets.basket = new Image();
assets.basket.src = path + 'basket.png';
assets.basket.onload = imageLoaded;

assets.tomato = new Image();
assets.tomato.src = path + 'products/tomatoFon.png'; // Oddiy pomidor
assets.tomato.onload = imageLoaded;

assets.brand = new Image();
assets.brand.src = path + 'products/tomato.png'; // Brend banka
assets.brand.onload = imageLoaded;

assets.snow = new Image();
assets.snow.src = path + 'products/snow.png'; // Qor parchasi (assaets/products/snow.png bo'lishi kerak)
assets.snow.onload = imageLoaded;
assets.snow.onerror = () => { console.log("Qor rasmi topilmadi, vaqtinchalik rang ishlatiladi"); imageLoaded(); };

let basket = { x: canvas.width / 2 - 60, y: canvas.height - 160, width: 120, height: 85 };
let items = [];
let score = 0;
let currentDiamonds = 0;
let lives = 3;
let speed = 4;
let isGameOver = false;
let spawnInterval = null;
let slowModeTimer = 0; // Sekinlashuv taymeri

function spawnItem() {
    if (isGameOver) return;

    let rand = Math.random();
    let type, img, w = 65, h = 65;

    if (rand < 0.1) { // 10% Brend banka
        type = 'brand';
        img = assets.brand;
    } else if (rand < 0.2) { // 10% Qor
        type = 'snow';
        img = assets.snow;
    } else { // 80% Oddiy pomidor
        type = 'tomato';
        img = assets.tomato;
    }

    items.push({
        x: Math.random() * (canvas.width - w),
        y: -h,
        width: w,
        height: h,
        type: type,
        image: img
    });
}

function update() {
    if (isGameOver) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Sekinlashuv mantiqi
    let currentSpeed = speed;
    if (slowModeTimer > 0) {
        slowModeTimer--;
        currentSpeed = speed * 0.5; // Tezlikni yarmi
        ctx.fillStyle = "rgba(0, 191, 255, 0.1)"; // Muzlash effekti
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Savatni chizish
    if (assetsLoaded) {
        ctx.drawImage(assets.basket, basket.x, basket.y, basket.width, basket.height);
    }

    for (let i = 0; i < items.length; i++) {
        let p = items[i];
        p.y += currentSpeed;

        if (assetsLoaded && p.image) {
            ctx.drawImage(p.image, p.x, p.y, p.width, p.height);
        } else {
            ctx.fillStyle = p.type === 'brand' ? 'gold' : (p.type === 'snow' ? 'white' : 'red');
            ctx.fillRect(p.x, p.y, p.width, p.height);
        }

        // To'qnashuv
        if (p.y + p.height >= basket.y + 20 && p.y <= basket.y + 60 &&
            p.x + p.width >= basket.x && p.x <= basket.x + basket.width) {
            
            if (p.type === 'tomato') {
                score += 10;
            } else if (p.type === 'brand') {
                score += 100;
                currentDiamonds += 1;
            } else if (p.type === 'snow') {
                slowModeTimer = 300; // ~6 soniya sekinlashuv
            }

            items.splice(i, 1); i--;
            continue;
        }

        // Pastga tushib ketish
        if (p.y > canvas.height) {
            if (p.type !== 'snow') lives--; // Faqat qor tushib ketsa jon ketmaydi
            items.splice(i, 1); i--;
            if (lives <= 0) gameOver();
        }
    }

    drawUI();
    requestAnimationFrame(update);
}

function drawUI() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.roundRect(15, 15, 220, 140, 15);
    ctx.fill();

    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('🍅 Ball: ' + score, 30, 45);
    ctx.fillStyle = '#00f2ff';
    ctx.fillText('💎 Almaz: ' + currentDiamonds, 30, 80);
    ctx.fillStyle = '#ff4d4d';
    ctx.fillText('❤️ Jon: ' + '❤️'.repeat(Math.max(0, lives)), 30, 115);

    if (slowModeTimer > 0) {
        ctx.fillStyle = '#00bfff';
        ctx.font = 'italic bold 18px Arial';
        ctx.fillText('❄️ Muzlash: ' + Math.ceil(slowModeTimer/60) + 's', 30, 145);
    }
}

// Savat harakati
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
    
    alert(`O'yin tugadi!\nBall: ${score}\nAlmaz: ${currentDiamonds}`);
    location.reload();
}

// BU FUNKSIYA index.html DAGI TUGMA BILAN BOG'LANGAN
window.startGameLoop = function() {
    console.log("O'yin boshlandi...");
    isGameOver = false;
    score = 0;
    lives = 3;
    currentDiamonds = 0;
    items = [];
    slowModeTimer = 0;
    speed = 4;
    
    if(spawnInterval) clearInterval(spawnInterval);
    spawnInterval = setInterval(spawnItem, 800);
    
    requestAnimationFrame(update);
};
