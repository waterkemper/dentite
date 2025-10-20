import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

export class AuthController {
  constructor() {
    this.register = this.register.bind(this);
    this.login = this.login.bind(this);
    this.getCurrentUser = this.getCurrentUser.bind(this);
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

