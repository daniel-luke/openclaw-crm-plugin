import * as fs from 'node:fs'
import * as path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

interface StoredCronJob {
  jobId: string
  name?: string
}

export interface CronJobOptions {
  name: string
  at: string // ISO 8601 datetime, e.g. "2026-06-01T09:00:00"
  message: string
  announceChannel?: string
}

export interface CronJobResult {
  id: string
}

/**
 * Adds a one-shot cron job by invoking `openclaw cron add` via the CLI.
 * One-shot (--at) jobs auto-delete after success by default.
 */
export async function addCronJob(options: CronJobOptions): Promise<CronJobResult> {
  const args = [
    'cron', 'add',
    '--name', options.name,
    '--at', options.at,
    '--session', 'isolated',
    '--message', options.message,
  ]

  if (options.announceChannel) {
    args.push('--announce', '--channel', options.announceChannel)
  }

  const { stdout } = await execFileAsync('openclaw', args)

  const trimmed = stdout.trim()
  try {
    const parsed = JSON.parse(trimmed) as { id?: string }
    if (parsed.id) return { id: parsed.id }
  } catch {
    const match = trimmed.match(/\bid[:\s]+([a-zA-Z0-9_-]+)/i)
    if (match) return { id: match[1] }
  }

  return { id: trimmed || 'scheduled' }
}

function readStoredJobs(): StoredCronJob[] {
  const jobsPath = path.join(process.env.HOME ?? '/root', '.openclaw', 'cron', 'jobs.json')
  try {
    const data: unknown = JSON.parse(fs.readFileSync(jobsPath, 'utf-8'))
    if (Array.isArray(data)) return data as StoredCronJob[]
    // Handle {"jobs": [...]} envelope format
    if (data && typeof data === 'object' && 'jobs' in data && Array.isArray((data as Record<string, unknown>).jobs)) {
      return (data as Record<string, unknown>).jobs as StoredCronJob[]
    }
    return []
  } catch {
    return []
  }
}

async function removeCronJob(jobId: string): Promise<void> {
  await execFileAsync('openclaw', ['cron', 'remove', jobId])
}

/**
 * Like addCronJob, but first removes any existing job with the same name.
 * This prevents duplicate reminders when a contact is updated.
 */
export async function upsertCronJob(options: CronJobOptions): Promise<CronJobResult> {
  const existing = readStoredJobs().filter((j) => j.name === options.name)
  for (const job of existing) {
    try {
      await removeCronJob(job.jobId)
    } catch {
      // Ignore — job may have already run and been deleted
    }
  }
  return addCronJob(options)
}
