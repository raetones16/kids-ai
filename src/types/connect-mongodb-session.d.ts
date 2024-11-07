import { Store } from 'express-session';
import { EventEmitter } from 'events';

declare module 'connect-mongodb-session' {
    interface MongoDBSessionOptions {
        uri: string;
        collection?: string;
        expires?: number;
        databaseName?: string;
        connectionOptions?: object;
    }

    interface MongoDBStore extends Store, EventEmitter {
        // Store methods defined here
    }

    function ConnectMongoDBSession(
        expressSession: any
    ): new (options: MongoDBSessionOptions) => MongoDBStore;

    export = ConnectMongoDBSession;
}