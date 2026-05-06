require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { Pool } = require('pg')

const app = express()
app.use(cors())
app.use(express.json())

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

// 🔥 TESTE API
app.get('/', (req, res) => {
  res.send('API rodando')
})

/*
========================================
🔥 VS - SALVAR
========================================
*/
app.post('/vs', async (req, res) => {
  try {
    const { player_name, points } = req.body

    await pool.query(
      `INSERT INTO vs_registros (player_name, points)
       VALUES ($1, $2)`,
      [player_name, points]
    )

    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao salvar VS' })
  }
})

/*
========================================
🔥 VS - RANKING (HOJE)
========================================
*/
app.get('/ranking', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT player_name, MAX(points) as points
      FROM vs_registros
      WHERE DATE(created_at) = CURRENT_DATE
      GROUP BY player_name
      ORDER BY points DESC
      LIMIT 10
    `)

    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro no ranking' })
  }
})

/*
========================================
🔥 F1 - SALVAR
========================================
*/
app.post('/f1', async (req, res) => {
  try {
    const { player_name, points } = req.body

    await pool.query(
      `INSERT INTO f1_registros (player_name, points)
       VALUES ($1, $2)`,
      [player_name, points]
    )

    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao salvar F1' })
  }
})

/*
========================================
🔥 F1 - SEMANAL
========================================
*/
app.get('/f1-semanal', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT player_name, SUM(points) as points
      FROM f1_registros
      WHERE DATE_TRUNC('week', created_at) = DATE_TRUNC('week', CURRENT_DATE)
      GROUP BY player_name
      ORDER BY points DESC
    `)

    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro F1 semanal' })
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`API rodando na porta ${PORT}`))
