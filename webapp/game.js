const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let highScore = localStorage.getItem('highScore') || 0;
let totalDiamonds = parseInt(localStorage.getItem('totalDiamonds')) || 0;

let assets = {};
let imagesToLoad = 3; 
let loadedCount = 0;
let assetsLoaded = false;

function imageLoaded() {
    loadedCount++;
    if (loadedCount === imagesToLoad) assetsLoaded = true;
}

const path = 'assaets/'; 

// 1. Savat (Sizning basket.png)
assets.basket = new Image();
assets.basket.src = path + 'basket.png';
assets.basket.onload = imageLoaded;

// 2. Meni Brendim (Pomidor rasmiga almashtirildi)
assets.myBrand = new Image();
assets.myBrand.src = path + 'products/tomato.png'; 
assets.myBrand.onload = imageLoaded;

// 3. Boshqa Brend (Ikkinchi turdagi pomidor)
assets.otherBrand = new Image();
assets.otherBrand.src = path + 'products/other_tomato.png';
assets.otherBrand.onload = imageLoaded;

let basket = { 
    x: canvas.width / 2 - 60, 
    y: canvas.height - 160, 
    width: 120, 
    height: 85 
};

let items = [];
let score = 0;
let currentDiamonds = 0;
let lives = 3;
let speed = 4;
let combo = 0; 
let isGameOver = false;
let spawnInterval = null;

// FRENZY MODE - O'yinni qiziqarli qilish uchun
let frenzyMode = false;
let frenzyTimer = 0;

function spawnItem() {
    if (isGameOver) return;
    
    // Har 50 ochkoda tezlik biroz oshadi
    if (!frenzyMode) speed = 4 + Math.floor(score / 50); 

    // Pomidor tushish ehtimoli (Frenzy mode paytida faqat yaxshi pomidor tushadi)
    const isMyBrand = frenzyMode ? true : Math.random() > 0.2;
    const size = 65; 

    items.push({
        x: Math.random() * (canvas.width - size),
        y: -size,
        width: size,
        height: size,
        type: isMyBrand ? 'myBrand' : 'otherBrand',
        image: isMyBrand ? assets.myBrand : assets.otherBrand,
        isSpecial: frenzyMode
    });
}

function update() {
    if (isGameOver) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Frenzy Mode vizual effekti
    if (frenzyMode) {
        frenzyTimer--;
        ctx.fillStyle = "rgba(255, 69, 0, 0.1)"; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (frenzyTimer <= 0) { frenzyMode = false; speed -= 2; }
    }

    // Savatni chizish
    if (assetsLoaded) {
        ctx.drawImage(assets.basket, basket.x, basket.y, basket.width, basket.height);
    }

    for (let i = 0; i < items.length; i++) {
        let p = items[i];
        p.y += speed;

        if (assetsLoaded) {
            // Frenzy paytida pomidorlar yaltiraydi
            if (p.isSpecial) {
                ctx.shadowBlur = 15;
                ctx.shadowColor = "gold";
            }
            ctx.drawImage(p.image, p.x, p.y, p.width, p.height);
            ctx.shadowBlur = 0;
        }

        // To'qnashuv mantiqi
        if (p.y + p.height >= basket.y + 20 && p.y <= basket.y + 50 &&
            p.x + p.width >= basket.x + 10 && p.x <= basket.x + basket.width - 10) {
            
            if (p.type === 'myBrand') {
                combo++;
                score += 10;
                
                // Har 5 ta comboda 1 ta almaz beriladi
                if (combo % 5 === 0) currentDiamonds += 1;

                // QIZIQARLI FUNKSIYA: 15 ta combo bo'lsa FRENZY MODE yoqiladi
                if (combo === 15) {
                    frenzyMode = true;
                    frenzyTimer = 350; // ~6-7 soniya
                    speed += 2;
                }
            } else {
                lives -= 1;
                combo = 0;
                frenzyMode = false;
            }
            items.splice(i, 1); i--;
            if (lives <= 0) { gameOver(); return; }
            continue;
        }

        // Pastga tushib ketsa
        if (p.y > canvas.height) {
            if (p.type === 'myBrand' && !frenzyMode) {
                lives -= 1;
                combo = 0;
            }
            items.splice(i, 1); i--;
            if (lives <= 0) { gameOver(); return; }
        }
    }

    drawUI();
    requestAnimationFrame(update);
}

function drawUI() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.roundRect(15, 15, 210, 140, 15);
    ctx.fill();

    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('🍅 Pomidorlar: ' + score, 30, 45);
    
    ctx.fillStyle = '#00f2ff'; 
    ctx.fillText('💎 Almazlar: ' + currentDiamonds, 30, 80);

    ctx.fillStyle = 'white';
    ctx.fillText('❤️ Jon: ' + '❤️'.repeat(Math.max(0, lives)), 30, 115);

    if (combo >= 5) {
        ctx.fillStyle = frenzyMode ? '#FFD700' : '#ADFF2F';
        ctx.font = 'italic bold 22px Arial';
        ctx.fillText(frenzyMode ? '🔥 FRENZY MODE 🔥' : 'Combo x' + combo, 30, 180);
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
    
    // Almazlarni jami hisobga qo'shish
    totalDiamonds += currentDiamonds;
    localStorage.setItem('totalDiamonds', totalDiamonds);

    if (score > highScore) localStorage.setItem('highScore', score);
    
    alert(`O'yin tugadi!\nYig'ilgan pomidorlar: ${score}\nYutilgan almazlar: ${currentDiamonds}`);
    location.reload();
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
