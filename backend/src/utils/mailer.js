const nodemailer = require('nodemailer');

let transporteur = null;
function getTransporteur() {
  if (transporteur) return transporteur;
  if (!process.env.SMTP_HOST) return null;

  transporteur = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  return transporteur;
}

/**
 * Envoie un e-mail. Si aucun serveur SMTP n'est configuré (SMTP_HOST absent
 * du .env), le message est simplement journalisé en console — ça permet de
 * tester tout le flux de réinitialisation en local sans dépendance externe,
 * comme le paiement CinetPay qui a son propre repli en l'absence de clés.
 */
async function envoyerEmail({ to, subject, html, texteLog }) {
  const t = getTransporteur();
  if (!t) {
    console.log('\n[EMAIL — MODE DEV, SMTP non configuré]');
    console.log(`Destinataire : ${to}`);
    console.log(`Sujet : ${subject}`);
    console.log(texteLog || html);
    console.log('[FIN EMAIL]\n');
    return { simule: true };
  }

  await t.sendMail({
    from: process.env.SMTP_FROM || '"Mairie de Porto-Novo" <no-reply@porto-novo.bj>',
    to,
    subject,
    html,
  });
  return { simule: false };
}

module.exports = { envoyerEmail };
