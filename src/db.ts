
import mongoose, { Schema } from "mongoose";
import 'dotenv/config'


//userModel
const UserSchema = new Schema({
  username: { type: String, unique: true, sparse: true },
  email: { type: String, unique: true, sparse: true },
  password: { type: String },
  googleId: { type: String, unique: true, sparse: true },
  profilePicture: { type: String },
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
  createdAt: { type: Date, default: Date.now }
});

export const UserModel = mongoose.model("User", UserSchema);

// TagModel
const TagSchema = new Schema({
  name: { type: String, required: true },
  userId: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});
TagSchema.index({ name: 1, userId: 1 }, { unique: true });
export const TagModel = mongoose.model("Tag", TagSchema);

//ContentModel

const ContentSchema = new Schema ({
    title : String,
    link  : String,
    type  : String,
    tags : [{type: mongoose.Types.ObjectId, ref:'Tag'}],
    userId: {type:mongoose.Types.ObjectId, ref:"User", required: true}

})

export const ContentModel = mongoose.model("Content", ContentSchema);


const LinkSchema = new Schema ({
  hash: String ,
  userId:{type:mongoose.Types.ObjectId, ref:"User", required: true, unique: true}
})

export const LinkModel = mongoose.model("Link", LinkSchema);




// Database connection

export const connectDB = async () => {
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) {
    throw new Error("MONGO_URI environment variable is not set");
  }
  try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    throw error;
  }
};
