import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
export const dynamic = 'force-dynamic';
export async function GET() {
  const sql = await readFile(join(process.cwd(), 'supabase/enable-cron.sql'), 'utf8');
  return new Response(sql, { headers: { 'Content-Type':'text/plain; charset=utf-8', 'Content-Disposition':'attachment; filename="tna-vocabulary-reminders.sql"' } });
}
