const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.post('/api/reservation/normal', (req, res) => {
  const { nom, telephone, email, nombre_personnes, date, experience, message } = req.body;

  if (!nom || !telephone || !email || !nombre_personnes || !date || !experience) {
    return res.status(400).json({ success: false, error: 'Tous les champs obligatoires doivent être remplis.' });
  }

  const data = db.read();
  const entry = { id: Date.now(), nom, telephone, email, nombre_personnes, date, experience, message: message || '', created_at: new Date().toISOString() };
  data.normales.unshift(entry);
  db.write(data);

  res.json({
    success: true,
    id: entry.id,
    message: 'Réservation normale enregistrée avec succès.',
    whatsapp: `https://wa.me/212643111622?text=${encodeURIComponent(
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
  data.professionnelles.unshift(entry);
  db.write(data);

  res.json({
    success: true,
    id: entry.id,
    message: 'Réservation professionnelle enregistrée avec succès.',
    whatsapp: `https://wa.me/212643111622?text=${encodeURIComponent(
      `Nouvelle réservation PRO :\nAgence: ${agence}\nResponsable: ${responsable}\nTéléphone: ${telephone}\nEmail: ${email}\nType: ${type_groupe}\nVisiteurs: ${nombre_visiteurs}\nDate: ${date}${programme ? `\nProgramme: ${programme}` : ''}`
    )}`
  });
});

app.get('/api/reservations', (req, res) => {
  const data = db.read();
  res.json({ success: true, ...data });
});

app.delete('/api/reservation/:id', (req, res) => {
  const id = Number(req.params.id);
  const data = db.read();
  let found = data.normales.find(e => e.id === id) || data.professionnelles.find(e => e.id === id);
  data.normales = data.normales.filter(e => e.id !== id);
  data.professionnelles = data.professionnelles.filter(e => e.id !== id);
  db.write(data);
  if (found) {
    const nom = found.nom || found.agence || found.responsable || 'Client';
    const tel = found.telephone || '';
    res.json({
      success: true,
      client: nom,
      telephone: tel,
      whatsapp: tel ? `https://wa.me/${tel.replace(/[^0-9]/g,'')}?text=${encodeURIComponent(
        `Bonjour ${nom},\n\nNous vous informons que votre réservation du ${found.date} a été annulée. Désolés pour la gêne occasionnée.\n\nCordialement,\nArts House Maadid`
      )}` : null
    });
  } else {
    res.json({ success: true, client: null });
  }
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
