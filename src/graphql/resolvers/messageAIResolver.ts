import Message from "../../models/Message.js";
import chatAI from "../../utils/chatAI.js"
import { getUserFromToken } from "../../utils/jwt.js";

const messageAI = {
    Mutation: {
        messageAI: async (_parent: any, { prompt }: { prompt: string }, context: { token: string }) => {
            try {
                const userData : { id: string, userName: string } = await getUserFromToken(context.token);
                const to = "674464212b1cba868d90cda9";
          
                const { id, userName } = userData;
                const message = await chatAI(prompt);
    
                await Message.create({
                    sender: id,
                    message: message,
                    to,
                    senderName: userName,
                });

                return message;  
            } 
            catch (e) {
                throw new Error(e?.message ?? "Looks like something went wrong.")
            }
        }
    }
}

export default messageAI;