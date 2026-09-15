import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const dynamic = 'force-dynamic';
export async function GET() {
  const [migration, preferredLanguage, seed, hsk6Chinese, englishWorkLife] = await Promise.all([
    readFile(join(process.cwd(), 'supabase/migrations/202609140001_initial.sql'), 'utf8'),
    readFile(join(process.cwd(), 'supabase/migrations/202609150001_preferred_language.sql'), 'utf8'),
    readFile(join(process.cwd(), 'supabase/seed.sql'), 'utf8'),
    readFile(join(process.cwd(), 'supabase/hsk6-chinese.sql'), 'utf8'),
    readFile(join(process.cwd(), 'supabase/english-work-life.sql'), 'utf8'),
  ]);
  return new Response(`${migration}\n\n${preferredLanguage}\n\n${seed}\n\n${hsk6Chinese}\n\n${englishWorkLife}`, { headers: { 'Content-Type':'text/plain; charset=utf-8', 'Content-Disposition':'attachment; filename="tna-vocabulary-setup.sql"' } });
}
