import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

/**
 * Recria o schema do banco de testes aplicando as migrations SQL do Prisma em ordem.
 * Não depende do binário do Prisma — funciona em qualquer CI com Postgres.
 */
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("Defina TEST_DATABASE_URL para rodar os testes.");
  if (url === process.env.DATABASE_URL) throw new Error("TEST_DATABASE_URL não pode ser igual a DATABASE_URL.");

  const client = new Client({ connectionString: url });
  await client.connect();
  await client.query("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;");
  const dir = path.resolve(process.cwd(), "prisma/migrations");
  const migrations = fs
    .readdirSync(dir)
    .filter((d) => fs.existsSync(path.join(dir, d, "migration.sql")))
    .sort();
  for (const m of migrations) await client.query(fs.readFileSync(path.join(dir, m, "migration.sql"), "utf8"));
  await client.end();
}
