import { Request, Response, NextFunction } from 'express';
interface ApiError extends Error {
    statusCode?: number;
    code?: number;
}
export const errorHandler = (err: ApiError, _req: Request, res: Response, _next: NextFunction): void => {
    let statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
    if (err.name === 'CastError' || err.name === 'ValidationError') statusCode = 400;
    if (err.code === 11000) statusCode = 409;
    res.status(statusCode).json({
        message: statusCode >= 500 ? 'Internal server error' : err.message,
        ...(process.env.NODE_ENV !== 'production' ? { stack: err.stack } : {}),
    });
};
