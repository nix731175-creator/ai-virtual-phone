// Run with: node --test scripts/check-music-share-prompt.mjs
import { register } from "node:module";
import assert from "node:assert/strict";
import { test } from "node:test";

register("./prompt-check-loader.mjs", import.meta.url);

const { assemblePromptPayload } = await import("../lib/llm-prompt-assembler.ts");
const { loadNativeTimeline } = await import("../lib/short-term-assembler.ts");
const { createOrGetSession, createGroupSession, pushChatMessage } = await import("../lib/chat-storage.ts");

const character = { id: "vincent", name: "Vincent" };
const direct = createOrGetSession(character.id);
const group = createGroupSession("音乐", [character.id]);
const cases = [
  [{ musicTitle: "Best Friends", musicArtist: "The Weeknd" }, "[音乐分享:Best Friends]（歌手：The Weeknd）"],
  [{ musicTitle: "旧分享" }, "[音乐分享:旧分享]"],
  [{ musicTitle: "空歌手", musicArtist: "  " }, "[音乐分享:空歌手]"],
  [undefined, "[音乐分享:未知歌曲]"],
];

function share(session, mediaData, index) {
  return pushChatMessage({
    sessionId: session.id,
    role: "user",
    content: "",
    mediaType: "music_share",
    mediaData,
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString(),
  });
}

const directShares = cases.map(([data], i) => share(direct, data, i));
const groupShares = cases.map(([data], i) => share(group, data, i));
const expected = cases.map(([, text]) => text);

test("the model receives the artist and can still read legacy shares", () => {
  const messages = assemblePromptPayload({
    character,
    history: directShares,
    preset: { prompts: [{ identifier: "shortTermMemory", role: "system", enabled: true, marker: true, content: "" }] },
    worldBooks: [],
    regexes: [],
    timeAware: false,
  });
  assert.deepEqual(messages.filter(m => m.role === "user").flatMap(m => m.content.split("\n\n")), expected);
});

for (const [sourceDetail, label, shares] of [
  ["direct", "私聊", directShares],
  ["group", "群聊「音乐」", groupShares],
]) {
  test(`the ${sourceDetail} timeline preserves the same share metadata`, () => {
    const timeline = loadNativeTimeline(character.id, { userName: "我", timeAware: false });
    const entries = new Map(timeline.filter(entry => entry.sourceDetail === sourceDetail).map(entry => [entry.id, entry.content]));
    assert.deepEqual(shares.map(msg => entries.get(msg.id)), expected.map(text => `[${label}] 我: ${text}`));
  });
}
