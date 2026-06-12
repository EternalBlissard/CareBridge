/**
 * Phase 0 gate: prove GITHUB_TOKEN works against GitHub Models inference API.
 * See ../CareBridge-PAT-Setup.md
 */
import "dotenv/config";
import OpenAI from "openai";

const ENDPOINT = "https://models.github.ai/inference";
const MODEL = "openai/gpt-4o-mini";

function fail(message: string, detail?: unknown): never {
  console.error(`\n❌ ${message}`);
  if (detail !== undefined) {
    console.error(typeof detail === "string" ? detail : JSON.stringify(detail, null, 2));
  }
  process.exit(1);
}

async function main() {
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) {
    fail("GITHUB_TOKEN missing. Copy .env.example → .env and paste your PAT.");
  }
  if (!token.startsWith("github_pat_") && !token.startsWith("ghp_")) {
    console.warn("⚠️  Token does not look like a GitHub PAT (expected github_pat_… or ghp_…)");
  }

  const client = new OpenAI({
    baseURL: ENDPOINT,
    apiKey: token,
  });

  console.log(`Calling ${ENDPOINT}/chat/completions`);
  console.log(`Model: ${MODEL}\n`);

  try {
    const res = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: "Reply with valid JSON only." },
        { role: "user", content: 'Return {"ok": true}' },
      ],
      response_format: { type: "json_object" },
    });

    const content = res.choices[0]?.message?.content;
    if (!content) {
      fail("200 but no choices[0].message.content in response", res);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      fail("Response is not valid JSON", content);
    }

    console.log("✅ Token works — inference returned parseable JSON:");
    console.log(content);

    if (typeof parsed === "object" && parsed !== null && "ok" in parsed) {
      console.log("\n✅ Phase 0 gate passed. Proceed to Phase 1.");
    } else {
      console.warn("\n⚠️  JSON parsed but shape unexpected:", parsed);
    }
  } catch (err: unknown) {
    if (err instanceof OpenAI.APIError) {
      const status = err.status;
      if (status === 401) {
        fail("401 Unauthorized — token wrong or expired. Re-copy from GitHub.");
      }
      if (status === 403) {
        fail(
          "403 No access to model — token lacks models:read, or model id typo. Re-mint with Models=Read-only.",
          err.message,
        );
      }
      if (status === 429) {
        fail("429 Rate limited — wait and retry (Low tier ~15 RPM / 150 RPD).", err.message);
      }
      fail(`HTTP ${status ?? "?"} from GitHub Models`, err.message);
    }
    throw err;
  }
}

main();
