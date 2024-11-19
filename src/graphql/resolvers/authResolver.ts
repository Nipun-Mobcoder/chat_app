import jwt from "jsonwebtoken";

import User from "../../models/User.js";

const authResolver = {
  Query: {
    login: async (_parent: any, { email, password }: { email: string, password: string }) => {
      const userDoc = await User.findOne({ email });
      if (userDoc && password === userDoc.password) {
        const token = jwt.sign({ email: userDoc.email, id: userDoc._id, userName: userDoc.userName }, process.env.JWT_Secret);
        return {token, name: userDoc.userName};
      } else {
        throw new Error("Invalid credentials");
      }
    },
  },
  Mutation: {
    register: async (_parent: any, { userName, email, password }: { userName: string, email: string, password: string }) => {
      const userDoc = await User.create({ userName, email, password });
      return userDoc;
    }
  },
};

export default authResolver;