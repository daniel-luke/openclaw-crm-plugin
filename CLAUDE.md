# openclaw-crm-plugin — Developer Guide

## Architecture

This plugin follows the same patterns as `../openclaw-ha-plugin`. Read that plugin's CLAUDE.md for the general OpenClaw plugin architecture.

### Key differences from HA plugin

- No external API client — purely local filesystem storage
- People stored as Markdown files with YAML frontmatter in `~/.openclaw/workspace/people/`
- No required config — works out of the box

## Source Layout

```
src/
├── index.ts                    Plugin entry: service, hooks, tools, CLI
├── person-registry.ts          Loads/parses all .md files from people/
├── reminder-scheduler.ts       Schedules birthday/event cron jobs
├── cron-client.ts              Thin wrapper around `openclaw cron add` CLI
└── tools/
    ├── crm-upsert-person.ts    Create/update a contact
    ├── crm-get-person.ts       Get full profile
    ├── crm-list-people.ts      List/search contacts
    ├── crm-delete-person.ts    Delete a contact
    └── crm-get-upcoming-events.ts  Find upcoming birthdays/events
```

## Person File Format

```markdown
---
id: john-doe              # Slug derived from name
name: John Doe
phone: "+1 555-1234"
email: "john@example.com"
address: "..."
birthday: "1985-07-15"   # YYYY-MM-DD
tags:
  - friend
events:
  - date: "2026-06-20"
    description: "Wedding anniversary"
    recurring: true       # Repeats yearly
---

Freeform markdown notes here.
```

## Plugin State

The `PluginState` in `index.ts` is populated during `api.registerService.start()`:
- `registry`: PersonRegistry instance
- `config`: resolved PluginConfig
- `peopleDir`: absolute path to `~/.openclaw/workspace/people/`

All tools receive lazy getters (`() => state.registry!`) so they work regardless of initialization order.

## Reminder Scheduling

Reminders are scheduled via `addCronJob()` → `openclaw cron add` CLI:
- Birthday: fires at `YYYY-MM-DDT09:00:00` each year
- Non-recurring events: fires once on the event date
- Recurring events: fires each year on the same date

Job names use `crm-birthday-<slug>` and `crm-event-<slug>-<event-slug>` patterns.

## Development

```bash
npm install
npx tsc --noEmit    # Type check
npx tsc             # Build to dist/
```

## Adding to OpenClaw (local)

In `~/.openclaw/openclaw.json`:
```json
{
  "plugins": {
    "load": { "paths": ["/path/to/custom-plugins"] },
    "entries": {
      "openclaw-crm-plugin": { "enabled": true, "config": {} }
    }
  }
}
```
