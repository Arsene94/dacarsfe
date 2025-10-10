#!/usr/bin/env node
import { spawn } from "node:child_process";
import process from "node:process";

const PORT = process.env.SEO_CHECK_PORT ? Number.parseInt(process.env.SEO_CHECK_PORT, 10) : 3310;

const fetchWithAssert = async (url) => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Cererea ${url} a eșuat cu status ${response.status}`);
    }
    return response;
};

const extractJsonLd = (html, source) => {
    const matches = html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
    for (const match of matches) {
        const payload = match[1]?.trim();
        if (payload) {
            try {
                JSON.parse(payload);
            } catch (error) {
                throw new Error(`JSON-LD invalid pe ${source}: ${(error && error.message) || error}`);
            }
        }
    }
};

async function run() {
    const server = spawn(
        "node",
        ["node_modules/next/dist/bin/next", "dev", "-p", String(PORT)],
        {
            env: { ...process.env, PORT: String(PORT) },
            stdio: ["ignore", "pipe", "pipe"],
        },
    );

    try {
        await new Promise((resolve) => setTimeout(resolve, 7000));

        const baseUrl = `http://127.0.0.1:${PORT}`;
        const endpoints = ["/robots.txt", "/sitemap.xml", "/llms.txt", "/feed.xml"];
        for (const endpoint of endpoints) {
            await fetchWithAssert(`${baseUrl}${endpoint}`);
        }

        const pages = ["/faq", "/blog/sfaturi-inchiriere-iarna", "/docs/incepe-cu-dacars"];
        for (const page of pages) {
            const response = await fetchWithAssert(`${baseUrl}${page}`);
            const html = await response.text();
            extractJsonLd(html, page);
        }

        console.log("✅ Verificările SEO au fost finalizate cu succes.");
    } catch (error) {
        console.error("❌ Verificările SEO au eșuat:", error);
        process.exitCode = 1;
    } finally {
        server.kill("SIGTERM");
        await new Promise((resolve) => {
            server.once("exit", resolve);
            setTimeout(resolve, 2000);
        });
    }
}

run();
