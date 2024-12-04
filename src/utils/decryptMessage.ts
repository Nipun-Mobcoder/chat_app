import * as crypto from 'crypto';
import fs from 'fs';

import { getUserFromToken } from './jwt.js';

const decryptMessage = async (encryptedText: string, sender: boolean, context: { token: string }) => {
    try {
        const userData : { id: string, userName: string } = await getUserFromToken(context.token);
        const decodedMessage = Buffer.from(encryptedText, 'base64').toString('utf-8');
        const decodedJson = JSON.parse(decodedMessage);

        if(!fs.existsSync(`encrypt_key${userData.id}.txt`))
            throw new Error("Private Key is absent");

        const jsonData = await fs.promises.readFile(`encrypt_key${userData.id}.txt`);

        if(!JSON.parse(jsonData.toString()).privateKey) 
            throw new Error("Private Key is absent");

        if(sender) {
            var ivString =  crypto.privateDecrypt({
                key: JSON.parse(jsonData.toString()).privateKey,
                passphrase: JSON.parse(jsonData.toString()).passphrase
            }, Buffer.from(decodedJson.senderEncrIV, 'base64')).toString('utf8');
        }
        else {
            var ivString =  crypto.privateDecrypt({
                key: JSON.parse(jsonData.toString()).privateKey,
                passphrase: JSON.parse(jsonData.toString()).passphrase
            }, Buffer.from(decodedJson.encrIV, 'base64')).toString('utf8');
        }

        const iv = Buffer.from(ivString, "hex");
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(decodedJson.key.data), iv);
        let decrypted = decipher.update(decodedJson.message, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted
    } catch (e) {
        return encryptedText
    }
}

export default decryptMessage;