import type { PersonEntry } from './person-registry.js'
import type { PersonRegistry } from './person-registry.js'
import { upsertCronJob } from './cron-client.js'

export interface ReminderConfig {
  reportingChannel?: string
}

/**
 * Returns the next occurrence of a yearly date (birthday or recurring event)
 * at 9:00 AM local time. If the date hasn't passed yet this year, returns
 * this year's occurrence; otherwise next year's.
 */
function nextYearlyOccurrence(monthDay: string): Date | null {
  // monthDay format: "MM-DD" extracted from "YYYY-MM-DD"
  const [monthStr, dayStr] = monthDay.split('-')
  const month = parseInt(monthStr, 10)
  const day = parseInt(dayStr, 10)
  if (isNaN(month) || isNaN(day)) return null

  const now = new Date()
  const thisYear = new Date(now.getFullYear(), month - 1, day, 9, 0, 0)
  if (thisYear > now) return thisYear
  return new Date(now.getFullYear() + 1, month - 1, day, 9, 0, 0)
}

function toIso(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}

export async function schedulePersonReminders(
  person: PersonEntry,
  config: ReminderConfig,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logger?: any,
): Promise<void> {
  const channelSuffix = config.reportingChannel
    ? ` Send the reminder via the ${config.reportingChannel} channel.`
    : ''

  // Schedule birthday reminder
  if (person.birthday) {
    const monthDay = person.birthday.slice(5) // "MM-DD"
    const next = nextYearlyOccurrence(monthDay)
    if (next) {
      try {
        await upsertCronJob({
          name: `crm-birthday-${person.id}`,
          at: toIso(next),
          message: `Today is ${person.name}'s birthday! Wish them a happy birthday.${channelSuffix}`,
          ...(config.reportingChannel ? { announceChannel: config.reportingChannel } : {}),
        })
        logger?.info(`[crm-plugin] Scheduled birthday reminder for ${person.name} at ${toIso(next)}`)
      } catch (err) {
        logger?.warn(`[crm-plugin] Failed to schedule birthday reminder for ${person.name}: ${errMsg(err)}`)
      }
    }
  }

  // Schedule event reminders
  for (const event of person.events ?? []) {
    let targetDate: Date | null = null

    if (event.recurring) {
      const monthDay = event.date.slice(5)
      targetDate = nextYearlyOccurrence(monthDay)
    } else {
      const d = new Date(event.date + 'T09:00:00')
      if (d > new Date()) targetDate = d
    }

    if (!targetDate) continue

    const eventSlug = event.description.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)
    try {
      await upsertCronJob({
        name: `crm-event-${person.id}-${eventSlug}`,
        at: toIso(targetDate),
        message: `Reminder for ${person.name}: ${event.description}.${channelSuffix}`,
        ...(config.reportingChannel ? { announceChannel: config.reportingChannel } : {}),
      })
      logger?.info(`[crm-plugin] Scheduled event reminder for ${person.name}: "${event.description}" at ${toIso(targetDate)}`)
    } catch (err) {
      logger?.warn(`[crm-plugin] Failed to schedule event reminder for ${person.name} (${event.description}): ${errMsg(err)}`)
    }
  }
}

export async function scheduleAllReminders(
  registry: PersonRegistry,
  config: ReminderConfig,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logger?: any,
): Promise<void> {
  await registry.ensureLoaded()
  const people = registry.getAllPeople()
  for (const person of people) {
    await schedulePersonReminders(person, config, logger)
  }
}
