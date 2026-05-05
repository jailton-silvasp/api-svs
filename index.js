const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

let dados = [];

// =========================================
// 🔐 LOGIN LÍDERES
// =========================================
const lideres = ["Jailton", "『PRΞDΛDΩR』"];

app.post("/login", (req, res) => {
    const { user } = req.body;

    if (lideres.includes(user)) {
        return res.json({ acesso: true });
    }

    res.json({ acesso: false });
});


// =========================================
// 🔥 REGISTRO VS
// =========================================
app.post("/vs", (req, res) => {
    const usuario = req.body.user || req.body.usuario;
    const vs = Number(req.body.vs);

    if (!usuario || !vs) {
        return res.status(400).json({ erro: "Dados inválidos" });
    }

    const hoje = new Date().toLocaleDateString("pt-BR");

    dados.push({
        usuario,
        vs,
        data: hoje,
        timestamp: Date.now()
    });

    console.log("🔥 Novo registro:", usuario, vs);

    res.json({ status: "ok" });
});


// =========================================
// 📅 HISTÓRICO POR PLAYER
// =========================================
app.get("/historico", (req, res) => {
    const { usuario } = req.query;

    if (!usuario) {
        return res.json([]);
    }

    const historico = dados
        .filter(d => d.usuario === usuario)
        .sort((a, b) => a.timestamp - b.timestamp);

    res.json(historico);
});


// =========================================
// 🏆 RANKING DIÁRIO
// =========================================
app.get("/ranking", (req, res) => {
    const hoje = new Date().toLocaleDateString("pt-BR");

    const ranking = {};

    dados
        .filter(d => d.data === hoje)
        .forEach(d => {
            ranking[d.usuario] = (ranking[d.usuario] || 0) + d.vs;
        });

    const resultado = Object.entries(ranking)
        .map(([usuario, total]) => ({ usuario, total }))
        .sort((a, b) => b.total - a.total);

    res.json(resultado);
});


// =========================================
// 🏆 RANKING SEMANAL
// =========================================
app.get("/ranking-semanal", (req, res) => {

    const ranking = {};

    dados.forEach(d => {
        ranking[d.usuario] = (ranking[d.usuario] || 0) + d.vs;
    });

    const resultado = Object.entries(ranking)
        .map(([usuario, total]) => ({ usuario, total }))
        .sort((a, b) => b.total - a.total);

    res.json(resultado);
});


// =========================================
// 🥇 MVP AUTOMÁTICO
// =========================================
app.get("/mvp", (req, res) => {

    const ranking = {};

    dados.forEach(d => {
        ranking[d.usuario] = (ranking[d.usuario] || 0) + d.vs;
    });

    const top = Object.entries(ranking)
        .map(([usuario, total]) => ({ usuario, total }))
        .sort((a, b) => b.total - a.total)[0];

    res.json(top || {});
});


// =========================================
// 🚀 START
// =========================================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("🔥 API GOD+ rodando");
});
