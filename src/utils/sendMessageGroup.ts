import { ReadStream } from "fs";
import Group from "../models/Group.js";
import Message from "../models/Message.js";
import { getUserFromToken } from "./jwt.js";
import pubsub from "./pubsub.js";
import { getPresignedUrl, uploadToS3 } from "./s3.js";
import formatDate from "./formatDate.js";

type FileUpload = {
    filename: string;
    mimetype: string;
    encoding: string;
    createReadStream: () => ReadStream; 
  };

const sendMessageGroup = async (groupId: string, message: string, file: FileUpload, context: {token: string}) => {
    try {
        const userData : { id: string, userName: string } = await getUserFromToken(context.token);
        const groupDetails = await Group.findOne({ _id: groupId });
        if(!groupDetails) throw new Error("Group doesn't exist.");

        if(file){
            const { createReadStream, filename, mimetype } = await file;
            const fileStream = createReadStream();
            const uploadResult = await uploadToS3(fileStream, filename, mimetype);
    
            var fileData = {
                filename,
                mimetype,
                url: uploadResult.Location,
            };
    
            const presignedUrl = await getPresignedUrl(uploadResult.Key);
            
            var subfileData = {
                filename,
                mimetype,
                url: presignedUrl,
            };
        }

        const { id, userName } = userData;

        const date = new Date();

        var fullDate = formatDate(date);

        const newMessage = {
            id,
            sender: userName,
            message: message,
            file: subfileData,
            to: groupId,
            date: fullDate
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

export default sendMessageGroup;