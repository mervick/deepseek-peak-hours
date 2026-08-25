import * as vscode from 'vscode';
import {
  getConfig,
  getPeakHoursNow,
  getPeakSoonMinutes,
  getPeakTransitionBufferMinutes,
  getPostPeakMinutes,
  isPeakHoursDebugEnabled,
} from './config';
import { t } from './i18n';

const MINUTE_MS = 60_000;
const BOUNDARY_REFRESH_MINUTES = 5;
const NORMAL_INTERVAL_MS = 2 * MINUTE_MS;
const BOUNDARY_INTERVAL_MS = 30_000;
const HOUR = 60;
const PEAK_WINDOWS = [
  { start: 1 * HOUR, end: 4 * HOUR },
  { start: 6 * HOUR, end: 10 * HOUR },
] as const;


const DARK_COLORS = {
  track: '#333',
  // peak: '#e5484d',
  peak: '#f44336',
  // peak: '#e51400',
  // buffer: '#f5a524',
  // buffer: '#ff9800',
  buffer: '#ffb900',
  // offPeak: '#3dd68c',
  offPeak: '#4caf50',
  text: '#eee',
  textMuted: '#aaa',
  textDim: '#777',
  textDim1: '#888',
  marker: '#fff',
  legend: '#bbb',
};
const LIGHT_COLORS = {
  track: '#d0d0d0',
  // peak: '#c62828',
  // peak: '#D13438',
  peak: '#e51400',
  // buffer: '#a86100',
  // buffer: '#BF8700',
  buffer: '#ff9800',
  // offPeak: '#087f5b',
  offPeak: '#2DA44E',
  text: '#202020',
  textMuted: '#555555',
  textDim: '#666666',
  marker: '#202020',
  legend: '#444444',
};

function getThemeColors() {
  return vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Light
    ? LIGHT_COLORS
    : DARK_COLORS;
}


