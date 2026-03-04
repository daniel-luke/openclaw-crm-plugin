import type { PersonRegistry } from '../person-registry.js'

export function makeGetPersonTool(getRegistry: () => PersonRegistry) {
  return {
    name: 'crm_get_person',
    description:
      'Get the full profile and notes for a person in the CRM. ' +
      'Returns all stored information: contact details, birthday, events, and notes. ' +
      'Use this to answer questions like "what is going on in [name]\'s life?" or to get their contact details.',
    parameters: {
      type: 'object' as const,
      properties: {
        name: {
          type: 'string',
          description: 'Full or partial name of the person to look up.',
        },
      },
      required: ['name'],
    },
    async execute(_ctx: unknown, { name }: { name: string }): Promise<unknown> {
      const registry = getRegistry()
      await registry.ensureLoaded()

      // Try exact match first
      const exact = registry.getPerson(name)
      if (exact) return { person: exact }

      // Fall back to partial search
      const matches = registry.searchPeople(name)
      if (matches.length === 0) {
        return { error: `No person found matching "${name}". Use crm_list_people to see all contacts.` }
      }
      if (matches.length === 1) {
        return { person: matches[0] }
      }

      return {
        error: `Multiple people match "${name}". Please be more specific.`,
        matches: matches.map((p) => ({ id: p.id, name: p.name, tags: p.tags })),
      }
    },
  }
}
