import type { Asset } from '../store/assetStore';
import type { LogEntry } from '../store/logStore';

/** Normalize human-entered search text for small registry views. */
const includes = (value: string | undefined, query: string): boolean =>
    (value || '').toLocaleLowerCase().includes(query.toLocaleLowerCase().trim());

export const filterAssets = (assets: Asset[], query: string, status: string): Asset[] =>
    assets.filter((asset) => {
        const matchesStatus = status === 'all' || asset.status === status;
        return matchesStatus && [
            asset.name, asset.serialNumber, asset.category, asset.location,
        ].some((value) => includes(value, query));
    });

export const filterLogs = (
    logs: LogEntry[], query: string, type: string, status: string,
): LogEntry[] => logs.filter((log) =>
    (type === 'all' || log.type === type) &&
    (status === 'all' || log.status === status) &&
    [log.title, log.description, log.type, log.status,
        log.asset?.name, log.asset?.serialNumber, log.author?.name,
    ].some((value) => includes(value, query)),
);

/** CSV escaping includes spreadsheet formula protection for untrusted log fields. */
const csvCell = (input: string | undefined): string => {
    const text = input || '';
    const protectedValue = /^\s*[=+\-@]/.test(text) ? "'" + text : text;
    return '"' + protectedValue.replace(/"/g, '""') + '"';
};

export const logsToCsv = (logs: LogEntry[]): string => {
    const header = ['ID', 'Created At', 'Type', 'Status', 'Asset', 'Serial Number', 'Title', 'Description', 'Author'];
    const lines = logs.map((log) => [
        log._id, log.createdAt, log.type, log.status, log.asset?.name,
        log.asset?.serialNumber, log.title, log.description, log.author?.name,
    ].map(csvCell).join(','));
    return [header.map(csvCell).join(','), ...lines].join('\r\n') + '\r\n';
};
