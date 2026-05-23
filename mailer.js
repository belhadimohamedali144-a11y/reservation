require('dotenv').config();
const nodemailer = require('nodemailer');

const SMTP_USER = process.env.SMTP_USER || 'artshousemaadid@gmail.com';
const SMTP_PASS = process.env.SMTP_PASS || '';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'artshousemaadid@gmail.com';
const FROM_NAME = process.env.FROM_NAME || 'Arts House Maadid';

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    pool: true,
    maxConnections: 1,
    rateDelta: 2000,
    rateLimit: 5,
    tls: { rejectUnauthorized: false }
  });
}

function wrapHtml(bodyHtml, preheader) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<style>
body{margin:0;padding:0;background-color:#f4f1ec;font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#2c1810}
.wrap{max-width:560px;margin:0 auto;padding:20px}
.box{background:#ffffff;border-radius:8px;padding:32px;border:1px solid #e0d5c7}
.hdr{text-align:center;padding-bottom:20px;border-bottom:2px solid #c99a4d;margin-bottom:24px}
.hdr h1{font-size:22px;color:#0d0a06;margin:0;letter-spacing:1px}
.hdr span{color:#c99a4d;font-size:14px}
.ftr{text-align:center;padding-top:20px;font-size:12px;color:#9a8a70;border-top:1px solid #e0d5c7;margin-top:24px}
.ftr a{color:#c99a4d;text-decoration:none}
</style>
</head>
<body>
<div class="wrap">
<div class="box">
<div class="hdr">
<h1>Arts House Maadid</h1>
<span>— Moroccan Art Gallery —</span>
</div>
${bodyHtml}
<div class="ftr">
<p>Arts House Maadid &bull; Marrakech, Morocco</p>
<p><a href="mailto:${escapeHtml(ADMIN_EMAIL)}">${escapeHtml(ADMIN_EMAIL)}</a></p>
</div>
</div>
</div>
</body>
</html>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function textFooter() {
  return `\n\n---\nArts House Maadid\nMarrakech, Morocco\n${ADMIN_EMAIL}`;
}

async function sendAdminNotification(entry) {
  const transporter = createTransport();
  const name = entry.nom || entry.agence || entry.responsable || 'Guest';
  const email = entry.email || '';
  const phone = entry.telephone || '';
  const date = entry.date || '';
  const message = entry.message || '';
  const guests = entry.nombre_personnes || '';
  const type = entry.type_reservation || 'normal';
  const subject = `New ${type} booking - ${name}`;

  const detailRows = [
    ['Name', name],
    ['Email', email],
    ['Phone', phone],
    ['Date', date],
    ['Guests', guests],
    ['Type', type]
  ];

  let htmlBody = `<h2 style="font-size:18px;color:#0d0a06;margin:0 0 16px">New reservation received</h2>
<table cellpadding="6" cellspacing="0" style="width:100%;font-size:14px">`;
  let textBody = 'NEW RESERVATION\n\n';

  for (const [label, value] of detailRows) {
    if (!value) continue;
    htmlBody += `<tr><td style="color:#9a8a70;width:80px;vertical-align:top"><strong>${label}</strong></td><td style="color:#2c1810">${escapeHtml(value)}</td></tr>`;
    textBody += `${label}: ${value}\n`;
  }

  if (message) {
    htmlBody += `<tr><td style="color:#9a8a70;vertical-align:top"><strong>Message</strong></td><td style="color:#2c1810">${escapeHtml(message)}</td></tr>`;
    textBody += `\nMessage:\n${message}\n`;
  }

  htmlBody += '</table>';
  textBody += textFooter();

  await transporter.sendMail({
    from: `"${FROM_NAME}" <${SMTP_USER}>`,
    to: ADMIN_EMAIL,
    replyTo: email || ADMIN_EMAIL,
    subject,
    text: textBody,
    html: wrapHtml(htmlBody, 'New reservation received')
  });
}

async function sendClientConfirmation(entry) {
  const transporter = createTransport();
  const name = entry.nom || entry.responsable || 'there';
  const date = entry.date || '';
  const subject = 'Your booking request - Arts House Maadid';

  const htmlBody = `<h2 style="font-size:18px;color:#0d0a06;margin:0 0 12px">Hello ${escapeHtml(name)},</h2>
<p style="line-height:1.6;margin:0 0 12px;color:#3d2b1a">Thank you for your booking request${date ? ` for <strong>${escapeHtml(date)}</strong>` : ''}.</p>
<p style="line-height:1.6;margin:0 0 12px;color:#3d2b1a">We will review your request and get back to you shortly to confirm availability.</p>
<p style="line-height:1.6;margin:0;color:#3d2b1a">Best regards,<br>Arts House Maadid Team</p>`;

  const textBody = `Hello ${name},

Thank you for your booking request${date ? ` for ${date}` : ''}.

We will review your request and get back to you shortly to confirm availability.

Best regards,
Arts House Maadid Team` + textFooter();

  await transporter.sendMail({
    from: `"${FROM_NAME}" <${SMTP_USER}>`,
    to: entry.email,
    subject,
    text: textBody,
    html: wrapHtml(htmlBody, 'Booking confirmation')
  });
}

module.exports = { sendAdminNotification, sendClientConfirmation };
