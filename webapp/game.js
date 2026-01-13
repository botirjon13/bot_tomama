const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let score = 0, diamonds = 0, lives = 3, speed = 4;
let isGameOver = false, slowModeTimer = 0, feverMode = 0;
let items = [], assets = {}, loadedCount = 0;

const path = 'assaets/';
const images = {
    basket: 'basket.png',
    tomato: 'products/tomatoFon.png', // Oddiy pomidor
    brand: 'products/tomato.png',      // Brend banka
    snow: 'products/snow.png'         // Qor (faylni shu nomda saqlang)
};

Object.keys(images).forEach(key => {
    assets[key] = new Image();
    assets[key].src = path + images[key];
    assets[key].onload = () => { if(++loadedCount === 4) startGame(); };
});

function spawnItem() {
    if (isGameOver) return;
    const rand = Math.random();
    let type = 'tomato';
    if (rand < 0.1) type = 'brand';
    else if (rand < 0.2) type = 'snow';

    items.push({
        x: Math.random() * (canvas.width - 60),
        y: -60,
        type: type,
        img: assets[type],
        w: 60, h: 60
    });
}

function update() {
    if (isGameOver) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Sekinlashtirish rejimi hisobi
    let currentSpeed = slowModeTimer > 0 ? speed * 0.5 : speed;
    if (slowModeTimer > 0) slowModeTimer--;

    // Savatni chizish (Fever mode bo'lsa savat kattalashadi)
    let bW = feverMode > 0 ? 160 : 120;
    ctx.drawImage(assets.basket, basket.x, basket.y, bW, 85);

    for (let i = 0; i < items.length; i++) {
        let p = items[i];
        p.y += currentSpeed;
        ctx.drawImage(p.img, p.x, p.y, p.w, p.h);

        // To'qnashuv
        if (p.y + p.h > basket.y && p.x + p.w > basket.x && p.x < basket.x + bW) {
            if (p.type === 'tomato') {
                score += (feverMode > 0 ? 20 : 10);
                feverMode = Math.min(feverMode + 1, 20);
            } else if (p.type === 'brand') {
                score += 100;
                diamonds += 1;
                triggerHaptic('impact');
            } else if (p.type === 'snow') {
                slowModeTimer = 300; // ~5-6 soniya sekinlashuv
            }
            items.splice(i, 1); i--;
            continue;
        }

        if (p.y > canvas.height) {
            if (p.type !== 'snow') { lives--; feverMode = 0; }
            items.splice(i, 1); i--;
            if (lives <= 0) gameOver();
        }
    }
    drawUI();
    requestAnimationFrame(update);
}

function drawUI() {
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.roundRect(10, 10, 220, 140, 15); ctx.fill();
    ctx.fillStyle = "white";
    ctx.font = "bold 18px Arial";
    ctx.fillText(`🍅 Pomidorlar: ${score}`, 25, 40);
    ctx.fillStyle = "#00f2ff";
    ctx.fillText(`💎 Almazlar: ${diamonds}`, 25, 70);
    ctx.fillStyle = "white";
    ctx.fillText(`❤️ Jonlar: ${"❤️".repeat(lives)}`, 25, 100);
    
    if (slowModeTimer > 0) {
        ctx.fillStyle = "#afeeee";
        ctx.fillText("❄️ Muzlatish rejimi!", 25, 130);
    }
}

let basket = { x: canvas.width / 2, y: canvas.height - 150 };
canvas.addEventListener('touchmove', e => {
    basket.x = e.touches[0].clientX - 60;
});

function startGame() {
    setInterval(spawnItem, 800);
    update();
}

function gameOver() {
    isGameOver = true;
    localStorage.setItem('totalDiamonds', (parseInt(localStorage.getItem('totalDiamonds')) || 0) + diamonds);
    alert(`O'yin tugadi!\nOchko: ${score}\nAlmaz: ${diamonds}`);
    location.reload();
}
