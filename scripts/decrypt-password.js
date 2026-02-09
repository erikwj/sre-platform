#!/usr/bin/env node

const crypto = require('crypto');

function decrypt(encryptedValue, password) {
  // Parse the encrypted value format: enc:iv:encrypted
  const parts = encryptedValue.split(':');
  if (parts.length !== 3 || parts[0] !== 'enc') {
    throw new Error('Invalid encrypted value format. Expected: enc:iv:encrypted');
  }
  
  const iv = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(password, 'salt', 32);
  
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// Get encrypted value and password from command line
const encryptedValue = process.argv[2];
const password = process.argv[3];

if (!encryptedValue || !password) {
  console.error('Usage: node decrypt-password.js <encrypted-value> <password>');
  process.exit(1);
}

try {
  const decrypted = decrypt(encryptedValue, password);
  console.log(decrypted);
} catch (error) {
  console.error('❌ Decryption failed:', error.message);
  process.exit(1);
}
