import * as path from 'path'
import { PersonRegistry } from './person-registry.js'
import { scheduleAllReminders } from './reminder-scheduler.js'
import { makeUpsertPersonTool } from './tools/crm-upsert-person.js'
import { makeGetPersonTool } from './tools/crm-get-person.js'
import { makeListPeopleTool } from './tools/crm-list-people.js'
import { makeDeletePersonTool } from './tools/crm-delete-person.js'
import { makeGetUpcomingEventsTool } from './tools/crm-get-upcoming-events.js'

interface PluginConfig {
  reportingChannel?: string
}

interface PluginState {
  registry?: PersonRegistry
  config?: PluginConfig
  peopleDir?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function register(api: any): void {
  const state: PluginState = {}

  function resolvePeopleDir(config: PluginConfig): string {
    void config
    return path.resolve(
      api.workspace?.path?.('people') ??
        path.join(process.env.HOME ?? '~', '.openclaw', 'workspace', 'people'),
    )
  }

  api.registerService?.({
    id: 'crm-person-registry',
    async start() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = api.config as any
      const config: PluginConfig =
        raw?.reportingChannel ? raw :
        raw?.config?.reportingChannel ? raw.config :
        raw?.plugins?.entries?.['openclaw-crm-plugin']?.config ?? {}

      state.config = config
      state.peopleDir = resolvePeopleDir(config)
      state.registry = new PersonRegistry(state.peopleDir)

      await state.registry.load()
      api.logger?.info(`[crm-plugin] Loaded ${state.registry.getAllPeople().length} contact(s) from ${state.peopleDir}`)

      // Schedule reminders for all contacts
      try {
        await scheduleAllReminders(state.registry, config, api.logger)
      } catch (err) {
        api.logger?.warn('[crm-plugin] Failed to schedule reminders:', err)
      }
    },
  })

  // Inject contact list into every agent turn for natural language name resolution
  api.registerHook?.(
    'command:new',
    async () => {
      if (!state.registry) return undefined
      await state.registry.ensureLoaded()
      const block = state.registry.buildContextBlock()
      if (!block) return undefined
      return { systemContext: block }
    },
    { description: 'Inject CRM contact list for natural language name resolution' },
  )

  // Register tools
  api.registerTool?.(
    makeUpsertPersonTool(
      () => state.registry!,
      () => state.peopleDir!,
      () => state.config!,
      api.logger,
    ),
  )
  api.registerTool?.(makeGetPersonTool(() => state.registry!))
  api.registerTool?.(makeListPeopleTool(() => state.registry!))
  api.registerTool?.(makeDeletePersonTool(() => state.registry!))
  api.registerTool?.(makeGetUpcomingEventsTool(() => state.registry!))

  // Register CLI: `openclaw crm list`, `openclaw crm reload`, `openclaw crm schedule-reminders`
  api.registerCli?.({
    name: 'crm',
    description: 'CRM plugin commands',
    subcommands: [
      {
        name: 'list',
        description: 'List all contacts in the CRM',
        async handler() {
          if (!state.registry) {
            console.error('Plugin not yet started. Try again in a moment.')
            return
          }
          await state.registry.ensureLoaded()
          const people = state.registry.getAllPeople()
          if (people.length === 0) {
            console.log('No contacts found.')
            return
          }
          for (const p of people) {
            const tags = p.tags?.length ? ` [${p.tags.join(', ')}]` : ''
            const bday = p.birthday ? ` — born ${p.birthday}` : ''
            console.log(`${p.name}${tags}${bday}`)
          }
          console.log(`\nTotal: ${people.length} contact(s)`)
        },
      },
      {
        name: 'reload',
        description: 'Reload the people/ workspace files without restarting OpenClaw',
        async handler() {
          await state.registry?.reload()
          const count = state.registry?.getAllPeople().length ?? 0
          console.log(`Reloaded — ${count} contact(s) in registry.`)
        },
      },
      {
        name: 'schedule-reminders',
        description: 'Re-schedule birthday and event reminders for all contacts',
        async handler() {
          if (!state.registry || !state.config) {
            console.error('Plugin not yet started. Try again in a moment.')
            return
          }
          await scheduleAllReminders(state.registry, state.config, api.logger)
          console.log('Reminders scheduled.')
        },
      },
    ],
  })
}