const DEEPSEEK_LOGO = `<path id="path" d="M48.8354 10.0479C48.3232 9.79199 48.1025 10.2798 47.8032 10.5278C47.7007 10.6079 47.6143 10.7119 47.5273 10.8076C46.7793 11.624 45.9048 12.1597 44.7622 12.0957C43.0923 12 41.666 12.5356 40.4058 13.8398C40.1377 12.2319 39.2476 11.272 37.8926 10.6558C37.1836 10.3359 36.4668 10.0156 35.9702 9.31982C35.6235 8.82373 35.5293 8.27197 35.356 7.72754C35.2456 7.3999 35.1353 7.06396 34.7651 7.00781C34.3633 6.94385 34.2056 7.2876 34.0479 7.57568C33.418 8.75195 33.1733 10.0479 33.1973 11.3599C33.2524 14.312 34.4736 16.6641 36.8999 18.3359C37.1758 18.5278 37.2466 18.7197 37.1597 19C36.9946 19.5757 36.7974 20.1357 36.624 20.7119C36.5137 21.0801 36.3486 21.1597 35.9624 21C34.6309 20.4321 33.481 19.5918 32.4644 18.5757C30.7393 16.8721 29.1792 14.9917 27.2334 13.52C26.7764 13.1758 26.3193 12.856 25.8467 12.5518C23.8618 10.584 26.1069 8.96777 26.627 8.77588C27.1704 8.57568 26.8159 7.8877 25.0591 7.896C23.3022 7.90381 21.6953 8.50391 19.647 9.30371C19.3477 9.42383 19.0322 9.51172 18.7095 9.58398C16.8501 9.22363 14.9199 9.14355 12.9033 9.37598C9.10596 9.80762 6.07275 11.6396 3.84326 14.7681C1.16455 18.5278 0.53418 22.7998 1.30664 27.2559C2.11768 31.9521 4.46582 35.8398 8.07373 38.8799C11.8159 42.0322 16.1255 43.5762 21.041 43.2803C24.0269 43.104 27.3516 42.6963 31.1016 39.4561C32.0469 39.936 33.0396 40.1279 34.686 40.272C35.9546 40.3921 37.1758 40.208 38.1211 40.0078C39.6021 39.688 39.4995 38.2881 38.9639 38.0322C34.623 35.9678 35.5762 36.8081 34.71 36.1279C36.9155 33.4639 40.2402 30.6958 41.54 21.728C41.6426 21.0161 41.5557 20.5679 41.54 19.9917C41.5322 19.6396 41.6108 19.5039 42.0049 19.4639C43.0923 19.3359 44.1479 19.0317 45.1167 18.4878C47.9292 16.9199 49.064 14.3438 49.3315 11.2559C49.3711 10.7837 49.3237 10.2959 48.8354 10.0479ZM24.3262 37.8398C20.1196 34.4639 18.0791 33.3521 17.2358 33.3999C16.4482 33.4482 16.5898 34.3682 16.7632 34.9678C16.9443 35.5601 17.1812 35.9683 17.5117 36.4878C17.7402 36.832 17.8979 37.3442 17.2832 37.728C15.9282 38.584 13.5728 37.4399 13.4624 37.3838C10.7207 35.7358 8.42822 33.5601 6.81348 30.584C5.25342 27.7197 4.34766 24.6479 4.19775 21.3677C4.1582 20.5757 4.38672 20.2959 5.15869 20.1519C6.17529 19.96 7.22314 19.9199 8.23926 20.0718C12.5327 20.7119 16.1885 22.6719 19.2529 25.7759C21.002 27.5439 22.3252 29.6558 23.6885 31.7202C25.1377 33.9121 26.6978 36 28.6831 37.7119C29.3843 38.312 29.9434 38.7681 30.479 39.104C28.8643 39.2881 26.1699 39.3281 24.3262 37.8398ZM26.3433 24.6001C26.3433 24.248 26.6191 23.9678 26.9658 23.9678C27.0444 23.9678 27.1152 23.9839 27.1782 24.0078C27.2651 24.04 27.3438 24.0879 27.4067 24.1602C27.5171 24.272 27.5801 24.4321 27.5801 24.6001C27.5801 24.9521 27.3042 25.2319 26.9575 25.2319C26.6108 25.2319 26.3433 24.9521 26.3433 24.6001ZM32.6064 27.8799C32.2046 28.0479 31.8027 28.1919 31.4165 28.208C30.8179 28.2397 30.1641 27.9922 29.8096 27.688C29.2583 27.2158 28.8643 26.9521 28.6987 26.1279C28.6279 25.7759 28.6675 25.2319 28.7305 24.9199C28.8721 24.248 28.7144 23.8159 28.2495 23.4238C27.8716 23.104 27.3911 23.0161 26.8633 23.0161C26.666 23.0161 26.4849 22.9277 26.3511 22.856C26.1304 22.7441 25.9492 22.4639 26.1226 22.1201C26.1777 22.0078 26.4458 21.7358 26.5088 21.688C27.2256 21.272 28.0527 21.4077 28.8169 21.7197C29.5259 22.0161 30.0615 22.5601 30.834 23.3281C31.6216 24.2559 31.7632 24.5117 32.2124 25.208C32.5669 25.752 32.8901 26.312 33.1104 26.9521C33.2446 27.3521 33.0713 27.6802 32.6064 27.8799Z" fill="currentColor" fill-opacity="1.000000" fill-rule="nonzero"/>`;
let lastPollIntervalMs: number | undefined;

export type PeakHoursState = 'peak' | 'approaching' | 'postPeak' | 'offPeak';

interface Transition {
  time: number;
  entersPeak: boolean;
}

function isWeekday(day: number): boolean {
  return day >= 1 && day <= 5;
}

