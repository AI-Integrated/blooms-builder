import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TestItem {
  id?: string | number;
  question?: string;
  question_text?: string;
  type?: string;
  question_type?: string;
  options?: string[];
  choices?: Record<string, string> | string[];
  correctAnswer?: string | number;
  correct_answer?: string | number;
  points?: number;
  difficulty?: string;
  bloom_level?: string;
  topic?: string;
}

interface ExamPrintViewProps {
  test: {
    title?: string;
    subject?: string;
    course?: string;
    year_section?: string;
    exam_period?: string;
    school_year?: string;
    instructions?: string;
    time_limit?: number;
    items?: TestItem[];
    version_label?: string;
  };
  showAnswerKey?: boolean;
}

export function ExamPrintView({ test, showAnswerKey = true }: ExamPrintViewProps) {
  const [institution, setInstitution] = useState<string>('');

  useEffect(() => {
    const fetchInstitution = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('institution')
          .eq('id', user.id)
          .single();
        if (data?.institution) {
          setInstitution(data.institution);
        }
      }
    };
    fetchInstitution();
  }, []);

  const items: TestItem[] = Array.isArray(test.items) ? test.items : [];

  // Group questions by type
  const grouped = {
    mcq: [] as TestItem[],
    true_false: [] as TestItem[],
    short_answer: [] as TestItem[],
    essay: [] as TestItem[],
    other: [] as TestItem[]
  };

  items.forEach(q => {
    const type = (q.question_type || q.type || '').toLowerCase();
    if (type === 'mcq' || type === 'multiple-choice' || type === 'multiple_choice') {
      grouped.mcq.push(q);
    } else if (type === 'true_false' || type === 'true-false' || type === 'truefalse') {
      grouped.true_false.push(q);
    } else if (type === 'short_answer' || type === 'fill-blank' || type === 'fill_blank' || type === 'identification') {
      grouped.short_answer.push(q);
    } else if (type === 'essay') {
      grouped.essay.push(q);
    } else {
      grouped.other.push(q);
    }
  });

  const getQuestionText = (item: TestItem): string => {
    return item.question_text || item.question || '';
  };

  const getCorrectAnswer = (item: TestItem): string | number | undefined => {
    return item.correct_answer ?? item.correctAnswer;
  };

  const getMCQOptions = (item: TestItem): { key: string; text: string }[] => {
    const choices = item.choices || item.options;
    if (!choices) return [];
    
    if (typeof choices === 'object' && !Array.isArray(choices)) {
      return ['A', 'B', 'C', 'D']
        .filter(key => choices[key])
        .map(key => ({ key, text: choices[key] as string }));
    }
    
    if (Array.isArray(choices)) {
      return choices.map((text, idx) => ({
        key: String.fromCharCode(65 + idx),
        text: String(text)
      }));
    }
    
    return [];
  };

  let questionNumber = 1;

  // Build answer key
  const answerKeyData: { num: number; answer: string; type: string }[] = [];
  let keyNum = 1;
  for (const section of [grouped.mcq, grouped.true_false, grouped.short_answer, grouped.essay, grouped.other]) {
    for (const question of section) {
      const correctAnswer = getCorrectAnswer(question);
      const questionType = (question.question_type || question.type || '').toLowerCase();
      
      let answer = '';
      if (questionType === 'mcq' || questionType === 'multiple-choice' || questionType === 'multiple_choice') {
        if (typeof correctAnswer === 'number') {
          answer = String.fromCharCode(65 + correctAnswer);
        } else if (typeof correctAnswer === 'string' && /^[A-Da-d]$/.test(correctAnswer)) {
          answer = correctAnswer.toUpperCase();
        } else {
          answer = String(correctAnswer || '').substring(0, 20);
        }
      } else if (questionType === 'true_false' || questionType === 'true-false' || questionType === 'truefalse') {
        answer = String(correctAnswer || '').toLowerCase() === 'true' ? 'True' : 'False';
      } else if (correctAnswer) {
        answer = String(correctAnswer).substring(0, 30) + (String(correctAnswer).length > 30 ? '...' : '');
      } else {
        answer = 'See rubric';
      }
      
      answerKeyData.push({ num: keyNum, answer, type: questionType });
      keyNum++;
    }
  }

  const renderSection = (title: string, instruction: string, questions: TestItem[], sectionType: string) => {
    if (questions.length === 0) return null;
    
    return (
      <div className="exam-section">
        <div className="section-header">
          <h2>{title} <span className="section-points">({questions.length} items)</span></h2>
          <p className="section-instruction">{instruction}</p>
        </div>
        
        {questions.map((item, idx) => {
          const qText = getQuestionText(item);
          const options = getMCQOptions(item);
          const currentNum = questionNumber++;
          
          return (
            <div key={item.id || idx} className="exam-question">
              <p>
                <span className="question-number">{currentNum}.</span>
                <span className="question-text">{qText}</span>
              </p>
              
              {sectionType === 'mcq' && options.length > 0 && (
                <div className="mcq-options">
                  {options.map((opt) => (
                    <div key={opt.key} className="mcq-option">
                      <span className="option-letter">{opt.key}.</span>
                      <span className="option-text">{opt.text}</span>
                    </div>
                  ))}
                </div>
              )}
              
              {sectionType === 'true_false' && (
                <div className="mcq-options">
                  <div className="mcq-option">
                    <span className="option-letter">___</span>
                    <span className="option-text">True / False</span>
                  </div>
                </div>
              )}
              
              {sectionType === 'short_answer' && (
                <div style={{ marginLeft: '20pt', marginTop: '4pt' }}>
                  <span>Answer: </span>
                  <span className="short-answer-line"></span>
                </div>
              )}
              
              {sectionType === 'essay' && (
                <div className="essay-answer-space">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="essay-lines"></div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="print-exam-only">
      {/* Exam Header */}
      <div className="exam-header">
        {institution && <div className="institution-name">{institution}</div>}
        <div className="exam-title">{test.title || 'Examination'}</div>
        <div className="exam-meta">
          {test.subject && <span>{test.subject}</span>}
          {test.course && <span>{test.course}</span>}
          {test.exam_period && <span>{test.exam_period}</span>}
          {test.school_year && <span>S.Y. {test.school_year}</span>}
          {test.version_label && <span>Version {test.version_label}</span>}
        </div>
      </div>

      {/* Student Info Section */}
      <div className="student-info-section">
        <div className="student-info-field">
          <span className="field-label">Name:</span>
          <span className="field-line"></span>
        </div>
        <div className="student-info-field">
          <span className="field-label">Date:</span>
          <span className="field-line"></span>
        </div>
        <div className="student-info-field">
          <span className="field-label">Section:</span>
          <span className="field-line"></span>
        </div>
        <div className="student-info-field">
          <span className="field-label">Score:</span>
          <span className="field-line"></span>
          <span style={{ marginLeft: '4pt' }}>/ {items.length}</span>
        </div>
      </div>

      {/* Exam Summary */}
      <div className="exam-summary">
        <span>Total Questions: {items.length}</span>
        <span>Total Points: {items.reduce((sum, item) => sum + (item.points || 1), 0)}</span>
        {test.time_limit && <span>Time Limit: {test.time_limit} minutes</span>}
      </div>

      {/* General Instructions */}
      {test.instructions && (
        <div className="general-instructions">
          <h3>Instructions</h3>
          <p>{test.instructions}</p>
        </div>
      )}

      {/* Questions by Section */}
      {renderSection('Section A: Multiple Choice', 'Choose the letter of the best answer.', grouped.mcq, 'mcq')}
      {renderSection('Section B: True or False', 'Write TRUE if the statement is correct, FALSE if incorrect.', grouped.true_false, 'true_false')}
      {renderSection('Section C: Identification / Fill in the Blank', 'Write the correct answer on the blank provided.', grouped.short_answer, 'short_answer')}
      {renderSection('Section D: Essay', 'Answer the following questions in complete sentences.', grouped.essay, 'essay')}
      {renderSection('Section E: Other', 'Answer the following questions.', grouped.other, 'other')}

      {/* Answer Key */}
      {showAnswerKey && (
        <div className="answer-key-section">
          <h2>Answer Key</h2>
          <p style={{ textAlign: 'center', marginBottom: '12pt', fontSize: '10pt' }}>
            {test.title} {test.version_label && `- Version ${test.version_label}`}
          </p>
          <div className="answer-key-grid">
            {answerKeyData.map((item) => (
              <div key={item.num} className="answer-key-item">
                <span className="key-number">{item.num}.</span>
                <span className="key-answer">{item.answer}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
