// ============================================================
// today-tracker.js — Habits, water, mood, kondisi, meals, move
// ============================================================

// ══ HABITS ══
function loadHabitTemplate(){return ld('inarte_habits_template')||[]}
function saveHabitTemplate(arr){sv('inarte_habits_template',arr);if(typeof InarteSync!=='undefined'&&InarteSync.ready)InarteSync.pushHabits();}
let activeTheme=null;

function buildHabitSection(){
  const row=document.getElementById('habit-themes');
  row.innerHTML='';
  HABIT_THEMES.forEach(t=>{
    const btn=document.createElement('button');
    btn.className='theme-chip';btn.textContent=t.label;
    btn.onclick=()=>toggleTheme(btn,t);
    row.appendChild(btn);
  });
  buildHabitList();
}
function toggleTheme(btn,theme){
  const isActive=btn.classList.contains('active');
  document.querySelectorAll('.theme-chip').forEach(b=>b.classList.remove('active'));
  const sug=document.getElementById('habit-suggestions');
  if(isActive){sug.classList.remove('on');activeTheme=null;return}
  btn.classList.add('active');activeTheme=theme.id;
  document.getElementById('habit-sug-head').textContent=theme.label;
  const chips=document.getElementById('habit-sug-chips');chips.innerHTML='';
  const existing=loadHabitTemplate().map(h=>h.text.toLowerCase());
  theme.sugs.forEach(s=>{
    if(existing.includes(s.toLowerCase()))return;
    const c=document.createElement('button');c.className='habit-sug-chip';c.textContent=s;
    c.onclick=()=>{addHabitText(s);c.style.opacity='.4';c.style.pointerEvents='none'};
    chips.appendChild(c);
  });
  sug.classList.add('on');
}
function buildHabitList(){
  const tmpl=loadHabitTemplate();
  const list=document.getElementById('habit-list');list.innerHTML='';
  if(!tmpl.length){
    list.innerHTML='<li style="font-size:12px;color:var(--text4);font-style:italic;padding:6px 0">Belum ada kebiasaan. Pilih dari tema di atas atau tulis sendiri (◕ᴗ◕✿)</li>';
    updateHabitProgress(0,0);return;
  }
  tmpl.forEach(h=>{
    const isDone=(D.habits||[]).includes(h.id);
    const streak=calcStreak(h.id);
    const li=document.createElement('li');li.className='habit-row'+(isDone?' done':'');
    li.innerHTML=`<div class="habit-check"><svg class="check-svg" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div><span class="habit-text" title="Tahan untuk rename">${h.text}</span>${streak>1?`<span class="habit-streak">🔥 ${streak}</span>`:''}<button class="habit-del" onclick="deleteHabit('${h.id}',event)">✕</button>`;

    // Long press untuk rename (mobile & desktop)
    let pressTimer;
    const textEl=li.querySelector('.habit-text');
    const startPress=()=>{pressTimer=setTimeout(()=>startRename(h.id,li,textEl),600)};
    const cancelPress=()=>clearTimeout(pressTimer);
    li.addEventListener('mousedown',startPress);
    li.addEventListener('touchstart',startPress,{passive:true});
    li.addEventListener('mouseup',cancelPress);
    li.addEventListener('mouseleave',cancelPress);
    li.addEventListener('touchend',cancelPress);
    li.addEventListener('click',e=>{if(e.target.closest('.habit-del')||li.dataset.renaming)return;toggleHabit(h.id,li)});
    list.appendChild(li);
  });
  const done=tmpl.filter(h=>(D.habits||[]).includes(h.id)).length;
  updateHabitProgress(done,tmpl.length);
}

function startRename(id,li,textEl){
  if(li.dataset.renaming) return;
  li.dataset.renaming='1';
  const currentText=textEl.textContent;
  const inp=document.createElement('input');
  inp.className='habit-edit-inp';
  inp.value=currentText;
  inp.maxLength=80;
  const hint=document.createElement('span');
  hint.className='habit-rename-hint';
  hint.textContent='Enter ✓ · Esc ✗';
  textEl.replaceWith(inp);
  // Hide streak and del button temporarily
  li.querySelectorAll('.habit-streak,.habit-del').forEach(el=>el.style.display='none');
  li.appendChild(hint);
  inp.focus();inp.select();
  inp.addEventListener('keydown',e=>{
    if(e.key==='Enter'){e.preventDefault();commitRename(id,inp.value.trim(),li);}
    if(e.key==='Escape'){e.preventDefault();cancelRename(li);}
  });
  inp.addEventListener('blur',()=>setTimeout(()=>commitRename(id,inp.value.trim(),li),120));
}

