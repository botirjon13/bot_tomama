const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const tg = window.Telegram?.WebApp;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let assets = {};
let imagesToLoad = 3;
let loadedCount = 0;
let assetsLoaded = false;

function imageLoaded() {
    loadedCount++;
    if (loadedCount === imagesToLoad) assetsLoaded = true;
}

// Sizning aniq papka yo'lingiz: assaets
assets.basket = new Image();
assets.basket.src = 'assaets/basket.png';
assets.basket.onload = imageLoaded;

assets.myBrand = new Image();
assets.myBrand.src = 'assaets/products/tomato.png';
assets.myBrand.onload = imageLoaded;

assets.otherBrand = new Image();
assets.otherBrand.src = 'assaets/products/other_tomato.png';
assets.otherBrand.onload = imageLoaded;

let basket = { x: canvas.width / 2 - 60, y: canvas.height - 160, width: 120, height: 85 };
let items = [], score = 0, lives = 3, speed = 3, combo = 0, isGameOver = false;
let highScore = localStorage.getItem('highScore') || 0;
let spawnInterval = null;

function spawnItem() {
    if (isGameOver) return;
    const isMyBrand = Math.random() > 0.25;
    items.push({
        x: Math.random() * (canvas.width - 65),
        y: -70,
        width: 65,
        height: 65,
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

        if (p.y + p.height >= basket.y + 10 && p.y <= basket.y + 30 &&
            p.x + p.width >= basket.x + 10 && p.x <= basket.x + basket.width - 10) {
            if (p.type === 'myBrand') {
                combo++;
                score += 10 * (Math.floor(combo / 5) + 1);
                if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
            } else {
                lives--;
                combo = 0;
                if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
            }
            items.splice(i, 1); i--;
            if (lives <= 0) gameOver();
            continue;
        }

        if (p.y > canvas.height) {
            if (p.type === 'myBrand') { lives--; combo = 0; }
            items.splice(i, 1); i--;
            if (lives <= 0) gameOver();
        }
    }
    drawUI();
    requestAnimationFrame(update);
}

function drawUI() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.roundRect(15, 15, 200, 110, 15); ctx.fill();
    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('🏆 Ball: ' + score, 30, 45);
    ctx.fillStyle = '#FFD700';
    ctx.fillText('⭐ Rekord: ' + highScore, 30, 75);
    ctx.fillStyle = 'white';
    ctx.fillText('❤️ Jon: ' + '❤️'.repeat(lives), 30, 105);
}

function gameOver() {
    isGameOver = true;
    clearInterval(spawnInterval);
    if (score > highScore) localStorage.setItem('highScore', score);
    
    // O'yin tugagach menyuga qaytish
    setTimeout(() => {
        document.getElementById('gameCanvas').classList.add('hidden');
        document.getElementById('mainMenu').classList.remove('hidden');
        location.reload(); 
    }, 1000);
}

window.startGameLoop = function() {
    score = 0; lives = 3; isGameOver = false; items = [];
    spawnInterval = setInterval(spawnItem, 1000);
    update();
};

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    let clientX = e.touches[0].clientX;
    basket.x = clientX - basket.width / 2;
}, { passive: false });
