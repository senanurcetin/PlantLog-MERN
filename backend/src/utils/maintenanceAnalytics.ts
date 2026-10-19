export interface LifecycleEventLike {
    from?: string | null;
    to?: string;
    changedAt?: Date | string | null;
}
export interface LifecycleRecord {
    type: string;
    status: string;
    createdAt?: Date | string | null;
    reportedAt?: Date | string | null;
    resolvedAt?: Date | string | null;
    statusHistory?: LifecycleEventLike[] | null;
}

const milliseconds = (value: Date | string | null | undefined): number =>
    value == null ? NaN : new Date(value).getTime();

export interface MaintenanceSummary {
    periodDays: number;
    from: string;
    to: string;
    records: number;
    unresolved: number;
    legacyOrIncomplete: number;
    eligibleResolved: number;
    averageHoursToResolve: number | null;
    medianHoursToResolve: number | null;
    indicator: string;
    interpretation: string;
}

/**
 * Cohort: incident/maintenance records created inside [from, to].
 * Only complete server-recorded open->...->resolved histories qualify.
 * Does not calculate machine repair time (MTTR) or MTBF.
 */
export const summarizeMaintenance = (
    rows: LifecycleRecord[], periodDays: number, to: Date,
): MaintenanceSummary => {
    const end = to.getTime();
    const start = end - periodDays * 86400000;
    const inCohort = rows.filter(row =>
        (row.type === 'incident' || row.type === 'maintenance') &&
        milliseconds(row.reportedAt ?? row.createdAt) >= start &&
        milliseconds(row.reportedAt ?? row.createdAt) <= end,
    );
    let unresolved = 0;
    let legacyOrIncomplete = 0;
    const durations: number[] = [];

    for (const row of inCohort) {
        if (row.status !== 'resolved') {
            unresolved++;
            continue;
        }
        const reported = milliseconds(row.reportedAt);
        const resolved = milliseconds(row.resolvedAt);
        const history = row.statusHistory || [];
        const opened = history.some(event =>
            event.from == null && event.to === 'open' && milliseconds(event.changedAt) === reported,
        );
        const closed = history.some(event =>
            event.from != null && event.to === 'resolved' && milliseconds(event.changedAt) === resolved,
        );
        if (!opened || !closed || !Number.isFinite(reported) || !Number.isFinite(resolved) ||
            resolved < reported || resolved > end) {
            legacyOrIncomplete++;
            continue;
        }
        durations.push((resolved - reported) / 3600000);
    }
    durations.sort((a, b) => a - b);
    const round = (n: number) => Math.round(n * 100) / 100;
    const midpoint = Math.floor(durations.length / 2);
    const average = durations.length
        ? round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : null;
    const median = durations.length
        ? round(durations.length % 2 === 1 ? durations[midpoint] : (durations[midpoint - 1] + durations[midpoint]) / 2)
        : null;
    return {
        periodDays, from: new Date(start).toISOString(), to: to.toISOString(),
        records: inCohort.length, unresolved, legacyOrIncomplete,
        eligibleResolved: durations.length,
        averageHoursToResolve: average, medianHoursToResolve: median,
        indicator: 'Time from log report to resolution (hours)',
        interpretation: 'Calculated from complete server-recorded transitions for incident/maintenance entries created within the selected window. Not machine downtime, MTTR or MTBF.',
    };
};
