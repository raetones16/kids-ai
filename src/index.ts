import express, { Request, Response } from 'express';
import { env, validateEnv } from './config/env';

// Validate environment variables before starting
validateEnv();

const app = express();

app.get('/', (req: Request, res: Response) => {
  res.send('Kids AI Learning Platform API');
});

app.listen(env.PORT, () => {
  console.log(`Server running in ${env.NODE_ENV} mode at http://localhost:${env.PORT}`);
});