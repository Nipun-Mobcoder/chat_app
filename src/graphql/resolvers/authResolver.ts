import User from "../../models/User.js";
import jwt from "jsonwebtoken";

const authResolver = {
  Mutation: {
    register: async (parent, { userName, email, password }) => {
      const userDoc = await User.create({ userName, email, password });
      return userDoc;
    },
    login: async (parent, { email, password }) => {
      const userDoc = await User.findOne({ email });
      if (userDoc && password === userDoc.password) {
        const token = jwt.sign({ email: userDoc.email, id: userDoc._id, userName: userDoc.userName }, process.env.JWT_Secret);
        return token;
      } else {
        console.log(userDoc.password,password)
        throw new Error("Invalid credentials");
      }
    },
  },
};

export default authResolver;