// ============================================================
// today-nara.js — Nara chat, profile, tips, context, nav, PWA
// ============================================================


// ══ SHARED: NARA + PROFILE ══
let _chatInited=false,_chatHistory=[];
let _P=JSON.parse(localStorage.getItem('inarte_profile')||'{}');
const _TODAY=new Date().toISOString().split('T')[0];
function toggleNaraChat(){
  const chat=document.getElementById('nara-chat');
  const badge=document.getElementById('nara-badge');
  chat.classList.toggle('on');
  if(chat.classList.contains('on')){
    if(badge)badge.classList.remove('on');
    document.getElementById('nc-inp').focus();
    if(!_chatInited){
      // Skip double greeting jika welcome overlay udah muncul hari ini
      const _todayKey=new Date().toISOString().split('T')[0];
      const _welcomeShown=localStorage.getItem('inarte_welcome_shown')===_todayKey;
      if(_welcomeShown){
        // Langsung siap ngobrol, tanpa sapaan ulang
        _addNaraMsg('Nara di sini '+(_P.name?'buat '+_P.name:'buat kamu')+' (◕ᴗ◕✿) Mau lanjut ngobrol?');
      } else {
        _addNaraMsg('Hei '+(_P.name||'kamu')+'! Aku Nara (◕ᴗ◕✿)');
        setTimeout(()=>_addNaraMsg('Mau ngobrol soal apa aja ya — makan, olahraga, curhat, atau tanya apapun!'),400);
      }
      _chatInited=true;
    }
  }
}
function _addNaraMsg(text,who='nara'){
  const msgs=document.getElementById('nc-msgs');
  const div=document.createElement('div');div.className='nc-msg '+who;div.textContent=text;
  msgs.appendChild(div);msgs.scrollTop=msgs.scrollHeight;
}
function quickChat(text){document.getElementById('nc-inp').value=text;sendNara();}
async function sendNara(){
  const inp=document.getElementById('nc-inp');
  const txt=inp.value.trim();if(!txt)return;
  _addNaraMsg(txt,'user');inp.value='';
  _chatHistory.push({role:'user',content:txt});
  const msgs=document.getElementById('nc-msgs');
  const typing=document.createElement('div');typing.className='nc-msg nara';
  typing.innerHTML='<span style="display:flex;gap:4px"><span style="width:5px;height:5px;border-radius:50%;background:var(--nara-l);animation:bounceDot 1.2s infinite;display:inline-block"></span><span style="width:5px;height:5px;border-radius:50%;background:var(--nara-l);animation:bounceDot 1.2s .2s infinite;display:inline-block"></span><span style="width:5px;height:5px;border-radius:50%;background:var(--nara-l);animation:bounceDot 1.2s .4s infinite;display:inline-block"></span></span>';
  msgs.appendChild(typing);msgs.scrollTop=msgs.scrollHeight;
  const dd=JSON.parse(localStorage.getItem('inarte_day_'+_TODAY)||'{}');
  const _habitLog=JSON.parse(localStorage.getItem('inarte_habitlog_'+_TODAY)||'{}');
  const _habitTemplate=JSON.parse(localStorage.getItem('inarte_habits_template')||'[]');
  const _doneHabits=_habitTemplate.filter(h=>_habitLog[h.id]).map(h=>h.name||h.text||'');
  const _journalToday=JSON.parse(localStorage.getItem('inarte_journal_'+_TODAY)||'{}');
  const _journalSnippet=[_journalToday.cerita,_journalToday.syukur,_journalToday.harapan].filter(Boolean).join(' / ').slice(0,120);
  const _ctxToday=[
    'Air: '+(dd.water||0)+'/'+getWaterTarget()+' gelas',
    'Mood: '+(dd.mood||'belum dicatat'),
    'Tidur: '+(dd.sleep?dd.sleep+' jam':'belum dicatat'),
    'Energi fisik: '+(dd.energyFisik||'-')+'/5, mental: '+(dd.energyMental||'-')+'/5',
    _doneHabits.length?'Habit selesai: '+_doneHabits.join(', '):'Belum ada habit yang selesai',
    _journalSnippet?'Jurnal hari ini: "'+_journalSnippet+'"':'Belum ada jurnal hari ini',
  ].join('. ');
  const sys='Kamu adalah Nara, companion wellness yang hangat di INARTE. Nama user: '+(_P.name||'teman')+', '+(_P.age||'?')+' tahun, '+(_P.act||'')+'.'+(_P.goals&&_P.goals.length?' Goals: '+_P.goals.join(', ')+'.':'')+' DATA HARI INI ('+_TODAY+'): '+_ctxToday+'. PRINSIP: Baca konteks dulu. Kalau user curhat bukan soal kesehatan, jadilah pendengar dulu. Kalau relevan, boleh singgung data tapi natural, bukan laporan. Prioritaskan topik yang relevan dengan goals user. Bahasa Indonesia santai, sesekali kaomoji. Max 3-4 kalimat kecuali diminta lebih.';
  let reply;
  try{
    const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({model:'gemini-2.5-flash',max_tokens:700,system:sys,messages:_chatHistory.slice(-12)}),
      signal:AbortSignal.timeout(12000)});
    if(r.ok){const d=await r.json();reply=d.content?.[0]?.text;}
  }catch(e){}
  if(!reply){
    reply = naraSmartFallback(txt, 'chat');
  }
  msgs.removeChild(typing);_addNaraMsg(reply,'nara');
  _chatHistory.push({role:'assistant',content:reply});
}
// Profile panel
let _ppData={};
// ══ PROFILE PANEL ══
const PP_AVATAR_COLORS = ['#3D6147','#7D3E2C','#2E5F7A','#7A3E50','#9B6E2A','#4A6B7A','#6B4A7A'];
let _ppColorIdx = 0;

function ppCycleColor(){
  _ppColorIdx = (_ppColorIdx + 1) % PP_AVATAR_COLORS.length;
  const av = document.getElementById('pp-avatar');
  if(av){ av.style.background = PP_AVATAR_COLORS[_ppColorIdx]; _ppData.avatarColor = PP_AVATAR_COLORS[_ppColorIdx]; }
}

function _ppSetVal(key, val){
  // Update displayed value and chips
  const valEl = document.getElementById('pp-'+key+'-val');
  if(valEl){
    valEl.textContent = val || 'pilih...';
    valEl.className = val ? 'pp-selected-val' : 'pp-selected-val empty';
  }
  // Mark chip as selected
  document.querySelectorAll('#pp-'+key+'-chips .pp-dd-chip').forEach(c => {
    c.classList.toggle('sel', c.textContent.trim() === val);
  });
}

function ppToggleDd(key){
  const chips = document.getElementById('pp-'+key+'-chips');
  const toggle = document.getElementById('pp-'+key+'-toggle');
  if(!chips) return;
  const isOpen = chips.classList.contains('open');
  // Close all dropdowns first
  document.querySelectorAll('.pp-dd-chips.open').forEach(el => el.classList.remove('open'));
  document.querySelectorAll('.pp-dd-toggle.open').forEach(el => el.classList.remove('open'));
  if(!isOpen){
    chips.classList.add('open');
    if(toggle) toggle.classList.add('open');
  }
}

function ppDdSolo(btn, key){
  const val = btn.textContent.trim();
  _ppData[key] = val;
  _ppSetVal(key, val);
  // Close dropdown after pick
  const chips = document.getElementById('pp-'+key+'-chips');
  const toggle = document.getElementById('pp-'+key+'-toggle');
  if(chips) chips.classList.remove('open');
  if(toggle) toggle.classList.remove('open');
}

function ppGoalToggle(btn){
  btn.classList.toggle('sel');
  _ppData.goals = [...document.querySelectorAll('#pp-goals-chips .pp-goals-chip.sel')].map(c=>c.textContent.trim());
}

function openProfile(){
  _ppData = {...(JSON.parse(localStorage.getItem('inarte_profile')||'{}'))};
  // Basic fields
  document.getElementById('pp-name').value = _ppData.name || '';
  document.getElementById('pp-age').value = _ppData.age || '';
  // Avatar
  const av = document.getElementById('pp-avatar');
  if(av){
    av.textContent = (_ppData.name||'P').charAt(0).toUpperCase();
    av.style.background = _ppData.avatarColor || '#3D6147';
    _ppColorIdx = PP_AVATAR_COLORS.indexOf(_ppData.avatarColor||'#3D6147');
    if(_ppColorIdx<0) _ppColorIdx = 0;
  }
  document.getElementById('pp-avatar-name').textContent = _ppData.name || 'Belum diisi';
  // Dropdown fields
  _ppSetVal('gender', _ppData.gender||'');
  _ppSetVal('act', _ppData.act||'');
  _ppSetVal('home', _ppData.home||'');
  _ppSetVal('budget', _ppData.budget||'');
  _ppSetVal('water', _ppData.water||'');
  // Goals
  const goals = _ppData.goals || [];
  document.querySelectorAll('#pp-goals-chips .pp-goals-chip').forEach(c => {
    c.classList.toggle('sel', goals.some(g => g===c.textContent.trim() || g.replace('lebih sehat','sehat').replace('tertata','lebih tertata')===c.textContent.trim() || c.textContent.trim().includes(g.split(' ')[0])));
  });
  document.getElementById('profile-overlay').classList.add('on');
  document.getElementById('profile-panel').classList.add('open');
}

function closeProfile(){
  document.getElementById('profile-overlay').classList.remove('on');
  document.getElementById('profile-panel').classList.remove('open');
  // Close any open dropdowns
  document.querySelectorAll('.pp-dd-chips.open').forEach(el=>el.classList.remove('open'));
  document.querySelectorAll('.pp-dd-toggle.open').forEach(el=>el.classList.remove('open'));
}

