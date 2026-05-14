import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  // The SDK doesn't expose listModels directly easily on the client instance in some versions, but we can do a raw fetch.
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
  const data = await response.json();
  console.log(data.models.map((m: any) => m.name).join('\n'));
}

run().catch(console.error);
