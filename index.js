const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// =======================
// USUÁRIO FIXO (LOGIN)
// =======================
const USER_FIXO = {
  username: "Jailton",
  password: "1234"
};

// =======================
// REGISTER (SIMULADO)
// =======================
let usuarios = [];

// ROTA REGISTER
app.post("/register", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Usuário e senha obrigatórios" });
  }

  const existe = usuarios.find(u => u.username === username);

  if (existe || username === USER_FIXO.username) {
    return res.status(400).json({ message: "Usuário já existe" });
  }

  usuarios.push({ username, password });

  return res.json({ message: "Usuário criado com sucesso" });
});

// =======================
// LOGIN
// =======================
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  // usuário fixo (Jailton)
  if (
    username === USER_FIXO.username &&
    password === USER_FIXO.password
  ) {
    return res.json({
      message: "Login realizado com sucesso",
      user: username
    });
  }

  // usuários cadastrados via register
  const user = usuarios.find(
    u => u.username === username && u.password === password
  );

  if (user) {
    return res.json({
      message: "Login realizado com sucesso",
      user: username
    });
  }

  return res.status(401).json({ message: "Usuário ou senha inválidos" });
});

// =======================
// START SERVER
// =======================
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
