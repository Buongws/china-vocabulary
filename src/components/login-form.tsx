'use client';
import { useActionState, useState } from 'react';
import { ArrowRight, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { signIn } from '@/lib/actions';
import { Button } from '@/components/ui/button';

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, null);
  const [visible, setVisible] = useState(false);
  return <form action={action} className="login-form">
    <label className="field">Email<input name="email" type="email" autoComplete="email" placeholder="ban@example.com" required /></label>
    <label className="field">Mật khẩu<span className="password-input"><input name="password" type={visible ? 'text' : 'password'} autoComplete="current-password" placeholder="Nhập mật khẩu của bạn" required /><button type="button" aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={19} /> : <Eye size={19} />}</button></span></label>
    {state?.error && <p role="alert" className="error-message">{state.error}</p>}
    <Button type="submit" disabled={pending} className="full-width">{pending ? <LoaderCircle size={18} className="spin" /> : null}{pending ? 'Đang đăng nhập…' : 'Vào học thôi'}{!pending && <ArrowRight size={18} />}</Button>
    <p className="form-note">Dùng tài khoản đã được tạo và xác nhận trong Supabase.</p>
  </form>;
}