// Keep these for backward compat (may be called from old refs)
function ppToggleAcc(id){ document.getElementById(id)?.classList.toggle('open'); }
function ppChipSolo(btn,key){ ppDdSolo(btn,key); }
function ppChipToggle(btn){ ppGoalToggle(btn); }
function ppUpdateSummaries(){}

// ══ PWA INSTALL ══
let _installPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); _installPrompt = e;
  const btn = document.getElementById('pp-install-btn');
  if(btn) btn.style.display = 'flex';
});
function triggerInstall(){
  if(!_installPrompt) return;
  _installPrompt.prompt();
  _installPrompt.userChoice.then(() => {
    _installPrompt = null;
    const b = document.getElementById('pp-install-btn');
    if(b) b.style.display = 'none';
  });
}
function showInstallGuide(){
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  let msg = '';
  if(isIOS && isSafari) msg = 'Di Safari: ketuk ikon Bagikan (□↑) lalu pilih "Tambahkan ke Layar Utama"';
  else if(isIOS) msg = 'Buka di Safari, ketuk ikon Bagikan → "Tambahkan ke Layar Utama"';
  else msg = 'Di Chrome: ketuk menu ⋮ → "Tambahkan ke layar utama". Di laptop: klik ikon ⊕ di address bar.';
  showToast(msg, 5000);
}

function ppChipSolo(btn,key){
  btn.closest('.pp-chips').querySelectorAll('.pp-chip').forEach(b=>b.classList.remove('sel'));
  btn.classList.add('sel');_ppData[key]=btn.textContent.trim();
}
function ppChipToggle(btn){
  btn.classList.toggle('sel');
  _ppData.goals=[...btn.closest('.pp-chips').querySelectorAll('.pp-chip.sel')].map(c=>c.textContent.trim());
}
function saveProfile(){
  const name=document.getElementById('pp-name').value.trim();
  if(!name){document.getElementById('pp-name').focus();return;}
  _ppData.name=name;
  const age=document.getElementById('pp-age').value;
  if(age)_ppData.age=parseInt(age);
  // water target dari dropdown
  const waterChip=document.querySelector('#pp-water-chips .pp-dd-chip.sel');
  if(waterChip)_ppData.water=waterChip.textContent.trim().replace(/\D/g,'');
  // Dropdown fields already updated in _ppData via ppDdSolo
  // Goals already updated via ppGoalToggle
  _ppData.goals=[...document.querySelectorAll('#pp-goals-chips .pp-goals-chip.sel')].map(c=>c.textContent.trim());
  localStorage.setItem('inarte_profile',JSON.stringify(_ppData));
  _P={..._ppData};
  P={..._ppData};
  const avBtn=document.getElementById('av-btn');
  if(avBtn){avBtn.textContent=name.charAt(0).toUpperCase();avBtn.style.background=_ppData.avatarColor||'#3D6147';}
  // Sync ke Supabase jika login
  (async()=>{
    try{
      if(typeof supabase!=='undefined'){
        const SB=supabase.createClient('https://dcolcdwybmwkpovmorse.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjb2xjZHd5Ym13a3Bvdm1vcnNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2MzU5ODAsImV4cCI6MjA5MTIxMTk4MH0.sh3WgGi95qM0Q5XUKjJcwfUy36NCJKbMV5cH70iyhxE');
        const{data:{session}}=await SB.auth.getSession();
        if(session?.user){
          await SB.from('profiles').upsert({
            id:session.user.id,name:_ppData.name,age:_ppData.age?parseInt(_ppData.age):null,
            gender:_ppData.gender||'',act:_ppData.act||'',home:_ppData.home||'',budget:_ppData.budget||'',
            goals:_ppData.goals||[],avatar_color:_ppData.avatarColor||'#3D6147'
          });
        }
      }
    }catch(e){console.warn('Profile sync error:',e);}
  })();
  closeProfile();
  if(typeof showToast==='function')showToast('Profil tersimpan (◕ᴗ◕✿)');
  else alert('Profil tersimpan!');
}
// ══ FEEDBACK ══
function ppToggleFeedback(){
  const wrap = document.getElementById('pp-feedback-wrap');
  if(!wrap) return;
  wrap.classList.toggle('open');
  if(wrap.classList.contains('open')){
    setTimeout(()=>document.getElementById('pp-feedback-txt').focus(), 100);
  }
}

async function sendFeedback(){
  const txt = (document.getElementById('pp-feedback-txt').value||'').trim();
  if(!txt){ document.getElementById('pp-feedback-txt').focus(); return; }

  const btn = document.getElementById('pp-feedback-send');
  btn.disabled = true;
  btn.textContent = 'Mengirim...';

  const profile = JSON.parse(localStorage.getItem('inarte_profile')||'{}');
  const payload = {
    nama: profile.name || 'Anonim',
    pesan: txt,
    halaman: document.body.dataset.page || 'today',
    waktu: new Date().toLocaleString('id-ID'),
  };

  try{
    const SB=supabase.createClient(
      'https://dcolcdwybmwkpovmorse.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjb2xjZHd5Ym13a3Bvdm1vcnNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2MzU5ODAsImV4cCI6MjA5MTIxMTk4MH0.sh3WgGi95qM0Q5XUKjJcwfUy36NCJKbMV5cH70iyhxE'
    );
    const {error}=await SB.from('feedback').insert({
      user_name:payload.nama,
      message:payload.pesan,
      page:payload.halaman,
    });
    if(error)throw error;
    document.getElementById('pp-feedback-txt').value='';
    document.getElementById('pp-feedback-wrap').classList.remove('open');
    if(typeof showToast==='function')showToast('Feedback terkirim! Makasih ya (◕ᴗ◕✿)');
  }catch(e){
    console.warn('Feedback error:',e);
    if(typeof showToast==='function')showToast('Gagal kirim, coba lagi ya.');
  }
}

async function logoutUser(){
  if(!confirm('Yakin mau keluar dari akun?'))return;

  // 1. Set flag DULU sebelum apapun — pakai sessionStorage biar survive redirect
  sessionStorage.setItem('inarte_logout','1');

  // 2. Clear semua localStorage
  localStorage.clear();

  // 3. Supabase signOut — tidak perlu tunggu, flag sudah terpasang
  try{
    if(typeof supabase!=='undefined'){
      const SB=supabase.createClient(
        'https://dcolcdwybmwkpovmorse.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjb2xjZHd5Ym13a3Bvdm1vcnNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2MzU5ODAsImV4cCI6MjA5MTIxMTk4MH0.sh3WgGi95qM0Q5XUKjJcwfUy36NCJKbMV5cH70iyhxE'
      );
      SB.auth.signOut().catch(()=>{});
    }
  }catch(e){}

  // 4. Hard redirect — bukan href biasa, tapi replace biar ga bisa back ke app
  window.location.replace('index.html');
}

const PAGES={today:'today.html',wellness:'wellness.html',finance:'finance.html',progress:'progress.html'};
function navTo(tab){if(document.body.dataset.page===tab)return;window.location.href=PAGES[tab];}
function setActiveNav(){
  const cur=document.body.dataset.page;
  document.querySelectorAll('.bnav-btn').forEach(b=>b.classList.remove('active'));
  const btn=document.getElementById('nav-'+cur);
  if(btn)btn.classList.add('active');
}
window.addEventListener('DOMContentLoaded',setActiveNav);

// ══ DESKTOP SIDEBAR ACTIVE ══
(function(){
  const cur = 'today';
  const btn = document.getElementById('ds-' + cur);
  if(btn) btn.classList.add('active');
})();


// ══ DARK MODE ══
(function(){
  const saved = localStorage.getItem('inarte_theme');
  if(saved === 'dark') document.documentElement.setAttribute('data-theme','dark');
})();

function toggleDark(){
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const next = isDark ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('inarte_theme', next);
  _updateDarkUI(next === 'dark');
}
// ── Sidebar collapse toggle ──
function toggleSidebar(){
  const collapsed = document.body.classList.toggle('sidebar-collapsed');
  localStorage.setItem('inarte_sidebar','collapsed:'+ collapsed);
}
// Restore sidebar state on load
(function(){
  const saved = localStorage.getItem('inarte_sidebar');
  if(saved === 'collapsed:true') document.body.classList.add('sidebar-collapsed');
})();

function _updateDarkUI(isDark){
  const sunPath = '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>';
  const moonPath = '<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>';
  const icons = document.querySelectorAll('.dark-icon-moon, .dark-icon-sun, #dark-icon');
  icons.forEach(el => { el.innerHTML = isDark ? sunPath : moonPath; });
  // also update topbar icon
  const ti = document.getElementById('topbar-dark-icon');
  if(ti) ti.innerHTML = isDark ? sunPath : moonPath;
  const dsLbl = document.getElementById('ds-dark-label');
  if(dsLbl) dsLbl.textContent = isDark ? 'Mode Terang' : 'Mode Gelap';
}
window.addEventListener('DOMContentLoaded', function(){
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  _updateDarkUI(isDark);
});

// ══ DAILY TIPS — HYBRID (local pool + Nara AI kontekstual) ══

