import mongoose from 'mongoose';

const { Schema } = mongoose;

const FileSchema = new Schema({
  filename: String,
  mimetype: String,
  url: String,
});

const MessageSchema = new Schema({
  sender: String,
  message: String,
  to: String,
  senderName: String,
  file: FileSchema,
  isGroup: { type: Boolean, default: false },
  type: { type: String, default: 'Message' },
  amount: Number,
  currency: String
}, { timestamps: true });

const Message = mongoose.model("Message", MessageSchema);

export default Message;