import express from "express";
import cors from "cors";
import pkg from "pg";

const { Pool } = pkg;

const app = express();
app.use(express.json());

app.use(cors({
  origin: "*"
}));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// =============================
// 🔥 DASHBOARD
// =============================
app.get("/dashboard", async (req, res) => {
  try {
    console.log("🔥 Buscando dados do dashboard...");

    const hoje = await pool.query(`
      SELECT COUNT(*) as total 
      FROM vs_registros
      WHERE criado_em AT TIME ZONE 'America/Sao_Paulo' >= date_trunc('day', NOW() AT TIME ZONE 'America/Sao_Paulo')
    `);

    const total = await pool.query(`
      SELECT COUNT(*) as total 
      FROM vs_registros
    `);

    const ranking = await pool.query(`
      SELECT usuario, COUNT(*) as total
      FROM vs_registros
      GROUP BY usuario
      ORDER BY total DESC
      LIMIT 5
    `);

    res.json({
      hoje: Number(hoje.rows[0]?.total || 0),
      total: Number(total.rows[0]?.total || 0),
      ranking: ranking.rows.map(r => ({
        usuario: r.usuario,
        total: Number(r.total)
      }))
    });

  } catch (err) {
    console.error("❌ ERRO NO DASHBOARD:", err);
    res.status(500).json({ erro: "Erro ao buscar dados" });
  }
});

// =============================
// 🔥 RANKING (BOT USA ESSA)
// =============================
app.get("/ranking", async (req, res) => {
  try {
    console.log("🔥 Buscando ranking...");

    const ranking = await pool.query(`
      SELECT usuario, SUM(valor) as total
      FROM vs_registros
      GROUP BY usuario
      ORDER BY total DESC
      LIMIT 10
    `);

    res.json(
      ranking.rows.map(r => ({
        usuario: r.usuario,
        total: Number(r.total)
      }))
    );

  } catch (err) {
    console.error("❌ ERRO NO RANKING:", err);
    res.status(500).json({ erro: "Erro ao buscar ranking" });
  }
});

// =============================
// 🚀 START
// =============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server rodando na porta ${PORT}`);
});
