import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Printer, Key } from 'lucide-react';
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from 'sonner';

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  topic: string;
  bloom_level: string;
  difficulty: string;
  choices?: Record<string, string>;
  correct_answer?: string;
}

interface TestVersion {
  version_label: string;
  questions: Question[];
  answer_key: Record<string, string>;
  total_points: number;
}

interface TestVersionAnswerKeyProps {
  version: TestVersion;
  testTitle: string;
  subject: string;
  onClose?: () => void;
}

export const TestVersionAnswerKey: React.FC<TestVersionAnswerKeyProps> = ({
  version,
  testTitle,
  subject,
  onClose
}) => {
  const handleDownloadPDF = async () => {
    try {
      const element = document.getElementById(`answer-key-${version.version_label}`);
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

      const filename = `${testTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_answer_key_version_${version.version_label}.pdf`;
      pdf.save(filename);
      
      toast.success(`Answer key for Version ${version.version_label} downloaded successfully`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const handlePrint = () => {
    const element = document.getElementById(`answer-key-${version.version_label}`);
    if (element) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>${testTitle} - Answer Key Version ${version.version_label}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
                .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
                .question { margin-bottom: 15px; page-break-inside: avoid; }
                .answer-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                .answer-table th, .answer-table td { border: 1px solid #000; padding: 8px; text-align: center; }
                .answer-table th { background-color: #f0f0f0; }
                @media print { .no-print { display: none; } }
              </style>
            </head>
            <body>
              ${element.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
        printWindow.close();
      }
    }
  };

  const getQuestionStats = () => {
    const stats = {
      total: version.questions.length,
      byType: {} as Record<string, number>,
      byDifficulty: {} as Record<string, number>,
      byTopic: {} as Record<string, number>
    };

    version.questions.forEach(question => {
      // Count by type
      stats.byType[question.question_type] = (stats.byType[question.question_type] || 0) + 1;
      
      // Count by difficulty
      stats.byDifficulty[question.difficulty] = (stats.byDifficulty[question.difficulty] || 0) + 1;
      
      // Count by topic
      stats.byTopic[question.topic] = (stats.byTopic[question.topic] || 0) + 1;
    });

    return stats;
  };

  const stats = getQuestionStats();

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex gap-2 print:hidden">
        <Button onClick={handleDownloadPDF} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </Button>
        <Button onClick={handlePrint} variant="outline">
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
        {onClose && (
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        )}
      </div>

      {/* Answer Key Document */}
      <Card id={`answer-key-${version.version_label}`} className="print:shadow-none print:border-none">
        <CardHeader className="text-center border-b">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">ANSWER KEY</h1>
            <h2 className="text-xl">{testTitle} - Version {version.version_label}</h2>
            <h3 className="text-lg">{subject}</h3>
            <div className="text-sm text-muted-foreground">
              Generated on {new Date().toLocaleDateString()}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          {/* Quick Reference Answer Grid */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Key className="w-5 h-5" />
              Quick Reference Answer Key
            </h3>
            <div className="grid grid-cols-5 md:grid-cols-10 gap-2 text-sm">
              {version.questions.map((question, index) => (
                <div key={question.id} className="text-center p-2 border rounded">
                  <div className="font-medium">{index + 1}</div>
                  <div className="text-xs text-muted-foreground">
                    {question.correct_answer || 'Essay'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Answer Key */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Detailed Answer Key</h3>
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Q#</TableHead>
                  <TableHead>Question</TableHead>
                  <TableHead className="w-24">Type</TableHead>
                  <TableHead className="w-24">Answer</TableHead>
                  <TableHead className="w-20">Points</TableHead>
                  <TableHead className="w-24">Difficulty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {version.questions.map((question, index) => (
                  <TableRow key={question.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{question.question_text}</p>
                        <div className="flex gap-1">
                          <Badge variant="outline" className="text-xs">{question.topic}</Badge>
                          <Badge variant="outline" className="text-xs">{question.bloom_level}</Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {question.question_type === 'mcq' ? 'MCQ' : 
                         question.question_type === 'true_false' ? 'T/F' : 
                         question.question_type === 'essay' ? 'Essay' : 'Short'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {question.correct_answer ? (
                        <Badge variant="default" className="font-bold">
                          {question.correct_answer}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          See Rubric
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">1</TableCell>
                    <TableCell>
                      <Badge 
                        variant={question.difficulty === 'easy' ? 'secondary' : 
                                question.difficulty === 'average' ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {question.difficulty}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Answer Choices for MCQ Questions */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Multiple Choice Answer Details</h3>
            <div className="space-y-4">
              {version.questions
                .filter(q => q.question_type === 'mcq' && q.choices)
                .map((question, index) => (
                  <Card key={question.id} className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          Q{version.questions.findIndex(q => q.id === question.id) + 1}:
                        </span>
                        <Badge variant="default" className="font-bold">
                          Answer: {question.correct_answer}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        {Object.entries(question.choices!).map(([key, value]) => (
                          <div 
                            key={key} 
                            className={`p-2 rounded ${question.correct_answer === key ? 'bg-green-100 border border-green-300' : 'bg-gray-50'}`}
                          >
                            <span className="font-medium">{key}.</span> {value as string}
                            {question.correct_answer === key && (
                              <span className="ml-2 text-green-600 font-bold">✓ CORRECT</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                ))}
            </div>
          </div>

          {/* Test Statistics */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Test Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4">
                <h4 className="font-medium mb-2">Question Types</h4>
                <div className="space-y-1 text-sm">
                  {Object.entries(stats.byType).map(([type, count]) => (
                    <div key={type} className="flex justify-between">
                      <span className="capitalize">{type.replace('_', ' ')}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-4">
                <h4 className="font-medium mb-2">Difficulty Levels</h4>
                <div className="space-y-1 text-sm">
                  {Object.entries(stats.byDifficulty).map(([difficulty, count]) => (
                    <div key={difficulty} className="flex justify-between">
                      <span className="capitalize">{difficulty}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-4">
                <h4 className="font-medium mb-2">Topics</h4>
                <div className="space-y-1 text-sm">
                  {Object.entries(stats.byTopic).map(([topic, count]) => (
                    <div key={topic} className="flex justify-between">
                      <span className="text-xs">{topic.substring(0, 15)}...</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>

          {/* Grading Notes */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <h4 className="font-semibold text-blue-800 mb-2">Grading Notes for Version {version.version_label}</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• This answer key is specific to Version {version.version_label}</li>
                <li>• Answer choices may be in different order than other versions</li>
                <li>• Essay questions require rubric-based evaluation</li>
                <li>• Total possible points: {version.total_points}</li>
                <li>• Verify student version letter before grading</li>
              </ul>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};