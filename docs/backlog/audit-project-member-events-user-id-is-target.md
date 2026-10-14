# Audit attributes project-member changes to the member, not the actor

**Found:** 2026-10-13, security-ops batch (audit event-type mapping).

**Symptom:** `ProjectMemberAdded` / `ProjectMemberRemoved` carry `user_id` = the
member being added or removed. `AuditRecordingService.handle_event` treats
`event.user_id` as the actor, so the audit row says the new member performed the
operation. These events now map to `ACCESS_CHANGE`, which makes the wrong actor
more visible, not less.

**Root cause:** two meanings share one field name. The handler's actor rule
(`event.user_id`, else request actor, else SYSTEM) is right for events whose
`user_id` is the actor (export events, for example) and wrong for membership
events where it is the target.

**Fix direction:** rename the membership events' field to `member_id` (grep
`ProjectMemberAdded` / `ProjectMemberRemoved` for consumers) and expose the
member through `audit_changes()` so it lands as an entry. Add a handler test:
membership event under a set request actor → row `user_id` is the actor, entry
records the member.
