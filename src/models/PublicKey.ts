import mongoose from 'mongoose';

const { Schema } = mongoose;

const PublicKeySchema = new Schema({
  email: { type: String, unique: true },
  publicKey: String,
});

const PublicKeyDB = mongoose.model("PublicKeyDB", PublicKeySchema);

export default PublicKeyDB;