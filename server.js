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

// =======================
// BASE
// =======================

app.get("/", (req, res) => {
  res.send("API ONLINE 🚀");
});

// =======================
// FUNÇÃO AVATAR DISCORD
// =======================

function getAvatar(discord_id, avatar) {
  if (!discord_id || !avatar) return null;
  return `https://cdn.discordapp.com/avatars/${discord_id}/${avatar}.png`;
}

// =======================
// VS
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

// =======================
// F1
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

// =======================
// DASHBOARD - RESUMO
// =======================

app.get("/dashboard/resumo", async (req, res) => {
  try {
    const hoje = await pool.query(`
      SELECT COUNT(*) as total FROM vs_registros
      WHERE criado_em >= date_trunc('day', NOW() AT TIME ZONE 'America/Sao_Paulo')
    `);

    const semanaVS = await pool.query(`
      SELECT COALESCE(SUM(valor),0) as total FROM vs_registros
      WHERE criado_em >= date_trunc('week', NOW() AT TIME ZONE 'America/Sao_Paulo')
    `);

    const semanaF1 = await pool.query(`
      SELECT COALESCE(SUM(valor),0) as total FROM f1_registros
      WHERE criado_em >= date_trunc('week', NOW() AT TIME ZONE 'America/Sao_Paulo')
    `);

    const jogadores = await pool.query(`
      SELECT COUNT(DISTINCT usuario) as total FROM vs_registros
    `);

    res.json({
      vs_hoje: Number(hoje.rows[0].total),
      vs_semana: Number(semanaVS.rows[0].total),
      f1_semana: Number(semanaF1.rows[0].total),
      jogadores: Number(jogadores.rows[0].total)
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro resumo" });
  }
});

// =======================
// TOP 10 MELHORES
// =======================

app.get("/dashboard/top10", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT usuario, discord_id, COALESCE(SUM(valor),0) as total
      FROM vs_registros
      GROUP BY usuario, discord_id
      ORDER BY total DESC
      LIMIT 10
    `);

    res.json(
      result.rows.map(r => ({
        ...r,
        total: Number(r.total)
      }))
    );
  } catch (err) {
    res.status(500).json({ erro: "Erro top10" });
  }
});

// =======================
// TOP 10 PIORES
// =======================

app.get("/dashboard/top10-piores", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT usuario, discord_id, COALESCE(SUM(valor),0) as total
      FROM vs_registros
      GROUP BY usuario, discord_id
      ORDER BY total ASC
      LIMIT 10
    `);

    res.json(
      result.rows.map(r => ({
        ...r,
        total: Number(r.total)
      }))
    );
  } catch (err) {
    res.status(500).json({ erro: "Erro top10 piores" });
  }
});

// =======================
// MVP SEMANA
// =======================

app.get("/dashboard/mvp", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT usuario, discord_id, COALESCE(SUM(valor),0) as total
      FROM vs_registros
      WHERE criado_em >= date_trunc('week', NOW() AT TIME ZONE 'America/Sao_Paulo')
      GROUP BY usuario, discord_id
      ORDER BY total DESC
      LIMIT 1
    `);

    const mvp = result.rows[0];

    res.json(
      mvp
        ? { ...mvp, total: Number(mvp.total) }
        : { usuario: "-", total: 0 }
    );

  } catch (err) {
    res.status(500).json({ erro: "Erro MVP" });
  }
});

// =======================
// VS SEMANAL
// =======================

app.get("/dashboard/vs-semanal", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT usuario, COALESCE(SUM(valor),0) as total
      FROM vs_registros
      WHERE criado_em >= date_trunc('week', NOW() AT TIME ZONE 'America/Sao_Paulo')
      GROUP BY usuario
      ORDER BY total DESC
      LIMIT 10
    `);

    res.json(
      result.rows.map(r => ({
        ...r,
        total: Number(r.total)
      }))
    );
  } catch (err) {
    res.status(500).json({ erro: "Erro VS semanal" });
  }
});

// =======================
// F1 SEMANAL
// =======================

app.get("/dashboard/f1-semanal", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT usuario, COALESCE(SUM(valor),0) as total
      FROM f1_registros
      WHERE criado_em >= date_trunc('week', NOW() AT TIME ZONE 'America/Sao_Paulo')
      GROUP BY usuario
      ORDER BY total DESC
      LIMIT 10
    `);

    res.json(
      result.rows.map(r => ({
        ...r,
        total: Number(r.total)
      }))
    );
  } catch (err) {
    res.status(500).json({ erro: "Erro F1 semanal" });
  }
});

// =======================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 API rodando"));
