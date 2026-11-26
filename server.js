require('dotenv').config();
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
// Render ke environment variables se link aayega
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/yesno';

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

let db;
let questionsCol, usersCol, answersCol, feedbackCol, settingsCol;

// --- DATABASE CONNECTION & SEEDING ---
async function connectDB() {
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db('yesno'); // Database ka naam

    questionsCol = db.collection('questions');
    usersCol = db.collection('users');
    answersCol = db.collection('answers');
    feedbackCol = db.collection('feedback');
    settingsCol = db.collection('settings');

    console.log('✅ MongoDB Connected Successfully');

    // Seed Questions
    const qCount = await questionsCol.countDocuments();
    if (qCount === 0) {
      const seed = [
        { text: 'Kya aapne aaj subah alarm snooze kiya tha?', emoji: '⏰', yes_reaction: 'Haha classic! Snooze button tumhara best friend hai 😴', no_reaction: 'Wow, discipline level 100! Respect 🫡', active: true },
        { text: 'Kya aap phone charge pe lagaye bina so gaye the?', emoji: '🔋', yes_reaction: 'Bhai subah 1% pe uthoge, guaranteed 😭', no_reaction: 'Smart ho. Battery anxiety se bach gaye ⚡', active: true },
        { text: 'Kya aapne kabhi khud se baat ki hai mirror me?', emoji: '🪞', yes_reaction: 'Introvert ho ya actor? 😂 Dono theek hain', no_reaction: 'Itna confident? Impressive 😎', active: true },
        { text: 'Kya aap late night memes dekhte ho?', emoji: '🌙', yes_reaction: 'Sleep schedule: RIP 🪦 Same bro same', no_reaction: 'Tum ek legend ho. Hum toh 3 baje tak jaagte hain 🥲', active: true },
        { text: 'Kya aapne aaj kisi ko ghost kiya hai?', emoji: '👻', yes_reaction: 'Ouch 💀 Karma ko bata dena', no_reaction: 'Tum ek decent insaan ho. Rare 🧬', active: true },
        { text: 'Kya aapke paas 3 se zyada unread chats hain?', emoji: '💬', yes_reaction: 'Inbox 99+ gang represent ✊', no_reaction: 'Tum robot ho kya? 🤖 Teach me master', active: true },
        { text: 'Kya aapne kabhi jhoot bol ke bach nikle ho?', emoji: '🤫', yes_reaction: 'Chhota jhoot, bada dil 😅 We have all been there', no_reaction: 'Sach ke siwa kuch nahi. Saint ho bhai 🙏', active: true },
        { text: 'Kya aapne bina dekhe koi movie skip ki hai?', emoji: '🎬', yes_reaction: 'Time bachaya, bro. No regrets 💯', no_reaction: 'Movie buff ho. Kaunsi movie thi? 🍿', active: true },
        { text: 'Kya aapne kabhi crush ko message karke delete kar diya?', emoji: '💔', yes_reaction: 'Bhai ye toh sabka trauma hai 😭 Same pinch', no_reaction: 'Tum toh seedha bhej dete ho. Confidence +100 🚀', active: true },
        { text: 'Kya aap aaj bahar nikle bina ghar pe the?', emoji: '🏠', yes_reaction: 'Homebody gang 💪 Cozy vibes only', no_reaction: 'Bahubali ho. Vitamin D mil gaya 🌞', active: true }
      ];
      await questionsCol.insertMany(seed);
      console.log('✅ Default questions inserted');
    }

    // Seed Settings
    const sCount = await settingsCol.countDocuments();
    if (sCount === 0) {
      await settingsCol.insertMany([
        { key: 'siteName', value: 'YES / NO' },
        { key: 'tagline', value: '10 random sawaal. Sirf YES ya NO. Koi escape nahi. 😈' },
        { key: 'questionsPerQuiz', value: '10' }
      ]);
      console.log('✅ Default settings inserted');
    }
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
  }
}

