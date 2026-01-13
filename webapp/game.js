const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Telegram WebApp va Rekord tizimi
//const tg = window.Telegram?.WebApp;
let highScore = localStorage.getItem('highScore') || 0;

let assets = {};
let imagesToLoad = 3; 
let loadedCount = 0;
let assetsLoaded = false;

// Rasmlar yuklanishini nazorat qilish
function imageLoaded() {
    loadedCount++;
    if (loadedCount === imagesToLoad) {
        assetsLoaded = true;
        console.log("Barcha rasmlar yuklandi!");
    }
}

function imageError(e) {
    console.error("Fayl topilmadi: " + e.target.src);
    imageLoaded(); // Xato bo'lsa ham o'yin to'xtab qolmasligi uchun
}

// RASMLAR YO'LI (Sizning 'assaets' papkangizga aniq moslandi)
const path = 'assaets/';

assets.basket = new Image();
assets.basket.src = path + 'basket.png';
assets.basket.onload = imageLoaded;
assets.basket.onerror = imageError;

assets.myBrand = new Image();
assets.myBrand.src = path + 'products/tomato.png';
assets.myBrand.onload = imageLoaded;
assets.myBrand.onerror = imageError;

assets.otherBrand = new Image();
assets.otherBrand.src = path + 'products/other_tomato.png';
assets.otherBrand.onload = imageLoaded;
assets.otherBrand.onerror = imageError;

let basket = { 
    x: canvas.width / 2 - 60, 
    y: canvas.height - 160, 
    width: 120, 
    height: 85 
};

let items = [];
let score = 0;
let lives = 3;
let speed = 3;
let combo = 0; 
let isGameOver = false;
let spawnInterval = null;

// Tebranish funksiyasi
function triggerHaptic(type) {
    if (tg && tg.HapticFeedback) {
        if (type === 'impact') tg.HapticFeedback.impactOccurred('medium');
        if (type === 'error') tg.HapticFeedback.notificationOccurred('error');
    }
}

function spawnItem() {
    if (isGameOver) return;
    
    // Har 50 ochkoda tezlik oshadi
    speed = 3 + Math.floor(score / 50); 

    const isMyBrand = Math.random() > 0.2;
    const itemWidth = 65; 
    const itemHeight = 65;

    items.push({
        x: Math.random() * (canvas.width - itemWidth),
        y: -itemHeight,
        width: itemWidth,
        height: itemHeight,
        type: isMyBrand ? 'myBrand' : 'otherBrand',
        image: isMyBrand ? assets.myBrand : assets.otherBrand
    });
}

function update() {
    // Agar rasmlar yuklanmagan bo'lsa ham, o'yin qora kvadrat bo'lib qolmasligi uchun logic
    if (isGameOver) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Savatni chizish
    if (assetsLoaded) {
        ctx.drawImage(assets.basket, basket.x, basket.y, basket.width, basket.height);
    } else {
        ctx.fillStyle = "brown";
        ctx.fillRect(basket.x, basket.y, basket.width, basket.height);
    }

    for (let i = 0; i < items.length; i++) {
        let p = items[i];
        p.y += speed;

        if (assetsLoaded) {
            ctx.drawImage(p.image, p.x, p.y, p.width, p.height);
        } else {
            ctx.fillStyle = p.type === 'myBrand' ? "red" : "black";
            ctx.fillRect(p.x, p.y, p.width, p.height);
        }

        // To'qnashuv (Hitbox optimallashtirildi)
        if (p.y + p.height >= basket.y + 20 && p.y <= basket.y + 50 &&
            p.x + p.width >= basket.x + 10 && p.x <= basket.x + basket.width - 10) {
            
            if (p.type === 'myBrand') {
                combo++;
                let multiplier = Math.floor(combo / 5) + 1;
                score += 10 * multiplier;
                if (score > highScore) {
                    highScore = score;
                    localStorage.setItem('highScore', highScore);
                }
                triggerHaptic('impact');
            } else {
                lives -= 1;
                combo = 0;
                triggerHaptic('error');
            }
            items.splice(i, 1); i--;
            if (lives <= 0) { gameOver(); return; }
            continue;
        }

        // Pastga tushib ketishi
        if (p.y > canvas.height) {
            if (p.type === 'myBrand') {
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
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.roundRect(15, 15, 200, 120, 15);
    ctx.fill();

    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('🏆 Ochko: ' + score, 30, 45);
    
    ctx.fillStyle = '#FFD700'; 
    ctx.fillText('⭐ Rekord: ' + highScore, 30, 75);

    ctx.fillStyle = 'white';
    ctx.fillText('❤️ Jonlar: ' + '❤️'.repeat(lives > 0 ? lives : 0), 30, 105);

    if (combo >= 2) {
        ctx.fillStyle = '#ADFF2F';
        ctx.font = 'italic bold 22px Arial';
        ctx.fillText('Combo x' + combo, 30, 145);
    }
}

function moveBasket(e) {
    e.preventDefault();
    let clientX = e.touches ? e.touches[0].clientX : e.clientX;
    basket.x = clientX - basket.width / 2;

    if (basket.x < 0) basket.x = 0;
    if (basket.x + basket.width > canvas.width) basket.x = canvas.width - basket.width;
}

canvas.addEventListener('touchmove', moveBasket, { passive: false });
canvas.addEventListener('mousemove', moveBasket);

function gameOver() {
    isGameOver = true;
    clearInterval(spawnInterval);
    
    if (score >= highScore) {
        localStorage.setItem('highScore', score);
    }
    
    if(window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.MainButton.setText(`Natija: ${score} | Rekord: ${highScore}`);
        window.Telegram.WebApp.MainButton.show();
        window.Telegram.WebApp.MainButton.onClick(() => location.reload());
    } else {
        alert("O'yin tugadi! Natija: " + score);
        location.reload();
    }
}

window.startGameLoop = function() {
    // Rasmlar yuklanishini kutmasdan boshlash uchun majburiy true
    assetsLoaded = true; 
    score = 0;
    lives = 3;
    combo = 0;
    isGameOver = false;
    items = [];
    speed = 3;
    
    if(spawnInterval) clearInterval(spawnInterval);
    
    // Birinchisini darhol tushiramiz
    spawnItem(); 
    spawnInterval = setInterval(spawnItem, 1000);
    
    requestAnimationFrame(update);
    
    if(window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.MainButton.hide();
    }
};