function commitRename(id,newText,li){
  if(!li.dataset.renaming) return;
  delete li.dataset.renaming;
  if(!newText){cancelRename(li);return;}
  const arr=loadHabitTemplate();
  const habit=arr.find(h=>h.id===id);
  if(habit&&newText!==habit.text){
    habit.text=newText;
    saveHabitTemplate(arr);
    showToast('Nama kebiasaan diperbarui (◕ᴗ◕✿)');
  }
  buildHabitList();
}

function cancelRename(li){
  delete li.dataset.renaming;
  buildHabitList();
}
function calcStreak(id){
  let s=0;const d=new Date();
  while(s<90){const k=`inarte_habitlog_${d.toISOString().split('T')[0]}`;const l=ld(k)||{};if(l[id]){s++;d.setDate(d.getDate()-1)}else break}
  return s;
}
function toggleHabit(id,li){
  if(!D.habits)D.habits=[];
  const was=D.habits.includes(id);
  if(was){D.habits=D.habits.filter(x=>x!==id);li.classList.remove('done')}
  else{D.habits.push(id);li.classList.add('done')}
  const log=ld(`inarte_habitlog_${TODAY}`)||{};
  log[id]=D.habits.includes(id);sv(`inarte_habitlog_${TODAY}`,log);
  saveDay();
  const t=loadHabitTemplate();
  const done=t.filter(h=>D.habits.includes(h.id)).length;
  updateHabitProgress(done,t.length);
  if(!was){
    if(done===t.length&&t.length>0)showToast('🎉 Semua kebiasaan selesai! Luar biasa!',4000);
    else{const m=['✅ Satu kebiasaan terceklis!','🌱 Pelan-pelan tapi pasti~','💪 Keren! Lanjut!','⭐ Progress is progress!'];showToast(m[Math.floor(Math.random()*m.length)])}
  }
}
function updateHabitProgress(done,total){
  const pct=total>0?Math.round(done/total*100):0;
  document.getElementById('habit-prog-fill').style.width=pct+'%';
  document.getElementById('habit-badge').textContent=`${done}/${total}`;
  document.getElementById('habit-prog-count').textContent=total>0?`${done} dari ${total} selesai`:'';
  const msg=pct===100?'Hari ini sempurna! (≧▽≦)':pct>=60?'Hampir sampai!':pct>=40?'Jalan terus!':total>0?'Mulai dari yang mudah dulu~':'';
  document.getElementById('habit-prog-msg').textContent=msg;
}
function addHabitText(text){
  const arr=loadHabitTemplate();
  if(arr.some(h=>h.text.toLowerCase()===text.toLowerCase()))return;
  arr.push({id:'h_'+Date.now(),text,addedAt:Date.now()});
  saveHabitTemplate(arr);buildHabitList();showToast('Kebiasaan ditambahkan!');
}
function addHabit(){const inp=document.getElementById('habit-add-inp');const t=inp.value.trim();if(!t)return;addHabitText(t);inp.value=''}
function deleteHabit(id,e){
  e.stopPropagation();
  saveHabitTemplate(loadHabitTemplate().filter(h=>h.id!==id));
  D.habits=(D.habits||[]).filter(x=>x!==id);
  saveDay();buildHabitList();
}

// ══ WATER ══
let waterOpen=false;
// Water target dari profil — default 8
function getWaterTarget(){
  const p=JSON.parse(localStorage.getItem('inarte_profile')||'{}');
  if(!p.water) return 8;
  return parseInt(p.water)||8;
}

