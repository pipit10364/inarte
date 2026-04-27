// ============================================================
// today-menu.js — Menu AI & food grid
// ============================================================

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
