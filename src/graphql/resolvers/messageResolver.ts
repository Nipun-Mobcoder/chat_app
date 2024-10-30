import Message from "../../models/Message.js";
import { PubSub } from 'graphql-subscriptions';
import { withFilter } from 'graphql-subscriptions';
import { getUserFromToken } from '../../utils/jwt.js';
import { getPresignedUrl, s3, uploadToS3 } from '../../utils/s3.js';
import { GraphQLUpload } from "graphql-upload-ts";

const pubsub = new PubSub();

const messageResolver = {
  Upload: GraphQLUpload,
  Query: {
    messages: async (_ : any, __: {}, context: { token : string }) => {
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
        var formattedTime;
        if(msg.createdAt){
          const date = new Date(msg.createdAt)
          var hours = date.getHours();
          var minutes = date.getMinutes();

          formattedTime = hours + ':' + minutes.toString().padStart(2, "0");
        }
        return { id: msg._id.toString(), sender: msg.senderName ?? msg.sender, message: msg.message, file, createdAt: msg.createdAt ? formattedTime : "00:00" };
      });
    },
    showUserMessage: async (_ : any, {sender}, context: { token : string }) => {
      const userData : { id: string } = await getUserFromToken(context.token);
      const { id } = userData;
      const dbMessages = await Message.find({
        $or: [{$and:[ {to: id}, {sender: sender}] }, { $and:[ {sender: id}, {to: sender}] }]
      });
      return dbMessages.map(async (msg) => {
        let file = null;
        if (msg.file) {
          const key = msg.file.url.split('/').pop();
          const presignedUrl = await getPresignedUrl(key);
          file = { filename: msg.file.filename, mimetype: msg.file.mimetype, url: presignedUrl };
        }
        var formattedTime;
        if(msg.createdAt){
          const date = new Date(msg.createdAt)
          var hours = date.getHours();
          var minutes = date.getMinutes();

          formattedTime = hours + ':' + minutes.toString().padStart(2, "0");
        }
        return { id: msg._id.toString(), sender: msg.senderName ?? msg.sender, message: msg.message, file, createdAt: msg.createdAt ? formattedTime : "00:00" };
      });
    },
  },
  Mutation: {
    sendMessage: async (_: any, { to, message, file }: any, context: { token: string }) => {
      const userData : { id: string, userName: string } = await getUserFromToken(context.token);
        let fileData = null;
        let subfileData = null;
        
        if(file){
          const { createReadStream, filename, mimetype } = await file;
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
        const newMessage = {
          id,
          sender: userName,
          message,
          file: subfileData,
          to,
        };

        pubsub.publish('MESSAGE_ADDED', {
          showMessages: newMessage,
          showUsersMessages: newMessage,
          to,
          id,
        });

        try {
          await Message.create({
            sender: id,
            message,
            to,
            senderName: userName,
            file: fileData,
          });
        } catch (error) {
          return error.message;
        }
    return "Message sent successfully";
    },
      complete: async (_: any, { fileName, uploadId, parts, to }, context: { token: string }) => {
        const userData: { id: string, userName: string } = await getUserFromToken(context.token);
        const { id, userName } = userData;
  
        const params = {
          Bucket: process.env.S3_BUCKET_NAME,
          Key: fileName,
          UploadId: uploadId,
          MultipartUpload: {
            Parts: parts.map((part, index) => ({
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
            id
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
          console.error("Error completing multipart upload:", error);
          throw new Error("Failed to complete multipart upload.");
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
        () => pubsub.asyncIterator(['MESSAGE_ADDED','FILE_ADDED']),
        async (payload, variables) => {
          const userData : { id: string, userName: string } = await getUserFromToken(variables.tokenId);
          return ( payload.to === userData.id && payload.id === variables.userId )
           || ( payload.id === userData.id && payload.to === variables.userId ) ;
        }
      ),
    },
  },
};

export default messageResolver;