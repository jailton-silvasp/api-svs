const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

let dados = [];

// =========================================
// 🔥 SALVAR VS (CORRIGIDO)
// =========================================
app.post("/vs", (req, res) => {
    // 🔥 ACEITA user OU usuario
    const usuario = req.body.user || req.body.usuario;
    const vs = req.body.vs;

    if (!usuario || !vs) {
        return res.status(400).json({ error: "Dados inválidos" });
    }

    const hoje = new Date().toLocaleDateString("pt-BR");

    dados.push({
        usuario: usuario,
        vs: Number(vs),
        data: hoje
    });

    console.log("📥 Novo registro:", usuario, vs);

    res.json({ status: "ok" });
});


// =========================================
// 🏆 RANKING (SEM BUG)
// =========================================
app.get("/ranking", (req, res) => {
    const hoje = new Date().toLocaleDateString("pt-BR");

    const ranking = {};

    dados
        .filter(d => d.data === hoje)
        .forEach(d => {
            if (!d.usuario) return; // 🔥 evita undefined

            ranking[d.usuario] = (ranking[d.usuario] || 0) + d.vs;
        });

    const ordenado = Object.entries(ranking)
        .map(([usuario, total]) => ({ usuario, total }))
        .sort((a, b) => b.total - a.total);

    res.json(ordenado);
});


// =========================================
// 🧪 DEBUG OPCIONAL (VER DADOS BRUTOS)
// =========================================
app.get("/dados", (req, res) => {
    res.json(dados);
});


// =========================================
// 🚀 START
// =========================================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("🔥 API rodando na porta", PORT);
});
