import * as fs from 'fs'
import * as path from 'path'
import type { PersonRegistry, PersonEvent } from '../person-registry.js'
import { slugify, parsePeopleFile, serializePeopleFile } from '../person-registry.js'
import type { ReminderConfig } from '../reminder-scheduler.js'
import { schedulePersonReminders } from '../reminder-scheduler.js'

export function makeUpsertPersonTool(
  getRegistry: () => PersonRegistry,
  getPeopleDir: () => string,
  getConfig: () => ReminderConfig,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logger?: any,
) {
  return {
    name: 'crm_upsert_person',
    description:
      'Create a new contact or update an existing one in the CRM. ' +
      'If a person with the same name already exists, their record will be updated. ' +
      'Omitted fields are preserved from the existing record. ' +
      'Use merge_notes=true to append notes instead of replacing them.',
    parameters: {
      type: 'object' as const,
      properties: {
        name: {
          type: 'string',
          description: 'Full name of the person.',
        },
        phone: {
          type: 'string',
          description: 'Phone number.',
        },
        email: {
          type: 'string',
          description: 'Email address.',
        },
        address: {
          type: 'string',
          description: 'Home or mailing address.',
        },
        birthday: {
          type: 'string',
          description: 'Birthday in YYYY-MM-DD format, e.g. "1985-07-15".',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Labels to categorize this person, e.g. ["friend", "family", "colleague"].',
        },
        events: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string', description: 'Date in YYYY-MM-DD format.' },
              description: { type: 'string', description: 'What the event is.' },
              recurring: { type: 'boolean', description: 'If true, repeats every year on this date.' },
            },
            required: ['date', 'description'],
          },
          description: 'Special events or dates to remember for this person.',
        },
        notes: {
          type: 'string',
          description: 'Freeform markdown notes about this person (life updates, family info, interests, etc.).',
        },
        merge_notes: {
          type: 'boolean',
          description: 'If true, append notes to the existing notes instead of replacing them. Default: false.',
        },
      },
      required: ['name'],
    },
    async execute(
      _ctx: unknown,
      {
        name,
        phone,
        email,
        address,
        birthday,
        tags,
        events,
        notes,
        merge_notes,
      }: {
        name: string
        phone?: string
        email?: string
        address?: string
        birthday?: string
        tags?: string[]
        events?: PersonEvent[]
        notes?: string
        merge_notes?: boolean
      },
    ): Promise<unknown> {
      const registry = getRegistry()
      await registry.ensureLoaded()

      const peopleDir = getPeopleDir()
      if (!fs.existsSync(peopleDir)) {
        fs.mkdirSync(peopleDir, { recursive: true })
      }

      const id = slugify(name)
      const filePath = path.join(peopleDir, `${id}.md`)

      // Load existing entry if present (for partial updates)
      const existing = fs.existsSync(filePath) ? parsePeopleFile(filePath) : null

      const mergedNotes = (() => {
        if (!notes) return existing?.notes ?? ''
        if (merge_notes && existing?.notes) return `${existing.notes}\n\n${notes}`
        return notes
      })()

      const entry = {
        id,
        name,
        phone: phone ?? existing?.phone,
        email: email ?? existing?.email,
        address: address ?? existing?.address,
        birthday: birthday ?? existing?.birthday,
        tags: tags ?? existing?.tags,
        events: events ?? existing?.events,
        notes: mergedNotes,
      }

      fs.writeFileSync(filePath, serializePeopleFile(entry), 'utf-8')
      await registry.reload()

      // Schedule reminders for this person
      const config = getConfig()
      await schedulePersonReminders({ ...entry, filePath }, config, logger)

      return {
        success: true,
        action: existing ? 'updated' : 'created',
        person: { ...entry, filePath },
      }
    },
  }
}
