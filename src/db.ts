//////////////////////////////////creating a mongo connection ////////////////////////////////////////////////////
// const dotenv = require('dotenv');
// const envConfig = dotenv.config().parsed;
// if (envConfig) {
//   Object.keys(envConfig).forEach(key => process.env[key] = envConfig[key]);
// }

// const { MongoClient, ServerApiVersion } = require('mongodb');
// const uri = process.env.MONGO_URI; 
// // "mongodb+srv://rohansalunkhe700:<db_password>@cluster0.rztll3p.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// // Create a MongoClient with a MongoClientOptions object to set the Stable API version
// const client = new MongoClient(uri, {
//   serverApi: {
//     version: ServerApiVersion.v1,
//     strict: true,
//     deprecationErrors: true,
//   }
// });

// async function run() {
  // try {
    // Connect the client to the server	(optional starting in v4.7)
  // client.connect();
//     // Send a ping to confirm a successful connection
//     await client.db("admin").command({ ping: 1 });
//     console.log("Pinged your deployment. You successfully connected to MongoDB!");
//   } finally {
//     // Ensures that the client will close when you finish/error
//     await client.close();
//   }
// }
// run().catch(console.dir);

// TODO @THEROHAN01 !refactor !tech-debt: Remove or archive dead/commented raw MongoDB driver code.
// File Path: e:\\100xdev\\week-15\\week_15.1_Building2ndbrain\\Brainly\\src\\db.ts
// Line Number(s): 1-33
// Issue Description: The file contains a large commented section using the raw `mongodb` driver while the project
// uses `mongoose`. The `mongodb` package is also present in `package.json`, leading to duplication and confusion.
// Suggested Fix: Remove or archive the commented raw driver code. If `mongoose` is the only ORM used, remove `mongodb`
// from `package.json` to avoid extra dependencies.


//////////////////////////////////////////////schema design for the db /////////////////////////////////////////////////////

import mongoose, { Schema } from "mongoose";
import 'dotenv/config'


//userModel 
const UserSchema = new Schema({
  username: { type: String, unique: true },
  password: { type: String, required: true },
});

export const UserModel = mongoose.model("User", UserSchema);

//ContentModel

const ContentSchema = new Schema ({
    title : String,
    link  : String,
    // TODO @THEROHAN01 !bug !enhancement: `tags` references a missing `Tag` model.
    // File Path: e:\\100xdev\\week-15\\week_15.1_Building2ndbrain\\Brainly\\src\\db.ts
    // Line Number(s): 52-56
    // Issue Description: `tags` is defined as `[{ type: ObjectId, ref: 'Tag' }]` but there is no `Tag` model in this file.
    // Suggested Fix: Add a `Tag` schema and export `TagModel` (recommended) or change `tags` to `tags: [String]` if tags are simple labels.
    tags : [{type: mongoose.Types.ObjectId, ref:'Tag'}],
    userId: {type:mongoose.Types.ObjectId, ref:"User", required: true}

})

export const ContentModel = mongoose.model("Content", ContentSchema);




// Database connention //

export const connectDB = async () => {
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI){
    throw new Error(".env me uri nahi dala kya ?");
  }
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Mongodb connect ho gaya bhai");

  }catch(error){
    console.error("Mongodb ka connection fail hogaya:", error);
    // TODO @THEROHAN01 !bug !refactor: Avoid abrupt process exit on DB connect failure.
    // File Path: e:\\100xdev\\week-15\\week_15.1_Building2ndbrain\\Brainly\\src\\db.ts
    // Line Number(s): 66-80
    // Issue Description: `connectDB` logs the error and calls `process.exit(1)`, which immediately terminates the process.
    // Suggested Fix: Consider rethrowing the error to let the caller decide how to handle it, or implement retry/backoff logic
    // for improved resilience during development and testing. Example: remove `process.exit(1)` and `throw error` instead.
    process.exit(1);

  }
};
