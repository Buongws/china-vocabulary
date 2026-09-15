import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'TNA · Cùng nhau học mỗi ngày', template: '%s · TNA Vocabulary' },
  description: 'Học tiếng Trung và tiếng Anh cùng nhau. Từ mới, ôn tập, luyện viết và những tiến bộ nhỏ mỗi ngày.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>;
}
