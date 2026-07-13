import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';

// Use ENCRYPTION_SECRET or fall back to a default value (with warning)
const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET || 'default-secret-notion-canva-dashboard-key-32b';

// Ensure the encryption key is exactly 32 bytes by hashing the secret
const KEY = crypto.createHash('sha256').update(ENCRYPTION_SECRET).digest();

/**
 * Encrypts a string value using AES-256-CBC.
 * Returns the initialization vector (IV) and the encrypted data as hex strings.
 */
export function encrypt(text: string): { iv: string; encryptedData: string } {
  if (!text) return { iv: '', encryptedData: '' };
  
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return {
    iv: iv.toString('hex'),
    encryptedData: encrypted
  };
}

/**
 * Decrypts an encrypted hex string using the provided IV hex string and AES-256-CBC.
 */
export function decrypt(encryptedData: string, ivHex: string): string {
  if (!encryptedData || !ivHex) return '';
  
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
