import { betterAuth } from "better-auth";
import { Pool } from "@neondatabase/serverless";

import { getBetterAuthBaseURL } from "@/lib/auth-url";

export const auth = betterAuth({
  baseURL: getBetterAuthBaseURL(),
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
});
