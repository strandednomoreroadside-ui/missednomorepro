// A raw ElevenLabs voice ID isn't a valid Retell agent voice_id on its own —
// Retell's SDK (resources/voice.d.ts) requires registering it first via
// voice.addResource, which hands back Retell's own voice_id to actually use.
// This is a separate step from apply-cloned-voice.mjs on purpose: listen to
// the preview_audio_url this prints (or preview it in the Retell dashboard
// on the eleven_flash_v2_5 model, since that's what live calls actually use)
// before wiring it into a real phone line.
//
// Run: node scripts/register-elevenlabs-voice.mjs <elevenlabs_voice_id> "<display name>" [elevenlabs_public_user_id]
//
// elevenlabs_public_user_id is only needed if registration fails asking for
// it — that happens for a PRIVATE cloned voice (not a public ElevenLabs
// community voice); find it in your ElevenLabs account settings.
import process from "node:process";
import Retell from "retell-sdk";

try {
  process.loadEnvFile(".env.local");
} catch {
  /* env may already be set */
}

const [, , elevenLabsVoiceId, displayName, publicUserId] = process.argv;
if (!elevenLabsVoiceId || !displayName) {
  console.error(
    'Usage: node scripts/register-elevenlabs-voice.mjs <elevenlabs_voice_id> "<display name>" [elevenlabs_public_user_id]'
  );
  process.exit(1);
}
if (!process.env.RETELL_API_KEY) {
  console.error("Missing RETELL_API_KEY in .env.local");
  process.exit(1);
}

const retell = new Retell({ apiKey: process.env.RETELL_API_KEY });

try {
  const voice = await retell.voice.addResource({
    provider_voice_id: elevenLabsVoiceId,
    voice_name: displayName,
    voice_provider: "elevenlabs",
    ...(publicUserId ? { public_user_id: publicUserId } : {}),
  });

  console.log("\n=== Registered in Retell ===");
  console.log(`voice_id:   ${voice.voice_id}`);
  console.log(`voice_name: ${voice.voice_name}`);
  console.log(`provider:   ${voice.provider}`);
  console.log(`gender:     ${voice.gender}`);
  if (voice.preview_audio_url) console.log(`preview:    ${voice.preview_audio_url}`);
  console.log(
    `\nListen to the preview first. If it sounds right, run:\n` +
      `  node scripts/apply-cloned-voice.mjs "${voice.voice_id}"\n`
  );
} catch (err) {
  console.error("\nRegistration failed:", err instanceof Error ? err.message : err);
  if (!publicUserId) {
    console.error(
      "\nIf this is a PRIVATE cloned voice (not a public ElevenLabs community voice), " +
        "Retell needs the ElevenLabs account's public_user_id to register it. Find it in " +
        "your ElevenLabs account settings, then re-run:\n" +
        `  node scripts/register-elevenlabs-voice.mjs ${elevenLabsVoiceId} "${displayName}" <public_user_id>\n`
    );
  }
  process.exit(1);
}
