import mongoose, { Schema } from "mongoose";

const TransactionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    contactId: {
      type: Schema.Types.ObjectId,
      ref: "Contact",
      required: false,
    },
    /** UPI / QR merchant pay when contactId is absent */
    qrMerchantName: { type: String },
    qrIdentifier: { type: String },
    qrInitials: { type: String },
    qrAvatarColor: { type: String },
    /** Single spend category (food, shopping, …) for QR payments */
    qrTag: { type: String },
    amount: { type: Number, required: true },
    /** Shown in history; each new tx is +8h after the previous for this user. */
    simulatedAt: { type: Date },
    message: { type: String, default: "" },
    status: {
      type: String,
      enum: ["completed"],
      default: "completed",
    },
  },
  { timestamps: true },
);

TransactionSchema.index({ userId: 1, createdAt: -1 });
TransactionSchema.index({ userId: 1, simulatedAt: -1 });

const MODEL = "Transaction";

/** Next.js HMR can keep a stale model where contactId was required; refresh registration. */
if (mongoose.models[MODEL]) {
  mongoose.deleteModel(MODEL);
}

export const Transaction = mongoose.model(MODEL, TransactionSchema);
