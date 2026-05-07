import express from "express";
import cors from "cors";
import pkg from "pg";

const { Pool } = pkg;

const app = express();
app.use(express.json());

// 🔥 CORS LIBERADO (resolve Vercel)
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

// -------------------------
// HEALTH CHECK
// -------------------------
app.get("/", (req, res) => {
  res.send("🔥 API SVS ONLINE");
});

// -------------------------
// REGISTRO VS
// -------------------------
app.post("/vs", async (req, res) => {
  try {
    const { usuario, discord_id, valor } = req.body;

    await pool.query(
      `INSERT INTO vs_registros (usuario, discord_id, valor, criado_em)
       VALUES ($1, $2, $3, NOW() AT TIME ZONE 'America/Sao_Paulo')`,
      [usuario, discord_id, valor]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao salvar VS" });
  }
});

// -------------------------
// RANKING (CORRIGIDO)
// -------------------------
app.get("/ranking", async (req, res) => {
  try {
    const period = req.query.period;

    let query = `
      SELECT usuario, discord_id, SUM(valor) as total
      FROM vs_registros
    `;

    if (period === "day") {
      query += `
        WHERE criado_em >= date_trunc('day', NOW() AT TIME ZONE 'America/Sao_Paulo')
      `;
    }

    query += `
      GROUP BY usuario, discord_id
      ORDER BY total DESC
    `;

    const result = await pool.query(query);

    // 🔥 FUNÇÃO DE FORMATAÇÃO
    const formatarValor = (valor) => {
      valor = Number(valor);

      if (valor >= 1_000_000_000) {
        return (valor / 1_000_000_000).toFixed(2) + "G";
      } else if (valor >= 1_000_000) {
        return (valor / 1_000_000).toFixed(2) + "M";
      } else if (valor >= 1_000) {
        return (valor / 1_000).toFixed(2) + "K";
      } else {
        return valor.toFixed(2);
      }
    };

    const rankingFormatado = result.rows.map((row) => ({
      usuario: row.usuario,
      discord_id: row.discord_id,
      total: formatarValor(row.total) // 🔥 AQUI ESTÁ O SEGREDO
    }));

    res.json(rankingFormatado);

  } catch (err) {
    console.error("Erro no ranking:", err);
    res.status(500).json({ erro: "Erro ao buscar ranking" });
  }
});

// -------------------------
// DASHBOARD
// -------------------------
app.get("/dashboard", async (req, res) => {
  try {

    // VS HOJE
    const hoje = await pool.query(`
      SELECT COUNT(*) as total 
      FROM vs_registros
      WHERE criado_em >= date_trunc('day', NOW() AT TIME ZONE 'America/Sao_Paulo')
    `);

    // VS TOTAL
    const total = await pool.query(`
      SELECT COUNT(*) as total FROM vs_registros
    `);

    // RANKING (TOP 10)
    const ranking = await pool.query(`
      SELECT usuario, SUM(valor::numeric) as total
      FROM vs_registros
      GROUP BY usuario
      ORDER BY total DESC
      LIMIT 10
    `);

    res.json({
      hoje: Number(hoje.rows[0].total),
      total: Number(total.rows[0].total),
      ranking: ranking.rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar dados" });
  }
});

// -------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🔥 API rodando na porta ${PORT}`);
});
