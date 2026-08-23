import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import {
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


        // ? '#e51400'
        // : state === 'approaching' || state === 'postPeak'
        //   ? '#ffb900'


const TOOLTIP_COLORS = {
  background: '#202020',
  track: '#333',

  // peak: '#e5484d',
  peak: '#f44336',
  // peak: '#e51400',
  // buffer: '#f5a524',
  // buffer: '#ff9800',
  buffer: '#ffb900',
  // buffer: '#f44336',
  // offPeak: '#3dd68c',
  offPeak: '#4caf50',

  text: '#eee',
  textMuted: '#aaa',
  textDim: '#777',
  textDim1: '#888',
  marker: '#fff',
  legend: '#bbb',
};
const DEEPSEEK_LOGO = fs.readFileSync(path.join(__dirname, '..', 'media', 'deepseek.svg'), 'utf8')
  .replace(/<svg[^>]*>/, '')
  .replace('</svg>', '')
  .replace(/fill="#000"/g, 'fill="currentColor"');
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

    for (const [hour, entersPeak] of [
      [1, true],
      [4, false],
      [6, true],
      [10, false],
    ] as const) {
      day.setUTCHours(hour, 0, 0, 0);
      result.push({ time: day.getTime(), entersPeak });
    }
  }
  return result.sort((a, b) => a.time - b.time);
}

export function isPeakHours(date: Date): boolean {
  if (!isWeekday(date.getUTCDay())) return false;
  const minutes = date.getUTCHours() * 60 + date.getUTCMinutes();
  const buffer = getPeakTransitionBufferMinutes();
  return (
    (minutes >= 60 - buffer && minutes < 240) ||
    (minutes >= 360 - buffer && minutes < 600)
  );
}

function isPostPeakPeriod(date: Date): boolean {
  if (!isWeekday(date.getUTCDay())) return false;
  const minutes = date.getUTCHours() * 60 + date.getUTCMinutes();
  const postPeak = getPostPeakMinutes();
  return (
    (minutes >= 240 && minutes < 240 + postPeak) ||
    (minutes >= 600 && minutes < 600 + postPeak)
  );
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
  const intervals: Array<[number, number, string]> = weekday ? [[0, Math.max(0, 60 - buffer - soon), TOOLTIP_COLORS.offPeak], [Math.max(0, 60 - buffer - soon), 60 - buffer, TOOLTIP_COLORS.peak], [60 - buffer, 240, TOOLTIP_COLORS.peak], [240, 240 + postPeak, TOOLTIP_COLORS.peak], [240 + postPeak, Math.max(360 - buffer - soon, 240 + postPeak), TOOLTIP_COLORS.offPeak], [Math.max(360 - buffer - soon, 240 + postPeak), 360 - buffer, TOOLTIP_COLORS.peak], [360 - buffer, 600, TOOLTIP_COLORS.peak], [600, 600 + postPeak, TOOLTIP_COLORS.peak], [600 + postPeak, 1440, TOOLTIP_COLORS.offPeak]] : [[0, 1440, TOOLTIP_COLORS.offPeak]];
  const zones = intervals.filter(([from, to]) => to > from).map(([from, to, color]) => `<rect x="${barX + (from / 1440) * barW}" y="${barY}" width="${((to - from) / 1440) * barW}" height="${barH}" fill="${color}"/>`).join('');
  const statusColor = state === 'peak' ? TOOLTIP_COLORS.peak : state === 'offPeak' ? TOOLTIP_COLORS.offPeak : TOOLTIP_COLORS.buffer;
  const statusIcon = state === 'peak' ? '🔥' : state === 'offPeak' ? '✓' : '⚠';
  const time = `${date.toISOString().replace('T', ' ').slice(0, 19)} UTC`;
  const transitionTime = next ? new Date(next.time).toISOString().slice(11, 16) : '—';

  const timeScale = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'].map((label, index) => `<text x="${barX + (index / 6) * barW}" y="${barY + barH + 24 - 5}" fill="${TOOLTIP_COLORS.textDim1}" font-family="Segoe UI,sans-serif" font-size="9" text-anchor="${index === 0 ? 'start' : index === 6 ? 'end' : 'middle'}">${label}</text>`).join('');
  const description = t('peakHours.tooltip.description');
  const descriptionParts = description.split('|');

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="${TOOLTIP_COLORS.background}"/>
      <g color="${TOOLTIP_COLORS.text}" transform="translate(16 16) scale(.32)">${DEEPSEEK_LOGO}</g>
      <text x="36" y="28" fill="${TOOLTIP_COLORS.text}" font-family="Segoe UI,sans-serif" font-size="13" font-weight="500">Peak Hours</text>
      <text x="${width - 16}" y="28" fill="${statusColor}" font-family="Segoe UI,sans-serif" font-size="11" font-weight="600" text-anchor="end">${statusIcon} ${escapeXml(status.toUpperCase())}</text>
      <text x="${width / 2}" y="53" fill="${TOOLTIP_COLORS.textMuted}" font-family="Segoe UI,sans-serif" font-size="10" text-anchor="middle">${escapeXml(time)}</text>
      <text x="${width / 2}" y="83" fill="${TOOLTIP_COLORS.text}" font-family="Segoe UI,sans-serif" font-size="22" font-weight="700" text-anchor="middle">${escapeXml(countdown)}</text>
      <text x="${width / 2}" y="104" fill="${TOOLTIP_COLORS.textMuted}" font-family="Segoe UI,sans-serif" font-size="12" text-anchor="middle">${escapeXml(t('peakHours.tooltip.transitionAt', { transition, time: transitionTime }))}</text>
      <rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" fill="${TOOLTIP_COLORS.track}"/>
      ${zones}
      <line x1="${markerX}" y1="${barY - 8}" x2="${markerX}" y2="${barY + barH + 8}" stroke="${TOOLTIP_COLORS.marker}" stroke-width="2"/>
      <text x="${markerX}" y="${barY - 12}" fill="${TOOLTIP_COLORS.marker}" font-family="Segoe UI,sans-serif" font-size="9" text-anchor="middle">${escapeXml(t('peakHours.tooltip.youAreHere'))}</text>
      ${timeScale}
      <text x="16" y="${barY + barH + 40 + 4}" fill="${TOOLTIP_COLORS.legend}" font-family="Segoe UI,sans-serif" font-size="10">🟩 ${escapeXml(t('peakHours.tooltip.offPeak'))}    🟥 ${escapeXml(t('peakHours.tooltip.peak'))}</text>
      <text x="16" y="${barY + barH + 58 + 12}" fill="${TOOLTIP_COLORS.textDim}" font-family="Segoe UI,sans-serif" font-size="9">${escapeXml(descriptionParts[0])}</text>
      <text x="16" y="${barY + barH + 72 + 12}" fill="${TOOLTIP_COLORS.textDim}" font-family="Segoe UI,sans-serif" font-size="9">${escapeXml(descriptionParts[1] || '')}</text>
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
    this.item.color =
      state === 'peak'
        ? '#e51400'
        : state === 'approaching' || state === 'postPeak'
          ? '#ffb900'
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
