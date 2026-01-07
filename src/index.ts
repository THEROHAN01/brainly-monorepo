// import express from 'express';
// const app = express();
// import bcrypt from "bcrypt";
// import mongoose from 'mongoose';
// import jwt from 'jsonwebtoken';
// import { UserModel , connectDB} from './db';
// app.use(express.json());

// //connect the database 
// connectDB();

// const PORT =  process.env.PORT || 3000 ;

// app.post("/api/v1/signup", async (req,res) => {


//     const username = req.body.username ;
//     const password = req.body.password ;

//     if (!username || !password){
//         return res.status(400).json({
//             message: "Username and password lagta hai bro"
//         })
//     }

//     const existingUser = await UserModel.findOne({username});
//     if (existingUser){return res.status(400).json({message : "user pehele se hai bhai tera "})};

//     const salt = await bcrypt.genSalt(10);
//     const hashedPassword = await bcrypt.hash(password,salt);
//     try {
//         const user = new UserModel({
//             username: username,
//             password: hashedPassword
//         });
//         await user.save();
//         res.status(201).json({
//             message: "user created successfully you have signed up "
//         });
//     }catch(error){
//         res.status(500).json({message: "Error creating user:" , error});
//         }
    

   
// });


import express, { Request, Response } from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { UserModel, ContentModel, connectDB, LinkModel } from './db';
import { userMiddleware } from './middleware';
import { random } from './utils';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error("FATAL: JWT_SECRET environment variable is not set");
    process.exit(1);
}
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.use(express.json());

// TODO @THEROHAN01 !security !enhancement: Missing CORS configuration.
// File Path: e:\\100xdev\\week-15\\week_15.1_Building2ndbrain\\Brainly\\src\\index.ts
// Line Number(s): 58-60
// Issue Description: CORS is not configured. If the frontend is served from a different origin, browser requests will be blocked.
// Suggested Fix: Install `cors` and add `app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));` early in the middleware stack.

connectDB();

const PORT = process.env.PORT || 5000;

app.post("/api/v1/signup", async (req: Request, res: Response) => {
    // TODO @THEROHAN01 !bug !refactor: Missing input validation and inconsistent response shapes for signup.
    // File Path: e:\\100xdev\\week-15\\week_15.1_Building2ndbrain\\Brainly\\src\\index.ts
    // Line Number(s): 64-86
    // Issue Description: Signup performs only presence checks and returns informal messages. There is no validation
    // for username/password strength or standardized error response shape.
    // Suggested Fix: Add request validation (e.g., `zod` or `express-validator`) to enforce username/password rules
    // and standardize responses (e.g., `{ message, data? }` or `{ error: { code, message } }`).
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }

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
    res.status(500).json({ message: "Error creating user", error: error.message });
  }
});

app.post("/api/v1/signin",async (req,res) => {
    const {username , password } = req.body;
    // const salt = await bcrypt.genSalt(10);
    const existingUser = await UserModel.findOne({username});
    if (!existingUser){
        return res.status(400).json({message: "User not found"})
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

app.post("/api/v1/content", userMiddleware, async (req: Request, res: Response) => {
    const { title, link, type } = req.body;

    // Input validation
    if (!title || !link || !type) {
        return res.status(400).json({ message: "Title, link, and type are required" });
    }

    if (!['twitter', 'youtube'].includes(type)) {
        return res.status(400).json({ message: "Type must be 'twitter' or 'youtube'" });
    }

    try {
        const content = await ContentModel.create({
            title,
            link,
            type,
            //@ts-ignore
            userId: req.userId,
            tags: []
        });

        return res.status(201).json({
            message: "Content created successfully",
            content
        });
    } catch (error: any) {
        return res.status(500).json({ message: "Failed to create content" });
    }
});


app.get("/api/v1/content" ,userMiddleware, async (req,res) =>{

    //@ts-ignore
    const userId = req.userId;
    const content = await ContentModel.find({
        userId: userId
    }).populate("userId","username");
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
            //@ts-ignore
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


app.post("/api/v1/brain/share",userMiddleware,async(req,res) => {

    const share = req.body.share ;
    if(share){
        const existinglink  = await LinkModel.findOne({
            //@ts-ignore
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
            //@ts-ignore
            userId: req.userId,
            hash: hash
        })

        res.json ({
            hash: hash
        });
        return;

    }else{
        await LinkModel.deleteOne({
            //@ts-ignore
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
        //@ts-ignore
        username: user.username,
        content : content
    })

});

// Get current user profile
app.get("/api/v1/me", userMiddleware, async (req: Request, res: Response) => {
    try {
        //@ts-ignore
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
