const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Telegram WebApp va Rekord tizimi (2026 yangilanishi)
const tg = window.Telegram?.WebApp;
let highScore = localStorage.getItem('highScore') || 0;

let assets = {};
let imagesToLoad = 3; 
let loadedCount = 0;
let assetsLoaded = false;

function imageLoaded() {
    loadedCount++;
    if (loadedCount === imagesToLoad) {
        assetsLoaded = true;
        console.log("Barcha rasmlar muvaffaqiyatli yuklandi!");
    }
}

function imageError(e) {
    console.error("Fayl topilmadi: " + e.target.src);
    imageLoaded(); 
}

// RASMLAR YO'LI (Sizning 'assaets' papkangizga moslandi)
assets.basket = new Image();
assets.basket.src = 'assaets/basket.png';
assets.basket.onload = imageLoaded;
assets.basket.onerror = imageError;

assets.myBrand = new Image();
assets.myBrand.src = 'assaets/products/tomato.png';
assets.myBrand.onload = imageLoaded;
assets.myBrand.onerror = imageError;

assets.otherBrand = new Image();
assets.otherBrand.src = 'assaets/products/other_tomato.png';
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
let combo = 0; // Yangi qo'shildi
let isGameOver = false;
let spawnInterval = null;

// Tebranish funksiyasi (Faqat Telegramda ishlaydi)
function triggerHaptic(type) {
    if (tg && tg.HapticFeedback) {
        if (type === 'impact') tg.HapticFeedback.impactOccurred('medium');
        if (type === 'error') tg.HapticFeedback.notificationOccurred('error');
    }
}

function spawnItem() {
    if (isGameOver) return;
    
    speed = 3 + Math.floor(score / 100); // Qiyinchilik darajasi har 100 ochkoda oshadi

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
    if (isGameOver || !assetsLoaded) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(assets.basket, basket.x, basket.y, basket.width, basket.height);

    for (let i = 0; i < items.length; i++) {
        let p = items[i];
        p.y += speed;
        ctx.drawImage(p.image, p.x, p.y, p.width, p.height);

        // To'qnashuv logikasi (Sizning kodingiz takomillashtirildi)
        if (p.y + p.height >= basket.y + 10 && p.y <= basket.y + 30 &&
            p.x + p.width >= basket.x + 10 && p.x <= basket.x + basket.width - 10) {
            
            if (p.type === 'myBrand') {
                combo++;
                let multiplier = Math.floor(combo / 5) + 1; // Har 5 ta combo ochkoni oshiradi
                score += 10 * multiplier;
                if (score > highScore) highScore = score; // Rekordni yangilash
                triggerHaptic('impact');
            } else {
                lives -= 1;
                combo = 0; // Xato bo'lsa combo nolga tushadi
                triggerHaptic('error');
            }
            items.splice(i, 1); i--;
            if (lives <= 0) { gameOver(); return; }
            continue;
        }

        // Mahsulot pastga tushib ketishi
        if (p.y > canvas.height) {
            if (p.type === 'myBrand') {
                lives -= 1;
                combo = 0;
                triggerHaptic('error');
            }
            if (lives <= 0) { gameOver(); return; }
            items.splice(i, 1); i--;
        }
    }

    drawUI();
    requestAnimationFrame(update);
}

// Yangi UI chizish funksiyasi (Zamonaviyroq)
function drawUI() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.roundRect(15, 15, 190, 115, 15);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('🏆 Ochko: ' + score, 30, 45);
    
    ctx.fillStyle = '#FFD700'; // Oltin rang rekord uchun
    ctx.fillText('⭐ Rekord: ' + highScore, 30, 75);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('❤️ Jon: ' + '❤️'.repeat(lives), 30, 105);

    if (combo >= 2) {
        ctx.fillStyle = '#ADFF2F';
        ctx.font = 'italic bold 22px Arial';
        ctx.fillText('Combo x' + combo, 30, 135);
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
    
    // Rekordni doimiy saqlash
    if (score >= highScore) {
        localStorage.setItem('highScore', score);
    }
    
    if(window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.MainButton.setText(`Natija: ${score} | Rekord: ${highScore}`);
        window.Telegram.WebApp.MainButton.show();
        window.Telegram.WebApp.MainButton.onClick(goHome);
    } else {
        alert(`O'yin tugadi!\nNatijangiz: ${score}\nRekord: ${highScore}`);
        goHome();
    }
}

function goHome() {
    location.reload();
}

window.startGameLoop = function() {
    if (!assetsLoaded) return;
    score = 0;
    lives = 3;
    combo = 0;
    isGameOver = false;
    items = [];
    speed = 3;
    if(spawnInterval) clearInterval(spawnInterval);
    spawnInterval = setInterval(spawnItem, 1000);
    requestAnimationFrame(update);
    
    if(window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.MainButton.hide();
    }
};
