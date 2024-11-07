// src/types/connect-mongodb-session.d.ts
import { Store, SessionOptions } from 'express-session';
import { EventEmitter } from 'events';

declare module 'connect-mongodb-session' {
    interface MongoDBSessionOptions {
        uri: string;
        collection?: string;
        expires?: number;
        databaseName?: string;
        connectionOptions?: Record<string, unknown>;
    }

    interface MongoDBStore extends Store, EventEmitter {
        // Store methods defined here
    }

    // Using proper type instead of any
    function ConnectMongoDBSession(
        expressSession: { Store: typeof Store } & typeof SessionOptions
    ): new (options: MongoDBSessionOptions) => MongoDBStore;

    export = ConnectMongoDBSession;
}