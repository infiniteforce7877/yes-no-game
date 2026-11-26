const DB = (() => {
  const KEYS = {
    users: 'yesno_users', questions: 'yesno_questions',
    answers: 'yesno_answers', feedback: 'yesno_feedback', settings: 'yesno_settings'
  };

  const DEFAULT_SETTINGS = {
    siteName: 'YES / NO',
    tagline: '10 random sawaal. Sirf YES ya NO. Koi escape nahi. 😈',
    questionsPerQuiz: 10
  };

  const SEED_QUESTIONS = [
    { id:'q01', text:'Kya aapne aaj subah alarm snooze kiya tha?', emoji:'⏰', yes_reaction:'Haha classic! Snooze button tumhara best friend hai 😴', no_reaction:'Wow, discipline level 100! Respect 🫡' },
    { id:'q02', text:'Kya aap phone charge pe lagaye bina so gaye the?', emoji:'🔋', yes_reaction:'Bhai subah 1% pe uthoge, guaranteed 😭', no_reaction:'Smart ho. Battery anxiety se bach gaye ⚡' },
    { id:'q03', text:'Kya aapne kabhi khud se baat ki hai mirror me?', emoji:'🪞', yes_reaction:'Introvert ho ya actor? 😂 Dono theek hain', no_reaction:'Itna confident? Impressive 😎' },
    { id:'q04', text:'Kya aap late night memes dekhte ho?', emoji:'🌙', yes_reaction:'Sleep schedule: RIP 🪦 Same bro same', no_reaction:'Tum ek legend ho. Hum toh 3 baje tak jaagte hain 🥲' },
    { id:'q05', text:'Kya aapne aaj kisi ko ghost kiya hai?', emoji:'👻', yes_reaction:'Ouch 💀 Karma ko bata dena', no_reaction:'Tum ek decent insaan ho. Rare 🧬' },
    { id:'q06', text:'Kya aapke paas 3 se zyada unread chats hain?', emoji:'💬', yes_reaction:'Inbox 99+ gang represent ✊', no_reaction:'Tum robot ho kya? 🤖 Teach me master' },
    { id:'q07', text:'Kya aapne kabhi jhoot bol ke bach nikle ho?', emoji:'🤫', yes_reaction:'Chhota jhoot, bada dil 😅 We have all been there', no_reaction:'Sach ke siwa kuch nahi. Saint ho bhai 🙏' },
    { id:'q08', text:'Kya aapne bina dekhe koi movie skip ki hai?', emoji:'🎬', yes_reaction:'Time bachaya, bro. No regrets 💯', no_reaction:'Movie buff ho. Kaunsi movie thi? 🍿' },
    { id:'q09', text:'Kya aapne kabhi crush ko message karke delete kar diya?', emoji:'💔', yes_reaction:'Bhai ye toh sabka trauma hai 😭 Same pinch', no_reaction:'Tum toh seedha bhej dete ho. Confidence +100 🚀' },
    { id:'q10', text:'Kya aap aaj bahar nikle bina ghar pe the?', emoji:'🏠', yes_reaction:'Homebody gang 💪 Cozy vibes only', no_reaction:'Bahubali ho. Vitamin D mil gaya 🌞' },
    { id:'q11', text:'Kya aapne kabhi exam me guess kiya aur pass ho gaye?', emoji:'📝', yes_reaction:'Luck 100% 💫 Kismat ka khel', no_reaction:'Padhai se pass hue? Nerd alert 🤓 (respect)' },
    { id:'q12', text:'Kya aapne kabhi WiFi password chupaya hai guests se?', emoji:'📶', yes_reaction:'Guests se WiFi bachana zaroori hai 😂', no_reaction:'Generous host ho. Sabko data do 🙌' },
    { id:'q13', text:'Kya aapko lagta hai AI aapki job le lega?', emoji:'🤖', yes_reaction:'Same fear bro. Upskilling karo 📚', no_reaction:'Confidence dekho! AI bhi tumse darta hai 💪' },
    { id:'q14', text:'Kya aapne kabhi online shopping me regret kiya?', emoji:'🛒', yes_reaction:'Cart me sab kuch, wallet me kuch nahi 😂', no_reaction:'Tum toh disciplined shopper ho. Teach me 🧘' },
    { id:'q15', text:'Kya aapne kabhi selfie lete waqt pose practice ki hai?', emoji:'📸', yes_reaction:'Main character energy 👑 Same bro', no_reaction:'Natural pose master ho. Teach us 🙏' }
  ];

  function read(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (_) { return fallback; }
  }
  function write(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

  function init() {
    if (!localStorage.getItem(KEYS.questions)) write(KEYS.questions, SEED_QUESTIONS);
    if (!localStorage.getItem(KEYS.settings)) write(KEYS.settings, DEFAULT_SETTINGS);
    if (!localStorage.getItem(KEYS.users)) write(KEYS.users, []);
    if (!localStorage.getItem(KEYS.answers)) write(KEYS.answers, []);
    if (!localStorage.getItem(KEYS.feedback)) write(KEYS.feedback, []);
  }

  return {
    init,
    getSettings: () => read(KEYS.settings, DEFAULT_SETTINGS),
    saveSettings: s => write(KEYS.settings, s),
    getQuestions: () => read(KEYS.questions, []),
    saveQuestions: qs => write(KEYS.questions, qs),
    addQuestion(q) {
      const list = this.getQuestions();
      q.id = 'q_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      q.active = true;
      q.created_at = Date.now();
      list.unshift(q);
      this.saveQuestions(list);
      return q;
    },
    updateQuestion(id, patch) {
      const list = this.getQuestions();
      const i = list.findIndex(q => q.id === id);
      if (i >= 0) { list[i] = { ...list[i], ...patch }; this.saveQuestions(list); return list[i]; }
      return null;
    },
    deleteQuestion(id) {
      const list = this.getQuestions().filter(q => q.id !== id);
      this.saveQuestions(list);
    },
    getUsers: () => read(KEYS.users, []),
    findUser: email => read(KEYS.users, []).find(u => u.email.toLowerCase() === email.toLowerCase()),
    upsertUser(user) {
      const list = read(KEYS.users, []);
      const i = list.findIndex(u => u.email.toLowerCase() === user.email.toLowerCase());
      if (i >= 0) list[i] = { ...list[i], ...user, last_login: Date.now() };
      else list.push({ ...user, created_at: Date.now(), last_login: Date.now() });
      write(KEYS.users, list);
    },
    toggleBanUser(email) {
      const list = read(KEYS.users, []);
      const i = list.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
      if (i >= 0) { list[i].is_banned = !list[i].is_banned; write(KEYS.users, list); return list[i]; }
      return null;
    },
    getAnswers: () => read(KEYS.answers, []),
    addAnswer(a) { const list = read(KEYS.answers, []); list.push({ ...a, created_at: Date.now() }); write(KEYS.answers, list); },
    getFeedback: () => read(KEYS.feedback, []),
    addFeedback(f) { const list = read(KEYS.feedback, []); list.push({ ...f, created_at: Date.now() }); write(KEYS.feedback, list); },
    getStats() {
      const answers = read(KEYS.answers, []);
      const feedback = read(KEYS.feedback, []);
      const questions = read(KEYS.questions, []).filter(q => q.active !== false);
      const ratings = feedback.map(f => f.rating).filter(Boolean);
      return {
        users: read(KEYS.users, []).length,
        questions: questions.length,
        answers: answers.length,
        avgRating: ratings.length ? (ratings.reduce((s, x) => s + x, 0) / ratings.length).toFixed(1) : '0.0'
      };
    }
  };
})();

DB.init();
