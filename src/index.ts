// src/index.ts
import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import session from 'express-session';
import { env, validateEnv } from './config/env';
import { setupCommonMiddleware } from './middleware/common';
import { connectDatabase } from './config/database/mongodb';
import { sessionConfig } from './config/session';
import authRoutes from './routes/auth';
import protectedRoutes from './routes/auth/protected';

// Validate environment variables before starting
validateEnv();

const startServer = async () => {
    try {
        // Connect to MongoDB
        await connectDatabase();

        const app = express();

        // Apply common middleware
        setupCommonMiddleware(app);

        // Basic middleware setup
        app.use(session(sessionConfig));
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));

        // Rate limiting for API endpoints
        const rateLimit = require('express-rate-limit');
        const apiLimiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minute window
            max: env.NODE_ENV === 'development' ? 100 : 30,
            message: 'Too many requests from this IP, please try again later.'
        });
        app.use('/api', apiLimiter);

        // Routes
        app.use('/api/auth', authRoutes);
        app.use('/api/protected', protectedRoutes);

        // Basic Routes
        app.get('/', (req: Request, res: Response) => {
            res.send('Kids AI Learning Platform API');
        });

        app.get('/health', (req: Request, res: Response) => {
            res.json({ 
                status: 'ok', 
                environment: env.NODE_ENV,
                timestamp: new Date().toISOString(),
                database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
            });
        });

        // 404 handler
        app.use((req: Request, res: Response) => {
            res.status(404).json({ error: 'Not Found' });
        });

        // Error handling middleware
        app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
            console.error(err.stack);
            res.status(500).json({ 
                error: 'Something went wrong!',
                message: env.NODE_ENV === 'development' ? err.message : undefined
            });
        });

        app.listen(env.PORT, () => {
            console.log(`Server running in ${env.NODE_ENV} mode at http://localhost:${env.PORT}`);
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();