const DAILY_TIPS = [
  // TIDUR (15 tips)
  {icon:'😴',tag:'Tidur',text:'Suhu kamar 18–20°C adalah kondisi ideal untuk tidur nyenyak. Kipas angin sederhana sudah cukup.'},
  {icon:'😴',tag:'Tidur',text:'Coba 30 menit tanpa layar sebelum tidur. Cahaya biru menunda produksi melatonin hingga 1,5 jam.'},
  {icon:'😴',tag:'Tidur',text:'Waktu tidur yang konsisten lebih penting dari durasinya. Tubuh lebih mudah pulih kalau ritmenya terjaga.'},
  {icon:'😴',tag:'Tidur',text:'Tidur 7–9 jam bukan kemewahan — itu kebutuhan biologis. Kurang tidur kronis setara dengan mabuk ringan.'},
  {icon:'😴',tag:'Tidur',text:'Kamar yang gelap total bantu produksi melatonin lebih optimal. Lampu tidur redup lebih baik dari yang terang.'},
  {icon:'😴',tag:'Tidur',text:'Mandi air hangat 1–2 jam sebelum tidur bantu tubuh menurunkan suhu inti, sinyal alami untuk mengantuk.'},
  {icon:'😴',tag:'Tidur',text:'Kalau susah tidur, jangan paksa. Bangun sebentar, lakukan sesuatu yang tenang, baru kembali ke tempat tidur.'},
  {icon:'😴',tag:'Tidur',text:'Kafein bertahan 5–7 jam di tubuhmu. Kopi jam 3 sore masih bisa ganggu tidur jam 10 malam.'},
  {icon:'😴',tag:'Tidur',text:'Tidur siang 20 menit (power nap) cukup untuk memulihkan fokus. Lebih dari 30 menit bisa bikin groggy.'},
  {icon:'😴',tag:'Tidur',text:'Pikiran penuh sebelum tidur? Tulis semua yang mengganggu di kertas — otak jadi lebih mudah melepaskan.'},
  {icon:'😴',tag:'Tidur',text:'Alkohol memang bikin mengantuk, tapi menurunkan kualitas tidur REM — kamu bangun lebih lelah.'},
  {icon:'😴',tag:'Tidur',text:'Posisi tidur miring ke kiri bantu sistem limfatik membersihkan limbah otak lebih efisien.'},
  {icon:'😴',tag:'Tidur',text:'Bantal yang terlalu tinggi atau terlalu rendah bisa ganggu kualitas tidur dan bikin leher pegal pagi hari.'},
  {icon:'😴',tag:'Tidur',text:'Jadwalkan waktu tidur seperti jadwal meeting — masuk kalender, ada pengingat, tidak mudah ditunda.'},
  {icon:'😴',tag:'Tidur',text:'Kurang tidur satu malam bisa dipulihkan. Kurang tidur seminggu penuh butuh lebih dari semalaman untuk recover.'},

  // HIDRASI (10 tips)
  {icon:'💧',tag:'Hidrasi',text:'Minum 1 gelas air sebelum kopi pagi bantu metabolisme lebih aktif sejak awal hari.'},
  {icon:'💧',tag:'Hidrasi',text:'Rasa lapar sering ternyata rasa haus. Coba minum segelas air dulu sebelum langsung makan.'},
  {icon:'💧',tag:'Hidrasi',text:'Urine berwarna kuning pucat = hidrasi baik. Kuning gelap = minum lebih banyak.'},
  {icon:'💧',tag:'Hidrasi',text:'Dehidrasi ringan sudah bisa menurunkan konsentrasi hingga 10%. Simpan botol air di meja kerja.'},
  {icon:'💧',tag:'Hidrasi',text:'Air putih adalah skincare paling murah. Dehidrasi ringan bikin kulit tampak lebih kusam dan pori lebih terlihat.'},
  {icon:'💧',tag:'Hidrasi',text:'Tambah irisan lemon atau mint ke air putih kalau bosan — tetap lebih baik dari minuman manis.'},
  {icon:'💧',tag:'Hidrasi',text:'Olahraga 30 menit butuh tambahan 300–500ml air. Minum sebelum, selama, dan setelah bergerak.'},
  {icon:'💧',tag:'Hidrasi',text:'Cuaca panas dan AC justru bikin tubuh kehilangan lebih banyak cairan tanpa kita sadari.'},
  {icon:'💧',tag:'Hidrasi',text:'Teh tanpa gula dan air kelapa termasuk minuman yang menghidrasi. Kopi masih oke asal tidak berlebihan.'},
  {icon:'💧',tag:'Hidrasi',text:'Jadikan minum air sebagai ritual — pagi setelah bangun, sebelum makan, setelah olahraga, sebelum tidur.'},

  // NUTRISI & MAKAN (15 tips)
  {icon:'🥦',tag:'Nutrisi',text:'Makan sayur atau buah sebelum makanan utama bantu menstabilkan lonjakan gula darah setelah makan.'},
  {icon:'🥦',tag:'Nutrisi',text:'Kunyah lebih lambat — otak butuh 20 menit untuk menyadari kamu sudah kenyang. Makan cepat = mudah kekenyangan berlebih.'},
  {icon:'🥦',tag:'Nutrisi',text:'Makan malam lebih awal (sebelum jam 8) beri tubuh waktu cukup untuk proses makanan sebelum tidur.'},
  {icon:'🥦',tag:'Nutrisi',text:'Protein di sarapan bantu kamu kenyang lebih lama dan kurangi craving siang hari.'},
  {icon:'🥦',tag:'Nutrisi',text:'Makanan fermentasi (tempe, yogurt, kimchi) bantu keseimbangan bakteri usus yang pengaruhi mood dan imunitas.'},
  {icon:'🥦',tag:'Nutrisi',text:'Warna warni di piringmu = variasi nutrisi. Coba isi minimal 3 warna sayur/buah setiap hari.'},
  {icon:'🥦',tag:'Nutrisi',text:'Makan di depan layar bikin kita tidak sadar seberapa banyak yang sudah masuk. Coba makan dengan sadar, tanpa distraksi.'},
  {icon:'🥦',tag:'Nutrisi',text:'Serat membantu kenyang lebih lama dan jaga kesehatan usus. Ada di sayur, buah, biji-bijian, dan kacang.'},
  {icon:'🥦',tag:'Nutrisi',text:'Gula tersembunyi ada di saus, kecap manis, minuman kemasan, bahkan roti. Baca label sebelum beli.'},
  {icon:'🥦',tag:'Nutrisi',text:'Tidak ada makanan yang "haram" sepenuhnya — porsi dan frekuensi yang menentukan. Makan dengan sadar, bukan bersalah.'},
  {icon:'🥦',tag:'Nutrisi',text:'Saat stres, tubuh butuh magnesium lebih banyak. Cokelat hitam, kacang, dan bayam bisa bantu.'},
  {icon:'🥦',tag:'Nutrisi',text:'Omega-3 dari ikan, kenari, atau biji chia bantu fungsi otak dan kurangi peradangan di tubuh.'},
  {icon:'🥦',tag:'Nutrisi',text:'Sarapan tidak harus besar — yang penting ada protein dan karbohidrat kompleks untuk energi pagi.'},
  {icon:'🥦',tag:'Nutrisi',text:'Makan bersama orang lain, tanpa gadget, terbukti meningkatkan rasa puas dan koneksi sosial.'},
  {icon:'🥦',tag:'Nutrisi',text:'Jangan terlalu lama menahan lapar — gula darah drop bisa bikin keputusan makan jadi impulsif.'},

  // GERAK & OLAHRAGA (12 tips)
  {icon:'🚶',tag:'Gerak',text:'Jalan kaki 10 menit setelah makan lebih efektif menurunkan gula darah daripada langsung duduk.'},
  {icon:'🚶',tag:'Gerak',text:'Merasa ngantuk setelah makan siang? Jalan 5 menit lebih efektif dari kafein untuk energi singkat.'},
  {icon:'🚶',tag:'Gerak',text:'Tidak ada waktu olahraga? 3x10 menit tersebar sepanjang hari hampir sama efektifnya dengan 30 menit sekaligus.'},
  {icon:'🚶',tag:'Gerak',text:'Olahraga ringan (jalan, yoga, sepeda santai) justru lebih efektif mengurangi stres daripada tidak bergerak sama sekali.'},
  {icon:'🚶',tag:'Gerak',text:'Duduk terlalu lama berbahaya meskipun kamu olahraga. Berdiri atau jalan setiap 45–60 menit penting.'},
  {icon:'🚶',tag:'Gerak',text:'Mulai dari yang kamu suka — olahraga terbaik adalah yang kamu lakukan secara konsisten, bukan yang paling keras.'},
  {icon:'🚶',tag:'Gerak',text:'Peregangan 5 menit setiap pagi bantu tubuh lebih siap bergerak dan kurangi risiko cedera sepanjang hari.'},
  {icon:'🚶',tag:'Gerak',text:'Naik tangga, parkir lebih jauh, jalan ke warung — gerakan non-olahraga tetap dihitung dan terakumulasi.'},
  {icon:'🚶',tag:'Gerak',text:'Setelah olahraga berat, tubuh butuh 48 jam untuk recovery otot. Istirahat bukan kemalasan.'},
  {icon:'🚶',tag:'Gerak',text:'Olahraga di pagi hari bantu mood dan produktivitas sepanjang hari melalui pelepasan endorfin.'},
  {icon:'🚶',tag:'Gerak',text:'Musik yang kamu suka terbukti secara ilmiah meningkatkan performa dan stamina saat olahraga.'},
  {icon:'🚶',tag:'Gerak',text:'Kaki adalah jantung kedua — kontraksi otot kaki bantu pompa darah kembali ke atas. Banyak berdiri dan jalan itu sehat.'},

  // MENTAL & EMOSI (15 tips)
  {icon:'🧘',tag:'Mental',text:'Napas 4-7-8: hirup 4 detik, tahan 7, hembuskan 8. Coba 2 kali saat overthinking atau panik.'},
  {icon:'🧘',tag:'Mental',text:'Rasa cemas tentang masa depan adalah tanda bahwa kamu peduli. Tarik napas, fokus pada satu langkah terdekat.'},
  {icon:'🧘',tag:'Mental',text:'Menulis 3 hal yang berjalan baik hari ini — sekecil apapun — terbukti menggeser fokus otak dari ancaman ke kemungkinan.'},
  {icon:'🧘',tag:'Mental',text:'Kamu tidak harus selalu produktif. Istirahat yang nyata (bukan scrolling) itu bagian dari performa.'},
  {icon:'🧘',tag:'Mental',text:'Membandingkan diri sendiri di media sosial itu tidak fair — kamu membandingkan hari-harimu dengan highlight orang lain.'},
  {icon:'🧘',tag:'Mental',text:'Self-compassion bukan berarti malas. Memperlakukan diri sendiri seperti kamu memperlakukan teman terbaik — itu kekuatan.'},
  {icon:'🧘',tag:'Mental',text:'Batasi berita negatif bukan berarti tidak peduli. Otak butuh jeda dari input ancaman untuk tetap berfungsi baik.'},
  {icon:'🧘',tag:'Mental',text:'Emosi yang ditekan tidak hilang — ia tersimpan. Memberi nama pada perasaan sudah cukup untuk melepas sebagian bebannya.'},
  {icon:'🧘',tag:'Mental',text:'Tidak semua pikiran perlu dipercaya. Pikiran negatif adalah data, bukan fakta tentang siapa kamu.'},
  {icon:'🧘',tag:'Mental',text:'Hubungan sosial yang sehat adalah salah satu prediktor terkuat kesehatan jangka panjang — lebih dari diet atau olahraga.'},
  {icon:'🧘',tag:'Mental',text:'Minta bantuan bukan tanda kelemahan. Justru menunjukkan kamu tahu batas diri dan menghargai energimu.'},
  {icon:'🧘',tag:'Mental',text:'Rutinitas kecil yang menenangkan (teh, buku, musik) adalah jangkar — bantu otak tahu kapan waktunya istirahat.'},
  {icon:'🧘',tag:'Mental',text:'Perfeksionisme sering kali adalah cara otak menunda — karena dimulai berarti bisa gagal. Mulai dengan "cukup baik".'},
  {icon:'🧘',tag:'Mental',text:'Marah itu bukan salah — yang penting adalah apa yang kamu lakukan dengan rasa marah itu. Kenali dulu, baru respons.'},
  {icon:'🧘',tag:'Mental',text:'Kamu tidak bisa menuangkan dari cangkir yang kosong. Merawat diri sendiri bukan egois — itu prasyarat.'},

  // DIGITAL & FOKUS (10 tips)
  {icon:'📵',tag:'Digital',text:'Notifikasi yang terus-menerus melatih otak untuk tidak pernah masuk ke mode fokus dalam. Coba mode senyap 2 jam sehari.'},
  {icon:'📵',tag:'Digital',text:'Cek HP di pagi hari sebelum melakukan hal lain menempatkan agenda orang lain di depan agenda hidupmu.'},
  {icon:'📵',tag:'Digital',text:'Teknik Pomodoro: 25 menit fokus, 5 menit istirahat. Otak butuh jeda untuk tetap tajam sepanjang hari.'},
  {icon:'📵',tag:'Digital',text:'Multitasking itu mitos — otak hanya berganti-ganti cepat antara tugas, dan setiap pergantian itu menguras energi.'},
  {icon:'📵',tag:'Digital',text:'Tulis satu hal terpenting yang harus selesai hari ini sebelum membuka HP. Itu jadikan kompass harianmu.'},
  {icon:'📵',tag:'Digital',text:'Layar terlalu dekat (kurang dari 50cm) dan terlalu lama bisa menyebabkan mata lelah dan sakit kepala.'},
  {icon:'📵',tag:'Digital',text:'Setiap jam di depan layar, lihat objek jauh selama 20 detik — bantu kurangi ketegangan otot mata (aturan 20-20-20).'},
  {icon:'📵',tag:'Digital',text:'Aplikasi yang paling sering kamu buka adalah yang paling banyak membentuk cara berpikirmu. Pilih dengan sadar.'},
  {icon:'📵',tag:'Digital',text:'Scrolling tanpa tujuan memberi ilusi istirahat, tapi otak tetap aktif memproses. Istirahat sejati butuh ketenangan.'},
  {icon:'📵',tag:'Digital',text:'Zona bebas HP di meja makan dan kamar tidur membantu membangun batas yang melindungi fokus dan kualitas tidurmu.'},

  // KEBIASAAN & PERTUMBUHAN (13 tips)
  {icon:'🌿',tag:'Kebiasaan',text:'Kebiasaan kecil yang konsisten jauh lebih powerful dari perubahan besar yang tidak tahan lama.'},
  {icon:'🌿',tag:'Kebiasaan',text:'Hubungkan kebiasaan baru dengan yang sudah ada (habit stacking): setelah sikat gigi → minum air.'},
  {icon:'🌿',tag:'Kebiasaan',text:'Progress tidak selalu kelihatan setiap hari. Tapi akumulasi hari-hari biasa itu yang akhirnya mengubah segalanya.'},
  {icon:'🌿',tag:'Kebiasaan',text:'Jangan tunggu motivasi — mulai dulu, motivasi biasanya muncul setelah kamu sudah mulai bergerak.'},
  {icon:'🌿',tag:'Kebiasaan',text:'Identitas mendahului perilaku: bukan "aku sedang belajar olahraga", tapi "aku orang yang bergerak setiap hari".'},
  {icon:'🌿',tag:'Kebiasaan',text:'Satu hari melewatkan kebiasaan tidak merusaknya. Dua hari berturut-turut yang mulai memutus benang.'},
  {icon:'🌿',tag:'Kebiasaan',text:'Buat kebiasaan baru semudah mungkin dijalankan — siapkan semuanya dari malam sebelumnya.'},
  {icon:'🌿',tag:'Kebiasaan',text:'Rayakan kemenangan kecil. Otak belajar dari reward — apresiasi diri sendiri itu bukan berlebihan.'},
  {icon:'🌿',tag:'Kebiasaan',text:'Lingkungan membentuk kebiasaan lebih kuat dari niat. Ubah lingkungan, kebiasaan ikut berubah.'},
  {icon:'🌿',tag:'Kebiasaan',text:'Belajar sesuatu yang baru setiap hari — sesederhana satu kata atau satu fakta — menjaga otak tetap plastis.'},
  {icon:'🌿',tag:'Kebiasaan',text:'Tanya dirimu setiap malam: apa satu hal yang berjalan baik hari ini? Otak butuh dilatih untuk melihat progres.'},
  {icon:'🌿',tag:'Kebiasaan',text:'Kesabaran bukan menunggu — itu terus melangkah sambil menerima bahwa hasilnya tidak selalu segera terlihat.'},
  {icon:'🌿',tag:'Kebiasaan',text:'Kamu tidak perlu menjadi orang yang berbeda untuk memulai. Mulai dari siapa kamu sekarang, dengan apa yang kamu punya.'},
];

