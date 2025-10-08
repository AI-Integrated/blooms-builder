/**
 * LaTeX Document Generator
 * Generates LaTeX source code for academic test documents
 */

import { TestMetadata } from './professionalTemplates';

export interface LaTeXOptions {
  documentClass?: 'article' | 'exam' | 'report';
  fontSize?: '10pt' | '11pt' | '12pt';
  paperSize?: 'a4paper' | 'letterpaper';
  includeAnswerKey?: boolean;
  twoColumn?: boolean;
}

/**
 * Generate LaTeX document from test data
 */
export function generateLaTeX(
  questions: any[],
  metadata: TestMetadata,
  options: LaTeXOptions = {}
): string {
  const {
    documentClass = 'exam',
    fontSize = '12pt',
    paperSize = 'a4paper',
    includeAnswerKey = false,
    twoColumn = false
  } = options;
  
  let latex = generatePreamble(documentClass, fontSize, paperSize, twoColumn);
  latex += generateHeader(metadata);
  latex += generateInstructions(metadata.instructions || '');
  latex += generateQuestions(questions);
  
  if (includeAnswerKey) {
    latex += generateAnswerKey(questions);
  }
  
  latex += '\\end{document}\n';
  
  return latex;
}

/**
 * Generate LaTeX preamble
 */
function generatePreamble(
  documentClass: string,
  fontSize: string,
  paperSize: string,
  twoColumn: boolean
): string {
  const columnOption = twoColumn ? ',twocolumn' : '';
  
  return `\\documentclass[${fontSize},${paperSize}${columnOption}]{${documentClass}}

% Packages
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{amsmath,amssymb}
\\usepackage{graphicx}
\\usepackage{geometry}
\\usepackage{fancyhdr}
\\usepackage{enumitem}
\\usepackage{multicol}

% Page layout
\\geometry{margin=1in}
\\pagestyle{fancy}
\\fancyhf{}
\\rhead{Page \\thepage}

% Question formatting
\\renewcommand{\\questionlabel}{\\thequestion.}
\\renewcommand{\\choicelabel}{\\Alph{choice}.}

\\begin{document}

`;
}

/**
 * Generate document header
 */
function generateHeader(metadata: TestMetadata): string {
  return `% Header
\\begin{center}
  {\\Large \\textbf{${escapeLatex(metadata.title)}}} \\\\[0.5em]
  {\\large ${escapeLatex(metadata.subject)}} \\\\[0.3em]
  ${metadata.course ? `${escapeLatex(metadata.course)} \\\\[0.2em]` : ''}
  ${metadata.year_section ? `${escapeLatex(metadata.year_section)}` : ''} ${metadata.exam_period ? `--- ${escapeLatex(metadata.exam_period)}` : ''} \\\\[0.2em]
  ${metadata.school_year ? `S.Y. ${escapeLatex(metadata.school_year)}` : ''}
\\end{center}

\\vspace{1em}

\\noindent
\\textbf{Name:} \\underline{\\hspace{6cm}} \\hfill \\textbf{Date:} \\underline{\\hspace{3cm}}

\\vspace{0.5em}

`;
}

/**
 * Generate instructions section
 */
function generateInstructions(instructions: string): string {
  return `\\noindent
\\textbf{Instructions:} ${escapeLatex(instructions)}

\\vspace{1em}

`;
}

/**
 * Generate questions section
 */
function generateQuestions(questions: any[]): string {
  let latex = '\\begin{questions}\n\n';
  
  questions.forEach((q, index) => {
    latex += generateQuestion(q, index + 1);
    latex += '\n';
  });
  
  latex += '\\end{questions}\n\n';
  
  return latex;
}

/**
 * Generate a single question
 */
function generateQuestion(question: any, number: number): string {
  let latex = `\\question ${escapeLatex(question.question_text)}\n`;
  
  if (question.question_type === 'multiple_choice' && question.choices) {
    latex += '\\begin{choices}\n';
    
    const choices = typeof question.choices === 'string' 
      ? JSON.parse(question.choices) 
      : question.choices;
    
    choices.forEach((choice: string) => {
      latex += `  \\choice ${escapeLatex(choice)}\n`;
    });
    
    latex += '\\end{choices}\n';
  } else if (question.question_type === 'essay' || question.question_type === 'short_answer') {
    // Add space for written answer
    latex += '\\vspace{3cm}\n';
  }
  
  return latex;
}

/**
 * Generate answer key section
 */
function generateAnswerKey(questions: any[]): string {
  let latex = '\\newpage\n\n';
  latex += '\\section*{Answer Key}\n\n';
  latex += '\\begin{enumerate}[label=\\arabic*.]\n';
  
  questions.forEach((q, index) => {
    const answer = q.correct_answer || 'N/A';
    latex += `  \\item ${escapeLatex(answer)}\n`;
  });
  
  latex += '\\end{enumerate}\n\n';
  
  return latex;
}

/**
 * Escape special LaTeX characters
 */
function escapeLatex(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

/**
 * Generate LaTeX for TOS matrix
 */
export function generateTOSMatrix(tos: any): string {
  let latex = '\\section*{Table of Specifications}\n\n';
  latex += '\\begin{table}[h]\n';
  latex += '\\centering\n';
  latex += '\\begin{tabular}{|l|c|c|c|c|c|c|}\n';
  latex += '\\hline\n';
  latex += '\\textbf{Topic} & \\textbf{Remember} & \\textbf{Understand} & \\textbf{Apply} & \\textbf{Analyze} & \\textbf{Evaluate} & \\textbf{Total} \\\\ \\hline\n';
  
  // Add topic rows (simplified - would need actual data structure)
  latex += '\\hline\n';
  latex += '\\end{tabular}\n';
  latex += '\\end{table}\n\n';
  
  return latex;
}
