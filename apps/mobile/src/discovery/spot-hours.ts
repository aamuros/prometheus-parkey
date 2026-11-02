import OpeningHours from 'opening_hours'
import timezone from 'tz-lookup'
import type { Coordinate } from '@parkey/shared-types'

export type WeekDay = { day: string; hours: string; today: boolean }

/** opening_hours evaluates wall-clock Dates. Supply the spot's wall clock,
 * never the phone's timezone. No remote geocoding or timezone request. */
export function spotHours(
  source: string | undefined,
  point: Coordinate,
  now = new Date(),
): { summary?: string; week?: WeekDay[] } {
  if (!source) return {}
  try {
    const zone = timezone(point[1], point[0])
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now)
    const part = (key: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((p) => p.type === key)?.value)
    const local = new Date(
      part('year'),
      part('month') - 1,
      part('day'),
      part('hour'),
      part('minute'),
      part('second'),
    )
    // Holiday-dependent expressions without authoritative local holiday context
    // are omitted rather than guessed.
    const parser = new OpeningHours(source)
    if (parser.getUnknown(local)) return {}
    const time = (date: Date) =>
      date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: date.getMinutes() ? '2-digit' : undefined,
      })
    const next = parser.getNextChange(local)
    const open = parser.getState(local)
    const sameDay = next?.toDateString() === local.toDateString()
    const when = next
      ? `${sameDay ? '' : next.toLocaleDateString('en-US', { weekday: 'short' }) + ' '}${time(next)}`
      : ''
    const summary =
      source.trim() === '24/7'
        ? 'Open 24 hours'
        : `${open ? 'Open now' : 'Closed'}${next ? ` · ${open ? 'closes' : 'opens'} ${when}` : ''}`
    const monday = new Date(
      local.getFullYear(),
      local.getMonth(),
      local.getDate() - ((local.getDay() + 6) % 7),
    )
    const week = Array.from({ length: 7 }, (_, index) => {
      const start = new Date(
        monday.getFullYear(),
        monday.getMonth(),
        monday.getDate() + index,
      )
      const end = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate() + 1,
      )
      const intervals = parser.getOpenIntervals(start, end)
      if (intervals.some((i) => i[2])) throw new Error('Uncertain schedule')
      return {
        day: start.toLocaleDateString('en-US', { weekday: 'long' }),
        today: start.toDateString() === local.toDateString(),
        hours:
          source.trim() === '24/7'
            ? 'Open 24 hours'
            : intervals
                .map(
                  ([a, b]) =>
                    `${time(a)}–${b.getTime() === end.getTime() ? 'midnight' : time(b)}`,
                )
                .join(', ') || 'Closed',
      }
    })
    return { summary, week }
  } catch {
    return {}
  }
}
