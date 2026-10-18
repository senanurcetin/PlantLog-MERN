import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';
import { getJwtSecret } from '../utils/jwtSecret';

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
        const decoded = jwt.verify(match[1], getJwtSecret());
        if (typeof decoded === 'string' || typeof decoded.id !== 'string') {
            throw new Error('Invalid token payload');
        }
        const user = await User.findById(decoded.id).select('-password');
        if (!user || !user.isActive) {
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
