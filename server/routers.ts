import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { fetchRealThreatData } from "./threatApi";
import { fetchThreatOfTheDay } from "./cveApi";
import { fetchWeeklyBriefing } from "./weeklyBriefingApi";
import { computeVulnPriorityScoring, generateThreatNarrative, computeAttackCVELinkage } from "./aiModels";

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
    /** Fetch real-time threat intelligence from blocklist.de + geolocation */
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
});

export type AppRouter = typeof appRouter;
