// src/middleware/common.ts
import { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { env } from '../config/env';

export const setupCommonMiddleware = (app: Express) => {
    // Security headers middleware
    app.use(helmet());

    // CORS configuration
    app.use(cors({
        // In development, allow all origins
        origin: env.NODE_ENV === 'development' ? '*' : [
            // In production, specify allowed origins
            'http://localhost:3000',
            // Add your production domains here
        ],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    }));

    // Request logging
    if (env.NODE_ENV === 'development') {
        app.use(morgan('dev')); // Concise output colored by response status
    } else {
        app.use(morgan('combined')); // Standard Apache combined log output
    }
};