---
name: crm
description: Manage personal contacts, track life events, get summaries of people's lives, and stay on top of birthdays and important dates
user-invocable: true
command-dispatch: tool
---

# Personal CRM

You have access to the user's personal contact list. A summary of all contacts is injected into your context at the start of each conversation under the `[CRM Contacts]` section.

## Person Resolution

The user will refer to people by name (full or partial). Use the `[CRM Contacts]` context to identify who they mean. If the name is ambiguous, call `crm_get_person` with the partial name — it will return a list of matches for you to clarify with the user.

Never guess — always resolve from the contact list or ask the user.

## Adding or Updating a Contact

Use `crm_upsert_person` to create a new contact or update an existing one. You only need to provide the fields the user mentions — existing fields are preserved automatically.

Examples:
- "Add John Doe, his birthday is July 15th 1985 and he's a friend" → call with `name`, `birthday`, `tags: ["friend"]`
- "Update John's phone number to +31 6 1234 5678" → call with `name: "John Doe"`, `phone`
- "Add a note about Sarah: she just got promoted" → call with `name`, `notes`, `merge_notes: true`

Always confirm what was saved: "Done — added John Doe to your contacts with birthday July 15th."

## Getting a Summary of Someone's Life

When the user asks "what's going on with [name]?" or "tell me about [name]":
1. Call `crm_get_person` to get their full profile
2. Summarize the key points from their notes (recent updates, family, work)
3. Check `crm_get_upcoming_events` filtered to that person's name (or use the events in their profile)
4. Present a natural, human summary — don't just dump raw data

Example response: "John Doe is your college friend who works as a Senior PM at Google. He recently moved to Brooklyn with his wife Sarah and their kids Emma and Max. His birthday is coming up on July 15th — just 12 days away."

## Listing Contacts

Use `crm_list_people` to show an overview. Support filtering by tag ("show me all family members") or search ("anyone who works in tech").

## Deleting a Contact

Use `crm_delete_person`. If the name is ambiguous, show the matches and ask the user to confirm which one to delete before proceeding. Always warn that this cannot be undone.

## Upcoming Events and Birthdays

Use `crm_get_upcoming_events` to find what's coming up. Default is 30 days ahead, but adjust based on what the user asks ("any birthdays this week?" → `days_ahead: 7`).

Present results naturally: "Coming up: John's birthday is in 3 days (July 15th), and Sarah's wedding anniversary is in 12 days."

## Notes Format

When writing notes with `crm_upsert_person`, use clean Markdown:
- Use `## Section` headers for topics (Family, Work, Recent, etc.)
- Use bullet points for lists
- Use `- [Date]: [update]` format for recent life updates
- Keep it concise and factual

## Reminders

Birthday and event reminders are automatically scheduled as cron jobs when a contact is created or updated. They fire at 9:00 AM on the day itself. You do not need to manually schedule reminders when adding contacts.
