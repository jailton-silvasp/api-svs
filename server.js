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
// FUNÇÃO AUXILIAR: Data Lógica
// -------------------------
const DATA_LOGICA_SQL = `
  CASE
    WHEN (
      timezone('America/Sao_Paulo', criado_em)::time
      >= TIME '23:00:00'
    )
    THEN (
      timezone('America/Sao_Paulo', criado_em)::date + INTERVAL '1 day'
    )

    ELSE timezone('America/Sao_Paulo', criado_em)::date
  END
`;

// -------------------------
// Data lógica de "hoje"
// -------------------------
const HOJE_LOGICO_SQL = `
  CASE
    WHEN (
      timezone('America/Sao_Paulo', NOW())::time
      >= TIME '23:00:00'
    )
    THEN (
      timezone('America/Sao_Paulo', NOW())::date + INTERVAL '1 day'
    )

    ELSE timezone('America/Sao_Paulo', NOW())::date
  END
`;

// -------------------------
// Início da semana
// -------------------------
const INICIO_SEMANA_SQL = `
  date_trunc(
    'week',
    (${HOJE_LOGICO_SQL})::date
  )::date
`;

// -------------------------
// VS REGISTRO
// -------------------------
app.post("/vs", async (req, res) => {
  try {

    const {
      usuario,
      discord_id,
      valor,
      avatar_url,
      data,
      estrutura
    } = req.body;

    if (!["Principal", "Academy"].includes(estrutura)) {
      return res.status(400).json({
        erro: "Estrutura inválida"
      });
    }

    const numero = Number(valor);

    await pool.query(
      `
      INSERT INTO vs_registros
      (
        usuario,
        discord_id,
        valor,
        avatar_url,
        data,
        criado_em,
        estrutura
      )
      VALUES
      (
        $1,$2,$3,$4,$5,NOW(),$6
      )
      `,
      [
        usuario,
        discord_id,
        numero,
        avatar_url || null,
        data,
        estrutura
      ]
    );

    res.json({ ok: true });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      erro: "Erro ao salvar VS"
    });

  }
});

// -------------------------
// F1 REGISTRO
// -------------------------
app.post("/f1", async (req, res) => {

  try {

    const {
      usuario,
      discord_id,
      valor,
      semana,
      data,
      estrutura
    } = req.body;

    console.log("🔥 F1 RECEBIDO:", req.body);

    const numero = Number(valor);

    if (
      !usuario ||
      !discord_id ||
      isNaN(numero)
    ) {
      return res.status(400).json({
        erro: "Dados inválidos"
      });
    }

    if (!["Principal", "Academy"].includes(estrutura)) {
      return res.status(400).json({
        erro: "Estrutura inválida"
      });
    }

    await pool.query(
      `
      INSERT INTO f1_registros
      (
        usuario,
        discord_id,
        valor,
        semana,
        data,
        created_at,
        criado_em,
        estrutura
      )
      VALUES
      (
        $1,$2,$3,$4,$5,NOW(),NOW(),$6
      )
      `,
      [
        usuario,
        discord_id,
        numero,
        semana || null,
        data || null,
        estrutura
      ]
    );

    res.json({ ok: true });

  } catch (err) {

    console.error("🔥 ERRO F1:", err);

    res.status(500).json({
      erro: err.message
    });

  }
});

// -------------------------
// RANKING
// -------------------------
app.get("/ranking", async (req, res) => {

  try {

    const period = req.query.period;
    const date = req.query.date;

    let query = "";

    if (period === "day") {

      let whereClause = "";

      if (date) {

        whereClause = `
          WHERE data = $1::date
        `;

      } else {

        whereClause = `
          WHERE data = (${HOJE_LOGICO_SQL})::date
        `;

      }

      query = `
        SELECT
          usuario,
          discord_id,
          COALESCE(avatar_url, '') as avatar_url,
          valor as total,
          COALESCE(estrutura, 'Principal') as estrutura
        FROM (
          SELECT DISTINCT ON (discord_id)
            usuario,
            discord_id,
            valor,
            avatar_url,
            criado_em,
            estrutura
          FROM vs_registros
          ${whereClause}
          ORDER BY discord_id, criado_em DESC
        ) t
        ORDER BY total DESC
      `;

    } else {

      query = `
        SELECT
          usuario,
          discord_id,
          COALESCE(avatar_url, '') as avatar_url,
          valor as total,
          COALESCE(estrutura, 'Principal') as estrutura
        FROM (
          SELECT DISTINCT ON (discord_id)
            usuario,
            discord_id,
            valor,
            avatar_url,
            criado_em,
            estrutura
          FROM vs_registros
          ORDER BY discord_id, criado_em DESC
        ) t
        ORDER BY total DESC
      `;

    }

    const result = date
      ? await pool.query(query, [date])
      : await pool.query(query);

    const data = result.rows.map(r => ({
      usuario: r.usuario,
      discord_id: r.discord_id,
      avatar_url: r.avatar_url || null,
      total: parseFloat(r.total ?? 0),
      estrutura: r.estrutura || "Principal"
    }));

    res.json(data);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      erro: "Erro no ranking"
    });

  }

});