// ── HYBRID TIPS SYSTEM ──
let _tipIdx = -1;
let _tipIsAI = false;

async function buildDailyTip() {
  const el = document.getElementById('tips-card');
  if (!el) return;

  const today = new Date().toISOString().split('T')[0];
  const savedDate = localStorage.getItem('inarte_tip_date');
  const savedTip = localStorage.getItem('inarte_tip_today');

  // Kalau hari ini sudah ada tip (AI atau local), pakai itu
  if (savedDate === today && savedTip) {
    try {
      const parsed = JSON.parse(savedTip);
      _tipIsAI = parsed.isAI || false;
      _renderTipObj(parsed);
      return;
    } catch(e) {}
  }

  // Hari baru — render local tip dulu (instant), lalu coba generate AI
  const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  _tipIdx = dayOfYear % DAILY_TIPS.length;
  _renderTipObj(DAILY_TIPS[_tipIdx]);

  // Coba generate Nara tip yang kontekstual (AI)
  _tryGenerateNaraTip(today);
}

async function _tryGenerateNaraTip(today) {
  try {
    const dd = JSON.parse(localStorage.getItem('inarte_day_' + today) || '{}');
    const yd_key = (() => { const d = new Date(); d.setDate(d.getDate()-1); return 'inarte_day_'+d.toISOString().split('T')[0]; })();
    const yd = JSON.parse(localStorage.getItem(yd_key) || '{}');
    const habitLog = JSON.parse(localStorage.getItem('inarte_habitlog_' + today) || '{}');
    const habitTemplate = JSON.parse(localStorage.getItem('inarte_habits_template') || '[]');
    const doneHabits = habitTemplate.filter(h => habitLog[h.id]).map(h => h.name || h.text || '');

    // Build context
    const ctx = [
      yd.sleep ? `tidur semalam ${parseFloat(yd.sleep).toFixed(1)} jam` : '',
      yd.mood ? `mood kemarin: ${yd.mood}` : '',
      dd.water > 0 ? `minum air hari ini: ${dd.water} gelas` : 'belum minum air hari ini',
      dd.mood ? `mood hari ini: ${dd.mood}` : '',
      doneHabits.length ? `habit selesai: ${doneHabits.join(', ')}` : '',
      dd.energyFisik ? `energi fisik: ${dd.energyFisik}/5` : '',
      dd.energyMental ? `energi mental: ${dd.energyMental}/5` : '',
    ].filter(Boolean).join(', ');

    const h = new Date().getHours();
    const waktu = h < 11 ? 'pagi' : h < 15 ? 'siang' : h < 18 ? 'sore' : 'malam';
    const userName = P?.name || '';

    const sys = `Kamu adalah Nara, companion wellness yang hangat di INARTE.
Buat SATU tips kesehatan harian yang personal, spesifik, dan berbasis bukti.
Format respons harus HANYA JSON: {"icon":"emoji","tag":"Kategori","text":"Teks tips"}
Kategori pilihan: Tidur, Hidrasi, Nutrisi, Gerak, Mental, Digital, Kebiasaan
Teks tips: 1-2 kalimat, bahasa Indonesia santai, ada fakta atau angka spesifik, TIDAK generik.
Jangan gunakan kata: "penting", "pastikan", "jangan lupa", "ingat untuk".
Tips harus relevan dengan konteks user hari ini.`;

    const prompt = `${userName ? 'User: '+userName+'. ' : ''}Waktu: ${waktu}. Konteks: ${ctx || 'belum ada data hari ini'}.`;

    const r = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
        max_tokens: 120,
        system: sys,
        messages: [{ role: 'user', content: prompt }]
      }),
      signal: AbortSignal.timeout(10000)
    });

    if (!r.ok) return;
    const data = await r.json();
    let raw = data.content?.[0]?.text || '';

    // Strip markdown fences kalau ada
    raw = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(raw);

    if (parsed.icon && parsed.tag && parsed.text && parsed.text.length > 20) {
      const tipObj = { ...parsed, isAI: true };
      localStorage.setItem('inarte_tip_date', today);
      localStorage.setItem('inarte_tip_today', JSON.stringify(tipObj));
      _tipIsAI = true;
      _renderTipObj(tipObj, true); // animate ke AI tip
    }
  } catch(e) {
    // Gagal generate AI — simpan local tip supaya tidak re-call besok juga
    const today2 = new Date().toISOString().split('T')[0];
    if (!localStorage.getItem('inarte_tip_today')) {
      const fallback = { ...DAILY_TIPS[_tipIdx], isAI: false };
      localStorage.setItem('inarte_tip_date', today2);
      localStorage.setItem('inarte_tip_today', JSON.stringify(fallback));
    }
  }
}

