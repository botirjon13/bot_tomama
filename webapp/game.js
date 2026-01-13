const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let assets = {};
let score = 0, currentDiamonds = 0, lives = 3, combo = 0;
let baseSpeed = 6; // Boshlang'ich tezlikni oshirdik!
let isGameOver = false, slowMode = 0, goldenMode = 0;
let items = [];
let shake = 0; // Ekran titrashi uchun

const path = 'assaets/';
const images = ['basket.png', 'products/tomatoFon.png', 'products/tomato.png', 'products/snow.png'];

// Rasmlarni yuklash va o'yinni boshlash logic...
// (Oldingi yuklash kodi kabi, lekin biz Bomb uchun alohida vizual qo'shamiz)

function spawnItem() {
    if (isGameOver) return;
    let rand = Math.random();
    let type;
    
    if (rand < 0.12) type = 'bomb';    // 12% Bomba (XAVF!)
    else if (rand < 0.22) type = 'brand'; // Brend banka
    else if (rand < 0.27) type = 'snow';  // Qor
    else type = 'tomato';                 // Oddiy pomidor

    items.push({
        x: Math.random() * (canvas.width - 70),
        y: -70,
        type: type,
        speed: (baseSpeed + Math.random() * 3) * (goldenMode > 0 ? 1.5 : 1),
        angle: (Math.random() - 0.5) * 2 // Shamol effekti (sal qiya tushadi)
    });
}

function update() {
    if (isGameOver) return;

    // Ekran titrashi effekti
    let shakeX = 0, shakeY = 0;
    if (shake > 0) {
        shakeX = (Math.random() - 0.5) * 10;
        shakeY = (Math.random() - 0.5) * 10;
        shake--;
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);
    ctx.clearRect(-10, -10, canvas.width + 20, canvas.height + 20);

    let speedInc = score / 250; // Tezlik ochkoga qarab juda tez oshadi
    
    for (let i = 0; i < items.length; i++) {
        let p = items[i];
        let moveSpeed = (p.speed + speedInc) * (slowMode > 0 ? 0.5 : 1);
        
        p.y += moveSpeed;
        p.x += p.angle; // Shamol effekti

        // Chizish (Bomba uchun qizil-qora doira yoki rasm)
        if (p.type === 'bomb') {
            ctx.fillStyle = 'black';
            ctx.beginPath(); ctx.arc(p.x + 35, p.y + 35, 30, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = 'red'; ctx.fillText('💣', p.x + 20, p.y + 45);
        } else {
            let img = p.type === 'brand' ? assets.brand : (p.type === 'snow' ? assets.snow : assets.tomato);
            ctx.drawImage(img, p.x, p.y, 70, 70);
        }

        // Collision Logic
        if (p.y + 60 > basket.y && p.y < basket.y + 40 && p.x + 60 > basket.x && p.x < basket.x + 120) {
            if (p.type === 'bomb') {
                lives--; shake = 20; combo = 0; // BOMBA TUTILSA!
                if(tg) tg.HapticFeedback.notificationOccurred('error');
            } else if (p.type === 'brand') {
                score += 100; currentDiamonds++; combo++;
            } else if (p.type === 'tomato') {
                score += 10 + (combo * 2); combo++;
            } else if (p.type === 'snow') {
                slowMode = 300;
            }
            items.splice(i, 1); i--; continue;
        }

        if (p.y > canvas.height) {
            if (p.type !== 'snow' && p.type !== 'bomb') { lives--; combo = 0; shake = 10; }
            items.splice(i, 1); i--;
        }
    }

    if (lives <= 0) gameOver();
    
    // Savatni chizish va UI...
    ctx.drawImage(assets.basket, basket.x, basket.y, 120, 85);
    ctx.restore();
    drawUI();
    requestAnimationFrame(update);
}

// UI va boshqa funksiyalar...
