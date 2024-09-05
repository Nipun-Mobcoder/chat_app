import { PubSub } from 'graphql-subscriptions';
import jwt from "jsonwebtoken"
import Message from "./models/Message.js"
import mongoose from 'mongoose';
import { withFilter } from 'graphql-subscriptions';
import { GraphQLUpload } from 'graphql-upload-ts';
import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const pubsub = new PubSub();
const uri = process.env.MONGO_URL;
const jwtSecret = process.env.JWT_Secret;

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const resolvers = {
    Upload: GraphQLUpload,
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
            
            return dbMessages.map(async (msg) => {
              let file = null;
              
              if (msg.file) {
                const s3Params = {
                  Bucket: process.env.S3_BUCKET_NAME,
                  Key: msg.file.url.split('/').pop(),
                  Expires: 60 * 60,
                };
                const presignedUrl = await s3.getSignedUrlPromise('getObject', s3Params);
                
                file = {
                  filename: msg.file.filename,
                  mimetype: msg.file.mimetype,
                  url: presignedUrl,
                };
              }

              return {
                id: msg._id.toString(),
                sender: msg.senderName ?? msg.sender,
                message: msg.message,
                file,
              };
            });
          } catch (error) {
            console.error("Error loading messages from the database:", error);
            return [];
          }
        },
    },
    Mutation: {
      sendMessage: async (parent, { to, message, file }, context: any) => {
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

          let fileData = null;
          let subfileData = null;
          
          if(file){
            const { createReadStream, filename, mimetype } = await file;
            const fileStream = createReadStream();

            const s3Params = {
              Bucket: process.env.S3_BUCKET_NAME,
              Key: `${uuidv4()}-${filename}`,
              Body: fileStream,
              ContentType: mimetype,
            };

            const uploadResult = await s3.upload(s3Params).promise();
            fileData = {
              filename,
              mimetype,
              url: uploadResult.Location,
            };
            const subs3Params = {
              Bucket: process.env.S3_BUCKET_NAME,
              Key: uploadResult.Key,
              Expires: 60 * 60,
            };
            const presignedUrl = await s3.getSignedUrlPromise('getObject', subs3Params);
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