function rotateTip() {
  // Manual refresh: generate AI tip baru hari ini (hapus cache)
  localStorage.removeItem('inarte_tip_today');
  _tipIsAI = false;
  // Langsung ke local tip berikutnya sambil tunggu AI
  _tipIdx = (_tipIdx + 1) % DAILY_TIPS.length;
  _renderTipObj(DAILY_TIPS[_tipIdx], true);
  _tryGenerateNaraTip(new Date().toISOString().split('T')[0]);
}

function _renderTipObj(tip, animate) {
  const textEl = document.getElementById('tips-text');
  const iconEl = document.getElementById('tips-icon');
  const tagEl = document.getElementById('tips-tag');
  const nextEl = document.getElementById('tips-next');
  if (!textEl) return;
  if (animate) { textEl.style.opacity = '0'; textEl.style.transform = 'translateY(4px)'; }
  setTimeout(() => {
    if (iconEl) iconEl.textContent = tip.icon || '💡';
    textEl.textContent = tip.text;
    if (tagEl) tagEl.textContent = '#' + (tip.tag || 'Tips');
    // Label refresh: kalau AI, tunjukkan "diperbarui Nara"
    if (nextEl) nextEl.textContent = _tipIsAI ? '↺ tips lain' : 'tips lain ›';
    if (animate) {
      textEl.style.transition = 'opacity .3s,transform .3s';
      textEl.style.opacity = '1';
      textEl.style.transform = 'translateY(0)';
      setTimeout(() => textEl.style.transition = '', 350);
    }
  }, animate ? 80 : 0);
}



window.addEventListener('DOMContentLoaded', function(){
  // Calc streak for sidebar widget
  function _calcStrk(){let s=0,d=new Date();while(s<400){const k=d.toISOString().split('T')[0];if(_isDayActive(k)){s++;d.setDate(d.getDate()-1);}else break;}return s;}
  const streak=_calcStrk();
  const BADGES=[{d:0,b:'🌱'},{d:3,b:'🌿'},{d:7,b:'🌳'},{d:14,b:'✨'},{d:21,b:'🔥'},{d:30,b:'⚡'},{d:50,b:'💎'},{d:100,b:'🏆'},{d:200,b:'👑'}];
  let badge='🌱';for(const m of BADGES){if(streak>=m.d)badge=m.b;}
  const bi=document.getElementById('ds-streak-badge');const ni=document.getElementById('ds-streak-num');
  if(bi)bi.textContent=badge;if(ni)ni.textContent=streak;
});




// ══════════════════════════════════════════════
// INARTE NARA CONTEXT SYSTEM
// Auto-summarizes data per halaman, persists ke
// localStorage, di-inject ke setiap call Nara.
// ══════════════════════════════════════════════

const NARA_CTX_KEY = 'inarte_nara_context';

// Baca context
function naraCtxGet() {
  try { return JSON.parse(localStorage.getItem(NARA_CTX_KEY) || '{}'); }
  catch { return {}; }
}

// Tulis / merge context
function naraCtxSet(patch) {
  const current = naraCtxGet();
  const updated = { ...current, ...patch, updatedAt: new Date().toISOString() };
  localStorage.setItem(NARA_CTX_KEY, JSON.stringify(updated));
}

// Build summary dari data today.html dan simpan ke context
function naraCtxRefreshToday() {
  const today = new Date().toISOString().split('T')[0];
  const dd = JSON.parse(localStorage.getItem('inarte_day_' + today) || '{}');
  const habitLog = JSON.parse(localStorage.getItem('inarte_habitlog_' + today) || '{}');
  const habitTemplate = JSON.parse(localStorage.getItem('inarte_habits_template') || '[]');
  const doneHabits = habitTemplate.filter(h => habitLog[h.id]).map(h => h.name || h.text || '');
  const totalHabits = habitTemplate.length;

  const summary = {
    today,
    water: dd.water || 0,
    mood: dd.mood || null,
    moodEmoji: dd.moodEmoji || null,
    sleep: dd.sleep || null,
    energyFisik: dd.energyFisik || null,
    energyMental: dd.energyMental || null,
    habitDone: doneHabits.length,
    habitTotal: totalHabits,
    habitNames: doneHabits,
    totalCal: dd.totalCal || 0,
    conditions: dd.conditions || [],
  };

  naraCtxSet({ todaySummary: summary });
}

// Build system prompt injection string dari context
// ══ WEEKLY REVIEW HELPERS ══
function getWeekKey(){
  // Key unik per minggu — format YYYY-Www
  const d=new Date();
  const jan1=new Date(d.getFullYear(),0,1);
  const week=Math.ceil(((d-jan1)/86400000+jan1.getDay()+1)/7);
  return `${d.getFullYear()}-W${String(week).padStart(2,'0')}`;
}

function buildWeeklyData(){
  const logs=ld('inarte_logs')||{};
  const dates=[];
  const d=new Date();
  for(let i=6;i>=0;i--){
    const dd=new Date(d);dd.setDate(d.getDate()-i);
    dates.push(dd.toISOString().split('T')[0]);
  }

  let activeDays=0,totalWater=0,waterDays=0;
  let totalSleep=0,sleepDays=0;
  let totalFisik=0,fisikDays=0;
  const moods={};
  const habitCounts={};
  const template=JSON.parse(localStorage.getItem('inarte_habits_template')||'[]');

  dates.forEach(k=>{
    const isActive=_isDayActive(k);
    if(isActive) activeDays++;

    const day=JSON.parse(localStorage.getItem('inarte_day_'+k)||'null');
    const w=JSON.parse(localStorage.getItem('inarte_wellness_'+k)||'null');
    const log=logs[k]||{};

    const water=log.water??day?.water??0;
    if(water>0){totalWater+=water;waterDays++;}

    const sleep=w?.sleepHrs||0;
    if(sleep>0){totalSleep+=sleep;sleepDays++;}

    const fisik=w?.energyFisik||0;
    if(fisik>0){totalFisik+=fisik;fisikDays++;}

    const mood=log.mood||day?.mood;
    if(mood) moods[mood]=(moods[mood]||0)+1;

    // Habit
    const habitLog=ld(`inarte_habitlog_${k}`)||{};
    template.forEach(h=>{if(habitLog[h.id])habitCounts[h.id]=(habitCounts[h.id]||0)+1;});
  });

  const avgWater=waterDays?(totalWater/waterDays).toFixed(1):0;
  const avgSleep=sleepDays?(totalSleep/sleepDays).toFixed(1):0;
  const avgFisik=fisikDays?(totalFisik/fisikDays).toFixed(1):0;
  const topMood=Object.entries(moods).sort((a,b)=>b[1]-a[1])[0]?.[0]||'';
  const bestHabit=template.sort((a,b)=>(habitCounts[b.id]||0)-(habitCounts[a.id]||0))[0];
  const waterTarget=typeof getWaterTarget==='function'?getWaterTarget():8;
  const waterGoalDays=dates.filter(k=>{
    const day=JSON.parse(localStorage.getItem('inarte_day_'+k)||'null');
    const log=logs[k]||{};
    return (log.water??day?.water??0)>=waterTarget;
  }).length;

  const summary=[
    `aktif ${activeDays}/7 hari`,
    avgWater>0?`rata-rata air ${avgWater} gelas/hari`:'air belum konsisten dicatat',
    avgSleep>0?`rata-rata tidur ${avgSleep} jam`:'tidur belum dicatat',
    avgFisik>0?`energi fisik rata-rata ${avgFisik}/5`:'',
    topMood?`mood dominan: ${topMood}`:'',
    bestHabit&&(habitCounts[bestHabit.id]||0)>0?`habit paling konsisten: ${bestHabit.text} (${habitCounts[bestHabit.id]||0}/7 hari)` :'',
    waterGoalDays>0?`capai target air ${waterGoalDays} hari`:'',
  ].filter(Boolean).join(', ');

  return {activeDays,avgWater,avgSleep,avgFisik,topMood,bestHabit,waterGoalDays,waterTarget,summary,dates};
}

