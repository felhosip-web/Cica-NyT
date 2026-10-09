// Zero-dependency uncompressed ZIP archive builder with CRC-32 calculation for browser usage.

// Simple CRC32 table initialization
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[i] = c;
}

function calculateCRC32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ data[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

interface ZipFileEntry {
  filename: string;
  data: Uint8Array;
}

export class ZipBuilder {
  private files: ZipFileEntry[] = [];

  addFile(filename: string, content: string | Uint8Array): void {
    const data = typeof content === 'string' ? new TextEncoder().encode(content) : content;
    this.files.push({ filename, data });
  }

  buildBlob(mimeType = 'application/vnd.oasis.opendocument.spreadsheet'): Blob {
    const localHeaders: Uint8Array[] = [];
    const cdHeaders: Uint8Array[] = [];
    let currentOffset = 0;

    const encoder = new TextEncoder();

    for (const file of this.files) {
      const filenameBytes = encoder.encode(file.filename);
      const fileData = file.data;
      const crc = calculateCRC32(fileData);
      const size = fileData.length;

      // --- Local File Header ---
      // Signature (4) + Version (2) + Flags (2) + Compression (2) + Time (2) + Date (2) + CRC32 (4) + Compressed Size (4) + Uncompressed Size (4) + Name Length (2) + Extra Length (2)
      const lfh = new Uint8Array(30 + filenameBytes.length);
      const lfhView = new DataView(lfh.buffer);

      lfhView.setUint32(0, 0x04034b50, true); // Local header signature
      lfhView.setUint16(4, 20, true); // Version needed (2.0)
      lfhView.setUint16(6, 0, true); // General purpose bit flag
      lfhView.setUint16(8, 0, true); // Compression method (0 = Store / Uncompressed)
      lfhView.setUint16(10, 0, true); // Last mod time
      lfhView.setUint16(12, 0, true); // Last mod date
      lfhView.setUint32(14, crc, true); // CRC-32
      lfhView.setUint32(18, size, true); // Compressed size
      lfhView.setUint32(22, size, true); // Uncompressed size
      lfhView.setUint16(26, filenameBytes.length, true); // Filename length
      lfhView.setUint16(28, 0, true); // Extra field length

      lfh.set(filenameBytes, 30);

      localHeaders.push(lfh);
      localHeaders.push(fileData);

      // --- Central Directory Header ---
      const cdh = new Uint8Array(46 + filenameBytes.length);
      const cdhView = new DataView(cdh.buffer);

      cdhView.setUint32(0, 0x02014b50, true); // Central directory signature
      cdhView.setUint16(4, 20, true); // Version made by
      cdhView.setUint16(6, 20, true); // Version needed
      cdhView.setUint16(8, 0, true); // Flags
      cdhView.setUint16(10, 0, true); // Compression method
      cdhView.setUint16(12, 0, true); // Last mod time
      cdhView.setUint16(14, 0, true); // Last mod date
      cdhView.setUint32(16, crc, true); // CRC-32
      cdhView.setUint32(20, size, true); // Compressed size
      cdhView.setUint32(24, size, true); // Uncompressed size
      cdhView.setUint16(28, filenameBytes.length, true); // Filename length
      cdhView.setUint16(30, 0, true); // Extra field length
      cdhView.setUint16(32, 0, true); // Comment length
      cdhView.setUint16(34, 0, true); // Disk number start
      cdhView.setUint16(36, 0, true); // Internal attributes
      cdhView.setUint32(38, 0, true); // External attributes
      cdhView.setUint32(42, currentOffset, true); // Relative offset of local header

      cdh.set(filenameBytes, 46);

      cdHeaders.push(cdh);

      currentOffset += lfh.length + fileData.length;
    }

    const cdStartOffset = currentOffset;
    let cdTotalSize = 0;
    for (const cdh of cdHeaders) {
      cdTotalSize += cdh.length;
    }

    // --- End of Central Directory Record ---
    const eocd = new Uint8Array(22);
    const eocdView = new DataView(eocd.buffer);

    eocdView.setUint32(0, 0x06054b50, true); // End of central dir signature
    eocdView.setUint16(4, 0, true); // Number of this disk
    eocdView.setUint16(6, 0, true); // Disk with start of central dir
    eocdView.setUint16(8, this.files.length, true); // Total entries on this disk
    eocdView.setUint16(10, this.files.length, true); // Total entries
    eocdView.setUint32(12, cdTotalSize, true); // Size of central directory
    eocdView.setUint32(16, cdStartOffset, true); // Offset of start of central dir
    eocdView.setUint16(20, 0, true); // Comment length

    const blobParts: BlobPart[] = [...localHeaders, ...cdHeaders, eocd];
    return new Blob(blobParts, { type: mimeType });
  }
}
