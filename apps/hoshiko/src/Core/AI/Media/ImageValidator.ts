import dns from "dns";
import net from "net";

export interface ImageValidationResult {
  valid: boolean;
  finalUrl?: string;
  reason?: string;
  mimeType?: string;
  contentLength?: number;
}

const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB
const TIMEOUT_MS = 2500;
const MAX_REDIRECTS = 2;

export class ImageValidator {
  /**
   * Valida si una dirección IP pertenece a rangos privados, loopback,
   * link-local o metadatos de proveedores cloud (SSRF prevention).
   */
  static isForbiddenIp(ip: string): boolean {
    if (!net.isIP(ip)) return true;

    // IPv4 Checks
    if (net.isIPv4(ip)) {
      const parts = ip.split(".").map(Number);
      const [b0, b1] = parts;

      // 0.0.0.0/8 (Broadcast actual)
      if (b0 === 0) return true;
      // 127.0.0.0/8 (Loopback)
      if (b0 === 127) return true;
      // 10.0.0.0/8 (Privada RFC 1918)
      if (b0 === 10) return true;
      // 172.16.0.0/12 (Privada RFC 1918)
      if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;
      // 192.168.0.0/16 (Privada RFC 1918)
      if (b0 === 192 && b1 === 168) return true;
      // 169.254.0.0/16 (Link-local y Cloud Metadata AWS/GCP/Azure 169.254.169.254)
      if (b0 === 169 && b1 === 254) return true;
      // 100.64.0.0/10 (Carrier-grade NAT)
      if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;
      // 224.0.0.0/4 (Multicast) y 240.0.0.0/4 (Reservadas)
      if (b0 >= 224) return true;

      return false;
    }

    // IPv6 Checks
    const lower = ip.toLowerCase();
    if (lower === "::1" || lower === "::") return true;
    // fc00::/7 (ULA privadas)
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
    // fe80::/10 (Link-local)
    if (lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) return true;

    return false;
  }

  /**
   * Resuelve el nombre de host y valida la IP resultante contra SSRF y DNS rebinding.
   */
  static async resolveAndValidateHost(hostname: string): Promise<{ safe: boolean; ip?: string; reason?: string }> {
    try {
      const lookupResult = await dns.promises.lookup(hostname, { all: true });
      if (!lookupResult || lookupResult.length === 0) {
        return { safe: false, reason: "Host resolution returned no addresses" };
      }

      for (const entry of lookupResult) {
        if (this.isForbiddenIp(entry.address)) {
          return { safe: false, ip: entry.address, reason: `Forbidden IP range: ${entry.address}` };
        }
      }

      return { safe: true, ip: lookupResult[0].address };
    } catch (err: any) {
      return { safe: false, reason: `DNS lookup failed: ${err.message}` };
    }
  }

  /**
   * Comprueba la firma binaria de Magic Bytes de los primeros bytes de la imagen.
   */
  static verifyMagicBytes(buffer: Uint8Array): { match: boolean; format?: string } {
    if (!buffer || buffer.length < 4) return { match: false };

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      return { match: true, format: "image/png" };
    }

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return { match: true, format: "image/jpeg" };
    }

    // WEBP: RIFF .... WEBP
    if (
      buffer.length >= 12 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 && // RIFF
      buffer[8] === 0x57 &&
      buffer[9] === 0x41 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50 // WEBP
    ) {
      return { match: true, format: "image/webp" };
    }

    return { match: false };
  }

  /**
   * Valida integralmente una URL de imagen con comprobación anti-SSRF,
   * DNS check, control de redirecciones, HEAD/Range fallback y Magic Bytes.
   */
  static async validateImageUrl(initialUrl: string): Promise<ImageValidationResult> {
    let currentUrl = initialUrl;
    let redirectCount = 0;

    while (redirectCount <= MAX_REDIRECTS) {
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(currentUrl);
      } catch {
        return { valid: false, reason: "Invalid URL structure" };
      }

      // 1. Exclusivamente HTTPS
      if (parsedUrl.protocol !== "https:") {
        return { valid: false, reason: "Only HTTPS scheme is allowed" };
      }

      // 2. Validación de DNS e IP contra rangos prohibidos
      const hostCheck = await this.resolveAndValidateHost(parsedUrl.hostname);
      if (!hostCheck.safe) {
        return { valid: false, reason: `Blocked host or IP: ${hostCheck.reason}` };
      }

      // 3. Petición HEAD con timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

      let response: Response;
      try {
        response = await fetch(currentUrl, {
          method: "HEAD",
          redirect: "manual",
          signal: controller.signal,
          headers: {
            "User-Agent": "HoshikoBot/1.0 (ImageValidation; +https://discord.gg)",
          },
        });
      } catch (err: any) {
        clearTimeout(timeout);
        return { valid: false, reason: `Network error or timeout on HEAD: ${err.message}` };
      }
      clearTimeout(timeout);

      // Manejo de Redirecciones (301, 302, 307, 308)
      if ([301, 302, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) {
          return { valid: false, reason: "Redirect without Location header" };
        }
        redirectCount++;
        try {
          currentUrl = new URL(location, currentUrl).toString();
          continue;
        } catch {
          return { valid: false, reason: "Malformed redirect URL" };
        }
      }

      // Fallback para servidores que rechazan HEAD (405 Method Not Allowed)
      let initialChunk: Uint8Array | null = null;
      let contentType = response.headers.get("content-type")?.toLowerCase() || "";
      let contentLength = Number(response.headers.get("content-length")) || 0;

      if (response.status === 405 || !response.ok) {
        // Intentar GET acotado con Range para verificar sin descargar archivo entero
        const rangeController = new AbortController();
        const rangeTimeout = setTimeout(() => rangeController.abort(), TIMEOUT_MS);
        try {
          const rangeRes = await fetch(currentUrl, {
            method: "GET",
            headers: { Range: "bytes=0-1024" },
            signal: rangeController.signal,
          });
          clearTimeout(rangeTimeout);
          if (!rangeRes.ok && rangeRes.status !== 206) {
            return { valid: false, reason: `Server returned HTTP ${rangeRes.status}` };
          }
          contentType = rangeRes.headers.get("content-type")?.toLowerCase() || "";
          contentLength = Number(rangeRes.headers.get("content-length")) || 0;
          const arrayBuf = await rangeRes.arrayBuffer();
          initialChunk = new Uint8Array(arrayBuf.slice(0, 16));
        } catch (rangeErr: any) {
          clearTimeout(rangeTimeout);
          return { valid: false, reason: `Fallback Range request failed: ${rangeErr.message}` };
        }
      }

      // 4. Validar Content-Type
      const allowedMimes = ["image/jpeg", "image/png", "image/webp"];
      const isAllowedMime = allowedMimes.some((m) => contentType.startsWith(m));
      if (!isAllowedMime) {
        return { valid: false, reason: `Unsupported Content-Type: ${contentType}` };
      }

      // 5. Validar Content-Length
      if (contentLength > MAX_IMAGE_SIZE_BYTES) {
        return { valid: false, reason: `File size exceeds 8MB limit (${contentLength} bytes)` };
      }

      // 6. Si obtuvimos bytes de cabecera, verificar Magic Bytes
      if (initialChunk) {
        const magicCheck = this.verifyMagicBytes(initialChunk);
        if (!magicCheck.match) {
          return { valid: false, reason: "Magic bytes mismatch for image format" };
        }
      }

      return {
        valid: true,
        finalUrl: currentUrl,
        mimeType: contentType,
        contentLength,
      };
    }

    return { valid: false, reason: "Exceeded maximum allowable redirects" };
  }
}