// -------------------------
// RECENTES
// -------------------------
app.get("/recentes", async (req, res) => {

  try {

    const estrutura = req.query.estrutura;

    let query = `
      SELECT
        usuario,
        valor,
        criado_em,
        COALESCE(estrutura, 'Principal') as estrutura
      FROM vs_registros
      WHERE data = (${HOJE_LOGICO_SQL})::date
    `;

    const params = [];

    if (estrutura) {

      if (!["Principal", "Academy"].includes(estrutura)) {
        return res.status(400).json({
          erro: "Estrutura inválida"
        });
      }

      params.push(estrutura);

      query += `
        AND COALESCE(estrutura, 'Principal') = $1
      `;

    }

    query += `
      ORDER BY criado_em DESC
      LIMIT 10
    `;

    const result = await pool.query(query, params);

    res.json(
      result.rows.map(r => ({
        usuario: r.usuario,
        valor: Number(r.valor),
        criado_em: r.criado_em,
        estrutura: r.estrutura || "Principal"
      }))
    );

  } catch (err) {

    console.error(err);

    res.status(500).json({
      erro: "Erro ao buscar recentes"
    });

  }

});

// -------------------------
// RANKING SEMANAL
// -------------------------
app.get("/ranking/semanal", async (req, res) => {

  try {

    const tipo = req.query.tipo || "vs";
    const estrutura = req.query.estrutura;

    if (
      estrutura &&
      !["Principal", "Academy"].includes(estrutura)
    ) {
      return res.status(400).json({
        erro: "Estrutura inválida"
      });
    }

    let query = "";
    const params = [];

    if (tipo === "f1") {

      query = `
        SELECT DISTINCT ON (discord_id)
          usuario,
          discord_id,
          valor::float as total,
          COALESCE(estrutura, 'Principal') as estrutura
        FROM f1_registros
      `;

      if (estrutura) {

        params.push(estrutura);

        query += `
          WHERE COALESCE(estrutura, 'Principal') = $1
        `;

      }

      query += `
        ORDER BY discord_id, created_at DESC
      `;

    } else {

      query = `
        SELECT
          usuario,
          discord_id,
          COALESCE(MAX(avatar_url), '') as avatar_url,
          COALESCE(SUM(valor), 0)::float as total,
          COALESCE(MAX(estrutura), 'Principal') as estrutura
        FROM vs_registros
        WHERE data >= (${INICIO_SEMANA_SQL})
      `;

      if (estrutura) {

        params.push(estrutura);

        query += `
          AND COALESCE(estrutura, 'Principal') = $1
        `;

      }

      query += `
        GROUP BY usuario, discord_id
        ORDER BY total DESC
      `;

    }

    const result = await pool.query(query, params);

    res.json(
      result.rows.map(r => ({
        usuario: r.usuario,
        discord_id: r.discord_id,
        avatar_url: r.avatar_url || null,
        total: Number(r.total || 0),
        estrutura: r.estrutura || "Principal"
      }))
    );

  } catch (err) {

    console.error(err);

    res.status(500).json({
      erro: "Erro ranking semanal"
    });

  }

});

// -------------------------
// DASHBOARD
// -------------------------
app.get("/dashboard", async (req, res) => {

  try {

    const estrutura = req.query.estrutura;

    if (
      estrutura &&
      !["Principal", "Academy"].includes(estrutura)
    ) {
      return res.status(400).json({
        erro: "Estrutura inválida"
      });
    }

    let filtroEstrutura = "";

    const params = [];

    if (estrutura) {

      params.push(estrutura);

      filtroEstrutura = `
        AND COALESCE(estrutura, 'Principal') = $1
      `;

    }

    // Conta registros do "hoje lógico"
    const hoje = await pool.query(
      `
      SELECT COUNT(*) as total
      FROM vs_registros
      WHERE data = (${HOJE_LOGICO_SQL})::date
      ${filtroEstrutura}
      `,
      params
    );

    // Total de registros
    const total = await pool.query(
      `
      SELECT COUNT(*) as total
      FROM vs_registros
      WHERE 1=1
      ${filtroEstrutura}
      `,
      params
    );

    // Ranking
    const ranking = await pool.query(
      `
      SELECT
        usuario,
        SUM(valor)::float as total,
        COALESCE(MAX(estrutura), 'Principal') as estrutura
      FROM vs_registros
      WHERE 1=1
      ${filtroEstrutura}
      GROUP BY usuario
      ORDER BY total DESC
      `,
      params
    );

    res.json({

      hoje: Number(hoje.rows[0].total),

      total: Number(total.rows[0].total),

      ranking: ranking.rows.map(r => ({
        usuario: r.usuario,
        total: Number(r.total || 0),
        estrutura: r.estrutura || "Principal"
      }))

    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      erro: "Erro dashboard"
    });

  }

});

// -------------------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🔥 API SVS ONLINE");
});
