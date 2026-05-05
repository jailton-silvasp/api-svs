const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

let dados = [];

// 🔥 SALVAR VS
app.post("/vs", (req, res) => {
    const usuario = req.body.user || req.body.usuario;
    const vs = Number(req.body.vs);

    const hoje = new Date().toLocaleDateString("pt-BR");

    if (!usuario || !vs) {
        return res.status(400).send({ erro: "Dados inválidos" });
    }

    dados.push({
        usuario,
        vs,
        data: hoje
    });

    console.log("📥 SALVO:", usuario, vs);

    res.send({ status: "ok" });
});

// 🏆 RANKING DO DIA
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

// 📅 HISTÓRICO POR DIA
app.get("/historico", (req, res) => {
    const agrupado = {};

    dados.forEach(d => {
        if (!agrupado[d.data]) {
            agrupado[d.data] = [];
        }
        agrupado[d.data].push(d);
    });

    res.json(agrupado);
});

// 🥇 MVP DO DIA
app.get("/mvp", (req, res) => {
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

    res.json(ordenado[0] || null);
});

// 🚀 START
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("🔥 API GOD rodando na porta", PORT);
});
