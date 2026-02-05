
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
    // Content title provided by user
    title: { type: String, required: true, maxlength: 500 },

    // Original URL as submitted by user (preserved for reference and generic links)
    link: { type: String, required: true },

    // Extracted content ID (video ID, tweet ID, or URL hash for generic links)
    contentId: { type: String, required: true },

    // Provider type: 'youtube', 'twitter', 'link', etc.
    // Flexible string type allows easy addition of new providers
    type: { type: String, required: true },

    // User's tags for organization
    tags: [{ type: mongoose.Types.ObjectId, ref: 'Tag' }],

    // Owner of this content
    userId: { type: mongoose.Types.ObjectId, ref: "User", required: true },

    // Optional metadata (for future use: OG data, thumbnails, etc.)
    metadata: { type: Schema.Types.Mixed },

    // Timestamp for sorting and display
    createdAt: { type: Date, default: Date.now }
});

// Index for efficient queries by user, sorted by creation date
ContentSchema.index({ userId: 1, createdAt: -1 });

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
