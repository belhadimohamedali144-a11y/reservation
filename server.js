require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const { hashPassword, checkPassword, generateToken, authMiddleware } = require('./auth');
const { sendAdminNotification, sendClientConfirmation } = require('./mailer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname)));

/* ============================================================
   AUTH — Seed & Login (public)
   ============================================================ */

app.get('/api/seed', async (req, res) => {
  const result = await db.query('SELECT id FROM admin LIMIT 1');
  if (result.rows.length > 0) {
    return res.json({ success: false, message: 'Un admin existe déjà. Supprimez la table admin pour recréer.' });
  }
  await db.query(
    'INSERT INTO admin (email, password, name) VALUES ($1, $2, $3)',
    ['admin@artshousemaadid.com', hashPassword('admin123'), 'Administrateur']
  );
  res.json({ success: true, message: 'Admin créé — email: admin@artshousemaadid.com / mdp: admin123' });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email et mot de passe requis.' });
  }
  const result = await db.query('SELECT * FROM admin WHERE email = $1', [email]);
  const admin = result.rows[0];
  if (!admin) {
    return res.status(503).json({ success: false, error: 'Aucun admin configuré. Appelez GET /api/seed une première fois.' });
  }
  if (!checkPassword(password, admin.password)) {
    return res.status(401).json({ success: false, error: 'Identifiants incorrects.' });
  }
  const token = generateToken({ email: admin.email, name: admin.name });
  res.json({ success: true, token, name: admin.name });
});

/* ============================================================
   ADMIN ROUTES — protégées par JWT
   ============================================================ */

app.get('/api/reservations', authMiddleware, async (req, res) => {
  const result = await db.query("SELECT * FROM reservations WHERE type = 'normale' ORDER BY created_at DESC");
  res.json({ success: true, normales: result.rows });
});

app.delete('/api/reservation/:id', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  const result = await db.query('DELETE FROM reservations WHERE id = $1 RETURNING *', [id]);
  const found = result.rows[0];
  if (found) {
    const nom = found.nom || found.agence || found.responsable || 'Client';
    const tel = found.telephone || '';
    res.json({
      success: true, client: nom, telephone: tel,
      whatsapp: tel ? `https://wa.me/${tel.replace(/[^0-9]/g,'')}?text=${encodeURIComponent(
        `Bonjour ${nom},\n\nNous vous informons que votre réservation du ${found.date} a été annulée. Désolés pour la gêne occasionnée.\n\nCordialement,\nArts House Maadid`
      )}` : null
    });
  } else {
    res.json({ success: true, client: null });
  }
});