function buildWeeklyFallback(data,name){
  const n=name?' '+name:'';
  const parts=[];

  if(data.activeDays>=6)
    parts.push(`Minggu ini kamu aktif ${data.activeDays} dari 7 hari${n} — konsistensi yang luar biasa! (≧▽≦)`);
  else if(data.activeDays>=4)
    parts.push(`${data.activeDays} dari 7 hari aktif minggu ini${n} — lebih dari setengah, itu bagus!`);
  else if(data.activeDays>0)
    parts.push(`${data.activeDays} hari tercatat minggu ini${n} — setiap hari yang diisi itu berarti (◕ᴗ◕✿)`);
  else
    parts.push(`Minggu ini belum banyak tercatat${n} — tidak apa-apa, minggu depan bisa mulai lagi (◕ᴗ◕✿)`);

  if(data.avgSleep>0&&parseFloat(data.avgSleep)<6)
    parts.push(`Tidur rata-rata ${data.avgSleep} jam — coba prioritaskan istirahat minggu depan ya.`);
  else if(data.avgSleep>0&&parseFloat(data.avgSleep)>=7)
    parts.push(`Tidur ${data.avgSleep} jam rata-rata — pola tidurmu bagus!`);

  if(data.bestHabit&&(data.bestHabit.id in {}||true))
    parts.push(`Semangat terus minggu depan! (◕ᴗ◕✿)`);

  return parts.slice(0,2).join(' ');
}


// Dipanggil saat API gagal — generate respons personal dari data lokal
// context: 'chat' | 'wellness' | 'finance' | 'progress'
function naraSmartFallback(query, context){
  const P=JSON.parse(localStorage.getItem('inarte_profile')||'{}');
  const n=P.name?' '+P.name:'';
  const goals=P.goals||[];
  const today=new Date().toISOString().split('T')[0];
  const D=JSON.parse(localStorage.getItem('inarte_day_'+today)||'{}');
  const W=JSON.parse(localStorage.getItem('inarte_wellness_'+today)||'{}');
  const q=(query||'').toLowerCase();

  // Helper: pilih satu dari array secara random
  const pick=arr=>arr[Math.floor(Math.random()*arr.length)];

  // ── Data points dari hari ini ──
  const mood=D.mood||'';
  const water=D.water||0;
  const waterTarget=typeof getWaterTarget==='function'?getWaterTarget():8;
  const sleepHrs=W.sleepHrs||D.sleepHrs||0;
  const energi=W.energyFisik||0;
  const emotions=W.emotions||[];
  const habits=D.habits||[];
  const habitTemplate=JSON.parse(localStorage.getItem('inarte_habits_template')||'[]');
  const habitDone=habits.length;
  const habitTotal=habitTemplate.length;

  // ── Finance ──
  const now=new Date();
  const finKey=`inarte_fin_${now.getFullYear()}_${now.getMonth()+1}`;
  const fin=JSON.parse(localStorage.getItem(finKey)||'{"tx":[],"fixed":[]}');
  const income=(fin.tx||[]).filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const expense=(fin.tx||[]).filter(t=>t.type!=='income').reduce((s,t)=>s+t.amount,0);
  const sisa=income-expense;

  // ── Konteks emosi negatif/positif ──
  const emosiNegatif=['Sedih','Cemas','Marah','Takut','Kesepian','Frustrasi','Bosan'];
  const emosiPositif=['Bahagia','Bersyukur','Tenang','Puas','Semangat','Gembira'];
  const adaEmosiNegatif=emotions.some(e=>emosiNegatif.includes(e));
  const adaEmosiPositif=emotions.some(e=>emosiPositif.includes(e));

  // ════════════════════════════════
  // CHAT FALLBACK — berbasis query
  // ════════════════════════════════
  if(context==='chat'){

    // Salam
    if(q.match(/^(hei|hai|halo|hi|hello|hey)\b/)){
      const options=[];
      if(mood==='lelah'||mood==='berat')
        options.push(`Hei${n} (ꈍᴗꈍ) Nara lihat kamu lagi ${mood} hari ini — mau cerita?`);
      if(mood==='senang'||mood==='semangat')
        options.push(`Hei${n}! Seneng lihat kamu ${mood} hari ini (≧▽≦) Ada yang mau diobrolin?`);
      if(sleepHrs&&sleepHrs<6)
        options.push(`Hei${n}! Tidurmu tadi malam cuma ${sleepHrs.toFixed(1)} jam ya — gimana kondisi sekarang?`);
      if(water===0)
        options.push(`Hei${n}! Sudah minum air hari ini belum? (◕ᴗ◕✿)`);
      if(habitDone===habitTotal&&habitTotal>0)
        options.push(`Hei${n}! Semua habit sudah selesai hari ini — Nara bangga! (≧▽≦)`);
      if(options.length) return pick(options);
      return `Hei${n}! (◕ᴗ◕✿) Mau ngobrol apa hari ini?`;
    }

    // Capek / lelah
    if(q.includes('capek')||q.includes('lelah')||q.includes('exhausted')){
      if(sleepHrs&&sleepHrs<6)
        return `Wajar banget capek${n} — tidur ${sleepHrs.toFixed(1)} jam itu kurang. Tubuh kamu minta istirahat, dan itu valid banget (ꈍᴗꈍ)`;
      if(energi&&energi<=2)
        return `Energimu memang lagi rendah hari ini${n}. Tidak harus dipaksakan — istirahat itu produktif juga (ꈍᴗꈍ)`;
      return `Capek itu wajar${n} — istirahat bukan kelemahan. Sudah minum air? Kadang dehidrasi bikin makin lelah (ꈍᴗꈍ)`;
    }

    // Sedih / berat
    if(q.includes('sedih')||q.includes('berat')||q.includes('nangis')||q.includes('down')){
      if(adaEmosiNegatif&&emotions.length)
        return `Nara baca kamu tadi catat "${emotions[0]}" — makasih sudah jujur sama diri sendiri${n}. Mau cerita lebih? (ꈍᴗꈍ)`;
      return `Makasih sudah mau cerita${n}. Perasaan itu valid banget — tidak perlu buru-buru baik-baik (ꈍᴗꈍ)`;
    }

    // Senang / bahagia
    if(q.includes('senang')||q.includes('bahagia')||q.includes('happy')||q.includes('alhamdulillah')){
      if(adaEmosiPositif)
        return `Wah${n} ikut seneng banget! Kamu juga catat "${emotions.find(e=>emosiPositif.includes(e))}" tadi — bagus banget (≧▽≦)`;
      return `Wah ikut seneng${n}! Semoga terus terjaga ya (≧▽≦)`;
    }

    // Air / minum
    if(q.includes('minum')||q.includes('air')||q.includes('water')){
      if(water>=waterTarget)
        return `Target air sudah tercapai hari ini${n} — ${water} gelas! Tubuhmu pasti happy (≧▽≦)`;
      if(water===0)
        return `Belum ada catatan minum air hari ini nih${n}. Yuk mulai dari satu gelas dulu — pelan-pelan (◕ᴗ◕✿)`;
      return `Udah ${water} dari ${waterTarget} gelas hari ini${n}! ${waterTarget-water} lagi ya (◕ᴗ◕✿)`;
    }

    // Tidur / sleep
    if(q.includes('tidur')||q.includes('sleep')||q.includes('istirahat')){
      if(sleepHrs&&sleepHrs>=7)
        return `Tidurmu kemarin ${sleepHrs.toFixed(1)} jam${n} — sudah cukup! Semoga hari ini lebih berenergi (◕ᴗ◕✿)`;
      if(sleepHrs&&sleepHrs<6)
        return `Tidurmu baru ${sleepHrs.toFixed(1)} jam kemarin${n}. Kalau bisa, coba tidur lebih awal malam ini — tubuh kamu butuh recharge (ꈍᴗꈍ)`;
      return `Tidur yang cukup itu salah satu self-care paling underrated${n}. Semoga malam ini lebih nyenyak ya (◕ᴗ◕✿)`;
    }

    // Makan / makanan
    if(q.includes('makan')||q.includes('lapar')||q.includes('menu')){
      const budget=P.budget||'';
      if(budget)
        return `Cek rekomendasi menu di tab Hari Ini ya${n} — Nara sudah sesuaikan dengan budget kamu (◕ᴗ◕✿)`;
      return `Cek menu rekomendasi di tab Hari Ini ya${n} (◕ᴗ◕✿) Jangan skip makan!`;
    }

    // Olahraga / gerak
    if(q.includes('olahraga')||q.includes('gerak')||q.includes('gym')||q.includes('jalan')){
      if(goals.includes('Lebih aktif bergerak'))
        return `Ini salah satu goals kamu${n}! Mulai dari yang ringan aja — 10-15 menit jalan kaki sudah bagus banget (◕ᴗ◕✿)`;
      return `Mulai dari yang kamu suka${n} — 10 menit jalan kaki aja sudah bagus! Konsisten lebih penting dari intensitas (◕ᴗ◕✿)`;
    }

    // Finance
    if(q.includes('uang')||q.includes('duit')||q.includes('keuangan')||q.includes('nabung')||q.includes('hemat')){
      if(goals.some(g=>['Keuangan tertata','Mulai menabung','Kurangi pengeluaran','Bebas hutang','Dana darurat'].includes(g)))
        return `Ini goals keuangan kamu${n}! Catat transaksi dulu di tab Keuangan — dari situ Nara bisa kasih insight yang lebih pas (◕ᴗ◕✿)`;
      if(income>0&&sisa>0)
        return `Keuangan bulan ini surplus${n} — bagus! Sisanya bisa dimasukin ke saving (◕ᴗ◕✿)`;
      return `Yuk mulai catat di tab Keuangan${n} — tidak harus sempurna, yang penting mulai (◕ᴗ◕✿)`;
    }

    // Habit
    if(q.includes('habit')||q.includes('kebiasaan')||q.includes('rutinitas')){
      if(habitTotal===0)
        return `Belum ada habit yang diset${n}. Coba tambah satu hal kecil dulu di tab Hari Ini — konsistensi dimulai dari langkah pertama (◕ᴗ◕✿)`;
      if(habitDone===habitTotal)
        return `Semua ${habitTotal} habit kamu sudah selesai hari ini${n}! Konsistensi kayak gini yang bikin perubahan nyata (≧▽≦)`;
      return `${habitDone} dari ${habitTotal} habit selesai hari ini${n}. Pelan-pelan aja, yang penting jalan (◕ᴗ◕✿)`;
    }

    // Default — berdasarkan kondisi hari ini
    const defaults=[];
    if(mood&&mood!=='netral')
      defaults.push(`Nara lihat mood kamu "${mood}" hari ini${n} — mau cerita lebih? (◕ᴗ◕✿)`);
    if(water<Math.floor(waterTarget/2)&&water>0)
      defaults.push(`Jangan lupa minum air ya${n} — baru ${water} gelas nih (◕ᴗ◕✿)`);
    if(goals.length)
      defaults.push(`Ingat goals kamu${n}: ${goals[0]}. Pelan-pelan tapi pasti ya (◕ᴗ◕✿)`);
    defaults.push(`Aku dengerin${n} (◕ᴗ◕✿) Mau cerita apa?`);
    return pick(defaults);
  }

  // ════════════════════════════════
  // WELLNESS SAVE FALLBACK
  // ════════════════════════════════
  if(context==='wellness'){
    const parts=[];
    if(adaEmosiNegatif)
      parts.push(`Terima kasih sudah mau cerita hari ini${n}. Hari yang berat itu valid — tidak harus kuat terus (ꈍᴗꈍ)`);
    else if(adaEmosiPositif)
      parts.push(`Senang banget lihat kamu baik-baik${n}! (◕ᴗ◕✿)`);
    else
      parts.push(`Terima kasih sudah check in dengan dirimu sendiri${n} — itu bukan hal kecil (◕ᴗ◕✿)`);
    if(sleepHrs&&sleepHrs<6)
      parts.push(`Tidur ${sleepHrs.toFixed(1)} jam tadi malam — coba istirahat lebih awal malam ini ya.`);
    else if(sleepHrs&&sleepHrs>=7)
      parts.push(`Tidur ${sleepHrs.toFixed(1)} jam — bagus! Tubuhmu pasti lebih segar.`);
    if(W.journalText||W.storyText)
      parts.push(`Catatan harianmu sudah Nara baca. Terima kasih sudah mau jujur.`);
    if(W.hopeText)
      parts.push(`Harapanmu untuk besok sudah Nara catat. Semoga terwujud ya (ꈍᴗꈍ)`);
    if(goals.some(g=>g==='Tidur lebih baik')&&sleepHrs&&sleepHrs<7)
      parts.push(`Ingat goals tidurmu${n} — pelan-pelan membaik itu bagus.`);
    if(parts.length<2) parts.push(`Istirahat yang cukup ya. Sampai besok! (◕ᴗ◕✿)`);
    return parts.slice(0,2).join(' ');
  }

  // ════════════════════════════════
  // FINANCE FALLBACK
  // ════════════════════════════════
  if(context==='finance'){
    if(income===0)
      return `Belum ada catatan pemasukan bulan ini${n}. Yuk mulai catat dari yang paling mudah dulu (◕ᴗ◕✿)`;
    if(sisa<0)
      return `Pengeluaran bulan ini melebihi pemasukan${n}. Tidak apa-apa — dengan mencatat ini kamu sudah selangkah lebih sadar (ꈍᴗꈍ)`;
    if(sisa>0)
      return `Bulan ini masih surplus${n}! Sisa ${sisa.toLocaleString('id')} bisa dipertimbangkan buat saving (◕ᴗ◕✿)`;
    return `Pemasukan dan pengeluaran bulan ini seimbang${n}. Yuk cek detail di bawah (◕ᴗ◕✿)`;
  }

  // ════════════════════════════════
  // PROGRESS FALLBACK
  // ════════════════════════════════
  if(context==='progress'){
    const logs=JSON.parse(localStorage.getItem('inarte_logs')||'{}');
    const totalDays=Object.keys(logs).length;
    const parts=[];
    if(totalDays===0)
      return `Perjalananmu baru dimulai${n} — setiap hari yang kamu catat adalah bukti bahwa kamu peduli pada dirimu sendiri (◕ᴗ◕✿)`;
    if(totalDays>=30)
      parts.push(`Sudah ${totalDays} hari kamu check in${n} — konsistensi kayak gini yang bikin perubahan nyata.`);
    else
      parts.push(`${totalDays} hari tercatat${n} — setiap satu hari itu artinya kamu niat untuk lebih baik.`);
    if(goals.length)
      parts.push(`Goals kamu: ${goals.slice(0,2).join(' dan ')}. Perjalanannya terlihat di sini.`);
    else
      parts.push(`Terus lanjutkan ya — sedikit demi sedikit (◕ᴗ◕✿)`);
    return parts.join(' ');
  }

  return `Aku dengerin${n} (◕ᴗ◕✿) Mau cerita apa?`;
}


