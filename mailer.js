require('dotenv').config();
const nodemailer = require('nodemailer');

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

async function sendAdminNotification(entry) {
  const transporter = createTransport();
  await transporter.sendMail({
    from: `"${process.env.FROM_NAME || 'Arts House Maadid'}" <${process.env.SMTP_USER}>`,
    to: process.env.ADMIN_EMAIL,
    subject: 'Nouvelle réservation — Arts House Maadid',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;border:1px solid #c99a4d;border-radius:12px;">
        <h2 style="color:#c99a4d;margin-top:0;">Nouvelle réservation</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#555;">Nom</td>
              <td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:bold;">${entry.nom}</td></tr>
          <tr><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#555;">Téléphone</td>
              <td style="padding:8px 12px;border-bottom:1px solid #eee;">${entry.telephone}</td></tr>
          <tr><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#555;">Email</td>
              <td style="padding:8px 12px;border-bottom:1px solid #eee;">${entry.email}</td></tr>
          <tr><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#555;">Personnes</td>
              <td style="padding:8px 12px;border-bottom:1px solid #eee;">${entry.nombre_personnes}</td></tr>
          <tr><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#555;">Date</td>
              <td style="padding:8px 12px;border-bottom:1px solid #eee;">${entry.date}</td></tr>
          <tr><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#555;">Expérience</td>
              <td style="padding:8px 12px;border-bottom:1px solid #eee;">${entry.experience}</td></tr>
          ${entry.message ? `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#555;">Message</td>
              <td style="padding:8px 12px;border-bottom:1px solid #eee;">${entry.message}</td></tr>` : ''}
        </table>
        <p style="color:#999;font-size:12px;margin-top:16px;">Administration : http://localhost:3000/admin</p>
      </div>`
  });
}

async function sendClientConfirmation(entry) {
  const transporter = createTransport();
  await transporter.sendMail({
    from: `"${process.env.FROM_NAME || 'Arts House Maadid'}" <${process.env.SMTP_USER}>`,
    to: entry.email,
    subject: 'Confirmation de réservation — Arts House Maadid',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;border:1px solid #c99a4d;border-radius:12px;">
        <h2 style="color:#c99a4d;margin-top:0;">Merci ${entry.nom} !</h2>
        <p>Nous avons bien reçu votre demande de réservation pour <strong>${entry.experience}</strong>.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#555;">Date</td>
              <td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:bold;">${entry.date}</td></tr>
          <tr><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#555;">Personnes</td>
              <td style="padding:8px 12px;border-bottom:1px solid #eee;">${entry.nombre_personnes}</td></tr>
        </table>
        <p>Notre équipe vous contactera très prochainement pour finaliser les détails.</p>
        <p style="color:#999;font-size:13px;">À très bientôt chez <strong>Arts House Maadid</strong> — Erfoud</p>
      </div>`
  });
}

module.exports = { sendAdminNotification, sendClientConfirmation };
