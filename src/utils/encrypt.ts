import * as crypto from 'crypto'

import { encryptAES } from './encryptAESkey.js';

const encrypt = async (passphrase: string,senderPassPhrase: string, text: string) => {
  const salt = crypto.randomBytes(32).toString('hex');
  const key = crypto.scryptSync(passphrase, salt, 32)
  const iv = crypto.randomBytes(16)

  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')

  encrypted += cipher.final('hex')

  const encrIV = await encryptAES(iv.toString('hex'), passphrase);
  const senderEncrIV = await encryptAES(iv.toString('hex'), senderPassPhrase);
  return Buffer.from(JSON.stringify({ message: encrypted, encrIV, key, senderEncrIV })).toString('base64');
}

export default encrypt;