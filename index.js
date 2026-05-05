const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// 🔐 LISTA DE LÍDERES
const lideres = {
    "Jailton": "1234",
    "Predador": "1234"
  };

let dados = [];

// 🔐 LOGIN
app.post("/login", (req, res) => {
    const { usuario, senha } = req.body;

    if (lideres[usuario] && lideres[usuario] === senha) {
        return res.json({ ok: true });
    }

    res.status(401).json({ erro: "Acesso negado" });
});

// 🔥 SALVAR VS
app.post("/vs", (req, res) => {
    const usuario = req.body.user || req.body.usuario;
    const vs = Number(req.body.vs);

    const hoje = new Date().toLocaleDateString("pt-BR");

    if (!usuario || !vs) {
        return res.status(400).send({ erro: "Dados inválidos" });
    }

    dados.push({ usuario, vs, data: hoje });

    res.send({ status: "ok" });
});

// 📅 HISTÓRICO POR DIA
app.get("/historico/:data", (req, res) => {
    const data = req.params.data;

    const filtrado = dados.filter(d => d.data === data);

    res.json(filtrado);
});

// 🏆 RANKING POR DIA
app.get("/ranking/:data", (req, res) => {
    const data = req.params.data;

    const ranking = {};

    dados
        .filter(d => d.data === data)
        .forEach(d => {
            ranking[d.usuario] = (ranking[d.usuario] || 0) + d.vs;
        });

    const ordenado = Object.entries(ranking)
        .map(([usuario, total]) => ({ usuario, total }))
        .sort((a, b) => b.total - a.total);

    res.json(ordenado);
});

// 🏆 RANKING SEMANAL
app.get("/ranking-semana", (req, res) => {

    const ranking = {};

    dados.forEach(d => {
        ranking[d.usuario] = (ranking[d.usuario] || 0) + d.vs;
    });

    const ordenado = Object.entries(ranking)
        .map(([usuario, total]) => ({ usuario, total }))
        .sort((a, b) => b.total - a.total);

    res.json(ordenado);
});

// 🥇 MVP
app.get("/mvp/:data", (req, res) => {
    const data = req.params.data;

    const ranking = {};

    dados
        .filter(d => d.data === data)
        .forEach(d => {
            ranking[d.usuario] = (ranking[d.usuario] || 0) + d.vs;
        });

    const ordenado = Object.entries(ranking)
        .map(([usuario, total]) => ({ usuario, total }))
        .sort((a, b) => b.total - a.total);

    res.json(ordenado[0] || null);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("🔥 API ELITE rodando");
});
