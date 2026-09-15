export function WorkspaceSkeleton() {
  return <div className="workspace-skeleton" role="status" aria-label="Đang tải không gian học tập">
    <aside className="skeleton-sidebar" aria-hidden="true"><div className="skeleton-block skeleton-logo" />{Array.from({ length: 7 }, (_, i) => <div key={i} className="skeleton-block skeleton-nav" />)}</aside>
    <div className="skeleton-body"><div className="skeleton-topbar" aria-hidden="true"><div className="skeleton-block skeleton-line" /></div>
      <main className="skeleton-content"><p className="muted">Đang mở sổ học của bạn…</p><div aria-hidden="true"><div className="skeleton-block skeleton-title" /><div className="skeleton-columns"><div><div className="skeleton-block skeleton-summary" /><div className="skeleton-tracks"><div className="skeleton-block skeleton-track" /><div className="skeleton-block skeleton-track" /></div></div><div className="skeleton-block skeleton-summary" /></div></div></main>
    </div>
  </div>;
}
