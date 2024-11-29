import jwt from 'jsonwebtoken';

interface DecodedUser {
    id: string;
    userName: string;
    email: string;
    phoneNumber: number;
    isAdmin: boolean; 
    role: string; 
    address: string; 
    walletAmount: number
}

export const getUserFromToken = async (token: string): Promise<DecodedUser> => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, process.env.JWT_Secret, (err: any, decoded: DecodedUser | PromiseLike<DecodedUser>) => {
      if (err || !decoded) {
        reject(err || new Error("Invalid token"));
      } else {
        resolve(decoded);
      }
    });
  });
};