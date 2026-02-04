import { Client } from "pg";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let body = req.body;
  if (typeof body === "string") body = JSON.parse(body);

  const email = (body?.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "Invalid email" });
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  try {
    await client.query(
      `
      INSERT INTO subscribers (email, source)
      VALUES ($1, $2)
      ON CONFLICT (email) DO NOTHING
      `,
      [email, body?.source || "landing-page"]
    );

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Database error" });
  } finally {
    await client.end();
  }
}
