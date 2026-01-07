const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let assets = {};
// Boshlang'ich yuklash sanog'ini 3 ga o'zgartirdim (3 ta rasm bor)
let imagesToLoad = 3; 
let loadedCount = 0;
let assetsLoaded = false;

function imageLoaded() {
    loadedCount++;
    if (loadedCount === imagesToLoad) {
        assetsLoaded = true;
        // Rasmlar yuklangach, menyu ko'rinadi (chunki update() chaqirilmayapti endi)
        console.log("Barcha rasmlar muvaffaqiyatli yuklandi!");
    }
}

function imageError(e) {
    console.error("Fayl topilmadi: " + e.target.src);
    // Xatolik bo'lsa ham yuklangan deb hisoblab davom etamiz
    imageLoaded(); 
}

// RASMLAR YO'LI (Diqqat: 'assets' papkasi to'g'ri yozilganiga ishonch hosil qiling)
assets.basket = new Image();
assets.basket.src = 'assaets/basket.png'; // assaets -> assets
assets.basket.onload = imageLoaded;
assets.basket.onerror = imageError;

assets.myBrand = new Image();
assets.myBrand.src = 'assaets/products/tomato.png'; // assaets -> assets
assets.myBrand.onload = imageLoaded;
assets.myBrand.onerror = imageError;

assets.otherBrand = new Image();
assets.otherBrand.src = 'assaets/products/other_tomato.png'; // assaets -> assets
assets.otherBrand.onload = imageLoaded;
assets.otherBrand.onerror = imageError;

let basket = { x: canvas.width / 2 - 50, y: canvas.height - 100, width: 100, height: 70 };
let items = [];
let score = 0;
let lives = 3;
let speed = 3;
let isGameOver = false;
let spawnInterval = null; // Intervalni boshida null qildik

function spawnItem() {
    if (isGameOver) return;
    
    speed = 3 + Math.floor(score / 50); 

    const isMyBrand = Math.random() > 0.2;
    
    // O'lchamlarni bu yerda belgilaymiz (masalan 65px)
    const itemWidth = 65; 
    const itemHeight = 65;

    items.push({
        x: Math.random() * (canvas.width - itemWidth), // Ekrandan chiqib ketmasligi uchun
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

        // Mahsulot savatchaga tegishi
        if (p.y + p.height >= basket.y && p.x + p.width >= basket.x && p.x <= basket.x + basket.width) {
            if (p.type === 'myBrand') score += 1;
            else lives -= 1; // noto'g'ri mahsulot ushlansa jon kamayadi
            items.splice(i, 1); i--;
            if (lives <= 0) { gameOver(); return; }
            continue;
        }

        // Mahsulot pastga tushib ketishi
        if (p.y > canvas.height) {
            if (p.type === 'myBrand') lives -= 1; // o'z mahsuloti o'tib ketsa jon kamayadi
            if (lives <= 0) { gameOver(); return; }
            items.splice(i, 1); i--;
        }
    }

    ctx.fillStyle = '#D62828'; // Qizil rang
    ctx.font = '24px Arial';
    ctx.fillText('Ochko: ' + score, 20, 40);
    ctx.fillText('Jonlar: ' + '❤️'.repeat(lives), 20, 70);

    requestAnimationFrame(update);
}

function moveBasket(e) {
    e.preventDefault();
    let clientX = e.touches ? e.touches[0].clientX : e.clientX;
    basket.x = clientX - basket.width / 2;
    // Savatni ekran chegarasida ushlab turish
    if (basket.x < 0) basket.x = 0;
    if (basket.x + basket.width > canvas.width) basket.x = canvas.width - basket.width;
}

canvas.addEventListener('touchmove', moveBasket, { passive: false });
canvas.addEventListener('mousemove', moveBasket);

function gameOver() {
    isGameOver = true;
    clearInterval(spawnInterval);
    // alert("O'yin tugadi! Natijangiz: " + score); // Telegram Mini App da alert ishlatmagan ma'qul
    
    // Telegram MainButton orqali natijani ko'rsatish
    if(window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.MainButton.setText(`Natija: ${score}. Bosh menyu`);
        window.Telegram.WebApp.MainButton.show();
        window.Telegram.WebApp.MainButton.onClick(goHome);
    } else {
        alert("O'yin tugadi! Natijangiz: " + score);
        goHome();
    }
}

function goHome() {
    location.reload(); // Sahifani qayta yuklash orqali bosh menyuga qaytishning eng oson yo'li
}


// Index.html dan chaqiriladigan funksiya
// window.startGameLoop global o'zgaruvchiga update funksiyasini yuklaymiz
window.startGameLoop = function() {
    if (!assetsLoaded) {
        console.error("Rasmlar hali yuklanmagan!");
        return;
    }
    score = 0;
    lives = 3;
    isGameOver = false;
    items = [];
    speed = 3;
    spawnInterval = setInterval(spawnItem, 1000);
    requestAnimationFrame(update); // O'yin siklini boshlash
    
    // Telegram MainButton ni o'yin vaqtida yashirish
    if(window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.MainButton.hide();
    }
};
