import * as crypto from 'crypto';
import fs from 'fs';
import dotenv from 'dotenv';
import PublicKeyDB from '../models/PublicKey.js';

dotenv.config();

export const generateKeyPair = async (passphrase = process.env.PASSPHRASE) => {
    try {
        if(fs.existsSync(`encrypt_key${passphrase}.txt`)){
            const jsonData = await fs.promises.readFile(`encrypt_key${passphrase}.txt`);
            return JSON.parse(jsonData.toString());
        }

        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 4096,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem',
                cipher: 'aes-256-cbc',
                passphrase
            }
        });
        
        const json_fs = JSON.stringify({
            publicKey,
            privateKey,
            passphrase
        });

        await fs.promises.appendFile(`encrypt_key${passphrase}.txt`, json_fs);
        await PublicKeyDB.create({ email: passphrase, publicKey });
        return {publicKey, privateKey, passphrase}
    }
    catch(e) {
        console.log(e?.message ?? "Looks like something went wrong");
        throw new Error(e?.message ?? "Looks like something went wrong");
    }
} 

export const encryptAES = async (text: string, email: string) => {
   try {
    const data = await PublicKeyDB.findOne({ email });
    return crypto.publicEncrypt(data.publicKey, Buffer.from(text, 'utf8')).toString('base64');
   } catch (e) {
    console.log(e?.message ?? "Looks like something went wrong.");
    throw new Error(e?.message ?? "Looks like something went wrong.");
   }
}