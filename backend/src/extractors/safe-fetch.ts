/**
 * Safe fetch utility for content extractors.
 *
 * Provides protection against:
 * - SSRF: blocks requests to private/internal IP ranges
 * - Timeouts: AbortController with configurable timeout
 * - OOM: response body size limit
 */

import { URL } from 'url';
import dns from 'dns/promises';
import net from 'net';

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_BODY_BYTES = 5 * 1024 * 1024; // 5 MB

interface SafeFetchOptions extends RequestInit {
    timeoutMs?: number;
    maxBodyBytes?: number;
    /** Skip SSRF check for known-safe API hosts (e.g. googleapis.com) */
    skipSsrfCheck?: boolean;
}

/**
 * Check if an IP address is private/internal.
 */
function isPrivateIp(ip: string): boolean {
    // IPv4-mapped IPv6 — extract the v4 part
    if (ip.startsWith('::ffff:')) {
        ip = ip.slice(7);
    }

    if (net.isIPv4(ip)) {
        const parts = ip.split('.').map(Number);
        // 10.0.0.0/8
        if (parts[0] === 10) return true;
        // 172.16.0.0/12
        if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
        // 192.168.0.0/16
        if (parts[0] === 192 && parts[1] === 168) return true;
        // 127.0.0.0/8 (loopback)
        if (parts[0] === 127) return true;
        // 169.254.0.0/16 (link-local / cloud metadata)
        if (parts[0] === 169 && parts[1] === 254) return true;
        // 0.0.0.0
        if (parts.every(p => p === 0)) return true;
        return false;
    }

    if (net.isIPv6(ip)) {
        const normalized = ip.toLowerCase();
        // ::1 loopback
        if (normalized === '::1') return true;
        // fe80::/10 link-local
        if (normalized.startsWith('fe80:')) return true;
        // fc00::/7 unique-local
        if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
        return false;
    }

    return false;
}

/**
 * Resolve hostname and check all IPs against private ranges.
 * Throws if any resolved IP is private.
 */
async function checkSsrf(url: string): Promise<void> {
    const parsed = new URL(url);
    const hostname = parsed.hostname;

    // If hostname is already an IP, check directly
    if (net.isIP(hostname)) {
        if (isPrivateIp(hostname)) {
            throw new Error(`SSRF blocked: ${hostname} resolves to a private IP`);
        }
        return;
    }

    // Resolve DNS and check all addresses
    try {
        const addresses = await dns.resolve4(hostname);
        for (const addr of addresses) {
            if (isPrivateIp(addr)) {
                throw new Error(`SSRF blocked: ${hostname} resolves to private IP ${addr}`);
            }
        }
    } catch (err: any) {
        if (err.message?.startsWith('SSRF blocked')) throw err;
        // DNS resolution failed — let fetch handle it
    }
}

/**
 * Read a response body with a size limit.
 * Throws if the body exceeds maxBytes.
 */
async function readBodyWithLimit(response: Response, maxBytes: number): Promise<string> {
    // Fast path: check Content-Length header if available
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > maxBytes) {
        throw new Error(`Response too large: ${contentLength} bytes (limit: ${maxBytes})`);
    }

    // Stream the body with a size check
    const reader = response.body?.getReader();
    if (!reader) {
        return response.text();
    }

    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        totalBytes += value.byteLength;
        if (totalBytes > maxBytes) {
            reader.cancel();
            throw new Error(`Response too large: exceeded ${maxBytes} byte limit`);
        }
        chunks.push(value);
    }

    const decoder = new TextDecoder();
    return chunks.map(c => decoder.decode(c, { stream: true })).join('') + decoder.decode();
}

/**
 * Fetch a URL with SSRF protection, timeout, and size limits.
 *
 * @returns The Response object. Use `safeFetchText()` if you need the body as a string with size limits.
 */
export async function safeFetch(url: string, options: SafeFetchOptions = {}): Promise<Response> {
    const { timeoutMs = DEFAULT_TIMEOUT_MS, maxBodyBytes, skipSsrfCheck = false, ...fetchOptions } = options;

    // SSRF check
    if (!skipSsrfCheck) {
        await checkSsrf(url);
    }

    // Timeout via AbortController
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    // Merge abort signals if caller provided one
    if (fetchOptions.signal) {
        const callerSignal = fetchOptions.signal;
        callerSignal.addEventListener('abort', () => controller.abort());
    }

    try {
        const response = await fetch(url, {
            ...fetchOptions,
            signal: controller.signal,
        });
        return response;
    } catch (err: any) {
        if (err.name === 'AbortError') {
            throw new Error(`Fetch timed out after ${timeoutMs}ms: ${url}`);
        }
        throw err;
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Fetch a URL and return the body as text, with all safety checks.
 */
export async function safeFetchText(url: string, options: SafeFetchOptions = {}): Promise<{ response: Response; text: string }> {
    const { maxBodyBytes = DEFAULT_MAX_BODY_BYTES, ...rest } = options;
    const response = await safeFetch(url, { maxBodyBytes, ...rest });
    const text = await readBodyWithLimit(response, maxBodyBytes);
    return { response, text };
}

/**
 * Fetch a URL and return the body as JSON, with all safety checks.
 */
export async function safeFetchJson<T = any>(url: string, options: SafeFetchOptions = {}): Promise<{ response: Response; data: T }> {
    const { maxBodyBytes = DEFAULT_MAX_BODY_BYTES, ...rest } = options;
    const response = await safeFetch(url, { maxBodyBytes, ...rest });
    const text = await readBodyWithLimit(response, maxBodyBytes);
    const data = JSON.parse(text) as T;
    return { response, data };
}
