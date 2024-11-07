import mongoose from 'mongoose';
import { env } from '../env';

export const connectDatabase = async (): Promise<void> => {
    try {
        // Debug: Print the connection URI
        console.log('Attempting to connect to MongoDB with URI:', env.MONGODB_URI);
        
        // Set up mongoose configuration
        mongoose.set('strictQuery', true);
        
        // Connect to MongoDB with more robust options
        await mongoose.connect(env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            waitQueueTimeoutMS: 5000,
            retryWrites: true,
            socketTimeoutMS: 45000,
        });
        
        console.log('MongoDB Connected Successfully');
        
        // Handle connection events
        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('MongoDB disconnected. Attempting to reconnect...');
        });

        mongoose.connection.on('connected', () => {
            console.info('MongoDB connected successfully');
        });

        process.on('SIGINT', async () => {
            try {
                await mongoose.connection.close();
                console.log('MongoDB connection closed through app termination');
                process.exit(0);
            } catch (err) {
                console.error('Error closing MongoDB connection:', err);
                process.exit(1);
            }
        });

    } catch (error) {
        console.error('MongoDB connection error:', error);
        // Don't exit process immediately, allow for retry
        throw error;
    }
};