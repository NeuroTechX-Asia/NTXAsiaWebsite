/**
 * Shifted-chunk encoding for values that should not sit in the markup.
 *
 * The value is cut into three chunks and every character code is shifted by a
 * random per-chunk offset, so what crosses the wire is a list of integers, not
 * an address or a URL. This stops harvesters, static scraping and casual
 * inspection — it is obfuscation, not secrecy: anyone who runs the page can
 * decode it. The only real gate would be a captcha or a server that keeps the
 * value entirely to itself.
 *
 * Shared by the contact reveal (`app/api/contact/route.js`) and the community
 * invite links (`app/api/social/route.js`) so there is one mechanism, not two.
 */

/** Server side: value → three shifted integer chunks. */
export function encodeChunks(value, parts = 3) {
  const codes = [...String(value)].map((c) => c.charCodeAt(0));
  const size = Math.ceil(codes.length / parts);
  return Array.from({ length: parts }, (_, i) => {
    const offset = 1 + Math.floor(Math.random() * 200);
    return {
      o: offset,
      c: codes.slice(i * size, (i + 1) * size).map((code) => code + offset),
    };
  });
}

/** Client side: three shifted integer chunks → value. */
export function decodeChunks(parts) {
  return parts
    .map((part) => part.c.map((v) => String.fromCharCode(v - part.o)).join(""))
    .join("");
}
