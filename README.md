# DeepSeek Peak Hours

[![VS Code Marketplace](https://img.shields.io/vscode-marketplace/v/mervick.deepseek-peak-hours.svg?label=VS%20Code%20Marketplace&logo=visualstudiocode)](https://marketplace.visualstudio.com/items?itemName=mervick.deepseek-peak-hours)
[![VS Code version](https://img.shields.io/badge/VS%20Code-^1.85.0-blue?logo=visualstudiocode)](https://code.visualstudio.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![No API Key Required](https://img.shields.io/badge/No%20API%20Key-Required%3F%20No!-brightgreen)](https://github.com/mervick/deepseek-peak-hours)
[![Offline First](https://img.shields.io/badge/Offline-100%25-blue)](https://github.com/mervick/deepseek-peak-hours)

**Visual Studio Code extension** that displays DeepSeek API peak/off-peak status directly in your status bar — helping you optimize API costs by choosing the right time to run your workloads.

> **💡 No API Key Required** – Works completely offline using only UTC time. No registration, no internet needed.

<p align="center">
  <img src="assets/preview.png" alt="DeepSeek Peak Hours Preview" width="414" height="316" />
  <br />
  <sub>Real-time status hover preview in Dark Theme</sub>
</p>

## Why This Extension Matters

DeepSeek API uses **peak/off-peak pricing** to manage resource allocation efficiently. During peak hours, prices are **2×** the regular rate across all billing items. Off-peak rates are **half** of peak rates, making it significantly cheaper to run inference during low-traffic periods.

For example, with the flagship **DeepSeek-V4-Pro** model:
- **Peak hour** cost for 1M output tokens: **¥27.00**
- **Off-peak** cost for 1M output tokens: **¥13.50**

Being aware of when peak hours occur helps you:
- **Reduce costs** — schedule non-urgent batch jobs during off-peak hours
- **Avoid throttling** — peak periods may experience higher latency and stricter rate limits
- **Plan development** — align your API usage with cost-effective time windows

> **Official pricing details:** [DeepSeek API Models & Pricing](https://api-docs.deepseek.com/quick_start/pricing/)

---

## Peak Hours Schedule

| Time Zone | Peak Hours |
| :--- | :--- |
| **UTC** | 01:00–04:00 and 06:00–10:00 |
| **Beijing Time (UTC+8)** | 09:00–12:00 and 14:00–18:00 |

**Weekends** (Saturday–Sunday) are entirely off-peak  
All other hours outside the defined peak windows are off-peak  

---

## Features

- **Real‑time status** — displays Peak / Peak soon / Off‑peak soon / Off‑peak in the VS Code status bar

- **Color‑coded alerts**:
  - 🟥 **Peak** — Peak hours (higher cost, higher latency)
  - 🟨 **Buffer / soon** — Transition period (Peak soon or Off‑peak soon)
  - **Off‑peak** — lower cost, better performance
- **Hover preview** — hover over the status bar item to see a detailed dashboard with a countdown timer, timeline, and impact forecast.
- **Smart refresh** - updates every 5 minutes normally, and every **30 seconds** near scheduled transitions
- **Transition notifications** - optionally show a notification when the peak-hours status changes
- **Debug mode** - enable `deepseek-peak-hours.debug` for detailed logs; `deepseek-peak-hours.debugUtcTime` accepts an ISO UTC start time to simulate elapsed time

---

## Configuration

| Setting | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `deepseek-peak-hours.notifications` | boolean | `true` | Show notifications when the peak-hours status changes |
| `deepseek-peak-hours.peakSoonMinutes` | number | `5` | Minutes before peak starts to show "Peak soon" status |
| `deepseek-peak-hours.peakTransitionBufferMinutes` | number | `1` | Buffer zone length at peak boundaries |
| `deepseek-peak-hours.postPeakMinutes` | number | `5` | Minutes after peak ends to show "Off‑peak soon" |
| `deepseek-peak-hours.debug` | boolean | `false` | Enable debug logging |
| `deepseek-peak-hours.debugUtcTime` | string | `""` | ISO UTC start time for time simulation in debug mode |

---

## Requirements

- Visual Studio Code 1.85.0 or later
- No DeepSeek API key is required
- Internet access is not required

## Installation

Install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=mervick.deepseek-peak-hours) or search for `DeepSeek Peak Hours` in the Extensions view (`Ctrl+Shift+X`).
