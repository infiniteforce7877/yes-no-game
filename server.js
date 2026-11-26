const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Database setup (ye ek 'db.sqlite' file khud bana lega isi folder me)
const db = new Database('db.sqlite');

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // HTML, CSS, JS files serve karne ke liye

// --- DATABASE TABLES SETUP ---
db.exec(`
  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT,
    emoji TEXT,
    yes_reaction TEXT,
    no_reaction TEXT,
    active INTEGER DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    age INTEGER,
    gender TEXT,
    is_banned INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT,
    question_id INTEGER,
    answer TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT,
    rating INTEGER,
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// --- SEED DATA (Agar database khali hai) ---
const qCount = db.prepare('SELECT COUNT(*) as c FROM questions').get().c;
if (qCount === 0) {
  const insert = db.prepare('INSERT INTO questions (text, emoji, yes_reaction, no_reaction) VALUES (?, ?, ?, ?)');
  const seed = [
    ['Kya aapne aaj subah alarm snooze kiya tha?', '⏰', 'Haha classic! Snooze button tumhara best friend hai 😴', 'Wow, discipline level 100! Respect 🫡'],
    ['Kya aap phone charge pe lagaye bina so gaye the?', '🔋', 'Bhai subah 1% pe uthoge, guaranteed 😭', 'Smart ho. Battery anxiety se bach gaye ⚡'],
    ['Kya aapne kabhi khud se baat ki hai mirror me?', '🪞', 'Introvert ho ya actor? 😂 Dono theek hain', 'Itna confident? Impressive 😎'],
    ['Kya aap late night memes dekhte ho?', '🌙', 'Sleep schedule: RIP 🪦 Same bro same', 'Tum ek legend ho. Hum toh 3 baje tak jaagte hain 🥲'],
    ['Kya aapne aaj kisi ko ghost kiya hai?', '👻', 'Ouch 💀 Karma ko bata dena', 'Tum ek decent insaan ho. Rare 🧬'],
    ['Kya aapke paas 3 se zyada unread chats hain?', '💬', 'Inbox 99+ gang represent ✊', 'Tum robot ho kya? 🤖 Teach me master'],
    ['Kya aapne kabhi jhoot bol ke bach nikle ho?', '🤫', 'Chhota jhoot, bada dil 😅 We have all been there', 'Sach ke siwa kuch nahi. Saint ho bhai 🙏'],
    ['Kya aapne bina dekhe koi movie skip ki hai?', '🎬', 'Time bachaya, bro. No regrets 💯', 'Movie buff ho. Kaunsi movie thi? 🍿'],
    ['Kya aapne kabhi crush ko message karke delete kar diya?', '💔', 'Bhai ye toh sabka trauma hai 😭 Same pinch', 'Tum toh seedha bhej dete ho. Confidence +100 🚀'],
    ['Kya aap aaj bahar nikle bina ghar pe the?', '🏠', 'Homebody gang 💪 Cozy vibes only', 'Bahubali ho. Vitamin D mil gaya 🌞']
  ];
  const insertMany = db.transaction((qs) => { for (const q of qs) insert.run(q); });
  insertMany(seed);
}

if (db.prepare('SELECT COUNT(*) as c FROM settings').get().c === 0) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('siteName', 'YES / NO');
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('tagline', '10 random sawaal. Sirf YES ya NO. Koi escape nahi. 😈');
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('questionsPerQuiz', '10');
}

// --- PUBLIC APIs ---
app.get('/api/settings', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  rows.forEach(r => settings[r.key] = r.value);
  res.json(settings);
});

app.get('/api/questions', (req, res) => {
  const rows = db.prepare('SELECT * FROM questions WHERE active = 1').all();
  res.json(rows);
});

app.post('/api/users', (req, res) => {
  const { name, email, age, gender } = req.body;
  const existing = db.prepare('SELECT * FROM users WHERE email=?').get(email);
  if (existing) {
    if (existing.is_banned) return res.status(403).json({ error: 'Bhai tum ban ho. Kya kiya tha? 🤨' });
    db.prepare('UPDATE users SET name=?, age=?, gender=? WHERE email=?').run(name, age, gender, email);
  } else {
    db.prepare('INSERT INTO users (name, email, age, gender) VALUES (?, ?, ?, ?)').run(name, email, age, gender);
  }
  res.json({ success: true });
});

app.post('/api/answers', (req, res) => {
  const { email, question_id, answer } = req.body;
  db.prepare('INSERT INTO answers (email, question_id, answer) VALUES (?, ?, ?)').run(email, question_id, answer);
  res.json({ success: true });
});

app.post('/api/feedback', (req, res) => {
  const { email, rating, comment } = req.body;
  db.prepare('INSERT INTO feedback (email, rating, comment) VALUES (?, ?, ?)').run(email, rating, comment);
  res.json({ success: true });
});

// --- ADMIN APIs ---
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'GOKU444' && password === 'GOKU444') {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.get('/api/admin/stats', (req, res) => {
  const users = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const questions = db.prepare('SELECT COUNT(*) as c FROM questions').get().c;
  const feedback = db.prepare('SELECT COUNT(*) as c FROM feedback').get().c;
  const answers = db.prepare('SELECT COUNT(*) as c FROM answers').get().c;
  const avgRating = db.prepare('SELECT AVG(rating) as avg FROM feedback').get().avg || 0;
  res.json({ users, questions, answers, feedback, avgRating: Number(avgRating).toFixed(1) });
});

app.get('/api/admin/questions', (req, res) => {
  res.json(db.prepare('SELECT * FROM questions').all());
});

app.post('/api/admin/questions', (req, res) => {
  const { text, emoji, yes_reaction, no_reaction } = req.body;
  db.prepare('INSERT INTO questions (text, emoji, yes_reaction, no_reaction) VALUES (?, ?, ?, ?)').run(text, emoji, yes_reaction, no_reaction);
  res.json({ success: true });
});

app.put('/api/admin/questions/:id', (req, res) => {
  const { text, emoji, yes_reaction, no_reaction } = req.body;
  db.prepare('UPDATE questions SET text=?, emoji=?, yes_reaction=?, no_reaction=? WHERE id=?').run(text, emoji, yes_reaction, no_reaction, req.params.id);
  res.json({ success: true });
});

app.delete('/api/admin/questions/:id', (req, res) => {
  db.prepare('DELETE FROM questions WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

app.get('/api/admin/users', (req, res) => {
  res.json(db.prepare('SELECT * FROM users ORDER BY id DESC').all());
});

app.patch('/api/admin/users/:id/ban', (req, res) => {
  const user = db.prepare('SELECT is_banned FROM users WHERE id=?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  db.prepare('UPDATE users SET is_banned=? WHERE id=?').run(user.is_banned ? 0 : 1, req.params.id);
  res.json({ success: true });
});

app.get('/api/admin/feedback', (req, res) => {
  res.json(db.prepare('SELECT * FROM feedback ORDER BY id DESC').all());
});

app.post('/api/settings', (req, res) => {
  const { siteName, tagline, questionsPerQuiz } = req.body;
  const update = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  if (siteName) update.run('siteName', siteName);
  if (tagline) update.run('tagline', tagline);
  if (questionsPerQuiz) update.run('questionsPerQuiz', questionsPerQuiz);
  res.json({ success: true });
});

// Serve Frontend Pages
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
