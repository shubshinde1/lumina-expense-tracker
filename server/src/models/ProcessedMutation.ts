import mongoose from 'mongoose';

const processedMutationSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    statusCode: { type: Number, required: true },
    responseBody: { type: mongoose.Schema.Types.Mixed },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: true }
);

// Create TTL index to automatically purge records after expiration date
processedMutationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ProcessedMutation = mongoose.model('ProcessedMutation', processedMutationSchema);
