import Group from "../models/Group.js";
import Message from "../models/Message.js";
import { getUserFromToken } from "./jwt.js";
import { getPresignedUrl } from "./s3.js";

const showGroupMessages = async (groupId: string, context: {token: string}) => {
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

export default showGroupMessages;