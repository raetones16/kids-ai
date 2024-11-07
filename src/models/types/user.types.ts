// src/models/types/user.types.ts
import { Document, Model } from 'mongoose';

export interface IUser extends Document {
    email: string;
    password: string;
    createdAt: Date;
    updatedAt: Date;
    lastLogin?: Date;
    emailVerified: boolean;
    verificationToken?: string;
    resetPasswordToken?: string;
    resetPasswordExpires?: Date;
}

export interface IUserMethods {
    comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface IUserModel extends Model<IUser, {}, IUserMethods> {
    findByEmail(email: string): Promise<IUser | null>;
}