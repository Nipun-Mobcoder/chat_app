import User from "../../models/User.js";
import Message from '../../models/Message.js';
import { getPresignedUrl } from '../../utils/s3.js';
import { getUserFromToken } from "../../utils/jwt.js";
import Group from "../../models/Group.js";

const curResolver = {
  Query: {
    curUser: async (_: any, {}, context: { token: string }) => {
      try {
        const userData: { id: string, userName: string, email: string } = await getUserFromToken(context.token);
        const { id } = userData;

        const users = await User.find({});
        const allUsers = users.map(user => ({ id: String(user._id), user: user.userName, cur: userData.id === String(user._id) }));

        const groupDetails = await Group.find({});
        const userGroups = groupDetails
          .filter(group => group.users.some(user => user.user === id))
          .map(group => ({ id: group._id.toString(), user: group.groupName, cur: false }));

        return [...allUsers, ...userGroups];
      }
      catch(e) {
        throw new Error(e?.message ?? "Looks like something went wrong.")
      }
    },
    pagination: async (_: any, { pageNumber, limit }: { pageNumber: number, limit: number }, context: { token: string }) => {
      try {
        const userData : { id: string, userName: string, email: string } = await getUserFromToken(context.token);
        var message = await Message.aggregate([
          { "$match": { "$or": [ { "to": userData.id }, { "id": userData.id } ] } },
          {
            "$facet": {
              "metadata": [{ "$count": 'totalCount' }],
              "data": [{ "$skip": pageNumber * limit }, { "$limit": limit } ],
            },
          }
        ])
        var messages = message[0].data;
        const allMessages = messages.map( async (msg: { file: { url: string; filename: string; mimetype: string; }; createdAt: string | number | Date; _id: any; senderName: string; sender: string; message: string; to: string; }) => {
          let file = null;
          if (msg.file) {
            const key = msg.file.url.split('/').pop();
            const presignedUrl = await getPresignedUrl(key);
            file = { filename: msg.file.filename, mimetype: msg.file.mimetype, url: presignedUrl };
          }
          var formattedTime: String;
          if(msg.createdAt){
            const date = new Date(msg.createdAt);
            var hours = date.getHours();
            var minutes = date.getMinutes();
            formattedTime = `${date.getDate()}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()} (` + hours + ':' + minutes.toString().padStart(2, "0") + ')';
          }
          return {
            id: msg._id.toString(),
            sender: msg.senderName ?? msg.sender, 
            message: msg.message, 
            file, 
            createdAt: msg.createdAt ? formattedTime : "00:00",
            to: msg.to
          }
        })
        const totalPage = Math.ceil(message[0].metadata[0].totalCount / limit);
        if((pageNumber) > (totalPage - 1)) throw new Error("You've crossed the line.")
        return { messages: allMessages, totalPage: totalPage - 1, nextPageNumber: (pageNumber + 1) > (totalPage - 1) ? 0 : pageNumber + 1 }
      }
      catch(e) {
        throw new Error(e?.message ?? "Looks like something went wrong.")
      }
    },
    checkFeature: async (_parent: any, {to}: { to: string }, context: { token: string }) => {
      try {
        const userData : { id: string, userName: string, email: string } = await getUserFromToken(context.token);
        const findUser = await User.findOne({ _id: to });
        
        if(to === process.env.CHAT_BOT_ID) 
          return {
            payment: false,
            file: false
          }
        
        if(!findUser) {
          const findGroup = await Group.findOne({ _id: to });
          if(!findGroup) throw new Error("Wrong info provided.");
          return {
            payment: false,
            file: true
          }
        }

        return {
          payment: true,
          file: true
        }
      } catch(e) {
        console.log(e);
        throw new Error(e?.message ?? "Looks like something went wrong.")
      }
    }
  },
};

export default curResolver;