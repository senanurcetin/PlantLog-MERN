import jwt from 'jsonwebtoken';
import { getJwtSecret } from './jwtSecret';

export const tokenIssuer = 'plantlog-local-demo';
export const tokenAudience = 'plantlog-local-api';

/** Eight-hour default; explicit override constrained to 15 minutes–24 hours. */
export const getTokenLifetimeSeconds = (
    value: string | undefined = process.env.JWT_EXPIRE,
): number => {
    const setting = value || '8h';
    const match = /^(\d{1,4})([mhd])$/.exec(setting);
    if (!match) throw new Error('JWT_EXPIRE must be 15m–24h with m, h or d units');
    const n = Number(match[1]);
    const factor = match[2] === 'm' ? 60 : match[2] === 'h' ? 3600 : 86400;
    const seconds = n * factor;
    if (seconds < 900 || seconds > 86400) {
        throw new Error('JWT_EXPIRE must be between 15 minutes and 24 hours');
    }
    return seconds;
};

const generateToken = (
    id: string, tokenVersion: number,
    role: 'operator' | 'supervisor' | 'admin',
): string => {
    if (!Number.isSafeInteger(tokenVersion) || tokenVersion < 0) {
        throw new Error('Cannot sign an invalid session version');
    }
    return jwt.sign({ id, ver: tokenVersion, role }, getJwtSecret(), {
        algorithm: 'HS256',
        issuer: tokenIssuer,
        audience: tokenAudience,
        expiresIn: getTokenLifetimeSeconds(),
    });
};

export default generateToken;
