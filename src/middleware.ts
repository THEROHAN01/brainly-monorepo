import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import 'dotenv/config';

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

// TODO @THEROHAN01 !security !bug: Unsafe JWT verification and header handling.
// File Path: e:\\100xdev\\week-15\\week_15.1_Building2ndbrain\\Brainly\\src\\middleware.ts
// Line Number(s): 2-15
// Issue Description: The code calls `jwt.verify(header as string, JWT_PASSWORD)` without checking for a missing/invalid
// authorization header, lacks a try/catch around `jwt.verify`, and only accepts the raw token string (it does not support
// the common `Bearer <token>` format). An invalid or missing token will throw and may crash the request handler or app.
// Suggested Fix: Validate presence and type of `req.headers.authorization`; if the header starts with `Bearer ` extract the
// token portion. Wrap `jwt.verify(token, SECRET)` in a try/catch and return `401` on failure. Move secret to env `JWT_SECRET`.
// Also add a typed `req.userId?: string` to Express Request (via `declare global`) to avoid `@ts-ignore`.

// this midleware takes the token from the authorisation header and authenticates the user usinng the jwt secret 
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
            //@ts-ignore
            req.userId = decoded.id;
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