const express = require("express")
const cors = require("cors")
const { Pool } = require("pg")

const app = express()
app.use(cors())
app.use(express.json())

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

console.log("API rodando...")

// =============================
// 🔥 REGISTRAR VS
// =============================
app.post("/vs", async (req, res) => {
  try {
    const { player_name, discord_id, points } = req.body

    await pool.query(
      "INSERT INTO vs_registros (usuario, discord_id, valor) VALUES ($1, $2, $3)",
      [player_name, discord_id, points]
    )

    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Erro ao salvar VS" })
  }
})

// =============================
// 🔥 REGISTRAR F1
// =============================
app.post("/f1", async (req, res) => {
  try {
    const { player_name, discord_id, points } = req.body

    await pool.query(
      "INSERT INTO f1_registros (usuario, discord_id, valor) VALUES ($1, $2, $3)",
      [player_name, discord_id, points]
    )

    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Erro ao salvar F1" })
  }
})

// =============================
// 🏆 RANKING VS (HOJE)
// =============================
app.get("/ranking", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT usuario, MAX(valor) as points
      FROM vs_registros
      WHERE DATE(data) = CURRENT_DATE
      GROUP BY usuario
      ORDER BY points DESC
      LIMIT 10
    `)

    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Erro ao buscar ranking" })
  }
})

app.listen(3000, () => console.log("Servidor rodando na porta 3000"))
