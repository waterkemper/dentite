import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

export class AuthController {
  constructor() {
    this.register = this.register.bind(this);
    this.login = this.login.bind(this);
    this.getCurrentUser = this.getCurrentUser.bind(this);
    this.requestPasswordReset = this.requestPasswordReset.bind(this);
    this.verifyResetToken = this.verifyResetToken.bind(this);
    this.resetPassword = this.resetPassword.bind(this);
  }

  /**
   * Register new practice with admin user
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { practice, user } = req.body;

      // Check if practice email already exists
      const existingPractice = await prisma.practice.findUnique({
        where: { email: practice.email },
      });

      if (existingPractice) {
        res.status(400).json({ error: 'Practice email already registered' });
        return;
      }

      // Check if user email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email },
      });

      if (existingUser) {
        res.status(400).json({ error: 'User email already registered' });
        return;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(user.password, 10);

      // Create practice and admin user in transaction
      const result = await prisma.$transaction(async (tx: any) => {
        // Set trial to expire in 14 days
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 14);

        const newPractice = await tx.practice.create({
          data: {
            name: practice.name,
            email: practice.email,
            phone: practice.phone,
            address: practice.address,
            city: practice.city,
            state: practice.state,
            zipCode: practice.zipCode,
            subscriptionStatus: 'trial',
            trialEndsAt: trialEndsAt,
            usageBillingCycleStart: new Date(),
          },
        });

        const newUser = await tx.user.create({
          data: {
            practiceId: newPractice.id,
            email: user.email,
            password: hashedPassword,
            firstName: user.firstName,
            lastName: user.lastName,
            role: 'admin',
          },
        });

        return { practice: newPractice, user: newUser };
      });

      // Generate JWT
      const token = this.generateToken(result.user);

      res.status(201).json({
        message: 'Practice registered successfully',
        token,
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          role: result.user.role,
          practiceId: result.user.practiceId,
        },
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }

  /**
   * Login user
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      // Find user with practice info
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          practice: true,
        },
      });

      if (!user || !user.isActive) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // Generate JWT
      const token = this.generateToken(user);

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          practiceId: user.practiceId,
          practice: {
            id: user.practice.id,
            name: user.practice.name,
            subscriptionStatus: user.practice.subscriptionStatus,
          },
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }

  /**
   * Get current user info
   */
  async getCurrentUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        res.status(401).json({ error: 'Access token required' });
        return;
      }

      const secret = process.env.JWT_SECRET || 'your-secret-key';
      const decoded = jwt.verify(token, secret) as { userId: string };

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: {
          practice: true,
        },
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        practiceId: user.practiceId,
        practice: {
          id: user.practice.id,
          name: user.practice.name,
          subscriptionStatus: user.practice.subscriptionStatus,
        },
      });
    } catch (error) {
      res.status(403).json({ error: 'Invalid token' });
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      const user = await prisma.user.findUnique({
        where: { email },
        include: { practice: true },
      });

      // Always return success to prevent email enumeration
      if (!user) {
        res.json({ 
          message: 'If an account exists with that email, a password reset link has been sent.' 
        });
        return;
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

      // Token expires in 1 hour
      const resetTokenExpires = new Date();
      resetTokenExpires.setHours(resetTokenExpires.getHours() + 1);

      // Save reset token to database
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: resetTokenHash,
          passwordResetExpires: resetTokenExpires,
        },
      });

      // In production, send email with reset link
      // For now, we'll log it (in development) or send via configured email service
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
      
      console.log('Password reset requested for:', email);
      console.log('Reset URL:', resetUrl);
      console.log('Token expires at:', resetTokenExpires);

      // TODO: Send email with resetUrl
      // You can integrate with SendGrid or another email service here
      // For MVP, the token is logged to console

      res.json({ 
        message: 'If an account exists with that email, a password reset link has been sent.',
        // In development, include the token
        ...(process.env.NODE_ENV === 'development' && { resetToken, resetUrl })
      });
    } catch (error) {
      console.error('Password reset request error:', error);
      res.status(500).json({ error: 'Failed to process password reset request' });
    }
  }

  /**
   * Verify reset token
   */
  async verifyResetToken(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;

      const resetTokenHash = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

      const user = await prisma.user.findFirst({
        where: {
          passwordResetToken: resetTokenHash,
          passwordResetExpires: {
            gt: new Date(),
          },
        },
      });

      if (!user) {
        res.status(400).json({ error: 'Invalid or expired reset token' });
        return;
      }

      res.json({ 
        valid: true,
        email: user.email 
      });
    } catch (error) {
      console.error('Token verification error:', error);
      res.status(500).json({ error: 'Failed to verify reset token' });
    }
  }

  /**
   * Reset password
   */
  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, newPassword } = req.body;

      if (!newPassword || newPassword.length < 8) {
        res.status(400).json({ error: 'Password must be at least 8 characters' });
        return;
      }

      const resetTokenHash = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

      const user = await prisma.user.findFirst({
        where: {
          passwordResetToken: resetTokenHash,
          passwordResetExpires: {
            gt: new Date(),
          },
        },
      });

      if (!user) {
        res.status(400).json({ error: 'Invalid or expired reset token' });
        return;
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password and clear reset token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetExpires: null,
        },
      });

      res.json({ message: 'Password reset successful' });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({ error: 'Failed to reset password' });
    }
  }

  /**
   * Generate JWT token
   */
  private generateToken(user: any): string {
    const secret = process.env.JWT_SECRET || 'your-secret-key';

    const payload = {
      userId: user.id,
      email: user.email,
      practiceId: user.practiceId,
      role: user.role,
    };

    const options: SignOptions = {
      expiresIn: '7d'
    };

    return jwt.sign(payload, secret, options);
  }
}

