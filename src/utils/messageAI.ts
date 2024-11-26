import { getUserFromToken } from "./jwt.js";
import Message from "../models/Message.js";
import chatAI from "./chatAI.js";
import pubsub from "./pubsub.js";
import User from "../models/User.js";

const messageAI = async (context: { token: string }, prompt: string) => {
    try {
        const userData : { id: string, userName: string } = await getUserFromToken(context.token);
        const to = process.env.CHAT_BOT_ID;
  
        const { id, userName } = userData;

        const chat_bot = await User.findOne({ _id: to });

        await Message.create({
            sender: id,
            message: prompt,
            to,
            senderName: userName,
        });

        let newMessage = {
            id,
            sender: userName,
            message: prompt,
            file: null,
            to,
          };

        pubsub.publish('MESSAGE_ADDED', {
            showMessages: newMessage,
            showUsersMessages: newMessage,
            to,
            id,
        });

        const message = await chatAI(prompt);

        await Message.create({
            sender: to,
            message,
            to: id,
            senderName: chat_bot.userName,
        });

          newMessage = {
            id: to,
            sender: chat_bot.userName,
            message,
            file: null,
            to: id,
          };
  
          pubsub.publish('MESSAGE_ADDED', {
            showMessages: newMessage,
            showUsersMessages: newMessage,
            to: id,
            id: to,
          });

        return message;  
    } 
    catch (e) {
        throw new Error(e?.message ?? "Looks like something went wrong.")
    }
}

export default messageAI;