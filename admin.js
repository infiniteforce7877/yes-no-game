(function(){
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const SESSION_KEY = 'yesno_admin_ok';

  let editingId = null;
  let questionsCache = [];

  function showScreen(name){
    $$('.screen').forEach(s => s.classList.remove('active'));
    const el = $('#screen-' + name);
    if (el) el.classList.add('active');
  }
  function toast(el, text, ok=false){
    el.textContent = text;
    el.classList.toggle('ok', ok);
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 4500);
  }
  function esc(s){
    return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  /* ==================== LOGIN ==================== */
  $('#adminForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const msg = $('#adminMsg');
    const u = $('#aUser').value.trim();
    const p = $('#aPass').value;

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p })
      });
      if (res.ok) {
        sessionStorage.setItem(SESSION_KEY, 'true');
        $('#aUser').value = ''; $('#aPass').value = '';
        msg.classList.remove('show');
        showScreen('admin');
        loadAll();
      } else {
        toast(msg, 'Invalid credentials');
      }
    } catch(err) {
      toast(msg, 'Network error');
    }
  });

  /* ==================== TABS ==================== */
  $$('.tab').forEach(t => {
    t.addEventListener('click', () => {
      $$('.tab').forEach(x => x.classList.remove('on'));
      t.classList.add('on');
      ['questions','add','users','feedback','settings'].forEach(k => {
        const el = $('#tab-' + k);
        if (el) el.style.display = (k === t.dataset.tab) ? 'block' : 'none';
      });
    });
  });

  /* ==================== LOAD DATA ==================== */
  async function loadAll(){
    try {
      // Stats
      const statsRes = await fetch('/api/admin/stats');
      const stats = await statsRes.json();
      $('#sUsers').textContent = stats.users;
      $('#sQuestions').textContent = stats.questions;
      $('#sAnswers').textContent = stats.answers;
      $('#sRating').textContent = stats.avgRating;

      // Questions
      const qsRes = await fetch('/api/admin/questions');
      questionsCache = await qsRes.json();
      renderQuestions(questionsCache);

      // Settings
      const setRes = await fetch('/api/settings');
      const s = await setRes.json();
      $('#setName').value = s.siteName || '';
      $('#setTag').value = s.tagline || '';
      $('#setCount').value = s.questionsPerQuiz || 10;

      loadUsers();
      loadFeedback();
    } catch(e) {
      console.error(e);
      showScreen('login');
    }
  }

  /* ==================== QUESTIONS ==================== */
  function renderQuestions(list){
    const box = $('#adminList');
    if (!list.length) {
      box.innerHTML = '<div class="qrow"><div class="qmain"><p>Koi question nahi. Add tab se add karo.</p></div></div>';
      return;
    }
    box.innerHTML = list.map(q => `
      <div class="qrow">
        <div class="qmain">
          <p>${esc(q.emoji)} ${esc(q.text)}</p>
          <small><b>YES →</b> ${esc(q.yes_reaction)}</small>
          <small><i>NO →</i> ${esc(q.no_reaction)}</small>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <button class="icon-btn" data-edit="${q.id}">EDIT</button>
          <button class="icon-btn danger" data-del="${q.id}">DEL</button>
        </div>
      </div>
    `).join('');

    box.querySelectorAll('[data-edit]').forEach(b => {
      b.addEventListener('click', () => {
        const q = list.find(x => x.id == b.dataset.edit);
        if (!q) return;
        editingId = q.id;
        $('#nText').value = q.text;
        $('#nEmoji').value = q.emoji || '🤖';
        $('#nYes').value = q.yes_reaction;
        $('#nNo').value = q.no_reaction;
        $('#saveQ').textContent = 'Update Question';
        $('#cancelEdit').style.display = 'block';
        document.querySelector('.tab[data-tab="add"]').click();
      });
    });

    box.querySelectorAll('[data-del]').forEach(b => {
      b.addEventListener('click', async () => {
        if (!confirm('Ye question delete karna hai?')) return;
        await fetch('/api/admin/questions/' + b.dataset.del, { method: 'DELETE' });
        loadAll();
      });
    });
  }

  /* ==================== ADD / EDIT ==================== */
  function resetForm(){
    editingId = null;
    $('#nText').value = ''; $('#nEmoji').value = '';
    $('#nYes').value = ''; $('#nNo').value = '';
    $('#saveQ').textContent = 'Add Question';
    $('#cancelEdit').style.display = 'none';
    $('#addMsg').classList.remove('show');
  }

  $('#cancelEdit')?.addEventListener('click', resetForm);

  $('#saveQ')?.addEventListener('click', async () => {
    const msg = $('#addMsg');
    const body = {
      text: $('#nText').value.trim(),
      emoji: $('#nEmoji').value.trim() || '🤖',
      yes_reaction: $('#nYes').value.trim(),
      no_reaction: $('#nNo').value.trim()
    };
    if (!body.text || !body.yes_reaction || !body.no_reaction) {
      return toast(msg, 'Question, YES reaction, NO reaction — teeno bharo.');
    }

    try {
      if (editingId) {
        await fetch('/api/admin/questions/' + editingId, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        });
      } else {
        await fetch('/api/admin/questions', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        });
      }
      resetForm();
      loadAll();
      document.querySelector('.tab[data-tab="questions"]').click();
    } catch(e) {
      toast(msg, 'Server error');
    }
  });

  /* ==================== USERS ==================== */
  async function loadUsers(){
    try {
      const res = await fetch('/api/admin/users');
      const users = await res.json();
      const box = $('#usersList');
      if (!users.length) {
        box.innerHTML = '<div class="qrow"><div class="qmain"><p>Koi user nahi abhi.</p></div></div>';
        return;
      }
      box.innerHTML = users.map(u => `
        <div class="qrow">
          <div class="qmain">
            <p>${esc(u.name)} · ${esc(u.email)}</p>
            <small>Age ${u.age} · ${esc(u.gender)}</small>
            ${u.is_banned ? '<small style="color:#ff4d8d"><i>BANNED</i></small>' : ''}
          </div>
          <button class="icon-btn ${u.is_banned ? '' : 'danger'}" data-ban="${u.id}">${u.is_banned ? 'UNBAN' : 'BAN'}</button>
        </div>
      `).join('');

      box.querySelectorAll('[data-ban]').forEach(b => {
        b.addEventListener('click', async () => {
          await fetch('/api/admin/users/' + b.dataset.ban + '/ban', { method: 'PATCH' });
          loadUsers();
        });
      });
    } catch(e) {}
  }

  /* ==================== FEEDBACK ==================== */
  async function loadFeedback(){
    try {
      const res = await fetch('/api/admin/feedback');
      const fb = await res.json();
      const box = $('#feedbackList');
      if (!fb.length) {
        box.innerHTML = '<div class="qrow"><div class="qmain"><p>Koi feedback nahi abhi.</p></div></div>';
        return;
      }
      box.innerHTML = fb.map(f => `
        <div class="qrow">
          <div class="qmain">
            <p>${'⭐'.repeat(f.rating || 0)} ${f.comment ? '· "' + esc(f.comment) + '"' : ''}</p>
            <small>${esc(f.email)} · ${new Date(f.created_at).toLocaleString()}</small>
          </div>
        </div>
      `).join('');
    } catch(e) {}
  }

  /* ==================== SETTINGS ==================== */
  $('#saveSettings')?.addEventListener('click', async () => {
    const msg = $('#setMsg');
    const s = {
      siteName: $('#setName').value.trim() || 'YES / NO',
      tagline: $('#setTag').value.trim(),
      questionsPerQuiz: Math.max(1, Math.min(30, Number($('#setCount').value) || 10))
    };
    try {
      await fetch('/api/settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s)
      });
      toast(msg, 'Settings saved ✔', true);
    } catch(e) {
      toast(msg, 'Error saving settings');
    }
  });

  /* ==================== LOGOUT ==================== */
  $('#adminLogout')?.addEventListener('click', () => {
    sessionStorage.removeItem(SESSION_KEY);
    showScreen('login');
  });

  if (sessionStorage.getItem(SESSION_KEY) === 'true') {
    showScreen('admin');
    loadAll();
  }
})();
