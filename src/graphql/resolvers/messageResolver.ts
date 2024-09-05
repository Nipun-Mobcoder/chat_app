import Message from "../../models/Message.js";
import { PubSub } from 'graphql-subscriptions';
import { withFilter } from 'graphql-subscriptions';
import { getUserFromToken } from '../../utils/jwt.js';
import { getPresignedUrl, uploadToS3 } from '../../utils/s3.js';
import { GraphQLUpload } from "graphql-upload-ts";

const pubsub = new PubSub();

const messageResolver = {
  Upload: GraphQLUpload,
  Query: {
    messages: async (parent, args, context) => {
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
        return { id: msg._id.toString(), sender: msg.senderName ?? msg.sender, message: msg.message, file };
      });
    },
  },
  Mutation: {
    sendMessage: async (parent, { to, message, file }, context) => {
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
          showMessages: newMessage ,to
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
  },
  Subscription: {
    showMessages: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['MESSAGE_ADDED']),
        async (payload, variables) => {
          const userData : { id: string, userName: string } = await getUserFromToken(variables.tokenId);
          return payload.to === userData.id;
        }
      ),
    },
  },
};

export default messageResolver;
function uuidv4() {
  throw new Error("Function not implemented.");
}

