#!/usr/bin/env bun
/**
 * ai-proxy.ts — lightweight HTTP proxy wrapping pi-mono's @pi/ai.
 *
 * Runs on your Mac, exposes a simple endpoint for Igne Mobile to call.
 * Uses pi-mono's model registry and credential resolution (env vars, auth.json).
 *
 * Usage:
 *   PI_MONO=~/Code/Zereraz/research-oss/pi-mono bun run scripts/ai-proxy.ts
 *   PORT=9091 PI_MONO=~/Code/Zereraz/research-oss/pi-mono bun run scripts/ai-proxy.ts
 *
 * Endpoint:
 *   POST /v1/complete
 *   Body: {
 *     provider: "anthropic" | "openai" | ...,
 *     model: "claude-sonnet-4-20250514" | "gpt-4o" | ...,
 *     messages: [{ role: "system"|"user"|"assistant", content: string }],
 *     maxTokens?: number,
 *     temperature?: number,
 *   }
 *   Response: { text: string, usage: { input, output, total } }
 *
 *   GET /v1/models
 *   Response: { providers: [{ id, models: [{ id, name }] }] }
 *
 *   GET /health
 *   Response: { ok: true }
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { homedir, networkInterfaces } from "os";

// Resolve pi-mono path — set PI_MONO env or defaults to ~/Code/Zereraz/research-oss/pi-mono
const PI_MONO = process.env.PI_MONO || join(homedir(), "Code/Zereraz/research-oss/pi-mono");
const piAi = await import(`${PI_MONO}/packages/ai/dist/index.js`);
const { getModel, getProviders, getModels, complete, getEnvApiKey } = piAi;

// Read ~/.pi/agent/auth.json for API keys (same as pi coding agent)
function readAuthFile(): Record<string, any> {
  const path = join(homedir(), ".pi", "agent", "auth.json");
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return {};
  }
}

function resolveApiKey(provider: string): string | undefined {
  // 1. Try env var via pi-mono's resolution
  const envKey = getEnvApiKey(provider);
  if (envKey) return envKey;

  // 2. Try ~/.pi/agent/auth.json
  const auth = readAuthFile();
  const entry = auth[provider];
  if (!entry) return undefined;

  if (entry.type === "api_key" && entry.key) {
    // Key can be "!command", "ENV_VAR", or literal
    if (entry.key.startsWith("!")) return undefined; // skip shell commands
    if (process.env[entry.key]) return process.env[entry.key];
    return entry.key;
  }
  // OAuth token
  if (entry.access) return entry.access;

  return undefined;
}

const PORT = parseInt(process.env.PORT || "9091", 10);

// Get local LAN IP for display
function getLocalIP(): string {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) return net.address;
    }
  }
  return "localhost";
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // CORS headers for all responses
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Health check
    if (url.pathname === "/health") {
      return Response.json({ ok: true }, { headers: corsHeaders });
    }

    // List available models
    if (url.pathname === "/v1/models" && req.method === "GET") {
      const providers = getProviders().map((p) => {
        const models = getModels(p).map((m) => ({
          id: m.id,
          name: m.name,
        }));
        return { id: p, models };
      });
      return Response.json({ providers }, { headers: corsHeaders });
    }

    // Completion endpoint
    if (url.pathname === "/v1/complete" && req.method === "POST") {
      try {
        const body = await req.json();
        const {
          provider,
          model: modelId,
          messages,
          maxTokens = 1024,
          temperature,
        } = body;

        if (!provider || !modelId || !messages?.length) {
          return Response.json(
            { error: "Missing required fields: provider, model, messages" },
            { status: 400, headers: corsHeaders }
          );
        }

        // Resolve model
        let resolvedModel;
        try {
          resolvedModel = getModel(provider, modelId);
        } catch {
          return Response.json(
            { error: `Unknown model: ${provider}/${modelId}` },
            { status: 400, headers: corsHeaders }
          );
        }

        // Resolve API key (env vars → auth.json)
        const apiKey = resolveApiKey(provider);
        if (!apiKey) {
          return Response.json(
            {
              error: `No API key found for ${provider}. Set the environment variable or add to ~/.pi/agent/auth.json`,
            },
            { status: 401, headers: corsHeaders }
          );
        }

        // Build pi-mono context from simple messages
        const systemMsg = messages.find(
          (m: { role: string }) => m.role === "system"
        );
        const nonSystemMsgs = messages.filter(
          (m: { role: string }) => m.role !== "system"
        );

        const context = {
          systemPrompt: systemMsg?.content || undefined,
          messages: nonSystemMsgs.map(
            (m: { role: string; content: string }) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
              timestamp: Date.now(),
            })
          ),
        };

        // Run completion
        const result = await complete(resolvedModel, context, {
          apiKey,
          maxTokens,
          temperature,
        });

        // Extract text from content blocks
        const text = result.content
          .filter((c) => c.type === "text")
          .map((c) => (c as { type: "text"; text: string }).text)
          .join("");

        return Response.json(
          {
            text,
            usage: {
              input: result.usage.input,
              output: result.usage.output,
              total: result.usage.totalTokens,
            },
          },
          { headers: corsHeaders }
        );
      } catch (err: any) {
        console.error("[ai-proxy] Error:", err.message);
        return Response.json(
          { error: err.message || "Internal error" },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    return Response.json(
      { error: "Not found" },
      { status: 404, headers: corsHeaders }
    );
  },
});

const ip = getLocalIP();
console.log(`[ai-proxy] Listening on http://${ip}:${PORT}`);
console.log(`[ai-proxy] Endpoints:`);
console.log(`  GET  /health      — health check`);
console.log(`  GET  /v1/models   — list available models`);
console.log(`  POST /v1/complete — run completion`);
console.log();
console.log(`[ai-proxy] From Igne Mobile, set server URL to: http://${ip}:${PORT}`);
