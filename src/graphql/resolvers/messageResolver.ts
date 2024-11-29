import { withFilter } from 'graphql-subscriptions';
import { GraphQLUpload } from "graphql-upload-ts";
import { ReadStream } from 'fs';

import Message from "../../models/Message.js";
import { getUserFromToken } from '../../utils/jwt.js';
import { getPresignedUrl, s3, uploadToS3 } from '../../utils/s3.js';
import encrypt from "../../utils/encrypt.js";
import pubsub from "../../utils/pubsub.js";
import Group from "../../models/Group.js";
import User from "../../models/User.js";
import sendMessageGroup from "../../utils/sendMessageGroup.js";
import showGroupMessages from "../../utils/showMessageGroup.js";
import sendFileGroup from "../../utils/sendFileGroup.js";
import formatDate from "../../utils/formatDate.js";
import messageAI from '../../utils/messageAI.js';

type FileUpload = {
  filename: string;
  mimetype: string;
  encoding: string;
  createReadStream: () => ReadStream; 
};

const messageResolver = {
  Upload: GraphQLUpload,
  Query: {
    messages: async (_ : any, __: {}, context: { token : string }) => {
      try {
        const userData : { id: string } = await getUserFromToken(context.token);
        const { id } = userData;
        const dbMessages = await Message.find({
          $or: [{ to: id }, { sender: id }]
        });
        return dbMessages.map(async (msg) => {
          let file = null;
          if (msg.file) {
            const key = msg.file.url.split('/').pop();
            const presignedUrl = await getPresignedUrl(key);
            file = { filename: msg.file.filename, mimetype: msg.file.mimetype, url: presignedUrl };
          }
          var formattedTime: string;
          if(msg.createdAt){
            const date = new Date(msg.createdAt);
            var hours = date.getHours();
            var minutes = date.getMinutes();
  
            formattedTime = hours + ':' + minutes.toString().padStart(2, "0");
          }
          return { id: msg._id.toString(), sender: msg.senderName ?? msg.sender, message: msg.message, file, createdAt: msg.createdAt ? formattedTime : "00:00", to: msg?.sender };
        });
      } catch (e) {
        throw new Error(e?.message ?? "Looks like something went wrong.");
      }
    },
    showUserMessage: async (_ : any, {sender}: { sender: string }, context: { token : string }) => {
      try {
        const userData : { id: string } = await getUserFromToken(context.token);
        const { id } = userData;
        const findUser = await User.findOne({ _id: sender });
        if(!findUser) {
          return showGroupMessages(sender, context);
        }
        const dbMessages = await Message.find({
          $or: [{ $and:[ {to: id}, {sender: sender}] }, { $and:[ {sender: id}, {to: sender}] }]
        });
        return dbMessages.map(async (msg) => {
          let file = null;
          if (msg.file) {
            const key = msg.file.url.split('/').pop();
            const presignedUrl = await getPresignedUrl(key);
            file = { filename: msg.file.filename, mimetype: msg.file.mimetype, url: presignedUrl };
          }
          var formattedTime: string;
          if(msg.createdAt){
            const date = new Date(msg.createdAt);
            var hours = date.getHours();
            var minutes = date.getMinutes();
  
            formattedTime = hours + ':' + minutes.toString().padStart(2, "0");
            var fullDate = formatDate(date);
          }
          return { id: msg._id.toString(), sender: msg.senderName ?? msg.sender, message: msg.message, file, createdAt: msg.createdAt ? formattedTime : "00:00", to: msg?.sender, date: fullDate ?? "Last Year."  };
        });
      } catch (e) {
        throw new Error(e?.message ?? "Looks like something went wrong.");
      }
    },
    
  },
  Mutation: {
    sendMessage: async (_: any, { to, message, file }: { to: string, message: string, file: FileUpload }, context: { token: string }) => {
      try {
        const userData : { id: string, userName: string } = await getUserFromToken(context.token);
        const findUser = await User.findOne({ _id: to });
        
        if(to === process.env.CHAT_BOT_ID) return messageAI(context, message);
        
        if(!findUser) {
          return sendMessageGroup(to, message, file, context);
        }
        
        let fileData = null;
        let subfileData = null;

        if(file){
          const { createReadStream, filename, mimetype } = file;
          const fileStream = createReadStream();
          const uploadResult = await uploadToS3(fileStream, filename, mimetype);

          fileData = {
            filename,
            mimetype,
            url: uploadResult.Location,
          };

          const presignedUrl = await getPresignedUrl(uploadResult.Key);
          
          subfileData = {
            filename,
            mimetype,
            url: presignedUrl,
          };
        }

        const { id, userName } = userData;
        if(message)
          var encrypted_message = await encrypt(to, id, message);

        const newMessage = {
          id,
          sender: userName,
          message: encrypted_message,
          file: subfileData,
          to,
        };

        await Message.create({
          sender: id,
          message: encrypted_message,
          to,
          senderName: userName,
          file: fileData,
        });

        pubsub.publish('MESSAGE_ADDED', {
          showMessages: newMessage,
          showUsersMessages: newMessage,
          to,
          id,
        });
        return "Message sent successfully";  
        } 
        catch (e) {
          throw new Error(e?.message ?? "Looks like something went wrong.")
        }    
      },
      complete: async (_: any, { fileName, uploadId, parts, to }: { fileName: string, uploadId: string, parts: { etag: string; }[], to: string }, context: { token: string }) => {
        const userData: { id: string, userName: string } = await getUserFromToken(context.token);
        const { id, userName } = userData;
  
        const findUser = await User.findOne({ _id: to });
        if(!findUser) {
          return sendFileGroup(context, fileName, uploadId, parts, to);
        }

        const params = {
          Bucket: process.env.S3_BUCKET_NAME,
          Key: fileName,
          UploadId: uploadId,
          MultipartUpload: {
            Parts: parts.map((part: { etag: string; }, index: number) => ({
              ETag: part.etag,
              PartNumber: index + 1,
            })),
          },
        };
  
        try {
          const data = await s3.completeMultipartUpload(params).promise();
          const fileUrl = data.Location;
          const presignedUrl = await getPresignedUrl(data.Key);
          const newMessage = {
            id,
            sender: userName,
            message: '',
            file: {
              filename: fileName,
              mimetype: 'video/mp4',
              url: presignedUrl,
            },
            to,
          };
  
          pubsub.publish('FILE_ADDED', {
            showMessages: newMessage,
            showUsersMessages: newMessage,
            to,
            id,
            isGroup: false
          });
  
          await Message.create({
            sender: id,
            message: '',
            to,
            senderName: userName,
            file: {
              filename: fileName,
              url: fileUrl,
            },
          });
  
          return "Message sent successfully";
        } catch (error) {
          throw new Error(error?.message ?? "Failed to complete multipart upload.");
        }
    },
  },
  Subscription: {
    showMessages: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['MESSAGE_ADDED','FILE_ADDED']),
        async (payload, variables) => {
          const userData : { id: string, userName: string } = await getUserFromToken(variables.tokenId);
          return payload.to === userData.id || payload.id === userData.id;
        }
      ),
    },
    showUsersMessages: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['MESSAGE_ADDED', 'FILE_ADDED']),
        async (payload, variables) => {
          const userData: { id: string, userName: string } = await getUserFromToken(variables.tokenId);
    
          if (!payload.isGroup) {
            return (
              (payload.to === userData.id && payload.id === variables.userId) ||
              (payload.id === userData.id && payload.to === variables.userId)
            );
          } else {
            try {
              const id = payload.groupId;
              const groupDetails = await Group.findOne({ _id: id });
              if (!groupDetails) throw new Error("Group doesn't exist.");
      
              return groupDetails.users.some(user => user.user === userData.id);
            } catch (e) {
              throw new Error(e?.message ?? "Looks like something went wrong.")
            }
          }
        }
      ),
    }
    
  },
};

export default messageResolver;