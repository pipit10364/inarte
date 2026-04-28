// ============================================================
// today-core.js — State, constants, boot, topbar, save, sheets
// ============================================================

// ══ STATE ══
const TODAY = new Date().toISOString().split('T')[0];
let P = JSON.parse(localStorage.getItem('inarte_profile') || '{"name":"","age":null,"act":"","home":"","cook":"","budget":""}');
let D = JSON.parse(localStorage.getItem('inarte_day_' + TODAY) || '{"water":0,"mood":null,"meals":[],"moves":[],"habits":[],"conditions":[],"totalCal":0,"totalMoveCal":0}');
if(!D.moves)D.moves=[];if(!D.habits)D.habits=[];if(!D.conditions)D.conditions=[];
let chatHistory=[], chatInited=false;
// sv/ld: delegate ke InarteSync (didefinisikan di sync.js)
function sv(k,v){ InarteSync.sv(k,v); }
function ld(k){ return InarteSync.ld(k); }

// ══ FOOD DB ══
const FOOD_DB={'nasi putih':{cal:180},'nasi merah':{cal:160},'nasi goreng':{cal:380},'nasi uduk':{cal:300},'mie goreng':{cal:350},'mie rebus':{cal:250},'mie instan':{cal:320},'roti tawar':{cal:80},'roti gandum':{cal:70},'oatmeal':{cal:150},'telur dadar':{cal:95},'telur ceplok':{cal:90},'telur rebus':{cal:70},'telur':{cal:75},'ayam goreng':{cal:250},'ayam bakar':{cal:180},'dada ayam':{cal:165},'ikan goreng':{cal:200},'ikan bakar':{cal:150},'tempe goreng':{cal:160},'tahu goreng':{cal:80},'tumis kangkung':{cal:50},'tumis bayam':{cal:45},'sayur bening':{cal:40},'gado-gado':{cal:300},'bakso':{cal:280},'soto ayam':{cal:220},'pisang':{cal:90},'apel':{cal:80},'jeruk':{cal:60},'es teh manis':{cal:90},'kopi susu':{cal:80},'susu putih':{cal:130},'gorengan':{cal:150},'kerupuk':{cal:50},'yogurt':{cal:120}};
const FOOD_SUGS=['nasi putih','telur dadar','ayam bakar','tempe goreng','sayur bening','bakso','pisang'];

// ══ HABIT THEMES (spiritual dihapus, ganti Sosial & Kreasi) ══
const HABIT_THEMES=[
  {id:'makan',label:'Makan',sugs:['Sarapan sebelum jam 9','Makan sayur minimal sekali','Minum 8 gelas air','Tidak makan setelah jam 8 malam','Protein di setiap makan']},
  {id:'gerak',label:'Gerak',sugs:['Jalan kaki 20 menit','Stretching pagi hari','Naik tangga bukan lift','Olahraga 30 menit','Plank 1 menit']},
  {id:'tidur',label:'Tidur',sugs:['Tidur sebelum jam 11 malam','Tidak HP 30 menit sebelum tidur','Bangun tanpa snooze','Tidur minimal 7 jam']},
  {id:'mental',label:'Mental',sugs:['Meditasi 5 menit','Tulis jurnal singkat','Screen time < 3 jam','Napas dalam saat stres']},
  {id:'sosial',label:'Sosial',sugs:['Hubungi satu teman atau keluarga','Quality time tanpa HP','Ucapkan terima kasih ke seseorang','Lakukan satu kebaikan kecil']},
  {id:'kreasi',label:'Kreasi',sugs:['Baca minimal 10 halaman','Belajar satu hal baru','Tulis sesuatu — apapun','Dengarkan podcast edukatif']},
];

