import Link from 'next/link';
export default function NotFound() { return <main className="error-page"><h1>Trang này chưa có.</h1><p>Quay về hành trình học của bạn nhé.</p><Link href="/" className="button primary">Về trang hôm nay</Link></main>; }
