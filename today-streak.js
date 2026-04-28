// ============================================================
// today-streak.js — Streak engine, badges, freeze, celebration
// ============================================================


// ══════════════════════════════════════
// INARTE STREAK ENGINE v2
// Eternal streak • Freeze system • Badges
// ══════════════════════════════════════

const SP_FREEZE_PER_MONTH = 2;

// Badge tiers — ranges, not exact days
const SP_TIERS = [
  {from:0,    badge:'💤', label:'Istirahat',  color:'clay',   broken:true},
  {from:1,    badge:'🌱', label:'Tunas',      color:'moss'},
  {from:3,    badge:'🌿', label:'Tumbuh',     color:'moss'},
  {from:7,    badge:'🌳', label:'Berakar',    color:'moss'},
  {from:14,   badge:'✨', label:'Bersinar',   color:'amber'},
  {from:21,   badge:'🔥', label:'Membara',    color:'clay'},
  {from:30,   badge:'⚡', label:'Bertenaga',  color:'amber'},
  {from:50,   badge:'💎', label:'Permata',    color:'sky'},
  {from:100,  badge:'🏆', label:'Juara',      color:'amber'},
  {from:200,  badge:'🌟', label:'Bintang',    color:'amber'},
  {from:365,  badge:'👑', label:'Mahkota',    color:'gold'},
  {from:500,  badge:'🔱', label:'Legendaris', color:'gold'},
  {from:750,  badge:'🌌', label:'Kosmik',     color:'gold'},
  {from:1000, badge:'✴️', label:'Abadi',      color:'gold'},
];

// Big celebration milestones
const SP_MILESTONES = new Set([1,3,7,14,21,30,50,75,100,150,200,300,365,500,750,1000]);

// Broken badge (0-day streak)
const SP_BROKEN = {badge:'🥀', label:'Layu', sub:'Streak terputus — tapi itu bukan akhir. Yuk mulai lagi dari sini (ꈍᴗꈍ)', btnText:'Mulai lagi →', broken:true};

function _spGetTier(days) {
  if (days === 0) return SP_BROKEN;
  let tier = SP_TIERS[1]; // default: Tunas
  for (const t of SP_TIERS) { if (!t.broken && days >= t.from) tier = t; }
  return tier;
}

function _spPrevTier(days) {
  let prev = null;
  for (const t of SP_TIERS) { if (!t.broken && days > t.from) prev = t; else if (!t.broken && days === t.from) break; }
  return prev;
}

function _spNextMilestone(days) {
  const arr = [...SP_MILESTONES].sort((a,b)=>a-b);
  for (const m of arr) { if (days < m) return m; }
  return null;
}

// ── Freeze helpers ──
function _spGetFreezeState() {
  const key = 'inarte_freeze_' + new Date().toISOString().slice(0,7); // YYYY-MM
  const state = JSON.parse(localStorage.getItem(key) || 'null');
  if (!state) { const s = {used:0,max:SP_FREEZE_PER_MONTH}; localStorage.setItem(key, JSON.stringify(s)); return s; }
  return state;
}
function _spSetFreezeUsed(n) {
  const key = 'inarte_freeze_' + new Date().toISOString().slice(0,7);
  const state = _spGetFreezeState();
  state.used = n;
  localStorage.setItem(key, JSON.stringify(state));
}

// ── Core streak calc with freeze ──
// Membaca dari inarte_logs (unified — diisi dari semua tab)
function _isDayActive(dateStr){
  // Cek inarte_logs dulu (unified source dari semua tab)
  const logs=JSON.parse(localStorage.getItem('inarte_logs')||'{}');
  if(logs[dateStr]?.logged) return true;
  // Fallback: cek inarte_day_* (data lama sebelum unified)
  const day=JSON.parse(localStorage.getItem('inarte_day_'+dateStr)||'null');
  if(day&&(day.water>0||day.mood||(day.meals&&day.meals.length>0)||(day.habits&&day.habits.length>0)||(day.moves&&day.moves.length>0))) return true;
  // Fallback: cek inarte_wellness_* (diisi dari wellness tab)
  const w=JSON.parse(localStorage.getItem('inarte_wellness_'+dateStr)||'null');
  if(w&&(w.sleepHrs||w.emotions?.length||w.journalText)) return true;
  return false;
}

