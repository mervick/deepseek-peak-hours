# DeepSeek Peak Hours

Shows DeepSeek peak/off-peak status as a separate VS Code status-bar item.

Peak hours are `01:00–04:00` and `06:00–10:00 UTC`, Monday through Friday. Weekends are off-peak.

The status is updated every five minutes normally and every 30 seconds around configured transitions. Peak is red, Peak soon and Off-peak soon are yellow, and Off-peak uses the normal theme color.

Enable `deepseek-peak-hours.peakHours.debug` for logs. `deepseek-peak-hours.peakHours.debugUtcTime` is an ISO UTC start time; real elapsed time advances from it.

Author: [Andrey Izman (mervick)](https://github.com/mervick)

Project: [github.com/mervick/deepseek-peak-hours](https://github.com/mervick/deepseek-peak-hours)
