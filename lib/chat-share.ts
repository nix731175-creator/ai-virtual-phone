export type MusicChatSharePayload = {
    type: "music";
    title: string;
    artist: string;
};

export type XiaohongshuNoteChatSharePayload = {
    type: "xiaohongshu_note";
    authorName: string;
    title: string;
    body: string;
    description?: string;
    noteType: "post" | "video";
    tags?: string[];
    imageAssetId?: string;
    coverIcon?: string;
    tone?: string;
};

export type ChatSharePayload = MusicChatSharePayload | XiaohongshuNoteChatSharePayload;

function compactShareText(value: string | undefined, fallback: string): string {
    const text = (value || "").replace(/\s+/g, " ").trim();
    return text || fallback;
}

export function formatMusicShareForPrompt(mediaData?: { musicTitle?: string; musicArtist?: string }): string {
    const title = mediaData?.musicTitle?.trim() || "未知歌曲";
    const artist = compactShareText(mediaData?.musicArtist, "");
    // Keep the title-only directive intact: it is also the model's output syntax for sharing songs.
    return `[音乐分享:${title}]${artist ? `（歌手：${artist}）` : ""}`;
}

export function formatXiaohongshuShareForPrompt(input: {
    author?: string;
    title?: string;
    body?: string;
    description?: string;
}): string {
    const author = compactShareText(input.author, "未知作者");
    const title = compactShareText(input.title, "无标题");
    const body = compactShareText(input.body, "无正文内容");
    const description = compactShareText(input.description, "");
    return `分享了一条小红书帖子，作者：${author}, 标题：${title}, 正文内容：${body}，图片/视频描述：${description || "无"}`;
}
