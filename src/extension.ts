import * as vscode from 'vscode';
import { getPeakHoursNow } from './config';
import { getPeakHoursPollIntervalMs, PeakHoursStatusBar } from './peakHours';

let peakHoursTimer: NodeJS.Timeout | undefined;

function schedulePeakHours(statusBar: PeakHoursStatusBar): void {
  if (peakHoursTimer) clearTimeout(peakHoursTimer);
  peakHoursTimer = setTimeout(() => {
    statusBar.update();
    schedulePeakHours(statusBar);
  }, getPeakHoursPollIntervalMs(getPeakHoursNow()));
}

export function activate(context: vscode.ExtensionContext): void {
  const peakHoursStatusBar = new PeakHoursStatusBar();
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (!event.affectsConfiguration('deepseek-peak-hours.peakHours')) return;
      peakHoursStatusBar.refresh();
      schedulePeakHours(peakHoursStatusBar);
    }),
    peakHoursStatusBar
  );
  peakHoursStatusBar.update();
  schedulePeakHours(peakHoursStatusBar);
}

export function deactivate(): void {
  if (peakHoursTimer) clearTimeout(peakHoursTimer);
  peakHoursTimer = undefined;
}
