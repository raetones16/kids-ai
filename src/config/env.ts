import { config } from 'dotenv';

// Load environment variables from .env file
config();

interface EnvironmentVariables {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  MONGODB_URI: string;
  SESSION_SECRET: string;
  OPENAI_API_KEY?: string;
}

// Default values for development
const defaults: EnvironmentVariables = {
  NODE_ENV: 'development',
  PORT: 3000,
  MONGODB_URI: 'mongodb://mongodb:27017/kids-ai',
  SESSION_SECRET: 'default-secret-key-change-in-production',
};

// Validate and export environment variables
export const env: EnvironmentVariables = {
  NODE_ENV: (process.env.NODE_ENV as EnvironmentVariables['NODE_ENV']) || defaults.NODE_ENV,
  PORT: parseInt(process.env.PORT || String(defaults.PORT), 10),
  MONGODB_URI: process.env.MONGODB_URI || defaults.MONGODB_URI,
  SESSION_SECRET: process.env.SESSION_SECRET || defaults.SESSION_SECRET,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
};

// Validation function
export function validateEnv(): void {
  const requiredVars: Array<keyof EnvironmentVariables> = ['NODE_ENV', 'PORT', 'MONGODB_URI', 'SESSION_SECRET'];
  
  const missingVars = requiredVars.filter(key => !env[key]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  if (env.NODE_ENV === 'production') {
    if (env.SESSION_SECRET === defaults.SESSION_SECRET) {
      throw new Error('Must change SESSION_SECRET in production');
    }
    
    if (!env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required in production');
    }
  }
}