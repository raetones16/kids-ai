// src/routes/auth/index.ts
import { Router } from 'express';
import { AuthController } from '../../controllers/auth/auth.controller';
import { validate } from '../../middleware/validation/auth.validation';

const router = Router();

router.post('/register', validate('register'), AuthController.register);
router.post('/login', validate('login'), AuthController.login);
router.post('/logout', AuthController.logout);

export default router;