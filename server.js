import express from "express";
import cors from "cors";
import pkg from "pg";

const { Pool } = pkg;

const app = express();
app.use(express.json());

app.use(cors({ origin: "*" }));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// -------------------------
// HEALTH
// -------------------------
app.get("/", (req, res) => {
  res.send("🔥 API SVS ONLINE");
});

// -------------------------
// REGISTRO VS (SALVA NÚMERO PURO)
// -------------------------
app.post("/vs", async (req, res) => {
  try {
    const { usuario, discord_id, valor } = req.body;

    const numero = parseFloat(valor);

    await pool.query(
      `INSERT INTO vs_registros (usuario, discord_id, valor, criado_em)
       VALUES ($1, $2, $3, NOW() AT TIME ZONE 'America/Sao_Paulo')`,
      [usuario, discord_id, numero]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao salvar VS" });
  }
});

// -------------------------
// FORMATADOR GLOBAL (USADO NO BACKEND DO RANKING)
// -------------------------
function formatar(valor) {
  valor = Number(valor);

  if (valor >= 1_000_000_000) return (valor / 1_000_000_000).toFixed(2) + "G";
  if (valor >= 1_000_000) return (valor / 1_000_000).toFixed(2) + "M";
  if (valor >= 1_000) return (valor / 1_000).toFixed(2) + "K";
  return valor.toFixed(2);
}

// -------------------------
// RANKING (DIA / GLOBAL)
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
      LIMIT 10
    `;

    const result = await pool.query(query);

    const data = result.rows.map(r => ({
      usuario: r.usuario,
      discord_id: r.discord_id,
      total: Number(r.total)
    }));

    res.json(data);

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro no ranking" });
  }
});

// -------------------------
// DASHBOARD
// -------------------------
app.get("/dashboard", async (req, res) => {
  try {

    const hoje = await pool.query(`
      SELECT COUNT(*) as total
      FROM vs_registros
      WHERE criado_em >= date_trunc('day', NOW() AT TIME ZONE 'America/Sao_Paulo')
    `);

    const total = await pool.query(`
      SELECT COUNT(*) as total FROM vs_registros
    `);

    const ranking = await pool.query(`
      SELECT usuario, SUM(valor) as total
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
    res.status(500).json({ erro: "Erro dashboard" });
  }
});

// -------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🔥 API SVS ONLINE");
});
