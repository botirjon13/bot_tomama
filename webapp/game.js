const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Telegram WebApp va Lokal Ma'lumotlar
const tg = window.Telegram?.WebApp;
let highScore = localStorage.getItem('highScore') || 0;

let assaets = {};
let imagesToLoad = 3; 
let loadedCount = 0;
let assetsLoaded = false;

// O'yin o'zgaruvchilari
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
let isSlowMotion = false;
let slowMoTimer = null;
let spawnInterval = null;

// Aktivlarni yuklash
function imageLoaded() {
    loadedCount++;
    if (loadedCount === imagesToLoad) {
        assetsLoaded = true;
        console.log("Barcha grafikalar yuklandi!");
    }
}

assaets.basket = new Image();
assaets.basket.src = 'assaets/basket.png'; 
assets.basket.onload = imageLoaded;

assaets.myBrand = new Image();
assaets.myBrand.src = 'assaets/products/tomato.png'; 
assaets.myBrand.onload = imageLoaded;

assaets.otherBrand = new Image();
assaets.otherBrand.src = 'assaets/products/other_tomato.png'; 
assaets.otherBrand.onload = imageLoaded;

// Effektlar funksiyalari
function triggerHaptic(type) {
    if (tg && tg.HapticFeedback) {
        if (type === 'success') tg.HapticFeedback.notificationOccurred('success');
        if (type === 'error') tg.HapticFeedback.notificationOccurred('error');
        if (type === 'impact') tg.HapticFeedback.impactOccurred('medium');
    }
}

function activateSlowMo() {
    isSlowMotion = true;
    clearTimeout(slowMoTimer);
    slowMoTimer = setTimeout(() => { isSlowMotion = false; }, 5000);
}

function spawnItem() {
    if (isGameOver) return;
    
    speed = 3 + Math.floor(score / 100); 
    const rand = Math.random();
    let type, image;

    if (rand > 0.96) { // 4% imkoniyat bilan Bonus (Oltin pomidor)
        type = 'bonus';
        image = assets.myBrand; 
    } else if (rand > 0.25) {
        type = 'myBrand';
        image = assets.myBrand;
    } else {
        type = 'otherBrand';
        image = assets.otherBrand;
    }

    items.push({
        x: Math.random() * (canvas.width - 65),
        y: -70,
        width: 65,
        height: 65,
        type: type,
        image: image
    });
}

function update() {
    if (isGameOver || !assetsLoaded) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (isSlowMotion) {
        ctx.fillStyle = "rgba(0, 191, 255, 0.05)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(assets.basket, basket.x, basket.y, basket.width, basket.height);

    let currentSpeed = isSlowMotion ? 2.5 : speed;

    for (let i = 0; i < items.length; i++) {
        let p = items[i];
        p.y += currentSpeed;

        if (p.type === 'bonus') {
            ctx.shadowBlur = 15;
            ctx.shadowColor = "gold";
        }
        ctx.drawImage(p.image, p.x, p.y, p.width, p.height);
        ctx.shadowBlur = 0;

        // To'qnashuv logikasi (Optimallashtirilgan hitbox)
        if (p.y + p.height >= basket.y + 10 && p.y <= basket.y + 30 &&
            p.x + p.width >= basket.x + 10 && p.x <= basket.x + basket.width - 10) {
            
            if (p.type === 'bonus') {
                activateSlowMo();
                triggerHaptic('success');
            } else if (p.type === 'myBrand') {
                combo++;
                let multiplier = Math.floor(combo / 5) + 1;
                score += 10 * multiplier;
                if (score > highScore) highScore = score;
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
    // Info Panel
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.beginPath();
    ctx.roundRect(15, 15, 210, 135, 15);
    ctx.fill();

    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('🏆 Ball: ' + score, 30, 45);
    
    ctx.fillStyle = '#FFD700';
    ctx.fillText('⭐ Rekord: ' + highScore, 30, 75);

    ctx.fillStyle = 'white';
    ctx.fillText('❤️ Jon: ' + '❤️'.repeat(lives), 30, 105);
    
    if (combo >= 2) {
        ctx.fillStyle = '#ADFF2F';
        ctx.font = 'italic bold 22px sans-serif';
        ctx.fillText('Combo x' + combo, 30, 135);
    }

    if (isSlowMotion) {
        ctx.fillStyle = '#00BFFF';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText('❄️ SEKINLASHUV FAOL', canvas.width/2 - 70, 35);
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

    if(tg) {
        tg.MainButton.setText(`TUGADI! BALL: ${score} | REKORD: ${highScore}`);
        tg.MainButton.show();
        tg.MainButton.onClick(() => location.reload());
    } else {
        alert(`O'yin tugadi!\nBall: ${score}\nRekord: ${highScore}`);
        location.reload();
    }
}

window.startGameLoop = function() {
    if (!assetsLoaded) return;
    score = 0;
    lives = 3;
    combo = 0;
    isGameOver = false;
    items = [];
    if(spawnInterval) clearInterval(spawnInterval);
    spawnInterval = setInterval(spawnItem, 1000);
    requestAnimationFrame(update);
    if(tg) tg.MainButton.hide();
};
