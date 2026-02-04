// api/subscribe.js (Vercel Serverless Function - ESM)
import { Client } from "pg";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  // CORS (safe even for same-origin)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    // Vercel can provide req.body as object OR string depending on runtime/path
    const body =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});

    const email = String(body.email || "").trim().toLowerCase();
    const source = body.source ? String(body.source).trim().slice(0, 80) : null;

    if (!email || !EMAIL_RE.test(email)) {
      return res.status(400).json({ error: "Invalid email" });
    }

    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) {
      return res.status(500).json({ error: "Missing DATABASE_URL" });
    }

    const client = new Client({
      connectionString: DATABASE_URL,
      // Neon uses SSL; your URL already has sslmode=require, this just avoids local CA issues
      ssl: { rejectUnauthorized: false },
    });

    await client.connect();

    // Ensure table exists (simple + frictionless)
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscribers (
        id BIGSERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        source TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // Insert (idempotent). Update source if a new one is provided.
    await client.query(
      `
      INSERT INTO subscribers (email, source)
      VALUES ($1, $2)
      ON CONFLICT (email) DO UPDATE
        SET source = COALESCE(EXCLUDED.source, subscribers.source);
      `,
      [email, source]
    );

    await client.end();

    return res.status(200).json({ ok: true, wrote: true });;
  } catch (err) {
    console.error("subscribe error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
