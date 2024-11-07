// src/routes/auth/protected.ts
import { Router, Request, Response } from 'express';
import { authGuard } from '../../middleware/auth/authGuard';

const router = Router();

router.get('/profile', authGuard, async (req: Request, res: Response): Promise<void> => {
    try {
        res.json({
            success: true,
            message: 'Protected route accessed successfully',
            userId: req.session?.userId // Access userId through the session
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error accessing protected route'
        });
    }
});

export default router;