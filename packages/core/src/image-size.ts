/**
 * Minimal intrinsic-size reader for the formats the panel accepts.
 *
 * Dimensions are only used to label the media library, so anything exotic
 * (AVIF, SVG) simply returns null rather than pulling in a parser dependency.
 */

export type ImageSize = { width: number; height: number };

function png(buf: Buffer): ImageSize | null {
  // 8-byte signature, then the IHDR chunk: length(4) type(4) width(4) height(4)
  if (buf.length < 24 || buf.readUInt32BE(12) !== 0x49484452) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function gif(buf: Buffer): ImageSize | null {
  if (buf.length < 10) return null;
  return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
}

function jpeg(buf: Buffer): ImageSize | null {
  let offset = 2; // skip SOI
  while (offset + 9 < buf.length) {
    if (buf[offset] !== 0xff) return null;
    const marker = buf[offset + 1];
    const length = buf.readUInt16BE(offset + 2);

    // SOF0–SOF15 carry the frame header; SOF4/8/12 are not frame markers
    const isSOF = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isSOF) {
      return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  return null;
}

function webp(buf: Buffer): ImageSize | null {
  if (buf.length < 30 || buf.toString("ascii", 8, 12) !== "WEBP") return null;
  const format = buf.toString("ascii", 12, 16);

  if (format === "VP8 ") {
    return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  }
  if (format === "VP8L") {
    const bits = buf.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (format === "VP8X") {
    // 24-bit little-endian, stored as value-1
    const w = buf[24] | (buf[25] << 8) | (buf[26] << 16);
    const h = buf[27] | (buf[28] << 8) | (buf[29] << 16);
    return { width: w + 1, height: h + 1 };
  }
  return null;
}

export function readImageSize(buf: Buffer, mimeType: string): ImageSize | null {
  try {
    switch (mimeType) {
      case "image/png":
        return png(buf);
      case "image/gif":
        return gif(buf);
      case "image/jpeg":
        return jpeg(buf);
      case "image/webp":
        return webp(buf);
      default:
        return null;
    }
  } catch {
    return null;
  }
}
