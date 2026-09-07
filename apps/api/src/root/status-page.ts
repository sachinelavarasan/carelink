import { API_PREFIX } from '@carelink/shared';

export interface ServerStatus {
  /** `ok` when every dependency is healthy, `degraded` otherwise. */
  status: 'ok' | 'degraded';
  database: 'up' | 'down';
  environment: string;
  /** Process uptime in seconds. */
  uptimeSeconds: number;
  node: string;
  time: string;
}

/** `93784` → `1d 2h 3m 4s` (largest two non-zero units, or `0s`). */
export function formatUptime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const parts: Array<[number, string]> = [
    [Math.floor(total / 86_400), 'd'],
    [Math.floor((total % 86_400) / 3_600), 'h'],
    [Math.floor((total % 3_600) / 60), 'm'],
    [total % 60, 's'],
  ];
  const nonZero = parts.filter(([value]) => value > 0);
  const shown = (nonZero.length > 0 ? nonZero : [[0, 's'] as [number, string]]).slice(0, 2);
  return shown.map(([value, unit]) => `${value}${unit}`).join(' ');
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

/** Renders the root `/` server-status card as a standalone HTML document. */
export function renderStatusPage(status: ServerStatus): string {
  const healthy = status.status === 'ok';
  const accent = healthy ? '#16a34a' : '#d97706';
  const rows: Array<[string, string]> = [
    ['Status', status.status],
    ['Database', status.database],
    ['Environment', status.environment],
    ['Uptime', formatUptime(status.uptimeSeconds)],
    ['Node', status.node],
    ['API base', API_PREFIX],
    ['Checked at', status.time],
  ];

  const rowsHtml = rows
    .map(
      ([label, value]) =>
        `<div class="row"><span class="k">${escapeHtml(label)}</span>` +
        `<span class="v">${escapeHtml(value)}</span></div>`,
    )
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>CareLink API — ${escapeHtml(status.status)}</title>
<style>
  :root {
    color-scheme: light dark;
    --bg: #f4f5f7;
    --card: #ffffff;
    --border: #e3e5e9;
    --text: #1c1e21;
    --muted: #6b7280;
    --accent: ${accent};
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0e0f11;
      --card: #17191c;
      --border: #2a2d31;
      --text: #f1f2f4;
      --muted: #9aa0a6;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: var(--bg);
    color: var(--text);
  }
  .card {
    width: 100%;
    max-width: 420px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 24px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 8px 24px rgba(0, 0, 0, 0.06);
  }
  .head {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;
  }
  .dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 22%, transparent);
    flex: none;
  }
  .title { font-size: 16px; font-weight: 650; }
  .sub { color: var(--muted); font-size: 12px; margin-top: 2px; }
  .row {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 10px 0;
    border-top: 1px solid var(--border);
  }
  .row:first-of-type { border-top: none; }
  .k { color: var(--muted); }
  .v {
    font-variant-numeric: tabular-nums;
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
    text-align: right;
    word-break: break-word;
  }
</style>
</head>
<body>
  <main class="card">
    <div class="head">
      <span class="dot" aria-hidden="true"></span>
      <div>
        <div class="title">CareLink API</div>
        <div class="sub">${healthy ? 'All systems operational' : 'Running with degraded dependencies'}</div>
      </div>
    </div>
    ${rowsHtml}
  </main>
</body>
</html>`;
}
