---
name: crm-upcoming
description: Show upcoming birthdays and special events in the next 30 days
user-invocable: true
command-dispatch: tool
---

# Upcoming Birthdays & Events

When this skill is invoked, immediately call `crm_get_upcoming_events` with `days_ahead: 30` and present the results in a concise, friendly format. No need to ask for clarification — just run it.

If there are no upcoming events, say so warmly.

Format the output as a short list grouped by urgency:
- Events today or tomorrow: highlight these clearly
- Events this week: list with day name
- Events later this month: list with date and how many days away

Example response:
"Here's what's coming up:

🎂 **Today**: Sarah's birthday
📅 **Thursday**: Peter's wedding anniversary
🎂 **March 12**: John's birthday (in 8 days)"
