// src/config/session/index.ts
import session from 'express-session';
import MongoDBStoreFactory from 'connect-mongodb-session';
import { env } from '../env';

const MongoDBStore = MongoDBStoreFactory(session);

// Define our session data structure
declare module 'express-session' {
    interface SessionData {
        userId?: string;
        email?: string;
        lastAccess?: Date;
    }
}

const store = new MongoDBStore({
    uri: env.MONGODB_URI,
    collection: 'sessions',
    expires: 1000 * 60 * 60 * 24 * 7, // 1 week
});

// Handle store errors
store.on('error', (error: Error) => {
    console.error('Session store error:', error);
});

export const sessionConfig: session.SessionOptions = {
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: store,
    cookie: {
        secure: env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
        sameSite: 'strict'
    },
    name: 'sid'
};