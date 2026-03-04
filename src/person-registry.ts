import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'

export interface PersonEvent {
  date: string          // "YYYY-MM-DD"
  description: string
  recurring?: boolean   // if true, repeat yearly
}

export interface PersonEntry {
  id: string
  name: string
  phone?: string
  email?: string
  address?: string
  birthday?: string     // "YYYY-MM-DD"
  tags?: string[]
  events?: PersonEvent[]
  notes: string         // markdown body after frontmatter
  filePath: string
}

interface FrontmatterData {
  id?: string
  name?: string
  phone?: string
  email?: string
  address?: string
  birthday?: string
  tags?: string[]
  events?: PersonEvent[]
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function parsePeopleFile(filePath: string): PersonEntry | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
    if (!match) return null

    const [, frontmatterStr, body] = match
    const frontmatter = yaml.load(frontmatterStr) as FrontmatterData
    if (!frontmatter?.name) return null

    const fileName = path.basename(filePath, '.md')
    return {
      id: frontmatter.id ?? fileName,
      name: frontmatter.name,
      phone: frontmatter.phone,
      email: frontmatter.email,
      address: frontmatter.address,
      birthday: frontmatter.birthday,
      tags: frontmatter.tags,
      events: frontmatter.events,
      notes: body.trim(),
      filePath,
    }
  } catch {
    return null
  }
}

export function serializePeopleFile(person: Omit<PersonEntry, 'filePath'>): string {
  const frontmatter: FrontmatterData = { id: person.id, name: person.name }
  if (person.phone) frontmatter.phone = person.phone
  if (person.email) frontmatter.email = person.email
  if (person.address) frontmatter.address = person.address
  if (person.birthday) frontmatter.birthday = person.birthday
  if (person.tags?.length) frontmatter.tags = person.tags
  if (person.events?.length) frontmatter.events = person.events

  const frontmatterStr = yaml.dump(frontmatter, { lineWidth: 120 }).trimEnd()
  const body = person.notes ? `\n${person.notes}\n` : '\n'
  return `---\n${frontmatterStr}\n---\n${body}`
}

export class PersonRegistry {
  private people: Map<string, PersonEntry> = new Map()
  private loaded = false

  constructor(private readonly peopleDir: string) {}

  async load(): Promise<void> {
    this.people.clear()

    if (!fs.existsSync(this.peopleDir)) {
      this.loaded = true
      return
    }

    const files = fs
      .readdirSync(this.peopleDir)
      .filter((f) => f.endsWith('.md'))

    for (const file of files) {
      const entry = parsePeopleFile(path.join(this.peopleDir, file))
      if (entry) {
        this.people.set(entry.id, entry)
      }
    }

    this.loaded = true
  }

  async ensureLoaded(): Promise<void> {
    if (!this.loaded) await this.load()
  }

  reload(): Promise<void> {
    this.loaded = false
    return this.load()
  }

  getPerson(nameOrId: string): PersonEntry | undefined {
    const lower = nameOrId.toLowerCase()
    // Exact id match first
    if (this.people.has(lower)) return this.people.get(lower)
    // Exact name match
    for (const p of this.people.values()) {
      if (p.name.toLowerCase() === lower) return p
    }
    return undefined
  }

  searchPeople(query: string): PersonEntry[] {
    const lower = query.toLowerCase()
    return Array.from(this.people.values()).filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.id.includes(lower) ||
        p.notes.toLowerCase().includes(lower) ||
        p.tags?.some((t) => t.toLowerCase().includes(lower)),
    )
  }

  getAllPeople(): PersonEntry[] {
    return Array.from(this.people.values()).sort((a, b) => a.name.localeCompare(b.name))
  }

  hasPerson(id: string): boolean {
    return this.people.has(id)
  }

  buildContextBlock(): string {
    const people = this.getAllPeople()
    if (people.length === 0) return ''

    const lines: string[] = ['[CRM Contacts]']
    for (const p of people) {
      const tagStr = p.tags?.length ? ` (${p.tags.join(', ')})` : ''
      lines.push(`${p.name}${tagStr}`)
    }

    return lines.join('\n')
  }
}
