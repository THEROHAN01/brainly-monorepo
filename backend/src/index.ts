import express, { Request, Response } from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import { UserModel, ContentModel, connectDB, LinkModel, TagModel } from './db';
import { userMiddleware } from './middleware';
import { random } from './utils';
import { parseUrl, getProvider, getProviderInfo } from './providers';

// Validation schemas
const signupSchema = z.object({
    username: z.string()
        .min(3, "Username must be at least 3 characters")
        .max(30, "Username must be at most 30 characters")
        .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
    password: z.string()
        .min(6, "Password must be at least 6 characters")
        .max(100, "Password must be at most 100 characters")
});

const signinSchema = z.object({
    username: z.string().min(1, "Username is required"),
    password: z.string().min(1, "Password is required")
});

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error("FATAL: JWT_SECRET environment variable is not set");
    process.exit(1);
}

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
if (!GOOGLE_CLIENT_ID) {
    console.warn("WARNING: GOOGLE_CLIENT_ID not set - Google OAuth will be disabled");
}
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;
const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.use(express.json());

connectDB();

const PORT = process.env.PORT || 5000;

app.post("/api/v1/signup", async (req: Request, res: Response) => {
    // Validate input
    const result = signupSchema.safeParse(req.body);
    if (!result.success) {
        const errors = result.error.issues.map((e: { message: string }) => e.message);
        return res.status(400).json({ message: errors[0] });
    }

    const { username, password } = result.data;

    const existingUser = await UserModel.findOne({ username });
    if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    try {
        const user = new UserModel({ username, password: hashedPassword });
        await user.save();
        res.status(201).json({ message: "Account created successfully" });
    } catch (error: any) {
        console.error("Signup error:", error);
        res.status(500).json({ message: "Failed to create account" });
    }
});

app.post("/api/v1/signin", async (req: Request, res: Response) => {
    // Validate input
    const result = signinSchema.safeParse(req.body);
    if (!result.success) {
        const errors = result.error.issues.map((e: { message: string }) => e.message);
        return res.status(400).json({ message: errors[0] });
    }

    const { username, password } = result.data;

    const existingUser = await UserModel.findOne({ username });
    if (!existingUser) {
        return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check if user has a password (Google OAuth users don't have passwords)
    if (!existingUser.password) {
        return res.status(400).json({message: "This account uses Google sign-in. Please use Google to log in."})
    }

    const isMatch = await bcrypt.compare(password, existingUser.password);

    if (isMatch){
        const token = jwt.sign(
            { id: existingUser._id },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token
        })
        
    }else {
        res.status(403).json({
            message: " Incorrect Credentials "
        });
    }

});

// Google OAuth endpoint
app.post("/api/v1/auth/google", async (req: Request, res: Response) => {
    if (!googleClient || !GOOGLE_CLIENT_ID) {
        return res.status(503).json({ message: "Google authentication is not configured" });
    }

    const { credential } = req.body;

    if (!credential) {
        return res.status(400).json({ message: "Google credential is required" });
    }

    try {
        // Verify the Google token
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        if (!payload) {
            return res.status(401).json({ message: "Invalid Google token" });
        }

        const { sub: googleId, email, name, picture } = payload;

        // Find existing user by googleId or email
        let user = await UserModel.findOne({
            $or: [{ googleId }, { email }]
        });

        if (!user) {
            // Create new user
            user = await UserModel.create({
                googleId,
                email,
                username: email?.split('@')[0] || `user_${googleId?.slice(0, 8)}`,
                profilePicture: picture,
                authProvider: 'google'
            });
        } else if (!user.googleId) {
            // Link Google account to existing user (found by email)
            user.googleId = googleId;
            user.profilePicture = picture;
            user.authProvider = 'google';
            await user.save();
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user._id },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({ token });
    } catch (error: any) {
        console.error("Google auth error:", error);
        res.status(401).json({ message: "Google authentication failed" });
    }
});

/**
 * Create new content
 *
 * This endpoint accepts any valid URL and auto-detects the content type.
 * Supported types: YouTube, Twitter, and generic links (any other URL).
 *
 * The URL is parsed to extract:
 * - type: Provider type (youtube, twitter, link)
 * - contentId: Unique identifier (video ID, tweet ID, or URL hash)
 *
 * @body {string} title - User-provided title for the content
 * @body {string} link - URL to save (any valid HTTP/HTTPS URL)
 * @body {string[]} [tags] - Optional array of tag IDs
 */
app.post("/api/v1/content", userMiddleware, async (req: Request, res: Response) => {
    const { title, link, tags } = req.body;

    // Validate required fields
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
        return res.status(400).json({ message: "Title is required" });
    }

    if (!link || typeof link !== 'string') {
        return res.status(400).json({ message: "Link is required" });
    }

    // Validate title length
    if (title.length > 500) {
        return res.status(400).json({ message: "Title must be 500 characters or less" });
    }

    // Parse and validate URL using provider system
    const parsed = parseUrl(link);
    if (!parsed) {
        return res.status(400).json({ message: "Invalid URL format. Please provide a valid HTTP or HTTPS URL." });
    }

    try {
        const userId = req.userId;

        // Validate tags if provided (ensure they belong to this user)
        let validTagIds: mongoose.Types.ObjectId[] = [];
        if (tags && Array.isArray(tags) && tags.length > 0) {
            const userTags = await TagModel.find({
                _id: { $in: tags },
                userId
            });
            validTagIds = userTags.map(t => t._id);
        }

        // Create content with auto-detected type and extracted content ID
        const content = await ContentModel.create({
            title: title.trim(),
            link: parsed.originalUrl,      // Store original URL
            contentId: parsed.contentId,   // Store extracted ID
            type: parsed.type,             // Auto-detected type
            userId,
            tags: validTagIds
        });

        return res.status(201).json({
            message: "Content created successfully",
            content: {
                ...content.toObject(),
                // Include additional parsed info in response
                displayName: parsed.displayName,
                embedUrl: parsed.embedUrl,
                canonicalUrl: parsed.canonicalUrl,
                canEmbed: parsed.canEmbed
            }
        });
    } catch (error: any) {
        console.error("Content creation error:", error);
        return res.status(500).json({ message: "Failed to create content" });
    }
});

