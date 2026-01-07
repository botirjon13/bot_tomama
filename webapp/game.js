// ======================
// CANVAS & CONTEXT
// ======================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ======================
// AKTIVLARNI YUKLASH (ASSETS)
// ======================
let assets = {};
let imagesToLoad = 3;

function imageLoaded() {
    imagesToLoad--;
    if (imagesToLoad === 0) {
        update(); // Hammasi yuklangach boshlash
    }
}

assets.basket = new Image();
assets.basket.src = 'assets/basket.png';
assets.basket.onload = imageLoaded;

assets.myBrand = new Image();
assets.myBrand.src = 'assets/products/tomato.png'; // Sizning brendingiz
assets.myBrand.onload = imageLoaded;

assets.otherBrand = new Image();
assets.otherBrand.src = 'assets/products/other_tomato.png'; // Boshqa brend (Bu fayl bo'lishi kerak!)
assets.otherBrand.onload = imageLoaded;


// ======================
// O'YIN O'ZGARUVCHILARI
// ======================
let basket = { x: canvas.width / 2 - 50, y: canvas.height - 100, width: 100, height: 70 };
let items = [];
let score = 0;
let lives = 3;
let speed = 3;
let level = 1;
let isGameOver = false;

// ======================
// BUYUMLARNI YARATISH
// ======================
function spawnItem() {
    if (isGameOver) return;

    // 80% ehtimol bilan sizning brendingiz, 20% boshqa brend tushadi
    const isMyBrand = Math.random() > 0.2;
    const type = isMyBrand ? 'myBrand' : 'otherBrand';
    const image = isMyBrand ? assets.myBrand : assets.otherBrand;

    items.push({
        x: Math.random() * (canvas.width - 50),
        y: -50,
        width: 40,
        height: 40,
        type: type,
        image: image
    });
}

let spawnInterval = setInterval(spawnItem, 800);

// ======================
// ASOSIY O'YIN TSIKLI
// ======================
function update() {
    if (isGameOver) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Savatni chizish
    ctx.drawImage(assets.basket, basket.x, basket.y, basket.width, basket.height);

    // 2. Buyumlarni chizish va tekshirish
    for (let i = 0; i < items.length; i++) {
        let p = items[i];
        p.y += speed;

        ctx.drawImage(p.image, p.x, p.y, p.width, p.height);

        // To'qnashuvni tekshirish
        if (p.y + p.height >= basket.y &&
            p.x + p.width >= basket.x &&
            p.x <= basket.x + basket.width) {
            
            if (p.type === 'myBrand') {
                score += 1;
            } else {
                lives -= 1; // Boshqa brend uchun jon ketadi!
            }
            items.splice(i, 1);
            i--;
            
            if (lives <= 0) {
                gameOver();
                return;
            }

            // Har 10 ochkoda level va tezlik oshadi
            if (score % 10 === 0 && score > 0) {
                level += 1;
                speed += 1;
                clearInterval(spawnInterval);
                spawnInterval = setInterval(spawnItem, Math.max(400, 800 - (level * 50)));
            }
            continue;
        }

        // Yerga tushsa (sizning brendingiz bo'lsa ham tushirib yuborish mumkin emasmi?)
        if (p.y > canvas.height) {
             if (p.type === 'myBrand') {
                 lives -= 1; // Agar o'z brendingizni ham tushirsangiz jon ketadi (agar shunday xohlasangiz)
                 if (lives <= 0) {
                     gameOver();
                     return;
                 }
             }
            items.splice(i, 1);
            i--;
        }
    }

    // 3. HUD (Ochko, Jonlar, Level)
    ctx.fillStyle = '#D62828';
    ctx.font = 'bold 18px Arial';
    ctx.fillText('Ochko: ' + score, 10, 25);
    ctx.fillText('Jonlar: ' + '❤️'.repeat(lives), canvas.width / 2 - 30, 25);
    ctx.fillText('Level: ' + level, canvas.width - 70, 25);

    requestAnimationFrame(update);
}

// ======================
// BOSHQARUV
// ======================
function moveBasket(e) {
    let clientX = e.touches ? e.touches[0].clientX : e.clientX;
    basket.x = clientX - basket.width / 2;
    if (basket.x < 0) basket.x = 0;
    if (basket.x > canvas.width - basket.width) basket.x = canvas.width - basket.width;
}

canvas.addEventListener('touchmove', moveBasket, { passive: false });
canvas.addEventListener('mousemove', moveBasket);

// ======================
// O'YINNI TUGATISH
// ======================
function gameOver() {
    isGameOver = true;
    clearInterval(spawnInterval);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('O‘YIN TUGADI! 🎮', canvas.width / 2, canvas.height / 2);
    ctx.fillText('Natija: ' + score, canvas.width / 2, canvas.height / 2 + 40);
    ctx.textAlign = 'left';

    // Telegram API orqali backendga score yuborish logikasi shu yerga keladi
    submitScoreToBackend(score);
}

function submitScoreToBackend(finalScore) {
    // Backend API ulanmaguncha bu qism ishlamaydi
    console.log(`Backendga yuboriladigan score: ${finalScore}`);
    
    // Foydalanuvchini bilish uchun:
    const user = window.Telegram.WebApp.initDataUnsafe.user;
    if (user) {
        console.log(`Foydalanuvchi IDsi: ${user.id}, Ismi: ${user.first_name}`);
        // fetch('https://your-backend-url/submit-score', ...)
    }

    // Test uchun alert
    setTimeout(() => {
        alert(`O'yin tugadi!\nNatija: ${finalScore}\nReyting tizimi hozircha front-endda ulanmagan.`);
        location.reload();
    }, 2000);
}
