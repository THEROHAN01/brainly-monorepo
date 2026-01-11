import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import 'dotenv/config';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is not set");
}

// Middleware to authenticate user via JWT token
export const userMiddleware = (req:Request, res:Response, next:NextFunction) => {
    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            message: "Authorization header missing or in incorrect format"
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded && typeof decoded === 'object' && 'id' in decoded) {
            req.userId = decoded.id as string;
            next();
        } else {
            throw new Error("Invalid token payload");
        }
    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
}