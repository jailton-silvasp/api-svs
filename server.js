const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

app.use(express.json());

// ✅ LIBERA CORS (ESSENCIAL)
app.use(
  cors({
    origin: "*", // pode restringir depois
  })
);

// 🔌 conexão banco
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// 📊 rota dashboard
app.get("/dashboard", async (req, res) => {
  try {
    const hoje = await pool.query(`
      SELECT COUNT(*) as total 
      FROM vs_registros
      WHERE criado_em >= date_trunc('day', NOW() AT TIME ZONE 'America/Sao_Paulo')
    `);

    const semana = await pool.query(`
      SELECT COUNT(*) as total 
      FROM vs_registros
      WHERE criado_em >= date_trunc('week', NOW() AT TIME ZONE 'America/Sao_Paulo')
    `);

    const f1 = await pool.query(`
      SELECT COALESCE(SUM(pontos),0) as total 
      FROM f1_registros
      WHERE criado_em >= date_trunc('week', NOW() AT TIME ZONE 'America/Sao_Paulo')
    `);

    const jogadores = await pool.query(`
      SELECT COUNT(DISTINCT jogador) as total 
      FROM vs_registros
    `);

    const top10 = await pool.query(`
      SELECT jogador as nome, SUM(pontos) as pontos
      FROM f1_registros
      GROUP BY jogador
      ORDER BY pontos DESC
      LIMIT 10
    `);

    res.json({
      vs_hoje: Number(hoje.rows[0].total),
      vs_semana: Number(semana.rows[0].total),
      f1_semana: Number(f1.rows[0].total),
      jogadores: Number(jogadores.rows[0].total),
      top10: top10.rows,
    });
  } catch (err) {
    console.error("Erro dashboard:", err);
    res.status(500).json({ erro: "Erro ao buscar dados" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 API rodando na porta", PORT);
});
