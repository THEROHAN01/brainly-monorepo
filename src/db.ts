
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


const LinkSchema = new Schema ({
  hash: String ,
  userId:{type:mongoose.Types.ObjectId, ref:"User", required: true, unique: true}
})

export const LinkModel = mongoose.model("Link", LinkSchema);




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
