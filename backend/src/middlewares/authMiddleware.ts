import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';
import { getJwtSecret } from '../utils/jwtSecret';
import { tokenIssuer, tokenAudience } from '../utils/generateToken';
import { canManageAssets } from '../utils/authorization';

export interface AuthRequest extends Request {
    user?: IUser;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const match = /^Bearer (\S+)$/.exec(req.headers.authorization || '');
    if (!match) {
        res.status(401);
        next(new Error('Not authorized, no valid bearer token'));
        return;
    }
    try {
        const decoded = jwt.verify(match[1], getJwtSecret(), {
            algorithms: ['HS256'], issuer: tokenIssuer, audience: tokenAudience,
        });
        if (typeof decoded === 'string' || typeof decoded.id !== 'string' ||
            !Number.isSafeInteger(decoded.ver) || decoded.ver < 0 ||
            !['operator', 'supervisor', 'admin'].includes(decoded.role)) {
            throw new Error('Invalid token payload');
        }
        const user = await User.findById(decoded.id).select('-password');
        // Reject stale, pre-migration and role-mismatched credentials even if
        // their signature and expiry are valid. Read the role/version fresh
        // from MongoDB on each protected request; no in-memory token allowlist.
        if (!user || !user.isActive || user.tokenVersion !== decoded.ver ||
            user.role !== decoded.role) {
            res.status(401);
            next(new Error('Not authorized, account unavailable'));
            return;
        }
        req.user = user;
        next();
    } catch {
        res.status(401);
        next(new Error('Not authorized, token failed'));
    }
};

export const admin = (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (req.user?.role === 'admin') {
        next();
    } else {
        res.status(403);
        next(new Error('Not authorized as an admin'));
    }
};

/** Asset status and metadata changes require privileged maintenance roles. */
export const assetManager = (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!canManageAssets(req.user?.role)) {
        res.status(403);
        next(new Error('Supervisor or administrator role required'));
        return;
    }
    next();
};
