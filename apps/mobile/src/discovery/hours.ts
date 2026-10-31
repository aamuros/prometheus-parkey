export type HoursStatus = 'open' | 'closed' | 'unknown'

type Interval = { start: number; end: number }
type Rule = { days: number[]; intervals: Interval[] }

const days = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const clock = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Manila',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})
const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function selectedDays(text: string): number[] | null {
  const selected: number[] = []
  for (const part of text.split(',')) {
    const endpoints = part.split('-')
    const first = days.indexOf(endpoints[0] ?? '')
    const last = days.indexOf(endpoints[1] ?? endpoints[0] ?? '')
    if (first < 0 || last < 0 || endpoints.length > 2) return null
    let day = first
    while (true) {
      if (selected.includes(day)) return null
      selected.push(day)
      if (day === last) break
      day = (day + 1) % 7
    }
  }
  return selected
}

function minute(text: string, end: boolean): number | null {
  if (!/^\d{2}:\d{2}$/.test(text)) return null
  const hour = Number(text.slice(0, 2))
  const minutes = Number(text.slice(3))
  if (end && hour === 24 && minutes === 0) return 1440
  return hour < 24 && minutes < 60 ? hour * 60 + minutes : null
}

function parseHours(source: string): Rule[] | null {
  const rules: Rule[] = []
  const assigned = new Set<number>()
  for (const raw of source.split(';')) {
    const text = raw.trim()
    const match = /^(?:([A-Za-z,-]+)\s+)?(off|closed|[\d:,\s-]+)$/.exec(text)
    if (!match) return null
    const selected = match[1] ? selectedDays(match[1]) : [0, 1, 2, 3, 4, 5, 6]
    const hours = match[2]
    if (!selected || !hours || selected.some((day) => assigned.has(day)))
      return null
    const intervals: Interval[] = []
    if (hours !== 'off' && hours !== 'closed') {
      for (const range of hours.split(',')) {
        const times = /^\s*(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})\s*$/.exec(range)
        if (!times?.[1] || !times[2]) return null
        const start = minute(times[1], false)
        const end = minute(times[2], true)
        // Equal endpoints are ambiguous; only an explicit 24/7 means all day.
        if (start === null || end === null || start === end) return null
        intervals.push({ start, end })
      }
    }
    for (const day of selected) assigned.add(day)
    rules.push({ days: selected, intervals })
  }
  // Overnight spill into an explicit closure needs richer OSM rule precedence.
  // Keep that entire expression unknown rather than guessing an override.
  for (const rule of rules) {
    if (!rule.intervals.some(({ start, end }) => end < start)) continue
    for (const day of rule.days)
      if (
        rules.some(
          (next) => !next.intervals.length && next.days.includes((day + 1) % 7),
        )
      )
        return null
  }
  return rules
}

/** A limited source schedule interpretation, never a live opening guarantee.
 * Unsupported OSM selectors, exceptions, comments and overlapping day rules
 * make the whole expression unknown, even if a supported fragment says open.
 */
export function hoursStatus(
  source: string | null,
  now: Date = new Date(),
): HoursStatus {
  if (!source?.trim() || !Number.isFinite(now.getTime())) return 'unknown'
  const text = source.trim()
  if (text === '24/7') return 'open'
  const rules = parseHours(text)
  if (!rules) return 'unknown'
  const parts = clock.formatToParts(now)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value
  const day = weekdays.indexOf(part('weekday') ?? '')
  const current = Number(part('hour')) * 60 + Number(part('minute'))
  if (day < 0 || !Number.isFinite(current)) return 'unknown'
  const yesterday = (day + 6) % 7
  for (const rule of rules) {
    for (const { start, end } of rule.intervals) {
      if (end > start) {
        if (rule.days.includes(day) && current >= start && current < end)
          return 'open'
      } else if (
        (rule.days.includes(day) && current >= start) ||
        (rule.days.includes(yesterday) && current < end)
      )
        return 'open'
    }
  }
  return 'closed'
}

export function hoursLabel(status: HoursStatus): string {
  return status === 'open'
    ? 'Open now'
    : status === 'closed'
      ? 'Closed'
      : 'Hours unknown'
}
