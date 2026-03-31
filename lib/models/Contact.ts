import mongoose, { Schema } from "mongoose";

const ContactSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    identifierType: {
      type: String,
      enum: ["phone", "upi"],
      required: true,
    },
    identifier: { type: String, required: true },
    initials: { type: String, required: true },
    avatarColor: { type: String, required: true },
    avatarImageUrl: { type: String, default: null },
    verified: { type: Boolean, default: false },
    starredSuggestion: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Contact =
  mongoose.models.Contact || mongoose.model("Contact", ContactSchema);
