const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Telegram
const tg = window.Telegram?.WebApp;

// Rekord
let highScore = Number(localStorage.getItem('highScore')) || 0;

// ================= ASSETS =================
const assets = {};
const path = 'assaets/';
let assetsLoaded = false;
let loadedCount = 0;
const imagesToLoad = 3;

function imageLoaded() {
    loadedCount++;
    if (loadedCount === imagesToLoad) assetsLoaded = true;
}

function imageError(e) {
    console.warn('Rasm topilmadi:', e.target.src);
    imageLoaded();
}

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

// ================= GAME STATE =================
let basket = {
    x: canvas.width / 2 - 60,
    y: canvas.height - 160,
    width: 120,
    height: 85
};

let items = [];
let score = 0;
let lives = 3;
let combo = 0;
let speed = 3;
let isGameOver = false;

// Timing (FPS FIX)
let lastTime = 0;
let lastSpawnTime = 0;
let spawnDelay = 1000;

// ================= HAPTIC =================
function triggerHaptic(type) {
    if (!tg || !tg.HapticFeedback) return;
    if (type === 'impact') tg.HapticFeedback.impactOccurred('medium');
    if (type === 'error') tg.HapticFeedback.notificationOccurred('error');
}

// ================= SPAWN =================
function spawnItem() {
    const isMyBrand = Math.random() > 0.2;
    const size = 65;

    items.push({
        x: Math.random() * (canvas.width - size),
        y: -size,
        width: size,
        height: size,
        type: isMyBrand ? 'myBrand' : 'otherBrand',
        image: isMyBrand ? assets.myBrand : assets.otherBrand
    });
}

// ================= MAIN LOOP =================
function update(time = 0) {
    if (isGameOver) return;

    const delta = time - lastTime;
    lastTime = time;

    // QIYINCHILIK
    speed = 3 + score / 80;
    spawnDelay = Math.max(300, 1000 - score * 5);

    // SPAWN CONTROL
    lastSpawnTime += delta;
    if (lastSpawnTime >= spawnDelay) {
        spawnItem();
        lastSpawnTime = 0;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // BASKET
    if (assetsLoaded) {
        ctx.drawImage(assets.basket, basket.x, basket.y, basket.width, basket.height);
    } else {
        ctx.fillStyle = 'brown';
        ctx.fillRect(basket.x, basket.y, basket.width, basket.height);
    }

    // ITEMS
    for (let i = 0; i < items.length; i++) {
        const p = items[i];
        p.y += speed * delta * 0.06;

        if (assetsLoaded) {
            ctx.drawImage(p.image, p.x, p.y, p.width, p.height);
        } else {
            ctx.fillStyle = p.type === 'myBrand' ? 'red' : 'black';
            ctx.fillRect(p.x, p.y, p.width, p.height);
        }

        // COLLISION
        if (
            p.y + p.height >= basket.y + 20 &&
            p.y <= basket.y + 50 &&
            p.x + p.width >= basket.x + 10 &&
            p.x <= basket.x + basket.width - 10
        ) {
            if (p.type === 'myBrand') {
                combo++;
                const multiplier = Math.floor(combo / 5) + 1;
                score += 10 * multiplier;
                triggerHaptic('impact');

                if (score > highScore) {
                    highScore = score;
                    localStorage.setItem('highScore', highScore);
                }
            } else {
                lives--;
                combo = 0;
                triggerHaptic('error');
            }

            items.splice(i, 1);
            i--;

            if (lives <= 0) {
                gameOver();
                return;
            }
            continue;
        }

        // FALL DOWN
        if (p.y > canvas.height) {
            if (p.type === 'myBrand') {
                lives--;
                combo = 0;
                triggerHaptic('error');
            }
            items.splice(i, 1);
            i--;

            if (lives <= 0) {
                gameOver();
                return;
            }
        }
    }

    drawUI();
    requestAnimationFrame(update);
}

// ================= UI =================
function drawUI() {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.roundRect(15, 15, 200, 120, 15);
    ctx.fill();

    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('🏆 Ochko: ' + score, 30, 45);

    ctx.fillStyle = '#FFD700';
    ctx.fillText('⭐ Rekord: ' + highScore, 30, 75);

    ctx.fillStyle = 'white';
    ctx.fillText('❤️ Jonlar: ' + '❤️'.repeat(Math.max(0, lives)), 30, 105);

    if (combo >= 2) {
        ctx.fillStyle = '#ADFF2F';
        ctx.font = 'italic bold 22px Arial';
        ctx.fillText('Combo x' + combo, 30, 145);
    }
}

// ================= INPUT =================
function moveBasket(e) {
    e.preventDefault();
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    basket.x = x - basket.width / 2;

    basket.x = Math.max(0, Math.min(canvas.width - basket.width, basket.x));
}

canvas.addEventListener('touchmove', moveBasket, { passive: false });
canvas.addEventListener('mousemove', moveBasket);

// ================= GAME OVER =================
function gameOver() {
    isGameOver = true;

    if (tg) {
        tg.MainButton.setText(`Natija: ${score} | Rekord: ${highScore}`);
        tg.MainButton.show();
        tg.MainButton.onClick(() => location.reload());
    } else {
        alert("O'yin tugadi! Natija: " + score);
        location.reload();
    }
}

// ================= START =================
window.startGameLoop = function () {
    score = 0;
    lives = 3;
    combo = 0;
    items = [];
    isGameOver = false;
    lastTime = 0;
    lastSpawnTime = 0;

    if (tg) tg.MainButton.hide();

    requestAnimationFrame(update);
};
