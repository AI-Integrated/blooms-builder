import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Printer } from "lucide-react";
import { PDFExporter } from "@/utils/exportPdf";
import { toast } from "sonner";
import { CanonicalTOSMatrix, BloomLevel } from "@/utils/tosCalculator";
import { supabase } from "@/integrations/supabase/client";

interface TOSMatrixProps {
  data: CanonicalTOSMatrix;
}

export const TOSMatrix = ({ data }: TOSMatrixProps) => {
  const { distribution, total_hours, bloom_totals } = data;
  const [institution, setInstitution] = useState<string | null>(null);

  useEffect(() => {
    const fetchInstitution = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('institution')
            .eq('id', user.id)
            .single();
          if (profile?.institution) setInstitution(profile.institution);
        }
      } catch (error) {
        console.error('Error fetching institution:', error);
      }
    };
    fetchInstitution();
  }, []);

  const bloomLevels: { key: BloomLevel; label: string; difficulty: string; pct: string }[] = [
    { key: 'remembering', label: 'Remembering', difficulty: 'Easy', pct: '15%' },
    { key: 'understanding', label: 'Understanding', difficulty: 'Easy', pct: '15%' },
    { key: 'applying', label: 'Applying', difficulty: 'Average', pct: '20%' },
    { key: 'analyzing', label: 'Analyzing', difficulty: 'Average', pct: '20%' },
    { key: 'evaluating', label: 'Evaluating', difficulty: 'Difficult', pct: '15%' },
    { key: 'creating', label: 'Creating', difficulty: 'Difficult', pct: '15%' },
  ];

  const getTopicTotal = (topic: string) => distribution[topic]?.total || 0;

  const formatItemNumbers = (items: number[]) => {
    if (items.length === 0) return "-";
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
    const first = allItems[0];
    const last = allItems[allItems.length - 1];
    return `(${first}-${last})`;
  };

  const exportToPDF = async () => {
    try {
      const result = await PDFExporter.exportTOSMatrix(data.id, true);
      const filename = `TOS_${data.subject_no}_${data.exam_period}.pdf`;
      PDFExporter.downloadBlob(result.blob, filename);
      toast.success("TOS matrix exported successfully!");
    } catch (error) {
      toast.error("Failed to export PDF");
      console.error("Export error:", error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const actualTotal = Object.values(distribution).reduce((sum, t) => sum + t.total, 0);

  return (
    <div className="space-y-6">
      {/* Action Buttons - hidden in print */}
      <div className="flex gap-2 print:hidden">
        <Button onClick={exportToPDF} variant="default">
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
        <Button onClick={handlePrint} variant="outline">
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
      </div>

      {/* Printable TOS Document */}
      <Card id="tos-matrix-export" className="print:shadow-none print:border-none bg-white text-black">
        <CardContent className="p-6 print:p-4">
          {/* Title */}
          <div className="text-center mb-6 print:mb-4">
            {institution && <h2 className="text-lg font-bold uppercase">{institution}</h2>}
            <h1 className="text-xl font-bold uppercase tracking-wide">TWO-WAY TABLE OF SPECIFICATION</h1>
          </div>

          {/* Course Information - two column layout */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 mb-6 print:mb-4 text-sm">
            <div><strong>Subject No.:</strong> {data.subject_no}</div>
            <div><strong>Examination Period:</strong> {data.exam_period}</div>
            <div><strong>Description:</strong> {data.description}</div>
            <div><strong>Year and Section:</strong> {data.year_section}</div>
            <div><strong>Course:</strong> {data.course}</div>
            <div><strong>School Year:</strong> {data.school_year}</div>
          </div>

          {/* Official TOS Table */}
          <div className="border-2 border-black">
            <table className="w-full border-collapse text-xs">
              <thead>
                {/* Row 1: Main headers + COGNITIVE DOMAINS spanning 6 cols */}
                <tr className="bg-muted/40">
                  <th rowSpan={3} className="border border-black p-2 font-bold text-center align-middle min-w-[160px]">
                    TOPIC
                  </th>
                  <th rowSpan={3} className="border border-black p-2 font-bold text-center align-middle w-16">
                    NO. OF<br/>HOURS
                  </th>
                  <th rowSpan={3} className="border border-black p-2 font-bold text-center align-middle w-16">
                    PERCENTAGE
                  </th>
                  <th colSpan={6} className="border border-black p-2 font-bold text-center">
                    COGNITIVE DOMAINS
                  </th>
                  <th rowSpan={3} className="border border-black p-2 font-bold text-center align-middle w-20">
                    ITEM<br/>PLACEMENT
                  </th>
                  <th rowSpan={3} className="border border-black p-2 font-bold text-center align-middle w-16">
                    TOTAL
                  </th>
                </tr>
                {/* Row 2: Difficulty groups */}
                <tr className="bg-muted/40">
                  <th colSpan={2} className="border border-black p-1 font-bold text-center text-[10px]">EASY (30%)</th>
                  <th colSpan={2} className="border border-black p-1 font-bold text-center text-[10px]">AVERAGE (40%)</th>
                  <th colSpan={2} className="border border-black p-1 font-bold text-center text-[10px]">DIFFICULT (30%)</th>
                </tr>
                {/* Row 3: Individual bloom levels with percentages */}
                <tr className="bg-muted/40">
                  {bloomLevels.map((level) => (
                    <th key={level.key} className="border border-black p-1 font-bold text-center text-[10px] w-16">
                      {level.label}<br/>({level.pct})
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.topics.map((topic) => {
                  const topicName = topic.topic;
                  const topicDist = distribution[topicName];
                  const percentage = topicDist?.percentage || 0;
                  const topicTotal = getTopicTotal(topicName);

                  return (
                    <tr key={topicName}>
                      <td className="border border-black p-2 font-medium">{topicName}</td>
                      <td className="border border-black p-2 text-center">{topic.hours} hours</td>
                      <td className="border border-black p-2 text-center">{percentage}%</td>
                      {bloomLevels.map((level) => {
                        const bloomData = topicDist?.[level.key];
                        const items = bloomData?.items || [];
                        const count = bloomData?.count || 0;
                        return (
                          <td key={level.key} className="border border-black p-1 text-center text-[10px]">
                            <div className="font-semibold">{count > 0 ? count : "-"}</div>
                            {count > 0 && (
                              <div className="text-[9px] text-muted-foreground">{formatItemNumbers(items)}</div>
                            )}
                          </td>
                        );
                      })}
                      <td className="border border-black p-2 text-center text-[10px] font-semibold">
                        {formatItemPlacement(topicName)}
                      </td>
                      <td className="border border-black p-2 text-center font-bold">{topicTotal}</td>
                    </tr>
                  );
                })}

                {/* Total Row */}
                <tr className="bg-muted/50 font-bold">
                  <td className="border border-black p-2 font-bold">TOTAL</td>
                  <td className="border border-black p-2 text-center">{total_hours}</td>
                  <td className="border border-black p-2 text-center">100%</td>
                  {bloomLevels.map((level) => (
                    <td key={level.key} className="border border-black p-2 text-center font-bold">
                      {bloom_totals[level.key]}
                    </td>
                  ))}
                  <td className="border border-black p-2 text-center font-bold">1-{data.total_items}</td>
                  <td className="border border-black p-2 text-center font-bold text-base">{actualTotal}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Signature Section */}
          <div className="mt-8 grid grid-cols-2 gap-8 print:mt-6">
            <div>
              <p className="mb-12">Prepared by:</p>
              <div className="border-b border-black w-56 mb-1 mx-auto" />
              <p className="text-center font-bold">{data.prepared_by || ""}</p>
            </div>
            <div>
              <p className="mb-12">Noted by:</p>
              <div className="border-b border-black w-56 mb-1 mx-auto" />
              <p className="text-center font-bold">{data.noted_by || ""}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
