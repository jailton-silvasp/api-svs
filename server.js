import express from "express";
import cors from "cors";
import pkg from "pg";

const { Pool } = pkg;

const app = express();
app.use(express.json());

// 🔥 CORS LIBERADO
app.use(cors({
  origin: "*"
}));

// 🔥 CONEXÃO DATABASE
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// 🔥 ROTA DASHBOARD
app.get("/dashboard", async (req, res) => {
  try {
    console.log("🔥 Buscando dados do dashboard...");

    // 🔥 TOTAL HOJE
    const hoje = await pool.query(`
      SELECT COUNT(*) as total 
      FROM vs_registros
      WHERE criado_em >= date_trunc('day', NOW() AT TIME ZONE 'America/Sao_Paulo')
    `);

    // 🔥 TOTAL GERAL
    const total = await pool.query(`
      SELECT COUNT(*) as total 
      FROM vs_registros
    `);

    // 🔥 TOP JOGADORES (AGORA CORRETO)
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
      ranking: ranking.rows || []
    });

  } catch (err) {
    console.error("❌ ERRO NO DASHBOARD:", err);
    res.status(500).json({ erro: "Erro ao buscar dados" });
  }
});

// 🔥 START
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server rodando na porta ${PORT}`);
});
