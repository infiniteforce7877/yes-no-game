(function(){
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  const state = {
    user: null, questions: [], idx: 0,
    sessionId: null, yesCount: 0, noCount: 0,
    rating: 0, currentAnswer: null, idleTimer: null,
    settings: { siteName: 'YES / NO', tagline: '', questionsPerQuiz: 10 }
  };

  /* ==================== FUNNY CONTENT ==================== */
  const TAGLINES = [
    '10 sawaal. Sirf YES ya NO. Koi escape nahi. 😈', 'Dimag ka dahi karne wala show. Bina ticket ke. 🎟️',
    'Sach bolna. Nahi to AI tumhe roast karega. 🔥', 'Chai le lo, yeh lamba chalega. ☕',
    'Sirf 2 option. Zyada mat socho. 🤔', 'Aaj tumhe khud se milwaate hain. 😌',
    'Dil se jawab do, warna AI naraz ho jayega. 😤', 'Tumhara sach samne aane wala hai. Taiyaar ho? 🔮'
  ];
  const EYEBROWS = [
    '⚠ Neural Decision Engine v2.4 (beta)', '🤖 AI is watching you (legally)', '🔥 Roast Mode: ARMED',
    '🎪 Welcome to the Circus', '👀 We already know your answers', '💀 Abhi bhi time hai, back out kar sakte ho', '🧠 Warning: Dimag ka istemal hoga'
  ];
  const LOADING_MESSAGES = [
    'AI ko chai pilayi ja rahi hai... ☕', 'Neural network ko joota pehna rahe hain... 👟',
    'Server ko therapy de rahe hain... 🛋️', 'Database se jokes nikal rahe hain... 😂',
    'Ek chhota sa existential crisis chal raha hai... 😰', 'WiFi se baat kar rahe hain... 📡',
    'Guru ji se aashirwad le rahe hain... 🙏', 'Tumhari kismat check kar rahe hain... 🎲', 'AI ne coffee pi li, ab full energy... ⚡'
  ];
  const LOADING_EMOJIS = ['🤔','😴','🤖','👀','💭','🌀','⏳','🧠','😅','🙃','😬','🎭'];
  const HUD_MESSAGES = [
    'NEURAL LINK ACTIVE','AI AAJ THODA GRUMPY HAI','TRUTH DETECTOR: ON','JHOOTH PAKADNE WALA MODE: ON',
    'DIMAAG KA DAHI: IN PROGRESS','AI JUDGING YOU SILENTLY','BRAIN CELLS: LOADING','PHILOSOPHICAL MODE: ON','MEME DATABASE: CONNECTED','EMOTIONAL SUPPORT: UNAVAILABLE'
  ];
  const PROGRESS_QUIPS = [
    'Chalo shuru karein... 🚀','Ek aur sawaal, ek aur sach 💀','Abhi to party shuru hui hai 🎉','Interesting... bahut interesting 👀',
    'AI tumhe observe kar raha hai 🔍','Adha raasta paar 🏁','Tum toh pro nikle 😎','Last few, dhyan se 📢','Bas thoda aur... 🍿','Aa raha hai result... 💫'
  ];
  const IDLE_JOKES = [
    'Bhai kuch karoge ya bas dekh rahe ho? 👀','Yeh screen tumhari kismat ka intezaar kar rahi hai... ⏳',
    'Bhai, chai leke aao. Hum wait karenge. ☕','AI tumhe yaad kar raha hai (creepy but true). 👻','Aaj ka sadhana: form bharo. 🙏'
  ];
  const AGE_ROASTS = {
    kid:  ['Beta abhi chhote ho, par chalega 😎', 'Itni kam umar me hi itna drama? Respect 🫡'],
    teen: ['Teenage? Hormones + ye quiz = chaos 🔥', 'Abhi toh life shuru hui hai bhai 💪'],
    adult:['Adult ho? Matlab tax bhi bharte ho 💸', 'Working professional? Coffee zaroori hai ☕'],
    wise: ['Umar ho gayi, sach ab tak nahi bola? 😏', 'Experience wale ho, aaj gyaan pel do 🧠']
  };
  const ENTRY_ERRORS = [
    'Gender nahi bataya? Select to karo 🙂','Naam toh daalo bhai, hum stalker nahi hain 😇','Email daalo, asli wala. Fake pe karma lagta hai 💀','Age daalo, warna hum guess karenge (aur galat karenge) 🎲'
  ];
  const DONE_LINES = [
    'Feedback mil gaya. Ab hum sudhrenge. Shayad. 🫡','Tumhara feedback AI ke dil me save ho gaya. Bless you. 💖',
    'Feedback padh liya. Hum ro rahe hain (khushi se ya dukh se, pata nahi) 😭','Tumhare feedback ne humari neend kharab kar di. Thanks. 🛌'
  ];
  const VERDICT_ROASTS = {
    yesMachine: ['Bhai tum YES machine ho. Kya kabhi NO bola hai zindagi me? 😂', 'YES pe YES pe YES. AI bhi sharma gaya. 🙈'],
    optimist: ['Optimist ho, par duniya utni pyaari nahi hai bhai. 🌚', 'Positive vibes, but thoda zyada. Sach se bhaago mat. 🏃'],
    balanced: ['Balanced insaan ho. Rare species. Protect karo. 🧬', 'Kabhi YES, kabhi NO. Tum mature ho bhai. Respect. 🫡'],
    pessimist: ['Thoda negative ho, par honest. Aajkal yahi chalta hai. 🖤', 'Duniya dark hai, tum dark ho. Match ho gaya. 🕶️'],
    noMachine: ['NO NO NO. Bhai kaun dukh de raha hai tumhe? 💔', 'Har cheez me NO. Kya tumhe koi pasand hai? 🤨']
  };
  const RESULT_HEADERS = ['Ho Gaya Bhai 🎉', 'Bas Itna Hi? 😐', 'Aa Gaya Result 📊', 'Sach Samne Hai 👀', 'AI Ne Judge Kar Liya ⚖️', 'Roast Ready Hai 🔥'];

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
      if (!res.ok) throw new Error('Server error');
      state.settings = await res.json();
      const nameEl = $('#siteName');
      if (nameEl) nameEl.textContent = state.settings.siteName || 'YES / NO';
      document.title = (state.settings.siteName || 'YES / NO') + ' — Dimag Ka Dahi';
    } catch(e) { console.error('Settings load failed:', e); }
  }

  /* ==================== ROTATIONS ==================== */
  function startTaglineRotation(){
    const el = $('#siteTagline');
    if (!el) return;
    el.textContent = rand(TAGLINES);
    setInterval(() => {
      el.style.opacity = '0'; el.style.transform = 'translateY(6px)';
      setTimeout(() => {
        el.textContent = rand(TAGLINES);
        el.style.opacity = '1'; el.style.transform = 'translateY(0)';
      }, 280);
    }, 5000);
    const eb = $('#eyebrowText');
    if (eb) setInterval(() => {
      eb.style.opacity = '0';
      setTimeout(() => { eb.textContent = rand(EYEBROWS); eb.style.opacity = '0.85'; }, 250);
    }, 7000);
  }

  function startHUDRotation(){
    const el = $('#hudLive');
    if (!el) return;
    setInterval(() => {
      el.style.opacity = '0';
      setTimeout(() => { el.textContent = rand(HUD_MESSAGES); el.style.opacity = '1'; }, 200);
    }, 4000);
  }

  setInterval(() => {
    const d = new Date(); const p = n => String(n).padStart(2,'0');
    const el = $('#hudClock');
    if (el) el.textContent = p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds());
  }, 1000);

  /* ==================== LOADING ==================== */
  function showLoading(cb){
    const overlay = $('#loadingOverlay');
    const text = $('#loadingText');
    const emoji = $('#loadingEmoji');
    if (!overlay) { if (cb) cb(); return; }
    overlay.classList.add('show');
    let i = 0;
    const interval = setInterval(() => {
      text.textContent = LOADING_MESSAGES[i % LOADING_MESSAGES.length];
      emoji.textContent = rand(LOADING_EMOJIS);
      emoji.style.animation = 'none';
      void emoji.offsetWidth;
      emoji.style.animation = 'loadingBounce 1.2s ease-in-out infinite';
      i++;
    }, 900);
    setTimeout(() => {
      clearInterval(interval);
      overlay.classList.remove('show');
      if (cb) cb();
    }, 2500);
  }

  /* ==================== SOUND ==================== */
  (function(){
    let enabled = localStorage.getItem('soundOn') !== 'false';
    let ctx = null;
    function ensureCtx(){
      if (ctx) return ctx;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC(); return ctx;
    }
    function beep(freq,dur,type,vol){
      if (!enabled) return;
      const c = ensureCtx(); if (!c) return;
      if (c.state === 'suspended') c.resume();
      const o=c.createOscillator(), g=c.createGain();
      o.type=type||'sine';
      o.frequency.setValueAtTime(freq,c.currentTime);
      g.gain.setValueAtTime(vol||.15,c.currentTime);
      g.gain.exponentialRampToValueAtTime(.001,c.currentTime+dur);
      o.connect(g).connect(c.destination);
      o.start(); o.stop(c.currentTime+dur);
    }
    window.Sound = {
      yes(){ beep(523,.08,'sine',.18); setTimeout(()=>beep(784,.15,'sine',.18),80); },
      no(){ beep(220,.15,'square',.14); setTimeout(()=>beep(165,.2,'square',.14),100); },
      next(){ beep(660,.06,'triangle',.1); },
      result(){
        beep(523,.1,'sine',.18);
        setTimeout(()=>beep(659,.1,'sine',.18),100);
        setTimeout(()=>beep(784,.1,'sine',.18),200);
        setTimeout(()=>beep(1046,.3,'sine',.2),300);
      },
      fail(){ beep(200,.2,'sawtooth',.15); setTimeout(()=>beep(150,.3,'sawtooth',.15),150); }
    };
    const enable = () => {
      ensureCtx();
      document.removeEventListener('click', enable);
      document.removeEventListener('keydown', enable);
    };
    document.addEventListener('click', enable);
    document.addEventListener('keydown', enable);
  })();

  /* ==================== IDLE JOKES ==================== */
  function startIdleJokes(){
    const resetTimer = () => {
      clearTimeout(state.idleTimer);
      state.idleTimer = setTimeout(() => {
        if ($('#screen-entry').classList.contains('active') && !$('#entryMsg').classList.contains('show')) {
          toast($('#entryMsg'), rand(IDLE_JOKES));
        }
      }, 25000);
    };
    ['click','keydown','input','scroll'].forEach(ev => document.addEventListener(ev, resetTimer, { passive: true }));
    resetTimer();
  }

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

    if (!gender) return toast(msg, ENTRY_ERRORS[0]);

    const name = $('#fName').value.trim();
    const email = $('#fEmail').value.trim();
    const age = Number($('#fAge').value);

    if (!name || name.length < 2) return toast(msg, ENTRY_ERRORS[1]);
    if (!email) return toast(msg, ENTRY_ERRORS[2]);
    if (!age || age < 5 || age > 120) return toast(msg, ENTRY_ERRORS[3]);

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
      
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      state.user = user;
      localStorage.setItem('yesno_last_email', user.email);

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
      if (!res.ok) throw new Error('Server failed to load questions');
      const active = await res.json();

      if (active.length < limit) {
        toast($('#entryMsg'), '😬 DB me kam sawaal hain (chahiye ' + limit + ')');
        showScreen('entry');
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
      toast($('#entryMsg'), e.message);
      showScreen('entry');
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
      window.burstParticles(cx, cy, ans === 'yes' ? 'rgba(110,242,200,ALPHA)' : 'rgba(255,77,141,ALPHA)');
    }

    const r = $('#reaction');
    r.classList.toggle('no', ans === 'no');
    r.classList.add('show');
    $('#rtag').textContent = ans === 'yes' ? 'YES REACTION 💯' : 'NO REACTION 😐';
    $('#reactionText').textContent = ans === 'yes' ? q.yes_reaction : q.no_reaction;

    if (ans === 'yes') state.yesCount++; else state.noCount++;
    
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
        body: JSON.stringify({ email: state.user.email, rating: state.rating, comment: $('#fbComment').value.trim() })
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
})();