function buildWaterVisual(){
  const w=D.water||0;
  const target=getWaterTarget();
  document.getElementById('bottle-fill').style.height=(w/target*100)+'%';
  document.getElementById('water-count').textContent=w;
  document.getElementById('wc-num').textContent=w;
  // dots
  const dotsEl=document.getElementById('water-dots');dotsEl.innerHTML='';
  for(let i=0;i<target;i++){
    const d=document.createElement('div');
    d.className='water-dot'+(i<w?' full':'');
    dotsEl.appendChild(d);
  }
  // update label "dari X gelas"
  const ofEl=document.querySelector('.water-of');
  if(ofEl)ofEl.textContent=`dari ${target} gelas`;
  // hint
  const remaining=target-w;
  let hint;
  if(w===0)hint='Yuk mulai minum! (◕ᴗ◕✿)';
  else if(w===target)hint='Target tercapai! (≧▽≦)';
  else if(remaining===1)hint='Satu lagi untuk genap!';
  else if(w>=Math.floor(target/2))hint=`${remaining} lagi!`;
  else hint='Bagus! Terus lanjut.';
  const hintEl=document.getElementById('wc-hint');
  if(hintEl)hintEl.textContent=hint;
}
function toggleWater(){
  waterOpen=!waterOpen;
  document.getElementById('water-controls').classList.toggle('on',waterOpen);
}
function adjustWater(delta){
  const prev=D.water||0;
  const target=getWaterTarget();
  D.water=Math.max(0,Math.min(target,prev+delta));
  // animate last dot
  if(D.water>prev){
    buildWaterVisual();
    const dots=document.querySelectorAll('.water-dot');
    if(dots[D.water-1])dots[D.water-1].classList.add('just-filled');
  } else buildWaterVisual();
  saveDay();
  if(D.water>prev){
    if(D.water===target)showToast('💧 Target air tercapai! Tubuhmu happy! (≧▽≦)',4000);
    else{const m=['💧 Satu gelas tercatat!','🌊 Tubuhmu berterima kasih!','💙 Hidrasi itu self-care~'];showToast(m[Math.floor(Math.random()*m.length)])}
  }
}

// ══ MOOD ══
let moodOpen=false;
function toggleMood(){
  moodOpen=!moodOpen;
  document.getElementById('mood-picker').classList.toggle('on',moodOpen);
}
function selectMood(id,em,lbl,sub){
  D.mood=id;
  document.getElementById('mood-em').textContent=em;
  document.getElementById('mood-lbl').textContent=lbl;
  document.getElementById('mood-sub').textContent=sub;
  document.querySelectorAll('.mood-opt').forEach(b=>b.classList.remove('sel'));
  // find and mark selected
  document.querySelectorAll('.mood-opt').forEach(b=>{if(b.querySelector('.mood-opt-lbl')?.textContent===lbl)b.classList.add('sel')});
  moodOpen=false;document.getElementById('mood-picker').classList.remove('on');
  saveDay();
  // Human feedback — not "tercatat" but actual response
  const feedbacks={
    senang:`😊 ${P.name?P.name+', s':'S'}enang denger kamu lagi baik-baik! Semoga terbawa sampai malam ya~`,
    netral:`Hari yang biasa pun punya nilainya${P.name?', '+P.name:''}. Tidak harus selalu wow (◕ᴗ◕✿)`,
    lelah:`Badan lelah itu sinyal${P.name?', '+P.name:''}. Boleh istirahat sejenak — itu bukan malas, itu perlu.`,
    berat:`Hari yang berat terasa berat${P.name?', '+P.name:''}. Tapi kamu masih di sini, dan itu sudah cukup. Nara di sini ya (ꈍᴗꈍ)`,
    semangat:`Wah energi hari ini positif banget${P.name?', '+P.name:''}! (≧▽≦) Salurkan ke hal-hal yang kamu suka!`
  };
  showToast(feedbacks[id]||'✨',4000);
}

// ══ KONDISI ══
let condOpen=false;
function toggleCond(){
  condOpen=!condOpen;
  document.getElementById('cond-picker').classList.toggle('on',condOpen);
}
function toggleCondOpt(btn,id){
  btn.classList.toggle('on');
  if(!D.conditions)D.conditions=[];
  if(btn.classList.contains('on')){if(!D.conditions.includes(id))D.conditions.push(id)}
  else D.conditions=D.conditions.filter(x=>x!==id);
  renderCondTags();saveDay();
}
function renderCondTags(){
  const el=document.getElementById('cond-tags');
  const labels={haid:'🩸 Haid',hamil:'🤰 Hamil',menyusui:'🤱 Menyusui',sakit:'🤒 Kurang sehat'};
  if(!D.conditions||!D.conditions.length){el.innerHTML='<span class="cond-empty">Tap untuk isi</span>';return}
  el.innerHTML=D.conditions.map(c=>`<span class="cond-tag">${labels[c]||c}</span>`).join('');
}
function restoreQuickRow(){
  buildWaterVisual();
  if(D.mood){
    const map={senang:['😊','Senang'],netral:['😐','Biasa'],lelah:['😮‍💨','Lelah'],berat:['😔','Berat'],semangat:['🔥','Semangat']};
    const m=map[D.mood];
    if(m){
      document.getElementById('mood-em').textContent=m[0];
      document.getElementById('mood-lbl').textContent=m[1];
    }
    // Restore .sel class ke tombol mood yang dipilih
    document.querySelectorAll('.mood-opt').forEach(b=>{
      const lbl=b.querySelector('.mood-opt-lbl')?.textContent?.trim();
      if(lbl&&m&&lbl===m[1]) b.classList.add('sel');
      else b.classList.remove('sel');
    });
  }
  renderCondTags();
  (D.conditions||[]).forEach(id=>{
    const btn=document.querySelector(`.cond-opt[onclick*="'${id}'"]`);
    if(btn)btn.classList.add('on');
  });
}

