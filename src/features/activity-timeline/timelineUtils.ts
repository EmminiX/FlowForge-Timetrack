import type { ActivityTimelineEventWithProject, TimelineSuggestion } from '../../types';

interface TimelineSuggestionOptions {
  minDurationSeconds?: number;
}

function labelForEvent(event: ActivityTimelineEventWithProject): string {
  const title = event.windowTitle?.trim();
  if (title) return `${event.appName} - ${title}`;
  return event.appName;
}

function sameWorkContext(
  a: ActivityTimelineEventWithProject,
  b: ActivityTimelineEventWithProject,
): boolean {
  return (
    a.eventType === 'activity' &&
    b.eventType === 'activity' &&
    labelForEvent(a) === labelForEvent(b)
  );
}

function createSuggestion(group: ActivityTimelineEventWithProject[]): TimelineSuggestion {
  const first = group[0];
  const last = group[group.length - 1];
  const title = labelForEvent(first);
  const durationSeconds = group.reduce((total, event) => {
    const duration = Math.max(
      0,
      Math.round((new Date(event.endedAt).getTime() - new Date(event.startedAt).getTime()) / 1000),
    );
    return total + duration;
  }, 0);

  return {
    id: first.id,
    title,
    startedAt: first.startedAt,
    endedAt: last.endedAt,
    durationSeconds,
    eventIds: group.map((event) => event.id),
    notes: `Suggested from private timeline: ${title}`,
  };
}

export function buildTimelineSuggestions(
  events: ActivityTimelineEventWithProject[],
  options: TimelineSuggestionOptions = {},
): TimelineSuggestion[] {
  const minDurationSeconds = options.minDurationSeconds ?? 300;
  const suggestions: TimelineSuggestion[] = [];
  let group: ActivityTimelineEventWithProject[] = [];

  const flushGroup = () => {
    if (group.length === 0) return;
    const suggestion = createSuggestion(group);
    if (suggestion.durationSeconds >= minDurationSeconds) {
      suggestions.push(suggestion);
    }
    group = [];
  };

  events
    .filter((event) => !event.isDismissed && !event.timeEntryId)
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
    .forEach((event) => {
      if (event.eventType !== 'activity') {
        flushGroup();
        return;
      }

      if (group.length === 0 || sameWorkContext(group[group.length - 1], event)) {
        group.push(event);
        return;
      }

      flushGroup();
      group.push(event);
    });

  flushGroup();
  return suggestions;
}
