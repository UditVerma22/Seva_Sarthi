const { GoogleGenerativeAI } = require('@google/generative-ai');
const { SERVICE_CATEGORIES } = require('../utils/constants');

// ── Initialize Gemini ─────────────────────────────────────────────
let genAI = null;
let chatModel = null;
let visionModel = null;

const initGemini = () => {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠️  GEMINI_API_KEY not configured. AI features will be disabled.');
    return false;
  }
  try {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Use the highly available 1.5-flash-8b model which has much higher free limits
    chatModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    visionModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    console.log('🤖 Google Gemini AI initialized successfully');
    return true;
  } catch (err) {
    console.error('❌ Failed to initialize Gemini:', err.message);
    return false;
  }
};

// ── System Prompt (Seva Sarthi Context) ───────────────────────────
const SYSTEM_PROMPT = `You are "Seva AI", the intelligent assistant for Seva Sarthi — India's premium hyperlocal home service marketplace. You help users find services, answer questions, and guide them through bookings.

## About Seva Sarthi
- India's trusted platform for hiring verified home service professionals
- Services include: ${SERVICE_CATEGORIES.join(', ')}
- Tool rental marketplace also available (Power Tools, Hand Tools, Construction, Gardening)
- All providers are background-verified and rated by customers
- Pricing starts from ₹299 for basic services
- Platform fee: ₹49 per booking
- Payment options: Online payment or Cash after service

## Pricing Guide (Approximate)
- Electrician: ₹299-899 per visit
- Plumber: ₹349-999 per visit
- Deep Cleaning: ₹499-2499 per session
- AC Repair/Service: ₹399-1499
- Carpenter: ₹499-1499 per visit
- Painting: ₹15-40 per sq.ft
- Pest Control: ₹699-2499
- Gardening: ₹399-1299 per session
- Appliance Repair: ₹299-999

## Response Guidelines
- Be warm, helpful, and professional. Use a friendly Indian English tone.
- Keep responses concise (2-4 sentences max for simple queries).
- Use relevant emojis sparingly to make responses engaging.
- Never make up provider names or exact prices — give ranges and direct users to browse.
- Support both Hindi and English queries naturally.`;

// ── Chat with AI ──────────────────────────────────────────────────
const chatWithAI = async (message, conversationHistory = [], userContext = null) => {
  if (!chatModel) {
    initGemini();
    if (!chatModel) {
      return {
        response: "I'm currently unavailable. The AI service hasn't been configured yet. Please try again later! 🔧",
        actions: [],
      };
    }
  }

  try {
    let contextParts = [SYSTEM_PROMPT];
    if (userContext) {
      contextParts.push(`\n## Current User Context\n- Name: ${userContext.name || 'Guest'}\n- Role: ${userContext.role || 'user'}\n- Has active bookings: ${userContext.hasBookings ? 'Yes' : 'No'}`);
    }

    const contents = [];
    contents.push({
      role: 'user',
      parts: [{ text: contextParts.join('\n') + '\n\nPlease acknowledge you understand your role as Seva AI.' }],
    });
    contents.push({
      role: 'model',
      parts: [{ text: 'Understood! I\'m Seva AI, ready to help with home services on Seva Sarthi. 🏠' }],
    });

    for (const msg of conversationHistory.slice(-10)) {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      });
    }

    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const result = await chatModel.generateContent({ contents });
    const response = result.response.text();
    const actions = parseActions(response, message);

    return { response, actions };
  } catch (err) {
    console.error('AI Chat Error:', err.message);
    if (err.message.includes('429')) {
       return {
         response: "I'm getting a lot of requests right now! Please wait a few seconds and try again. ⏳",
         actions: []
       };
    }
    return {
      response: "Sorry, I ran into an issue processing your request. Please try again in a moment! 🙏",
      actions: [],
    };
  }
};

