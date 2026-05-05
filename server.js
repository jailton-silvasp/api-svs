const express = require("express");
const app = express();
const cors = require("cors");
const { Pool } = require("pg");
const jwt = require("jsonwebtoken");

app.use(express.json());
app.use(cors());

const SECRET = "elo_supremo";

// 🔥 conexão com Railway
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// =============================
// LOGIN
// =============================
app.post("/login", async (req, res) => {
    const { user, pass } = req.body;

    if (user === "admin" && pass === "123") {
        const token = jwt.sign({ role: "lider" }, SECRET);
        return res.json({ token });
    }

    res.status(401).json({ erro: "negado" });
});

// =============================
// REGISTRAR VS
// =============================
app.post("/vs", async (req, res) => {
    const { usuario, vs } = req.body;

    await pool.query(
        "INSERT INTO registros (usuario, vs, data) VALUES ($1, $2, NOW())",
        [usuario, vs]
    );

    res.json({ ok: true });
});

// =============================
// RANKING DIA
// =============================
app.get("/ranking", async (req, res) => {

    const result = await pool.query(`
        SELECT usuario, SUM(vs) as total
        FROM registros
        WHERE DATE(data) = CURRENT_DATE
        GROUP BY usuario
        ORDER BY total DESC
    `);

    res.json(result.rows);
});

// =============================
// SEMANAL
// =============================
app.get("/ranking-semanal", async (req, res) => {

    const result = await pool.query(`
        SELECT usuario, SUM(vs) as total
        FROM registros
        GROUP BY usuario
        ORDER BY total DESC
    `);

    res.json(result.rows);
});

// =============================
// MVP
// =============================
app.get("/mvp", async (req, res) => {

    const result = await pool.query(`
        SELECT usuario, SUM(vs) as total
        FROM registros
        GROUP BY usuario
        ORDER BY total DESC
        LIMIT 1
    `);

    res.json(result.rows[0]);
});

app.listen(3000, () => console.log("🔥 API ON"));