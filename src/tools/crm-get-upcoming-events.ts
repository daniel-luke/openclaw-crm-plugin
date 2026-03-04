import type { PersonRegistry } from '../person-registry.js'

interface UpcomingEvent {
  date: string
  person_name: string
  person_id: string
  event_type: 'birthday' | 'event'
  description: string
  days_until: number
}

function getNextOccurrence(dateStr: string, recurring: boolean): Date | null {
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  if (recurring) {
    // Treat as yearly — find next occurrence of MM-DD
    const [, month, day] = dateStr.split('-').map(Number)
    const thisYear = new Date(now.getFullYear(), month - 1, day)
    if (thisYear >= now) return thisYear
    return new Date(now.getFullYear() + 1, month - 1, day)
  }

  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  if (d >= now) return d
  return null
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

export function makeGetUpcomingEventsTool(getRegistry: () => PersonRegistry) {
  return {
    name: 'crm_get_upcoming_events',
    description:
      'Get upcoming birthdays and special events across all contacts within a given timeframe. ' +
      'Useful for planning ahead and making sure you don\'t miss important dates.',
    parameters: {
      type: 'object' as const,
      properties: {
        days_ahead: {
          type: 'number',
          description: 'How many days into the future to look. Default: 30.',
        },
      },
      required: [],
    },
    async execute(
      _ctx: unknown,
      { days_ahead = 30 }: { days_ahead?: number },
    ): Promise<unknown> {
      const registry = getRegistry()
      await registry.ensureLoaded()

      const now = new Date()
      now.setHours(0, 0, 0, 0)
      const upcoming: UpcomingEvent[] = []

      for (const person of registry.getAllPeople()) {
        // Birthday (always recurring)
        if (person.birthday) {
          const next = getNextOccurrence(person.birthday, true)
          if (next) {
            const days = daysBetween(now, next)
            if (days <= days_ahead) {
              upcoming.push({
                date: next.toISOString().slice(0, 10),
                person_name: person.name,
                person_id: person.id,
                event_type: 'birthday',
                description: `${person.name}'s birthday`,
                days_until: days,
              })
            }
          }
        }

        // Special events
        for (const event of person.events ?? []) {
          const next = getNextOccurrence(event.date, event.recurring ?? false)
          if (next) {
            const days = daysBetween(now, next)
            if (days <= days_ahead) {
              upcoming.push({
                date: next.toISOString().slice(0, 10),
                person_name: person.name,
                person_id: person.id,
                event_type: 'event',
                description: event.description,
                days_until: days,
              })
            }
          }
        }
      }

      upcoming.sort((a, b) => a.days_until - b.days_until)

      return {
        events: upcoming,
        total: upcoming.length,
        days_ahead,
      }
    },
  }
}
