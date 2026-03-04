# openclaw-crm-plugin

A personal CRM plugin for OpenClaw. Manage contacts, track important life events, and get automatic birthday and event reminders.

## Features

- Store contacts as human-readable Markdown files in `~/.openclaw/workspace/people/`
- Track name, address, phone, email, birthday, special events, and freeform notes
- Full CRUD via agent tools: create, read, update, delete contacts
- Ask the agent "what's going on with [name]?" for a life summary
- Automatic birthday and event reminders before noon on the day itself

## Setup

Add the plugin to `~/.openclaw/openclaw.json`:

```json
{
  "plugins": {
    "entries": {
      "openclaw-crm-plugin": {
        "enabled": true,
        "config": {
          "reportingChannel": "telegram"
        }
      }
    }
  }
}
```

The `reportingChannel` is optional — if set, birthday and event reminders will be sent to that channel.

## Contact Files

Each contact is stored as a Markdown file at `~/.openclaw/workspace/people/<slug>.md`:

```markdown
---
id: john-doe
name: John Doe
phone: "+1 555-1234"
email: "john@example.com"
address: "123 Main St, New York"
birthday: "1985-07-15"
tags:
  - friend
events:
  - date: "2026-06-20"
    description: "Wedding anniversary"
    recurring: true
---

John is my college roommate. Works at Google as a PM.

## Family
- Wife: Sarah
- Kids: Emma (12), Max (9)

## Recent
- Feb 2026: Got promoted to Senior PM
```

You can edit these files by hand — run `openclaw crm reload` to pick up the changes.

## Agent Tools

| Tool | Description |
|------|-------------|
| `crm_upsert_person` | Create or update a contact |
| `crm_get_person` | Get full profile and notes |
| `crm_list_people` | List all contacts (with optional tag/search filter) |
| `crm_delete_person` | Delete a contact |
| `crm_get_upcoming_events` | Get upcoming birthdays and events |

## CLI Commands

```bash
openclaw crm list                 # List all contacts
openclaw crm reload               # Reload workspace files
openclaw crm schedule-reminders   # Re-schedule all reminders
```

## Example Agent Interactions

- "Add Sarah Johnson as a contact, she's a family member, birthday March 3rd 1982"
- "Update John's phone number to +31 6 12345678"
- "What's going on with Sarah lately?"
- "Any birthdays coming up in the next two weeks?"
- "Add a note to John: he just started a new job at Stripe"
- "Delete the contact for Mike Smith"
- "Show me all my family contacts"
