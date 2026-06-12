/**
 * base path（GitHub Pagesの /cs-edu-site/）を前置した内部リンクを作る。
 * 内部リンクは必ずこれを通すこと。直書きすると本番でリンク切れする。
 */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}
