import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { Telegraf } from "telegraf";
import twilio from "twilio";
import bodyParser from "body-parser";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Gemini Initialization
function getAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not defined in the environment. AI features will be limited.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

const ai = getAI();

async function generateAIResponse(prompt: string) {
  if (!ai) {
    return "Neural bridge offline: GEMINI_API_KEY is missing. Please configure the environment.";
  }
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "You are OpenClaw, the advanced AI interface for the OpenClaw Dashboard. You are professional, precise, and highly technical. You have access to Google Search to provide accurate, up-to-date information. Maintain a clean, efficient communication style.",
        tools: [{ googleSearch: {} }],
      },
    });
    return response.text || "System error: Neural bridge timeout. (No response from model)";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Neural bridge failure. Please check system logs for details.";
  }
}

// Telegram Integration
if (process.env.TELEGRAM_BOT_TOKEN) {
  const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
  
  bot.start((ctx) => ctx.reply("OpenClaw neural bridge established on Telegram. System status nominal. How can I assist?"));
  
  bot.on("text", async (ctx) => {
    const response = await generateAIResponse(ctx.message.text);
    await ctx.reply(response);
  });

  bot.launch().then(() => {
    console.log("Telegram bot launched");
  }).catch(err => {
    console.error("Failed to launch Telegram bot:", err);
  });

  // Enable graceful stop
  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}

// WhatsApp Integration (Twilio)
app.use(bodyParser.urlencoded({ extended: false }));

app.post("/api/whatsapp/webhook", async (req, res) => {
  const { Body, From } = req.body;
  const twiml = new twilio.twiml.MessagingResponse();

  if (Body) {
    const response = await generateAIResponse(Body);
    twiml.message(response);
  }

  res.writeHead(200, { "Content-Type": "text/xml" });
  res.end(twiml.toString());
});

async function startServer() {
  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/config", (req, res) => {
    res.json({
      telegram: !!process.env.TELEGRAM_BOT_TOKEN,
      whatsapp: !!process.env.TWILIO_ACCOUNT_SID,
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
