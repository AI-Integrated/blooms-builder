import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Printer, Download, X, FileText } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface Criterion {
  name: string;
  description: string;
  points: number;
}

interface PerformanceLevel {
  level: string;
  description: string;
  percentage: number;
}

interface Rubric {
  id: string;
  title: string;
  description?: string;
  subject: string;
  grade_level?: string;
  total_points: number;
  criteria: Criterion[];
  performance_levels: PerformanceLevel[];
  created_by: string;
  created_at: string;
}

interface RubricPrintoutProps {
  rubric: Rubric;
  onClose: () => void;
}

export const RubricPrintout = ({ rubric, onClose }: RubricPrintoutProps) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    try {
      const element = document.getElementById('rubric-printout');
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210;
      const pageHeight = 295;
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

      pdf.save(`${rubric.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_rubric.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const getPointsForLevel = (criterion: Criterion, level: PerformanceLevel) => {
    return Math.round((criterion.points * level.percentage) / 100);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Rubric Printout
          </DialogTitle>
          <div className="flex gap-2">
            <Button onClick={handlePrint} variant="outline" size="sm">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button 
              onClick={handleDownloadPDF} 
              variant="outline" 
              size="sm"
              disabled={isGenerating}
            >
              <Download className="w-4 h-4 mr-2" />
              {isGenerating ? "Generating..." : "Download PDF"}
            </Button>
            <Button onClick={onClose} variant="outline" size="sm">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div id="rubric-printout" className="bg-white text-black p-8 print:p-0">
          {/* Header */}
          <div className="text-center mb-8 border-b-2 border-gray-300 pb-6">
            <h1 className="text-3xl font-bold mb-2">{rubric.title}</h1>
            {rubric.description && (
              <p className="text-lg text-gray-600 mb-4">{rubric.description}</p>
            )}
            <div className="flex justify-center gap-4 text-sm">
              <span><strong>Subject:</strong> {rubric.subject}</span>
              {rubric.grade_level && (
                <span><strong>Grade Level:</strong> {rubric.grade_level}</span>
              )}
              <span><strong>Total Points:</strong> {rubric.total_points}</span>
            </div>
          </div>

          {/* Performance Levels Legend */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Performance Levels</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {rubric.performance_levels.map((level, index) => (
                <div key={index} className="border border-gray-300 rounded p-3 text-center">
                  <div className="font-semibold text-lg">{level.level}</div>
                  <div className="text-sm text-gray-600">{level.percentage}%</div>
                  <div className="text-xs text-gray-500 mt-1">{level.description}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Rubric Matrix */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Evaluation Matrix</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-3 text-left font-semibold">
                      Criteria
                    </th>
                    {rubric.performance_levels.map((level, index) => (
                      <th key={index} className="border border-gray-300 p-3 text-center font-semibold min-w-[120px]">
                        {level.level}<br />
                        <span className="text-sm font-normal">({level.percentage}%)</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rubric.criteria.map((criterion, criterionIndex) => (
                    <tr key={criterionIndex} className={criterionIndex % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                      <td className="border border-gray-300 p-4 align-top">
                        <div className="font-semibold text-base mb-2">{criterion.name}</div>
                        <div className="text-sm text-gray-600 mb-2">{criterion.description}</div>
                        <div className="text-sm font-medium">Max Points: {criterion.points}</div>
                      </td>
                      {rubric.performance_levels.map((level, levelIndex) => (
                        <td key={levelIndex} className="border border-gray-300 p-4 align-top text-center">
                          <div className="font-semibold text-lg mb-2">
                            {getPointsForLevel(criterion, level)} pts
                          </div>
                          <div className="text-xs text-gray-500">
                            {level.description}
                          </div>
                          {/* Space for teacher comments */}
                          <div className="mt-4 border-t border-gray-200 pt-2">
                            <div className="text-xs text-gray-400 mb-1">Comments:</div>
                            <div className="h-8 border border-gray-200 rounded bg-gray-50"></div>
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Score Summary */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Score Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-gray-300 rounded p-4">
                <h3 className="font-semibold mb-3">Individual Scores</h3>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2">Criteria</th>
                      <th className="text-center py-2">Points Earned</th>
                      <th className="text-center py-2">Max Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rubric.criteria.map((criterion, index) => (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="py-2 text-sm">{criterion.name}</td>
                        <td className="py-2 text-center border border-gray-200 bg-gray-50 w-16">___</td>
                        <td className="py-2 text-center">{criterion.points}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-gray-300 font-semibold">
                      <td className="py-2">Total</td>
                      <td className="py-2 text-center border-2 border-gray-300 bg-yellow-50 w-16">___</td>
                      <td className="py-2 text-center">{rubric.total_points}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="border border-gray-300 rounded p-4">
                <h3 className="font-semibold mb-3">Grade Calculation</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span>Total Points Earned:</span>
                    <span className="border border-gray-300 px-3 py-1 bg-gray-50 min-w-[60px] text-center">___</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span>Total Possible Points:</span>
                    <span className="px-3 py-1">{rubric.total_points}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span>Percentage:</span>
                    <span className="border border-gray-300 px-3 py-1 bg-gray-50 min-w-[60px] text-center">___%</span>
                  </div>
                  <div className="flex justify-between items-center py-2 font-semibold text-lg">
                    <span>Letter Grade:</span>
                    <span className="border-2 border-gray-300 px-3 py-1 bg-yellow-50 min-w-[60px] text-center">___</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Overall Comments Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Overall Comments</h2>
            <div className="border border-gray-300 rounded p-4 bg-gray-50">
              <div className="text-sm text-gray-600 mb-2">Teacher Comments:</div>
              <div className="h-24 border border-gray-200 rounded bg-white p-2"></div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-sm text-gray-500 border-t border-gray-300 pt-4">
            <div>Student Name: _________________________ Date: _____________</div>
            <div className="mt-2">Teacher: _________________________ Class: _____________</div>
            <div className="mt-4">Generated on {new Date().toLocaleDateString()}</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};