const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { Resend } = require("resend");
const { messages } = require("../utils/messages.js");
const prisma = require("@prisma/client");
const jwtSecret = process.env.JWT_SECRET || 'tu_secreto_compartido';

const resend = new Resend("re_LdSKJUzC_4CZcFGADb2CvsUtYCaW7QBU5");

const prismaDB = new prisma.PrismaClient();
const router = express.Router();

async function findByToken(token) {
  return prismaDB.passwordRecovery.findUnique({
    where: {
      token,
    },
    include: {
      user: true,
    },
  });
}

async function deleteByToken(token) {
  return prismaDB.passwordRecovery.delete({
    where: {
      token,
    },
  });
}

// Middleware para extraer el token de la URL y pasarlo como encabezado en la solicitud
router.use((req, res, next) => {
  const token = req.query.token;
  if (token) {
    req.headers.token = token;
  }
  next();
});

// Solicitar restablecimiento de contraseña
router.post("/request-reset", async (req, res) => {
  try {
    const { email } = req.body; 

    if (!email ) {
      return res.status(400).json({ message: messages.error.needProps });
    }

    // Buscar al usuario por su email
    const user = await prismaDB.user.findUnique({
      where: {
        email: email,
      },
    });

    if (!user) {
      return res.status(404).json({ message: messages.error.userNotFound });
    }

    // Generar un token de restablecimiento
    const resetToken = crypto.randomBytes(20).toString("hex");
    const expiration = new Date();
    expiration.setHours(expiration.getHours() + 1); // Token válido por 1 hora

    // Almacenar el token en la base de datos utilizando Prisma
    await prismaDB.passwordRecovery.create({
      data: {
        userId: user.id,
        token: resetToken,
        expiration: expiration,
      },
    });

    const tokenData = {
      email: user.email,
      userId: user.id, // Usar directamente user.id
    };

    const token = jwt.sign({ data: tokenData }, jwtSecret, {
      expiresIn: 86400,
    });

    const forgetUrl = `http://localhost:3000/change-password?token=${token}`;

    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: 'Cambio de Contraseña',
      html: `
        <div style="padding: 20px; background-color: white; display: grid; justify-items: center;">
          <span style="text-align: center;">Haz click acá para cambiar de contraseña 👇🏻</span>
          <a href=${forgetUrl} style="margin: 10px auto;">
            <button>Cambiar contraseña</button>
          </a>
        </div>
      `,
    });

    res.send(`Correo de restablecimiento enviado a ${email}`);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: messages.error.default, error: err });
  }

});

module.exports = router;