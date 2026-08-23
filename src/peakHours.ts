import * as vscode from 'vscode';
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
const NORMAL_INTERVAL_MS = 5 * MINUTE_MS;
const BOUNDARY_INTERVAL_MS = 30_000;
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

function getDayTimeline(date: Date): string {
  const width = 48;
  const nowMinutes = date.getUTCHours() * 60 + date.getUTCMinutes();
  const weekday = isWeekday(date.getUTCDay());
  const soon = getPeakSoonMinutes();
  const buffer = getPeakTransitionBufferMinutes();
  const postPeak = getPostPeakMinutes();
  const cells: string[] = [];

  for (let cell = 0; cell < width; cell += 1) {
    const minute = Math.floor((cell * 24 * 60) / width);
    const peak = weekday && ((minute >= 60 - buffer && minute < 240) || (minute >= 360 - buffer && minute < 600));
    const post = weekday && ((minute >= 240 && minute < 240 + postPeak) || (minute >= 600 && minute < 600 + postPeak));
    const approaching = weekday && (
      (minute >= Math.max(0, 60 - buffer - soon) && minute < 60 - buffer) ||
      (minute >= 360 - buffer - soon && minute < 360 - buffer)
    );
    const marker = Math.min(width - 1, Math.floor((nowMinutes * width) / (24 * 60)));
    cells.push(cell === marker ? '🔻' : peak ? '🟥' : post || approaching ? '🟧' : '🟩');
  }
  return cells.join('');
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
  const tooltip = new vscode.MarkdownString();
  tooltip.isTrusted = false;
  tooltip.appendMarkdown(`$(deepseek-logo) **${status.toUpperCase()}**  \n`);
  tooltip.appendMarkdown(`● ${t('peakHours.tooltip.currentTime', { time: `${date.toISOString().replace('T', ' ').slice(0, 19)} UTC` })}  \n\n`);
  tooltip.appendMarkdown(`### ${countdown} ${t('peakHours.tooltip.until', { transition })}  \n`);
  tooltip.appendMarkdown(`${t('peakHours.tooltip.transitionAt', { transition, time: next ? new Date(next.time).toISOString().slice(11, 16) : '—' })}  \n\n`);
  tooltip.appendMarkdown(`${getDayTimeline(date)}  \n`);
  tooltip.appendMarkdown(`00:00               12:00               24:00  \n`);
  tooltip.appendMarkdown(`🔻 ${t('peakHours.tooltip.youAreHere')}  \n`);
  tooltip.appendMarkdown(`🟩 ${t('peakHours.tooltip.offPeak')}   🟧 ${t('peakHours.tooltip.buffer')}   🟥 ${t('peakHours.tooltip.peak')}  \n\n`);
  tooltip.appendMarkdown(`**${t('peakHours.tooltip.schedule')}**  \n${t('peakHours.tooltip.description')}`);
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
