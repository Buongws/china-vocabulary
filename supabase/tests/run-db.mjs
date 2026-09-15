import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const root = fileURLToPath(new URL('../../', import.meta.url));
const db = new PGlite();
try {
  // PGlite runs real PostgreSQL. Only Supabase's auth service is replaced here.
  await db.exec(`
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}');
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth, public TO anon, authenticated;
  `);
  await db.exec(await readFile(`${root}supabase/migrations/202609140001_initial.sql`, 'utf8'));
  console.log('PASS: complete migration compiles on PostgreSQL');
  await db.exec(await readFile(`${root}supabase/tests/behavior.sql`, 'utf8'));
  console.log('PASS: RPC, SRS, snapshots, idempotency, RLS, couples, reminders, and import tests');
  try {
    await db.exec(await readFile(`${root}supabase/seed.sql`, 'utf8'));
    const { rows } = await db.query(`SELECT language, count(*)::int AS count FROM public.words GROUP BY language ORDER BY language`);
    if (rows.length !== 2 || rows.some((row) => row.count !== 300)) throw new Error(`Expected 300 words per language: ${JSON.stringify(rows)}`);
    console.log('PASS: seed SQL imports 300 English + 300 Chinese words');
  } catch (error) {
    if (error.code === 'ENOENT') console.log('SKIP: seed.sql has not been generated yet');
    else throw error;
  }
} catch (error) {
  console.error('FAIL:', error.message);
  if (error.where) console.error(error.where);
  if (error.position) console.error('SQL position:', error.position);
  process.exitCode = 1;
} finally {
  await db.close();
}
