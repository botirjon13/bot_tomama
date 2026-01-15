// game.js
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let highScore = localStorage.getItem('highScore') || 0;
let totalDiamonds = parseInt(localStorage.getItem('totalDiamonds')) || 0;

let assets = {};
let imagesToLoad = 7; // basket, tomato, brand, snow, bomb, magnet, shield
let loadedCount = 0;
let assetsLoaded = false;

const path = 'assaets/'; // Papka nomi to'g'riligini tekshiring (assets bo'lishi mumkin)

const loadAsset = (key, src) => {
    assets[key] = new Image();
    assets[key].src = path + src;
    assets[key].onload = () => { loadedCount++; if (loadedCount === imagesToLoad) assetsLoaded = true; };
    assets[key].onerror = () => { console.error(key + " yuklanmadi"); loadedCount++; };
};

// ASSETS yuklash
loadAsset('basket', 'basket.png');
loadAsset('tomato', 'products/tomatoFon.png');
loadAsset('brand', 'products/tomato.png');
loadAsset('snow', 'products/snow.png');
loadAsset('bomb', 'products/bomb.png');
loadAsset('magnet', 'products/magnet.png'); // Yangi
loadAsset('shield', 'products/shield.png'); // Yangi

let basket = { x: canvas.width / 2 - 60, y: canvas.height - 160, width: 120, height: 85, originalWidth: 120 };
let items = [];
let score = 0, currentDiamonds = 0, lives = 3, combo = 0;
let isGameOver = false;
let spawnInterval = null;

// Power-up taymerlari
let slowModeTimer = 0, magnetTimer = 0, shieldActive = false, shakeTimer = 0;
let gameSpeed = 7;

function spawnItem() {
    if (isGameOver) return;

    let rand = Math.random();
    let type = 'tomato';
    
    if (rand < 0.12) type = 'bomb';
    else if (rand < 0.18) type = 'brand'; // Olmos
    else if (rand < 0.22) type = 'snow';  // Muzlatish
    else if (rand < 0.25) type = 'magnet'; // Magnit
    else if (rand < 0.28) type = 'shield'; // Qalqon

    items.push({
        x: Math.random() * (canvas.width - 65),
        y: -80,
        width: 65,
        height: 65,
        type: type,
        speedMod: 0.8 + Math.random() * 0.7,
        drift: (Math.random() - 0.5) * 2
    });
}