function naraCtxBuildInjection() {
  const ctx = naraCtxGet();
  const profile = JSON.parse(localStorage.getItem('inarte_profile') || '{}');
  const goals = profile.goals || [];
  const parts = [];

  if (goals.length) {
    parts.push(`[Goals user: ${goals.join(', ')} — prioritaskan insight yang relevan dengan goals ini]`);
  }

  if (ctx.todaySummary) {
    const t = ctx.todaySummary;
    const habitStr = t.habitTotal > 0
      ? `${t.habitDone}/${t.habitTotal} habit selesai${t.habitNames.length ? ' ('+t.habitNames.join(', ')+')' : ''}`
      : 'belum ada habit';
    const waterTarget=getWaterTarget();
    parts.push(`[Hari ini: air ${t.water}/${waterTarget} gelas, mood "${t.mood || 'belum'}", tidur ${t.sleep ? t.sleep+' jam' : 'belum dicatat'}, energi fisik ${t.energyFisik || '-'}/5, ${habitStr}]`);
  }

  if (ctx.wellnessSummary) {
    const w = ctx.wellnessSummary;
    parts.push(`[Wellness terakhir (${w.date || '?'}): tidur ${w.sleep || '-'} jam, energi fisik ${w.energyFisik || '-'}/5 mental ${w.energyMental || '-'}/5, emosi "${w.emotion || '-'}"]`);
  }

  if (ctx.financeSummary) {
    const f = ctx.financeSummary;
    parts.push(`[Keuangan bulan ini: pemasukan ${f.income || 0}, pengeluaran ${f.expense || 0}, sisa ${(f.income||0)-(f.expense||0)}]`);
  }

  if (ctx.lastChatSummary) {
    parts.push(`[Obrolan terakhir dengan Nara: "${ctx.lastChatSummary}"]`);
  }

  if (ctx.recentHighlight) {
    parts.push(`[Catatan Nara: ${ctx.recentHighlight}]`);
  }

  return parts.length ? '\n\nKONTEKS USER:\n' + parts.join('\n') : '';
}

// Simpan ringkasan obrolan terakhir (dipanggil setelah user selesai chat)
function naraCtxSaveChat(userMsg, naraReply) {
  // Simpan snippet singkat: maksimal 120 char dari pesan user
  const snippet = userMsg.slice(0, 120);
  naraCtxSet({ lastChatSummary: snippet, lastChatDate: new Date().toISOString().split('T')[0] });
}

// Auto-refresh context setiap kali ada perubahan data penting.
// Semua patches dikumpulkan di satu DOMContentLoaded di bawah (bersama fetch override).
// Jangan tambah patch di luar listener itu — supaya tidak double-wrap.


// ══════════════════════════════════════════════
// NARA WELCOME OVERLAY — sekali per hari
// Muncul tiap buka app, isi berubah sesuai context
// ══════════════════════════════════════════════