connectDB();

// --- PUBLIC APIs ---
app.get('/api/settings', async (req, res) => {
  try {
    const rows = await settingsCol.find().toArray();
    const settings = {};
    rows.forEach(r => settings[r.key] = r.value);
    res.json(settings);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/questions', async (req, res) => {
  try {
    const rows = await questionsCol.find({ active: true }).toArray();
    // Convert _id to id for frontend
    res.json(rows.map(r => ({ ...r, id: r._id.toString() })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/users', async (req, res) => {
  try {
    const { name, email, age, gender } = req.body;
    const existing = await usersCol.findOne({ email });
    if (existing) {
      if (existing.is_banned) return res.status(403).json({ error: 'Bhai tum ban ho. Kya kiya tha? 🤨' });
      await usersCol.updateOne({ email }, { $set: { name, age, gender } });
    } else {
      await usersCol.insertOne({ name, email, age, gender, is_banned: false, created_at: new Date() });
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/answers', async (req, res) => {
  try {
    const { email, question_id, answer } = req.body;
    await answersCol.insertOne({ email, question_id, answer, created_at: new Date() });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/feedback', async (req, res) => {
  try {
    const { email, rating, comment } = req.body;
    await feedbackCol.insertOne({ email, rating, comment, created_at: new Date() });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
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

app.get('/api/admin/stats', async (req, res) => {
  try {
    const users = await usersCol.countDocuments();
    const questions = await questionsCol.countDocuments();
    const answers = await answersCol.countDocuments();
    const feedback = await feedbackCol.countDocuments();
    
    const fbDocs = await feedbackCol.find({ rating: { $exists: true } }).toArray();
    const avgRating = fbDocs.length ? (fbDocs.reduce((s, f) => s + f.rating, 0) / fbDocs.length).toFixed(1) : '0.0';

    res.json({ users, questions, answers, feedback, avgRating });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/questions', async (req, res) => {
  try {
    const rows = await questionsCol.find().toArray();
    res.json(rows.map(r => ({ ...r, id: r._id.toString() })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/questions', async (req, res) => {
  try {
    const { text, emoji, yes_reaction, no_reaction } = req.body;
    await questionsCol.insertOne({ text, emoji, yes_reaction, no_reaction, active: true });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/questions/:id', async (req, res) => {
  try {
    const { text, emoji, yes_reaction, no_reaction } = req.body;
    await questionsCol.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { text, emoji, yes_reaction, no_reaction } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/questions/:id', async (req, res) => {
  try {
    await questionsCol.deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/users', async (req, res) => {
  try {
    const rows = await usersCol.find().sort({ created_at: -1 }).toArray();
    res.json(rows.map(r => ({ ...r, id: r._id.toString() })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/admin/users/:id/ban', async (req, res) => {
  try {
    const user = await usersCol.findOne({ _id: new ObjectId(req.params.id) });
    if (!user) return res.status(404).json({ error: 'User not found' });
    await usersCol.updateOne({ _id: new ObjectId(req.params.id) }, { $set: { is_banned: !user.is_banned } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/feedback', async (req, res) => {
  try {
    const rows = await feedbackCol.find().sort({ created_at: -1 }).toArray();
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/settings', async (req, res) => {
  try {
    const { siteName, tagline, questionsPerQuiz } = req.body;
    const updates = [];
    if (siteName) updates.push({ updateOne: { filter: { key: 'siteName' }, update: { $set: { value: siteName } }, upsert: true } });
    if (tagline) updates.push({ updateOne: { filter: { key: 'tagline' }, update: { $set: { value: tagline } }, upsert: true } });
    if (questionsPerQuiz) updates.push({ updateOne: { filter: { key: 'questionsPerQuiz' }, update: { $set: { value: questionsPerQuiz.toString() } }, upsert: true } });
    
    if (updates.length) await settingsCol.bulkWrite(updates);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Serve Frontend Pages
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
