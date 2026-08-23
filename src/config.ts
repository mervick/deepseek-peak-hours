import * as vscode from 'vscode';

export function getConfig(): vscode.WorkspaceConfiguration {
  return vscode.workspace.getConfiguration('deepseek-peak-hours');
}

export function getShowPeakHours(): boolean {
  return getConfig().get<boolean>('peakHours.show', true);
}

let debugClockRaw = '';
let debugClockStartMs = 0;
let debugClockRealStartMs = 0;

export function getPeakHoursNow(): Date {
  const raw = (getConfig().get<string>('peakHours.debugUtcTime', '') || '').trim();
  const timestamp = raw ? Date.parse(raw) : Number.NaN;
  if (!Number.isFinite(timestamp)) {
    debugClockRaw = '';
    return new Date();
  }
  if (raw !== debugClockRaw) {
    debugClockRaw = raw;
    debugClockStartMs = timestamp;
    debugClockRealStartMs = Date.now();
    if (isPeakHoursDebugEnabled()) console.log('[deepseek-peak-hours] debug clock started:', raw);
  }
  const simulated = new Date(debugClockStartMs + Date.now() - debugClockRealStartMs);
  if (isPeakHoursDebugEnabled()) {
    console.log('[deepseek-peak-hours] time check:', 'real=', new Date().toISOString(), 'debugUtc=', simulated.toISOString());
  }
  return simulated;
}

export function isPeakHoursDebugEnabled(): boolean {
  return getConfig().get<boolean>('peakHours.debug', true);
}

export function getPeakSoonMinutes(): number {
  const value = getConfig().get<number>('peakHours.peakSoonMinutes', 10);
  return Math.max(0, Math.min(60, Math.round(value || 0)));
}

export function getPeakBoundaryRefreshMinutes(): number {
  const value = getConfig().get<number>('peakHours.boundaryRefreshMinutes', 5);
  return Math.max(0, Math.min(60, Math.round(value || 0)));
}

export function getPeakTransitionBufferMinutes(): number {
  const value = getConfig().get<number>('peakHours.peakTransitionBufferMinutes', 1);
  return Math.max(0, Math.min(60, Math.round(value || 0)));
}

export function getPostPeakMinutes(): number {
  const value = getConfig().get<number>('peakHours.postPeakMinutes', 2);
  return Math.max(0, Math.min(60, Math.round(value || 0)));
}
