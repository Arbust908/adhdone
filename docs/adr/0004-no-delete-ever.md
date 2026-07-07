# Tasks are never deleted — finished_at is the only completion mechanism

There is no delete button, no `deleted_at` column, no hard-delete API route. Once created, a task exists in the database permanently. The only state transition is setting `finished_at` (pending → finished) or clearing it (finished → pending).

**Considered Options:**
- Hard delete — removes the row, simplest, but loses the record of what you did
- Soft delete (`deleted_at`) — a separate column for deletion vs completion, but adds a third state to reason about
- No delete — `finished_at` is the sole mechanism, all tasks are retained for "future research"

**Consequences:**
- No accidental data loss from misclicks
- Task history is complete — you can look back at everything you've ever tracked
- Garbage test tasks can't be removed from the UI (they stay in the Finished tab), but can be manually deleted from the SQLite file if truly needed
- The task form's save button is the only way to create data; the checkbox is the only way to "remove" it from the active view
