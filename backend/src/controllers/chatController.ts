import { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const handleChat = async (req: Request, res: Response): Promise<void> => {
  try {
    const { prompt, history = [] } = req.body;

    if (!prompt) {
      res.status(400).json({ error: 'Prompt is required' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
      console.error('GEMINI_API_KEY is not configured properly in .env');
      res.status(500).json({ error: 'AI Assistant is currently unavailable. Please check API key configuration.' });
      return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    const systemInstruction = `You are the AeroGuide Copilot, an AI assistant built specifically for the Bandaranaike International Airport (CMB) in Sri Lanka.
Your job is to answer questions about the airport, its facilities, procedures, terminals, gates, security, immigration, and general travel tips.
Always be concise, polite, and directly address the user's question. Keep answers short and easy to read on a mobile device.
If asked about a topic unrelated to travel, the airport, or flights, politely decline and steer the conversation back to airport guidance.`;

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      systemInstruction: systemInstruction 
    });

    const formattedHistory = history.map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }],
    }));

    let sanitizedHistory: any[] = [];
    for (const msg of formattedHistory) {
      if (sanitizedHistory.length === 0) {
        if (msg.role === 'user') {
          sanitizedHistory.push({ role: msg.role, parts: [{ text: msg.parts[0].text }] });
        }
      } else {
        const lastMsg = sanitizedHistory[sanitizedHistory.length - 1];
        if (lastMsg.role === msg.role) {
          lastMsg.parts[0].text += '\n\n' + msg.parts[0].text;
        } else {
          sanitizedHistory.push({ role: msg.role, parts: [{ text: msg.parts[0].text }] });
        }
      }
    }

    let finalPrompt = prompt;
    if (sanitizedHistory.length > 0 && sanitizedHistory[sanitizedHistory.length - 1].role === 'user') {
       const lastUser = sanitizedHistory.pop();
       finalPrompt = lastUser.parts[0].text + '\n\n' + finalPrompt;
    }

    const chat = model.startChat({ history: sanitizedHistory });
    const result = await chat.sendMessage(finalPrompt);
    const response = await result.response;
    const text = response.text();

    res.status(200).json({ reply: text });
  } catch (error: any) {
    console.error('Error generating AI chat response:', error);
    res.status(500).json({ error: 'Failed to process your request. ' + (error.message || String(error)) });
  }
};
