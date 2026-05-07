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
// VS
// =======================

app.post("/vs", async (req, res) => {
  try {
    const { usuario, discord_id, valor } = req.body;

    await pool.query(
      `INSERT INTO vs_registros (usuario, discord_id, valor, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [usuario, discord_id, valor]
    );

    res.json({ sucesso: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao salvar VS" });
  }
});

// 🔥 RANKING VS (CORRIGIDO 100% UTC + BR FIX)
app.get("/ranking", async (req, res) => {
  try {
    const period = req.query.period;

    let query = `
      SELECT usuario, discord_id, SUM(valor) as total
      FROM vs_registros
    `;

    if (period === "day") {
      query += `
        WHERE created_at >= (NOW() AT TIME ZONE 'UTC')::date
        AND created_at < ((NOW() AT TIME ZONE 'UTC')::date + INTERVAL '1 day')
      `;
    }

    query += `
      GROUP BY usuario, discord_id
      ORDER BY total DESC
    `;

    const result = await pool.query(query);
    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar ranking VS" });
  }
});

// =======================
// F1
// =======================

app.post("/f1", async (req, res) => {
  try {
    const { usuario, discord_id, valor } = req.body;

    await pool.query(
      `INSERT INTO f1_registros (usuario, discord_id, valor, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [usuario, discord_id, valor]
    );

    res.json({ sucesso: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao salvar F1" });
  }
});

// 🔥 RANKING F1 (SEMANAL CORRIGIDO)
app.get("/ranking-f1", async (req, res) => {
  try {
    const period = req.query.period;

    let query = `
      SELECT usuario, discord_id, SUM(valor) as total
      FROM f1_registros
    `;

    if (period === "week") {
      query += `
        WHERE created_at >= date_trunc('week', NOW())
      `;
    }

    query += `
      GROUP BY usuario, discord_id
      ORDER BY total DESC
    `;

    const result = await pool.query(query);
    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar ranking F1" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 API rodando"));
