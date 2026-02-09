import { useRef, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { CanonicalTOSMatrix, BloomLevel } from "@/utils/tosCalculator";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface TOSMatrixProps {
  data: CanonicalTOSMatrix;
}

export const TOSMatrix = ({ data }: TOSMatrixProps) => {
  const { distribution, total_hours, bloom_totals } = data;
  const printRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const bloomLevels: { key: BloomLevel; label: string; difficulty: string; pct: string }[] = [
    { key: 'remembering', label: 'Remembering', difficulty: 'Easy', pct: '15%' },
    { key: 'understanding', label: 'Understanding', difficulty: 'Easy', pct: '15%' },
    { key: 'applying', label: 'Applying', difficulty: 'Average', pct: '20%' },
    { key: 'analyzing', label: 'Analyzing', difficulty: 'Average', pct: '20%' },
    { key: 'evaluating', label: 'Evaluating', difficulty: 'Difficult', pct: '15%' },
    { key: 'creating', label: 'Creating', difficulty: 'Difficult', pct: '15%' },
  ];

  const formatItemNumbers = (items: number[]) => {
    if (items.length === 0) return "";
    if (items.length === 1) return `(${items[0]})`;
    const sorted = [...items].sort((a, b) => a - b);
    const groups: string[] = [];
    let start = sorted[0], end = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === end + 1) { end = sorted[i]; }
      else {
        groups.push(start === end ? `${start}` : `${start}-${end}`);
        start = end = sorted[i];
      }
    }
    groups.push(start === end ? `${start}` : `${start}-${end}`);
    return `(${groups.join(',')})`;
  };

  const formatItemPlacement = (topicName: string) => {
    const allItems = bloomLevels
      .flatMap(l => distribution[topicName]?.[l.key]?.items || [])
      .sort((a, b) => a - b);
    if (allItems.length === 0) return "-";
    return "I";
  };

  const getTopicTotal = (topic: string) => distribution[topic]?.total || 0;
  const actualTotal = Object.values(distribution).reduce((sum, t) => sum + t.total, 0);

  // Shared inline styles for the printable content (used by both screen render and popup print)
  const printStyles = `
    @page { size: letter landscape; margin: 0.5in 0.6in; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: "Times New Roman", Times, serif; font-size: 11pt; color: #000; background: #fff; line-height: 1.4; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .tos-header { text-align: center; font-weight: bold; font-size: 14pt; border: 2px solid #000; padding: 6px 0; margin-bottom: 14px; text-transform: uppercase; letter-spacing: 1px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 40px; margin-bottom: 14px; font-size: 11pt; }
    .meta-grid .value { text-decoration: underline; margin-left: 4px; }
    table { border-collapse: collapse; width: 100%; table-layout: auto; margin-top: 8px; }
    th, td { border: 1.5px solid #000; padding: 4px 6px; text-align: center; vertical-align: middle; font-size: 9.5pt; }
    th { background-color: #e8f5e9 !important; font-weight: bold; }
    .topic-cell { text-align: left; padding-left: 8px; min-width: 120px; }
    .item-nums { font-size: 7.5pt; display: block; color: #333; }
    .sig-section { display: flex; justify-content: space-between; margin-top: 30px; }
    .sig-block { text-align: center; width: 40%; }
    .sig-line { border-top: 1px solid #000; margin-top: 30px; padding-top: 4px; font-weight: bold; }
    .sig-title { font-size: 9pt; color: #555; }
    .total-row td { font-weight: bold; background-color: #f5f5f5 !important; }
    @media print { body { margin: 0; padding: 0; } }
  `;

  // Build the inner HTML for the TOS document (shared between screen and print)
  const buildTOSHTML = useCallback(() => {
    const topicRows = data.topics.map(t => {
      const dist = distribution[t.topic];
      return {
        topic: t.topic,
        hours: dist?.hours ?? t.hours ?? 0,
        percentage: dist?.percentage ?? 0,
        remembering: dist?.remembering ?? { count: 0, items: [] },
        understanding: dist?.understanding ?? { count: 0, items: [] },
        applying: dist?.applying ?? { count: 0, items: [] },
        analyzing: dist?.analyzing ?? { count: 0, items: [] },
        evaluating: dist?.evaluating ?? { count: 0, items: [] },
        creating: dist?.creating ?? { count: 0, items: [] },
        total: dist?.total ?? 0,
      };
    });

    const totals = topicRows.reduce(
      (acc, r) => ({
        hours: acc.hours + r.hours,
        remembering: acc.remembering + r.remembering.count,
        understanding: acc.understanding + r.understanding.count,
        applying: acc.applying + r.applying.count,
        analyzing: acc.analyzing + r.analyzing.count,
        evaluating: acc.evaluating + r.evaluating.count,
        creating: acc.creating + r.creating.count,
        total: acc.total + r.total,
      }),
      { hours: 0, remembering: 0, understanding: 0, applying: 0, analyzing: 0, evaluating: 0, creating: 0, total: 0 }
    );

    const fmtItems = (items: number[]) => {
      if (!items || items.length === 0) return '';
      if (items.length <= 3) return `(${items.join(',')})`;
      const sorted = [...items].sort((a, b) => a - b);
      const ranges: string[] = [];
      let s = sorted[0], e = sorted[0];
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] === e + 1) { e = sorted[i]; }
        else { ranges.push(s === e ? `${s}` : `${s}-${e}`); s = e = sorted[i]; }
      }
      ranges.push(s === e ? `${s}` : `${s}-${e}`);
      return `(${ranges.join(',')})`;
    };

    const levels = ['remembering', 'understanding', 'applying', 'analyzing', 'evaluating', 'creating'] as const;

    return `
      <div class="tos-header">Two-Way Table of Specification</div>
      <div class="meta-grid">
        <div><span>College: </span><span class="value">${data.description || '_______________'}</span></div>
        <div><span>Examination Period: </span><span class="value">${data.exam_period || '_______________'}</span></div>
        <div><span>Subject No.: </span><span class="value">${data.subject_no || '_______________'}</span></div>
        <div><span>Year and Section: </span><span class="value">${data.year_section || '_______________'}</span></div>
        <div><span>Description: </span><span class="value">${data.description || '_______________'}</span></div>
        <div><span>Course: </span><span class="value">${data.course || '_______________'}</span></div>
      </div>
      <table>
        <thead>
          <tr>
            <th rowspan="2" style="min-width:120px">TOPIC</th>
            <th rowspan="2">NO. OF<br>HOURS</th>
            <th rowspan="2">PERCENTAGE</th>
            <th colspan="6" style="font-size:10pt">COGNITIVE DOMAINS</th>
            <th rowspan="2">ITEM<br>PLACEMENT</th>
            <th rowspan="2">TOTAL</th>
          </tr>
          <tr>
            <th colspan="2" style="font-size:8.5pt">EASY (30%)</th>
            <th colspan="2" style="font-size:8.5pt">AVERAGE (40%)</th>
            <th colspan="2" style="font-size:8.5pt">DIFFICULT (30%)</th>
          </tr>
          <tr>
            <th colspan="3" style="padding:0"></th>
            <th style="font-size:8pt">Remembering<br>(15%)</th>
            <th style="font-size:8pt">Understanding<br>(15%)</th>
            <th style="font-size:8pt">Applying<br>(20%)</th>
            <th style="font-size:8pt">Analyzing<br>(20%)</th>
            <th style="font-size:8pt">Evaluating<br>(15%)</th>
            <th style="font-size:8pt">Creating<br>(15%)</th>
            <th colspan="2" style="padding:0"></th>
          </tr>
        </thead>
        <tbody>
          ${topicRows.map(row => `
            <tr>
              <td class="topic-cell">${row.topic}</td>
              <td>${row.hours} hours</td>
              <td>${row.percentage}%</td>
              ${levels.map(level => `
                <td>
                  ${row[level].count}
                  <span class="item-nums">${fmtItems(row[level].items)}</span>
                </td>
              `).join('')}
              <td style="font-weight:bold">I</td>
              <td style="font-weight:bold;font-size:10pt">${row.total}</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td style="text-align:left;padding-left:8px;font-size:10pt;font-weight:bold">TOTAL</td>
            <td style="font-size:10pt;font-weight:bold">${totals.hours}</td>
            <td style="font-size:10pt;font-weight:bold">100%</td>
            <td style="font-size:10pt;font-weight:bold">${totals.remembering}</td>
            <td style="font-size:10pt;font-weight:bold">${totals.understanding}</td>
            <td style="font-size:10pt;font-weight:bold">${totals.applying}</td>
            <td style="font-size:10pt;font-weight:bold">${totals.analyzing}</td>
            <td style="font-size:10pt;font-weight:bold">${totals.evaluating}</td>
            <td style="font-size:10pt;font-weight:bold">${totals.creating}</td>
            <td></td>
            <td style="font-size:10pt;font-weight:bold">${totals.total}</td>
          </tr>
        </tbody>
      </table>
      <div class="sig-section">
        <div class="sig-block">
          <div>Prepared by:</div>
          <div class="sig-line">${data.prepared_by || ''}</div>
          ${data.prepared_by ? '<div class="sig-title">Teacher</div>' : ''}
        </div>
        <div class="sig-block">
          <div>Noted by:</div>
          <div class="sig-line">${data.noted_by || ''}</div>
          ${data.noted_by ? '<div class="sig-title">Dean</div>' : ''}
        </div>
      </div>
    `;
  }, [data, distribution]);

  const handlePrint = useCallback(() => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Could not open print window. Check popup blockers.');
      return;
    }
    printWindow.document.write(`
      <html><head><title>Table of Specification - ${data.title || 'TOS'}</title>
      <style>${printStyles}</style></head>
      <body>${buildTOSHTML()}</body></html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 400);
  }, [data, printStyles, buildTOSHTML]);

  const handleExportPDF = useCallback(async () => {
    if (!printRef.current) return;
    setExporting(true);

    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: printRef.current.scrollWidth,
        height: printRef.current.scrollHeight,
      });

      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const mx = 12, my = 10;
      const usableW = pdfW - mx * 2;
      const usableH = pdfH - my * 2;
      const imgH = (canvas.height * usableW) / canvas.width;

      if (imgH <= usableH) {
        pdf.addImage(canvas.toDataURL('image/png', 0.95), 'PNG', mx, my, usableW, imgH);
      } else {
        let remaining = imgH, srcY = 0;
        const ratio = canvas.width / usableW;
        while (remaining > 0) {
          if (srcY > 0) pdf.addPage();
          const sliceH = Math.min(remaining, usableH);
          const srcSliceH = sliceH * ratio;
          const sc = document.createElement('canvas');
          sc.width = canvas.width;
          sc.height = srcSliceH;
          const ctx = sc.getContext('2d');
          if (ctx) {
            ctx.drawImage(canvas, 0, srcY, canvas.width, srcSliceH, 0, 0, canvas.width, srcSliceH);
            pdf.addImage(sc.toDataURL('image/png', 0.95), 'PNG', mx, my, usableW, sliceH);
          }
          srcY += srcSliceH;
          remaining -= usableH;
        }
      }

      const filename = `TOS_${data.subject_no || 'export'}_${data.exam_period || ''}.pdf`.replace(/\s+/g, '_');
      pdf.save(filename);
      toast.success("TOS exported as PDF successfully!");
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error("Failed to export PDF");
    } finally {
      setExporting(false);
    }
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Action Buttons - hidden in print */}
      <div className="flex gap-2 print:hidden">
        <Button onClick={handleExportPDF} variant="default" disabled={exporting}>
          <Download className="h-4 w-4 mr-2" />
          {exporting ? 'Exporting...' : 'Export PDF'}
        </Button>
        <Button onClick={handlePrint} variant="outline">
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
      </div>

      {/* Printable TOS Document - rendered on screen and used for PDF capture */}
      <div
        ref={printRef}
        style={{
          fontFamily: '"Times New Roman", Times, serif',
          fontSize: '11pt',
          color: '#000',
          background: '#fff',
          padding: '20px',
          lineHeight: 1.4,
        }}
      >
        {/* Title */}
        <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '14pt', border: '2px solid #000', padding: '6px 0', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Two-Way Table of Specification
        </div>

        {/* Metadata grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 40px', marginBottom: '14px', fontSize: '11pt' }}>
          <div><span>College: </span><span style={{ textDecoration: 'underline' }}>{data.description || '_______________'}</span></div>
          <div><span>Examination Period: </span><span style={{ textDecoration: 'underline' }}>{data.exam_period || '_______________'}</span></div>
          <div><span>Subject No.: </span><span style={{ textDecoration: 'underline' }}>{data.subject_no || '_______________'}</span></div>
          <div><span>Year and Section: </span><span style={{ textDecoration: 'underline' }}>{data.year_section || '_______________'}</span></div>
          <div><span>Description: </span><span style={{ textDecoration: 'underline' }}>{data.description || '_______________'}</span></div>
          <div><span>Course: </span><span style={{ textDecoration: 'underline' }}>{data.course || '_______________'}</span></div>
        </div>

        {/* TOS Table */}
        <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'auto', marginTop: '8px' }}>
          <thead>
            <tr>
              <th rowSpan={2} style={{ border: '1.5px solid #000', padding: '4px 6px', backgroundColor: '#e8f5e9', fontWeight: 'bold', fontSize: '9.5pt', minWidth: '120px' }}>TOPIC</th>
              <th rowSpan={2} style={{ border: '1.5px solid #000', padding: '4px 6px', backgroundColor: '#e8f5e9', fontWeight: 'bold', fontSize: '9.5pt' }}>NO. OF<br/>HOURS</th>
              <th rowSpan={2} style={{ border: '1.5px solid #000', padding: '4px 6px', backgroundColor: '#e8f5e9', fontWeight: 'bold', fontSize: '9.5pt' }}>PERCENTAGE</th>
              <th colSpan={6} style={{ border: '1.5px solid #000', padding: '4px 6px', backgroundColor: '#e8f5e9', fontWeight: 'bold', fontSize: '10pt' }}>COGNITIVE DOMAINS</th>
              <th rowSpan={2} style={{ border: '1.5px solid #000', padding: '4px 6px', backgroundColor: '#e8f5e9', fontWeight: 'bold', fontSize: '9.5pt' }}>ITEM<br/>PLACEMENT</th>
              <th rowSpan={2} style={{ border: '1.5px solid #000', padding: '4px 6px', backgroundColor: '#e8f5e9', fontWeight: 'bold', fontSize: '9.5pt' }}>TOTAL</th>
            </tr>
            <tr>
              <th colSpan={2} style={{ border: '1.5px solid #000', padding: '3px 4px', backgroundColor: '#e8f5e9', fontWeight: 'bold', fontSize: '8.5pt' }}>EASY (30%)</th>
              <th colSpan={2} style={{ border: '1.5px solid #000', padding: '3px 4px', backgroundColor: '#e8f5e9', fontWeight: 'bold', fontSize: '8.5pt' }}>AVERAGE (40%)</th>
              <th colSpan={2} style={{ border: '1.5px solid #000', padding: '3px 4px', backgroundColor: '#e8f5e9', fontWeight: 'bold', fontSize: '8.5pt' }}>DIFFICULT (30%)</th>
            </tr>
            <tr>
              <th colSpan={3} style={{ border: '1.5px solid #000', padding: '0', backgroundColor: '#e8f5e9' }}></th>
              {bloomLevels.map(level => (
                <th key={level.key} style={{ border: '1.5px solid #000', padding: '3px 4px', backgroundColor: '#e8f5e9', fontWeight: 'bold', fontSize: '8pt' }}>
                  {level.label}<br/>({level.pct})
                </th>
              ))}
              <th colSpan={2} style={{ border: '1.5px solid #000', padding: '0', backgroundColor: '#e8f5e9' }}></th>
            </tr>
          </thead>
          <tbody>
            {data.topics.map((topic) => {
              const topicDist = distribution[topic.topic];
              return (
                <tr key={topic.topic}>
                  <td style={{ border: '1.5px solid #000', padding: '5px 8px', textAlign: 'left', fontSize: '9.5pt', verticalAlign: 'middle' }}>
                    {topic.topic}
                  </td>
                  <td style={{ border: '1.5px solid #000', padding: '4px 6px', textAlign: 'center', fontSize: '9.5pt', verticalAlign: 'middle' }}>
                    {topic.hours} hours
                  </td>
                  <td style={{ border: '1.5px solid #000', padding: '4px 6px', textAlign: 'center', fontSize: '9.5pt', verticalAlign: 'middle' }}>
                    {topicDist?.percentage || 0}%
                  </td>
                  {bloomLevels.map(level => {
                    const bloomData = topicDist?.[level.key];
                    return (
                      <td key={level.key} style={{ border: '1.5px solid #000', padding: '4px 5px', textAlign: 'center', fontSize: '9.5pt', verticalAlign: 'middle' }}>
                        {bloomData?.count || 0}
                        <span style={{ display: 'block', fontSize: '7.5pt', color: '#333' }}>
                          {formatItemNumbers(bloomData?.items || [])}
                        </span>
                      </td>
                    );
                  })}
                  <td style={{ border: '1.5px solid #000', padding: '4px 6px', textAlign: 'center', fontSize: '9.5pt', fontWeight: 'bold', verticalAlign: 'middle' }}>
                    {formatItemPlacement(topic.topic)}
                  </td>
                  <td style={{ border: '1.5px solid #000', padding: '4px 6px', textAlign: 'center', fontSize: '10pt', fontWeight: 'bold', verticalAlign: 'middle' }}>
                    {getTopicTotal(topic.topic)}
                  </td>
                </tr>
              );
            })}
            {/* Totals row */}
            <tr style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
              <td style={{ border: '1.5px solid #000', padding: '5px 8px', textAlign: 'left', fontSize: '10pt', fontWeight: 'bold' }}>TOTAL</td>
              <td style={{ border: '1.5px solid #000', padding: '4px 6px', textAlign: 'center', fontSize: '10pt', fontWeight: 'bold' }}>{total_hours}</td>
              <td style={{ border: '1.5px solid #000', padding: '4px 6px', textAlign: 'center', fontSize: '10pt', fontWeight: 'bold' }}>100%</td>
              {bloomLevels.map(level => (
                <td key={level.key} style={{ border: '1.5px solid #000', padding: '4px 6px', textAlign: 'center', fontSize: '10pt', fontWeight: 'bold' }}>
                  {bloom_totals[level.key]}
                </td>
              ))}
              <td style={{ border: '1.5px solid #000', padding: '4px 6px', textAlign: 'center', fontSize: '10pt' }}></td>
              <td style={{ border: '1.5px solid #000', padding: '4px 6px', textAlign: 'center', fontSize: '10pt', fontWeight: 'bold' }}>{actualTotal}</td>
            </tr>
          </tbody>
        </table>

        {/* Signature Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px' }}>
          <div style={{ textAlign: 'center', width: '40%' }}>
            <div>Prepared by:</div>
            <div style={{ borderTop: '1px solid #000', marginTop: '30px', paddingTop: '4px', fontWeight: 'bold' }}>{data.prepared_by || ''}</div>
            {data.prepared_by && <div style={{ fontSize: '9pt', color: '#555' }}>Teacher</div>}
          </div>
          <div style={{ textAlign: 'center', width: '40%' }}>
            <div>Noted by:</div>
            <div style={{ borderTop: '1px solid #000', marginTop: '30px', paddingTop: '4px', fontWeight: 'bold' }}>{data.noted_by || ''}</div>
            {data.noted_by && <div style={{ fontSize: '9pt', color: '#555' }}>Dean</div>}
          </div>
        </div>
      </div>
    </div>
  );
};
