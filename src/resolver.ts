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

const resolvers = {
    Query: {
        messages: async (parent, {}, context: any) => {
          try {
            await mongoose.connect(uri);
            const userData : {id: string, userName: string} = await new Promise((resolve, reject) => {
              jwt.verify(context.token, jwtSecret, (err, decoded) => {
                if (err) {
                  reject(err);
                } else {
                  resolve(decoded);
                }
              });
            });
            const { id } = userData;
            const dbMessages = await Message.find({
              $or: [
                { to: id },
                { sender: id }
              ]
            });
            dbMessages.forEach(msg => {
              const name = msg.senderName ?? msg.sender;
              const formattedMessage = `${name}: ${msg.message}`;
              messages.push(formattedMessage);
            });
          } catch (error) {
            console.error("Error loading messages from the database:", error);
          }
          const allMessages = messages;
          messages = [];
          return allMessages;
        },
    },
    Mutation: {
      sendMessage: async (parent, { to, message }, context: any) => {
        try {
          await mongoose.connect(uri);
          const userData : {id: string, userName: string} = await new Promise((resolve, reject) => {
            jwt.verify(context.token, jwtSecret, (err, decoded) => {
              if (err) {
                reject(err);
              } else {
                resolve(decoded);
              }
            });
          });
          const { id, userName } = userData;
          const newMessage = `${userName}: ${message}`;
  
          pubsub.publish('MESSAGE_ADDED', {
            showMessages: newMessage ,to
          });

          try {
            await Message.create({
              sender: id,
              message,
              to,
              senderName: userName
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