import express from "express";
import cors from "cors";
import pkg from "pg";
import { timingSafeEqual } from "node:crypto";

const { Pool } = pkg;

const app = express();
app.use(express.json({ limit: "16kb" }));
app.use(cors({ origin: "https://dashboard-elo.vercel.app" }));

// Somente o bot autorizado pode gravar registros.
function autenticarBot(req, res, next) {
  const segredo = process.env.API_SECRET;
  const recebido = req.get("x-api-key") || "";

  if (!segredo) {
    return res.status(503).json({ erro: "Autenticacao da API nao configurada" });
  }

  const esperadoBuffer = Buffer.from(segredo);
  const recebidoBuffer = Buffer.from(recebido);

  if (
    esperadoBuffer.length !== recebidoBuffer.length ||
    !timingSafeEqual(esperadoBuffer, recebidoBuffer)
  ) {
    return res.status(401).json({ erro: "Nao autorizado" });
  }

  next();
}

function validarRegistro({ usuario, discord_id, valor }) {
  const numero = Number(valor);
  return (
    typeof usuario === "string" &&
    usuario.trim().length > 0 &&
    usuario.length <= 100 &&
    typeof discord_id === "string" &&
    /^\d{15,22}$/.test(discord_id) &&
    Number.isFinite(numero) &&
    numero > 0 &&
    numero <= 1e13
  );
}

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
// Marcações até 22:59 = dia atual
// Marcações a partir das 23:00 = dia seguinte
// CORREÇÃO: Usa timezone('America/Sao_Paulo', criado_em) para garantir conversão correta
// independente de como a coluna foi criada (WITH ou WITHOUT TIME ZONE)
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

// Data lógica de "hoje" (se agora >= 23h, considera como amanhã)
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

// Início do ciclo semanal: segunda-feira.
// No domingo, mantém o ciclo encerrado no sábado até a virada de segunda-feira.
// O ciclo semanal acompanha a data lógica: domingo às 23h já inicia a nova semana.
const INICIO_SEMANA_SQL = `
  date_trunc(
    'week',
    (${HOJE_LOGICO_SQL})::date
  )::date
`;
// -------------------------
// VS REGISTRO (COM AVATAR)
// -------------------------
app.post("/vs", autenticarBot, async (req, res) => {
  try {
    const { usuario, discord_id, valor, avatar_url } = req.body;

    if (!validarRegistro({ usuario, discord_id, valor })) {
      return res.status(400).json({ erro: "Dados VS invalidos" });
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
 criado_em
)
VALUES
(
 $1,$2,$3,$4,(${HOJE_LOGICO_SQL})::date,NOW()
)
`,
[
 usuario,
 discord_id,
 numero,
 avatar_url || null
]
);

    res.json({ ok: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao salvar VS" });
  }
});

// -------------------------
// F1 REGISTRO
// -------------------------
app.post("/f1", autenticarBot, async (req, res) => {
  try {
    const { usuario, discord_id, valor } = req.body;

    console.log("🔥 F1 RECEBIDO:", req.body);

    const numero = Number(valor);

    if (!validarRegistro({ usuario, discord_id, valor })) {
      return res.status(400).json({ erro: "Dados F1 invalidos" });
    }

    await pool.query(
      `INSERT INTO f1_registros 
       (usuario, discord_id, valor, semana, data, created_at, criado_em)
       VALUES ($1, $2, $3, EXTRACT(WEEK FROM (${HOJE_LOGICO_SQL})::date)::int, (${HOJE_LOGICO_SQL})::date, NOW(), NOW())`,
      [
        usuario,
        discord_id,
        numero
      ]
    );

    res.json({ ok: true });

  } catch (err) {
    console.error("🔥 ERRO F1:", err);
    res.status(500).json({ erro: "Erro ao salvar F1" });
  }
});

// -------------------------
// RANKING (CORRIGIDO COM DATA LÓGICA)
// -------------------------
app.get("/ranking", async (req, res) => {
  try {
    const period = req.query.period;
    const date = req.query.date;

    let query = "";

    if (period === "day") {

      let whereClause = "";

      if (date) {
        // Filtra pela data lógica (23h+ = próximo dia)
        whereClause = `
  WHERE data = $1::date
`;
      } else {
        // Filtra pelo "hoje lógico"
        whereClause = `
          WHERE data = (${HOJE_LOGICO_SQL})::date
        `;
      }

      query = `
  SELECT 
    usuario,
    discord_id,
    COALESCE(avatar_url, '') as avatar_url,
    valor as total
  FROM (
    SELECT DISTINCT ON (discord_id)
      usuario,
      discord_id,
      valor,
      avatar_url,
      criado_em
    FROM vs_registros
    ${whereClause}
    ORDER BY discord_id, (avatar_url IS NOT NULL AND avatar_url <> '') DESC, criado_em DESC
  ) t
  ORDER BY total DESC
`;

    } else {

      // comportamento original (ranking geral - mantido)
      query = `
  SELECT 
    usuario,
    discord_id,
    COALESCE(avatar_url, '') as avatar_url,
    valor as total
  FROM (
    SELECT DISTINCT ON (discord_id)
      usuario,
      discord_id,
      valor,
      avatar_url,
      criado_em
    FROM vs_registros
    ORDER BY discord_id, (avatar_url IS NOT NULL AND avatar_url <> '') DESC, criado_em DESC
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
      total: parseFloat(r.total ?? 0)
    }));

    res.json(data);

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro no ranking" });
  }
});

