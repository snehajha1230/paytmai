import mongoose, { Schema } from "mongoose";

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    phone: { type: String },
    favoriteContactIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "Contact" }],
      default: [],
    },
  },
  { timestamps: true },
);

export const User =
  mongoose.models.User || mongoose.model("User", UserSchema);