// ══ MOVE OPTIONS (text-only, more variety) ══
const MOVE_OPTS=[
  {name:'Jalan kaki',cph:210},{name:'Lari',cph:480},{name:'Lari santai',cph:360},
  {name:'Bersepeda',cph:360},{name:'Bersepeda statis',cph:300},{name:'Renang',cph:420},
  {name:'Yoga',cph:180},{name:'Pilates',cph:210},{name:'Stretching',cph:120},
  {name:'Gym',cph:300},{name:'Angkat beban',cph:270},{name:'HIIT',cph:540},
  {name:'Senam',cph:240},{name:'Dance / Zumba',cph:330},{name:'Aerobik',cph:300},
  {name:'Olahraga tim',cph:420},{name:'Badminton',cph:390},{name:'Basket',cph:450},
  {name:'Bersih-bersih',cph:180},{name:'Berkebun',cph:210},{name:'Naik tangga',cph:540},
];

// ══ BOOT ══
window.addEventListener('DOMContentLoaded', async ()=>{
  buildDailyTip();
  buildTopbar(); buildGreeting(); buildHabitSection();
  buildWaterVisual(); restoreQuickRow();
  buildMenuGrid(); renderMeals(); renderMoves();
  buildFoodSuggs(); buildMoveGrid();
  maybeShowNaraMsg();

  // Init Supabase sync
  if(typeof InarteSync!=='undefined'){
    try{
      const _sbTmp=supabase.createClient(
        'https://dcolcdwybmwkpovmorse.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjb2xjZHd5Ym13a3Bvdm1vcnNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2MzU5ODAsImV4cCI6MjA5MTIxMTk4MH0.sh3WgGi95qM0Q5XUKjJcwfUy36NCJKbMV5cH70iyhxE'
      );
      const {data:{session}}=await _sbTmp.auth.getSession();
      if(session?.user) await InarteSync.init(_sbTmp, session.user.id);
    }catch(e){ console.warn('Sync init failed:', e); }
  }
});

// Re-render when Supabase data arrives
window.addEventListener('inarte-sync-ready', ()=>{
  D=JSON.parse(localStorage.getItem('inarte_day_'+TODAY)||'{"water":0,"mood":null,"meals":[],"moves":[],"habits":[],"conditions":[],"totalCal":0,"totalMoveCal":0}');
  buildGreeting(); buildHabitSection(); buildWaterVisual();
  restoreQuickRow(); renderMeals(); renderMoves();
});

