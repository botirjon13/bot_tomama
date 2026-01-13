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

function imageLoaded() {
    loadedCount++;
    if (loadedCount === imagesToLoad) assetsLoaded = true;
}

const path = 'assaets/';

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
let baseSpeed = 5; // Boshlang'ich tezlik yuqoriroq
let combo = 0;
let isGameOver = false;
let spawnInterval = null;
let slowModeTimer = 0;

function spawnItem() {
    if (isGameOver) return;

    let rand = Math.random();
    let type, img;

    // Ehtimolliklar qayta ko'rib chiqildi:
    if (rand < 0.05) { // 5% Qor (kamaytirildi)
        type = 'snow';
        img = assets.snow;
    } else if (rand < 0.15) { // 10% Brend banka
        type = 'brand';
        img = assets.brand;
    } else { // 85% Oddiy pomidor
        type = 'tomato';
        img = assets.tomato;
    }

    items.push({
        x: Math.random() * (canvas.width - 65),
        y: -70,
        width: 65,
        height: 65,
        type: type,
        image: img,
        speedMultiplier: 0.8 + Math.random() * 0.5 // Har bir pomidor har xil tezlikda tushadi
    });
}

function update() {
    if (isGameOver) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // O'yin davomida tezlik asta-sekin oshib boradi
    let currentGlobalSpeed = baseSpeed + (score / 200); 
    
    if (slowModeTimer > 0) {
        slowModeTimer--;
        currentGlobalSpeed *= 0.5; // Muzlatish paytida sekinlashadi
        ctx.fillStyle = "rgba(135, 206, 250, 0.2)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (assetsLoaded) {
        ctx.drawImage(assets.basket, basket.x, basket.y, basket.width, basket.height);
    }

    for (let i = 0; i < items.length; i++) {
        let p = items[i];
        p.y += currentGlobalSpeed * p.speedMultiplier;

        if (assetsLoaded && p.image) {
            ctx.drawImage(p.image, p.x, p.y, p.width, p.height);
        }

        // To'qnashuv
        if (p.y + p.height >= basket.y + 20 && p.y <= basket.y + 60 &&
            p.x + p.width >= basket.x && p.x <= basket.x + basket.width) {
            
            if (p.type === 'tomato') {
                combo++;
                score += 10 + Math.floor(combo / 5) * 5; // Combo qancha yuqori bo'lsa, ball shuncha ko'p
            } else if (p.type === 'brand') {
                combo++;
                score += 100;
                currentDiamonds += 1;
            } else if (p.type === 'snow') {
                slowModeTimer = 250; 
            }

            items.splice(i, 1); i--;
            continue;
        }

        if (p.y > canvas.height) {
            if (p.type !== 'snow') {
                lives--;
                combo = 0; // Pomidor tushib ketsa combo nolga tushadi
            }
            items.splice(i, 1); i--;
            if (lives <= 0) gameOver();
        }
    }

    drawUI();
    requestAnimationFrame(update);
}

function drawUI() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.roundRect(15, 15, 230, 160, 20);
    ctx.fill();

    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('🍅 Ball: ' + score, 30, 50);
    
    ctx.fillStyle = '#00f2ff';
    ctx.fillText('💎 Almaz: ' + currentDiamonds, 30, 85);
    
    ctx.fillStyle = '#ff4d4d';
    ctx.fillText('❤️ Jon: ' + '❤️'.repeat(Math.max(0, lives)), 30, 120);

    if (combo > 2) {
        ctx.fillStyle = '#FFD700';
        ctx.font = 'italic bold 22px sans-serif';
        ctx.fillText('🔥 Combo x' + combo, 30, 155);
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
    
    alert(`O'yin tugadi!\nBall: ${score}\nAlmaz: ${currentDiamonds}\nEng baland Combo: ${combo}`);
    location.reload();
}

window.startGameLoop = function() {
    isGameOver = false;
    score = 0;
    lives = 3;
    currentDiamonds = 0;
    combo = 0;
    items = [];
    slowModeTimer = 0;
    baseSpeed = 5; 
    
    if(spawnInterval) clearInterval(spawnInterval);
    // Vaqt o'tishi bilan pomidorlar tezroq tushishni boshlaydi
    spawnInterval = setInterval(spawnItem, 700); 
    
    requestAnimationFrame(update);
};
