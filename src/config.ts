import * as vscode from 'vscode';

export function getConfig(): vscode.WorkspaceConfiguration {
  return vscode.workspace.getConfiguration('api-peak-hours-tracker');
}

let debugClockRaw = '';
let debugClockStartMs = 0;
let debugClockRealStartMs = 0;

export function getPeakHoursNow(): Date {
  if (!isPeakHoursDebugEnabled()) {
    debugClockRaw = '';
    return new Date();
  }

  const raw = (getConfig().get<string>('debugUtcTime', '') || '').trim();
  const timestamp = raw ? Date.parse(raw) : Number.NaN;
  if (!Number.isFinite(timestamp)) {
    debugClockRaw = '';
    return new Date();
  }
  if (raw !== debugClockRaw) {
    debugClockRaw = raw;
    debugClockStartMs = timestamp;
    debugClockRealStartMs = Date.now();
    console.log('[api-peak-hours-tracker] debug clock started:', raw);
  }
  const simulated = new Date(debugClockStartMs + Date.now() - debugClockRealStartMs);
  console.log('[api-peak-hours-tracker] time check:', 'real=', new Date().toISOString(), 'debugUtc=', simulated.toISOString());
  return simulated;
}

export function isPeakHoursDebugEnabled(): boolean {
  return getConfig().get<boolean>('debug', true);
}

export function getPeakSoonMinutes(): number {
  const value = getConfig().get<number>('peakSoonMinutes', 10);
  return Math.max(0, Math.min(30, Math.round(value || 0)));
}

export function getPeakTransitionBufferMinutes(): number {
  const value = getConfig().get<number>('peakTransitionBufferMinutes', 1);
  return Math.max(0, Math.min(20, Math.round(value || 0)));
}

export function getPostPeakMinutes(): number {
  const value = getConfig().get<number>('postPeakMinutes', 2);
  return Math.max(0, Math.min(20, Math.round(value || 0)));
}
