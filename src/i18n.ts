import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export type LanguageSetting = 'auto' | 'en' | 'zh-cn';
export type Locale = 'en' | 'zh-cn';

const LOCALES_DIR = path.join(__dirname, '..', 'locales');
const cache = new Map<Locale, Record<string, string>>();

/** Read the language setting; auto is the default. */
export function getLanguageSetting(): LanguageSetting {
  const v = vscode.workspace
    .getConfiguration('api-peak-hours-tracker')
    .get<string>('language', 'auto');
  return v === 'en' || v === 'zh-cn' ? v : 'auto';
}

/** Follow the VS Code display language when the setting is automatic. */
export function getVscodeLocale(): Locale {
  const lang = (vscode.env.language || 'en').toLowerCase();
  return lang.startsWith('zh') ? 'zh-cn' : 'en';
}

/** Resolve the effective locale; auto follows the VS Code display language. */
export function resolveLocale(): Locale {
  const setting = getLanguageSetting();
  return setting === 'auto' ? getVscodeLocale() : setting;
}

function loadMessages(locale: Locale): Record<string, string> {
  const cached = cache.get(locale);
  if (cached) return cached;
  let messages: Record<string, string> = {};
  try {
    const file = path.join(LOCALES_DIR, `${locale}.json`);
    messages = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, string>;
  } catch (e) {
    console.error('[api-peak-hours-tracker] Failed to load locale', locale, e);
  }
  cache.set(locale, messages);
  return messages;
}

/** Return the active locale code. */
export function getLocale(): Locale {
  return resolveLocale();
}

/**
 * Get a translated message with {name} interpolation and English/key fallback.
 * The setting is resolved on every call, so language changes do not require a restart.
 */
export function t(
  key: string,
  params?: Record<string, string | number>
): string {
  const locale = resolveLocale();
  let msg = loadMessages(locale)[key] ?? (locale === 'en' ? key : loadMessages('en')[key] ?? key);
  if (params) {
    msg = msg.replace(/\{(\w+)\}/g, (m, name: string) =>
      name in params ? String(params[name]) : m
    );
  }
  return msg;
}
