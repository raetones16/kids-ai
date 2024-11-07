// src/models/User.ts
import { Schema, model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser, IUserMethods, IUserModel } from './types/user.types';

const userSchema = new Schema<IUser, IUserModel, IUserMethods>(
    {
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            trim: true,
            lowercase: true,
            match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [8, 'Password must be at least 8 characters long'],
            select: false, // Don't include password in queries by default
        },
        emailVerified: {
            type: Boolean,
            default: false,
        },
        verificationToken: String,
        resetPasswordToken: String,
        resetPasswordExpires: Date,
        lastLogin: Date,
    },
    {
        timestamps: true, // Automatically manage createdAt and updatedAt
    }
);

// Index for faster email lookups
userSchema.index({ email: 1 });

// Hash password before saving
userSchema.pre('save', async function (next) {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) return next();

    try {
        // Generate salt and hash password
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        console.error('Error hashing password:', error);
        next(error as Error);
    }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
    try {
        // Use this.password directly since we're selecting it in the login query
        const isMatch = await bcrypt.compare(candidatePassword, this.password);
        return isMatch;
    } catch (error) {
        console.error('Password comparison error:', error);
        throw new Error('Error comparing passwords');
    }
};

// Static method to find user by email
userSchema.static('findByEmail', function (email: string) {
    return this.findOne({ email: email.toLowerCase() });
});

// Create and export the model
const User = model<IUser, IUserModel>('User', userSchema);
export default User;