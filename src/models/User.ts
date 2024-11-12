import mongoose from 'mongoose';

const { Schema } = mongoose;

const UserSchema = new Schema({
  userName: String,
  email: { type: String, unique: true },
  password: String,
});

UserSchema.index({ userName: 'text', email: 'text' }, { name: 'name_email_text' });

const User = mongoose.model("User", UserSchema);

export default User;