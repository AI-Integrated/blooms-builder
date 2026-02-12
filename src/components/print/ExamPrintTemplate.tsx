import { useMemo } from "react";

interface TestItem {
  question_text?: string;
  question?: string;
  question_type?: string;
  type?: string;
  choices?: Record<string, string> | string[];
  options?: string[];
  correct_answer?: string | number;
  correctAnswer?: string | number;
  points?: number;
  difficulty?: string;
  bloom_level?: string;
  topic?: string;
}

interface ExamPrintTemplateProps {
  test: {
    title?: string;
    subject?: string;
    course?: string;
    year_section?: string;
    exam_period?: string;
    school_year?: string;
    time_limit?: number;
    instructions?: string;
    items?: TestItem[];
  };
  showAnswerKey?: boolean;
}

interface GroupedQuestions {
  mcq: TestItem[];
  secondary: TestItem[];
  essay: TestItem[];
  secondaryType: 'true_false' | 'short_answer' | null;
}

function groupQuestionsByType(items: TestItem[]): GroupedQuestions {
  const mcq: TestItem[] = [];
  const trueFalse: TestItem[] = [];
  const shortAnswer: TestItem[] = [];
  const essay: TestItem[] = [];

  for (const item of items) {
    const type = (item.question_type || item.type || '').toLowerCase();
    if (type === 'mcq' || type === 'multiple-choice' || type === 'multiple_choice') {
      mcq.push(item);
    } else if (type === 'true_false' || type === 'true-false' || type === 'truefalse') {
      trueFalse.push(item);
    } else if (type === 'short_answer' || type === 'fill-blank' || type === 'fill_blank' || type === 'identification') {
      shortAnswer.push(item);
    } else if (type === 'essay') {
      essay.push(item);
    }
  }

  let secondaryType: 'true_false' | 'short_answer' | null = null;
  let secondary: TestItem[] = [];
  
  if (trueFalse.length > 0 && shortAnswer.length === 0) {
    secondaryType = 'true_false';
    secondary = trueFalse;
  } else if (shortAnswer.length > 0 && trueFalse.length === 0) {
    secondaryType = 'short_answer';
    secondary = shortAnswer;
  } else if (trueFalse.length > 0 && shortAnswer.length > 0) {
    if (trueFalse.length >= shortAnswer.length) {
      secondaryType = 'true_false';
      secondary = trueFalse;
    } else {
      secondaryType = 'short_answer';
      secondary = shortAnswer;
    }
  }

  return { mcq, secondary, essay, secondaryType };
}

