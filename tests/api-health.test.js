import assert from "node:assert/strict";
import test from "node:test";
import { verificarConexaoBanco } from "../health-check.js";

test("retorna conectado quando SELECT 1 funciona", async () => {
  let sqlExecutado = false;
  const pool = {
    async query(sql) {
      sqlExecutado = sql === "SELECT 1";
      return { rows: [{ "?column?": 1 }] };
    },
  };

  const resultado = await verificarConexaoBanco(pool);
  assert.equal(sqlExecutado, true);
  assert.deepEqual(resultado, {
    status: 200,
    body: { ok: true, database: "connected" },
  });
});

test("retorna indisponível quando o banco rejeita a consulta", async () => {
  const erroOriginal = console.error;
  console.error = () => {};
  try {
    const pool = {
      async query() {
        throw new Error("simulated database unavailable");
      },
    };

    const resultado = await verificarConexaoBanco(pool);
    assert.deepEqual(resultado, {
      status: 503,
      body: { ok: false, database: "unavailable" },
    });
  } finally {
    console.error = erroOriginal;
  }
});
