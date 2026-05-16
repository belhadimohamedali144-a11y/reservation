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

app.get('/api/seed', (req, res) => {
  const data = db.read();
  if (data.admin) {
    return res.json({ success: false, message: 'Un admin existe déjà. Supprimez le champ "admin" du db.json pour recréer.' });
  }
  data.admin = {
    email: 'admin@artshousemaadid.com',
    password: hashPassword('admin123'),
    name: 'Administrateur'
  };
  db.write(data);
  res.json({ success: true, message: 'Admin créé — email: admin@artshousemaadid.com / mdp: admin123' });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email et mot de passe requis.' });
  }
  const data = db.read();
  if (!data.admin) {
    return res.status(503).json({ success: false, error: 'Aucun admin configuré. Appelez GET /api/seed une première fois.' });
  }
  if (email !== data.admin.email || !checkPassword(password, data.admin.password)) {
    return res.status(401).json({ success: false, error: 'Identifiants incorrects.' });
  }
  const token = generateToken({ email: data.admin.email, name: data.admin.name });
  res.json({ success: true, token, name: data.admin.name });
});

/* ============================================================
   ADMIN ROUTES — protégées par JWT
   ============================================================ */

app.get('/api/reservations', authMiddleware, (req, res) => {
  const data = db.read();
  res.json({ success: true, normales: data.normales || [] });
});

app.delete('/api/reservation/:id', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  const data = db.read();
  let found = (data.normales || []).find(e => e.id === id) || (data.professionnelles || []).find(e => e.id === id);
  data.normales = (data.normales || []).filter(e => e.id !== id);
  if (data.professionnelles) data.professionnelles = data.professionnelles.filter(e => e.id !== id);
  db.write(data);
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

app.get('/api/feedback', authMiddleware, (req, res) => {
  const data = db.read();
  res.json({ success: true, data: data.feedback || [] });
});

app.delete('/api/feedback/:id', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  const data = db.read();
  if (data.feedback) data.feedback = data.feedback.filter(e => e.id !== id);
  db.write(data);
  res.json({ success: true });
});

/* ============================================================
   PUBLIC ROUTES — accessibles sans auth (formulaires visiteurs)
   ============================================================ */

app.post('/api/reservation/normal', (req, res) => {
  console.log('=== NOUVELLE RÉSERVATION ===');
  console.log('req.body reçu :', JSON.stringify(req.body, null, 2));
  const { nom, telephone, email, nombre_personnes, date, experience, message } = req.body;
  if (!nom || !telephone || !email || !nombre_personnes || !date || !experience) {
    console.log('✗ Champs manquants :', { nom, telephone, email, nombre_personnes, date, experience });
    return res.status(400).json({ success: false, error: 'Tous les champs obligatoires doivent être remplis.' });
  }
  const data = db.read();
  const entry = { id: Date.now(), nom, telephone, email, nombre_personnes, date, experience, message: message || '', created_at: new Date().toISOString() };
  if (!data.normales) data.normales = [];
  data.normales.unshift(entry);
  db.write(data);

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

app.post('/api/reservation/pro', (req, res) => {
  const { agence, responsable, telephone, email, type_groupe, nombre_visiteurs, date, programme } = req.body;
  if (!agence || !responsable || !telephone || !email || !type_groupe || !nombre_visiteurs || !date) {
    return res.status(400).json({ success: false, error: 'Tous les champs obligatoires doivent être remplis.' });
  }
  const data = db.read();
  const entry = { id: Date.now(), agence, responsable, telephone, email, type_groupe, nombre_visiteurs, date, programme: programme || '', created_at: new Date().toISOString() };
  if (!data.professionnelles) data.professionnelles = [];
  data.professionnelles.unshift(entry);
  db.write(data);

  res.json({
    success: true, id: entry.id,
    message: 'Réservation professionnelle enregistrée avec succès.',
    whatsapp: `https://wa.me/212662191301?text=${encodeURIComponent(
      `Nouvelle réservation PRO :\nAgence: ${agence}\nResponsable: ${responsable}\nTéléphone: ${telephone}\nEmail: ${email}\nType: ${type_groupe}\nVisiteurs: ${nombre_visiteurs}\nDate: ${date}${programme ? `\nProgramme: ${programme}` : ''}`
    )}`
  });
});

app.post('/api/feedback', (req, res) => {
  const { nom, message, note } = req.body;
  if (!nom || !message || !note) {
    return res.status(400).json({ success: false, error: 'Tous les champs sont obligatoires.' });
  }
  const data = db.read();
  if (!data.feedback) data.feedback = [];
  const entry = { id: Date.now(), nom, message, note: parseInt(note), created_at: new Date().toISOString() };
  data.feedback.unshift(entry);
  db.write(data);
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

app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
