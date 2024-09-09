import User from "../../models/User.js";
import jwt from "jsonwebtoken";

const authResolver = {
  Query: {
    login: async (parent, { email, password }) => {
      const userDoc = await User.findOne({ email });
      if (userDoc && password === userDoc.password) {
        const token = jwt.sign({ email: userDoc.email, id: userDoc._id, userName: userDoc.userName }, process.env.JWT_Secret);
        return token;
      } else {
        throw new Error("Invalid credentials");
      }
    },
  },
  Mutation: {
    register: async (parent, { userName, email, password }) => {
      const userDoc = await User.create({ userName, email, password });
      return userDoc;
    }
  },
};

export default authResolver;