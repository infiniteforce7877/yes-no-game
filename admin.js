(function(){
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  const ADMIN_USER = 'GOKU444';
  const ADMIN_PASS = 'GOKU444';
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

  $('#adminForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const msg = $('#adminMsg');
    const u = $('#aUser').value.trim();
    const p = $('#aPass').value;

    if (u === ADMIN_USER && p === ADMIN_PASS) {
      sessionStorage.setItem(SESSION_KEY, 'true');
      $('#aUser').value = ''; $('#aPass').value = '';
      msg.classList.remove('show');
      showScreen('admin');
      loadAll();
    } else {
      toast(msg, 'Invalid credentials');
    }
  });

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

  function loadAll(){
    const stats = DB.getStats();
    $('#sUsers').textContent = stats.users;
    $('#sQuestions').textContent = stats.questions;
    $('#sAnswers').textContent = stats.answers;
    $('#sRating').textContent = stats.avgRating;

    questionsCache = DB.getQuestions();
    renderQuestions(questionsCache);
    loadUsers();
    loadFeedback();

    const s = DB.getSettings();
    $('#setName').value = s.siteName || '';
    $('#setTag').value = s.tagline || '';
    $('#setCount').value = s.questionsPerQuiz || 10;
  }

  function renderQuestions(list){
    const box = $('#adminList');
    if (!list.length) {
      box.innerHTML = '<div class="qrow"><div class="qmain"><p>Koi question nahi. Add tab se add karo.</p></div></div>';
      return;
    }
    box.innerHTML = list.map(q => `
      <div class="qrow">
        <div class="qmain">
          <p>${esc(q.emoji)} ${esc(q.text)} ${q.active === false ? '<span style="color:#ff4d8d;font-size:10px">[INACTIVE]</span>' : ''}</p>
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
        const q = list.find(x => x.id === b.dataset.edit);
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
      b.addEventListener('click', () => {
        if (!confirm('Ye question delete karna hai?')) return;
        DB.deleteQuestion(b.dataset.del);
        loadAll();
      });
    });
  }

  function resetForm(){
    editingId = null;
    $('#nText').value = ''; $('#nEmoji').value = '';
    $('#nYes').value = ''; $('#nNo').value = '';
    $('#saveQ').textContent = 'Add Question';
    $('#cancelEdit').style.display = 'none';
    $('#addMsg').classList.remove('show');
  }

  $('#cancelEdit')?.addEventListener('click', resetForm);

  $('#saveQ')?.addEventListener('click', () => {
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

    if (editingId) DB.updateQuestion(editingId, body);
    else DB.addQuestion(body);

    resetForm();
    loadAll();
    document.querySelector('.tab[data-tab="questions"]').click();
  });

  function loadUsers(){
    const users = DB.getUsers().sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
    const box = $('#usersList');
    if (!users.length) {
      box.innerHTML = '<div class="qrow"><div class="qmain"><p>Koi user nahi abhi.</p></div></div>';
      return;
    }
    box.innerHTML = users.map(u => `
      <div class="qrow">
        <div class="qmain">
          <p>${esc(u.name)} · ${esc(u.email)}</p>
          <small>Age ${u.age} · ${esc(u.gender)} · Joined ${new Date(u.created_at || Date.now()).toLocaleDateString()}</small>
          ${u.is_banned ? '<small style="color:#ff4d8d"><i>BANNED</i></small>' : ''}
        </div>
        <button class="icon-btn ${u.is_banned ? '' : 'danger'}" data-ban="${esc(u.email)}">${u.is_banned ? 'UNBAN' : 'BAN'}</button>
      </div>
    `).join('');

    box.querySelectorAll('[data-ban]').forEach(b => {
      b.addEventListener('click', () => {
        DB.toggleBanUser(b.dataset.ban);
        loadUsers();
        const stats = DB.getStats();
        $('#sUsers').textContent = stats.users;
        $('#sAnswers').textContent = stats.answers;
        $('#sRating').textContent = stats.avgRating;
      });
    });
  }

  function loadFeedback(){
    const fb = DB.getFeedback().sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
    const box = $('#feedbackList');
    if (!fb.length) {
      box.innerHTML = '<div class="qrow"><div class="qmain"><p>Koi feedback nahi abhi.</p></div></div>';
      return;
    }
    box.innerHTML = fb.slice(0, 200).map(f => `
      <div class="qrow">
        <div class="qmain">
          <p>${'⭐'.repeat(f.rating || 0)} ${f.comment ? '· "' + esc(f.comment) + '"' : ''}</p>
          <small>${esc(f.email)} · ${new Date(f.created_at || Date.now()).toLocaleString()}</small>
        </div>
      </div>
    `).join('');
  }

  $('#saveSettings')?.addEventListener('click', () => {
    const msg = $('#setMsg');
    const s = {
      siteName: $('#setName').value.trim() || 'YES / NO',
      tagline: $('#setTag').value.trim(),
      questionsPerQuiz: Math.max(1, Math.min(30, Number($('#setCount').value) || 10))
    };
    DB.saveSettings(s);
    toast(msg, 'Settings saved ✔', true);
  });

  $('#adminLogout')?.addEventListener('click', () => {
    sessionStorage.removeItem(SESSION_KEY);
    showScreen('login');
  });

  if (sessionStorage.getItem(SESSION_KEY) === 'true') {
    showScreen('admin');
    loadAll();
  }
})();
