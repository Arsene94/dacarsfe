#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';

const PORT = process.env.SEO_CHECK_PORT ? Number(process.env.SEO_CHECK_PORT) : 4319;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function startNextDev() {
    return new Promise((resolve, reject) => {
        const child = spawn('npx', ['next', 'dev', '-p', String(PORT)], {
            cwd: process.cwd(),
            env: {
                ...process.env,
                NEXT_TELEMETRY_DISABLED: '1',
            },
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        let settled = false;

        const handleError = (error) => {
            if (!settled) {
                settled = true;
                reject(error instanceof Error ? error : new Error(String(error)));
            }
        };

        const timeout = setTimeout(() => {
            handleError(new Error('Pornirea Next.js a depășit timpul alocat (60s).'));
        }, 60000);

        const onData = (data) => {
            const text = data.toString();
            if (text.includes('ready - started server on') || text.includes('Ready in')) {
                child.stdout.off('data', onData);
                clearTimeout(timeout);
                if (!settled) {
                    settled = true;
                    resolve(child);
                }
            }
        };

        child.stdout.on('data', onData);
        child.stderr.on('data', (data) => {
            const text = data.toString();
            if (text.toLowerCase().includes('error')) {
                child.stdout.off('data', onData);
                clearTimeout(timeout);
                handleError(new Error(text));
            }
        });
        child.on('exit', (code) => {
            clearTimeout(timeout);
            handleError(new Error(`Next.js s-a închis neașteptat cu codul ${code}`));
        });
    });
}

async function fetchAndAssert(path) {
    const response = await fetch(`${BASE_URL}${path}`);
    if (!response.ok) {
        throw new Error(`Endpoint-ul ${path} a răspuns cu status ${response.status}`);
    }
    return response.text();
}

function validateJsonLd(html, context) {
    const scripts = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
    if (!scripts.length) {
        throw new Error(`Nu am găsit blocuri JSON-LD în ${context}`);
    }

    for (const [, raw] of scripts) {
        try {
            JSON.parse(raw.trim());
        } catch (error) {
            throw new Error(`JSON-LD invalid în ${context}: ${(error).message}`);
        }
    }
}

async function main() {
    let server;
    try {
        server = await startNextDev();
        // Asigurăm un mic buffer pentru build-ul inițial.
        await delay(1500);

        await fetchAndAssert('/robots.txt');
        await fetchAndAssert('/sitemap.xml');
        await fetchAndAssert('/feed.xml');

        const homeHtml = await fetchAndAssert('/');
        const carsHtml = await fetchAndAssert('/cars');
        const blogHtml = await fetchAndAssert('/blog');
        const postHtml = await fetchAndAssert('/blog/cum-optimizam-flota-in-sezonul-de-varf');
        const contactHtml = await fetchAndAssert('/contact');
        const offersHtml = await fetchAndAssert('/offers');

        validateJsonLd(homeHtml, '/');
        validateJsonLd(carsHtml, '/cars');
        validateJsonLd(blogHtml, '/blog');
        validateJsonLd(postHtml, '/blog/[slug]');
        validateJsonLd(contactHtml, '/contact');
        validateJsonLd(offersHtml, '/offers');

        console.log('✔ Verificările SEO au fost finalizate cu succes.');
    } finally {
        if (server && !server.killed) {
            server.kill('SIGINT');
            try {
                if (server.exitCode === null) {
                    await Promise.race([once(server, 'exit'), delay(1000)]);
                }
            } catch (error) {
                console.warn('Serverul Next.js nu s-a închis curat:', error);
            }
        }
    }
}

main()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error('✖ Verificările SEO au eșuat:', error.message);
        process.exit(1);
    });
