#!/usr/bin/env node
// Renderiza docs/AUDITORIA_ALFRED_2026.md a PDF con PDFKit.
// Uso: node scripts/generate-audit-pdf.mjs [salida.pdf]
import { readFileSync, createWriteStream, mkdirSync } from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';

const SOURCE = path.resolve('docs/AUDITORIA_ALFRED_2026.md');
const OUTPUT = path.resolve(process.argv[2] || 'data/reports/ALFRED_Auditoria_2026.pdf');

const COLORS = { accent: '#0E7490', text: '#111827', muted: '#4B5563', rule: '#CBD5E1' };

function inline(text) {
  return text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/`(.+?)`/g, '$1').replace(/\*(.+?)\*/g, '$1');
}

function renderTable(doc, rows) {
  const usable = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const columns = rows[0].length;
  const width = usable / columns;
  rows.forEach((row, rowIndex) => {
    const header = rowIndex === 0;
    const heights = row.map(cell => doc.heightOfString(cell, { width: width - 10 }));
    const rowHeight = Math.max(...heights) + 8;
    if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom) doc.addPage();
    const top = doc.y;
    row.forEach((cell, columnIndex) => {
      const x = doc.page.margins.left + columnIndex * width;
      doc.font(header ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5)
        .fillColor(header ? COLORS.accent : COLORS.text)
        .text(cell, x + 5, top + 4, { width: width - 10 });
    });
    doc.y = top + rowHeight;
    doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .strokeColor(COLORS.rule).lineWidth(0.5).stroke();
    doc.y += 2;
  });
  doc.moveDown(0.6);
}

function main() {
  const markdown = readFileSync(SOURCE, 'utf8');
  mkdirSync(path.dirname(OUTPUT), { recursive: true });

  const doc = new PDFDocument({ size: 'A4', margins: { top: 56, bottom: 56, left: 56, right: 56 }, info: { Title: 'Auditoría técnica y funcional de ALFRED', Author: 'ALFRED Core' } });
  doc.pipe(createWriteStream(OUTPUT));

  const lines = markdown.split(/\r?\n/);
  let tableBuffer = [];

  const flushTable = () => {
    if (!tableBuffer.length) return;
    renderTable(doc, tableBuffer);
    tableBuffer = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.startsWith('|')) {
      const cells = line.split('|').slice(1, -1).map(cell => inline(cell.trim()));
      if (cells.every(cell => /^:?-{2,}:?$/.test(cell))) continue;
      tableBuffer.push(cells);
      continue;
    }
    flushTable();

    if (!line.trim()) { doc.moveDown(0.45); continue; }

    if (line.startsWith('# ')) {
      doc.font('Helvetica-Bold').fontSize(20).fillColor(COLORS.accent).text(inline(line.slice(2)), { align: 'left' });
      doc.moveDown(0.4);
      continue;
    }
    if (line.startsWith('## ')) {
      if (doc.y > doc.page.height - 180) doc.addPage();
      doc.moveDown(0.4);
      doc.font('Helvetica-Bold').fontSize(14).fillColor(COLORS.accent).text(inline(line.slice(3)));
      doc.moveDown(0.25);
      continue;
    }
    if (line.startsWith('### ')) {
      doc.font('Helvetica-Bold').fontSize(11.5).fillColor(COLORS.text).text(inline(line.slice(4)));
      doc.moveDown(0.15);
      continue;
    }
    if (/^-{3,}$/.test(line.trim())) {
      doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y)
        .strokeColor(COLORS.rule).lineWidth(1).stroke();
      doc.moveDown(0.5);
      continue;
    }
    if (/^[-*] /.test(line.trim())) {
      doc.font('Helvetica').fontSize(9.5).fillColor(COLORS.text)
        .text(`•  ${inline(line.trim().slice(2))}`, { indent: 12, paragraphGap: 2 });
      continue;
    }
    if (/^\d+\. /.test(line.trim())) {
      doc.font('Helvetica').fontSize(9.5).fillColor(COLORS.text)
        .text(inline(line.trim()), { indent: 12, paragraphGap: 2 });
      continue;
    }
    if (line.startsWith('**') && line.endsWith('**')) {
      doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.text).text(inline(line));
      continue;
    }

    doc.font('Helvetica').fontSize(9.5).fillColor(COLORS.muted).text(inline(line), { align: 'justify', paragraphGap: 2 });
  }
  flushTable();

  doc.end();
  console.log(`Informe PDF generado en ${OUTPUT}`);
}

main();
