import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export interface CronJobOptions {
  name: string
  at: string // ISO 8601 datetime, e.g. "2026-06-01T09:00:00"
  message: string
  deleteAfterRun?: boolean
  announceChannel?: string
}

export interface CronJobResult {
  id: string
}

/**
 * Adds a one-shot cron job by invoking `openclaw cron add` via the CLI.
 * This works because the plugin runs inside the OpenClaw server environment.
 */
export async function addCronJob(options: CronJobOptions): Promise<CronJobResult> {
  const args = [
    'cron', 'add',
    '--name', options.name,
    '--at', options.at,
    '--session', 'isolated',
    '--message', options.message,
  ]

  if (options.deleteAfterRun) {
    args.push('--delete-after-run')
  }

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