app.get('/api/stats', authMiddleware, async (req, res) => {
  try {
    const aujourdhui = new Date().toISOString().split('T')[0];
    const query = "SELECT COUNT(*)::int AS total FROM reservations WHERE created_at::date = $1";
    const result = await db.query(query, [aujourdhui]);
    res.json({ success: true, total: result.rows[0].total, date: aujourdhui });
  } catch (error) {
    console.error("Erreur stats :", error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

app.get('/api/feedback', async (req, res) => {
  const result = await db.query("SELECT * FROM feedback WHERE approved = true ORDER BY created_at DESC");
  res.json({ success: true, data: result.rows });
});

app.get('/api/feedback/admin', authMiddleware, async (req, res) => {
  const result = await db.query("SELECT * FROM feedback ORDER BY created_at DESC");
  res.json({ success: true, data: result.rows });
});

app.put('/api/feedback/:id/approve', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  await db.query('UPDATE feedback SET approved = true WHERE id = $1', [id]);
  res.json({ success: true });
});

app.delete('/api/feedback/:id', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  await db.query('DELETE FROM feedback WHERE id = $1', [id]);
  res.json({ success: true });
});

/* ============================================================
   PUBLIC ROUTES — accessibles sans auth (formulaires visiteurs)
   ============================================================ */

app.post('/api/reservation/normal', async (req, res) => {
  console.log('=== NOUVELLE RÉSERVATION ===');
  console.log('req.body reçu :', JSON.stringify(req.body, null, 2));
  const { nom, telephone, email, nombre_personnes, date, experience, message } = req.body;
  if (!nom || !telephone || !email || !nombre_personnes || !date || !experience) {
    console.log('✗ Champs manquants :', { nom, telephone, email, nombre_personnes, date, experience });
    return res.status(400).json({ success: false, error: 'Tous les champs obligatoires doivent être remplis.' });
  }
  const entry = { id: Date.now(), nom, telephone, email, nombre_personnes, date, experience, message: message || '', created_at: new Date().toISOString() };
  await db.query(
    `INSERT INTO reservations (id, type, nom, telephone, email, nombre_personnes, date, experience, message, created_at)
     VALUES ($1, 'normale', $2, $3, $4, $5, $6, $7, $8, $9)`,
    [entry.id, nom, telephone, email, nombre_personnes, date, experience, entry.message, entry.created_at]
  );

  console.log('✓ Réservation sauvegardée, envoi des emails...');
  sendAdminNotification(entry).then(() => console.log('✓ Email admin envoyé')).catch(err => console.error('✗ Email admin échoué:', err));
  sendClientConfirmation(entry).then(() => console.log('✓ Email client envoyé')).catch(err => console.error('✗ Email client échoué:', err));

  res.json({
    success: true, id: entry.id,
    message: 'Réservation normale enregistrée avec succès.',
    whatsapp: `https://wa.me/212662191301?text=${encodeURIComponent(
      `Nouvelle réservation normale :\nNom: ${nom}\nTéléphone: ${telephone}\nEmail: ${email}\nPersonnes: ${nombre_personnes}\nDate: ${date}\nExpérience: ${experience}${message ? `\nMessage: ${message}` : ''}`
    )}`
  });
});

app.post('/api/reservation/pro', async (req, res) => {
  const { agence, responsable, telephone, email, type_groupe, nombre_visiteurs, date, programme } = req.body;
  if (!agence || !responsable || !telephone || !email || !type_groupe || !nombre_visiteurs || !date) {
    return res.status(400).json({ success: false, error: 'Tous les champs obligatoires doivent être remplis.' });
  }
  const entry = { id: Date.now(), agence, responsable, telephone, email, type_groupe, nombre_visiteurs, date, programme: programme || '', created_at: new Date().toISOString() };
  await db.query(
    `INSERT INTO reservations (id, type, agence, responsable, telephone, email, type_groupe, nombre_visiteurs, date, programme, created_at)
     VALUES ($1, 'professionnelle', $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [entry.id, agence, responsable, telephone, email, type_groupe, nombre_visiteurs, date, entry.programme, entry.created_at]
  );

  res.json({
    success: true, id: entry.id,
    message: 'Réservation professionnelle enregistrée avec succès.',
    whatsapp: `https://wa.me/212662191301?text=${encodeURIComponent(
      `Nouvelle réservation PRO :\nAgence: ${agence}\nResponsable: ${responsable}\nTéléphone: ${telephone}\nEmail: ${email}\nType: ${type_groupe}\nVisiteurs: ${nombre_visiteurs}\nDate: ${date}${programme ? `\nProgramme: ${programme}` : ''}`
    )}`
  });
});

app.post('/api/feedback', async (req, res) => {
  const { nom, message, note } = req.body;
  if (!nom || !message || !note) {
    return res.status(400).json({ success: false, error: 'Tous les champs sont obligatoires.' });
  }
  const entry = { id: Date.now(), nom, message, note: parseInt(note), created_at: new Date().toISOString() };
  await db.query(
    'INSERT INTO feedback (id, nom, message, note, approved, created_at) VALUES ($1, $2, $3, $4, false, $5)',
    [entry.id, nom, message, entry.note, entry.created_at]
  );
  res.json({ success: true, id: entry.id });
});

/* ============================================================
   PAGES
   ============================================================ */

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

db.initDB().catch(err => {
  console.error('⚠ DB init failed:', err.message);
  console.error(' Le site sera servi sans accès base de données.');
}).finally(() => {
  app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
  });
});
