const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.get("/", (req, res) => {
  res.send("API ONLINE 🚀");
});


// =======================
// VS (COM FILTRO DIÁRIO CORRIGIDO)
// =======================

app.post("/vs", async (req, res) => {
  try {
    const { usuario, discord_id, valor } = req.body;

    await pool.query(
      `INSERT INTO vs_registros (usuario, discord_id, valor, criado_em)
       VALUES ($1, $2, $3, NOW() AT TIME ZONE 'America/Sao_Paulo')`,
      [usuario, discord_id, valor]
    );

    res.json({ sucesso: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao salvar VS" });
  }
});

app.get("/ranking", async (req, res) => {
  try {
    const period = req.query.period;

    let query;

    // 🔥 FILTRO DIÁRIO CORRIGIDO
    if (period === "day") {
      query = `
        SELECT usuario, SUM(valor) as total
        FROM vs_registros
        WHERE criado_em >= date_trunc('day', NOW() AT TIME ZONE 'America/Sao_Paulo')
        GROUP BY usuario
        ORDER BY total DESC
      `;
    } else {
      // ranking geral
      query = `
        SELECT usuario, SUM(valor) as total
        FROM vs_registros
        GROUP BY usuario
        ORDER BY total DESC
      `;
    }

    const result = await pool.query(query);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar ranking" });
  }
});


// =======================
// F1 (SEM ALTERAÇÃO DE FILTRO)
// =======================

app.post("/f1", async (req, res) => {
  try {
    const { usuario, discord_id, valor } = req.body;

    await pool.query(
      `INSERT INTO f1_registros (usuario, discord_id, valor, criado_em)
       VALUES ($1, $2, $3, NOW() AT TIME ZONE 'America/Sao_Paulo')`,
      [usuario, discord_id, valor]
    );

    res.json({ sucesso: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao salvar F1" });
  }
});

app.get("/ranking-f1", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT usuario, SUM(valor) as total
      FROM f1_registros
      GROUP BY usuario
      ORDER BY total DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar ranking F1" });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 API rodando"));
