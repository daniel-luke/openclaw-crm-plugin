import type { PersonRegistry } from '../person-registry.js'

export function makeListPeopleTool(getRegistry: () => PersonRegistry) {
  return {
    name: 'crm_list_people',
    description:
      'List all contacts in the CRM. ' +
      'Returns a summary of each person (name, phone, email, birthday, tags) without full notes. ' +
      'Optionally filter by tag or search query.',
    parameters: {
      type: 'object' as const,
      properties: {
        tag: {
          type: 'string',
          description: 'Filter contacts by tag, e.g. "family" or "colleague".',
        },
        query: {
          type: 'string',
          description: 'Search contacts by name, tag, or content in their notes.',
        },
      },
      required: [],
    },
    async execute(
      _ctx: unknown,
      { tag, query }: { tag?: string; query?: string },
    ): Promise<unknown> {
      const registry = getRegistry()
      await registry.ensureLoaded()

      let people = query ? registry.searchPeople(query) : registry.getAllPeople()

      if (tag) {
        const tagLower = tag.toLowerCase()
        people = people.filter((p) => p.tags?.some((t) => t.toLowerCase() === tagLower))
      }

      if (people.length === 0) {
        return { people: [], message: 'No contacts found.' }
      }

      return {
        people: people.map((p) => ({
          id: p.id,
          name: p.name,
          phone: p.phone,
          email: p.email,
          address: p.address,
          birthday: p.birthday,
          tags: p.tags,
          event_count: p.events?.length ?? 0,
        })),
        total: people.length,
      }
    },
  }
}
