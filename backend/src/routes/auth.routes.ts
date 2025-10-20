import { Router } from 'express';
import { body } from 'express-validator';
import { AuthController } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validateRequest';

const router = Router();
const authController = new AuthController();

/**
 * POST /api/auth/register
 * Register a new practice with admin user
 */
router.post(
  '/register',
  [
    body('practice.name').notEmpty().withMessage('Practice name is required'),
    body('practice.email').isEmail().withMessage('Valid email is required'),
    body('user.firstName').notEmpty().withMessage('First name is required'),
    body('user.lastName').notEmpty().withMessage('Last name is required'),
    body('user.email').isEmail().withMessage('Valid email is required'),
    body('user.password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
  ],
  validateRequest,
  authController.register
);

/**
 * POST /api/auth/login
 * Login user
 */
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validateRequest,
  authController.login
);

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authController.getCurrentUser);

export default router;