function transitionsAround(now: Date): Transition[] {
  const result: Transition[] = [];
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);

  // Include a few days on either side so Friday/Monday weekend boundaries work.
  for (let offset = -2; offset <= 8; offset += 1) {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + offset);
    if (!isWeekday(day.getUTCDay())) continue;

    for (const window of PEAK_WINDOWS) {
      day.setUTCHours(Math.floor(window.start / 60), window.start % 60, 0, 0);
      result.push({ time: day.getTime(), entersPeak: true });
      day.setUTCHours(Math.floor(window.end / 60), window.end % 60, 0, 0);
      result.push({ time: day.getTime(), entersPeak: false });
    }
  }
  return result.sort((a, b) => a.time - b.time);
}

export function isPeakHours(date: Date): boolean {
  if (!isWeekday(date.getUTCDay())) return false;
  const minutes = date.getUTCHours() * 60 + date.getUTCMinutes();
  const buffer = getPeakTransitionBufferMinutes();
  return PEAK_WINDOWS.some(({ start, end }) => minutes >= start - buffer && minutes < end);
}

function isPostPeakPeriod(date: Date): boolean {
  if (!isWeekday(date.getUTCDay())) return false;
  const minutes = date.getUTCHours() * 60 + date.getUTCMinutes();
  const postPeak = getPostPeakMinutes();
  return PEAK_WINDOWS.some(({ end }) => minutes >= end && minutes < end + postPeak);
}

function formatCountdown(ms: number): string {
  const totalMinutes = Math.max(0, Math.ceil(ms / MINUTE_MS));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function escapeXml(value: string): string {
  return value.replace(/[<&>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char] || char));
}

