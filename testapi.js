// node --env-file=.env.local testapi.js

const apiKey = process.env.NVIDIA_API_KEY;
const model = process.env.NVIDIA_MODEL;

if (!apiKey || !model) {
  console.error("========================================");
  console.error("ERROR");
  console.error("========================================");
  console.error(
    !apiKey
      ? "Missing NVIDIA_API_KEY in .env.local"
      : "Missing NVIDIA_MODEL in .env.local"
  );
  process.exit(1);
}

const start = Date.now();

const response = await fetch(
  "https://integrate.api.nvidia.com/v1/chat/completions",
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: "What is System Design?",
        },
      ],
      max_tokens: 300,
      stream: true,
    }),
  }
);

const headersTime = Date.now() - start;

if (!response.ok) {
  console.error("========================================");
  console.error("NVIDIA ERROR");
  console.error("========================================");
  console.error(`HTTP: ${response.status}`);
  console.error(await response.text());
  process.exit(1);
}

const reader = response.body.getReader();
const decoder = new TextDecoder();

let buffer = "";
let firstTokenTime = null;
let content = "";
let reasoning = "";
let finishReason = null;

while (true) {
  const { done, value } = await reader.read();

  if (done) break;

  buffer += decoder.decode(value, { stream: true });

  const events = buffer.split("\n\n");
  buffer = events.pop() || "";

  for (const event of events) {
    const line = event
      .split("\n")
      .find((line) => line.startsWith("data: "));

    if (!line) continue;

    const data = line.slice(6);

    if (data === "[DONE]") continue;

    try {
      const chunk = JSON.parse(data);
      const choice = chunk.choices?.[0];
      const delta = choice?.delta;

      if (firstTokenTime === null) {
        firstTokenTime = Date.now() - start;
      }

      if (delta?.content) {
        content += delta.content;
      }

      if (delta?.reasoning_content) {
        reasoning += delta.reasoning_content;
      }

      if (choice?.finish_reason) {
        finishReason = choice.finish_reason;
      }
    } catch {
      // Ignore incomplete SSE events.
    }
  }
}

const totalTime = Date.now() - start;

// If the model doesn't provide normal content,
// use the reasoning output as a fallback.
const answer = content.trim() || reasoning.trim();

console.log("");
console.log("========================================");
console.log("              NVIDIA TEST");
console.log("========================================");
console.log(`Model       : ${model}`);
console.log(`HTTP        : ${response.status}`);
console.log(`Headers     : ${headersTime} ms`);
console.log(`First token : ${firstTokenTime ?? "N/A"} ms`);
console.log(`Total       : ${totalTime} ms`);
console.log(`Finish      : ${finishReason ?? "N/A"}`);
console.log("========================================");
console.log("                 ANSWER");
console.log("========================================");
console.log(answer || "(No answer returned)");
console.log("========================================");