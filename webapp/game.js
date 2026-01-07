// ======================
// AKTIVLARNI YUKLASH (TO'G'RILANGAN)
// ======================
let assets = {};
let imagesToLoad = 3;
let loadedCount = 0;

function imageLoaded() {
    loadedCount++;
    console.log("Rasm yuklandi: " + loadedCount); // Debug uchun
    if (loadedCount === imagesToLoad) {
        console.log("Hamma rasmlar yuklandi, o'yin boshlanmoqda...");
        update(); 
    }
}

// Xatolikni tekshirish uchun onerror qo'shamiz
function imageError(e) {
    console.error("Rasmni yuklashda xato:", e.target.src);
}

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

// ======================
// BOSHQARUV (MOBIL UCHUN TO'G'RILANGAN)
// ======================
function moveBasket(e) {
    e.preventDefault(); // Sahifa qimirlab ketmasligi uchun
    let clientX;
    if (e.touches) {
        clientX = e.touches[0].clientX;
    } else {
        clientX = e.clientX;
    }
    
    // Savatni markazlashtirish
    let targetX = clientX - basket.width / 2;
    
    // Chegaradan chiqib ketmaslik
    if (targetX < 0) targetX = 0;
    if (targetX > canvas.width - basket.width) targetX = canvas.width - basket.width;
    
    basket.x = targetX;
}

// Touch eventlarni to'g'ri bog'lash
canvas.addEventListener('touchstart', moveBasket, { passive: false });
canvas.addEventListener('touchmove', moveBasket, { passive: false });
canvas.addEventListener('mousemove', moveBasket);
