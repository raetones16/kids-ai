// src/middleware/auth/authGuard.ts
import { Request, Response, NextFunction } from 'express';

export const authGuard = (req: Request, res: Response, next: NextFunction): void => {
    try {
        // Check if user is authenticated via session
        if (!req.session || !req.session.userId) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        next();
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Authentication error'
        });
    }
};

// Simplified role check for now
export const requireRole = (allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.session || !req.session.userId) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }
        next();
    };
};