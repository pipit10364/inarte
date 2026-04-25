// ============================================================
// INARTE SYNC LAYER — sync.js
// Jembatan antara localStorage dan Supabase.
// Load file ini di semua halaman setelah Supabase SDK.
//
// Cara pakai:
//   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
//   <script src="sync.js"></script>
//
// Setelah user login, panggil:
//   await InarteSync.init(supabaseClient, userId)
//
// Setiap save, tambahkan di akhir fungsi save yang ada:
//   InarteSync.pushDaily(date)      → untuk daily_logs
//   InarteSync.pushHabits()         → untuk habits template
//   InarteSync.pushWellness(date)   → untuk wellness_logs
//   InarteSync.pushFinance(year, month) → untuk finance
//   InarteSync.pushAchievements(yearMonth) → untuk achievements
// ============================================================

const InarteSync = (() => {
  let _sb = null;
  let _uid = null;
  let _ready = false;

  // ── Utils ──
  function _ld(k) {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; }
  }
  function _sv(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) { console.warn('localStorage full:', e); }
  }
  function _today() { return new Date().toISOString().split('T')[0]; }
  function _ym() { const d = new Date(); return `${d.getFullYear()}_${d.getMonth()+1}`; }

  // ── Init: called after login ──
  async function init(sbClient, userId) {
    _sb = sbClient;
    _uid = userId;
    _ready = true;
    console.log('[InarteSync] init for', userId);
    await _pullAll();
  }

  // ── PULL ALL: download semua data dari Supabase ke localStorage ──
  async function _pullAll() {
    if (!_ready) return;
    await Promise.allSettled([
      _pullDailyLogs(),
      _pullHabits(),
      _pullWellnessLogs(),
      _pullAchievements(),
      _pullFinance(),
      _pullHaidLogs(),
    ]);
    console.log('[InarteSync] pull complete');
    // Dispatch event so pages can re-render
    window.dispatchEvent(new CustomEvent('inarte-sync-ready'));
  }

  // ── DAILY LOGS ──
  async function _pullDailyLogs() {
    const { data, error } = await _sb
      .from('daily_logs')
      .select('*')
      .eq('user_id', _uid)
      .order('date', { ascending: false })
      .limit(90); // 90 hari terakhir

    if (error || !data) return;

    data.forEach(row => {
      const key = `inarte_day_${row.date}`;
      const local = _ld(key) || {};
      // Merge: Supabase wins kalau updated_at lebih baru
      const sbUpdated = new Date(row.updated_at).getTime();
      const localUpdated = local._updatedAt || 0;
      if (sbUpdated >= localUpdated) {
        _sv(key, {
          water: row.water || 0,
          mood: row.mood || null,
          conditions: row.conditions || [],
          meals: row.meals || [],
          moves: row.moves || [],
          totalCal: row.total_cal || 0,
          totalMoveCal: row.total_move_cal || 0,
          habits: row.habits || [],
          _updatedAt: sbUpdated,
        });
        // Rebuild habit log dari habits array
        if (row.habits && row.habits.length) {
          const habitLog = {};
          row.habits.forEach(id => { habitLog[id] = true; });
          _sv(`inarte_habitlog_${row.date}`, habitLog);
        }
      }
    });
  }

  async function pushDaily(date) {
    if (!_ready) return;
    const d = date || _today();
    const local = _ld(`inarte_day_${d}`);
    if (!local) return;
    const habitLog = _ld(`inarte_habitlog_${d}`) || {};
    const doneHabits = Object.keys(habitLog).filter(k => habitLog[k]);

    const { error } = await _sb.from('daily_logs').upsert({
      user_id: _uid,
      date: d,
      water: local.water || 0,
      mood: local.mood || null,
      conditions: local.conditions || [],
      meals: local.meals || [],
      moves: local.moves || [],
      total_cal: local.totalCal || 0,
      total_move_cal: local.totalMoveCal || 0,
      habits: doneHabits,
    }, { onConflict: 'user_id,date' });

    if (error) console.warn('[InarteSync] pushDaily error:', error.message);
  }

  // ── HABITS TEMPLATE ──
  async function _pullHabits() {
    const { data, error } = await _sb
      .from('habits')
      .select('*')
      .eq('user_id', _uid)
      .order('added_at', { ascending: true });

    if (error || !data || data.length === 0) return;

    const template = data.map(row => ({
      id: row.habit_id,
      text: row.text,
    }));
    _sv('inarte_habits_template', template);
  }

  async function pushHabits() {
    if (!_ready) return;
    const template = _ld('inarte_habits_template') || [];
    if (!template.length) return;

    // Delete existing then insert fresh (simplest for small dataset)
    await _sb.from('habits').delete().eq('user_id', _uid);
    const rows = template.map(h => ({
      user_id: _uid,
      habit_id: h.id,
      text: h.text || h.name || '',
    }));
    const { error } = await _sb.from('habits').insert(rows);
    if (error) console.warn('[InarteSync] pushHabits error:', error.message);
  }

  // ── WELLNESS LOGS ──
  async function _pullWellnessLogs() {
    const { data, error } = await _sb
      .from('wellness_logs')
      .select('*')
      .eq('user_id', _uid)
      .order('date', { ascending: false })
      .limit(90);

    if (error || !data) return;

    data.forEach(row => {
      const key = `inarte_wellness_${row.date}`;
      const local = _ld(key) || {};
      const sbUpdated = new Date(row.updated_at).getTime();
      const localUpdated = local._updatedAt || 0;
      if (sbUpdated >= localUpdated) {
        _sv(key, {
          sleepStart: row.sleep_start,
          sleepEnd: row.sleep_end,
          broad: row.broad,
          emotions: row.emotions || [],
          why: row.why,
          journalText: row.journal,
          gratText: row.grat,
          hopeText: row.hope,
          _updatedAt: sbUpdated,
        });
      }
    });
  }

  async function pushWellness(date) {
    if (!_ready) return;
    const d = date || _today();
    const W = _ld(`inarte_wellness_${d}`);
    if (!W) return;

    const { error } = await _sb.from('wellness_logs').upsert({
      user_id: _uid,
      date: d,
      sleep_start: W.sleepStart || null,
      sleep_end: W.sleepEnd || null,
      broad: W.broad || null,
      emotions: W.emotions || [],
      why: W.why || null,
      journal: W.journalText || null,
      grat: W.gratText || null,
      hope: W.hopeText || null,
    }, { onConflict: 'user_id,date' });

    if (error) console.warn('[InarteSync] pushWellness error:', error.message);
  }

  // ── ACHIEVEMENTS ──
  async function _pullAchievements() {
    const { data, error } = await _sb
      .from('achievements')
      .select('*')
      .eq('user_id', _uid);

    if (error || !data) return;

    data.forEach(row => {
      const key = `inarte_ach_${row.year_month}`;
      _sv(key, row.items || []);
    });
  }

  async function pushAchievements(yearMonth) {
    if (!_ready) return;
    const ym = yearMonth || _ym();
    const items = _ld(`inarte_ach_${ym}`);
    if (!items) return;

    const { error } = await _sb.from('achievements').upsert({
      user_id: _uid,
      year_month: ym,
      items: items,
    }, { onConflict: 'user_id,year_month' });

    if (error) console.warn('[InarteSync] pushAchievements error:', error.message);
  }

  // ── FINANCE ──
  async function _pullFinance() {
    // Pull 6 bulan terakhir
    const months = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}_${d.getMonth() + 1}`);
    }

    for (const ym of months) {
      const [y, m] = ym.split('_').map(Number);
      // Finance disimpan per bulan di localStorage sebagai inarte_fin_YYYY_M
      const key = `inarte_fin_${y}_${m}`;

      // Finance tidak punya tabel sendiri di schema — pakai daily_logs wellness field
      // atau kita simpan di achievements table dengan prefix 'fin_'
      const { data, error } = await _sb
        .from('achievements')
        .select('*')
        .eq('user_id', _uid)
        .eq('year_month', `fin_${ym}`)
        .single();

      if (error || !data) continue;
      _sv(key, data.items);
    }
  }

  async function pushFinance(year, month) {
    if (!_ready) return;
    const now = new Date();
    const y = year || now.getFullYear();
    const m = month || (now.getMonth() + 1);
    const data = _ld(`inarte_fin_${y}_${m}`);
    if (!data) return;

    const { error } = await _sb.from('achievements').upsert({
      user_id: _uid,
      year_month: `fin_${y}_${m}`,
      items: data,
    }, { onConflict: 'user_id,year_month' });

    if (error) console.warn('[InarteSync] pushFinance error:', error.message);
  }

  // ── HAID LOGS ──
  async function _pullHaidLogs() {
    const { data, error } = await _sb
      .from('haid_logs')
      .select('*')
      .eq('user_id', _uid)
      .order('date', { ascending: false })
      .limit(180);

    if (error || !data) return;

    // Rebuild inarte_haid object from rows
    const haidMap = {};
    data.forEach(row => {
      haidMap[row.date] = {
        status: row.status,
        intensitas: row.intensitas,
        gejala: row.gejala || [],
      };
    });
    if (Object.keys(haidMap).length) {
      _sv('inarte_haid', haidMap);
    }
  }

  async function pushHaid(date) {
    if (!_ready) return;
    const d = date || _today();
    const haidMap = _ld('inarte_haid') || {};
    const entry = haidMap[d];
    if (!entry) return;

    const { error } = await _sb.from('haid_logs').upsert({
      user_id: _uid,
      date: d,
      status: entry.status || null,
      intensitas: entry.intensitas || null,
      gejala: entry.gejala || [],
    }, { onConflict: 'user_id,date' });

    if (error) console.warn('[InarteSync] pushHaid error:', error.message);
  }

  // ── PUBLIC API ──
  return {
    init,
    pushDaily,
    pushHabits,
    pushWellness,
    pushAchievements,
    pushFinance,
    pushHaid,
    pullAll: _pullAll,
    get ready() { return _ready; },
  };
})();
