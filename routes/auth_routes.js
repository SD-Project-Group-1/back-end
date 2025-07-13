const { Router } = require("express");
const { generateSalt, getHashedPassword } = require("../helpers/encryption");
const prisma = require("../config/db");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const router = Router();

// Helper to generate a secure random token
const generateToken = () => crypto.randomBytes(32).toString("hex");

// Configure Nodemailer transporter (placeholder values)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.RESET_EMAIL,
    pass: process.env.RESET_PASSWORD,
  },
});

// POST /auth/request-reset
router.post("/request-reset", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(404).json({ error: "User not found" });

  const token = generateToken();
  const expires = new Date(Date.now() + 3600 * 1000); // 1 hour from now

  await prisma.passwordReset.create({
    data: {
      user_id: user.user_id,
      token,
      expires_at: expires,
      used: false,
    },
  });

  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`; // Remember to update this if necessary, located locally in .env and reiterated in example.env

  await transporter.sendMail({
    to: email,
    subject: "Password Reset Request",
    html: `<p>Click <a href="${resetLink}">here</a> to reset your password.</p>`,
  });

  res.json({ message: "Password reset email sent." });
});

// POST /auth/reset-password
router.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: "Token and new password are required" });

  const resetRecord = await prisma.passwordReset.findUnique({ where: { token } });
  if (!resetRecord || resetRecord.used || resetRecord.expires_at < new Date()) {
    return res.status(400).json({ error: "Invalid or expired token" });
  }

  const salt = generateSalt();
  const hash = getHashedPassword(newPassword, salt);

  await prisma.user.update({
    where: { user_id: resetRecord.user_id },
    data: {
      hash,
      salt,
    },
  });

  await prisma.passwordReset.update({
    where: { token },
    data: { used: true },
  });

  res.json({ message: "Password reset successful" });
});

module.exports = router;
