// ======================
// CANVAS & CONTEXT
// ======================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ======================
// ASSETS
// ======================
const basketImg = new Image();
basketImg.src = 'assets/basket.png'; // savat rasm

const productImg = new Image();
productImg.src = 'assets/products/tomato.png'; // tomama bankasi

// ======================
// GAME VARIABLES
// ======================
let basket = {
  x: canvas.width / 2 - 50,
  y: canvas.height - 120,
  width: 100,
  height: 80
};

let products = [];
let score = 0;
let speed = 2;

// ======================
// SPAWN PRODUCTS
// ======================
function spawnProduct() {
  products.push({
    x: Math.random() * (canvas.width - 50),
    y: -50,
    width: 50,
    height: 50
  });
}

// Har 1 soniyada yangi product
setInterval(spawnProduct, 1000);

// ======================
// GAME LOOP
// ======================
function update() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // --- Draw basket ---
  ctx.drawImage(basketImg, basket.x, basket.y, basket.width, basket.height);

  // --- Draw products ---
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    p.y += speed;

    ctx.drawImage(productImg, p.x, p.y, p.width, p.height);

    // --- Collision ---
    if (p.y + p.height >= basket.y &&
        p.x + p.width >= basket.x &&
        p.x <= basket.x + basket.width) {
      score += 1;
      products.splice(i, 1);
      i--;
    }

    // --- Missed product: game over ---
    if (p.y > canvas.height) {
      gameOver();
      return;
    }
  }

  // --- Score display ---
  ctx.fillStyle = '#D62828'; // brend qizil rangi
  ctx.font = '28px Arial';
  ctx.fillText('Score: ' + score, 20, 40);

  requestAnimationFrame(update);
}

// ======================
// BASKET MOVEMENT (MOBILE)
// ======================
canvas.addEventListener('touchmove', function(e) {
  basket.x = e.touches[0].clientX - basket.width / 2;
});

// ======================
// BACKEND INTEGRATION
// ======================
function gameOver() {
  const user = Telegram.WebApp.initDataUnsafe.user;

  fetch('https://your-backend-url/submit-score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      telegram_id: user.id,
      name: user.first_name,
      score: score
    })
  });

  alert('O‘yin tugadi! Score yuborildi 🎉');
  showTop10();
  window.location.reload(); // o‘yinni qayta boshlash
}

// Top-10 reytingni olish
async function showTop10() {
  try {
    const res = await fetch('https://your-backend-url/top10');
    const data = await res.json();

    let text = "🏆 Top 10 Reyting:\n";
    data.forEach((item, idx) => {
      text += `${idx+1}. ${item.name}: ${item.score}\n`;
    });

    alert(text);
  } catch (err) {
    console.error('Top-10 olishda xato:', err);
  }
}

// ======================
// START GAME
// ======================
update();
