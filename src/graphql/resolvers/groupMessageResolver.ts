import Group from "../../models/Group.js";
import User from "../../models/User.js";
import { getUserFromToken } from "../../utils/jwt.js";

const groupMessageResolver = {
    Mutation: {
        createGroup: async (_parent: any, { groupName, ids }: { groupName: string, ids: Array<string> }, context: { token: string } ) => {
            try {
                const userData: { id: string } = await getUserFromToken(context.token);
                const { id } = userData;
                const users: { user: string, role: "User" | "Admin" }[] = [];
                ids.forEach(userId => {
                    users.push({ user: userId, role: "User" });
                })
                const adminIndex = users.findIndex(user => user.user === id);
                if (adminIndex > -1) {
                    users[adminIndex].role = "Admin";
                } else {
                    users.push({ user: id, role: "Admin" });
                }
                await Group.create({ users, creator: id, groupName });
                return { users, creator: id, groupName };
            } catch (e) {
                throw new Error(e?.message ?? "Looks like something went wrong.")
            }
        },
        deleteGroup: async(_parent: any, {groupId}: {groupId: string}, context: { token: string }) => {
            try {
                const userData: { id: string } = await getUserFromToken(context.token);
                const { id } = userData;
                const groupDetails = await Group.findOne({ _id: groupId });
                if(!groupDetails) throw new Error("Group doesn't exist.");
                const { users, groupName } = groupDetails;
                var isPresent = false;
                users.forEach(user => {
                    if(user.user === id) {
                        isPresent = true;
                        if(user.role !== "Admin") throw new Error("You're not permitted")
                    }
                })
                if(!isPresent) throw new Error("User is not present in this group.");
                const group = await Group.deleteOne({ _id: groupId });
                return group;
            }
            catch(e) {
                throw new Error(e?.message ?? "Looks like something went wrong.")
            }
        },
        addUser: async(_parent: any, {groupId, userId}: {groupId: string, userId: string}, context: { token: string }) => {
            try {
                const userData: { id: string } = await getUserFromToken(context.token);
                const { id } = userData;
                const groupDetails = await Group.findOne({ _id: groupId });
                if(!groupDetails) throw new Error("Group doesn't exist.");
                const { users } = groupDetails;
                var isPresent = false;
                users.forEach(user => {
                    if(user.user === id) {
                        isPresent = true;
                        if(user.role !== "Admin") throw new Error("You're not permitted")
                    }
                })
                if(!isPresent) throw new Error("User is not present in this group.");
                const userDetails = await User.findOne({ _id: userId });
                if(!userDetails) throw new Error("User not found");
                const updatedUser = await Group.findOneAndUpdate(
                        { _id: groupId },
                        { 
                            $push: { 
                                users: { user: userId, role: "User" } 
                            } 
                        },
                        { new: true }
                    );
                return updatedUser;
            }
            catch(e) {
                throw new Error(e?.message ?? "Looks like something went wrong.")
            }
        }
    }
}

export default groupMessageResolver;