/**
 * Validate URL and get preview information
 *
 * This endpoint validates a URL and returns information for previewing
 * the content before saving. Useful for showing embed previews in the UI.
 *
 * @body {string} link - URL to validate
 */
app.post("/api/v1/content/validate", userMiddleware, async (req: Request, res: Response) => {
    const { link } = req.body;

    // Check if link is provided
    if (!link || typeof link !== 'string') {
        return res.status(400).json({
            valid: false,
            message: "URL is required"
        });
    }

    // Parse URL using provider system
    const parsed = parseUrl(link);

    if (!parsed) {
        return res.status(400).json({
            valid: false,
            message: "Invalid URL format. Please provide a valid HTTP or HTTPS URL."
        });
    }

    // Return validation result with preview information
    return res.json({
        valid: true,
        type: parsed.type,
        displayName: parsed.displayName,
        contentId: parsed.contentId,
        embedUrl: parsed.embedUrl,
        canonicalUrl: parsed.canonicalUrl,
        canEmbed: parsed.canEmbed,
        embedType: parsed.embedType
    });
});

/**
 * Get list of supported content providers
 *
 * Returns information about all registered content providers.
 * Useful for displaying supported platforms in the UI.
 */
app.get("/api/v1/content/providers", (req: Request, res: Response) => {
    const providers = getProviderInfo();
    res.json({ providers });
});


app.get("/api/v1/content" ,userMiddleware, async (req,res) =>{

    const userId = req.userId;
    const content = await ContentModel.find({
        userId: userId
    })
    .populate("userId", "username")
    .populate("tags", "name");

    res.json({
        content
    });
});

app.delete("/api/v1/content",userMiddleware,async (req,res) =>{

    const contentId  = req.body.contentId;
    if (!contentId){
        return res.status(400).json({message: "Content ID is required"})
    }
    try {
        const result = await ContentModel.findOneAndDelete({
            _id: contentId,
            userId: req.userId
        });
        if(!result){
            return res.status(404).json({message: "Content not found"});
        }
        res.json({
        message: "Content deleted successfully"
    });
    }catch(error){
        res.status(400).json({message: "Invalid contentId format "})
    }
    
    
});

// ========== TAG ENDPOINTS ==========

