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
  peak: '#f44336',
  buffer: '#ffb900',
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
  peak: '#e51400',
  buffer: '#ff9800',
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


const PEAK_HOURS_LOGO = `<path d="m0.892 137c-0.06-2.28 0.14-4.52 0.6-6.71 2.11 2.14 4.38 4.12 6.81 5.94 15 9.97 32-0.44 43.6 18.6 0.77 0.42 1.36 0.23 1.79-0.55 6.73-22.7 30.8-14.4 38.8-34.9 0.62 0.26 1.05 0.71 1.27 1.36 3.68 9.35 3.81 18.8 0.38 28.2-4.19 11.3-11.1 15.7-20.4 22.3-9.31 8.12-4.75 19.4 3.11 26.5 25.6 23 59.2 12.3 85.9-2.31 51.4-28.6 93.1-59.3 156-51.4 15 1.82 41.4 6.84 38.4 27.5-10.5 61.7-64 103-123 113-0.86 0.04-1.14-0.32-0.86-1.08 2.25-3.47 4.36-7 6.33-10.6 51.4-10.9 97.4-47.4 107-101 0.33-1 0.09-1.79-0.73-2.37-19.6 2.41-37.7 11.2-51.7 25.2-16.4 19.1-27.5 36.9-52 47-0.39 0.34-0.65 0.76-0.76 1.27-8.07 37-36.7 71.6-77.5 69.6-0.8 0.05-1.46-0.17-1.99-0.68 20.8-19.1 19.8-47.4 44.7-63.7 1.27-0.73 2.47-1.53 3.63-2.41-0.3-0.31-0.68-0.43-1.14-0.34-8.71 1.74-15 6.17-22.2 10.9-28.7 4.07-56.5 2.55-83.6-8.34-0.6-0.28-1.2-0.3-1.8-0.08 0.16 0.42 0.43 0.76 0.81 1 21.8 15.1 45.9 24 72.3 26.8 0.32 0.3 0.37 0.64 0.16 1.03-1.05 2.55-2.1 5.1-3.16 7.65-0.33 0.73-0.9 1.14-1.7 1.23-53.9-5.33-107-41.3-120-96.2-4.09-10.7-14.2-13-24.1-16.1-14.3-5.97-24.4-20.2-24.6-35.8zm248 71c-0.13 10 13.6 10.7 14.4 0.5-0.51-9.54-13.1-9.99-14.4-0.5z" fill="currentColor"/>
  <path d="m93.1 199c9.76-23.6 19.7-47 30-70.4 0.3-0.25 0.59-0.24 0.87 0.04 5.47 9.87 11 19.7 16.6 29.5 0.4 0.68 0.92 0.81 1.55 0.39 12.4-39.1 24.6-78.2 36.7-117 1.6-0.55 0.93 2.77 1.52 3.61 8.63 27.1 17.4 54.1 26.2 81.1 0.62 1.31 1.26 1.28 1.91-0.1 6.76-12.6 13.5-25.2 20.2-37.7 0.32-0.53 0.77-0.68 1.33-0.46 8.19 17.1 16.3 34.3 24.4 51.5 0.37 0.69 0.48 1.41 0.35 2.17-3.81 1-7.57 2.19-11.3 3.57-0.61 0.2-1.19 0.17-1.76-0.11-4.18-8.21-8.18-16.5-12-24.9-0.79-1-1.52-0.95-2.19 0.16-7.67 14.1-15.2 28.2-22.6 42.5-0.59 0.54-1.06 0.48-1.42-0.2-7.59-23.6-15.2-47.2-23-70.8-0.94-2.95-2.73-0.1-3.08 1.33-10.7 34.3-21.3 68.7-31.8 103-6.29-11.3-12.6-22.6-19-33.9-0.69-1.41-1.52-1.52-2.48-0.34-5.77 13.6-11.6 27.2-17.3 40.7-0.32 0.44-0.75 0.65-1.29 0.62-2.3-0.3-11.2-2.17-12.4-3.89z" fill="currentColor" />
  <path d="m237 316c1.87-7.73 2.51-15.6 1.94-23.5 0.03-0.55 0.25-1.01 0.65-1.38 11.6-2.4 24.2-5.56 34.8-10.8 0.71 0.72-1.57 4.02-1.79 4.95-7.41 14.9-18.8 25.4-34.2 31.7-0.81 0.18-1.28-0.13-1.41-0.94z" fill="currentColor" />`;

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
      <g color="${colors.text}" transform="translate(16 13) scale(.042)">${PEAK_HOURS_LOGO}</g>
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
      '[deep-peak-hours-tracker] polling interval changed:',
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
      'deep-peak-hours-tracker.d1-peak-hours',
      vscode.StatusBarAlignment.Right,
      100
    );
    this.item.command = {
      command: 'workbench.action.openSettings',
      title: 'Open Deep Peak Hours Tracker settings',
      arguments: ['@ext:mervick.deep-peak-hours-tracker'],
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
    this.item.text = `$(deep-peak-hours-tracker-logo) ${text}`;
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
      console.log('[deep-peak-hours-tracker] state transition:', previous, '->', state);
    }
    if (!getConfig().get<boolean>('notifications', true)) return;

    if (state === 'peak') {
      if (isPeakHoursDebugEnabled()) console.log('[deep-peak-hours-tracker] notification: peak');
      void vscode.window.showWarningMessage(t('peakHours.notification.peak'));
    } else if (state === 'approaching' && previous !== 'peak') {
      // Do not notify when the clock moves from Peak back to Peak soon.
      if (isPeakHoursDebugEnabled()) console.log('[deep-peak-hours-tracker] notification: approaching');
      void vscode.window.showWarningMessage(
        t('peakHours.notification.approaching', { minutes: getPeakSoonMinutes() })
      );
    } else if (state === 'offPeak' && previous !== 'offPeak') {
      if (isPeakHoursDebugEnabled()) console.log('[deep-peak-hours-tracker] notification: offPeak');
      void vscode.window.showInformationMessage(t('peakHours.notification.offPeak'));
    }
  }
}