// -------------------------
// RECENTES (CORRIGIDO COM DATA LÓGICA)
// -------------------------
app.get("/recentes", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT usuario, valor, criado_em, avatar_url
      FROM vs_registros
      WHERE data = (${HOJE_LOGICO_SQL})::date
      ORDER BY criado_em DESC
      LIMIT 10
    `);

    res.json(result.rows.map(r => ({
      usuario: r.usuario,
      valor: Number(r.valor),
      criado_em: r.criado_em,
      avatar_url: r.avatar_url || null
    })));

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar recentes" });
  }
});

// -------------------------
// RANKING SEMANAL
// -------------------------
app.get("/ranking/semanal", async (req, res) => {
  try {
    const tipo = req.query.tipo || "vs";

    let query = "";

    if (tipo === "f1") {
  query = `
    WITH perfil_atual AS (
      SELECT DISTINCT ON (discord_id) discord_id, avatar_url
      FROM vs_registros
      WHERE avatar_url IS NOT NULL AND TRIM(avatar_url) <> ''
      ORDER BY discord_id, criado_em DESC
    ),
    f1_da_semana AS (
      SELECT
        usuario,
        discord_id,
        valor,
        COALESCE(data, timezone('America/Sao_Paulo', created_at)::date) AS data_registro,
        created_at
      FROM f1_registros
      WHERE COALESCE(data, timezone('America/Sao_Paulo', created_at)::date)
        >= (${INICIO_SEMANA_SQL})
        AND COALESCE(data, timezone('America/Sao_Paulo', created_at)::date)
        < ((${INICIO_SEMANA_SQL}) + INTERVAL '6 days')::date
    ),
    ultimos_f1 AS (
      SELECT DISTINCT ON (discord_id)
        usuario,
        discord_id,
        valor::float AS total
      FROM f1_da_semana
      ORDER BY discord_id, created_at DESC
    )
    SELECT ultimos_f1.usuario, ultimos_f1.discord_id,
      COALESCE(perfil_atual.avatar_url, '') AS avatar_url,
      ultimos_f1.total
    FROM ultimos_f1
    LEFT JOIN perfil_atual USING (discord_id)
    ORDER BY ultimos_f1.total DESC
  `;
    } else {
  query = `
    WITH totais_semanais AS (
      SELECT discord_id, COALESCE(SUM(valor), 0)::float AS total
      FROM vs_registros
      WHERE data >= (${INICIO_SEMANA_SQL})
        AND data < ((${INICIO_SEMANA_SQL}) + INTERVAL '6 days')::date
      GROUP BY discord_id
    ),
    perfil_atual AS (
      SELECT DISTINCT ON (discord_id) discord_id, usuario, avatar_url
      FROM vs_registros
      WHERE avatar_url IS NOT NULL AND TRIM(avatar_url) <> ''
      ORDER BY discord_id, criado_em DESC
    )
    SELECT
      perfil_atual.usuario,
      totais_semanais.discord_id,
      COALESCE(perfil_atual.avatar_url, '') AS avatar_url,
      totais_semanais.total
    FROM totais_semanais
    LEFT JOIN perfil_atual USING (discord_id)
    ORDER BY totais_semanais.total DESC
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
// DASHBOARD (CORRIGIDO COM DATA LÓGICA)
// -------------------------
app.get("/dashboard", async (req, res) => {
  try {

    // Total histórico de VS por jogador, mantendo o avatar do registro mais recente.
    const vs = await pool.query(`
      WITH totais_gerais AS (
        SELECT discord_id, COALESCE(SUM(valor), 0)::float AS total
        FROM vs_registros
        GROUP BY discord_id
      ),
      perfil_atual AS (
        SELECT DISTINCT ON (discord_id) discord_id, usuario, avatar_url
        FROM vs_registros
        WHERE avatar_url IS NOT NULL AND TRIM(avatar_url) <> ''
        ORDER BY discord_id, criado_em DESC
      )
      SELECT
        perfil_atual.usuario,
        totais_gerais.discord_id,
        COALESCE(perfil_atual.avatar_url, '') AS avatar_url,
        totais_gerais.total
      FROM totais_gerais
      LEFT JOIN perfil_atual USING (discord_id)
      ORDER BY totais_gerais.total DESC
    `);

    // Última marcação F1 de cada jogador, preservada até uma nova marcação.
    const f1 = await pool.query(`
      WITH perfil_atual AS (
        SELECT DISTINCT ON (discord_id) discord_id, avatar_url
        FROM vs_registros
        WHERE avatar_url IS NOT NULL AND TRIM(avatar_url) <> ''
        ORDER BY discord_id, criado_em DESC
      ),
      ultimos_f1 AS (
        SELECT DISTINCT ON (discord_id) usuario, discord_id, valor, created_at
        FROM f1_registros
        ORDER BY discord_id, created_at DESC
      )
      SELECT ultimos_f1.usuario, ultimos_f1.discord_id,
        COALESCE(perfil_atual.avatar_url, '') AS avatar_url,
        ultimos_f1.valor::float AS total
      FROM ultimos_f1
      LEFT JOIN perfil_atual USING (discord_id)
      ORDER BY total DESC
    `);

    // Registros recentes do dia lógico atual.
    const recentes = await pool.query(`
      SELECT usuario, valor, data, criado_em, avatar_url
      FROM vs_registros
      WHERE data = (${HOJE_LOGICO_SQL})::date
      ORDER BY criado_em DESC
      LIMIT 10
    `);

    res.json({
      vs: vs.rows.map(r => ({
        usuario: r.usuario,
        discord_id: r.discord_id,
        avatar_url: r.avatar_url || null,
        total: Number(r.total || 0)
      })),
      f1: f1.rows.map(r => ({
        usuario: r.usuario,
        discord_id: r.discord_id,
        avatar_url: r.avatar_url || null,
        total: Number(r.total || 0)
      })),
      recentes: recentes.rows.map(r => ({
        usuario: r.usuario,
        valor: Number(r.valor || 0),
        data: r.data,
        criado_em: r.criado_em,
        avatar_url: r.avatar_url || null
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