// ══ TOPBAR ══
function buildTopbar(){
  const days=['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const months=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const d=new Date();
  document.getElementById('tb-date').textContent=`${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
  document.getElementById('av-btn').textContent=(P.name||'P').charAt(0).toUpperCase();
}

// ══ GREETING ══
function buildGreeting(){
  const h=new Date().getHours();
  const t=h<5?'Selamat malam':h<11?'Selamat pagi':h<15?'Selamat siang':h<18?'Selamat sore':'Selamat malam';
  document.getElementById('g-time').textContent=t;
  document.getElementById('g-name').textContent=P.name||'kamu';
  document.getElementById('g-nara').textContent=_buildNaraGreeting(h);
}

function _buildNaraGreeting(h){
  const n=P.name?(' '+P.name.split(' ')[0]):'';

  // Read today & yesterday data
  const td=JSON.parse(localStorage.getItem('inarte_day_'+TODAY)||'{}');
  const yd_key=(()=>{const d=new Date();d.setDate(d.getDate()-1);return 'inarte_day_'+d.toISOString().split('T')[0];})();
  const yd=JSON.parse(localStorage.getItem(yd_key)||'{}');

  // Today's state
  const waterToday=td.water||0;
  const moodToday=td.mood||'';
  const habitLog=JSON.parse(localStorage.getItem('inarte_habitlog_'+TODAY)||'{}');
  const habitTemplate=JSON.parse(localStorage.getItem('inarte_habits_template')||'[]');
  const doneHabits=habitTemplate.filter(h=>habitLog[h.id]);
  const hasAnyToday=waterToday>0||moodToday||(td.meals&&td.meals.length)||doneHabits.length;

  // Yesterday's state
  const waterYest=yd.water||0;
  const moodYest=yd.mood||'';
  const sleepYest=yd.sleep||0;
  const hasYest=waterYest>0||moodYest||sleepYest>0;

  // Streak state — used to avoid duplicating greeting-freeze notice
  const {streak,freezeUsed}=calcStreakNow();
  const freezeNoticeShowing=freezeUsed>0&&!hasAnyToday; // freeze card akan tampil

  // ── PRIORITY 1: Streak milestone (hanya kalau freeze notice tidak tampil) ──
  if(!freezeNoticeShowing&&streak>0&&[3,7,14,21,30,50,100,200,365].includes(streak)){
    const tiers={3:'3 hari beruntun',7:'seminggu penuh',14:'dua minggu',21:'21 hari',30:'sebulan',50:'50 hari',100:'100 hari',200:'200 hari',365:'setahun'};
    return tiers[streak]+' — ini bukan kebetulan'+n+' (◕ᴗ◕✿)';
  }

  // ── PRIORITY 2: Mood berat kemarin — tanyain kabarnya ──
  if(hasYest&&['berat','cemas','sedih'].includes(moodYest)&&h>=6&&h<13){
    return 'Kemarin terasa berat'+n+'. Gimana pagi ini, lebih baik?';
  }

  // ── PRIORITY 3: Konteks hari ini yang sudah ada ──
  if(hasAnyToday){
    if(waterToday>=getWaterTarget()) return 'Air sudah '+getWaterTarget()+' gelas'+n+'! Tubuhmu pasti senang (◕ᴗ◕✿)';
    if(waterToday>=5&&h>=15) return 'Udah '+waterToday+' gelas air hari ini'+n+'. Tambah sedikit lagi bisa?';
    if(doneHabits.length>=3) return doneHabits.length+' habit selesai'+n+'. Konsistensi kecil itu yang paling berasa (≧▽≦)';
    if(moodToday==='senang'||moodToday==='semangat') return 'Mood '+moodToday+' hari ini'+n+'! Semoga terjaga sampai malam ya (◕ᴗ◕✿)';
    if(moodToday==='berat'||moodToday==='cemas') return 'Aku lihat mood hari ini cukup berat'+n+'. Mau cerita? Nara di sini.';
    return 'Sudah mulai mencatat hari ini'+n+' — bagus (ꈍᴗꈍ)';
  }

  // ── PRIORITY 4: Referensi data kemarin kalau belum ada hari ini ──
  if(hasYest&&h>=6&&h<20){
    if(sleepYest>0&&sleepYest<6) return 'Tidurmu semalam '+sleepYest+' jam'+n+'. Gimana kondisi sekarang?';
    if(sleepYest>=7) return 'Tidur '+sleepYest+' jam semalam'+n+' — itu modal yang bagus untuk hari ini.';
    if(waterYest<5) return 'Kemarin minum '+waterYest+' gelas'+n+'. Yuk kejar hari ini (◕ᴗ◕✿)';
    if(moodYest==='senang'||moodYest==='semangat') return 'Kemarin kamu '+moodYest+n+'. Mudah-mudahan hari ini juga ya!';
  }

  // ── PRIORITY 5: Waktu hari sebagai fallback ──
  if(h<6)  return 'Masih dini hari'+n+'. Istirahat yang cukup ya (ꈍᴗꈍ)';
  if(h<11) return 'Selamat memulai hari'+n+'. Nara di sini kalau butuh teman (◕ᴗ◕✿)';
  if(h<15) return 'Jangan lupa makan siang'+n+' — tubuhmu perlu energi!';
  if(h<18) return 'Sore sudah'+n+'. Sempat bergerak hari ini?';
  return 'Malam ini'+n+', yuk luangin sedikit waktu untuk dirimu sendiri.';
}

// ══ TOAST ══
function showToast(msg, duration){
  let t = document.getElementById('_toast');
  if(!t){
    t = document.createElement('div');
    t.id = '_toast';
    t.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%) translateY(20px);background:var(--text);color:var(--surface);padding:10px 18px;border-radius:20px;font-size:13px;font-weight:500;z-index:9999;opacity:0;transition:all .25s;pointer-events:none;white-space:nowrap;max-width:90vw;text-align:center';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  t.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(t._timer);
  t._timer = setTimeout(()=>{
    t.style.opacity = '0';
    t.style.transform = 'translateX(-50%) translateY(20px)';
  }, duration || 2500);
}


// ══ SAVE ══
// ══ OFFLINE FALLBACK ══
(function initOfflineDetection(){
  function showOffline(){
    const b=document.getElementById("offline-banner");
    const ob=document.getElementById("online-banner");
    if(b)b.classList.add("show");
    if(ob)ob.classList.remove("show");
  }
  function showOnline(){
    const b=document.getElementById("offline-banner");
    const ob=document.getElementById("online-banner");
    if(b)b.classList.remove("show");
    if(ob){
      ob.classList.add("show");
      setTimeout(()=>ob.classList.remove("show"),3000);
    }
    if(typeof InarteSync!=="undefined"&&InarteSync.ready){
      const today=new Date().toISOString().split("T")[0];
      try{InarteSync.pushDaily&&InarteSync.pushDaily(today);}catch(e){}
      try{InarteSync.pushWellness&&InarteSync.pushWellness(today);}catch(e){}
    }
  }
  // Tunggu DOMContentLoaded dulu baru cek — hindari false positive saat load awal
  window.addEventListener("DOMContentLoaded",()=>{
    // Delay 1.5 detik sebelum cek — browser kadang butuh waktu confirm status online
    setTimeout(()=>{
      if(!navigator.onLine) showOffline();
    }, 1500);
  });
  window.addEventListener("online", showOnline);
  window.addEventListener("offline", showOffline);
  window.addEventListener("inarte-sync-failed", showOffline);
})();

// ══ UNIFIED STREAK HELPER ══
// Dipanggil dari semua tab. source: 'today' | 'wellness' | 'finance'
// extraData: object tambahan yang ingin di-merge ke log entry (opsional)
function markDayActive(date, source, extraData){
  const logs=ld('inarte_logs')||{};
  const existing=logs[date]||{};
  logs[date]=Object.assign({},existing,{logged:true,lastSource:source,updatedAt:Date.now()},extraData||{});
  sv('inarte_logs',logs);
}

function saveDay(){
  sv('inarte_day_'+TODAY,D);
  // Hanya mark aktif kalau ada data meaningful — jangan mark kalau masih kosong semua
  const hasMeaningfulData = (D.water > 0) || D.mood ||
    (D.meals && D.meals.length > 0) ||
    (D.moves && D.moves.length > 0) ||
    (D.habits && D.habits.length > 0) ||
    (D.conditions && D.conditions.length > 0);
  if (hasMeaningfulData) {
    markDayActive(TODAY,'today',{water:D.water,mood:D.mood,meals:D.meals.length,move:D.moves.length,mealCal:D.totalCal,moveCal:D.totalMoveCal});
  }
  maybeShowNaraMsg();
  maybeShowStreakPopup();
  if(typeof InarteSync!=='undefined'&&InarteSync.ready) InarteSync.pushDaily(TODAY);
}

// ══ SHEETS ══
function openSheet(id){
  closeSheet(true);
  const sheet=document.getElementById('sheet-'+id);
  const overlay=document.getElementById('sheet-overlay');
  if(!sheet)return;
  overlay.classList.add('on');
  requestAnimationFrame(()=>sheet.classList.add('open'));
  if(id==='move')buildMoveGrid();
}
function closeSheet(){
  document.querySelectorAll('.bottom-sheet.open').forEach(s=>s.classList.remove('open'));
  document.getElementById('sheet-overlay').classList.remove('on');
}

// ══ NARA CHAT ══
