import { addCronJob, readStoredJobs } from './cron-client.js'

export interface ReminderConfig {
  reportingChannel?: string
}

/**
 * Registers a single recurring cron job that runs at 00:01 every day.
 * That job calls crm_schedule_todays_reminders, which creates 09:00 AM
 * one-shot reminders for any birthdays or events happening that same day.
 *
 * If the job already exists in jobs.json, this is a no-op.
 */
export async function scheduleDailyCheck(
  config: ReminderConfig,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logger?: any,
): Promise<void> {
  const existing = readStoredJobs().find((j) => j.name === 'crm-daily-check')
  if (existing) {
    logger?.info('[crm-plugin] Daily reminder check already registered, skipping')
    return
  }

  try {
    await addCronJob({
      name: 'crm-daily-check',
      cron: '1 0 * * *', // every day at 00:01
      message:
        "Call crm_schedule_todays_reminders to check for today's birthdays and special events and schedule their 09:00 AM reminders.",
      ...(config.reportingChannel ? { announceChannel: config.reportingChannel } : {}),
    })
    logger?.info('[crm-plugin] Registered daily CRM reminder check at 00:01')
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger?.warn(`[crm-plugin] Failed to register daily reminder check: ${msg}`)
  }
}
