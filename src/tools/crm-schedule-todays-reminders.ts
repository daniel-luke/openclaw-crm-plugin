import type { PersonRegistry } from '../person-registry.js'
import type { ReminderConfig } from '../reminder-scheduler.js'
import { addCronJob } from '../cron-client.js'

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function todayMonthDay(): string {
  return todayIso().slice(5) // "MM-DD"
}

function todayDateStamp(): string {
  return todayIso().replace(/-/g, '') // "YYYYMMDD"
}

function nineAmToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T09:00:00`
}

function isNineAmPassed(): boolean {
  const d = new Date()
  return d.getHours() >= 9
}

export function makeScheduleTodaysRemindersTool(
  getRegistry: () => PersonRegistry,
  getConfig: () => ReminderConfig,
) {
  return {
    name: 'crm_schedule_todays_reminders',
    description:
      'Check all CRM contacts for birthdays and special events happening today and schedule 09:00 AM reminders for each one found. ' +
      'This is automatically called by the daily check at 00:01 AM. ' +
      'You can also call it manually to trigger reminder scheduling for the current day.',
    parameters: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
    async execute(_ctx: unknown): Promise<unknown> {
      const registry = getRegistry()
      await registry.ensureLoaded()

      const config = getConfig()
      const today = todayIso()         // "YYYY-MM-DD"
      const todayMD = todayMonthDay()  // "MM-DD"
      const stamp = todayDateStamp()   // "YYYYMMDD" — makes job name unique per day
      const channelSuffix = config.reportingChannel
        ? ` Send the reminder via the ${config.reportingChannel} channel.`
        : ''

      const scheduled: string[] = []
      const skipped: string[] = []

      if (isNineAmPassed()) {
        return {
          scheduled: [],
          skipped: ['09:00 AM has already passed today — no reminders scheduled'],
          note: 'Run again tomorrow at 00:01 via the daily check.',
        }
      }

      const at = nineAmToday()

      for (const person of registry.getAllPeople()) {
        // Collect all of today's occasions for this person into one list
        const occasions: string[] = []

        if (person.birthday && person.birthday.slice(5) === todayMD) {
          occasions.push(`it's ${person.name}'s birthday`)
        }

        for (const event of person.events ?? []) {
          const isToday = event.recurring
            ? event.date.slice(5) === todayMD
            : event.date === today
          if (isToday) occasions.push(event.description)
        }

        if (occasions.length === 0) continue

        // One combined cron job per person
        const jobName = `crm-reminder-${person.id}-${stamp}`
        const occasionText = occasions.join(' and ')
        const message = `Reminder for ${person.name}: ${occasionText}.${channelSuffix}`

        try {
          await addCronJob({
            name: jobName,
            at,
            message,
            ...(config.reportingChannel ? { announceChannel: config.reportingChannel } : {}),
          })
          scheduled.push(`${person.name}: ${occasionText}`)
        } catch (err) {
          skipped.push(`${person.name} (${err instanceof Error ? err.message : String(err)})`)
        }
      }

      return {
        date: today,
        scheduled,
        skipped,
        reminder_time: '09:00 AM today',
      }
    },
  }
}
