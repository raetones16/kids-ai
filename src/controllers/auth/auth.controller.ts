// src/controllers/auth/auth.controller.ts
import { Request, Response } from 'express';
import { Types } from 'mongoose';
import User from '../../models/User';

export class AuthController {
    // Return type is now Promise<void>
    static async register(req: Request, res: Response): Promise<void> {
        try {
            const { email, password } = req.body;

            const existingUser = await User.findByEmail(email);
            if (existingUser) {
                res.status(400).json({ 
                    success: false, 
                    message: 'Email already registered' 
                });
                return;
            }

            const user = await User.create({
                email,
                password
            });

            // Create a safe user object without password
            const userResponse = {
                email: user.email,
                emailVerified: user.emailVerified,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
                _id: user._id
            };

            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                data: userResponse
            });
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({
                success: false,
                message: 'Error registering user',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    static async login(req: Request, res: Response): Promise<void> {
        try {
            const { email, password } = req.body;

            console.log('Login attempt for email:', email);

            const user = await User.findOne({ email }).select('+password');
            if (!user) {
                console.log('User not found');
                res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
                return;
            }

            console.log('Found user:', user._id);

            const isMatch = await user.comparePassword(password);
            console.log('Password match result:', isMatch);

            if (!isMatch) {
                res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
                return;
            }

            // Type assertion for _id
            const userId = (user._id as Types.ObjectId).toString();
            
            // Set session data
            req.session.userId = userId;
            req.session.email = user.email;
            req.session.lastAccess = new Date();

            // Rest of the code remains the same...

            res.json({
                success: true,
                message: 'Login successful',
                data: {
                    email: user.email,
                    emailVerified: user.emailVerified,
                    lastLogin: user.lastLogin,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
                    _id: userId
                }
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                message: 'Error during login',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    static async logout(req: Request, res: Response): Promise<void> {
        try {
            res.json({
                success: true,
                message: 'Logout successful'
            });
        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({
                success: false,
                message: 'Error during logout'
            });
        }
    }
}