// ── Analyze Image ─────────────────────────────────────────────────
const analyzeImage = async (imageBase64, mimeType = 'image/jpeg') => {
  if (!visionModel) {
    initGemini();
    if (!visionModel) {
      return { success: false, error: 'AI service not configured.' };
    }
  }

  try {
    const imageAnalysisPrompt = `Analyze this image of a household problem and respond ONLY with valid JSON (no markdown tags):
{
  "issue": "Brief description of problem",
  "category": "One of: ${SERVICE_CATEGORIES.join(', ')}",
  "urgency": "low | medium | high | critical",
  "estimatedCost": "₹X - ₹Y",
  "recommendations": ["tip1", "tip2", "tip3"],
  "diyTip": "A quick DIY tip or null"
}`;

    const result = await visionModel.generateContent([
      imageAnalysisPrompt,
      {
        inlineData: {
          mimeType,
          data: imageBase64,
        },
      },
    ]);

    const responseText = result.response.text();

    let jsonStr = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();
    const objMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objMatch) jsonStr = objMatch[0];

    const analysis = JSON.parse(jsonStr);
    return { success: true, ...analysis };
  } catch (err) {
    console.error('Image Analysis Error:', err.message);
    if (err instanceof SyntaxError) {
      return {
        success: true,
        issue: 'I could see there\'s an issue, but I couldn\'t fully analyze it. Please describe it in the chat.',
        category: 'Home Maintenance',
        urgency: 'medium',
        estimatedCost: '₹299 - ₹999',
        recommendations: ['Describe the problem in text', 'Browse our services'],
        diyTip: null,
      };
    }
    return { success: false, error: 'Failed to analyze the image.' };
  }
};

// ── Parse actions from AI response ────────────────────────────────
const parseActions = (response, userMessage) => {
  const actions = [];
  const lowerMsg = userMessage.toLowerCase();
  const lowerResp = response.toLowerCase();

  if (lowerResp.includes('browse') || lowerResp.includes('service') || lowerMsg.includes('need') || lowerMsg.includes('looking for')) {
    actions.push({ label: '🔍 Browse Services', action: 'navigate', path: '/services' });
  }
  if (lowerResp.includes('book') || lowerMsg.includes('book')) {
    actions.push({ label: '📅 Book Now', action: 'navigate', path: '/services' });
  }
  if (lowerResp.includes('rent') || lowerMsg.includes('rent') || lowerMsg.includes('tool')) {
    actions.push({ label: '🛠️ Rent Tools', action: 'navigate', path: '/rentals' });
  }
  if (lowerResp.includes('complaint') || lowerMsg.includes('problem with booking')) {
    actions.push({ label: '📝 Raise Complaint', action: 'navigate', path: '/complaints/new' });
  }

  return actions.slice(0, 2);
};

// ── Extract Search Intent ──────────────────────────────────────────
const extractSearchIntent = async (query) => {
  if (!chatModel) {
    initGemini();
    if (!chatModel) {
      return { success: false, error: 'AI service not configured.' };
    }
  }

  try {
    const prompt = `You are a search intent extraction engine for Seva Sarthi, an Indian home services platform.
Analyze the user's natural language query (which might be in English, Hindi, or Hinglish) and map it to our exact service structure.

Valid Categories: ${SERVICE_CATEGORIES.join(', ')}, Tool Rental, General

User Query: "${query}"

Respond ONLY with valid JSON. Extract the most likely intended "category" (must be from the list above) and a simple, canonical "search" keyword or phrase (like 'ac', 'plumber', 'cleaning', 'ro', 'drill') that best matches the intent. If it's a general query, use category "General" and empty search.

Example 1: "my tap is leaking" -> {"category": "Plumbing", "search": "tap leak"}
Example 2: "mujhe ac thik karana hai" -> {"category": "Appliance Repair", "search": "ac"}
Example 3: "need to wash my sofa" -> {"category": "Professional Cleaning", "search": "sofa"}
Example 4: "ghar ki safai karni hai" -> {"category": "Professional Cleaning", "search": "home"}
Example 5: "bijli ka kaam" -> {"category": "Electrical Works", "search": "electrician"}
Example 6: "drill machine rent pe chahiye" -> {"category": "Tool Rental", "search": "drill"}

JSON:`;

    const result = await chatModel.generateContent(prompt);
    const responseText = result.response.text();
    
    let jsonStr = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();
    const objMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objMatch) jsonStr = objMatch[0];

    const intent = JSON.parse(jsonStr);
    return { success: true, ...intent };
  } catch (err) {
    console.error('Search Intent Extraction Error:', err.message);
    return { success: false, error: 'Failed to extract intent.' };
  }
};

module.exports = { initGemini, chatWithAI, analyzeImage, extractSearchIntent };
