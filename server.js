const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});


// ================================
// HEALTH
// ================================

app.get("/", (req, res) => {
  res.send("SVS API online");
});


// ================================
// DATA LÓGICA
// ================================

const DATA_LOGICA_SQL = `
  CASE
    WHEN EXTRACT(HOUR FROM NOW() AT TIME ZONE 'America/Sao_Paulo') >= 23
    THEN (NOW() AT TIME ZONE 'America/Sao_Paulo')::date + INTERVAL '1 day'
    ELSE (NOW() AT TIME ZONE 'America/Sao_Paulo')::date
  END
`;

const INICIO_SEMANA_SQL = `
  DATE_TRUNC(
    'week',
    NOW() AT TIME ZONE 'America/Sao_Paulo'
  )
`;


// ================================
// REGISTRAR VS
// ================================

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
        error: "Estrutura inválida"
      });
    }

    await pool.query(
      `
      INSERT INTO vs_registros
      (
        usuario,
        discord_id,
        valor,
        avatar_url,
        data,
        estrutura
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        usuario,
        discord_id,
        valor,
        avatar_url,
        data,
        estrutura
      ]
    );

    res.json({
      success: true
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "Erro ao registrar VS"
    });

  }

});


// ================================
// REGISTRAR F1
// ================================

app.post("/f1", async (req, res) => {

  try {

    const {
      usuario,
      discord_id,
      valor,
      avatar_url,
      data,
      semana,
      estrutura
    } = req.body;

    if (!["Principal", "Academy"].includes(estrutura)) {
      return res.status(400).json({
        error: "Estrutura inválida"
      });
    }

    await pool.query(
      `
      INSERT INTO f1_registros
      (
        usuario,
        discord_id,
        valor,
        avatar_url,
        data,
        semana,
        estrutura
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        usuario,
        discord_id,
        valor,
        avatar_url,
        data,
        semana,
        estrutura
      ]
    );

    res.json({
      success: true
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "Erro ao registrar F1"
    });

  }

});


// ================================
// RANKING DO DIA
// ================================

app.get("/ranking", async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT
        usuario,
        discord_id,
        SUM(valor) AS total,
        MAX(avatar_url) AS avatar_url,
        COALESCE(MAX(estrutura), 'Principal') AS estrutura
      FROM vs_registros
      WHERE data = (
        ${DATA_LOGICA_SQL}
      )
      GROUP BY usuario, discord_id
      ORDER BY total DESC
      LIMIT 100
    `);

    res.json(result.rows);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "Erro ao buscar ranking"
    });

  }

});


// ================================
// REGISTROS RECENTES
// ================================

app.get("/recentes", async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT
        usuario,
        discord_id,
        valor,
        avatar_url,
        data
      FROM vs_registros
      ORDER BY id DESC
      LIMIT 50
    `);

    res.json(result.rows);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "Erro ao buscar registros recentes"
    });

  }

});


// ================================
// RANKING SEMANAL
// ================================

app.get("/ranking/semanal", async (req, res) => {

  try {

    const estrutura = req.query.estrutura;

    if (
      estrutura &&
      !["Principal", "Academy"].includes(estrutura)
    ) {
      return res.status(400).json({
        error: "Estrutura inválida"
      });
    }


    // F1
    let f1Query = `
      SELECT
        usuario,
        discord_id,
        SUM(valor) AS total,
        MAX(avatar_url) AS avatar_url,
        COALESCE(MAX(estrutura), 'Principal') AS estrutura
      FROM f1_registros
      WHERE 1=1
    `;

    const f1Params = [];

    if (estrutura) {

      f1Params.push(estrutura);

      f1Query += `
        AND COALESCE(estrutura, 'Principal') = $${f1Params.length}
      `;

    }

    f1Query += `
      GROUP BY usuario, discord_id
      ORDER BY total DESC
      LIMIT 100
    `;


    // VS
    let vsQuery = `
      SELECT
        usuario,
        discord_id,
        SUM(valor) AS total,
        MAX(avatar_url) AS avatar_url,
        COALESCE(MAX(estrutura), 'Principal') AS estrutura
      FROM vs_registros
      WHERE data >= (${INICIO_SEMANA_SQL})
    `;

    const vsParams = [];

    if (estrutura) {

      vsParams.push(estrutura);

      vsQuery += `
        AND COALESCE(estrutura, 'Principal') = $${vsParams.length}
      `;

    }

    vsQuery += `
      GROUP BY usuario, discord_id
      ORDER BY total DESC
      LIMIT 100
    `;


    const [f1Result, vsResult] = await Promise.all([
      pool.query(f1Query, f1Params),
      pool.query(vsQuery, vsParams)
    ]);


    res.json({
      f1: f1Result.rows,
      vs: vsResult.rows
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "Erro ao buscar ranking semanal"
    });

  }

});


// ================================
// DASHBOARD
// ================================

app.get("/dashboard", async (req, res) => {

  try {

    const estrutura = req.query.estrutura;

    if (
      estrutura &&
      !["Principal", "Academy"].includes(estrutura)
    ) {
      return res.status(400).json({
        error: "Estrutura inválida"
      });
    }


    // ============================
    // VS
    // ============================

    let vsQuery = `
      SELECT
        usuario,
        discord_id,
        SUM(valor) AS total,
        MAX(avatar_url) AS avatar_url,
        COALESCE(MAX(estrutura), 'Principal') AS estrutura
      FROM vs_registros
      WHERE 1=1
    `;

    const vsParams = [];

    if (estrutura) {

      vsParams.push(estrutura);

      vsQuery += `
        AND COALESCE(estrutura, 'Principal') = $${vsParams.length}
      `;

    }

    vsQuery += `
      GROUP BY usuario, discord_id, estrutura
      ORDER BY total DESC
    `;


    // ============================
    // F1
    // ============================

    let f1Query = `
      SELECT
        usuario,
        discord_id,
        SUM(valor) AS total,
        MAX(avatar_url) AS avatar_url,
        COALESCE(MAX(estrutura), 'Principal') AS estrutura
      FROM f1_registros
      WHERE 1=1
    `;

    const f1Params = [];

    if (estrutura) {

      f1Params.push(estrutura);

      f1Query += `
        AND COALESCE(estrutura, 'Principal') = $${f1Params.length}
      `;

    }

    f1Query += `
      GROUP BY usuario, discord_id, estrutura
      ORDER BY total DESC
    `;


    // ============================
    // ÚLTIMOS VS
    // ============================

    let recentesQuery = `
      SELECT
        usuario,
        discord_id,
        valor,
        avatar_url,
        data,
        COALESCE(estrutura, 'Principal') AS estrutura
      FROM vs_registros
      WHERE 1=1
    `;

    const recentesParams = [];

    if (estrutura) {

      recentesParams.push(estrutura);

      recentesQuery += `
        AND COALESCE(estrutura, 'Principal') = $${recentesParams.length}
      `;

    }

    recentesQuery += `
      ORDER BY id DESC
      LIMIT 50
    `;


    const [
      vsResult,
      f1Result,
      recentesResult
    ] = await Promise.all([

      pool.query(vsQuery, vsParams),

      pool.query(f1Query, f1Params),

      pool.query(
        recentesQuery,
        recentesParams
      )

    ]);


    res.json({

      vs: vsResult.rows,

      f1: f1Result.rows,

      recentes: recentesResult.rows

    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "Erro ao carregar dashboard"
    });

  }

});


// ================================
// SERVIDOR
// ================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log(
    `🚀 API rodando na porta ${PORT}`
  );

});
