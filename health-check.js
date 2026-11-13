export async function verificarConexaoBanco(pool) {
  try {
    await pool.query("SELECT 1");
    return {
      status: 200,
      body: { ok: true, database: "connected" },
    };
  } catch (err) {
    console.error("🔥 Health check: banco indisponível:", err);
    return {
      status: 503,
      body: { ok: false, database: "unavailable" },
    };
  }
}
