import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { fetchRealThreatData } from "./threatApi";
import { fetchThreatOfTheDay } from "./cveApi";

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
  }),
});

export type AppRouter = typeof appRouter;
