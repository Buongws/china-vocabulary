'use client';
import { useState } from 'react';
import { Bell, Check, Clock, KeyRound, Save, UserRound } from 'lucide-react';
import { useApp } from './app-context';
import { LANGUAGES, type Language } from '@/lib/types';
import { changePassword } from '@/lib/actions';
import { suggestPace } from '@/lib/learning';

export function SettingsPage() {
  const { data, run, busy } = useApp();
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{text:string;error?:boolean}|null>(null);
  const accuracy = data.attempts.length ? data.attempts.filter(item => item.is_correct).length/data.attempts.length : 0;
  const streak = data.completed_days.length;
  const suggestions = Object.fromEntries(data.settings.map(item => [item.language, suggestPace({ startedAt:item.created_at || data.profile.created_at, streak, accuracy, currentTarget:item.daily_target })]));

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const languages = (['zh','en'] as Language[]).map(language => ({
      language,
      enabled: form.has(`${language}_enabled`),
      daily_target: Number(form.get(`${language}_target`)),
      deck_ids: form.getAll(`${language}_decks`).map(String),
      auto_pace: form.has(`${language}_auto`),
    }));
    await run('save_learning_settings', { p_preferred_language:form.get('preferred_language'), p_display_name:form.get('display_name'), p_reminder_time:form.get('reminder_time'), p_reminders_enabled:form.has('reminders_enabled'), p_languages:languages }, 'Đã lưu cài đặt. Thay đổi lộ trình sau khi bắt đầu học sẽ áp dụng từ ngày mai.');
  }

  return <><section className="page-heading"><div><p className="eyebrow">THEO NHỊP CỦA RIÊNG BẠN</p><h1>Cài đặt</h1><p className="muted">Chọn điều phù hợp cho hành trình mỗi ngày.</p></div></section>
    <div className="settings-grid">
      <form className="settings-main" onSubmit={save}>
        <section className="panel settings-section"><div className="settings-title"><span className="icon-tile rose"><UserRound size={20} /></span><div><h2>Hồ sơ của bạn</h2><p>Tên này sẽ hiện với người cùng học.</p></div></div><label className="field">Tên hiển thị<input name="display_name" required minLength={1} maxLength={80} defaultValue={data.profile.display_name} /></label><label className="field preferred-field">Ngôn ngữ ưu tiên<select name="preferred_language" defaultValue={data.profile.preferred_language || 'zh'}><option value="zh">Tiếng Trung</option><option value="en">Tiếng Anh</option></select></label><p className="form-note">Hiển thị trước trên trang chủ. Bài đang học hôm nay được giữ nguyên; thay đổi lộ trình áp dụng từ ngày mai nếu đã bắt đầu học.</p></section>
        <section className="panel settings-section"><div className="settings-title"><span className="icon-tile mint"><Check size={20} /></span><div><h2>Lộ trình học</h2><p>Hoàn thành tất cả lộ trình đang bật để giữ streak ngày.</p></div></div>
          {data.settings.map(settings => {
            const available = data.decks.filter(deck => deck.language === settings.language && !deck.archived);
            const pending = settings.effective_date ? `Thay đổi đang chờ đến ${new Intl.DateTimeFormat('vi-VN').format(new Date(`${settings.effective_date}T12:00:00+07:00`))}` : null;
            return <fieldset className={`language-settings ${LANGUAGES[settings.language].className}`} key={settings.language}><legend><span className="language-symbol">{LANGUAGES[settings.language].symbol}</span><span><strong>{LANGUAGES[settings.language].label}</strong><small>{pending || 'Tiến độ được lưu riêng cho lộ trình này'}</small></span><label className="switch"><input type="checkbox" name={`${settings.language}_enabled`} defaultChecked={settings.pending_enabled ?? settings.enabled} /><span /></label></legend><div className="form-columns"><label className="field">Từ mới mỗi ngày<input name={`${settings.language}_target`} type="number" min={1} max={50} defaultValue={settings.pending_daily_target ?? settings.daily_target} /></label><label className="checkbox-card"><input type="checkbox" name={`${settings.language}_auto`} defaultChecked={settings.auto_pace} /><span><strong>Gợi ý tăng nhịp</strong><small>Khi streak ≥ 7 và độ chính xác ≥ 80%</small></span></label></div>{suggestions[settings.language] && <div className="pace-suggestion">Bạn đã sẵn sàng thử {suggestions[settings.language]} từ/ngày. Bạn có thể đổi mục tiêu ở trên.</div>}<details className="deck-selector"><summary>Chọn bộ từ đang học <span>{(settings.pending_deck_ids ?? settings.deck_ids).length || 'Tất cả'}</span></summary><p>Không chọn bộ nào nghĩa là học tất cả bộ từ đang có.</p><div>{available.map(deck => <label key={deck.id}><input type="checkbox" name={`${settings.language}_decks`} value={deck.id} defaultChecked={(settings.pending_deck_ids ?? settings.deck_ids).includes(deck.id)} /><span>{deck.name}<small>{deck.owner_id ? 'Bộ từ của hai đứa' : 'Có sẵn'}</small></span></label>)}</div></details></fieldset>;
          })}
        </section>
        <section className="panel settings-section"><div className="settings-title"><span className="icon-tile gold"><Bell size={20} /></span><div><h2>Nhắc học</h2><p>Thông báo xuất hiện trong ứng dụng khi đến giờ.</p></div></div><label className="checkbox-card"><input type="checkbox" name="reminders_enabled" defaultChecked={data.profile.reminders_enabled} /><span><strong>Bật nhắc học mỗi ngày</strong><small>Chỉ nhắc một lần nếu bạn chưa hoàn thành</small></span></label><label className="field time-field"><Clock size={17} /> Giờ nhắc<input name="reminder_time" type="time" defaultValue={data.profile.reminder_time.slice(0,5)} required /></label></section>
        <button className="button primary settings-save" disabled={busy}><Save size={18} />{busy ? 'Đang lưu…' : 'Lưu cài đặt'}</button>
      </form>
      <aside className="settings-side"><section className="panel settings-section"><div className="settings-title"><span className="icon-tile paper"><KeyRound size={20} /></span><div><h2>Mật khẩu</h2><p>Đổi mật khẩu của tài khoản đang đăng nhập.</p></div></div>{changingPassword ? <PasswordForm onDone={() => setChangingPassword(false)} onMessage={setPasswordMessage} /> : <button type="button" className="button outline full-width" onClick={() => setChangingPassword(true)}>Đổi mật khẩu</button>}{passwordMessage && <p className={passwordMessage.error ? 'error-message' : 'success-message'}>{passwordMessage.text}</p>}</section><section className="quiet-note"><span>LƯU Ý NHỎ</span><blockquote>Thay đổi mục tiêu trong ngày không làm xáo trộn bài đang học. Mục tiêu mới bắt đầu từ ngày mai.</blockquote></section></aside>
    </div></>;
}

function PasswordForm({ onDone, onMessage }: { onDone:()=>void; onMessage:(value:{text:string;error?:boolean})=>void }) {
  const [pending,setPending] = useState(false);
  return <form className="form-stack" onSubmit={async event => {event.preventDefault();setPending(true);const response=await changePassword(new FormData(event.currentTarget));setPending(false);if ('error' in response && response.error) onMessage({text:response.error,error:true}); else {onMessage({text:'Mật khẩu đã được thay đổi.'});onDone();}}}><label className="field">Mật khẩu hiện tại<input name="current_password" type="password" required autoComplete="current-password" /></label><label className="field">Mật khẩu mới<input name="password" type="password" required minLength={8} autoComplete="new-password" /></label><label className="field">Nhập lại mật khẩu mới<input name="confirm" type="password" required minLength={8} autoComplete="new-password" /></label><div className="button-row"><button type="button" className="button ghost" onClick={onDone}>Hủy</button><button className="button primary" disabled={pending}>{pending?'Đang đổi…':'Đổi mật khẩu'}</button></div></form>;
}
