import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Pocket Atlas · 分子筛选工作台',
  description:
    'SMILES 结构聚类、分子可视化、对接与 MM/GBSA 分数比较及初筛候选筛选。',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
