const express = require("express");
const cors = require("cors");

const app = express();

// 🔥 LIBERA QUALQUER ACESSO (IMPORTANTE)
app.use(cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

let dados = [];

// 🔐 LOGIN
app.post("/login", (req, res) => {
    const { user } = req.body;

    if (!user) {
        return res.status(400).json({ erro: "Usuário não informado" });
    }

    res.json({ acesso: "membro" });
});

// 🔥 SALVAR VS
app.post("/vs", (req, res) => {
    const { user, vs } = req.body;

    if (!user || !vs) {
        return res.status(400).json({ erro: "Dados inválidos" });
    }

    const hoje = new Date().toLocaleDateString("pt-BR");

    dados.push({
        usuario: user,
        vs: Number(vs),
        data: hoje
    });

    console.log("📥 Recebido:", user, vs);

    res.json({ status: "ok" });
});

// 🏆 RANKING
app.get("/ranking", (req, res) => {
    const hoje = new Date().toLocaleDateString("pt-BR");

    const ranking = {};

    dados
        .filter(d => d.data === hoje)
        .forEach(d => {
            ranking[d.usuario] = (ranking[d.usuario] || 0) + d.vs;
        });

    const ordenado = Object.entries(ranking)
        .map(([usuario, total]) => ({ usuario, total }))
        .sort((a, b) => b.total - a.total);

    res.json(ordenado);
});

// 🚀 START
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("🔥 API rodando na porta", PORT);
});
