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

export interface TypeCohortSummary {
    records: number;
    unresolved: number;
    eligibleResolved: number;
    legacyOrIncomplete: number;
}

export interface UnresolvedAgeSummary {
    under24Hours: number;
    from24To72Hours: number;
    over72Hours: number;
    unknownStart: number;
}

export interface IntakeBucket {
    from: string;
    to: string;
    incident: number;
    maintenance: number;
}

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
    byType: Record<'incident' | 'maintenance', TypeCohortSummary>;
    intakeBuckets: IntakeBucket[];
    unresolvedAge: UnresolvedAgeSummary;
    indicator: string;
    interpretation: string;
}

/**
 * Cohort: incident/maintenance records created inside [from, to].
 * The cohort boundary uses createdAt, matching the database query.
 * Only complete server-recorded open->...->resolved histories qualify.
 * Unresolved ages require a matching server-recorded opening event.
 * Does not calculate machine repair time (MTTR) or MTBF.
 */
export const summarizeMaintenance = (
    rows: LifecycleRecord[], periodDays: number, to: Date,
): MaintenanceSummary => {
    const end = to.getTime();
    const start = end - periodDays * 86400000;
    const inCohort = rows.filter(row =>
        (row.type === 'incident' || row.type === 'maintenance') &&
        milliseconds(row.createdAt) >= start &&
        milliseconds(row.createdAt) <= end,
    );
    // Equal-duration UTC buckets; 1–7 buckets depending on the window size.
    // The final bucket is inclusive of the reporting endpoint.
    const bucketCount = Math.min(7, periodDays);
    const windowDuration = end - start;
    const intakeBuckets: IntakeBucket[] = Array.from({ length: bucketCount }, (_, index) => ({
        from: new Date(start + index * windowDuration / bucketCount).toISOString(),
        to: new Date(start + (index + 1) * windowDuration / bucketCount).toISOString(),
        incident: 0, maintenance: 0,
    }));
    for (const row of inCohort) {
        const index = Math.min(bucketCount - 1, Math.floor(
            (milliseconds(row.createdAt) - start) / windowDuration * bucketCount,
        ));
        if (row.type === 'incident') intakeBuckets[index].incident++;
        else intakeBuckets[index].maintenance++;
    }
    let unresolved = 0;
    let legacyOrIncomplete = 0;
    const durations: number[] = [];
    const blankType = (): TypeCohortSummary => ({
        records: 0, unresolved: 0, eligibleResolved: 0, legacyOrIncomplete: 0,
    });
    const byType = { incident: blankType(), maintenance: blankType() };
    const unresolvedAge: UnresolvedAgeSummary = {
        under24Hours: 0, from24To72Hours: 0, over72Hours: 0, unknownStart: 0,
    };

    for (const row of inCohort) {
        const group = byType[row.type as 'incident' | 'maintenance'];
        group.records++;
        const reported = milliseconds(row.reportedAt);
        const history = row.statusHistory || [];
        const opened = Number.isFinite(reported) && history.some(event =>
            event.from == null && event.to === 'open' && milliseconds(event.changedAt) === reported,
        );
        if (row.status !== 'resolved') {
            unresolved++;
            group.unresolved++;
            if (!opened || reported > end || reported < start) {
                unresolvedAge.unknownStart++;
            } else {
                const ageHours = (end - reported) / 3600000;
                if (ageHours < 24) unresolvedAge.under24Hours++;
                else if (ageHours < 72) unresolvedAge.from24To72Hours++;
                else unresolvedAge.over72Hours++;
            }
            continue;
        }
        const resolved = milliseconds(row.resolvedAt);
        const closed = history.some(event =>
            event.from != null && event.to === 'resolved' && milliseconds(event.changedAt) === resolved,
        );
        if (!opened || !closed || !Number.isFinite(reported) || !Number.isFinite(resolved) ||
            resolved < reported || resolved > end) {
            legacyOrIncomplete++;
            group.legacyOrIncomplete++;
            continue;
        }
        durations.push((resolved - reported) / 3600000);
        group.eligibleResolved++;
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
        byType, intakeBuckets, unresolvedAge,
        indicator: 'Time from log report to resolution (hours)',
        interpretation: 'Calculated from complete server-recorded transitions for incident/maintenance entries created within the selected window. Open-case aging uses only verified report timestamps and is not an SLA breach rate. Not machine downtime, MTTR or MTBF.',
    };
};
