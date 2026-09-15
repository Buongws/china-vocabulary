import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Workspace } from '@/components/workspace';
import { SetupGuide } from '@/components/setup-guide';
import type { Snapshot } from '@/lib/types';

export const dynamic = 'force-dynamic';
const views = ['', 'learn', 'review', 'practice', 'decks', 'couple', 'stats', 'settings', 'notifications'];

export default async function WorkspacePage({ params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  const view = path[0] || '';
  if (!views.includes(view) || path.length > (view === 'decks' ? 2 : 1)) notFound();
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return <SetupGuide reason="Chưa có cấu hình kết nối Supabase." />;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims.sub) redirect('/login');
  const { data: snapshot, error } = await supabase.rpc('get_app_data');
  if (error) return <SetupGuide reason="Đã đăng nhập. Hãy hoàn tất thiết lập database để bắt đầu học." />;
  return <Workspace key={path.join('/')} initialData={snapshot as Snapshot} view={view || 'dashboard'} deckId={path[1]} />;
}
