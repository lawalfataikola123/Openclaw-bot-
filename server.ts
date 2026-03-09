import express from "express";
import { createServer as createViteServer } from "vite";
import { Telegraf } from "telegraf";
import twilio from "twilio";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Dynamic Configurations
let activeTelegramBot: Telegraf | null = null;
let twilioConfig: { sid: string, auth: string, phone: string } | null = null;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || (process.env as any).API_KEY || "" });

async function generateAIResponse(prompt: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || "No response generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Neural bridge error: Unable to process request.";
  }
}

function startTelegramBot(token: string) {
  if (activeTelegramBot) {
    try {
      activeTelegramBot.stop("Restarting");
    } catch (e) {
      // Ignore stop errors
    }
  }
  
  try {
    activeTelegramBot = new Telegraf(token);
    
    activeTelegramBot.start((ctx) => ctx.reply("OpenClaw neural bridge established. System is monitoring all neural signals."));
    
    activeTelegramBot.on("text", async (ctx) => {
      const userMessage = ctx.message.text;
      console.log(`[Telegram] Received: ${userMessage}`);
      const reply = await generateAIResponse(userMessage);
      await ctx.reply(reply);
    });

    activeTelegramBot.launch().then(() => {
      console.log("Telegram bot launched successfully");
    }).catch(err => {
      console.error("Failed to launch Telegram bot:", err);
      activeTelegramBot = null;
    });
  } catch (err) {
    console.error("Invalid Telegram token:", err);
    activeTelegramBot = null;
  }
}

// Initialize from env if available
if (process.env.TELEGRAM_BOT_TOKEN) {
  startTelegramBot(process.env.TELEGRAM_BOT_TOKEN);
}

if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
  twilioConfig = {
    sid: process.env.TWILIO_ACCOUNT_SID,
    auth: process.env.TWILIO_AUTH_TOKEN,
    phone: process.env.TWILIO_PHONE_NUMBER
  };
}

// WhatsApp Webhook
app.post("/api/whatsapp/webhook", async (req, res) => {
  const { Body, From } = req.body;
  console.log(`[WhatsApp] Received from ${From}: ${Body}`);
  
  const twiml = new twilio.twiml.MessagingResponse();

  if (Body) {
    const reply = await generateAIResponse(Body);
    twiml.message(reply);
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
      telegram: !!activeTelegramBot,
      whatsapp: !!twilioConfig,
      hasApiKey: !!process.env.GEMINI_API_KEY || !!(process.env as any).API_KEY,
      whatsappNumber: twilioConfig?.phone || null,
    });
  });

  app.post("/api/config", (req, res) => {
    const { telegramToken, twilioSid, twilioAuth, twilioPhone } = req.body;
    
    if (telegramToken) {
      startTelegramBot(telegramToken);
    }
    
    if (twilioSid && twilioAuth && twilioPhone) {
      twilioConfig = {
        sid: twilioSid,
        auth: twilioAuth,
        phone: twilioPhone
      };
    }
    
    res.json({ success: true });
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

// Enable graceful stop
process.once("SIGINT", () => {
  if (activeTelegramBot) activeTelegramBot.stop("SIGINT");
});
process.once("SIGTERM", () => {
  if (activeTelegramBot) activeTelegramBot.stop("SIGTERM");
});

startServer();
