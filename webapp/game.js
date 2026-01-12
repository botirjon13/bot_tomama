/* ================= SETUP ================= */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

//const tg = window.Telegram?.WebApp;
const tgUser = tg?.initDataUnsafe?.user || null;

/* ================= SCORE ================= */
let highScore = Number(localStorage.getItem('highScore')) || 0;

/* ================= ASSETS ================= */
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

assets.good = new Image();
assets.good.src = path + 'products/tomato.png';
assets.good.onload = imageLoaded;
assets.good.onerror = imageError;

assets.bad = new Image();
assets.bad.src = path + 'products/other_tomato.png';
assets.bad.onload = imageLoaded;
assets.bad.onerror = imageError;

/* ================= GAME STATE ================= */
let basket = { x: canvas.width/2 - 60, y: canvas.height - 160, width: 120, height: 85 };
let items = [];
let score = 0;
let lives = 3;
let combo = 0;
let speed = 3;
let isGameOver = false;

/* ================= TIMING ================= */
let lastTime = 0;
let lastSpawn = 0;
let spawnDelay = 1000;

/* ================= HAPTIC ================= */
function haptic(type) {
    if (!tg || !tg.HapticFeedback) return;
    if (type === 'good') tg.HapticFeedback.impactOccurred('medium');
    if (type === 'bad') tg.HapticFeedback.notificationOccurred('error');
}

/* ================= SPAWN ================= */
function spawnItem() {
    const isGood = Math.random() > 0.2;
    const size = 65;

    items.push({
        x: Math.random() * (canvas.width - size),
        y: -size,
        width: size,
        height: size,
        type: isGood ? 'good' : 'bad',
        image: isGood ? assets.good : assets.bad
    });
}

/* ================= MAIN LOOP ================= */
function update(time = 0) {
    if (isGameOver) return;

    const delta = time - lastTime;
    lastTime = time;

    speed = 3 + score / 80;
    spawnDelay = Math.max(300, 1000 - score * 5);

    lastSpawn += delta;
    if (lastSpawn >= spawnDelay) {
        spawnItem();
        lastSpawn = 0;
    }

    ctx.clearRect(0,0,canvas.width,canvas.height);

    // Basket
    if (assetsLoaded) ctx.drawImage(assets.basket, basket.x, basket.y, basket.width, basket.height);
    else { ctx.fillStyle='brown'; ctx.fillRect(basket.x,basket.y,basket.width,basket.height); }

    // Items
    for (let i=0;i<items.length;i++){
        const p = items[i];
        p.y += speed * delta * 0.06;

        if (assetsLoaded) ctx.drawImage(p.image, p.x, p.y, p.width, p.height);
        else { ctx.fillStyle = p.type==='good'?'red':'black'; ctx.fillRect(p.x,p.y,p.width,p.height); }

        // Collision
        if (p.y + p.height >= basket.y + 20 && p.y <= basket.y + 50 &&
            p.x + p.width >= basket.x + 10 && p.x <= basket.x + basket.width - 10) {

            if (p.type==='good') {
                combo++;
                const mult = Math.floor(combo/5)+1;
                score += 10*mult;
                haptic('good');

                if(score>highScore){
                    highScore=score;
                    localStorage.setItem('highScore',highScore);
                }
            } else {
                lives--;
                combo=0;
                haptic('bad');
            }
            items.splice(i,1); i--;
            if(lives<=0) return gameOver();
            continue;
        }

        // Miss
        if(p.y>canvas.height){
            if(p.type==='good'){
                lives--;
                combo=0;
                haptic('bad');
            }
            items.splice(i,1); i--;
            if(lives<=0) return gameOver();
        }
    }

    drawUI();
    requestAnimationFrame(update);
}

/* ================= UI ================= */
function drawUI(){
    ctx.fillStyle='rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.roundRect(15,15,220,120,15);
    ctx.fill();

    ctx.fillStyle='#fff';
    ctx.font='bold 20px Arial';
    ctx.fillText(`🏆 Ochko: ${score}`,30,45);
    ctx.fillStyle='#FFD700';
    ctx.fillText(`⭐ Rekord: ${highScore}`,30,75);
    ctx.fillStyle='#fff';
    ctx.fillText(`❤️ ${'❤️'.repeat(Math.max(0,lives))}`,30,105);

    if(combo>=2){
        ctx.fillStyle='#ADFF2F';
        ctx.font='italic bold 22px Arial';
        ctx.fillText(`Combo x${combo}`,30,145);
    }
}

/* ================= INPUT ================= */
function moveBasket(e){
    e.preventDefault();
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    basket.x = Math.max(0, Math.min(canvas.width-basket.width, x - basket.width/2));
}
canvas.addEventListener('touchmove', moveBasket,{passive:false});
canvas.addEventListener('mousemove', moveBasket);

/* ================= API URL ================= */
const API_URL = 'postgresql://postgres:lfNwjvskjuRFJKMbmhHiTCFTBPslvRYC@postgres.railway.internal:5432/railway'; // <--- o'zingiz URL qo'yasiz

/* ================= LEADERBOARD ================= */
window.loadLeaderboard = async function() {
    const listEl = document.getElementById('rankingList');
    listEl.innerHTML = '<li class="loading">Yuklanmoqda...</li>';

    try {
        const res = await fetch(`${API_URL}/top10`);
        const data = await res.json();

        listEl.innerHTML = '';
        data.forEach((u,i)=>{
            const li = document.createElement('li');
            li.innerHTML = `
                ${i+1}. 
                <img src="${u.photo_url||''}" style="width:25px;height:25px;border-radius:50%;margin-right:8px;">
                ${u.username||'Anonim'} - ${u.score} ochko
            `;
            listEl.appendChild(li);
        });
    } catch(e) {
        listEl.innerHTML = '<li class="error">Xatolik yuz berdi</li>';
        console.error(e);
    }
};

/* ================= GAME OVER ================= */
async function gameOver(){
    isGameOver=true;

    if(tgUser){
        const payload = {
            telegram_id: tgUser.id,
            username: tgUser.username || tgUser.first_name,
            photo_url: tgUser.photo_url || '',
            score: score
        };

        try {
            await fetch(`${API_URL}/score`, {
                method:'POST',
                headers:{ 'Content-Type':'application/json' },
                body: JSON.stringify(payload)
            });
        } catch(e){ console.error(e); }
    }

    if(tg){
        tg.MainButton.setText(`Natija: ${score}`);
        tg.MainButton.show();
        tg.MainButton.onClick(()=>location.reload());
    } else {
        alert(`O'yin tugadi! Natija: ${score}`);
        location.reload();
    }
}

/* ================= START ================= */
window.startGameLoop = function(){
    score=0; lives=3; combo=0; items=[]; isGameOver=false; lastTime=0; lastSpawn=0;
    if(tg) tg.MainButton.hide();
    requestAnimationFrame(update);
};