// ══ MENU ══
function buildMenuGrid(){
  const menus=getMenus();
  const grid=document.getElementById('menu-grid');grid.innerHTML='';
  menus.forEach(m=>{
    const cell=document.createElement('div');cell.className='menu-cell';
    cell.innerHTML=`<div class="menu-cell-time">${m.time}</div><div class="menu-cell-name">${m.name}</div><div class="menu-cell-cal">~${m.cal} kkal</div><div class="menu-cell-why">${m.why}</div>`;
    cell.onclick=()=>{document.getElementById('meal-inp').value=m.name;openSheet('meals')};
    grid.appendChild(cell);
  });
  const sub=[];
  if((D.conditions||[]).includes('haid'))sub.push('disesuaikan untuk haid');
  if((D.conditions||[]).includes('hamil'))sub.push('untuk ibu hamil');
  if(P.budget)sub.push(P.budget);
  document.getElementById('menu-head-sub').textContent=sub.length?sub.join(' · '):'Berdasarkan profil & kondisimu';
}
function getMenus(){
  const conds=D.conditions||[];
  const age=P.age?parseInt(P.age):25;
  const day=new Date().getDay();
  if(age>=60)return [{time:'Sarapan',name:'Bubur ayam lembut',cal:200,why:'Mudah dicerna, cocok untuk pagi'},{time:'Siang',name:'Nasi tim + ikan kukus',cal:350,why:'Lunak, tidak pedas'},{time:'Malam',name:'Sup tahu telur',cal:180,why:'Ringan untuk malam'}];
  if(conds.includes('menyusui'))return [{time:'Sarapan',name:'Oatmeal + telur + susu',cal:380,why:'Booster ASI'},{time:'Siang',name:'Sayur bening katuk + ikan',cal:350,why:'Katuk = booster ASI terbaik'},{time:'Malam',name:'Tempe + tumis bayam',cal:280,why:'Zat besi untuk ASI'}];
  if(conds.includes('hamil'))return [{time:'Sarapan',name:'Roti gandum + telur + susu',cal:380,why:'Folat penting'},{time:'Siang',name:'Nasi + ikan + sayur hijau',cal:480,why:'Nutrisi lengkap'},{time:'Malam',name:'Sup ayam sayur hangat',cal:350,why:'Baik untuk mual'}];
  if(conds.includes('haid'))return [{time:'Sarapan',name:'Oatmeal + pisang + susu',cal:350,why:'Magnesium bantu nyeri'},{time:'Siang',name:'Nasi + tempe + tumis bayam',cal:380,why:'Zat besi untuk pemulihan'},{time:'Malam',name:'Sup tahu telur + sayur',cal:260,why:'Ringan tapi bergizi'}];
  const sets=[
    [{time:'Sarapan',name:'Roti gandum + telur ceplok',cal:280,why:'Siap 10 menit, mengenyangkan'},{time:'Siang',name:'Nasi + ayam bakar + lalapan',cal:400,why:'Nasi setengah bisa hemat kalori'},{time:'Malam',name:'Mie rebus + telur + sayur',cal:280,why:'Kurangi bumbu, tambah sayur'}],
    [{time:'Sarapan',name:'Oatmeal + telur rebus',cal:250,why:'Serat tinggi, kenyang lebih lama'},{time:'Siang',name:'Pecel + tahu tempe',cal:350,why:'Skip lontong hemat 150 kkal'},{time:'Malam',name:'Soto ayam bening',cal:220,why:'Kuah bening lebih sehat dari santan'}],
    [{time:'Sarapan',name:'Telur dadar + nasi',cal:280,why:'Cepat dan padat nutrisi'},{time:'Siang',name:'Tempe + tumis bayam + nasi',cal:380,why:'Bisa masak sekali untuk 2 hari'},{time:'Malam',name:'Sup tahu bening',cal:180,why:'Ringan dan hangat untuk malam'}],
    [{time:'Sarapan',name:'Yogurt + pisang + granola',cal:290,why:'Probiotik + serat + energi'},{time:'Siang',name:'Gado-gado no lontong',cal:300,why:'Saus kacang sedikit lebih hemat'},{time:'Malam',name:'Ayam bakar + lalapan',cal:280,why:'Tanpa nasi sudah cukup malam ini'}],
    [{time:'Sarapan',name:'Roti gandum + alpukat + telur',cal:380,why:'Lemak sehat untuk energi'},{time:'Siang',name:'Warteg — sayur + protein + nasi',cal:420,why:'Ambil lebih banyak sayur dari nasi'},{time:'Malam',name:'Tumis tahu tempe + nasi sedikit',cal:300,why:'Ringan tapi protein cukup'}],
    [{time:'Sarapan',name:'Bubur sumsum + pisang',cal:280,why:'Nyaman di perut pagi hari'},{time:'Siang',name:'Nasi padang — sayur + protein',cal:420,why:'Pilih sayur & protein, kurangi nasi'},{time:'Malam',name:'Mie rebus sayur telur',cal:270,why:'Lebih ringan dari mie goreng'}],
    [{time:'Sarapan',name:'Nasi kuning + telur pindang',cal:320,why:'Hari Minggu boleh sedikit spesial'},{time:'Siang',name:'Soto ayam + lontong sedikit',cal:380,why:'Kuah bening, nutrisi lengkap'},{time:'Malam',name:'Tempe bacem + nasi merah',cal:290,why:'Nasi merah = serat lebih tinggi'}],
  ];
  return sets[day%sets.length];
}
async function refreshMenu(){
  const btn=document.getElementById('menu-refresh-btn');
  btn.classList.add('loading');btn.disabled=true;
  try{
    const age=P.age?parseInt(P.age):25;
    const conds=(D.conditions||[]).join(', ')||'tidak ada';
    const sys=`Berikan 3 rekomendasi menu hari ini dalam format JSON array saja, tanpa penjelasan lain, tanpa markdown.
Format: [{"time":"Sarapan","name":"nama makanan","cal":angka,"why":"satu kalimat singkat kenapa cocok"},{"time":"Siang",...},{"time":"Malam",...}]
Profil user: usia ${age} tahun, kondisi: ${conds}, budget: ${P.budget||'Rp 50-100rb'}, ${P.act||''}, ${P.home||''}, ${P.cook||''}.
Pertimbangkan kondisi secara spesifik. Berikan pilihan yang beragam dari menu sebelumnya.`;
    const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'gemini-2.0-flash',max_tokens:400,system:sys,messages:[{role:'user',content:'Berikan menu hari ini.'}]}),signal:AbortSignal.timeout(12000)});
    if(r.ok){
      const data=await r.json();
      const text=data.content?.[0]?.text||'';
      const clean=text.replace(/```json|```/g,'').trim();
      const menus=JSON.parse(clean);
      if(Array.isArray(menus)&&menus.length>=3){
        const grid=document.getElementById('menu-grid');grid.innerHTML='';
        menus.forEach(m=>{
          const cell=document.createElement('div');cell.className='menu-cell';
          cell.innerHTML=`<div class="menu-cell-time">${m.time}</div><div class="menu-cell-name">${m.name}</div><div class="menu-cell-cal">~${m.cal} kkal</div><div class="menu-cell-why">${m.why}</div>`;
          cell.onclick=()=>{document.getElementById('meal-inp').value=m.name;openSheet('meals')};
          grid.appendChild(cell);
        });
        const nara=document.getElementById('menu-nara');
        nara.textContent='Menu ini Nara pilihkan khusus berdasarkan kondisi & profil kamu hari ini (◕ᴗ◕✿)';
        nara.classList.add('on');
        btn.classList.remove('loading');btn.disabled=false;
        return;
      }
    }
  }catch(e){console.warn('AI menu failed, rotating static')}
  // Fallback: just rebuild with next day's set
  buildMenuGrid();
  btn.classList.remove('loading');btn.disabled=false;
  showToast('Menu diperbarui!');
}

