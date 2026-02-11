import { Client } from "pg";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const body =
    typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const email = String(body.email || "").trim().toLowerCase();
  const source = body.source ? String(body.source).slice(0, 80) : null;

  if (!email) return res.status(400).json({ error: "Missing email" });
  if (!process.env.DATABASE_URL) return res.status(500).json({ error: "Missing DATABASE_URL" });

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  const info = await client.query(`select current_database() as db, current_user as usr;`);

  await client.query(`
    create table if not exists subscribers (
      id bigserial primary key,
      email text not null unique,
      source text,
      created_at timestamptz not null default now()
    );
  `);

  const ins = await client.query(
    `insert into subscribers (email, source)
     values ($1, $2)
     on conflict (email) do update set source = coalesce(excluded.source, subscribers.source)
     returning id, email, created_at;`,
    [email, source]
  );

  await client.end();

  // 🔥 This response proves which DB you hit + what row was written
  return res.status(200).json({
    ok: true,
    wrote: true,
    db: info.rows[0],
    row: ins.rows[0],
  });
}
