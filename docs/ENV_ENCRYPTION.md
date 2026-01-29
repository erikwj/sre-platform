# Environment Variable Encryption

This guide explains how to encrypt sensitive values in `.env.example` and decrypt them during setup.

## Overview

The setup script automatically detects encrypted values in `.env.example` and prompts for a decryption password during `npm run first-run` or `npm run setup`.

## Encrypting Values

### Step 1: Run the encryption tool

```bash
npm run encrypt
```

### Step 2: Enter your sensitive value

When prompted, enter the value you want to encrypt (e.g., a password, API key, etc.)

### Step 3: Enter an encryption password

Choose a strong password that you'll use to decrypt the value during setup. **Remember this password!**

### Step 4: Copy the encrypted value

The tool will output an encrypted string in the format:
```
enc:1a2b3c4d...:5e6f7g8h...
```

### Step 5: Update .env.example

Replace the plain-text value in `.env.example` with the encrypted value:

**Before:**
```
SERVICENOW_PASSWORD=mySecretPassword123
```

**After:**
```
SERVICENOW_PASSWORD=enc:1a2b3c4d5e6f...:a1b2c3d4e5f6...
```

## Using Encrypted Values

When running `npm run first-run` or `npm run setup`, the script will:

1. Detect encrypted values (any value starting with `enc:`)
2. Prompt you for the decryption password
3. Decrypt all encrypted values
4. Create the `.env` file with plain-text values

Example:
```bash
$ npm run setup

🚀 SRE Platform Setup

═══════════════════════════════════════════════════════════

🔐 Encrypted values detected in .env.example

   Enter decryption password: ********
   ✅ Encrypted values decrypted

📝 Configuration

   Enter your Anthropic API key (or press Enter to skip): 

✅ .env file created successfully!
```

## Security Notes

1. **Never commit `.env`** - This file contains decrypted sensitive values
2. **Commit `.env.example`** - This file contains encrypted values and is safe to share
3. **Share the decryption password securely** - Use a secure channel to share the password with team members
4. **Use a strong password** - The encryption is only as strong as your password

## Encryption Details

- **Algorithm**: AES-256-CBC
- **Key Derivation**: scrypt
- **Format**: `enc:iv:encrypted` where:
  - `iv` is the initialization vector (hex)
  - `encrypted` is the encrypted value (hex)

## Cross-Platform Compatibility

The encryption/decryption uses Node.js built-in `crypto` module and works on:
- ✅ Windows
- ✅ macOS
- ✅ Linux

## Example Workflow

```bash
# 1. Encrypt a password
npm run encrypt
# Enter: mySecretPassword123
# Password: team2024
# Output: enc:a1b2c3...:d4e5f6...

# 2. Update .env.example with encrypted value
# SERVICENOW_PASSWORD=enc:a1b2c3...:d4e5f6...

# 3. Commit and push
git add .env.example
git commit -m "Update with encrypted password"
git push

# 4. Team member runs setup
npm run setup
# Enter decryption password: team2024
# ✅ .env created with decrypted values
```

## Troubleshooting

### "Decryption failed. Please check your password."

- You entered the wrong decryption password
- The encrypted value was corrupted
- Try encrypting the value again with `npm run encrypt`

### Values not being decrypted

- Make sure the encrypted value starts with `enc:`
- Check that there are no extra spaces or line breaks
- Verify the format is exactly: `KEY=enc:iv:encrypted`