function buildTooltip(date: Date, state: PeakHoursState): vscode.MarkdownString {
  const transitions = transitionsAround(date);
  const next = transitions.find((transition) => transition.time > date.getTime());
  const status =
    state === 'peak'
      ? t('peakHours.peak')
      : state === 'approaching'
        ? t('peakHours.approaching')
        : state === 'postPeak'
          ? t('peakHours.postPeak')
          : t('peakHours.offPeak');
  const transition = next
    ? next.entersPeak
      ? t('peakHours.peak')
      : t('peakHours.offPeak')
    : t('peakHours.offPeak');
  const countdown = next ? formatCountdown(next.time - date.getTime()) : '—';
  const colors = getThemeColors();
  const width = 320;
  const height = 260;
  const barX = 16;
  const barY = 138;
  const barW = width - 32;
  const barH = 28;
  const nowMinutes = date.getUTCHours() * 60 + date.getUTCMinutes();
  const weekday = isWeekday(date.getUTCDay());
  const soon = getPeakSoonMinutes();
  const buffer = getPeakTransitionBufferMinutes();
  const postPeak = getPostPeakMinutes();
  const markerX = barX + (nowMinutes / 1440) * barW;
  const intervals: Array<[number, number, string]> = [];
  if (weekday) {
    let cursor = 0;
    for (const window of PEAK_WINDOWS) {
      const soonStart = Math.max(cursor, window.start - buffer - soon);
      if (cursor < soonStart) intervals.push([cursor, soonStart, colors.offPeak]);
      if (soonStart < window.start - buffer) intervals.push([soonStart, window.start - buffer, colors.peak]);
      if (window.start - buffer < window.end) intervals.push([window.start - buffer, window.end, colors.peak]);
      if (window.end < window.end + postPeak) intervals.push([window.end, window.end + postPeak, colors.peak]);
      cursor = window.end + postPeak;
    }
    if (cursor < 1440) intervals.push([cursor, 1440, colors.offPeak]);
  } else {
    intervals.push([0, 1440, colors.offPeak]);
  }
  const zones = intervals.filter(([from, to]) => to > from).map(([from, to, color]) => `<rect x="${barX + (from / 1440) * barW}" y="${barY}" width="${((to - from) / 1440) * barW}" height="${barH}" fill="${color}"/>`).join('');
  const statusColor = state === 'peak' ? colors.peak : state === 'offPeak' ? colors.offPeak : colors.buffer;
  const statusIcon = state === 'peak' ? '🔥' : state === 'offPeak' ? '✅' : '🟡';
  const time = `${date.toISOString().replace('T', ' ').slice(0, 19)} UTC`;
  const transitionTime = next ? new Date(next.time).toISOString().slice(11, 16) : '—';

  const timeScale = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'].map((label, index) => `<text x="${barX + (index / 6) * barW}" y="${barY + barH + 24 - 5}" fill="${colors.textDim}" font-family="Segoe UI,sans-serif" font-size="9" text-anchor="${index === 0 ? 'start' : index === 6 ? 'end' : 'middle'}">${label}</text>`).join('');
  const description = t('peakHours.tooltip.description');
  const descriptionParts = description.split('|');

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <g color="${colors.text}" transform="translate(16 16) scale(.32)">${DEEPSEEK_LOGO}</g>
      <text x="36" y="28" fill="${colors.text}" font-family="Segoe UI,sans-serif" font-size="13" font-weight="500">Peak Hours</text>
      <text x="${width - 16}" y="27" fill="${statusColor}" font-family="Segoe UI,sans-serif" font-size="11" font-weight="600" text-anchor="end">${statusIcon} ${escapeXml(status.toUpperCase())}</text>
      <text x="${width / 2}" y="53" fill="${colors.textMuted}" font-family="Segoe UI,sans-serif" font-size="10" text-anchor="middle">${escapeXml(time)}</text>
      <text x="${width / 2}" y="83" fill="${colors.text}" font-family="Segoe UI,sans-serif" font-size="22" font-weight="700" text-anchor="middle">${escapeXml(countdown)}</text>
      <text x="${width / 2}" y="104" fill="${colors.textMuted}" font-family="Segoe UI,sans-serif" font-size="12" text-anchor="middle">${escapeXml(t('peakHours.tooltip.transitionAt', { transition, time: transitionTime }))}</text>
      <rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" fill="${colors.track}"/>
      ${zones}
      <line x1="${markerX}" y1="${barY - 8}" x2="${markerX}" y2="${barY + barH + 8}" stroke="${colors.marker}" stroke-width="2"/>
      <text x="${markerX}" y="${barY - 12}" fill="${colors.marker}" font-family="Segoe UI,sans-serif" font-size="9" text-anchor="middle">${escapeXml(t('peakHours.tooltip.youAreHere'))}</text>
      ${timeScale}
      <text x="16" y="${barY + barH + 40 + 4}" fill="${colors.legend}" font-family="Segoe UI,sans-serif" font-size="10" xml:space="preserve">🟩 ${escapeXml(t('peakHours.tooltip.offPeak'))}   🟥 ${escapeXml(t('peakHours.tooltip.peak'))}</text>
      <text x="16" y="${barY + barH + 58 + 12}" fill="${colors.textDim}" font-family="Segoe UI,sans-serif" font-size="9">${escapeXml(descriptionParts[0])}</text>
      <text x="16" y="${barY + barH + 72 + 12}" fill="${colors.textDim}" font-family="Segoe UI,sans-serif" font-size="9">${escapeXml(descriptionParts[1] || '')}</text>
    </svg>
  `;


  const tooltip = new vscode.MarkdownString();
  tooltip.isTrusted = false;
  tooltip.supportHtml = true;
  tooltip.appendMarkdown(`![DeepSeek peak hours](data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}|width=${width})`);
  return tooltip;
}

function isNearBoundary(now: number, transitions: Transition[]): boolean {
  const refreshMs = BOUNDARY_REFRESH_MINUTES * MINUTE_MS;
  const soonMs = getPeakSoonMinutes() * MINUTE_MS;
  return transitions.some((transition) => {
    const delta = transition.time - now;
    // Begin fast polling before the Peak soon window, and keep it briefly
    // after the transition so the status changes promptly in both directions.
    return (
      (delta >= 0 && delta <= soonMs + refreshMs) ||
      (delta < 0 && -delta <= refreshMs)
    );
  });
}

export function getPeakHoursState(date: Date): PeakHoursState {
  const now = date.getTime();
  if (isPeakHours(date)) return 'peak';
  if (isPostPeakPeriod(date)) return 'postPeak';

  const nextPeak = transitionsAround(date).find(
    (transition) => transition.time > now && transition.entersPeak
  );
  if (nextPeak && nextPeak.time - now <= getPeakSoonMinutes() * MINUTE_MS) return 'approaching';
  return 'offPeak';
}

export function getPeakHoursPollIntervalMs(date: Date): number {
  const interval = isNearBoundary(date.getTime(), transitionsAround(date))
    ? BOUNDARY_INTERVAL_MS
    : NORMAL_INTERVAL_MS;
  if (isPeakHoursDebugEnabled() && interval !== lastPollIntervalMs) {
    lastPollIntervalMs = interval;
    console.log(
      '[deepseek-peak-hours] polling interval changed:',
      interval === BOUNDARY_INTERVAL_MS ? '30 seconds' : '5 minutes',
      'at',
      date.toISOString()
    );
  }
  return interval;
}

/** Separate status-bar item showing DeepSeek peak/off-peak state. */
export class PeakHoursStatusBar implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;
  private previousState: PeakHoursState | undefined;

  constructor() {
    // Keep this item separate from other status-bar indicators.
    this.item = vscode.window.createStatusBarItem(
      'deepseek-peak-hours.d1-peak-hours',
      vscode.StatusBarAlignment.Right,
      100
    );
    this.item.command = {
      command: 'workbench.action.openSettings',
      title: 'Open DeepSeek Peak Hours settings',
      arguments: ['@ext:mervick.deepseek-peak-hours'],
    };
    this.item.tooltip = t('peakHours.tooltip');
    this.item.show();
  }

  update(date = getPeakHoursNow()): void {
    const state = getPeakHoursState(date);
    const text =
      state === 'peak'
        ? t('peakHours.peak')
        : state === 'approaching'
          ? t('peakHours.approaching')
          : state === 'postPeak'
            ? t('peakHours.postPeak')
            : t('peakHours.offPeak');
    this.item.text = `$(deepseek-logo) ${text}`;
    this.item.tooltip = buildTooltip(date, state);
    const colors = getThemeColors();
    this.item.color =
      state === 'peak'
        ? colors.peak // '#e51400'
        : state === 'approaching' || state === 'postPeak'
          ? colors.buffer //'#ffb900'
          : undefined;
    this.item.show();
    this.notifyStateChange(state);
  }

  refresh(): void {
    this.update();
  }

  dispose(): void {
    this.item.dispose();
  }

  private notifyStateChange(state: PeakHoursState): void {
    const previous = this.previousState;
    this.previousState = state;
    if (!previous || previous === state) return;

    if (isPeakHoursDebugEnabled()) {
      console.log('[deepseek-peak-hours] state transition:', previous, '->', state);
    }
    if (!getConfig().get<boolean>('notifications', true)) return;

    if (state === 'peak') {
      if (isPeakHoursDebugEnabled()) console.log('[deepseek-peak-hours] notification: peak');
      void vscode.window.showWarningMessage(t('peakHours.notification.peak'));
    } else if (state === 'approaching' && previous !== 'peak') {
      // Do not notify when the clock moves from Peak back to Peak soon.
      if (isPeakHoursDebugEnabled()) console.log('[deepseek-peak-hours] notification: approaching');
      void vscode.window.showWarningMessage(
        t('peakHours.notification.approaching', { minutes: getPeakSoonMinutes() })
      );
    } else if (state === 'offPeak' && previous !== 'offPeak') {
      if (isPeakHoursDebugEnabled()) console.log('[deepseek-peak-hours] notification: offPeak');
      void vscode.window.showInformationMessage(t('peakHours.notification.offPeak'));
    }
  }
}
