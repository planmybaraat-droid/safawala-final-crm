const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function run() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("No OPENAI_API_KEY found in env");
    process.exit(1);
  }

  console.log("Testing OpenAI connection...");
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Hello! Say test success." }],
        max_tokens: 20,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("OpenAI error:", text);
      process.exit(1);
    }

    const data = await res.json();
    console.log("Success! Reply:", data.choices?.[0]?.message?.content);
  } catch (error) {
    console.error("Failed to fetch:", error);
    process.exit(1);
  }
}

run();
