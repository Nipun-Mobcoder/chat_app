import mongoose from 'mongoose';

const { Schema } = mongoose;

const MessageSchema = new Schema({
  sender: String,
  message: String,
  to: String,
});

const Message = mongoose.model("Message", MessageSchema);

export default Message;