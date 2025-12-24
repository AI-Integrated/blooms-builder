import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Printer } from "lucide-react";
import { PDFExporter } from "@/utils/exportPdf";
import { toast } from "sonner";
import { CanonicalTOSMatrix, BloomLevel } from "@/utils/tosCalculator";

interface TOSMatrixProps {
  data: CanonicalTOSMatrix;
}

export const TOSMatrix = ({ data }: TOSMatrixProps) => {
  const { matrix, total_hours, distribution, bloom_totals } = data;

  const bloomLevels: { key: BloomLevel; label: string; difficulty: string }[] = [
    { key: 'remembering', label: 'Remembering', difficulty: 'Easy' },
    { key: 'understanding', label: 'Understanding', difficulty: 'Easy' },
    { key: 'applying', label: 'Applying', difficulty: 'Average' },
    { key: 'analyzing', label: 'Analyzing', difficulty: 'Average' },
    { key: 'evaluating', label: 'Evaluating', difficulty: 'Difficult' },
    { key: 'creating', label: 'Creating', difficulty: 'Difficult' }
  ];

  const getTopicTotal = (topic: string) => {
    return distribution[topic]?.total || 0;
  };

  const formatItemNumbers = (items: number[]) => {
    if (items.length === 0) return "-";
    if (items.length === 1) return items[0].toString();
    
    const sorted = [...items].sort((a, b) => a - b);
    const groups: string[] = [];
    let start = sorted[0];
    let end = sorted[0];
    
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === end + 1) {
        end = sorted[i];
      } else {
        if (start === end) {
          groups.push(start.toString());
        } else if (end - start === 1) {
          groups.push(`${start},${end}`);
        } else {
          groups.push(`${start}-${end}`);
        }
        start = end = sorted[i];
      }
    }
    
    if (start === end) {
      groups.push(start.toString());
    } else if (end - start === 1) {
      groups.push(`${start},${end}`);
    } else {
      groups.push(`${start}-${end}`);
    }
    
    return `(${groups.join(',')})`;
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
    PDFExporter.printElement('tos-matrix-export', `TOS Matrix - ${data.description}`);
  };

  // Calculate actual matrix total for validation display
  const actualTotal = Object.values(distribution).reduce((sum, t) => sum + t.total, 0);

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex gap-2 print:hidden">
        <Button onClick={exportToPDF} variant="academic">
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
        <Button onClick={handlePrint} variant="outline">
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
      </div>

      {/* TOS Matrix Display */}
      <Card id="tos-matrix-export" className="print:shadow-none print:border-none">
        <CardHeader className="text-center border-b">
          <div className="space-y-2">
            <h1 className="text-xl font-bold">AGUSAN DEL SUR STATE COLLEGE OF AGRICULTURE AND TECHNOLOGY</h1>
            <h2 className="text-lg font-semibold">College of Computing and Information Sciences</h2>
            <h3 className="text-lg">TABLE OF SPECIFICATION</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
            <div className="text-left">
              <p><strong>Subject No.:</strong> {data.subject_no}</p>
              <p><strong>Course:</strong> {data.course}</p>
              <p><strong>Subject Description:</strong> {data.description}</p>
            </div>
            <div className="text-left">
              <p><strong>Year & Section:</strong> {data.year_section}</p>
              <p><strong>Examination:</strong> {data.exam_period}</p>
              <p><strong>School Year:</strong> {data.school_year}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead rowSpan={2} className="text-center border border-border font-bold min-w-[200px]">
                    LEARNING COMPETENCIES
                  </TableHead>
                  <TableHead rowSpan={2} className="text-center border border-border font-bold w-16">
                    HOURS
                  </TableHead>
                  <TableHead rowSpan={2} className="text-center border border-border font-bold w-16">
                    %
                  </TableHead>
                  <TableHead colSpan={6} className="text-center border border-border font-bold">
                    BLOOM'S TAXONOMY
                  </TableHead>
                  <TableHead rowSpan={2} className="text-center border border-border font-bold w-16">
                    TOTAL
                  </TableHead>
                  <TableHead rowSpan={2} className="text-center border border-border font-bold w-20">
                    ITEM PLACEMENT
                  </TableHead>
                </TableRow>
                <TableRow>
                  {bloomLevels.map((level) => (
                    <TableHead key={level.key} className="text-center border border-border font-bold text-[10px] w-20">
                      {level.label}
                      <br />
                      <span className="text-[8px] text-muted-foreground">({level.difficulty})</span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topics.map((topic) => {
                  const topicName = topic.topic;
                  const topicDist = distribution[topicName];
                  const percentage = topicDist?.percentage || 0;
                  const topicTotal = getTopicTotal(topicName);
                  
                  return (
                    <TableRow key={topicName}>
                      <TableCell className="border border-border font-medium p-2">
                        {topicName}
                      </TableCell>
                      <TableCell className="border border-border text-center p-2">
                        {topic.hours}
                      </TableCell>
                      <TableCell className="border border-border text-center p-2">
                        {percentage}%
                      </TableCell>
                      {bloomLevels.map((level) => {
                        const bloomData = topicDist?.[level.key];
                        const items = bloomData?.items || [];
                        const count = bloomData?.count || 0;
                        return (
                          <TableCell key={level.key} className="border border-border text-center p-1 text-[10px]">
                            {count > 0 ? count : "-"}
                            <br />
                            <span className="text-[9px] text-muted-foreground">
                              {formatItemNumbers(items)}
                            </span>
                          </TableCell>
                        );
                      })}
                      <TableCell className="border border-border text-center p-2 font-semibold">
                        {topicTotal}
                      </TableCell>
                      <TableCell className="border border-border text-center p-2 text-[10px]">
                        {formatItemNumbers(
                          bloomLevels.flatMap(l => topicDist?.[l.key]?.items || []).sort((a, b) => a - b)
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                
                {/* Totals Row */}
                <TableRow className="bg-muted/50">
                  <TableCell className="border border-border font-bold p-2">TOTAL</TableCell>
                  <TableCell className="border border-border text-center font-bold p-2">
                    {total_hours}
                  </TableCell>
                  <TableCell className="border border-border text-center font-bold p-2">
                    100%
                  </TableCell>
                  {bloomLevels.map((level) => (
                    <TableCell key={level.key} className="border border-border text-center font-bold p-2">
                      {bloom_totals[level.key]}
                    </TableCell>
                  ))}
                  <TableCell className="border border-border text-center font-bold p-2">
                    {actualTotal}
                  </TableCell>
                  <TableCell className="border border-border text-center font-bold p-2">
                    1-{data.total_items}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>

        {/* Signature Section */}
        <div className="p-6 border-t space-y-4">
          <div className="grid grid-cols-2 gap-8">
            <div className="text-center">
              <p className="mb-8">Prepared by:</p>
              <div className="border-b border-black pb-1 mb-2">
                <strong>{data.prepared_by}</strong>
              </div>
              <p className="text-sm"> </p>
            </div>
            <div className="text-center">
              <p className="mb-8">Noted by:</p>
              <div className="border-b border-black pb-1 mb-2">
                <strong>{data.noted_by}</strong>
              </div>
              <p className="text-sm"> </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
