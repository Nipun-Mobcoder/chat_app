import mongoose from 'mongoose';

const { Schema } = mongoose;

const userSchema = new Schema({
    user: String,
    role: { type: String, enum: [ "Admin", "User" ], default: "User" }
})

const GroupSchema = new Schema({
    users: [userSchema],
    groupName: String,
    creator: String
}, { timestamps: true })

const Group = mongoose.model("Group", GroupSchema);

export default Group;