// ══ MEALS ══
function estCal(name,portion){
  const q=name.toLowerCase().trim();
  if(FOOD_DB[q])return Math.round(FOOD_DB[q].cal*portion);
  const key=Object.keys(FOOD_DB).find(k=>q.includes(k)||k.includes(q));
  if(key)return Math.round(FOOD_DB[key].cal*portion);
  if(q.includes('goreng'))return Math.round(200*portion);
  if(q.includes('bakar')||q.includes('kukus'))return Math.round(140*portion);
  if(q.includes('sayur')||q.includes('tumis'))return Math.round(60*portion);
  if(q.includes('nasi'))return Math.round(200*portion);
  return Math.round(220*portion);
}
function addMeal(){
  const inp=document.getElementById('meal-inp');const txt=inp.value.trim();if(!txt)return;
  const portion=parseFloat(document.getElementById('meal-portion').value)||1;
  const unit=document.getElementById('meal-unit').value;
  const cal=estCal(txt,portion);
  const t=new Date();
  D.meals.push({name:txt,cal,portion,unit,time:`${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`});
  D.totalCal=D.meals.reduce((s,m)=>s+m.cal,0);
  inp.value='';document.getElementById('meal-portion').value='1';
  renderMeals();saveDay();showToast(`🍽 ${txt} tercatat — ~${cal} kkal`);
}
function deleteMeal(i){D.meals.splice(i,1);D.totalCal=D.meals.reduce((s,m)=>s+m.cal,0);renderMeals();saveDay()}
function renderMeals(){
  const list=document.getElementById('meal-list');list.innerHTML='';
  (D.meals||[]).forEach((m,i)=>{
    const li=document.createElement('li');li.className='meal-row';
    li.innerHTML=`<span class="meal-time">${m.time}</span><span class="meal-name">${m.name}<small>${m.portion} ${m.unit}</small></span><span class="meal-kcal">~${m.cal} kkal</span><button class="meal-del" onclick="deleteMeal(${i})">✕</button>`;
    list.appendChild(li);
  });
  const tot=D.totalCal||0;
  document.getElementById('sheet-cal-stat').textContent=`~${tot} kkal`;
  const cs=document.getElementById('cal-summary');
  if(tot>0){cs.style.display='flex';document.getElementById('cal-summary-num').textContent=`~${tot} kkal`}
  document.getElementById('meal-stat').textContent=tot>0?`~${tot} kkal`:'0 kkal';
  const preview=document.getElementById('meal-preview');
  const meals=D.meals||[];
  if(!meals.length){preview.innerHTML='<div class="action-empty">Belum ada catatan.</div><div class="action-tap">Tap untuk catat →</div>'}
  else{preview.innerHTML=meals.slice(-3).map(m=>`<div class="action-item"><span class="action-item-name">${m.name}</span><span class="action-item-cal">${m.cal}k</span></div>`).join('')}
}
function buildFoodSuggs(){
  const wrap=document.getElementById('food-sug-wrap');
  function render(foods){
    wrap.innerHTML='';
    foods.forEach(f=>{
      const db=FOOD_DB[f];if(!db)return;
      const c=document.createElement('button');c.className='food-sug-chip';
      c.textContent=`${f} (~${db.cal} kkal)`;
      c.onclick=()=>{document.getElementById('meal-inp').value=f;document.getElementById('meal-inp').focus()};
      wrap.appendChild(c);
    });
  }
  render(FOOD_SUGS);
  document.getElementById('meal-inp').addEventListener('input',e=>{
    const q=e.target.value.toLowerCase().trim();
    if(!q){render(FOOD_SUGS);return}
    render(Object.keys(FOOD_DB).filter(k=>k.includes(q)).slice(0,8));
  });
}