function update() {
    if (isGameOver) return;

    // 1. Koordinatalarni saqlash
    ctx.save();

    let sx = 0, sy = 0;
    if (shakeTimer > 0) {
        sx = (Math.random() - 0.5) * 15;
        sy = (Math.random() - 0.5) * 15;
        shakeTimer--;
    }

    // 2. MUHIM: Har doim butun ekranni tozalash (silkinishdan oldin)
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Transformatsiyani nolga tushirish
    ctx.clearRect(0, 0, canvas.width, canvas.height); 

    // 3. Endi silkinishni qo'llash
    ctx.translate(sx, sy);

    let currentGlobalSpeed = (gameSpeed + (score / 250)) * (slowModeTimer > 0 ? 0.5 : 1);

    if (slowModeTimer > 0) {
        slowModeTimer--;
        ctx.fillStyle = "rgba(135, 206, 250, 0.2)";
        ctx.fillRect(-50, -50, canvas.width + 100, canvas.height + 100);
    }
    
    if (magnetTimer > 0) magnetTimer--;

    // Savatni chizish
    if (assetsLoaded && assets.basket.complete) {
        ctx.drawImage(assets.basket, basket.x, basket.y, basket.width, basket.height);
        
        if (shieldActive) {
            ctx.beginPath();
            ctx.strokeStyle = '#00f2ff';
            ctx.lineWidth = 4;
            // Qalqonni savat bilan birga chizish
            ctx.arc(basket.x + basket.width/2, basket.y + basket.height/2, 70, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    for (let i = 0; i < items.length; i++) {
        let p = items[i];

        if (magnetTimer > 0 && (p.type === 'tomato' || p.type === 'brand')) {
            let dx = (basket.x + basket.width/2) - (p.x + p.width/2);
            p.x += dx * 0.1;
        }

        p.y += currentGlobalSpeed * p.speedMod;
        p.x += p.drift;

        if (p.x <= 0 || p.x + p.width >= canvas.width) p.drift *= -1;

        if (assetsLoaded && assets[p.type]) {
            ctx.drawImage(assets[p.type], p.x, p.y, p.width, p.height);
        }

        // To'qnashuv
        if (p.y + p.height >= basket.y + 10 && p.y <= basket.y + 50 &&
            p.x + p.width >= basket.x && p.x <= basket.x + basket.width) {

            if (p.type === 'bomb') {
                if (shieldActive) {
                    shieldActive = false; // Qalqon yo'qoladi
                } else {
                    lives--;
                    combo = 0;
                    shakeTimer = 20;
                }
            } else {
                combo++;
                if (p.type === 'tomato') score += 10 + (Math.floor(combo / 5) * 5);
                else if (p.type === 'brand') { score += 100; currentDiamonds += 1; }
                else if (p.type === 'snow') slowModeTimer = 400;
                else if (p.type === 'magnet') magnetTimer = 420;
                else if (p.type === 'shield') shieldActive = true;
            }

            items.splice(i, 1); i--;
            if (lives <= 0) { gameOver(); break; }
            continue;
        }

        if (p.y > canvas.height) {
            if (p.type === 'tomato' || p.type === 'brand') {
                lives--;
                combo = 0;
                shakeTimer = 10;
            }
            items.splice(i, 1); i--;
            if (lives <= 0) { gameOver(); break; }
        }
    }

    // 4. Oldingi holatni qaytarish
    ctx.restore();

    if (!isGameOver) {
        drawUI();
        requestAnimationFrame(update);
    }
}

function drawUI() {
    // UI fon
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.roundRect(15, 15, 250, 150, 15);
    ctx.fill();

    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('🍅 Ball: ' + score, 30, 45);
    ctx.fillStyle = '#00f2ff';
    ctx.fillText('💎 Almaz: ' + currentDiamonds, 30, 75);
    ctx.fillStyle = '#ff4d4d';
    ctx.fillText('❤️ Jon: ' + '❤️'.repeat(Math.max(0, lives)), 30, 105);

    // Aktiv Power-uplar yozuvi
    ctx.font = 'bold 14px sans-serif';
    if (slowModeTimer > 0) { ctx.fillStyle = '#00f2ff'; ctx.fillText('❄️ MUZLATISH AKTIV', 30, 135); }
    else if (magnetTimer > 0) { ctx.fillStyle = '#FFD700'; ctx.fillText('🧲 MAGNIT AKTIV', 30, 135); }
    else if (shieldActive) { ctx.fillStyle = '#00ff00'; ctx.fillText('🛡️ QALQON AKTIV', 30, 135); }

    if (combo > 2) {
        ctx.fillStyle = '#FFD700';
        ctx.font = 'italic bold 24px sans-serif';
        ctx.fillText('🔥 x' + combo, canvas.width - 100, 50);
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
    if (isGameOver) return;
    isGameOver = true;
    clearInterval(spawnInterval);

    // 1. LocalStorage dan random profilni olish (index.html da yaratilgan)
    const localUserData = JSON.parse(localStorage.getItem('tomama_user_2026') || '{}');
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    
    // 2. Serverga yuboriladigan ma'lumotlar
    const gameData = {
        telegram_id: tgUser?.id || 0,
        nickname: localUserData.nickname || "Noma'lum Pomidor",
        avatar_url: localUserData.avatar || "assaets/avatars/1.png",
        score: score
    };

    // 3. Serverga saqlash
    fetch(`${SERVER_URL}/save`, { // SERVER_URL index.html da aniqlangan
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gameData)
    })
    .then(res => res.json())
    .then(data => {
        console.log("Natija saqlandi!");
    })
    .catch(e => console.error("Saqlashda xato:", e));

    // 4. Rekordlarni yangilash
    totalDiamonds += currentDiamonds;
    localStorage.setItem('totalDiamonds', totalDiamonds);
    if (score > (localStorage.getItem('highScore') || 0)) {
        localStorage.setItem('highScore', score);
    }

    // 5. Telegram tugmasini chiqarish
    if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.MainButton.setText(`NATIJA: ${score} 🍅 | REYTINGGA QAYTISH`);
        tg.MainButton.show();
        tg.MainButton.onClick(() => {
            tg.MainButton.hide();
            window.location.reload(); // Sahifani yangilab menyuga qaytadi
        });
    } else {
        alert(`O'yin tugadi! Ball: ${score}`);
        window.location.reload();
    }
}


window.startGameLoop = function() {
    isGameOver = false; score = 0; lives = 3; currentDiamonds = 0; combo = 0;
    items = []; slowModeTimer = 0; magnetTimer = 0; shieldActive = false;
    spawnInterval = setInterval(spawnItem, 600);
    requestAnimationFrame(update);
};
