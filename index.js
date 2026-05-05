const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

let registros = [];

// 🔐 Lista de líderes (controle de acesso)
const lideres = [
    "『PRΞDΛDΩR』",
    "SEU_NICK_AQUI"
];

// 📌 REGISTRO DE VS
app.post("/vs", (req, res) => {
    const { user, vs } = req.body;

    if (!user || !vs) {
        return res.status(400).json({ error: "Dados inválidos" });
    }

    const hoje = new Date().toISOString().split("T")[0];

    registros.push({
        usuario: user,
        vs: parseFloat(vs),
        data: hoje
    });

    res.json({ status: "ok" });
});

// 📊 RANKING TOTAL
app.get("/ranking", (req, res) => {
    const ranking = {};

    registros.forEach(r => {
        if (!ranking[r.usuario]) ranking[r.usuario] = 0;
        ranking[r.usuario] += r.vs;
    });

    const resultado = Object.keys(ranking).map(u => ({
        usuario: u,
        total: ranking[u]
    }));

    resultado.sort((a, b) => b.total - a.total);

    res.json(resultado);
});

// 📅 HISTÓRICO POR DIA
app.get("/historico", (req, res) => {
    res.json(registros);
});

// 🏆 RANKING SEMANAL
app.get("/ranking-semanal", (req, res) => {
    const semana = {};

    registros.forEach(r => {
        if (!semana[r.usuario]) semana[r.usuario] = 0;
        semana[r.usuario] += r.vs;
    });

    const resultado = Object.keys(semana).map(u => ({
        usuario: u,
        total: semana[u]
    }));

    resultado.sort((a, b) => b.total - a.total);

    res.json(resultado);
});

// 🥇 MVP
app.get("/mvp", (req, res) => {
    const ranking = {};

    registros.forEach(r => {
        if (!ranking[r.usuario]) ranking[r.usuario] = 0;
        ranking[r.usuario] += r.vs;
    });

    let mvp = null;
    let maior = 0;

    for (let user in ranking) {
        if (ranking[user] > maior) {
            maior = ranking[user];
            mvp = user;
        }
    }

    res.json({ usuario: mvp, total: maior });
});

// 🔐 LOGIN
app.post("/login", (req, res) => {
    const { user } = req.body;

    if (lideres.includes(user)) {
        return res.json({ acesso: "lider" });
    }

    return res.json({ acesso: "membro" });
});

app.listen(3000, () => console.log("API rodando"));
