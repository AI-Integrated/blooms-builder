import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Target, FileText } from 'lucide-react';

interface RubricCriterion {
  id: string;
  criterion_name: string;
  description: string;
  max_points: number;
  order_index: number;
}

interface QuestionRubric {
  id: string;
  title: string;
  description: string;
  total_points: number;
  criteria: RubricCriterion[];
}

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  topic: string;
  bloom_level: string;
  difficulty: string;
}

interface RubricAnswerKeyProps {
  question: Question;
  rubric: QuestionRubric;
  questionNumber: number;
}

export const RubricAnswerKey: React.FC<RubricAnswerKeyProps> = ({
  question,
  rubric,
  questionNumber
}) => {
  return (
    <div className="space-y-4 page-break-inside-avoid">
      {/* Question Header */}
      <div className="flex items-start gap-3">
        <span className="font-bold text-lg">{questionNumber}.</span>
        <div className="flex-1">
          <p className="font-medium text-lg mb-2">{question.question_text}</p>
          <div className="flex gap-2 mb-3">
            <Badge variant="outline" className="text-xs">{question.topic}</Badge>
            <Badge variant="outline" className="text-xs">{question.bloom_level}</Badge>
            <Badge variant="outline" className="text-xs">{question.difficulty}</Badge>
            <Badge variant="secondary" className="text-xs">
              {rubric.total_points} points
            </Badge>
          </div>
        </div>
      </div>

      {/* Rubric Details */}
      <Card className="ml-6 border border-gray-300">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="w-4 h-4" />
            {rubric.title}
          </CardTitle>
          {rubric.description && (
            <p className="text-sm text-muted-foreground">{rubric.description}</p>
          )}
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Scoring Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2 text-left font-semibold">
                    Criterion
                  </th>
                  <th className="border border-gray-300 p-2 text-center font-semibold w-20">
                    Max Points
                  </th>
                  <th className="border border-gray-300 p-2 text-center font-semibold w-20">
                    Score
                  </th>
                  <th className="border border-gray-300 p-2 text-left font-semibold">
                    Comments
                  </th>
                </tr>
              </thead>
              <tbody>
                {rubric.criteria.map((criterion, index) => (
                  <tr key={criterion.id} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                    <td className="border border-gray-300 p-3 align-top">
                      <div className="font-medium mb-1">{criterion.criterion_name}</div>
                      <div className="text-xs text-gray-600">{criterion.description}</div>
                    </td>
                    <td className="border border-gray-300 p-3 text-center align-top">
                      {criterion.max_points}
                    </td>
                    <td className="border border-gray-300 p-3 text-center align-top">
                      <div className="w-12 h-8 border border-gray-400 bg-white mx-auto"></div>
                    </td>
                    <td className="border border-gray-300 p-3 align-top">
                      <div className="h-12 border border-gray-200 bg-gray-50 rounded"></div>
                    </td>
                  </tr>
                ))}
                
                {/* Total Row */}
                <tr className="bg-yellow-100 font-semibold">
                  <td className="border border-gray-300 p-3">
                    <strong>TOTAL SCORE</strong>
                  </td>
                  <td className="border border-gray-300 p-3 text-center">
                    {rubric.total_points}
                  </td>
                  <td className="border border-gray-300 p-3 text-center">
                    <div className="w-12 h-8 border-2 border-gray-600 bg-yellow-50 mx-auto"></div>
                  </td>
                  <td className="border border-gray-300 p-3">
                    <div className="text-xs text-gray-600">
                      Percentage: _____ % | Letter Grade: _____
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Scoring Guidelines */}
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <h4 className="font-semibold text-sm mb-2 text-blue-800">Scoring Guidelines:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-blue-700">
              <div>
                <strong>Score Ranges:</strong>
                <ul className="mt-1 space-y-1">
                  <li>• Excellent: 90-100% of max points</li>
                  <li>• Good: 75-89% of max points</li>
                </ul>
              </div>
              <div>
                <ul className="mt-1 space-y-1">
                  <li>• Fair: 60-74% of max points</li>
                  <li>• Poor: Below 60% of max points</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator className="my-6" />
    </div>
  );
};