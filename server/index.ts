import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

app.disable("x-powered-by");
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: "10mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Permissions-Policy", "geolocation=(), camera=(), microphone=()");
  next();
});

// Simple in-memory rate limiting for API routes (best-effort for single-node deployments)
const apiRateWindowMs = 60_000;
const apiRateMax = 120;
const apiRate = new Map<string, { count: number; resetAt: number }>();
app.use("/api", (req, res, next) => {
  const now = Date.now();
  const key = req.ip || "unknown";

  if (apiRate.size > 10_000) {
    apiRate.forEach((value, mapKey) => {
      if (now >= value.resetAt) apiRate.delete(mapKey);
    });
  }

  const current = apiRate.get(key);
  if (!current || now >= current.resetAt) {
    apiRate.set(key, { count: 1, resetAt: now + apiRateWindowMs });
    res.setHeader("X-RateLimit-Limit", String(apiRateMax));
    res.setHeader("X-RateLimit-Remaining", String(apiRateMax - 1));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil((now + apiRateWindowMs) / 1000)));
    return next();
  }

  current.count += 1;
  const remaining = Math.max(0, apiRateMax - current.count);
  res.setHeader("X-RateLimit-Limit", String(apiRateMax));
  res.setHeader("X-RateLimit-Remaining", String(remaining));
  res.setHeader("X-RateLimit-Reset", String(Math.ceil(current.resetAt / 1000)));

  if (current.count > apiRateMax) {
    return res.status(429).json({ message: "Too Many Requests" });
  }

  return next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message =
      process.env.NODE_ENV === "production" && status >= 500
        ? "Internal Server Error"
        : err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Default to 5000 if not specified.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
