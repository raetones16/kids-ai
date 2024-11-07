// src/middleware/validation/auth.validation.ts
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

// Validation schemas
const schemas = {
    register: Joi.object({
        email: Joi.string()
            .email()
            .required()
            .messages({
                'string.email': 'Please enter a valid email address',
                'any.required': 'Email is required'
            }),
        password: Joi.string()
            .min(8)
            .required()
            .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
            .messages({
                'string.min': 'Password must be at least 8 characters long',
                'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
                'any.required': 'Password is required'
            })
    }),

    login: Joi.object({
        email: Joi.string()
            .email()
            .required()
            .messages({
                'string.email': 'Please enter a valid email address',
                'any.required': 'Email is required'
            }),
        password: Joi.string()
            .required()
            .messages({
                'any.required': 'Password is required'
            })
    })
};

// Validation middleware factory that matches Express middleware signature
export const validate = (schemaName: keyof typeof schemas) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const schema = schemas[schemaName];
        const { error } = schema.validate(req.body, { abortEarly: false });
        
        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));
            
            res.status(400).json({
                success: false,
                message: 'Validation error',
                errors
            });
            return;
        }
        
        next();
    };
};