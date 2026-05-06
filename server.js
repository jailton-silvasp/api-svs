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

console.log("API rodando...");

// =========================
// 🔥 REGISTRAR VS
// =========================
app.post("/vs", async (req, res) => {
  try {
    const { player_name, points } = req.body;

    await pool.query(
      "INSERT INTO vs_registros (player_name, points) VALUES ($1, $2)",
      [player_name, points]
    );

    res.json({ success: true });

  } catch (err) {
    console.error("Erro ao salvar VS:", err);
    res.status(500).json({ error: "Erro ao salvar VS" });
  }
});

// =========================
// 🔥 REGISTRAR F1
// =========================
app.post("/f1", async (req, res) => {
  try {
    const { player_name, points } = req.body;

    await pool.query(
      "INSERT INTO f1_registros (player_name, points) VALUES ($1, $2)",
      [player_name, points]
    );

    res.json({ success: true });

  } catch (err) {
    console.error("Erro ao salvar F1:", err);
    res.status(500).json({ error: "Erro ao salvar F1" });
  }
});

// =========================
// 🔥 RANKING VS (HOJE)
// =========================
app.get("/ranking", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT player_name, SUM(points) as points
      FROM vs_registros
      WHERE DATE(created_at) = CURRENT_DATE
      GROUP BY player_name
      ORDER BY points DESC
    `);

    res.json(result.rows);

  } catch (err) {
    console.error("Erro ranking:", err);
    res.status(500).json({ error: "Erro ao buscar ranking" });
  }
});

// =========================
// 🔥 RANKING F1 (SEMANAL)
// =========================
app.get("/ranking-f1", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT player_name, SUM(points) as points
      FROM f1_registros
      WHERE DATE_TRUNC('week', created_at) = DATE_TRUNC('week', CURRENT_DATE)
      GROUP BY player_name
      ORDER BY points DESC
    `);

    res.json(result.rows);

  } catch (err) {
    console.error("Erro ranking F1:", err);
    res.status(500).json({ error: "Erro ao buscar ranking F1" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor rodando na porta", PORT));
