import { query } from '../db';

export type RewardEvent = 'case_submission' | 'verified_resolution';

/**
 * Resolve reward points from active database configuration.
 * Returns null when no matching rule exists. No default points are invented.
 */
export async function getConfiguredRewardPoints(event: RewardEvent): Promise<number | null> {
  try {
    const result = await query(
      'SELECT * FROM rewards_rewardconfig WHERE is_active = true ORDER BY points_value DESC;'
    );

    const rows = result.rows.filter((row: Record<string, unknown>) => {
      const label = Object.entries(row)
        .filter(([key, value]) =>
          !/^(id|is_active|points_value|created_at|updated_at|deleted_at)$/i.test(key) &&
          typeof value === 'string'
        )
        .map(([key, value]) => `${key.replace(/[_-]+/g, ' ')} ${String(value)}`)
        .join(' ')
        .toLowerCase()
        .replace(/[_-]+/g, ' ');

      if (event === 'case_submission') {
        return /(report|issue|case)/.test(label) &&
          /(submit|submission|submitted|reporting|reported|creat|initial)/.test(label) &&
          !/(verif|resolv|audit|hotspot|follow up|closure)/.test(label);
      }

      return /(verif|resolv|closure)/.test(label) &&
        /(case|report|resolution|issue|closure|resolved)/.test(label) &&
        !/(pending|disputed|audit|follow up|unverified)/.test(label);
    });

    for (const row of rows) {
      const points = Number(row.points_value);
      if (Number.isFinite(points) && points > 0) return Math.floor(points);
    }
    return null;
  } catch (error) {
    console.warn(
      '[rewards] No configured reward points could be loaded; no points will be awarded for this event.',
      error instanceof Error ? error.message : 'Unknown configuration error'
    );
    return null;
  }
}