// ══ MOVE ══
function buildMoveGrid(){
  const grid=document.getElementById('move-grid');
  if(grid.children.length>0)return;
  const w=P.weight||55;
  MOVE_OPTS.forEach(m=>{
    const btn=document.createElement('button');btn.className='move-opt';
    const cal30=Math.round(m.cph*w*30/3600);
    btn.innerHTML=`<span class="move-opt-lbl">${m.name}</span><span class="move-opt-cal">~${cal30} kkal/30mnt</span>`;
    btn.onclick=()=>addMoveEntry(m.name,30,cal30);
    grid.appendChild(btn);
  });
}
function addMoveEntry(name,dur,cal){
  D.moves.push({name,dur,cal});
  D.totalMoveCal=D.moves.reduce((s,m)=>s+m.cal,0);
  renderMoves();saveDay();showToast(`${name} tercatat — ~${cal} kkal`);
}
function addCustomMove(){
  const name=document.getElementById('move-custom-name').value.trim();
  const dur=parseInt(document.getElementById('move-custom-dur').value)||30;
  if(!name){document.getElementById('move-custom-name').focus();return}
  addMoveEntry(name,dur,Math.round(4*dur));
  document.getElementById('move-custom-name').value='';
  document.getElementById('move-custom-dur').value='';
}
function deleteMove(i){D.moves.splice(i,1);D.totalMoveCal=D.moves.reduce((s,m)=>s+m.cal,0);renderMoves();saveDay()}
function renderMoves(){
  const list=document.getElementById('move-list');list.innerHTML='';
  (D.moves||[]).forEach((m,i)=>{
    const li=document.createElement('li');li.className='move-row';
    li.innerHTML=`<span class="move-row-name">${m.name}</span><span class="move-row-dur">${m.dur} mnt</span><span class="move-row-cal">~${m.cal} kkal</span><button class="move-row-del" onclick="deleteMove(${i})">✕</button>`;
    list.appendChild(li);
  });
  const total=D.totalMoveCal||0;
  document.getElementById('sheet-move-stat').textContent=`~${total} kkal`;
  const bar=document.getElementById('move-summary-bar');
  if(D.moves.length>0){const net=(D.totalCal||0)-total;bar.textContent=`Total gerak hari ini ~${total} kkal. Kalori bersih ~${net} kkal.`;bar.classList.add('on')}
  else bar.classList.remove('on');
  document.getElementById('move-stat').textContent=total>0?`~${total} kkal`:'0 kkal';
  const preview=document.getElementById('move-preview');
  const moves=D.moves||[];
  if(!moves.length){preview.innerHTML='<div class="action-empty">Belum ada aktivitas.</div><div class="action-tap">Tap untuk catat →</div>'}
  else{preview.innerHTML=moves.slice(-2).map(m=>`<div class="action-item"><span class="action-item-name">${m.name} ${m.dur}mnt</span><span class="action-item-cal">${m.cal}k</span></div>`).join('')}
}

