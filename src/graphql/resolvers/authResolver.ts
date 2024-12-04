import jwt from "jsonwebtoken";

import User from "../../models/User.js";
import { generateKeyPair } from "../../utils/encryptAESkey.js";

const authResolver = {
  Query: {
    login: async (_parent: any, { email, password }: { email: string, password: string }) => {
      const userDoc = await User.findOne({ email });
      if (userDoc && password === userDoc.password) {
        const token = jwt.sign({ email: userDoc.email, id: userDoc._id, userName: userDoc.userName, isAdmin: userDoc?.isAdmin ?? false, role: userDoc?.role ?? "Client", address: userDoc?.address ?? null, walletAmount: userDoc?.walletAmount ?? 0, phoneNumber: userDoc.phoneNumber }, process.env.JWT_Secret);
        return {token, name: userDoc.userName, email: userDoc.email, phoneNumber: userDoc.phoneNumber ?? 9999999999, id: userDoc._id.toString()};
      } else {
        throw new Error("Invalid credentials");
      }
    },
  },
  Mutation: {
    register: async (_parent: any, {userName, email, password, isAdmin, address, phoneNumber}: { userName: string, email: string, password: string, isAdmin: Boolean, address: any, phoneNumber: number }) => {
      try {
        const emailRegex = /^[^\W_]+\w*(?:[.-]\w*)*[^\W_]+@[^\W_]+(?:[.-]?\w*[^\W_]+)*(?:\.[^\W_]{2,})$/;
        if(!emailRegex.test(email))
          throw new Error("Please type a correct email Id");
        await generateKeyPair(email);
        const userDoc = await User.create({ userName, email, password, isAdmin, role : isAdmin ? "Admin" : "Client", address, phoneNumber });
        return userDoc;
      }
      catch(e) {
        throw new Error(e?.message ?? "Looks like something went wrong.");
      }
    }
  },
};

export default authResolver;