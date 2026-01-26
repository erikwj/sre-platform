const Anthropic = require('@anthropic-ai/sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleAuth } = require('google-auth-library');

/**
 * AI Service abstraction layer
 * Supports both Anthropic Claude and Google Gemini
 * 
 * Priority:
 * 1. If ANTHROPIC_API_KEY is set and not commented out -> use Anthropic
 * 2. If GOOGLE_SERVICE_ACCOUNT_KEY is set -> use Google Gemini with service account
 * 3. Otherwise -> throw error
 */
class AIService {
  constructor() {
    this.provider = null;
    this.client = null;
    this.model = null;
    this.initialize();
  }

  initialize() {
    // Check for Anthropic API key first
    if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim() !== '') {
      console.log('[AI Service] Initializing with Anthropic Claude');
      this.provider = 'anthropic';
      this.client = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      this.model = 'claude-sonnet-4-5';
      return;
    }

    // Check for Google service account
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY && process.env.GOOGLE_SERVICE_ACCOUNT_KEY.trim() !== '') {
      console.log('[AI Service] Initializing with Google Gemini (Service Account)');
      this.provider = 'google';
      this.initializeGoogleClient();
      this.model = 'gemini-2.0-flash-exp'; // Latest Gemini model
      return;
    }

    throw new Error(
      'No AI provider configured. Please set either ANTHROPIC_API_KEY or GOOGLE_SERVICE_ACCOUNT_KEY in your .env file'
    );
  }

  initializeGoogleClient() {
    try {
      // Parse the service account key from environment variable
      const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
      
      // Create auth client with service account
      const auth = new GoogleAuth({
        credentials: serviceAccountKey,
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });

      // Initialize Google Generative AI with auth
      this.client = new GoogleGenerativeAI({
        auth: auth,
      });
    } catch (error) {
      console.error('[AI Service] Failed to initialize Google client:', error);
      throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_KEY format. Must be valid JSON.');
    }
  }

  /**
   * Generate a completion from the AI model
   * @param {string} prompt - The prompt to send to the AI
   * @param {number} maxTokens - Maximum tokens to generate
   * @returns {Promise<{text: string, usage: object}>}
   */
  async generateCompletion(prompt, maxTokens = 8192) {
    if (this.provider === 'anthropic') {
      return this.generateAnthropicCompletion(prompt, maxTokens);
    } else if (this.provider === 'google') {
      return this.generateGoogleCompletion(prompt, maxTokens);
    }
    throw new Error('AI provider not initialized');
  }

  async generateAnthropicCompletion(prompt, maxTokens) {
    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: maxTokens,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';

    return {
      text,
      usage: {
        inputTokens: message.usage?.input_tokens || 0,
        outputTokens: message.usage?.output_tokens || 0,
      },
    };
  }

  async generateGoogleCompletion(prompt, maxTokens) {
    const model = this.client.getGenerativeModel({ 
      model: this.model,
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 0.7,
      },
    });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    return {
      text,
      usage: {
        inputTokens: response.usageMetadata?.promptTokenCount || 0,
        outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
      },
    };
  }

  /**
   * Get the current provider name
   * @returns {string} 'anthropic' or 'google'
   */
  getProvider() {
    return this.provider;
  }

  /**
   * Get the current model name
   * @returns {string}
   */
  getModel() {
    return this.model;
  }
}

// Export a singleton instance
let aiServiceInstance = null;

function getAIService() {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIService();
  }
  return aiServiceInstance;
}

// Reset the instance (useful for testing or when env changes)
function resetAIService() {
  aiServiceInstance = null;
}

module.exports = {
  getAIService,
  resetAIService,
  AIService,
};
