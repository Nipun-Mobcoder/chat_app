import Group from "../../models/Group.js";
import Message from "../../models/Message.js";
import User from "../../models/User.js";
import { getUserFromToken } from "../../utils/jwt.js";
import pubsub from "../../utils/pubsub.js";
import { getPresignedUrl, uploadToS3 } from "../../utils/s3.js";

const groupMessageResolver = {
    Query: {
        showGroupMessages: async (_parent: any, { groupId }: {groupId: string}, context: { token: string }) => {
            try {
                const userData: { id: string } = await getUserFromToken(context.token);
                const { id } = userData;
                
                const groupDetails = await Group.findOne({ _id: groupId });
                if(!groupDetails) throw new Error("Group doesn't exist.");
                const isUserInGroup = groupDetails.users.some(user => user.user === id);
                if (!isUserInGroup) throw new Error("User is not present in the group.");
    
                const dbMessages = await Message.find({ to: groupId });
                
                return dbMessages.map(async (msg) => {
                    let file = null;
                    if (msg.file) {
                        const key = msg.file.url.split('/').pop();
                        const presignedUrl = await getPresignedUrl(key);
                        file = { filename: msg.file.filename, mimetype: msg.file.mimetype, url: presignedUrl };
                    }
                    var formattedTime: string;
                    if(msg.createdAt){
                        const date = new Date(msg.createdAt)
                        var hours = date.getHours();
                        var minutes = date.getMinutes();
            
                        formattedTime = hours + ':' + minutes.toString().padStart(2, "0");
                    }
                    return { id: msg._id.toString(), sender: msg.senderName ?? msg.sender, message: msg.message, file, createdAt: msg.createdAt ? formattedTime : "00:00", to: msg.sender };
                });
            } catch (e) {
                throw new Error(e?.message ?? "Looks like something went wrong.");
            }
        }
    },
    Mutation: {
        createGroup: async (_parent: any, { groupName, ids }: { groupName: string, ids: Array<string> }, context: { token: string } ) => {
            try {
                const userData: { id: string } = await getUserFromToken(context.token);
                const { id } = userData;
                const users: { user: string, role: "User" | "Admin" }[] = [];
                ids.forEach(userId => {
                    users.push({ user: userId, role: "User" });
                })
                const adminIndex = users.findIndex(user => user.user === id);
                if (adminIndex > -1) {
                    users[adminIndex].role = "Admin";
                } else {
                    users.push({ user: id, role: "Admin" });
                }
                await Group.create({ users, creator: id, groupName });
                return { users, creator: id, groupName };
            } catch (e) {
                throw new Error(e?.message ?? "Looks like something went wrong.")
            }
        },
        deleteGroup: async(_parent: any, {groupId}: {groupId: string}, context: { token: string }) => {
            try {
                const userData: { id: string } = await getUserFromToken(context.token);
                const { id } = userData;
                const groupDetails = await Group.findOne({ _id: groupId });
                if(!groupDetails) throw new Error("Group doesn't exist.");
                const { users } = groupDetails;
                var isPresent = false;
                users.forEach(user => {
                    if(user.user === id) {
                        isPresent = true;
                        if(user.role !== "Admin") throw new Error("You're not permitted")
                    }
                })
                if(!isPresent) throw new Error("User is not present in this group.");
                const group = await Group.deleteOne({ _id: groupId });
                return group;
            }
            catch(e) {
                throw new Error(e?.message ?? "Looks like something went wrong.")
            }
        },
        addUser: async(_parent: any, {groupId, userId}: {groupId: string, userId: string}, context: { token: string }) => {
            try {
                const userData: { id: string } = await getUserFromToken(context.token);
                const { id } = userData;
                const groupDetails = await Group.findOne({ _id: groupId });
                if(!groupDetails) throw new Error("Group doesn't exist.");
                const { users } = groupDetails;
                var isPresent = false;
                users.forEach(user => {
                    if(user.user === id) {
                        isPresent = true;
                        if(user.role !== "Admin") throw new Error("You're not permitted")
                    }
                })
                if(!isPresent) throw new Error("User is not present in this group.");
                const userDetails = await User.findOne({ _id: userId });
                if(!userDetails) throw new Error("User not found");
                const updatedUser = await Group.findOneAndUpdate(
                        { _id: groupId },
                        { 
                            $push: { 
                                users: { user: userId, role: "User" } 
                            } 
                        },
                        { new: true }
                    );
                return updatedUser;
            }
            catch(e) {
                throw new Error(e?.message ?? "Looks like something went wrong.")
            }
        },
        sendGroupMessage: async (_: any, { groupId, message, file }: any, context: { token: string }) => {
            try {
                const userData : { id: string, userName: string } = await getUserFromToken(context.token);
                const groupDetails = await Group.findOne({ _id: groupId });
                if(!groupDetails) throw new Error("Group doesn't exist.");
                let fileData = null;
                let subfileData = null;

                if(file){
                    const { createReadStream, filename, mimetype } = await file;
                    const fileStream = createReadStream();
                    const uploadResult = await uploadToS3(fileStream, filename, mimetype);
            
                    fileData = {
                        filename,
                        mimetype,
                        url: uploadResult.Location
                    };
            
                    const presignedUrl = await getPresignedUrl(uploadResult.Key);
                    
                    subfileData = {
                        filename,
                        mimetype,
                        url: presignedUrl
                    };
                }

                const { id, userName } = userData;
            //   if(message)
            //     var encrypted_message = await encrypt(groupId, id, message);

                const newMessage = {
                    id,
                    sender: userName,
                    message: message,
                    file: subfileData,
                    to: groupId,
                };
    
                await Message.create({
                    sender: id,
                    message: message,
                    to: groupId,
                    senderName: userName,
                    file: fileData,
                    isGroup: true
                });
        
                pubsub.publish('MESSAGE_ADDED', {
                    showMessages: newMessage,
                    showUsersMessages: newMessage,
                    groupId,
                    id,
                    isGroup: true
                });

                return "Message sent successfully";  
            } 
            catch (e) {
              throw new Error(e?.message ?? "Looks like something went wrong.")
            }    
        }
    }
}

export default groupMessageResolver;