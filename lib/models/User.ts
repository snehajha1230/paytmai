import mongoose, { Schema } from "mongoose";
import { PatiAeBudgetSchema } from "@/lib/models/PatiAeBudget";

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    phone: { type: String },
    accountBalance: { type: Number, default: 200_000 },
    favoriteContactIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "Contact" }],
      default: [],
    },
    patiAeBudget: { type: PatiAeBudgetSchema, required: false },
  },
  { timestamps: true },
);

export const User =
  mongoose.models.User || mongoose.model("User", UserSchema);
