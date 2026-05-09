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
// VS REGISTRO (COM AVATAR)
// -------------------------
app.post("/vs", async (req, res) => {
  try {
    const { usuario, discord_id, valor, avatar_url } = req.body;

    const numero = Number(valor);

    await pool.query(
      `INSERT INTO vs_registros 
       (usuario, discord_id, valor, avatar_url, criado_em)
       VALUES ($1, $2, $3, $4, NOW() AT TIME ZONE 'America/Sao_Paulo')`,
      [usuario, discord_id, numero, avatar_url || null]
    );

    res.json({ ok: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao salvar VS" });
  }
});

// -------------------------
// F1 REGISTRO (NOVO - SEM QUEBRAR NADA)
// -------------------------
app.post("/f1", async (req, res) => {
  try {
    const { usuario, discord_id, valor } = req.body;

    console.log("🔥 F1 RECEBIDO:", req.body);

    const numero = Number(valor);

    if (!usuario || !discord_id || isNaN(numero)) {
      return res.status(400).json({ erro: "Dados inválidos" });
    }

    await pool.query(
      `INSERT INTO f1_registros 
       (usuario, discord_id, valor, semana, data, created_at, criado_em)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW() AT TIME ZONE 'America/Sao_Paulo')`,
      [
        usuario,
        discord_id,
        numero,
        req.body.semana || null,
        req.body.data || null
      ]
    );

    res.json({ ok: true });

  } catch (err) {
    console.error("🔥 ERRO F1:", err);
    res.status(500).json({ erro: err.message });
  }
});

// -------------------------
// RANKING (COM AVATAR E FILTRO POR DATA)
// -------------------------
app.get("/ranking", async (req, res) => {
  try {
    const period = req.query.period;
    const date = req.query.date;

    let query = `
      SELECT 
        usuario,
        discord_id,
        COALESCE(MAX(avatar_url), '') as avatar_url,
        COALESCE(SUM(valor), 0) as total
      FROM vs_registros
    `;

    if (period === "day") {
      if (date) {
        query += `
          WHERE DATE(criado_em AT TIME ZONE 'America/Sao_Paulo') = '${date}'
        `;
      } else {
        query += `
          WHERE criado_em >= date_trunc('day', NOW() AT TIME ZONE 'America/Sao_Paulo')
        `;
      }
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
      avatar_url: r.avatar_url || null,
      total: parseFloat(r.total ?? 0)
    }));

    res.json(data);

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro no ranking" });
  }
});

// -------------------------
// 🔥 ÚLTIMOS REGISTROS (MANTIDO)
// -------------------------
app.get("/recentes", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT usuario, valor, criado_em
      FROM vs_registros
      WHERE criado_em >= date_trunc('day', NOW() AT TIME ZONE 'America/Sao_Paulo')
      ORDER BY criado_em DESC
      LIMIT 10
    `);

    res.json(result.rows.map(r => ({
      usuario: r.usuario,
      valor: Number(r.valor),
      criado_em: r.criado_em
    })));

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar recentes" });
  }
});

// -------------------------
// 🔥 RANKING SEMANAL (COM AVATAR)
// -------------------------
app.get("/ranking/semanal", async (req, res) => {
  try {
    const tipo = req.query.tipo || "vs";

    let query = "";

    if (tipo === "f1") {
      // 🔥 AJUSTE: pega apenas o ÚLTIMO registro da semana por jogador
      query = `
        SELECT DISTINCT ON (discord_id)
          usuario,
          discord_id,
          valor::float as total
        FROM f1_registros
        WHERE created_at >= date_trunc('week', NOW() AT TIME ZONE 'America/Sao_Paulo')
        ORDER BY discord_id, created_at DESC
      `;
    } else {
      query = `
        SELECT 
          usuario, 
          discord_id,
          COALESCE(MAX(avatar_url), '') as avatar_url,
          COALESCE(SUM(valor), 0)::float as total
        FROM vs_registros
        WHERE criado_em >= date_trunc('week', NOW() AT TIME ZONE 'America/Sao_Paulo')
        GROUP BY usuario, discord_id
        ORDER BY total DESC
        LIMIT 10
      `;
    }

    const result = await pool.query(query);

    res.json(result.rows.map(r => ({
      usuario: r.usuario,
      discord_id: r.discord_id,
      avatar_url: r.avatar_url || null,
      total: Number(r.total || 0)
    })));

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ranking semanal" });
  }
});

// -------------------------
// DASHBOARD (INALTERADO)
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
      SELECT 
        usuario, 
        SUM(valor)::float as total
      FROM vs_registros
      GROUP BY usuario
      ORDER BY total DESC
      LIMIT 10
    `);

    res.json({
      hoje: Number(hoje.rows[0].total),
      total: Number(total.rows[0].total),
      ranking: ranking.rows.map(r => ({
        usuario: r.usuario,
        total: Number(r.total || 0)
      }))
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
