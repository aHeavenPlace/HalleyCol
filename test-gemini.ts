import { GeminiClassifier } from './src/ia/services/GeminiClassifier.service';
import * as dotenv from 'dotenv';
dotenv.config();

const gc = new GeminiClassifier();
gc.generateResponse('que tennis tienes disponibles?', { 
  sessionId: 'test',
  fsmState: 'IDLE',
  history: [],
  createdAt: new Date(),
  expiresAt: new Date()
})
  .then(console.log)
  .catch(console.error);
