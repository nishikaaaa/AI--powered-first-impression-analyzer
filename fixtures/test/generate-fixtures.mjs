import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));

function escapePdf(s) {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function ascii(s) {
  return s.replace(/[—–]/g, "-").replace(/[^\x00-\x7F]/g, " ");
}

function buildPdf(text) {
  const lines = ascii(text).split("\n");
  const linesPerPage = 44;
  const pages = [];
  for (let i = 0; i < lines.length; i += linesPerPage) {
    pages.push(lines.slice(i, i + linesPerPage));
  }

  const objs = [];
  const add = (body) => {
    objs.push(body);
    return objs.length;
  };

  const fontId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const fontBoldId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

  const pageIds = [];
  const contentIds = [];
  for (const pageLines of pages) {
    const stream = pageLines
      .map((line, idx) => {
        const y = 760 - idx * 16;
        const bold = line === line.toUpperCase() && line.trim().length > 2 && !line.startsWith(" ");
        const font = bold ? "F2" : "F1";
        const size = idx === 0 ? 18 : bold ? 12 : 10;
        return `BT /${font} ${size} Tf 48 ${y} Td (${escapePdf(line)}) Tj ET`;
      })
      .join("\n");
    const contentId = add(
      `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`,
    );
    contentIds.push(contentId);
    pageIds.push(null);
  }

  const pagesIdPlaceholder = objs.length + 1 + pageIds.length;
  for (let i = 0; i < pages.length; i++) {
    pageIds[i] = add(
      `<< /Type /Page /Parent ${pagesIdPlaceholder} 0 R /MediaBox [0 0 612 792] /Contents ${contentIds[i]} 0 R /Resources << /Font << /F1 ${fontId} 0 R /F2 ${fontBoldId} 0 R >> >> >>`,
    );
  }
  const kids = pageIds.map((id) => `${id} 0 R`).join(" ");
  const pagesId = add(`<< /Type /Pages /Kids [ ${kids} ] /Count ${pageIds.length} >>`);
  if (pagesId !== pagesIdPlaceholder) {
    throw new Error(`pages id mismatch ${pagesId} vs ${pagesIdPlaceholder}`);
  }
  const catalogId = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  let out = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 0; i < objs.length; i++) {
    offsets.push(Buffer.byteLength(out, "latin1"));
    out += `${i + 1} 0 obj\n${objs[i]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objs.length + 1}\n`;
  out += "0000000000 65535 f \n";
  for (let i = 1; i <= objs.length; i++) {
    out += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  out += `trailer\n<< /Size ${objs.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

const resume = `JORDAN LEE
Boston, MA  |  jordan.lee@example.edu  |  github.com/jordanlee-cs
Software Engineering Intern  |  Seeking Summer 2026 Backend Internship

SUMMARY
CS junior who ships small production changes and writes the tests that keep them from breaking.
Comfortable with Node APIs, SQL, and explaining a bug before proposing a fix.

EXPERIENCE
Software Engineering Intern  —  Northwind Labs, Boston, MA
Jun 2025 – Aug 2025
- Shipped a Node checkout webhook handler and added 14 integration tests.
- Fixed 12 payment edge-case bugs in the billing service (timeouts, duplicate events).
- Wrote a local Stripe test-mode runbook used by the next intern on day one.
- Pair-programmed on a Redis cache for catalog reads; p95 dropped on the staging replica.

Student Technician  —  Campus IT, Northeastern University
Sep 2024 – Present
- Imaged and reset 200+ student laptops per semester.
- Documented Wi-Fi onboarding FAQs; fewer repeat tickets after the guide shipped.
- Staffed the walk-up desk 8 hours/week during the academic year.

PROJECTS
DormSwap  —  campus marketplace (Express, PostgreSQL, React)
- Session auth, listing CRUD, and image uploads for a closed beta of 80 students.
- Added basic rate limiting after a scrape attempt during finals week.

CourseTrack  —  personal grade tracker (Python, SQLite)
- Parses syllabus PDFs and stores assignment dates. Used by 6 classmates.

EDUCATION
Northeastern University  —  B.S. Computer Science (expected 2026)
Coursework: Algorithms, Databases, Networks, Software Engineering
GPA: 3.6 / 4.0

SKILLS
Languages: TypeScript, JavaScript, Python, SQL
Tools: Node.js, React, PostgreSQL, Redis, Git, Jest, Docker (basics)
`;

writeFileSync(join(dir, "resume-jordan-lee.pdf"), buildPdf(resume));

function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function makePng(width, height) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x++) {
      const i = row + 1 + x * 3;
      const cx = x / width;
      const cy = y / height;
      const vignette = Math.hypot(cx - 0.5, cy - 0.42);
      const desk = cy > 0.62 ? 1 : 0;
      const window = cx > 0.62 && cy < 0.38 && cx < 0.92 ? 1 : 0;
      const laptop = cx > 0.22 && cx < 0.62 && cy > 0.28 && cy < 0.58;
      const screen = laptop && cy < 0.5 && cx > 0.26 && cx < 0.58;
      let r = 28 + cx * 18;
      let g = 32 + (1 - cy) * 24;
      let b = 48 + (1 - vignette) * 40;
      if (desk) {
        r = 42;
        g = 36;
        b = 32;
      }
      if (window) {
        r = 210;
        g = 186;
        b = 140;
      }
      if (laptop) {
        r = 18;
        g = 20;
        b = 24;
      }
      if (screen) {
        r = 56 + Math.sin(x / 9) * 10;
        g = 110;
        b = 96;
      }
      raw[i] = Math.max(0, Math.min(255, r));
      raw[i + 1] = Math.max(0, Math.min(255, g));
      raw[i + 2] = Math.max(0, Math.min(255, b));
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return png;
}

writeFileSync(join(dir, "instagram-late-night-build.png"), makePng(1080, 1080));
console.log("wrote resume pdf + instagram png");
