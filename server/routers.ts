import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { fetchRealThreatData } from "./threatApi";
import { fetchThreatOfTheDay } from "./cveApi";
import { fetchWeeklyBriefing } from "./weeklyBriefingApi";
import { computeVulnPriorityScoring, generateThreatNarrative, computeAttackCVELinkage } from "./aiModels";
import { getTimelineHistogram, getReplayEvents, queueThreatEvent } from "./timelineDb";
import { z } from "zod";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  threats: router({
    /** Fetch real-time threat intelligence from DShield + geolocation */
    realData: publicProcedure.query(async () => {
      return fetchRealThreatData();
    }),
    /** Fetch Threat of the Day spotlight from CISA KEV + NVD */
    threatOfTheDay: publicProcedure.query(async () => {
      return fetchThreatOfTheDay();
    }),
    /** Fetch Weekly Threat Briefing aggregated data */
    weeklyBriefing: publicProcedure.query(async () => {
      return fetchWeeklyBriefing();
    }),
  }),

  ai: router({
    /** AI Model: Vulnerability Priority Scoring — LLM-powered risk ranking */
    vulnPriority: publicProcedure.query(async () => {
      return computeVulnPriorityScoring();
    }),
    /** AI Model: Threat Narrative Generator — contextual analyst prose */
    narrative: publicProcedure.query(async () => {
      return generateThreatNarrative();
    }),
    /** AI Model: Attack-to-CVE Linkage — connects attacks to exploited CVEs */
    attackLinkage: publicProcedure.query(async () => {
      return computeAttackCVELinkage();
    }),
  }),

  timeline: router({
    /** Get 24h histogram bins for the timeline scrubber */
    histogram: publicProcedure.query(async () => {
      return getTimelineHistogram();
    }),
    /** Get replay events for a specific time window */
    replayEvents: publicProcedure
      .input(z.object({
        startTime: z.string(), // ISO timestamp
        endTime: z.string(),   // ISO timestamp
        limit: z.number().min(1).max(200).optional(),
      }))
      .query(async ({ input }) => {
        return getReplayEvents(
          new Date(input.startTime),
          new Date(input.endTime),
          input.limit ?? 50
        );
      }),
    /** Persist a threat event (called from the frontend periodically) */
    persistEvent: publicProcedure
      .input(z.object({
        eventId: z.string(),
        attackType: z.string(),
        severity: z.string(),
        sourceIp: z.string(),
        sourceCountry: z.string(),
        sourceCity: z.string().optional(),
        sourceLat: z.number(),
        sourceLng: z.number(),
        targetName: z.string().optional(),
        targetLat: z.number(),
        targetLng: z.number(),
        port: z.number().optional(),
        protocol: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        queueThreatEvent({
          eventId: input.eventId,
          attackType: input.attackType,
          severity: input.severity,
          sourceIp: input.sourceIp,
          sourceCountry: input.sourceCountry,
          sourceCity: input.sourceCity ?? null,
          sourceLat: String(input.sourceLat),
          sourceLng: String(input.sourceLng),
          targetName: input.targetName ?? null,
          targetLat: String(input.targetLat),
          targetLng: String(input.targetLng),
          port: input.port ?? null,
          protocol: input.protocol ?? null,
          timestamp: new Date(),
        });
        return { queued: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
