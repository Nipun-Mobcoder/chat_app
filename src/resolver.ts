import { PubSub } from 'graphql-subscriptions';
import jwt from "jsonwebtoken"
import Message from "./models/Message.js"
import mongoose from 'mongoose';
import { withFilter } from 'graphql-subscriptions';
import dotenv from 'dotenv';

dotenv.config();

let messages = [];
const pubsub = new PubSub();
const uri = process.env.MONGO_URL;
const jwtSecret = process.env.JWT_Secret;

const loadMessagesFromDB = async () => {
  try {
    await mongoose.connect(uri);
    const dbMessages = await Message.find({});
    dbMessages.forEach(msg => {
      const formattedMessage = `${msg.sender}: ${msg.message}`;
      messages.push(formattedMessage);
    });
  } catch (error) {
    console.error("Error loading messages from the database:", error);
  }
};

await loadMessagesFromDB();

const resolvers = {
    Query: {
        messages: () => {
            return messages;
        },
    },
    Mutation: {
      sendMessage: async (parent, { to, message }, context: any) => {
        try {
          await mongoose.connect(uri);
          const userData : {id: string, email: string} = await new Promise((resolve, reject) => {
            jwt.verify(context.token, jwtSecret, (err, decoded) => {
              if (err) {
                reject(err);
              } else {
                resolve(decoded);
              }
            });
          });
  
          const { id, email } = userData;
          const newMessage = `${id}: ${message}`;
          messages.push(newMessage);
  
          pubsub.publish('MESSAGE_ADDED', {
            showMessages: newMessage ,to
          });

          try {
            await Message.create({
              sender: id,
              message,
              to
            });
          } catch (error) {
            return error.message;
          }
          return "Message sent successfully";
        } catch (error) {
          return error.message;
        }
      },
    },
    Subscription: {
      messageAdded: {
          subscribe: () => pubsub.asyncIterator(['MESSAGE_ADDED']),
        },
        showMessages: {
          subscribe: withFilter(
            () => pubsub.asyncIterator(['MESSAGE_ADDED']),
            async (payload, variables) => {
              try {
                const userData:any = await new Promise((resolve, reject) => {
                  jwt.verify(variables.tokenId, jwtSecret, (err, decoded) => {
                    if (err) {
                      reject(err);
                    } else {
                      resolve(decoded);
                    }
                  });
                });
        
                const { id } = userData;
                return payload.to === id;
              } catch (error) {
                console.error("Error verifying token:", error);
                return false;
              }
            }
          ),
        }
    }
  };

  export default resolvers;