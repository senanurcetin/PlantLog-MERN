import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import generateToken from '../utils/generateToken';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../middlewares/authMiddleware';
import { sanitizeRegistration, sanitizeLogin } from '../utils/inputPolicy';
import { isSelfRegistrationEnabled } from '../utils/registrationPolicy';

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!isSelfRegistrationEnabled()) {
            res.status(403);
            throw new Error('Self-registration is disabled for this environment');
        }
        const { name, email, password, role } = sanitizeRegistration(req.body);

        // Check if user exists
        const userExists = await User.findOne({ email });

        if (userExists) {
            res.status(400);
            throw new Error('User already exists');
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role: role || 'operator',
        });

        if (user) {
            res.locals.auditActorId = user.id;
            res.status(201).json({
                _id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user.id, user.tokenVersion, user.role),
            });
        } else {
            res.status(400);
            throw new Error('Invalid user data');
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { email, password } = sanitizeLogin(req.body);

        // Check for user email
        const user = await User.findOne({ email }).select('+password');

        if (user && user.password && (await bcrypt.compare(password, user.password))) {
            if (!user.isActive) {
                res.status(401);
                throw new Error('Invalid credentials');
            }

            res.locals.auditActorId = user.id;
            res.json({
                _id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user.id, user.tokenVersion, user.role),
            });
        } else {
            res.status(401);
            throw new Error('Invalid credentials');
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Get user data
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401);
            throw new Error('User not found in request');
        }
        // Project only the UI-facing profile. No hash, token version,
        // internal Mongoose fields, or other users' credentials.
        res.status(200).json({
            _id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            role: req.user.role,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Revoke all bearer tokens for the account on explicit logout. The version
 * bump is atomic and guarded against racing or replayed old credentials.
 */
export const logoutUser = async (
    req: AuthRequest, res: Response, next: NextFunction,
): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401);
            throw new Error('Authentication required for logout');
        }
        const result = await User.updateOne(
            { _id: req.user._id, tokenVersion: req.user.tokenVersion },
            { $inc: { tokenVersion: 1 } },
        );
        if (result.modifiedCount !== 1) {
            res.status(401);
            throw new Error('Session has already been revoked');
        }
        res.setHeader('Cache-Control', 'no-store');
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};
