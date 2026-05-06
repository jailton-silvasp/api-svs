require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const app = express();
app.use(express.json());
app.use(cors());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const SECRET = "svs_super_secret";

// ================= LOGIN =================
app.post("/register", async (req, res) => {
    const { username, password } = req.body;
    const hash = await bcrypt.hash(password, 10);

    await pool.query(
        "INSERT INTO users (username, password) VALUES ($1, $2)",
        [username, hash]
    );

    res.send({ ok: true });
});

app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    const user = await pool.query(
        "SELECT * FROM users WHERE username=$1",
        [username]
    );

    if (!user.rows.length) return res.status(401).send("User not found");

    const valid = await bcrypt.compare(password, user.rows[0].password);
    if (!valid) return res.status(401).send("Invalid password");

    const token = jwt.sign({ username }, SECRET);
    res.send({ token });
});

// ================= VS =================
app.post("/vs", async (req, res) => {
    const { usuario, discord_id, valor } = req.body;

    await pool.query(
        "INSERT INTO vs_registros (usuario, discord_id, valor) VALUES ($1,$2,$3)",
        [usuario, discord_id, valor]
    );

    res.send({ ok: true });
});

// ================= F1 =================
app.post("/f1", async (req, res) => {
    const { usuario, discord_id, valor, semana } = req.body;

    await pool.query(
        "INSERT INTO f1_registros (usuario, discord_id, valor, semana) VALUES ($1,$2,$3,$4)",
        [usuario, discord_id, valor, semana]
    );

    res.send({ ok: true });
});

// ================= RANKING VS =================
app.get("/ranking", async (req, res) => {
    const { data } = req.query;

    const result = await pool.query(`
        SELECT usuario, SUM(valor) as total
        FROM vs_registros
        WHERE data = $1
        GROUP BY usuario
        ORDER BY total DESC
    `, [data]);

    res.json(result.rows);
});

// ================= RANKING F1 =================
app.get("/ranking-f1", async (req, res) => {
    const { semana } = req.query;

    const result = await pool.query(`
        SELECT usuario, SUM(valor) as total
        FROM f1_registros
        WHERE semana = $1
        GROUP BY usuario
        ORDER BY total DESC
    `, [semana]);

    res.json(result.rows);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("API rodando...");
});
