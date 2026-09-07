import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AppointmentStatus, DrugCategoryFlag } from '@carelink/shared';
import { describe, expect, it } from 'vitest';
import { appointmentStatusMeta, drugCategoryFlagMeta } from './statusBadge';
import { THEME_STORAGE_KEY, TOKEN_NAMES, type TokenName, tokens } from './tokens';

const here = dirname(fileURLToPath(import.meta.url));
const themeCss = readFileSync(resolve(here, '..', 'theme.css'), 'utf8');

function block(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`${escaped}\\s*\\{([^}]*)\\}`).exec(themeCss)?.[1] ?? '';
}

function varValue(body: string, name: TokenName): string | undefined {
  return new RegExp(`--${name}:\\s*([^;]+);`).exec(body)?.[1]?.trim();
}

describe('theme tokens', () => {
  it('light and dark define the same token names', () => {
    expect(Object.keys(tokens.dark).sort()).toEqual(Object.keys(tokens.light).sort());
  });

  it('every mirrored token exists in theme.css :root and .dark with a matching value', () => {
    const root = block(':root');
    const dark = block('.dark');
    for (const name of TOKEN_NAMES) {
      expect(varValue(root, name), `:root --${name}`).toBe(tokens.light[name]);
      expect(varValue(dark, name), `.dark --${name}`).toBe(tokens.dark[name]);
    }
  });

  it('the web no-flash script literal matches THEME_STORAGE_KEY', () => {
    // apps/web/index.html hardcodes this string in an inline <script>.
    expect(THEME_STORAGE_KEY).toBe('carelink.theme');
  });
});

describe('status badge meta', () => {
  it('covers every AppointmentStatus', () => {
    expect(Object.keys(appointmentStatusMeta).sort()).toEqual(
      Object.values(AppointmentStatus).sort(),
    );
  });

  it('covers every DrugCategoryFlag', () => {
    expect(Object.keys(drugCategoryFlagMeta).sort()).toEqual(Object.values(DrugCategoryFlag).sort());
  });
});
