import * as fs from 'fs'
import type { PersonRegistry } from '../person-registry.js'

export function makeDeletePersonTool(getRegistry: () => PersonRegistry) {
  return {
    name: 'crm_delete_person',
    description:
      'Permanently delete a contact from the CRM. ' +
      'This removes their Markdown file from the workspace. This action cannot be undone.',
    parameters: {
      type: 'object' as const,
      properties: {
        name: {
          type: 'string',
          description: 'Full or partial name of the person to delete.',
        },
      },
      required: ['name'],
    },
    async execute(_ctx: unknown, { name }: { name: string }): Promise<unknown> {
      const registry = getRegistry()
      await registry.ensureLoaded()

      // Try exact match first
      const exact = registry.getPerson(name)
      if (exact) {
        fs.unlinkSync(exact.filePath)
        await registry.reload()
        return { success: true, deleted: exact.name }
      }

      // Fall back to partial search
      const matches = registry.searchPeople(name)
      if (matches.length === 0) {
        return { error: `No person found matching "${name}". Use crm_list_people to see all contacts.` }
      }
      if (matches.length > 1) {
        return {
          error: `Multiple people match "${name}". Please use the exact name to avoid deleting the wrong person.`,
          matches: matches.map((p) => ({ id: p.id, name: p.name })),
        }
      }

      const person = matches[0]
      fs.unlinkSync(person.filePath)
      await registry.reload()
      return { success: true, deleted: person.name }
    },
  }
}
