#!/usr/bin/env node

/**
 * Test script for AI Service
 * Tests the AI service initialization and basic functionality
 * 
 * Usage:
 *   node test-ai-service.js
 */

require('dotenv').config();
const { getAIService } = require('./services/aiService');

async function testAIService() {
  console.log('=== AI Service Test ===\n');
  
  try {
    // Test 1: Initialize AI Service
    console.log('Test 1: Initializing AI Service...');
    const aiService = getAIService();
    console.log('✓ AI Service initialized successfully');
    console.log(`  Provider: ${aiService.getProvider()}`);
    console.log(`  Model: ${aiService.getModel()}\n`);
    
    // Test 2: Simple completion test
    console.log('Test 2: Testing AI completion...');
    const testPrompt = 'Say "Hello, AI service is working!" and nothing else.';
    console.log(`  Prompt: "${testPrompt}"`);
    
    const startTime = Date.now();
    const result = await aiService.generateCompletion(testPrompt, 50);
    const duration = Date.now() - startTime;
    
    console.log('✓ AI completion successful');
    console.log(`  Response: "${result.text.trim()}"`);
    console.log(`  Duration: ${duration}ms`);
    console.log(`  Input tokens: ${result.usage.inputTokens}`);
    console.log(`  Output tokens: ${result.usage.outputTokens}\n`);
    
    console.log('=== All Tests Passed ===');
    process.exit(0);
    
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    console.error('\nError details:', error);
    
    if (error.message.includes('No AI provider configured')) {
      console.error('\nPlease configure either ANTHROPIC_API_KEY or GOOGLE_SERVICE_ACCOUNT_KEY in your .env file');
    }
    
    process.exit(1);
  }
}

testAIService();
