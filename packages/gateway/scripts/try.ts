// Sends one prompt through the gateway and prints what came back.
// Usage: AI_PROVIDER=login pnpm ai:try "Reply with the single word: ok"
import { createGateway, selectProvider } from "../src";

const prompt = process.argv[2];
if (!prompt) {
  console.error('usage: pnpm ai:try "<prompt>"   (AI_PROVIDER=fake|login, default fake)');
  process.exit(2);
}

try {
  const gateway = createGateway({ provider: selectProvider(process.env) });
  const r = await gateway.run({
    job: "villager",
    system: "You are a helpful assistant. Answer briefly.",
    messages: [{ role: "user", content: prompt }],
    maxTokens: 400,
  });
  console.log(r.text);
  console.log(
    `\nprovider: ${r.provider}  model: ${r.model}  stop: ${r.stopReason}  tokens in/out: ${r.usage.inputTokens}/${r.usage.outputTokens}`,
  );
} catch (error) {
  console.error(error instanceof Error ? `${error.name}: ${error.message}` : error);
  process.exit(1);
}
