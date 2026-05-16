require('dotenv').config();
const nodemailer = require('nodemailer');

async function test() {
  console.log('→ Configuration lue depuis .env :');
  console.log('  HOST :', process.env.SMTP_HOST);
  console.log('  PORT :', process.env.SMTP_PORT);
  console.log('  SECURE :', process.env.SMTP_SECURE);
  console.log('  USER :', process.env.SMTP_USER);
  console.log('  PASS :', process.env.SMTP_PASS ? '✓ présent (' + process.env.SMTP_PASS.length + ' car.)' : '✗ MANQUANT');
  console.log('  ADMIN :', process.env.ADMIN_EMAIL);
  console.log();

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  try {
    console.log('→ Vérification de la connexion SMTP...');
    await transporter.verify();
    console.log('✓ Connexion SMTP établie avec succès !');

    console.log('→ Envoi d\'un email de test à', process.env.ADMIN_EMAIL);
    const info = await transporter.sendMail({
      from: `"Test Arts House Maadid" <${process.env.SMTP_USER}>`,
      to: process.env.ADMIN_EMAIL,
      subject: 'Test — Arts House Maadid',
      html: '<p>Email de test. Si vous lisez ceci, Nodemailer fonctionne !</p>'
    });
    console.log('✓ Email envoyé ! Message ID:', info.messageId);
  } catch (err) {
    console.error('✗ ERREUR :');
    console.error('  Code:', err.code);
    console.error('  Message:', err.message);
    console.error('  Réponse SMTP:', err.response);
    if (err.code === 'EAUTH') {
      console.error();
      console.error('=> Cause probable : mot de passe d\'application invalide.');
      console.error('=> Générez-en un nouveau dans votre compte Google.');
    }
    if (err.code === 'ESOCKET') {
      console.error();
      console.error('=> Cause probable : port ou host incorrect, ou connexion bloquée.');
    }
  }
}

test();
