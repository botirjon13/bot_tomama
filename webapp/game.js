// ======================
// CANVAS & CONTEXT SOZLAMALARI
// ======================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Ekran o'lchamiga moslashtirish
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ======================
// AKTIVLARNI YUKLASH (ASSETS)
// ======================
let imagesLoaded = 0;
const totalImages = 2;

function imageLoaded() {
    imagesLoaded++;
    if (imagesLoaded === totalImages) {
        update(); // Ikkala rasm yuklangach o'yinni boshlash
    }
}

const basketImg = new Image();
basketImg.src = 'assets/basket.png';
basketImg.onload = imageLoaded;
basketImg.onerror = () => console.error("Savat rasmi topilmadi!");

const productImg = new Image();
productImg.src = 'assets/products/tomato.png';
productImg.onload = imageLoaded;
productImg.onerror = () => console.error("Pomidor rasmi topilmadi!");

// ======================
// O'YIN O'ZGARUVCHILARI
// ======================
let basket = {
    x: canvas.width / 2 - 50,
    y: canvas.height - 100,
    width: 100,
    height: 70
};

let products = [];
let score = 0;
let speed = 3;
let isGameOver = false;

// ======================
// MAHSULOTLARNI YARATISH
// ======================
function spawnProduct() {
    if (isGameOver) return;
    products.push({
        x: Math.random() * (canvas.width - 50),
        y: -50,
        width: 40,
        height: 40
    });
}

// Har 1.2 soniyada yangi mahsulot tushadi
let spawnInterval = setInterval(spawnProduct, 1200);

// ======================
// ASOSIY O'YIN TSIKLI (LOOP)
// ======================
function update() {
    if (isGameOver) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Savatni chizish
    ctx.drawImage(basketImg, basket.x, basket.y, basket.width, basket.height);

    // 2. Mahsulotlarni harakatlantirish va chizish
    for (let i = 0; i < products.length; i++) {
        let p = products[i];
        p.y += speed;

        ctx.drawImage(productImg, p.x, p.y, p.width, p.height);

        // To'qnashuvni tekshirish (Savatga tushsa)
        if (p.y + p.height >= basket.y &&
            p.x + p.width >= basket.x &&
            p.x <= basket.x + basket.width) {
            score += 1;
            products.splice(i, 1);
            i--;
            // Har 10 ochkoda tezlikni oshirish
            if (score % 10 === 0) speed += 0.5;
            continue;
        }

        // Yerga tushsa - O'yin tugadi
        if (p.y > canvas.height) {
            gameOver();
            return;
        }
    }

    // 3. Ochkoni ekranga chiqarish
    ctx.fillStyle = '#D62828';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('Ochko: ' + score, 20, 40);

    requestAnimationFrame(update);
}

// ======================
// BOSHQARUV (TOUCH & MOUSE)
// ======================
function moveBasket(e) {
    let clientX = e.touches ? e.touches[0].clientX : e.clientX;
    basket.x = clientX - basket.width / 2;

    // Ekrandan chiqib ketmasligi uchun
    if (basket.x < 0) basket.x = 0;
    if (basket.x > canvas.width - basket.width) basket.x = canvas.width - basket.width;
}

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    moveBasket(e);
}, { passive: false });

canvas.addEventListener('mousemove', moveBasket);

// ======================
// O'YINNI TUGATISH
// ======================
function gameOver() {
    isGameOver = true;
    clearInterval(spawnInterval);

    let userName = "Mehmon";
    if (window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe.user) {
        userName = Telegram.WebApp.initDataUnsafe.user.first_name;
    }

    alert(`O‘yin tugadi! \nFoydalanuvchi: ${userName}\nSizning natijangiz: ${score}`);
    
    // O'yinni qayta yuklash
    location.reload();
}

// Ekran o'lchami o'zgarganda canvasni moslashtirish
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    basket.y = canvas.height - 100;
});
