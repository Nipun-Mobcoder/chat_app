import * as crypto from 'crypto';
import fs from 'fs';

import { getUserFromToken } from '../../utils/jwt.js';
import User from '../../models/User.js';

const decryptResolver = {
    Query: {
        decrypt: async(_: any, {encryptedText, sender}: {encryptedText: string, sender: string}, context: {token: string}) => {
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
                throw new Error(e?.message ?? "Looks like something went wrong.")
            }
        },
        search: async (_parent: any, { searchText }: {searchText: string}, context: {token: string}) => {
            const userData : { id: string, userName: string } = await getUserFromToken(context.token);
            
            const filter: any = {
                $text: {$search: searchText, $caseSensitive: false, $diacriticSensitive: false},
            }

            const result = await User
                .find(filter)
                .sort({score: {$meta: 'textScore'}})
                .limit(10)

            return result
        },
        searchAuto: async (_parent: any, {searchText}: { searchText: string }, context: {token: string}) => {
            const userData: { id: string, userName: string } = await getUserFromToken(context.token);

            const data = await User.aggregate([
                {
                  "$search": {
                    "autocomplete": {
                      "query": searchText,
                      "path": "search",
                      "fuzzy": {
                        "maxEdits": 2,
                        "prefixLength": 3,
                      },
                    },
                  },
                }, 
              ]);

            return data;
        }
    }
};

export default decryptResolver;
