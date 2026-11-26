(function(){
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  const state = {
    user: null, questions: [], idx: 0,
    sessionId: null, yesCount: 0, noCount: 0,
    rating: 0, currentAnswer: null, idleTimer: null,
    settings: { siteName: 'YES / NO', tagline: '', questionsPerQuiz: 10 }
  };

  // (Funny content arrays TAGLINES, EYEBROWS, etc. same rahenge, space ke liye yahan skip kiye hain, purane app.js se copy kar lena) 
  // ... [TAGLINES, EYEBROWS, LOADING_MESSAGES, LOADING_EMOJIS, HUD_MESSAGES, PROGRESS_QUIPS, IDLE_JOKES, AGE_ROASTS, ENTRY_ERRORS, DONE_LINES, VERDICT_ROASTS, RESULT_HEADERS] ...

  /* ==================== HELPERS ==================== */
  function showScreen(name){
    $$('.screen').forEach(s => s.classList.remove('active'));
    const el = $('#screen-' + name);
    if (el) el.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function toast(el, text, ok=false){
    el.textContent = text;
    el.classList.toggle('ok', ok);
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 4500);
  }
  function rand(arr){ return arr[Math.floor(Math.random() * arr.length)]; }

  /* ==================== FETCH SETTINGS ==================== */
  async function loadSettings(){
    try {
      const res = await fetch('/api/settings');
      state.settings = await res.json();
      const nameEl = $('#siteName');
      if (nameEl) nameEl.textContent = state.settings.siteName || 'YES / NO';
      document.title = (state.settings.siteName || 'YES / NO') + ' — Dimag Ka Dahi';
    } catch(e) { console.error('Settings load failed'); }
  }

  // ... [startTaglineRotation, startHUDRotation, setInterval Clock, showLoading, SOUND, startIdleJokes] ...
  // (Ye functions same rahenge jaise pichli app.js me the)

  /* ==================== ENTRY ==================== */
  $('#genderChips')?.addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    $$('#genderChips .chip').forEach(c => c.classList.remove('on'));
    chip.classList.add('on');
    $('#fGender').value = chip.dataset.g;
    if (window.Sound) Sound.next();
  });

  $('#entryForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const msg = $('#entryMsg');
    const btn = $('#enterBtn');
    const gender = $('#fGender').value;

    if (!gender) return toast(msg, 'Gender nahi bataya? Select to karo 🙂');

    const name = $('#fName').value.trim();
    const email = $('#fEmail').value.trim();
    const age = Number($('#fAge').value);

    if (!name || name.length < 2) return toast(msg, 'Naam toh daalo bhai 😇');
    if (!email) return toast(msg, 'Email daalo, asli wala 💀');
    if (!age || age < 5 || age > 120) return toast(msg, 'Age daalo 🎲');

    btn.disabled = true;
    btn.textContent = 'Checking... 🔍';

    try {
      const check = await EmailCheck.validate(email);
      if (!check.valid) {
        if (window.Sound) Sound.fail();
        toast(msg, '❌ ' + check.reason);
        btn.disabled = false;
        btn.textContent = 'Andar Aao 🚪';
        return;
      }

      const user = { name: name.slice(0, 40), email: email.toLowerCase(), age, gender };
      
      // API Call to register user
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      state.user = user;

      showLoading(() => {
        $('#qUser').textContent = user.name.toUpperCase();
        startQuiz();
      });
    } catch (err) {
      toast(msg, err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Andar Aao 🚪';
    }
  });

  /* ==================== QUIZ ==================== */
  async function startQuiz(){
    try {
      const limit = Math.min(state.settings.questionsPerQuiz || 10, 30);
      const res = await fetch('/api/questions');
      const active = await res.json();

      if (active.length < limit) {
        toast($('#entryMsg'), '😬 DB me kam sawaal hain (chahiye ' + limit + ')');
        return;
      }

      const pool = [...active];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      state.questions = pool.slice(0, limit);
      state.idx = 0;
      state.yesCount = 0;
      state.noCount = 0;
      state.sessionId = 's_' + Date.now();
      state.currentAnswer = null;

      showScreen('quiz');
      renderQuestion();
    } catch(e) {
      toast($('#entryMsg'), 'Server error. Please refresh.');
    }
  }

  function renderQuestion(){
    const q = state.questions[state.idx];
    const total = state.questions.length;
    $('#qCount').textContent = (state.idx + 1) + ' / ' + total;
    $('#qBar').style.width = ((state.idx / total) * 100) + '%';
    $('#qEmoji').textContent = q.emoji || '🤖';
    $('#qText').textContent = q.text;

    const quipEl = $('#progressQuip');
    if (quipEl) {
      quipEl.textContent = PROGRESS_QUIPS[state.idx % PROGRESS_QUIPS.length];
      quipEl.classList.remove('pulse');
      void quipEl.offsetWidth;
      quipEl.classList.add('pulse');
    }

    $('#reaction').classList.remove('show', 'no');
    $('#reactionText').textContent = '';
    $('#nextBtn').classList.remove('show');
    state.currentAnswer = null;

    $$('.ans-btn').forEach(b => { b.disabled = false; b.classList.remove('chosen'); });

    const card = $('#qCard');
    card.classList.remove('card-pop');
    void card.offsetWidth;
    card.classList.add('card-pop');
  }

  async function pickAnswer(ans){
    if (state.currentAnswer) return;
    state.currentAnswer = ans;
    const q = state.questions[state.idx];

    $$('.ans-btn').forEach(b => b.disabled = true);
    const chosen = document.querySelector('.ans-btn[data-answer="' + ans + '"]');
    if (chosen) chosen.classList.add('chosen');

    if (window.Sound) ans === 'yes' ? Sound.yes() : Sound.no();

    if (window.burstParticles && chosen) {
      const rect = chosen.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const color = ans === 'yes' ? 'rgba(110,242,200,ALPHA)' : 'rgba(255,77,141,ALPHA)';
      window.burstParticles(cx, cy, color);
    }

    const r = $('#reaction');
    r.classList.toggle('no', ans === 'no');
    r.classList.add('show');
    $('#rtag').textContent = ans === 'yes' ? 'YES REACTION 💯' : 'NO REACTION 😐';
    $('#reactionText').textContent = ans === 'yes' ? q.yes_reaction : q.no_reaction;

    if (ans === 'yes') state.yesCount++; else state.noCount++;
    
    // Save answer to backend
    fetch('/api/answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: state.user.email, question_id: q.id, answer: ans })
    }).catch(console.error);

    $('#nextBtn').classList.add('show');
  }

  $$('.ans-btn').forEach(b => b.addEventListener('click', () => pickAnswer(b.dataset.answer)));

  $('#nextBtn')?.addEventListener('click', () => {
    if (window.Sound) Sound.next();
    state.idx++;
    if (state.idx >= state.questions.length) showResult();
    else renderQuestion();
  });

  function showResult(){
    $('#qBar').style.width = '100%';
    const total = state.yesCount + state.noCount || 1;
    const ratio = state.yesCount / total;
    let verdict, roastPool;

    if (ratio >= 0.9) { verdict = "Bhai, tum har cheez me 'YES' bolte ho. Zara socho bhi liya karo 😅"; roastPool = VERDICT_ROASTS.yesMachine; }
    else if (ratio >= 0.65) { verdict = 'Optimist ho — thoda zyada hi. Duniya utni pyaari nahi hai 🌚'; roastPool = VERDICT_ROASTS.optimist; }
    else if (ratio > 0.35) { verdict = 'Balanced. Kabhi YES, kabhi NO. Tum ek stable insaan ho. Rare 🧬'; roastPool = VERDICT_ROASTS.balanced; }
    else if (ratio > 0.1) { verdict = 'Thoda negative ho, but honest. Respect 🫡'; roastPool = VERDICT_ROASTS.pessimist; }
    else { verdict = 'Har cheez me NO?! Kaun dukh de raha hai tumhe? 💔'; roastPool = VERDICT_ROASTS.noMachine; }

    $('#dYes').textContent = state.yesCount;
    $('#dNo').textContent = state.noCount;
    $('#verdict').textContent = verdict;
    $('#roastLine').textContent = '👉 ' + rand(roastPool);
    $('#resultHeader').textContent = rand(RESULT_HEADERS);

    if (window.Sound) Sound.result();
    confettiBurst();
    showScreen('result');
  }

  function confettiBurst(){
    const colors = ['#3fe0ff','#3d7bff','#6ef2c8','#ff4d8d','#a06bff','#ffd700'];
    for (let i = 0; i < 40; i++) {
      const c = document.createElement('div');
      c.className = 'confetti';
      c.style.left = (Math.random() * 100) + 'vw';
      c.style.background = colors[Math.floor(Math.random() * colors.length)];
      c.style.animationDelay = (Math.random() * 0.6) + 's';
      c.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 3200);
    }
  }

  /* ==================== FEEDBACK ==================== */
  $('#toFeedback')?.addEventListener('click', () => {
    state.rating = 0;
    $$('.rate').forEach(b => b.classList.remove('on'));
    $('#fbComment').value = '';
    $('#fbMsg').classList.remove('show');
    showScreen('feedback');
  });

  $('#stars')?.addEventListener('click', e => {
    const b = e.target.closest('.rate');
    if (!b) return;
    $$('.rate').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
    state.rating = Number(b.dataset.r);
    if (window.Sound) Sound.next();
  });

  $('#fbSubmit')?.addEventListener('click', async () => {
    const msg = $('#fbMsg');
    if (!state.rating) return toast(msg, 'Ek emoji select karo bhai, rating chahiye 🙂');

    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: state.user.email,
          rating: state.rating,
          comment: $('#fbComment').value.trim().slice(0, 400)
        })
      });
      $('#doneLine').textContent = rand(DONE_LINES);
      showScreen('done');
    } catch(e) {
      toast(msg, 'Network error. Try again.');
    }
  });

  /* ==================== PLAY / EXIT ==================== */
  $('#againBtn')?.addEventListener('click', () => showLoading(startQuiz));

  $('#logoutLink')?.addEventListener('click', () => {
    state.user = null; state.questions = []; state.sessionId = null; state.rating = 0;
    $('#entryForm').reset();
    $('#fGender').value = '';
    $$('#genderChips .chip').forEach(c => c.classList.remove('on'));
    $('#entryMsg').classList.remove('show');
    showScreen('entry');
  });

  /* ==================== INIT ==================== */
  loadSettings();
  startTaglineRotation(); startHUDRotation(); startIdleJokes();

  const lastEmail = localStorage.getItem('yesno_last_email');
  if (lastEmail) $('#fEmail').value = lastEmail;
  $('#fEmail')?.addEventListener('change', (e) => {
    localStorage.setItem('yesno_last_email', e.target.value);
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (!$('#screen-quiz').classList.contains('active')) return;
    if (e.key === 'y' || e.key === 'Y' || e.key === '1') pickAnswer('yes');
    if (e.key === 'n' || e.key === 'N' || e.key === '2') pickAnswer('no');
    if (e.key === 'Enter' && $('#nextBtn').classList.contains('show')) $('#nextBtn').click();
  });
})();
