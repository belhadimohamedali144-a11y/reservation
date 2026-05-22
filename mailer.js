require('dotenv').config();
const nodemailer = require('nodemailer');

const SMTP_USER = process.env.SMTP_USER || 'artshousemaadid@gmail.com';
const SMTP_PASS = process.env.SMTP_PASS || 'pzap frjn wfaj buie';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'artshousemaadid@gmail.com';

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
}

async function sendAdminNotification(entry) {
  const transporter = createTransport();
  await transporter.sendMail({
    from: `"Système de Réservation" <${SMTP_USER}>`,
    to: ADMIN_EMAIL,
    subject: `New Reservation : ${entry.nom || entry.agence || entry.responsable}`,
    html: `
      <h2>New reservation received</h2>
      <p><strong>Name :</strong> ${entry.nom || entry.agence || entry.responsable}</p>
      <p><strong>Email :</strong> ${entry.email}</p>
      <p><strong>Phone :</strong> ${entry.telephone}</p>
      <p><strong>Date :</strong> ${entry.date}</p>
      ${entry.message ? `<p><strong>Message :</strong> ${entry.message}</p>` : ''}`
  });
}

async function sendClientConfirmation(entry) {
  const transporter = createTransport();
  await transporter.sendMail({
    from: `"Arts House Maadid" <${SMTP_USER}>`,
    to: entry.email,
    subject: 'Booking confirmation request',
    html: `
      <h2>Hello ${entry.nom || entry.responsable},</h2>
      <p>We have received your booking request for <strong>${entry.date}</strong>.</p>
      <p>We will get back to you shortly to confirm availability.</p>
      <p>Best regards,<br>Arts House Maadid Team</p>`
  });
}

module.exports = { sendAdminNotification, sendClientConfirmation };
