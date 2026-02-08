import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Download, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface TopicDistribution {
  hours: number;
  percentage: number;
  total: number;
  remembering: { count: number; items: number[] };
  understanding: { count: number; items: number[] };
  applying: { count: number; items: number[] };
  analyzing: { count: number; items: number[] };
  evaluating: { count: number; items: number[] };
  creating: { count: number; items: number[] };
}

interface TOSData {
  id: string;
  title: string | null;
  subject_no: string | null;
  course: string | null;
  description: string | null;
  year_section: string | null;
  exam_period: string | null;
  school_year: string | null;
  total_items: number | null;
  prepared_by?: string | null;
  noted_by?: string | null;
  topics: Array<{ topic: string; hours: number }> | null;
  distribution: Record<string, TopicDistribution> | null;
}

interface TOSViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tos: TOSData | null;
}

export function TOSViewDialog({ open, onOpenChange, tos }: TOSViewDialogProps) {
  const [exporting, setExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const topicRows = tos?.topics?.map(t => {
    const dist = tos.distribution?.[t.topic];
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
  }) ?? [];

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

  const formatItems = (items: number[]) => {
    if (!items || items.length === 0) return '';
    if (items.length <= 3) return `(${items.join(',')})`;
    // Group consecutive ranges
    const sorted = [...items].sort((a, b) => a - b);
    const ranges: string[] = [];
    let start = sorted[0], end = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === end + 1) {
        end = sorted[i];
      } else {
        ranges.push(start === end ? `${start}` : `${start}-${end}`);
        start = end = sorted[i];
      }
    }
    ranges.push(start === end ? `${start}` : `${start}-${end}`);
    return `(${ranges.join(',')})`;
  };

  const handlePrint = useCallback(() => {
    if (!printRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: 'Error', description: 'Could not open print window. Check popup blockers.', variant: 'destructive' });
      return;
    }

    printWindow.document.write(`
      <html><head><title>Table of Specification - ${tos?.title || 'TOS'}</title>
      <style>
        @page { size: letter landscape; margin: 0.5in 0.6in; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: "Times New Roman", Times, serif; font-size: 11pt; color: #000; background: #fff; line-height: 1.4; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .tos-header { text-align: center; font-weight: bold; font-size: 14pt; border: 2px solid #000; padding: 6px 0; margin-bottom: 14px; text-transform: uppercase; letter-spacing: 1px; }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 40px; margin-bottom: 14px; font-size: 11pt; }
        .meta-grid .label { font-weight: normal; }
        .meta-grid .value { text-decoration: underline; font-weight: normal; margin-left: 4px; }
        table { border-collapse: collapse; width: 100%; table-layout: auto; margin-top: 8px; }
        th, td { border: 1.5px solid #000; padding: 4px 6px; text-align: center; vertical-align: middle; font-size: 9.5pt; }
        th { background-color: #e8f5e9 !important; font-weight: bold; }
        .topic-cell { text-align: left; padding-left: 8px; min-width: 120px; }
        .item-nums { font-size: 8pt; display: block; color: #333; }
        .sig-section { display: flex; justify-content: space-between; margin-top: 30px; }
        .sig-block { text-align: center; width: 40%; }
        .sig-line { border-top: 1px solid #000; margin-top: 30px; padding-top: 4px; font-weight: bold; }
        .sig-title { font-size: 9pt; color: #555; }
        .total-row td { font-weight: bold; background-color: #f5f5f5 !important; }
        @media print { body { margin: 0; padding: 0; } }
      </style></head><body>${printRef.current.innerHTML}</body></html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 400);
  }, [tos, toast]);

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

      const filename = `TOS_${tos?.course || 'export'}_${tos?.exam_period || ''}.pdf`.replace(/\s+/g, '_');
      pdf.save(filename);
      toast({ title: 'Success', description: 'TOS exported as PDF' });
    } catch (err) {
      console.error('PDF export error:', err);
      toast({ title: 'Error', description: 'Failed to export PDF', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  }, [tos, toast]);

  if (!tos) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-auto p-0">
        <DialogHeader className="p-4 pb-2 flex flex-row items-center justify-between sticky top-0 bg-background z-10 border-b screen-only">
          <DialogTitle className="text-lg">Table of Specification Preview</DialogTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
            <Button size="sm" onClick={handleExportPDF} disabled={exporting}>
              <Download className="h-4 w-4 mr-1" /> {exporting ? 'Exporting...' : 'Export PDF'}
            </Button>
          </div>
        </DialogHeader>

        {/* Printable TOS content */}
        <div className="p-6 overflow-auto">
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
              <div>
                <span>College: </span>
                <span style={{ textDecoration: 'underline' }}>{tos.description || '_______________'}</span>
              </div>
              <div>
                <span>Examination Period: </span>
                <span style={{ textDecoration: 'underline' }}>{tos.exam_period || '_______________'}</span>
              </div>
              <div>
                <span>Subject No.: </span>
                <span style={{ textDecoration: 'underline' }}>{tos.subject_no || '_______________'}</span>
              </div>
              <div>
                <span>Year and Section: </span>
                <span style={{ textDecoration: 'underline' }}>{tos.year_section || '_______________'}</span>
              </div>
              <div>
                <span>Description: </span>
                <span style={{ textDecoration: 'underline' }}>{tos.description || '_______________'}</span>
              </div>
              <div>
                <span>Course: </span>
                <span style={{ textDecoration: 'underline' }}>{tos.course || '_______________'}</span>
              </div>
            </div>

            {/* TOS Table */}
            <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'auto', marginTop: '8px' }}>
              <thead>
                {/* Header row 1: grouping */}
                <tr>
                  <th rowSpan={2} style={{ border: '1.5px solid #000', padding: '4px 6px', backgroundColor: '#e8f5e9', fontWeight: 'bold', fontSize: '9.5pt', minWidth: '120px' }}>
                    TOPIC
                  </th>
                  <th rowSpan={2} style={{ border: '1.5px solid #000', padding: '4px 6px', backgroundColor: '#e8f5e9', fontWeight: 'bold', fontSize: '9.5pt' }}>
                    NO. OF<br />HOURS
                  </th>
                  <th rowSpan={2} style={{ border: '1.5px solid #000', padding: '4px 6px', backgroundColor: '#e8f5e9', fontWeight: 'bold', fontSize: '9.5pt' }}>
                    PERCENTAGE
                  </th>
                  <th colSpan={6} style={{ border: '1.5px solid #000', padding: '4px 6px', backgroundColor: '#e8f5e9', fontWeight: 'bold', fontSize: '10pt' }}>
                    COGNITIVE DOMAINS
                  </th>
                  <th rowSpan={2} style={{ border: '1.5px solid #000', padding: '4px 6px', backgroundColor: '#e8f5e9', fontWeight: 'bold', fontSize: '9.5pt' }}>
                    ITEM<br />PLACEMENT
                  </th>
                  <th rowSpan={2} style={{ border: '1.5px solid #000', padding: '4px 6px', backgroundColor: '#e8f5e9', fontWeight: 'bold', fontSize: '9.5pt' }}>
                    TOTAL
                  </th>
                </tr>
                {/* Header row 2: difficulty levels */}
                <tr>
                  <th colSpan={2} style={{ border: '1.5px solid #000', padding: '3px 4px', backgroundColor: '#e8f5e9', fontWeight: 'bold', fontSize: '8.5pt' }}>
                    EASY (30%)
                  </th>
                  <th colSpan={2} style={{ border: '1.5px solid #000', padding: '3px 4px', backgroundColor: '#e8f5e9', fontWeight: 'bold', fontSize: '8.5pt' }}>
                    AVERAGE (40%)
                  </th>
                  <th colSpan={2} style={{ border: '1.5px solid #000', padding: '3px 4px', backgroundColor: '#e8f5e9', fontWeight: 'bold', fontSize: '8.5pt' }}>
                    DIFFICULT (30%)
                  </th>
                </tr>
                {/* Header row 3: bloom levels */}
                <tr>
                  <th colSpan={3} style={{ border: '1.5px solid #000', padding: '0', backgroundColor: '#e8f5e9' }}></th>
                  <th style={{ border: '1.5px solid #000', padding: '3px 4px', backgroundColor: '#e8f5e9', fontWeight: 'bold', fontSize: '8pt' }}>
                    Remembering<br />(15%)
                  </th>
                  <th style={{ border: '1.5px solid #000', padding: '3px 4px', backgroundColor: '#e8f5e9', fontWeight: 'bold', fontSize: '8pt' }}>
                    Understanding<br />(15%)
                  </th>
                  <th style={{ border: '1.5px solid #000', padding: '3px 4px', backgroundColor: '#e8f5e9', fontWeight: 'bold', fontSize: '8pt' }}>
                    Applying<br />(20%)
                  </th>
                  <th style={{ border: '1.5px solid #000', padding: '3px 4px', backgroundColor: '#e8f5e9', fontWeight: 'bold', fontSize: '8pt' }}>
                    Analyzing<br />(20%)
                  </th>
                  <th style={{ border: '1.5px solid #000', padding: '3px 4px', backgroundColor: '#e8f5e9', fontWeight: 'bold', fontSize: '8pt' }}>
                    Evaluating<br />(15%)
                  </th>
                  <th style={{ border: '1.5px solid #000', padding: '3px 4px', backgroundColor: '#e8f5e9', fontWeight: 'bold', fontSize: '8pt' }}>
                    Creating<br />(15%)
                  </th>
                  <th colSpan={2} style={{ border: '1.5px solid #000', padding: '0', backgroundColor: '#e8f5e9' }}></th>
                </tr>
              </thead>
              <tbody>
                {topicRows.map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ border: '1.5px solid #000', padding: '5px 8px', textAlign: 'left', fontSize: '9.5pt', verticalAlign: 'middle' }}>
                      {row.topic}
                    </td>
                    <td style={{ border: '1.5px solid #000', padding: '4px 6px', textAlign: 'center', fontSize: '9.5pt', verticalAlign: 'middle' }}>
                      {row.hours} hours
                    </td>
                    <td style={{ border: '1.5px solid #000', padding: '4px 6px', textAlign: 'center', fontSize: '9.5pt', verticalAlign: 'middle' }}>
                      {row.percentage}%
                    </td>
                    {/* Bloom cells with count + item numbers */}
                    {(['remembering', 'understanding', 'applying', 'analyzing', 'evaluating', 'creating'] as const).map(level => (
                      <td key={level} style={{ border: '1.5px solid #000', padding: '4px 5px', textAlign: 'center', fontSize: '9.5pt', verticalAlign: 'middle' }}>
                        {row[level].count}
                        <span style={{ display: 'block', fontSize: '7.5pt', color: '#333' }}>
                          {formatItems(row[level].items)}
                        </span>
                      </td>
                    ))}
                    <td style={{ border: '1.5px solid #000', padding: '4px 6px', textAlign: 'center', fontSize: '9.5pt', fontWeight: 'bold', verticalAlign: 'middle' }}>
                      I
                    </td>
                    <td style={{ border: '1.5px solid #000', padding: '4px 6px', textAlign: 'center', fontSize: '10pt', fontWeight: 'bold', verticalAlign: 'middle' }}>
                      {row.total}
                    </td>
                  </tr>
                ))}
                {/* Totals row */}
                <tr style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                  <td style={{ border: '1.5px solid #000', padding: '5px 8px', textAlign: 'left', fontSize: '10pt', fontWeight: 'bold' }}>
                    TOTAL
                  </td>
                  <td style={{ border: '1.5px solid #000', padding: '4px 6px', textAlign: 'center', fontSize: '10pt', fontWeight: 'bold' }}>
                    {totals.hours}
                  </td>
                  <td style={{ border: '1.5px solid #000', padding: '4px 6px', textAlign: 'center', fontSize: '10pt', fontWeight: 'bold' }}>
                    100%
                  </td>
                  <td style={{ border: '1.5px solid #000', padding: '4px 6px', textAlign: 'center', fontSize: '10pt', fontWeight: 'bold' }}>{totals.remembering}</td>
                  <td style={{ border: '1.5px solid #000', padding: '4px 6px', textAlign: 'center', fontSize: '10pt', fontWeight: 'bold' }}>{totals.understanding}</td>
                  <td style={{ border: '1.5px solid #000', padding: '4px 6px', textAlign: 'center', fontSize: '10pt', fontWeight: 'bold' }}>{totals.applying}</td>
                  <td style={{ border: '1.5px solid #000', padding: '4px 6px', textAlign: 'center', fontSize: '10pt', fontWeight: 'bold' }}>{totals.analyzing}</td>
                  <td style={{ border: '1.5px solid #000', padding: '4px 6px', textAlign: 'center', fontSize: '10pt', fontWeight: 'bold' }}>{totals.evaluating}</td>
                  <td style={{ border: '1.5px solid #000', padding: '4px 6px', textAlign: 'center', fontSize: '10pt', fontWeight: 'bold' }}>{totals.creating}</td>
                  <td style={{ border: '1.5px solid #000', padding: '4px 6px', textAlign: 'center', fontSize: '10pt' }}></td>
                  <td style={{ border: '1.5px solid #000', padding: '4px 6px', textAlign: 'center', fontSize: '10pt', fontWeight: 'bold' }}>{totals.total}</td>
                </tr>
              </tbody>
            </table>

            {/* Signature section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px' }}>
              <div style={{ textAlign: 'center', width: '40%' }}>
                <div style={{ borderTop: '1px solid #000', marginTop: '30px', paddingTop: '4px', fontWeight: 'bold' }}>
                  {tos.prepared_by || '________________________'}
                </div>
                <div style={{ fontSize: '9pt', color: '#555' }}>Prepared by</div>
              </div>
              <div style={{ textAlign: 'center', width: '40%' }}>
                <div style={{ borderTop: '1px solid #000', marginTop: '30px', paddingTop: '4px', fontWeight: 'bold' }}>
                  {tos.noted_by || '________________________'}
                </div>
                <div style={{ fontSize: '9pt', color: '#555' }}>Noted by</div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
