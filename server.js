const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
require("dotenv").config();

const db = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

// ===============================
// 🔐 MIDDLEWARE DE AUTENTICAÇÃO
// ===============================
function authMiddleware(req, res, next) {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: "Token não fornecido" });
  }

  try {
    const decoded = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido" });
  }
}

// ===============================
// 👤 REGISTRAR USUÁRIO
// ===============================
app.post("/register", async (req, res) => {
  const { username, password, role } = req.body;

  try {
    const hash = await bcrypt.hash(password, 10);

    await db.query(
      "INSERT INTO users (username, password, role) VALUES ($1, $2, $3)",
      [username, hash, role || "user"]
    );

    res.json({ message: "Usuário criado com sucesso" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar usuário", detail: err.message });
  }
});

// ===============================
// 🔐 LOGIN
// ===============================
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await db.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Usuário não encontrado" });
    }

    const user = result.rows[0];

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ error: "Senha incorreta" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: "Erro no login" });
  }
});

// ===============================
// 🔒 ROTA PROTEGIDA (TESTE)
// ===============================
app.get("/dashboard", authMiddleware, async (req, res) => {
  res.json({
    message: "Acesso liberado!",
    user: req.user
  });
});

// ===============================
// 🚀 START SERVER
// ===============================
app.listen(process.env.PORT || 3000, () => {
  console.log("Servidor rodando...");
});
