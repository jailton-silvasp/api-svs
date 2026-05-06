const express = require("express");
const app = express();

app.use(express.json());

let dados = [];

// 🔥 SALVAR VS
app.post("/vs", (req, res) => {
    const { usuario, vs } = req.body;

    const hoje = new Date().toLocaleDateString("pt-BR");

    dados.push({
        usuario,
        vs: Number(vs),
        data: hoje
    });

    res.send({ status: "ok" });
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
    console.log("API rodando na porta", PORT);
});