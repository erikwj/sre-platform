#!/usr/bin/env node

const fs = require('fs');
const readline = require('readline');
const crypto = require('crypto');

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

function decrypt(encryptedText, password) {
  try {
    // Format: enc:iv:encrypted
    const parts = encryptedText.split(':');
    if (parts.length !== 3 || parts[0] !== 'enc') {
      return encryptedText; // Not encrypted, return as is
    }
    
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(password, 'salt', 32);
    const iv = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed. Please check your password.`);
  }
}

async function setup() {
  console.log('\n🚀 SRE Platform Setup\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Check if .env already exists
  if (fs.existsSync('.env')) {
    console.log('ℹ️  .env file already exists.');
    const overwrite = await question('   Do you want to overwrite it? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('✅ Keeping existing .env file\n');
      rl.close();
      return;
    }
  }

  // Read .env.example
  const envExample = fs.readFileSync('.env.example', 'utf8');

  // Check if there are encrypted values
  const hasEncrypted = envExample.includes('enc:');
  let decryptPassword = null;
  
  if (hasEncrypted) {
    console.log('🔐 Encrypted values detected in .env.example\n');
    decryptPassword = await question('   Enter decryption password: ', true);
    console.log('');
  }

  // Ask for Anthropic API key
  console.log('\n📝 Configuration\n');
  const apiKey = await question('   Enter your Anthropic API key (press Enter to skip for hackaton setup): ');

  // Process the env content
  let envContent = envExample;
  
  // Decrypt encrypted values if password provided
  if (hasEncrypted && decryptPassword) {
    try {
      const lines = envContent.split('\n');
      const decryptedLines = lines.map(line => {
        // Match lines like KEY=enc:iv:encrypted
        const match = line.match(/^([^=]+)=(enc:[^#]+)/);
        if (match) {
          const key = match[1];
          const encryptedValue = match[2].trim();
          try {
            const decryptedValue = decrypt(encryptedValue, decryptPassword);
            return `${key}=${decryptedValue}`;
          } catch (error) {
            console.log(`   ⚠️  Failed to decrypt ${key}: ${error.message}`);
            return line;
          }
        }
        return line;
      });
      envContent = decryptedLines.join('\n');
      console.log('   ✅ Encrypted values decrypted');
    } catch (error) {
      console.log(`   ⚠️  Decryption failed: ${error.message}`);
    }
  }
  
  // Replace the placeholder with the actual key or keep placeholder
  if (apiKey && apiKey.trim()) {
    envContent = envContent.replace(
      'ANTHROPIC_API_KEY=your_anthropic_api_key_here',
      `ANTHROPIC_API_KEY=${apiKey.trim()}`
    );
    envContent = envContent.replace(
      '#ANTHROPIC_API_KEY=your_anthropic_api_key_here',
      `ANTHROPIC_API_KEY=${apiKey.trim()}`
    );
    console.log('   ✅ API key configured');
  } else {
    console.log('   ⚠️  Skipped - You can add it later in the .env file');
  }

  // Write .env file
  fs.writeFileSync('.env', envContent);
  console.log('\n✅ .env file created successfully!\n');
  
  rl.close();
}

setup().catch(error => {
  console.error('❌ Setup failed:', error.message);
  rl.close();
  process.exit(1);
});
