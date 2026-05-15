import { IAService } from '../interfaces/IAService.interface';
import {
  ConversationContext,
  IntentResult,
  ResponseMessage,
  SessionAction,
  SessionResult,
} from '../types/ia.types';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildGeminiPrompt } from '../utils/gemini-prompt';
import { InventoryService } from './Inventory.service';

export interface GeminiClassifierConfig {
  umbralConfianza?: number;
  modelId?: string;
  apiKey?: string;
}

export class GeminiClassifier implements IAService {
  public geminiClient: any;
  private readonly config: Required<GeminiClassifierConfig>;
  private inventoryService: InventoryService;

  constructor(config: GeminiClassifierConfig = {}) {
    this.config = {
      umbralConfianza: config.umbralConfianza ?? 0.75,
      modelId: config.modelId ?? 'gemini-2.5-flash',
      apiKey: config.apiKey ?? process.env['GEMINI_API_KEY'] ?? '',
    };

    if (this.config.apiKey) {
      this.geminiClient = new GoogleGenerativeAI(this.config.apiKey).getGenerativeModel({
        model: this.config.modelId,
      });
    }

    this.inventoryService = new InventoryService();
  }

  async classifyIntent(text: string, context?: ConversationContext): Promise<IntentResult> {
    throw new Error('[GeminiClassifier] classifyIntent not implemented yet. Use RegexClassifier.');
  }

  /**
   * Generates a contextual custom response using Gemini AI.
   * This is used as a fallback for 'otro' intents or low confidence in RegexClassifier.
   */
  async generateResponse(intent: string, context: ConversationContext): Promise<ResponseMessage> {
    if (!this.geminiClient) {
      return {
        text: 'Lo siento, en este momento no puedo procesar consultas complejas (Falta API Key de Gemini). ¿En qué más te puedo ayudar?',
      };
    }

    try {
      const catalog = await this.inventoryService.getAllProducts();
      // 'intent' acts as the user's raw message in the fallback case
      const prompt = buildGeminiPrompt(intent, context, catalog);

      const result = await this.geminiClient.generateContent(prompt);
      const rawText = result.response.text();
      
      try {
        // Try to parse the JSON response from Gemini
        // Find JSON boundaries in case Gemini added markdown ```json ... ```
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : rawText;
        const parsed = JSON.parse(jsonStr);

        return {
          text: parsed.text || parsed.response || 'No pude generar una respuesta correcta.',
          buttons: parsed.buttons || [],
        };
      } catch (parseError) {
        console.error('[GeminiClassifier] Error parsing JSON from Gemini:', parseError);
        console.log('[GeminiClassifier] Raw response was:', rawText);
        // Fallback to returning the raw text if parsing fails
        return { text: rawText.replace(/```json/g, '').replace(/```/g, '').trim() };
      }
    } catch (error: any) {
      console.error('[GeminiClassifier] Error calling Gemini API:', error);
      require('fs').writeFileSync('gemini_error.txt', error.stack || error.message || String(error));
      return {
        text: 'Lo siento, tuve un problema analizando nuestro inventario. Por favor intenta de nuevo en un momento.',
      };
    }
  }

  async manageSession(sessionId: string, action: SessionAction): Promise<SessionResult> {
    throw new Error('[GeminiClassifier] manageSession not implemented.');
  }
}
