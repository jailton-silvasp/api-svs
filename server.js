import express from "express";
import cors from "cors";
import pkg from "pg";

const { Pool } = pkg;

const app = express();
app.use(cors());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 🔥 RESUMO
app.get("/resumo", async (req, res) => {
  try {
    const hoje = await pool.query(`
      SELECT COUNT(*) as total 
      FROM vs_registros
      WHERE criado_em >= date_trunc('day', NOW() AT TIME ZONE 'America/Sao_Paulo')
    `);

    const semana = await pool.query(`
      SELECT COUNT(*) as total 
      FROM vs_registros
      WHERE criado_em >= NOW() - INTERVAL '7 days'
    `);

    const f1 = await pool.query(`
      SELECT SUM(valor) as total 
      FROM vs_registros
      WHERE criado_em >= NOW() - INTERVAL '7 days'
    `);

    const jogadores = await pool.query(`
      SELECT COUNT(DISTINCT jogador) as total 
      FROM vs_registros
    `);

    res.json({
      hoje: Number(hoje.rows[0].total),
      semana: Number(semana.rows[0].total),
      f1_semana: Math.floor(Number(f1.rows[0].total || 0)),
      jogadores: Number(jogadores.rows[0].total)
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Erro no resumo");
  }
});

// 🔥 TOP 10
app.get("/ranking", async (req, res) => {
  try {
    const ranking = await pool.query(`
      SELECT jogador, SUM(valor) as total
      FROM vs_registros
      GROUP BY jogador
      ORDER BY total DESC
      LIMIT 10
    `);

    const resultado = ranking.rows.map(r => ({
      jogador: r.jogador,
      total: Math.floor(Number(r.total))
    }));

    res.json(resultado);

  } catch (err) {
    console.error(err);
    res.status(500).send("Erro no ranking");
  }
});

app.listen(3000, () => console.log("API rodando 🚀"));
