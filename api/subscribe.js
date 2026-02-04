// api/subscribe.js  (CommonJS = safest on Vercel)
const { Client } = require("pg");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = async (req, res) => {
  // Basic CORS (harmless + avoids random browser weirdness)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { email, source } = req.body || {};
    const cleanEmail = String(email || "").trim().toLowerCase();

    if (!cleanEmail || !EMAIL_RE.test(cleanEmail)) {
      return res.status(400).json({ error: "Invalid email" });
    }

    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) {
      return res.status(500).json({ error: "Missing DATABASE_URL" });
    }

    const client = new Client({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false } // OK for Neon
    });

    await client.connect();

    await client.query(`
      CREATE TABLE IF NOT EXISTS subscribers (
        id BIGSERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        source TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await client.query(
      `INSERT INTO subscribers (email, source)
       VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE
         SET source = COALESCE(EXCLUDED.source, subscribers.source);`,
      [cleanEmail, source ? String(source).slice(0, 80) : null]
    );

    await client.end();

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("subscribe error:", err); // <-- this will show in Vercel logs
    return res.status(500).json({ error: "Server error" });
  }
};
