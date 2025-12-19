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
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { UserModel, ContentModel, connectDB } from './db';
import { userMiddleware } from './middleware';

const JWT_PASSWORD = "Rohan" ;
// TODO @THEROHAN01 !security !bug: Hard-coded JWT secret and missing token expiry get it under env.
// File Path: e:\\100xdev\\week-15\\week_15.1_Building2ndbrain\\Brainly\\src\\index.ts
// Line Number(s): 49-57
// Issue Description: `JWT_PASSWORD` is hard-coded in source and tokens are signed without an expiry. This is insecure
// and prevents secret rotation or token invalidation.
// Suggested Fix: Move the secret to environment as `JWT_SECRET` and use `jwt.sign(payload, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' })`.
const app = express();
app.use(express.json());

// TODO @THEROHAN01 !security !enhancement: Missing CORS configuration.
// File Path: e:\\100xdev\\week-15\\week_15.1_Building2ndbrain\\Brainly\\src\\index.ts
// Line Number(s): 58-60
// Issue Description: CORS is not configured. If the frontend is served from a different origin, browser requests will be blocked.
// Suggested Fix: Install `cors` and add `app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));` early in the middleware stack.

connectDB();

const PORT = process.env.PORT || 3000;

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
    return res.status(400).json({ message: "Username and password lagta hai bro" });
  }

  const existingUser = await UserModel.findOne({ username });
  if (existingUser) {
    return res.status(400).json({ message: "user pehele se hai bhai tera" });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  try {
    const user = new UserModel({ username, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: "user created successfully you have signed up" });
  } catch (error: any) {
    res.status(500).json({ message: "Error creating user", error: error.message });
  }
});

app.post("/api/v1/signin",async (req,res) => {
    const {username , password } = req.body;
    // const salt = await bcrypt.genSalt(10);
    const existingUser = await UserModel.findOne({username});
    if (!existingUser){
        return res.status(400).json({message: "tera user he nahi bana hai bro "})
    }
    const isMatch = await bcrypt.compare(password, existingUser.password);

    if (isMatch){
        // TODO @THEROHAN01 !security !bug: Sign tokens with environment secret and expiry.
        // File Path: e:\\100xdev\\week-15\\week_15.1_Building2ndbrain\\Brainly\\src\\index.ts
        // Line Number(s): 96-101
        // Issue Description: Token is signed using a hard-coded secret and without expiry.
        // Suggested Fix: Read `JWT_SECRET` and `JWT_EXPIRES_IN` from env and sign with `jwt.sign({ id }, JWT_SECRET, { expiresIn })`.
        const token  = jwt.sign({
            id: existingUser._id
        }, JWT_PASSWORD);

        res.json({
            token
        })
        
    }else {
        res.status(403).json({
            message: " Incorrect Credentials "
        });        
    }

});

app.post("/api/v1/content",userMiddleware, (req,res) => {
    const title = req.body.title;
    const link = req.body.link ;
    const type = req.body.type ;
    // TODO @THEROHAN01 !bug !refactor: `POST /api/v1/content` should validate input and await DB write.
    // File Path: e:\\100xdev\\week-15\\week_15.1_Building2ndbrain\\Brainly\\src\\index.ts
    // Line Number(s): 114-130
    // Issue Description: The route does not validate `title`, `link`, `type` and calls `ContentModel.create` without awaiting it,
    // so it returns success even if the DB write fails.
    // Suggested Fix: Make the handler `async`, validate request body, `await ContentModel.create(...)` inside a try/catch,
    // return `201` with the created document on success, and return `400`/`500` on validation/DB errors respectively.
    ContentModel.create({
        title,
        link,
        type,
        //@ts-ignore
        userId: req.userId,
        tags: []
    })

    return res.json({
        message: "Content add kardiya maine tera!!!"
    })

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
        return res.status(400).json({message:"content id nahi diya to content kaise delete karu bro"})
    }
    try {
        const result = await ContentModel.findOneAndDelete({
            _id: contentId,
            //@ts-ignore
            userId: req.userId 
        });
        if(!result){
            return res.status(404).json({message: "content not found bro content id check kar"});
        }
        res.json({
        message: "delete kar diya bro tera content"
    });
    }catch(error){
        res.status(400).json({message: "Invalid contentId format "})
    }
    
    
});

/*
// TODO @THEROHAN01 !feature !enhancement: Implement brain sharing functionality
File Path: e:\\100xdev\\week-15\\week_15.1_Building2ndbrain\\Brainly\\src\\index.ts
Line Number(s): 173-179
Issue Description: `POST /api/v1/brain/share` and `GET /api/v1/brain/:shareLink` are not implemented (return 501). There is no model or contract for sharing brains.
Suggested Fix: Define a `Share` model (ownerId, contentIds, shareLink, createdAt). Implement create and fetch handlers that persist and retrieve shared brains. If not implementing now, add clear TODOs and documentation of expected payloads.
*/
app.post("/api/v1/brain/share", (req,res) => {
res.status(501).json({ message: "Not Implemented" });
});

app.get("/api/v1/brain/:shareLink", (req,res) =>{
    res.status(501).json({ message: "Not Implemented" });
});



app.listen(PORT , () => {
    console.log(`Server running on port ${PORT}`)
});