// Get all tags for the authenticated user
app.get("/api/v1/tags", userMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        const tags = await TagModel.find({ userId }).sort({ name: 1 });
        res.json({ tags });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch tags" });
    }
});

// Create a new tag
app.post("/api/v1/tags", userMiddleware, async (req: Request, res: Response) => {
    const { name } = req.body;

    if (!name || typeof name !== 'string') {
        return res.status(400).json({ message: "Tag name is required" });
    }

    const trimmedName = name.trim().toLowerCase();
    if (trimmedName.length === 0 || trimmedName.length > 50) {
        return res.status(400).json({ message: "Tag name must be 1-50 characters" });
    }

    try {
        const userId = req.userId;

        // Check if tag already exists for this user
        const existingTag = await TagModel.findOne({
            name: trimmedName,
            userId
        });

        if (existingTag) {
            return res.status(409).json({
                message: "Tag already exists",
                tag: existingTag
            });
        }

        const tag = await TagModel.create({
            name: trimmedName,
            userId
        });

        res.status(201).json({ message: "Tag created successfully", tag });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to create tag" });
    }
});

// Delete a tag (also removes it from all content)
app.delete("/api/v1/tags/:tagId", userMiddleware, async (req: Request, res: Response) => {
    const { tagId } = req.params;

    try {
        const userId = req.userId;

        // Delete the tag
        const result = await TagModel.findOneAndDelete({
            _id: tagId,
            userId
        });

        if (!result) {
            return res.status(404).json({ message: "Tag not found" });
        }

        // Remove this tag from all content that references it
        await ContentModel.updateMany(
            { userId },
            { $pull: { tags: tagId } }
        );

        res.json({ message: "Tag deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to delete tag" });
    }
});

// Update tags on existing content
app.put("/api/v1/content/:contentId/tags", userMiddleware, async (req: Request, res: Response) => {
    const { contentId } = req.params;
    const { tags } = req.body;

    if (!Array.isArray(tags)) {
        return res.status(400).json({ message: "Tags must be an array" });
    }

    try {
        const userId = req.userId;

        // Verify content belongs to user
        const content = await ContentModel.findOne({ _id: contentId, userId });
        if (!content) {
            return res.status(404).json({ message: "Content not found" });
        }

        // Verify all tags belong to this user
        let validTagIds: mongoose.Types.ObjectId[] = [];
        if (tags.length > 0) {
            const userTags = await TagModel.find({
                _id: { $in: tags },
                userId
            });
            validTagIds = userTags.map(t => t._id);
        }

        (content.tags as any) = validTagIds;
        await content.save();

        res.json({ message: "Tags updated successfully", content });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to update tags" });
    }
});

app.post("/api/v1/brain/share",userMiddleware,async(req,res) => {

    const share = req.body.share ;
    if(share){
        const existinglink  = await LinkModel.findOne({
            userId: req.userId
        });
        if(existinglink){
            res.json ({
                hash: existinglink.hash
            })
            return;
        }
        const hash = random(10)
        await LinkModel.create({
            userId: req.userId,
            hash: hash
        })

        res.json ({
            hash: hash
        });
        return;

    }else{
        await LinkModel.deleteOne({
            userId: req.userId
        });
        res.json({
            message : "removed link"
        });
        return;
    }


});

app.get("/api/v1/brain/:shareLink", async (req,res) =>{

    const hash = req.params.shareLink;

    const link = await LinkModel.findOne({
        hash
    });

    if (!link){
        res.status(411).json({
            message: "incorrect input"
        })
        return ;
    }

    const content  = await ContentModel.find({
        userId: link.userId
    })
    const user  = await UserModel.findById(link.userId);

    if(!user){
        res.status(411).json({
            message: " user not found , error should ideally not happen"
        })
        return;

    }
    res.json ({
        username: user.username,
        content : content
    })

});

// Get current user profile
app.get("/api/v1/me", userMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = req.userId;

        const user = await UserModel.findById(userId).select('-password -googleId');

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                profilePicture: user.profilePicture,
                authProvider: user.authProvider
            }
        });
    } catch (error: any) {
        res.status(500).json({ message: "Error fetching user profile" });
    }
});


app.listen(PORT , () => {
    console.log(`Server running on port ${PORT}`)
});
