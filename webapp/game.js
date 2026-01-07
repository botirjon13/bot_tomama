const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let assets = {};
let imagesToLoad = 3;
let loadedCount = 0;

function imageLoaded() {
    loadedCount++;
    if (loadedCount === imagesToLoad) {
        update(); 
    }
}

function imageError(e) {
    console.error("Fayl topilmadi: " + e.target.src);
}

// RASMLAR YO'LI (Diqqat: assets/ papkasi webapp ichida bo'lishi kerak)
assets.basket = new Image();
assets.basket.src = 'assets/basket.png';
assets.basket.onload = imageLoaded;
assets.basket.onerror = imageError;

assets.myBrand = new Image();
assets.myBrand.src = 'assets/products/tomato.png';
assets.myBrand.onload = imageLoaded;
assets.myBrand.onerror = imageError;

assets.otherBrand = new Image();
assets.otherBrand.src = 'assets/products/other_tomato.png';
assets.otherBrand.onload = imageLoaded;
assets.otherBrand.onerror = imageError;

let basket = { x: canvas.width / 2 - 50, y: canvas.height - 100, width: 100, height: 70 };
let items = [];
let score = 0;
let lives = 3;
let speed = 3;
let isGameOver = false;

function spawnItem() {
    if (isGameOver) return;
    const isMyBrand = Math.random() > 0.2;
    items.push({
        x: Math.random() * (canvas.width - 50),
        y: -50,
        width: 45,
        height: 45,
        type: isMyBrand ? 'myBrand' : 'otherBrand',
        image: isMyBrand ? assets.myBrand : assets.otherBrand
    });
}

let spawnInterval = setInterval(spawnItem, 1000);

function update() {
    if (isGameOver) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(assets.basket, basket.x, basket.y, basket.width, basket.height);

    for (let i = 0; i < items.length; i++) {
        let p = items[i];
        p.y += speed;
        ctx.drawImage(p.image, p.x, p.y, p.width, p.height);

        if (p.y + p.height >= basket.y && p.x + p.width >= basket.x && p.x <= basket.x + basket.width) {
            if (p.type === 'myBrand') score += 1;
            else lives -= 1;
            items.splice(i, 1); i--;
            if (lives <= 0) { gameOver(); return; }
            continue;
        }

        if (p.y > canvas.height) {
            if (p.type === 'myBrand') lives -= 1;
            if (lives <= 0) { gameOver(); return; }
            items.splice(i, 1); i--;
        }
    }

    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText('Ochko: ' + score, 20, 40);
    ctx.fillText('Jonlar: ' + '❤️'.repeat(lives), 20, 70);

    requestAnimationFrame(update);
}

function moveBasket(e) {
    e.preventDefault();
    let clientX = e.touches ? e.touches[0].clientX : e.clientX;
    basket.x = clientX - basket.width / 2;
}

canvas.addEventListener('touchmove', moveBasket, { passive: false });
canvas.addEventListener('mousemove', moveBasket);

function gameOver() {
    isGameOver = true;
    clearInterval(spawnInterval);
    alert("O'yin tugadi! Natijangiz: " + score);
    location.reload();
}
