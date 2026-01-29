#!/usr/bin/env node

const crypto = require('crypto');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query, hidden = false) {
  return new Promise(resolve => {
    if (hidden) {
      // Hide password input
      const stdin = process.stdin;
      stdin.setRawMode(true);
      readline.emitKeypressEvents(stdin);
      
      let password = '';
      console.log(query);
      
      stdin.on('keypress', function listener(char, key) {
        if (key && key.name === 'return') {
          stdin.setRawMode(false);
          stdin.removeListener('keypress', listener);
          process.stdout.write('\n');
          resolve(password);
        } else if (key && key.name === 'backspace') {
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write('\b \b');
          }
        } else if (char) {
          password += char;
          process.stdout.write('*');
        }
      });
    } else {
      rl.question(query, resolve);
    }
  });
}

function encrypt(text, password) {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(password, 'salt', 32);
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Return iv:encrypted format
  return `enc:${iv.toString('hex')}:${encrypted}`;
}

async function main() {
  console.log('\n🔐 Encrypt Sensitive Values\n');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const value = await question('Enter the value to encrypt: ');
  const password = await question('Enter encryption password: ', true);
  
  const encrypted = encrypt(value, password);
  
  console.log('\n✅ Encrypted value (use this in .env.example):\n');
  console.log(encrypted);
  console.log('\n');
  
  rl.close();
}

main().catch(error => {
  console.error('❌ Encryption failed:', error.message);
  rl.close();
  process.exit(1);
});
