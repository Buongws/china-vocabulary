'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import type { Snapshot } from '@/lib/types';

const methods = z.enum(['start_daily_sessions','submit_answer','practice_word','save_settings','save_learning_settings','mark_item_viewed','set_preferred_language','create_invite','join_couple','leave_couple','encourage_partner','save_deck','archive_deck','save_word','archive_word','import_words','mark_notifications_read']);
type Method = z.infer<typeof methods>;

function readableError(message: string) {
  if (/invalid login credentials/i.test(message)) return 'Email hoặc mật khẩu chưa đúng. Bạn kiểm tra lại nhé.';
  if (/email not confirmed/i.test(message)) return 'Tài khoản chưa được xác nhận. Hãy xác nhận tài khoản trong Supabase trước khi đăng nhập.';
  if (/fetch failed|network|failed to fetch/i.test(message)) return 'Chưa kết nối được đến Supabase. Kiểm tra mạng rồi thử lại nhé.';
  if (/rate limit|too many requests/i.test(message)) return 'Bạn thao tác hơi nhanh. Vui lòng đợi một chút rồi thử lại.';
  if (/schema cache|does not exist/i.test(message)) return 'Database chưa được thiết lập đầy đủ. Hãy chạy file SQL theo trang Hướng dẫn thiết lập.';
  return message;
}

export async function signIn(_previous: { error: string } | null, form: FormData) {
  const parsed = z.object({ email: z.email(), password: z.string().min(1) }).safeParse({ email: form.get('email'), password: form.get('password') });
  if (!parsed.success) return { error: 'Vui lòng nhập email hợp lệ và mật khẩu.' };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: readableError(error.message) };
  redirect('/');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function mutate(method: Method, params: Record<string, unknown> = {}): Promise<{ snapshot?: Snapshot; result?: unknown; error?: string }> {
  if (!methods.safeParse(method).success) return { error: 'Thao tác không hợp lệ.' };
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims.sub) return { error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' };
  const { data: result, error } = await supabase.rpc(method, params);
  if (error) return { error: readableError(error.message) };
  const { data: snapshot, error: readError } = await supabase.rpc('get_app_data');
  if (readError) return { error: `Đã lưu, nhưng chưa tải lại được dữ liệu: ${readableError(readError.message)}` };
  return { snapshot: snapshot as Snapshot, result };
}

export async function refreshSnapshot(): Promise<{ snapshot?: Snapshot; error?: string }> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims.sub) return { error: 'Phiên đăng nhập đã hết hạn.' };
  const { data, error } = await supabase.rpc('get_app_data');
  return error ? { error: readableError(error.message) } : { snapshot: data as Snapshot };
}

export async function changePassword(form: FormData) {
  const password = form.get('password');
  const confirm = form.get('confirm');
  if (typeof password !== 'string' || password.length < 8) return { error: 'Mật khẩu mới cần ít nhất 8 ký tự.' };
  if (password !== confirm) return { error: 'Hai mật khẩu chưa khớp nhau.' };
  const supabase = await createClient();
  const { data, error: authError } = await supabase.auth.getUser();
  if (authError || !data.user) return { error: 'Vui lòng đăng nhập lại để đổi mật khẩu.' };
  const currentPassword = form.get('current_password');
  if (typeof currentPassword !== 'string' || !currentPassword) return { error: 'Vui lòng nhập mật khẩu hiện tại.' };
  const { error: verifyError } = await supabase.auth.signInWithPassword({ email: data.user.email!, password: currentPassword });
  if (verifyError) return { error: 'Mật khẩu hiện tại chưa đúng.' };
  const { error } = await supabase.auth.updateUser({ password });
  return error ? { error: readableError(error.message) } : { success: true };
}