export function ExamPrintTemplate({ test, showAnswerKey = false }: ExamPrintTemplateProps) {
  const items: TestItem[] = Array.isArray(test.items) ? test.items : [];
  const totalPoints = items.reduce((sum, item) => sum + (item.points || 1), 0);
  const groupedQuestions = useMemo(() => groupQuestionsByType(items), [items]);

  const mcqStart = 1;
  const secondaryStart = mcqStart + groupedQuestions.mcq.length;
  const essayStart = secondaryStart + groupedQuestions.secondary.length;

  const mcqPoints = groupedQuestions.mcq.reduce((sum, q) => sum + (q.points || 1), 0);
  const secondaryPoints = groupedQuestions.secondary.reduce((sum, q) => sum + (q.points || 1), 0);
  const essayPoints = groupedQuestions.essay.reduce((sum, q) => sum + (q.points || 1), 0);

  const getSectionBTitle = () => {
    if (groupedQuestions.secondaryType === 'true_false') {
      return "SECTION B: TRUE OR FALSE";
    }
    return "SECTION B: IDENTIFICATION / SHORT ANSWER";
  };

  const getSectionBInstruction = () => {
    if (groupedQuestions.secondaryType === 'true_false') {
      return "Write TRUE if the statement is correct, or FALSE if it is incorrect. Write your answer on the space provided before each number.";
    }
    return "Write the correct answer on the blank provided before each number.";
  };

  return (
    <div className="print-exam-only" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
      {/* Exam Header */}
      <div className="exam-header">
        {test.course && <div className="institution-name">{test.course}</div>}
        <div className="exam-title">{test.title || "EXAMINATION"}</div>
        <div className="exam-meta">
          {test.subject && <span>{test.subject}</span>}
          {test.year_section && <span>{test.year_section}</span>}
          {test.exam_period && <span>{test.exam_period}</span>}
          {test.school_year && <span>S.Y. {test.school_year}</span>}
        </div>
      </div>

      {/* Student Information Section */}
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
          <span style={{ fontWeight: 'bold' }}>/ {totalPoints}</span>
        </div>
      </div>

      {/* Exam Summary */}
      <div className="exam-summary">
        <span>Total Points: {totalPoints}</span>
        {test.time_limit && <span>Time Limit: {test.time_limit} minutes</span>}
        <span>Total Questions: {items.length}</span>
      </div>

      {/* General Instructions */}
      {test.instructions && (
        <div className="general-instructions">
          <h3>General Instructions</h3>
          <p>{test.instructions}</p>
        </div>
      )}

      {/* Section A: Multiple Choice */}
      {groupedQuestions.mcq.length > 0 && (
        <div className="exam-section">
          <div className="section-header">
            <h2>
              SECTION A: MULTIPLE CHOICE
              <span className="section-points">({mcqPoints} points)</span>
            </h2>
            <p className="section-instruction">
              Choose the best answer from the options provided. Write the letter of your answer on the space provided before each number.
            </p>
          </div>
          {groupedQuestions.mcq.map((item, index) => (
            <MCQQuestion 
              key={index} 
              item={item} 
              number={mcqStart + index}
              showAnswer={showAnswerKey}
            />
          ))}
        </div>
      )}

      {/* Section B: True/False or Short Answer */}
      {groupedQuestions.secondary.length > 0 && (
        <div className="exam-section">
          <div className="section-header">
            <h2>
              {getSectionBTitle()}
              <span className="section-points">({secondaryPoints} points)</span>
            </h2>
            <p className="section-instruction">{getSectionBInstruction()}</p>
          </div>
          {groupedQuestions.secondary.map((item, index) => (
            <SecondaryQuestion
              key={index}
              item={item}
              number={secondaryStart + index}
              type={groupedQuestions.secondaryType}
              showAnswer={showAnswerKey}
            />
          ))}
        </div>
      )}

      {/* Section C: Essay */}
      {groupedQuestions.essay.length > 0 && (
        <div className="exam-section">
          <div className="section-header">
            <h2>
              SECTION C: ESSAY
              <span className="section-points">({essayPoints} points)</span>
            </h2>
            <p className="section-instruction">
              Answer the following questions in complete sentences. Provide clear and concise explanations. Use the space provided for your answer.
            </p>
          </div>
          {groupedQuestions.essay.map((item, index) => {
            const essayDisplayNum = getEssayRangeNumber(
              index, 
              groupedQuestions.essay.length, 
              essayStart, 
              items.length
            );
            return (
              <EssayQuestion
                key={index}
                item={item}
                displayNumber={essayDisplayNum}
                showAnswer={showAnswerKey}
              />
            );
          })}
        </div>
      )}

      {/* Answer Key (on new page) */}
      {showAnswerKey && (
        <div className="answer-key-section">
          <h2>ANSWER KEY</h2>
          
          {groupedQuestions.mcq.length > 0 && (
            <AnswerKeyGrid
              title="Section A: Multiple Choice"
              items={groupedQuestions.mcq}
              startNumber={mcqStart}
            />
          )}
          
          {groupedQuestions.secondary.length > 0 && (
            <AnswerKeyGrid
              title={`Section B: ${groupedQuestions.secondaryType === 'true_false' ? 'True or False' : 'Identification'}`}
              items={groupedQuestions.secondary}
              startNumber={secondaryStart}
            />
          )}
          
          {groupedQuestions.essay.length > 0 && (
            <div style={{ marginTop: '18pt' }}>
              <h3 style={{ fontSize: '12pt', fontWeight: 'bold', marginBottom: '12pt' }}>
                Section C: Essay (Sample Answers)
              </h3>
              {groupedQuestions.essay.map((item, index) => {
                const essayDisplayNum = getEssayRangeNumber(
                  index,
                  groupedQuestions.essay.length,
                  essayStart,
                  items.length
                );
                const essayAnswer = String(item.correct_answer ?? item.correctAnswer ?? 'Answers may vary');
                return (
                  <div key={index} className="answer-key-essay-item" style={{ marginBottom: '16pt', pageBreakInside: 'avoid' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '4pt' }}>{essayDisplayNum}.</div>
                    <div style={{ marginLeft: '24pt', textAlign: 'left', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                      {essayAnswer}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MCQQuestion({ item, number, showAnswer }: { item: TestItem; number: number; showAnswer: boolean }) {
  const questionText = item.question_text || item.question || '';
  const correctAnswer = item.correct_answer ?? item.correctAnswer;
  
  const getMCQOptions = (): { key: string; text: string }[] => {
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

  const options = getMCQOptions();

  return (
    <div className="exam-question">
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '8pt' }}>
        <span className="answer-blank">
          {showAnswer ? correctAnswer : ''}
        </span>
        <span className="question-number">{number}.</span>
        <span style={{ marginLeft: '6pt', textAlign: 'left' }}>{questionText}</span>
      </div>
      <div className="mcq-options">
        {options.map((option) => (
          <div key={option.key} className="mcq-option">
            <span className="option-letter">{option.key}.</span>
            <span className="option-text">{option.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SecondaryQuestion({ 
  item, 
  number, 
  type, 
  showAnswer 
}: { 
  item: TestItem; 
  number: number; 
  type: 'true_false' | 'short_answer' | null;
  showAnswer: boolean;
}) {
  const questionText = item.question_text || item.question || '';
  const correctAnswer = item.correct_answer ?? item.correctAnswer;

  return (
    <div className="exam-question">
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <span className="answer-blank" style={{ width: type === 'true_false' ? '48pt' : '120pt' }}>
          {showAnswer ? String(correctAnswer) : ''}
        </span>
        <span className="question-number">{number}.</span>
        <span style={{ marginLeft: '6pt', textAlign: 'left', flex: 1 }}>{questionText}</span>
      </div>
    </div>
  );
}

function getEssayRangeNumber(
  essayIndex: number,
  essayCount: number,
  sectionStartNumber: number,
  totalItemCount: number
): string {
  const sectionItemCount = totalItemCount - sectionStartNumber + 1;
  
  if (essayCount > 0 && sectionItemCount > essayCount) {
    const itemsPerEssay = Math.floor(sectionItemCount / essayCount);
    const rangeStart = sectionStartNumber + (essayIndex * itemsPerEssay);
    const rangeEnd = essayIndex === essayCount - 1 
      ? totalItemCount 
      : rangeStart + itemsPerEssay - 1;
    return `${rangeStart}–${rangeEnd}`;
  }
  return `${sectionStartNumber + essayIndex}`;
}

function EssayQuestion({ item, displayNumber, showAnswer }: { item: TestItem; displayNumber: string; showAnswer: boolean }) {
  const questionText = item.question_text || item.question || '';
  const points = item.points || 1;
  const correctAnswer = item.correct_answer ?? item.correctAnswer;

  const lineCount = Math.max(8, points * 2);

  return (
    <div className="exam-question" style={{ marginBottom: '24pt' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '12pt' }}>
        <span className="question-number">{displayNumber}.</span>
        <span style={{ marginLeft: '6pt', textAlign: 'left', flex: 1 }}>{questionText}</span>
        <span style={{ fontSize: '10pt', whiteSpace: 'nowrap', marginLeft: '12pt' }}>
          ({points} {points === 1 ? 'point' : 'points'})
        </span>
      </div>
      
      {showAnswer && correctAnswer ? (
        <div style={{ marginLeft: '24pt', padding: '12pt', border: '1pt solid #ccc', background: '#f9f9f9' }}>
          <strong>Sample Answer:</strong> {String(correctAnswer)}
        </div>
      ) : (
        <div className="essay-answer-space">
          {Array.from({ length: lineCount }).map((_, i) => (
            <div key={i} className="essay-lines"></div>
          ))}
        </div>
      )}
    </div>
  );
}

function AnswerKeyGrid({ title, items, startNumber }: { title: string; items: TestItem[]; startNumber: number }) {
  // Format T/F answers consistently
  const formatGridAnswer = (item: TestItem): string => {
    const answer = item.correct_answer ?? item.correctAnswer ?? '—';
    const type = (item.question_type || item.type || '').toLowerCase();
    if (type === 'true_false' || type === 'true-false' || type === 'truefalse') {
      const val = String(answer).toLowerCase();
      return (val === 'true' || val === 't') ? 'T' : 'F';
    }
    return String(answer);
  };

  return (
    <div style={{ marginBottom: '18pt' }}>
      <h3 style={{ fontSize: '11pt', fontWeight: 'bold', marginBottom: '8pt' }}>{title}</h3>
      <div className="answer-key-grid">
        {items.map((item, index) => (
          <div key={index} className="answer-key-item">
            <span className="key-number">{startNumber + index}.</span>
            <span className="key-answer">{formatGridAnswer(item)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
