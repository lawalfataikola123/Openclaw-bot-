import express from "express";
import { createServer as createViteServer } from "vite";
import { Telegraf } from "telegraf";
import twilio from "twilio";
import bodyParser from "body-parser";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Telegram Integration
if (process.env.TELEGRAM_BOT_TOKEN) {
  const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
  
  bot.start((ctx) => ctx.reply("OpenClaw neural bridge established. System is monitoring all neural signals. Use the web dashboard for full command control."));
  
  bot.on("text", async (ctx) => {
    const userMessage = ctx.message.text;
    console.log(`[Telegram] Received: ${userMessage}`);
    await ctx.reply("Signal received. Neural bridge is currently in monitoring mode. Please use the primary dashboard for bidirectional AI communication.");
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
  console.log(`[WhatsApp] Received from ${From}: ${Body}`);
  
  const twiml = new twilio.twiml.MessagingResponse();

  if (Body) {
    twiml.message("Neural bridge active. Signal intercepted. For full AI command execution, please access the OpenClaw dashboard.");
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
      hasApiKey: !!process.env.GEMINI_API_KEY,
      telegramToken: process.env.TELEGRAM_BOT_TOKEN ? `${process.env.TELEGRAM_BOT_TOKEN.substring(0, 6)}...` : null,
      whatsappNumber: process.env.TWILIO_PHONE_NUMBER || null,
      twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ? `${process.env.TWILIO_ACCOUNT_SID.substring(0, 6)}...` : null,
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
