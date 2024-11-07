// src/types/connect-mongodb-session.d.ts
import { Store } from 'express-session';
import { EventEmitter } from 'events';

declare module 'connect-mongodb-session' {
    import session from 'express-session';

    interface MongoDBSessionOptions {
        uri: string;
        collection?: string;
        expires?: number;
        databaseName?: string;
        connectionOptions?: object;
    }

    interface MongoDBStore extends Store, EventEmitter {
        new(options: MongoDBSessionOptions): MongoDBStore;
    }

    function ConnectMongoDBSession(
        session: typeof session
    ): new (options: MongoDBSessionOptions) => MongoDBStore;

    export = ConnectMongoDBSession;
}