// ══ NARA MSG ══
function maybeShowNaraMsg(){
  const hasData=(D.water>0)||D.mood||(D.meals&&D.meals.length)||(D.moves&&D.moves.length);
  if(!hasData)return;
  const el=document.getElementById('nara-today');
  const txt=document.getElementById('nara-today-txt');
  el.classList.add('on');
  const parts=[];
  if((D.conditions||[]).includes('haid'))parts.push('Lagi haid ya — wajar kalau badan lebih berat dari biasanya. Perbanyak zat besi dan minum air ya (ꈍᴗꈍ)');
  if(D.mood==='berat')parts.push('Hari yang berat — itu valid banget. Tidak harus produktif di semua hal hari ini. Kamu sudah cukup.');
  else if(D.mood==='semangat')parts.push('Semangat yang kamu bawa hari ini itu energi yang bagus banget. Jaga terus ya!');
  if((D.water||0)>=6)parts.push(`${D.water} gelas air sudah tercatat — hidrasi kamu bagus hari ini! (≧▽≦)`);
  else if((D.water||0)>0&&(D.water||0)<Math.floor(getWaterTarget()/2))parts.push(`Baru ${D.water} gelas nih. Yuk pelan-pelan tambah lagi ya!`);
  if((D.moves||[]).length>0)parts.push(`Sudah gerak ${D.moves.length} aktivitas — ~${D.totalMoveCal} kkal. Tubuhmu berterima kasih!`);
  const tmpl=loadHabitTemplate();const done=(D.habits||[]).length;
  if(tmpl.length>0&&done===tmpl.length)parts.push(`Semua ${done} kebiasaan hari ini selesai! Konsistensi kamu luar biasa (≧▽≦)`);
  if(!parts.length)parts.push('Kamu sudah mulai mengisi hari ini — itu sudah jadi langkah yang berarti. Lanjutkan pelan-pelan ya (◕ᴗ◕✿)');
  txt.innerHTML=parts.slice(0,2).map(p=>`<p>${p}</p>`).join('');
}
