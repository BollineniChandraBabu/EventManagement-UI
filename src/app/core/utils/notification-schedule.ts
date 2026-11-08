/**
 * Schedule rules shared by the notification editor and the list's publish action.
 *
 * The backend rejects a schedule that is not in the future when a notification is created or
 * updated, and publishing a draft is held to the same rule so a stale window cannot be pushed live.
 * Running the check here explains the problem before a request is sent.
 */

export interface ScheduleFields {
  scheduledFrom?: string | null;
  scheduledTo?: string | null;
}

/** Formats an instant as the local `datetime-local` value the schedule pickers expect. */
export function toDateTimeLocal(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function toTime(value?: string | null): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

/**
 * The reason a schedule cannot be used, or null when it is valid.
 *
 * A past start or end is rejected: the backend stamps the publish time from `scheduledFrom`, so a
 * window that has already passed would publish with a back-dated timestamp.
 */
export function scheduleError(fields: ScheduleFields, now: Date = new Date()): string | null {
  const from = toTime(fields.scheduledFrom);
  const to = toTime(fields.scheduledTo);

  if (from !== null && to !== null && to < from) {
    return 'Schedule end time must be after the start time.';
  }
  if (from !== null && from <= now.getTime()) {
    return 'Schedule start time must be in the future.';
  }
  if (to !== null && to <= now.getTime()) {
    return 'Schedule end time must be in the future.';
  }
  return null;
}
