#!/usr/bin/env node

const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
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

  // Ask for Anthropic API key
  console.log('\n📝 Configuration\n');
  const apiKey = await question('   Enter your Anthropic API key (or press Enter to skip): ');

  // Replace the placeholder with the actual key or keep placeholder
  let envContent = envExample;
  if (apiKey && apiKey.trim()) {
    envContent = envExample.replace(
      'ANTHROPIC_API_KEY=your_anthropic_api_key_here',
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
