import { z } from "zod";
import type { RegisterFn } from "../types.js";
import { jsonResponse, jsonError } from "../../util/json_response.js";

export const registerReadTopic: RegisterFn = (server, ctx) => {
  const RAW_POSTS_PER_PAGE = 100;
  const STRUCTURED_AUTO_LIMIT = 20;
  const CACHE_TTL_MS = 10000;

  const schema = z.object({
    topic_id: z.number().int().positive(),
    post_limit: z.number().int().min(1).max(50).optional().describe("Max posts to return (default 5, max 50)"),
    start_post_number: z.number().int().min(1).optional().describe("Start from this post number (1-based)"),
    format: z.enum(["auto", "structured", "raw"]).optional().describe("Read format. structured returns per-post JSON; raw uses /raw pages to reduce requests for larger reads.")
  });

  server.registerTool(
    "discourse_read_topic",
    {
      title: "Read Topic",
      description: "Read topic metadata and posts. Returns structured per-post JSON for small reads, or raw page text for larger reads to reduce requests.",
      inputSchema: schema.shape,
    },
    async ({ topic_id, post_limit = 5, start_post_number, format = "auto" }, _extra) => {
      try {
        const { client } = ctx.siteState.ensureSelectedSite();
        const start = start_post_number ?? 1;
        const strategy = format === "auto" && post_limit > STRUCTURED_AUTO_LIMIT ? "raw" : format === "auto" ? "structured" : format;
        const limit = Number.isFinite(ctx.maxReadLength) ? ctx.maxReadLength : 50000;

        if (strategy === "raw") {
          const topicData = (await client.getCached(`/t/${topic_id}.json`, CACHE_TTL_MS)) as any;
          const postsCount = Number(topicData?.posts_count || 0);
          const startPage = Math.floor((start - 1) / RAW_POSTS_PER_PAGE) + 1;
          const requestedLastPost = start + post_limit - 1;
          const boundedLastPost = postsCount > 0 ? Math.min(requestedLastPost, postsCount) : requestedLastPost;
          const endPage = Math.max(startPage, Math.floor((boundedLastPost - 1) / RAW_POSTS_PER_PAGE) + 1);
          const rawPages: Array<{ page: number; raw: string; truncated: boolean }> = [];
          let remaining = limit;

          for (let page = startPage; page <= endPage && remaining > 0; page++) {
            const rawText = String(await client.getCached(`/raw/${topic_id}?page=${page}`, CACHE_TTL_MS));
            const raw = rawText.slice(0, remaining);
            rawPages.push({
              page,
              raw,
              truncated: raw.length < rawText.length,
            });
            remaining -= raw.length;
          }

          return jsonResponse({
            id: topic_id,
            title: topicData?.title || `Topic ${topic_id}`,
            slug: topicData?.slug || String(topic_id),
            category_id: topicData?.category_id || null,
            tags: Array.isArray(topicData?.tags) ? topicData.tags : [],
            posts_count: topicData?.posts_count || null,
            raw_pages: rawPages,
            meta: {
              strategy: "raw",
              start_post: start,
              requested_posts: post_limit,
              posts_per_raw_page: RAW_POSTS_PER_PAGE,
              start_page: startPage,
              end_page: rawPages.length > 0 ? rawPages[rawPages.length - 1].page : startPage,
              returned_pages: rawPages.length,
              truncated: remaining <= 0,
              has_more: postsCount > 0 ? postsCount > boundedLastPost : undefined,
            },
          });
        }

        let current = start;
        const fetchedPosts: Array<{
          id: number;
          post_number: number;
          username: string;
          created_at: string;
          raw: string;
        }> = [];
        let topicData: any = null;

        const maxBatches = 10;

        for (let i = 0; i < maxBatches && fetchedPosts.length < post_limit; i++) {
          const url = current > 1
            ? `/t/${topic_id}.json?post_number=${current}&include_raw=true`
            : `/t/${topic_id}.json?include_raw=true`;
          const data = (await client.getCached(url, CACHE_TTL_MS)) as any;

          if (i === 0) {
            topicData = data;
          }

          const stream: any[] = Array.isArray(data?.post_stream?.posts) ? data.post_stream.posts : [];
          const sorted = stream.slice().sort((a, b) => (a.post_number || 0) - (b.post_number || 0));
          const filtered = sorted.filter((p) => (p.post_number || 0) >= current);

          for (const p of filtered) {
            if (fetchedPosts.length >= post_limit) break;
            fetchedPosts.push({
              id: p.id,
              post_number: p.post_number,
              username: p.username,
              created_at: p.created_at,
              raw: (p.raw || p.cooked || p.excerpt || "").toString().slice(0, limit),
            });
          }

          if (filtered.length === 0) break;
          current = (filtered[filtered.length - 1]?.post_number || current) + 1;
        }

        return jsonResponse({
          id: topic_id,
          title: topicData?.title || `Topic ${topic_id}`,
          slug: topicData?.slug || String(topic_id),
          category_id: topicData?.category_id || null,
          tags: Array.isArray(topicData?.tags) ? topicData.tags : [],
          posts_count: topicData?.posts_count || fetchedPosts.length,
          posts: fetchedPosts,
          meta: {
            strategy: "structured",
            start_post: start,
            returned: fetchedPosts.length,
            has_more: (topicData?.posts_count || 0) > (start + fetchedPosts.length - 1),
          },
        });
      } catch (e: any) {
        return jsonError(`Failed to read topic ${topic_id}: ${e?.message || String(e)}`);
      }
    }
  );
};

