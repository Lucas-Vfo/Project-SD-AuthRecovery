const express = require('express');
const db = require('../db');
const dbRecovery = require('../dbrecovery');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
require('dotenv').config();

const router = express.Router();

const transporter = nodemailer.createTransport({
  host: 'multiverse.cl',
  port: 465,
  secure: true,
  auth: {
    user: process.env.SENDER_EMAIL,
    pass: process.env.SENDER_EMAIL_PASS,
  },
});

// Solicitar restablecimiento de contraseña
router.post('/request-reset', (req, res) => {
  const { email } = req.body;
  // Buscar al usuario por su email
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) {
      return res.status(500).send('Error en el servidor');
    }
    if (!user) {
      return res.status(404).send('Usuario no encontrado');
    }

    // Generar un token de restablecimiento
    const resetToken = crypto.randomBytes(20).toString('hex');
    const expiration = new Date();
    expiration.setHours(expiration.getHours() + 1); // Token válido por 1 hora

    // Almacenar el token en la base de datos
    dbRecovery.run(
      'INSERT INTO password_resets (userId, token, expiration) VALUES (?, ?, ?)',
      [user.id, resetToken, expiration],
      (err) => {
        if (err) {
          return res.status(500).send('Error al guardar el token de restablecimiento');
        }

        // Enviar correo con el token
        const mailOptions = {
          from: process.env.SENDER_EMAIL,
          to: user.email,
          subject: 'Restablecimiento de contraseña',
          text: 'Tu token de restablecimiento es: ' + resetToken,
        };

        transporter.sendMail(mailOptions, (err, info) => {
          if (err) {
            return res.status(500).send('Error al enviar correo electrónico' + err);
          }
          res.send('Correo de restablecimiento enviado a ' + email);
        });
      }
    );
  });
});

// Restablecer la contraseña
router.post('/reset', (req, res) => {
  const { token, newPassword } = req.body;
  // Verificar el token y la fecha de expiración
  dbRecovery.get('SELECT * FROM password_resets WHERE token = ?', [token], async (err, reset) => {
    if (err || !reset) {
      return res.status(400).send('Token inválido o expirado');
    }
    if (new Date() > new Date(reset.expiration)) {
      return res.status(400).send('Token expirado');
    }

    // Si el token es válido, permitir al usuario establecer una nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, reset.userId], (err) => {
      if (err) {
        return res.status(500).send('Error al actualizar la contraseña');
      }
      res.send('Contraseña actualizada con éxito');
    });
  });
});

module.exports = router;