function calcStreakNow() {
  let streak = 0;
  const today = new Date().toISOString().split('T')[0];
  const d = new Date();
  let freezeUsed = 0;
  const freezeMax = SP_FREEZE_PER_MONTH;

  while (streak < 2000) {
    const dateStr = d.toISOString().split('T')[0];
    const hasData = _isDayActive(dateStr);

    if (hasData) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else if (dateStr === today) {
      // Today not filled yet — don't count, don't break, just step back
      d.setDate(d.getDate() - 1);
    } else if (freezeUsed < freezeMax) {
      // Use a freeze for this missed day
      freezeUsed++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return { streak, freezeUsed };
}

// ── Check if streak was JUST broken (yesterday missed + no freeze left) ──
function _spCheckBroken() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yk = 'inarte_day_' + yesterday.toISOString().split('T')[0];
  const yd = JSON.parse(localStorage.getItem(yk) || 'null');
  const yLogged = yd && (yd.water > 0 || yd.mood || (yd.meals && yd.meals.length) || (yd.habits && yd.habits.length) || (yd.moves && yd.moves.length));
  if (yLogged) return false; // yesterday was fine

  const freeze = _spGetFreezeState();
  return freeze.used >= freeze.max;
}

// ── Update greeting with freeze/broken notice ──
function buildStreakGreeting() {
  const el = document.getElementById('greeting-freeze');
  if (!el) return;

  const {streak, freezeUsed} = calcStreakNow();
  const freeze = _spGetFreezeState();
  const today = new Date().toISOString().split('T')[0];
  const todayDay = JSON.parse(localStorage.getItem('inarte_day_' + today) || 'null');
  const todayFilled = todayDay && (todayDay.water > 0 || todayDay.mood || (todayDay.meals && todayDay.meals.length) || (todayDay.habits && todayDay.habits.length));

  // Update desktop sidebar badge
  const tier = _spGetTier(streak);
  const bi = document.getElementById('ds-streak-badge');
  const ni = document.getElementById('ds-streak-num');
  if (bi) bi.textContent = tier.badge;
  if (ni) ni.textContent = streak;

  // No notice if today is already filled or streak never started
  if (todayFilled || streak === 0 && freezeUsed === 0) { el.classList.remove('show'); return; }

  // Check if a freeze was used yesterday
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
  const yk = 'inarte_day_' + yesterday.toISOString().split('T')[0];
  const yd = JSON.parse(localStorage.getItem(yk) || 'null');
  const yLogged = yd && (yd.water > 0 || yd.mood || (yd.meals && yd.meals.length) || (yd.habits && yd.habits.length));

  if (!yLogged && streak > 0) {
    // Freeze was used
    const remaining = freeze.max - freeze.used;
    document.getElementById('gf-icon').textContent = '🛡️';
    document.getElementById('gf-title').textContent = 'Hari Istirahat terpakai';
    document.getElementById('gf-msg').textContent = 'Kemarin kamu istirahat — wajar banget. Streak kamu terjaga. Yuk lanjut hari ini (◕ᴗ◕✿)';
    const dots = document.getElementById('gf-dots'); dots.innerHTML = '';
    for (let i = 0; i < freeze.max; i++) {
      const d = document.createElement('div');
      d.className = 'gf-freeze-dot' + (i >= remaining ? ' used' : '');
      dots.appendChild(d);
    }
    el.classList.add('show');
  } else if (!yLogged && streak === 0) {
    // Streak broken
    document.getElementById('gf-icon').textContent = '🥀';
    document.getElementById('gf-title').textContent = 'Streak terputus';
    document.getElementById('gf-msg').textContent = 'Tidak apa-apa. Yang penting mulai lagi dari hari ini — Nara di sini (ꈍᴗꈍ)';
    document.getElementById('gf-dots').innerHTML = '';
    el.classList.add('show');
  }
}

// ── Main popup trigger ──
function maybeShowStreakPopup() {
  const popKey = 'inarte_streak_pop_' + TODAY;
  if (localStorage.getItem(popKey)) return;

  const todayDay = JSON.parse(localStorage.getItem('inarte_day_' + TODAY) || 'null');
  const hasData = todayDay && (todayDay.water > 0 || todayDay.mood || (todayDay.meals && todayDay.meals.length > 0) || (todayDay.habits && todayDay.habits.length > 0) || (todayDay.moves && todayDay.moves.length > 0));
  if (!hasData) return;

  localStorage.setItem(popKey, '1');

  const {streak, freezeUsed} = calcStreakNow();
  _renderStreakPopup(streak, freezeUsed);

  setTimeout(() => {
    if (streak > 0) _spawnConfetti(); // celebrate every day!
    document.getElementById('streak-overlay').classList.add('show');
    document.body.style.overflow = 'hidden';
  }, 900);
}

function _renderStreakPopup(streak, freezeUsed) {
  const overlay = document.getElementById('streak-overlay');
  const isBroken = streak === 0;

  if (isBroken) {
    overlay.classList.add('broken');
    document.getElementById('sp-badge').textContent = SP_BROKEN.badge;
    document.getElementById('sp-days-num').textContent = '0';
    document.getElementById('sp-days-num').className = 'sp-days-num';
    document.getElementById('sp-title').textContent = 'Streak terputus';
    document.getElementById('sp-sub').textContent = SP_BROKEN.sub;
    document.getElementById('sp-level').textContent = SP_BROKEN.label;
    document.getElementById('sp-level').className = 'sp-level normal';
    document.getElementById('sp-next').textContent = 'Isi apapun hari ini untuk mulai streak baru ✨';
    document.getElementById('sp-btn').textContent = SP_BROKEN.btnText;
    document.getElementById('sp-btn').className = 'sp-btn broken-btn';
    document.getElementById('sp-freeze').classList.remove('show');
    document.getElementById('sp-ring').className = 'sp-badge-ring';
    return;
  }

  overlay.classList.remove('broken');
  const tier = _spGetTier(streak);
  const isMilestone = SP_MILESTONES.has(streak);
  const freeze = _spGetFreezeState();
  const freezeLeft = freeze.max - freeze.used;

  // Was this a tier-up? Compare current tier vs tier at streak-1
  const prevTier = _spGetTier(streak - 1);
  const isTierUp = tier.label !== prevTier.label;

  document.getElementById('sp-badge').textContent = tier.badge;
  document.getElementById('sp-days-num').textContent = streak;
  document.getElementById('sp-days-num').className = 'sp-days-num' + (isMilestone ? ' milestone-color' : '');
  document.getElementById('sp-ring').className = 'sp-badge-ring' + (isMilestone ? ' milestone' : '');

  // Title + sub
  const titles = {
    1:   ['Langkah pertama!', 'Setiap perjalanan panjang dimulai dari satu langkah. Ini milikmu (◕ᴗ◕✿)'],
    3:   ['3 hari beruntun!', 'Kamu sudah mulai membangun momentum. Konsistensi kecil itu kuat.'],
    7:   ['Seminggu penuh! 🎉', '7 hari tanpa putus. Ini bukan keberuntungan — ini pilihan yang kamu buat setiap hari.'],
    14:  ['Dua minggu! ✨', 'Dua minggu konsisten. Tubuh dan pikiranmu sudah mulai merasakan bedanya.'],
    21:  ['21 hari! Habit terbentuk!', 'Ilmu bilang 21 hari cukup untuk membentuk kebiasaan. Kamu sudah sampai di sini.'],
    30:  ['Satu bulan penuh! 🔥', '30 hari. Kamu bukan lagi mencoba — kamu sudah menjadi versi yang lebih baik dari dirimu sendiri.'],
    50:  ['50 hari! Luar biasa!', 'Setengah jalan menuju 100. Energi yang kamu tunjukkan selama ini — luar biasa.'],
    75:  ['75 hari! Hampir 100!', 'Tiga perempat menuju tonggak besar. Kamu sudah jauh sekali.'],
    100: ['100 HARI! 💎', 'Seratus hari. Angka ini bukan hanya angka — ini bukti nyata siapa kamu sekarang.'],
    150: ['150 hari! 🏆', 'Hampir setengah tahun. Kamu sudah jadi inspirasi, meski tanpa kamu sadari.'],
    200: ['200 hari! 🌟', '200 hari konsisten. Kamu bukan lagi orang yang sama dengan hari pertama dulu.'],
    300: ['300 hari! Hampir setahun!', 'Tinggal 65 hari lagi menuju satu tahun penuh. Kamu sudah hampir sampai.'],
    365: ['SATU TAHUN! 👑', '365 hari. Kamu sudah mengubah hidupmu sendiri. Ini bukan streak — ini identitas.'],
    500: ['500 hari! 🔱', 'Lima ratus hari. Di level ini, konsistensi sudah jadi napasmu.'],
    750: ['750 hari! 🌌', 'Dua tahun lebih. Kamu sudah membuktikan bahwa ini bukan fase — ini adalah kamu.'],
    1000:['1000 HARI! ✴️', 'Seribu hari. Kata-kata tidak cukup untuk ini. Kamu luar biasa.'],
  };

  const [title, sub] = titles[streak] || [
    `${streak} hari beruntun!`,
    streak < 50 ? 'Setiap hari yang kamu isi adalah investasi untuk dirimu sendiri.' :
    streak < 100 ? 'Kamu sudah jauh. Dan ini bukan kebetulan.' :
    streak < 200 ? 'Di titik ini, konsistensi sudah jadi bagian dari dirimu.' :
    streak < 365 ? 'Hampir tidak ada yang bisa mencapai sejauh ini. Kamu bisa.' :
    'Setiap hari baru adalah bukti bahwa kamu memilih untuk hadir untuk dirimu sendiri.'
  ];

  document.getElementById('sp-title').textContent = title;
  document.getElementById('sp-sub').textContent = sub;

  // Level pill
  const lvlEl = document.getElementById('sp-level');
  lvlEl.textContent = tier.badge + ' ' + tier.label;
  lvlEl.className = 'sp-level ' + (isTierUp ? 'new-level' : 'normal');

  // Freeze info
  const frEl = document.getElementById('sp-freeze');
  if (freezeUsed > 0) {
    document.getElementById('sp-freeze-txt').textContent = `${freeze.used} dari ${freeze.max} hari istirahat bulan ini terpakai`;
    frEl.classList.add('show');
  } else {
    frEl.classList.remove('show');
  }

  // Next milestone
  const nextM = _spNextMilestone(streak);
  const nextEl = document.getElementById('sp-next');
  if (nextM) {
    const nextTier = _spGetTier(nextM);
    nextEl.textContent = `${nextM - streak} hari lagi → ${nextTier.badge} ${nextTier.label} (${nextM} hari)`;
  } else {
    nextEl.textContent = '🎉 Kamu sudah melampaui semua yang pernah kami bayangkan!';
  }

  document.getElementById('sp-btn').textContent = 'Tutup ✕';
  document.getElementById('sp-btn').className = 'sp-btn';
}

function _spawnConfetti() {
  // 1. Confetti inside popup card
  const container = document.getElementById('streak-confetti');
  if (container) {
    container.innerHTML = '';
    const colors = ['#3D6147','#9B6E2A','#7D3E2C','#2E5F7A','#B4CEBC','#E0C88A','#DDB8A8','#F0C4A8'];
    for (let i = 0; i < 48; i++) {
      const el = document.createElement('div');
      el.className = 'conf-p';
      const size = 4 + Math.random() * 8;
      const shapes = ['50%','2px','0px'];
      el.style.cssText = `left:${Math.random()*100}%;top:-10px;width:${size}px;height:${size * (Math.random()>.5?1:2.5)}px;background:${colors[i % colors.length]};border-radius:${shapes[Math.floor(Math.random()*shapes.length)]};animation-duration:${.6+Math.random()*1.1}s;animation-delay:${Math.random()*.6}s`;
      container.appendChild(el);
    }
  }

  // 2. Full-screen fireworks + particle burst
  _launchFullCelebration();
}

function _launchFullCelebration() {
  // Create fullscreen canvas overlay
  const existing = document.getElementById('celebration-canvas');
  if (existing) existing.remove();

  const canvas = document.createElement('canvas');
  canvas.id = 'celebration-canvas';
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:8999;pointer-events:none';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  const PALETTE = [
    '#3D6147','#5A8A68','#B4CEBC',  // moss
    '#9B6E2A','#E0C88A','#F8F0DC',  // amber
    '#7D3E2C','#DDB8A8',             // clay
    '#2E5F7A','#A4CCDE',             // sky
    '#7A3E50','#D8B0C0',             // rose
    '#ffffff','#fffde0',             // white/cream
  ];

  const particles = [];

  // -- Fireworks: 6 bursts from bottom --
  function spawnFirework(delay) {
    setTimeout(() => {
      const x = W * (.15 + Math.random() * .7);
      const y = H * (.15 + Math.random() * .35);
      const color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
      const count = 28 + Math.floor(Math.random() * 20);
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const speed = 2.5 + Math.random() * 4.5;
        particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1,
          size: 2.5 + Math.random() * 3,
          color,
          gravity: 0.06 + Math.random() * 0.04,
          decay: 0.012 + Math.random() * 0.01,
          type: 'firework',
          trail: [],
        });
      }
      // Spark particles
      for (let i = 0; i < 12; i++) {
        const angle = Math.random() * Math.PI * 2;
        particles.push({
          x, y,
          vx: Math.cos(angle) * (8 + Math.random() * 6),
          vy: Math.sin(angle) * (8 + Math.random() * 6),
          alpha: 1,
          size: 1.5,
          color: '#fffde0',
          gravity: 0.12,
          decay: 0.022,
          type: 'spark',
          trail: [],
        });
      }
    }, delay);
  }

  // -- Confetti rain from top --
  function spawnConfettiRain() {
    for (let i = 0; i < 80; i++) {
      setTimeout(() => {
        particles.push({
          x: Math.random() * W,
          y: -10,
          vx: (Math.random() - .5) * 2.5,
          vy: 2.5 + Math.random() * 3.5,
          alpha: 1,
          size: 5 + Math.random() * 7,
          sizeH: 3 + Math.random() * 5,
          color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
          gravity: 0.05,
          decay: 0.004,
          type: 'confetti',
          rot: Math.random() * Math.PI * 2,
          rotV: (Math.random() - .5) * 0.18,
          wobble: Math.random() * Math.PI * 2,
          wobbleS: 0.04 + Math.random() * 0.04,
        });
      }, i * 28);
    }
  }

  // -- Particle burst from badge center --
  function spawnBadgeBurst() {
    const badge = document.getElementById('sp-badge');
    let bx = W / 2, by = H / 2;
    if (badge) {
      const r = badge.getBoundingClientRect();
      bx = r.left + r.width / 2;
      by = r.top + r.height / 2;
    }
    for (let i = 0; i < 40; i++) {
      const angle = (i / 40) * Math.PI * 2;
      const speed = 3 + Math.random() * 7;
      particles.push({
        x: bx, y: by,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        alpha: 1,
        size: 3 + Math.random() * 4,
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
        gravity: 0.1,
        decay: 0.016,
        type: 'burst',
        trail: [],
      });
    }
    // Glitter sparkles
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 5;
      particles.push({
        x: bx + (Math.random()-0.5)*40,
        y: by + (Math.random()-0.5)*40,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        size: 1.5 + Math.random() * 2.5,
        color: '#ffffff',
        gravity: 0.04,
        decay: 0.02,
        type: 'glitter',
      });
    }
  }

  // Launch sequence
  spawnBadgeBurst();
  spawnFirework(0);
  spawnFirework(300);
  spawnConfettiRain();
  spawnFirework(600);
  spawnFirework(1000);
  spawnFirework(1400);
  spawnFirework(1800);

  // Animation loop
  let frame = 0;
  function animate() {
    ctx.clearRect(0, 0, W, H);
    frame++;

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];

      if (p.type === 'confetti') {
        p.wobble += p.wobbleS;
        p.x += p.vx + Math.sin(p.wobble) * 1.2;
        p.y += p.vy;
        p.vy += p.gravity;
        p.rot += p.rotV;
        p.alpha -= p.decay;

        if (p.alpha <= 0 || p.y > H + 20) { particles.splice(i, 1); continue; }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size/2, -p.sizeH/2, p.size, p.sizeH);
        ctx.restore();

      } else {
        // firework / burst / spark / glitter
        if (p.trail) {
          p.trail.push({x: p.x, y: p.y});
          if (p.trail.length > 5) p.trail.shift();
        }
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.97;
        p.alpha -= p.decay;

        if (p.alpha <= 0) { particles.splice(i, 1); continue; }

        // Draw trail
        if (p.trail && p.trail.length > 1) {
          ctx.beginPath();
          ctx.moveTo(p.trail[0].x, p.trail[0].y);
          for (let t = 1; t < p.trail.length; t++) ctx.lineTo(p.trail[t].x, p.trail[t].y);
          ctx.strokeStyle = p.color;
          ctx.globalAlpha = p.alpha * 0.3;
          ctx.lineWidth = p.size * 0.5;
          ctx.stroke();
        }

        ctx.globalAlpha = p.alpha;
        if (p.type === 'glitter') {
          // Draw star
          ctx.beginPath();
          for (let s = 0; s < 4; s++) {
            const a = (s / 4) * Math.PI * 2;
            const r = s % 2 === 0 ? p.size * 2 : p.size * 0.5;
            s === 0 ? ctx.moveTo(p.x + Math.cos(a)*r, p.y + Math.sin(a)*r)
                    : ctx.lineTo(p.x + Math.cos(a)*r, p.y + Math.sin(a)*r);
          }
          ctx.closePath();
          ctx.fillStyle = p.color;
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
        }
      }
    }

    ctx.globalAlpha = 1;

    // Stop after 4 seconds or when all particles done
    if (frame < 240 || particles.length > 0) {
      requestAnimationFrame(animate);
    } else {
      canvas.remove();
    }
  }
  animate();

  // Auto-remove canvas after 5s
  setTimeout(() => { if (canvas.parentNode) canvas.remove(); }, 5000);
}

function _spOverlayClick(e) {
  if (e.target === document.getElementById('streak-overlay')) closeStreakPopup();
}
function closeStreakPopup() {
  document.getElementById('streak-overlay').classList.remove('show');
  document.body.style.overflow = '';
  buildStreakGreeting(); // refresh greeting notice after popup closes
}

// Init on load
window.addEventListener('DOMContentLoaded', function() {
  buildStreakGreeting();
});


// ── Global export — semua halaman pakai ini, jangan define ulang ──
// Usage: const { streak, freezeUsed } = window.inarteCalcStreak();
window.inarteCalcStreak = calcStreakNow;
