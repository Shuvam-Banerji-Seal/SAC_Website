/**
 * utils/youtube.js — Fetch latest YouTube videos via the Data API v3.
 * No backend needed — API key is restricted by HTTP referrer.
 */
import { YOUTUBE } from "../config.js";

/**
 * Fetch the latest N videos from a YouTube channel.
 * @returns {Promise<Array<{title, url, thumbnail, publishedAt}>>}
 */
export async function fetchLatestVideos() {
  const { API_KEY, CHANNEL_ID, MAX_RESULTS } = YOUTUBE;
  if (!API_KEY || !CHANNEL_ID) return [];

  try {
    // Step 1: get the uploads playlist ID for the channel
    const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${CHANNEL_ID}&key=${API_KEY}`;
    const channelRes = await fetch(channelUrl);
    if (!channelRes.ok) throw new Error(`YouTube channel API: ${channelRes.status}`);
    const channelData = await channelRes.json();
    const uploadsId = channelData?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsId) return [];

    // Step 2: fetch the latest videos from the uploads playlist
    const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsId}&maxResults=${MAX_RESULTS}&key=${API_KEY}`;
    const playlistRes = await fetch(playlistUrl);
    if (!playlistRes.ok) throw new Error(`YouTube playlist API: ${playlistRes.status}`);
    const playlistData = await playlistRes.json();

    return (playlistData?.items || []).map((item) => {
      const s = item.snippet;
      return {
        title: s.title,
        url: `https://www.youtube.com/watch?v=${s.resourceId.videoId}`,
        videoId: s.resourceId.videoId,
        thumbnail: s.thumbnails?.medium?.url || s.thumbnails?.default?.url || "",
        publishedAt: s.publishedAt,
      };
    });
  } catch (err) {
    console.warn("[youtube] Failed to fetch videos:", err);
    return [];
  }
}