(async function initNaraWelcome() {
  const TODAY = new Date().toISOString().split('T')[0];
  const WELCOME_KEY = 'inarte_welcome_shown';
  const lastShown = localStorage.getItem(WELCOME_KEY);

  // Sudah muncul hari ini? Skip.
  if (lastShown === TODAY) return;

  const profile = JSON.parse(localStorage.getItem('inarte_profile') || '{}');
  const name = profile.name || '';
  const goals = profile.goals || [];

  const h = new Date().getHours();
  const waktu = h < 11 ? 'pagi' : h < 15 ? 'siang' : h < 18 ? 'sore' : 'malam';
  const waktuLabel = h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam';
  const isMingggu = new Date().getDay() === 0; // 0 = Minggu

  // Update timestamp di card
  const timeEl = document.getElementById('nw-time');
  if (timeEl) timeEl.textContent = waktuLabel;

  // Tampilkan overlay dulu (dengan loading dots)
  const overlay = document.getElementById('nara-welcome');
  if (!overlay) return;

  // Delay kecil supaya page udah render
  await new Promise(r => setTimeout(r, 900));
  overlay.classList.add('show');
  localStorage.setItem(WELCOME_KEY, TODAY);

  // Build context untuk Nara
  const ctx = naraCtxGet();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const ykKey = 'inarte_day_' + yesterday.toISOString().split('T')[0];
  const yd = JSON.parse(localStorage.getItem(ykKey) || '{}');
  const isFirstEver = !localStorage.getItem('inarte_logs') && !yd.mood;
  const ctxInjection = naraCtxBuildInjection();

  // ── WEEKLY REVIEW (hari Minggu) ──
  const WEEKLY_KEY = 'inarte_weekly_review_' + getWeekKey();
  const weeklyShown = localStorage.getItem(WEEKLY_KEY);

  if (isMingggu && !weeklyShown && !isFirstEver) {
    // Kumpulkan data 7 hari terakhir
    const weekData = buildWeeklyData();
    localStorage.setItem(WEEKLY_KEY, TODAY);

    const weekSys = `Kamu adalah Nara, companion wellness yang hangat di INARTE. Nama user: ${name || 'teman'}.
Hari ini Minggu — waktunya Nara berbagi ringkasan 7 hari terakhir.
${goals.length ? 'Goals user: ' + goals.join(', ') + '.' : ''}
Data minggu ini: ${weekData.summary}
Tulis weekly review yang personal dan hangat — 2-3 kalimat. Acknowledge satu hal spesifik yang bagus dan satu area yang bisa ditingkatkan. Tutup dengan semangat untuk minggu depan. Bahasa Indonesia santai, boleh satu kaomoji.
PENTING: Balas HANYA JSON:
{"message":"[2-3 kalimat weekly review]","quickReplies":["[opsi 1]","[opsi 2]","[opsi 3]"]}
Quick replies: reaksi natural terhadap review (contoh: "Makasih Nara!", "Mau cerita minggu ini", "Target minggu depan")
JANGAN tambahkan teks apapun di luar JSON.`;

    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-2.5-flash',
          max_tokens: 250,
          system: weekSys,
          messages: [{ role: 'user', content: `Review minggu ini untuk ${name || 'user'}: ${weekData.summary}` }]
        }),
        signal: AbortSignal.timeout(12000)
      });
      if (r.ok) {
        const data = await r.json();
        let raw = (data.content?.[0]?.text || '').replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(raw);
        if (parsed.message) {
          _renderWelcomeMsg('🗓️ ' + parsed.message, parsed.quickReplies || ['Makasih Nara!', 'Mau cerita minggu ini', 'Target minggu depan']);
          return;
        }
      }
    } catch(e) {}

    // Weekly review fallback
    _renderWelcomeMsg('🗓️ ' + buildWeeklyFallback(weekData, name), ['Makasih Nara!', 'Mau cerita minggu ini', 'Target minggu depan']);
    return;
  }

  // ── SAPAAN BIASA ──
  const sys = `Kamu adalah Nara, companion wellness yang hangat di INARTE. Nama user: ${name || 'teman'}.
Waktu sekarang: ${waktu}.
${isFirstEver ? 'Ini adalah pertama kali user membuka app — sapa dengan hangat dan antusias, perkenalkan diri singkat, tanya kabar dengan satu pertanyaan yang spesifik dan hangat.' : `User sudah pernah pakai app ini. Sapa dengan hangat berdasarkan konteks. Goals user: ${goals.join(', ') || 'belum diisi'}.`}
${ctxInjection}
PENTING: Balas HANYA JSON dengan format:
{"message":"[pesan Nara, 2-3 kalimat hangat, bahasa Indonesia santai, boleh satu kaomoji]","quickReplies":["[opsi reply 1]","[opsi reply 2]","[opsi reply 3]"]}
Quick replies: 3 opsi pendek (max 4 kata) yang natural sebagai respons user. Contoh: "Baik dong!", "Lumayan capek sih", "Mau cerita dulu".
JANGAN tambahkan teks apapun di luar JSON.`;

  const prompt = isFirstEver
    ? `Sapa user baru dengan hangat. Waktu: ${waktu}.`
    : `Sapa user yang baru buka app hari ini. Waktu: ${waktu}. Data kemarin: mood ${yd.mood || 'tidak dicatat'}, air ${yd.water || 0} gelas, tidur ${yd.sleep || 'tidak dicatat'}.`;

  try {
    const r = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
        max_tokens: 200,
        system: sys,
        messages: [{ role: 'user', content: prompt }]
      }),
      signal: AbortSignal.timeout(10000)
    });

    if (r.ok) {
      const data = await r.json();
      let raw = (data.content?.[0]?.text || '').replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(raw);

      if (parsed.message) {
        _renderWelcomeMsg(parsed.message, parsed.quickReplies || []);
        return;
      }
    }
  } catch(e) {}

  // Fallback jika API gagal — pakai naraSmartFallback
  const fbMsg = naraSmartFallback('hei', 'chat');
  const fbReplies = ['Baik-baik aja!', 'Lumayan capek sih', 'Mau langsung catat'];
  _renderWelcomeMsg(fbMsg, fbReplies);
})();

function _renderWelcomeMsg(message, quickReplies) {
  const msgEl = document.getElementById('nw-msg');
  const actionsEl = document.getElementById('nw-actions');
  if (!msgEl) return;

  msgEl.textContent = message;

  if (actionsEl) {
    actionsEl.innerHTML = '';

    // Quick reply buttons
    (quickReplies || []).forEach(qr => {
      const btn = document.createElement('button');
      btn.className = 'nw-quick';
      btn.textContent = qr;
      btn.onclick = () => _welcomeQuickReply(qr);
      actionsEl.appendChild(btn);
    });

    // Dismiss button
    const dismiss = document.createElement('button');
    dismiss.className = 'nw-dismiss';
    dismiss.textContent = 'Tutup';
    dismiss.onclick = dismissWelcome;
    actionsEl.appendChild(dismiss);
  }
}

function _welcomeQuickReply(text) {
  // Simpan ke context
  naraCtxSaveChat(text, '');

  // Dismiss welcome, buka Nara chat dengan pesan ini
  dismissWelcome();
  setTimeout(() => {
    if (typeof toggleNaraChat === 'function') {
      // Buka chat
      const chat = document.getElementById('nara-chat');
      if (chat && !chat.classList.contains('on')) toggleNaraChat();
      // Pre-fill dan kirim pesan
      const inp = document.getElementById('nc-inp');
      if (inp) {
        inp.value = text;
        if (typeof sendNara === 'function') sendNara();
      }
    }
  }, 400);
}

function dismissWelcome() {
  const overlay = document.getElementById('nara-welcome');
  if (!overlay) return;
  overlay.classList.add('hiding');
  setTimeout(() => {
    overlay.classList.remove('show', 'hiding');
  }, 450);
}

// Patch sendNara untuk simpan context chat
window.addEventListener('DOMContentLoaded', function() {
  const origSendNara = window.sendNara;
  if (typeof origSendNara === 'function') {
    window.sendNara = async function() {
      const inp = document.getElementById('nc-inp');
      const txt = inp ? inp.value.trim() : '';
      await origSendNara.apply(this, arguments);
      if (txt) naraCtxSaveChat(txt, '');
    };
  }
});

// Inject context ke sendNara system prompt
// Override _ctxToday di sendNara agar pakai naraCtxBuildInjection
// (Ini dilakukan dengan memperluas system prompt yang ada)
window.addEventListener('DOMContentLoaded', function() {
  // Patch: tambahkan context injection ke setiap call Nara chat
  // Caranya: override fetch untuk /api/chat agar append context ke system
  if (window.__inarteFetchPatched) {
    console.warn('[INARTE] fetch already patched — skipping duplicate patch');
  } else {
    const origFetch = window.fetch;
    window.fetch = async function(url, options, ...rest) {
      if (typeof url === 'string' && url.includes('/api/chat') && options?.body) {
        try {
          const body = JSON.parse(options.body);
          if (body.system && body.messages) {
            const ctxStr = naraCtxBuildInjection();
            if (ctxStr && !body.system.includes('KONTEKS USER:')) {
              body.system = body.system + ctxStr;
              options = { ...options, body: JSON.stringify(body) };
            }
          }
        } catch(e) {
          console.warn('[INARTE] fetch context injection error — Nara tetap jalan tanpa context tambahan:', e);
        }
      }
      return origFetch.call(this, url, options, ...rest);
    };
    window.__inarteFetchPatched = true;
  }

  // Refresh context sekali saat halaman load
  naraCtxRefreshToday();

  // Real-time context refresh hooks — satu tempat, tidak double-wrap
  const _sm = window.selectMood;
  if (typeof _sm === 'function') {
    window.selectMood = function() { _sm.apply(this, arguments); setTimeout(naraCtxRefreshToday, 150); };
  }
  const _aw = window.adjustWater;
  if (typeof _aw === 'function') {
    window.adjustWater = function() { _aw.apply(this, arguments); setTimeout(naraCtxRefreshToday, 150); };
  }
  const _th = window.toggleHabit;
  if (typeof _th === 'function') {
    window.toggleHabit = function() { _th.apply(this, arguments); setTimeout(naraCtxRefreshToday, 150); };
  }
  const _sd = window.saveDay;
  if (typeof _sd === 'function') {
    window.saveDay = function() { _sd.apply(this, arguments); setTimeout(naraCtxRefreshToday, 150); };
  }
});
