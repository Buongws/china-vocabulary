import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function GET() {
  const sql = await readFile(join(process.cwd(), 'supabase/migrations/202609150002_learning_experience.sql'), 'utf8');
  return new Response(sql, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': 'attachment; filename="tna-learning-experience.sql"' } });
}
