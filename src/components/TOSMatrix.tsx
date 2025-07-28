import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Printer } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "sonner";

interface TOSMatrixProps {
  data: {
    formData: {
      subjectNo: string;
      course: string;
      subjectDescription: string;
      yearSection: string;
      examPeriod: string;
      schoolYear: string;
      totalItems: number;
      topics: { topic: string; hours: number }[];
    };
    distribution: {
      [topic: string]: {
        remembering: number[];
        understanding: number[];
        applying: number[];
        analyzing: number[];
        evaluating: number[];
        creating: number[];
      };
    };
    totalHours: number;
    createdBy: string;
    createdAt: string;
  };
}

export const TOSMatrix = ({ data }: TOSMatrixProps) => {
  const { formData, distribution, totalHours } = data;

  const bloomLevels = [
    { key: 'remembering', label: 'Remembering', difficulty: 'Easy' },
    { key: 'understanding', label: 'Understanding', difficulty: 'Easy' },
    { key: 'applying', label: 'Applying', difficulty: 'Average' },
    { key: 'analyzing', label: 'Analyzing', difficulty: 'Average' },
    { key: 'evaluating', label: 'Evaluating', difficulty: 'Difficult' },
    { key: 'creating', label: 'Creating', difficulty: 'Difficult' }
  ];

  const getTopicTotal = (topic: string) => {
    return Object.values(distribution[topic]).reduce((sum, items) => sum + items.length, 0);
  };

  const getBloomTotal = (bloomKey: string) => {
    return Object.keys(distribution).reduce((sum, topic) => {
      return sum + distribution[topic][bloomKey as keyof typeof distribution[string]].length;
    }, 0);
  };

  const formatItemNumbers = (items: number[]) => {
    if (items.length === 0) return "-";
    if (items.length === 1) return items[0].toString();
    
    // Group consecutive numbers
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
      const element = document.getElementById('tos-matrix-export');
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape orientation
      
      const imgWidth = 297; // A4 landscape width
      const pageHeight = 210; // A4 landscape height
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`TOS_${formData.subjectNo}_${formData.examPeriod}.pdf`);
      toast.success("TOS matrix exported successfully!");
    } catch (error) {
      toast.error("Failed to export PDF");
      console.error("Export error:", error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

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
              <p><strong>Subject No.:</strong> {formData.subjectNo}</p>
              <p><strong>Course:</strong> {formData.course}</p>
              <p><strong>Subject Description:</strong> {formData.subjectDescription}</p>
            </div>
            <div className="text-left">
              <p><strong>Year & Section:</strong> {formData.yearSection}</p>
              <p><strong>Examination:</strong> {formData.examPeriod}</p>
              <p><strong>School Year:</strong> {formData.schoolYear}</p>
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
                {formData.topics.map((topic) => {
                  const percentage = ((topic.hours / totalHours) * 100).toFixed(1);
                  const topicTotal = getTopicTotal(topic.topic);
                  
                  return (
                    <TableRow key={topic.topic}>
                      <TableCell className="border border-border font-medium p-2">
                        {topic.topic}
                      </TableCell>
                      <TableCell className="border border-border text-center p-2">
                        {topic.hours}
                      </TableCell>
                      <TableCell className="border border-border text-center p-2">
                        {percentage}%
                      </TableCell>
                      {bloomLevels.map((level) => {
                        const items = distribution[topic.topic][level.key as keyof typeof distribution[string]];
                        return (
                          <TableCell key={level.key} className="border border-border text-center p-1 text-[10px]">
                            {items.length > 0 ? items.length : "-"}
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
                          Object.values(distribution[topic.topic]).flat().sort((a, b) => a - b)
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                
                {/* Totals Row */}
                <TableRow className="bg-muted/50">
                  <TableCell className="border border-border font-bold p-2">TOTAL</TableCell>
                  <TableCell className="border border-border text-center font-bold p-2">
                    {totalHours}
                  </TableCell>
                  <TableCell className="border border-border text-center font-bold p-2">
                    100%
                  </TableCell>
                  {bloomLevels.map((level) => (
                    <TableCell key={level.key} className="border border-border text-center font-bold p-2">
                      {getBloomTotal(level.key)}
                    </TableCell>
                  ))}
                  <TableCell className="border border-border text-center font-bold p-2">
                    {formData.totalItems}
                  </TableCell>
                  <TableCell className="border border-border text-center font-bold p-2">
                    1-{formData.totalItems}
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
                <strong>{data.createdBy}</strong>
              </div>
              <p className="text-sm">Faculty</p>
            </div>
            <div className="text-center">
              <p className="mb-8">Noted by:</p>
              <div className="border-b border-black pb-1 mb-2">
                <strong>_________________________</strong>
              </div>
              <p className="text-sm">Dean, CCIS</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};