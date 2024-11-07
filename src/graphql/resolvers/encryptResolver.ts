import * as crypto from 'crypto';
import fs from 'fs';
import { encrypt } from '../../utils/encrypt.js';
import { getUserFromToken } from '../../utils/jwt.js';

var passphrase = "password"

const encryptResolver = {
    Query: {
        decrypt: async(_: any, {encryptedText}, context: {token: string}) => {
            const userData : { id: string, userName: string } = await getUserFromToken(context.token);
            if(!fs.existsSync(`encrypt_key${userData.id}.txt`))
                throw new Error("Private Key is absent");
            const jsonData = await fs.readFileSync(`encrypt_key${userData.id}.txt`);
            if(!JSON.parse(jsonData.toString()).privateKey) 
                throw new Error("Private Key is absent");
            return crypto.privateDecrypt({
                key: JSON.parse(jsonData.toString()).privateKey,
                passphrase: JSON.parse(jsonData.toString()).passphrase
              }, Buffer.from(encryptedText, 'base64')).toString('utf8');
        }
    }
};

export default encryptResolver;
