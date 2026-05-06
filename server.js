require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { Pool } = require('pg')

const app = express()
app.use(express.json())
app.use(cors())

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

app.get('/', (req, res) => {
  res.send('API rodando...')
})

/* =========================
   🔥 VS
========================= */
app.post('/vs', async (req, res) => {
  try {
    const { player_name, discord_id, points } = req.body

    await pool.query(
      `INSERT INTO vs_registros (usuario, discord_id, valor)
       VALUES ($1, $2, $3)`,
      [player_name, discord_id, points]
    )

    res.json({ success: true })

  } catch (err) {
    console.error("ERRO VS:", err)
    res.status(500).json({ error: err.message })
  }
})

/* =========================
   🏎️ F1
========================= */
app.post('/f1', async (req, res) => {
  try {
    const { player_name, discord_id, points } = req.body

    await pool.query(
      `INSERT INTO f1_registros (usuario, discord_id, valor)
       VALUES ($1, $2, $3)`,
      [player_name, discord_id, points]
    )

    res.json({ success: true })

  } catch (err) {
    console.error("ERRO F1:", err)
    res.status(500).json({ error: err.message })
  }
})

/* =========================
   🏆 RANKING
========================= */
app.get('/ranking', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT usuario, MAX(valor) as points
      FROM vs_registros
      WHERE DATE(data) = CURRENT_DATE
      GROUP BY usuario
      ORDER BY points DESC
    `)

    res.json(result.rows)

  } catch (err) {
    console.error("ERRO RANKING:", err)
    res.status(500).json({ error: err.message })
  }
})

/* =========================
   🚀 START
========================= */
const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log("Servidor rodando na porta", PORT))
