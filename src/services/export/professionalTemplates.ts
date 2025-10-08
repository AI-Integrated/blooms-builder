/**
 * Professional Export Templates
 * Provides templates for exporting tests in various professional formats
 */

import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';

export interface TestMetadata {
  title: string;
  subject: string;
  course?: string;
  year_section?: string;
  exam_period?: string;
  school_year?: string;
  instructor?: string;
  date?: string;
  time_limit?: number;
  total_points?: number;
  instructions?: string;
}

export interface ExportOptions {
  template: 'academic' | 'corporate' | 'standardized' | 'minimal';
  includeHeader: boolean;
  includeFooter: boolean;
  includeAnswerKey: boolean;
  includeRubrics: boolean;
  includeStatistics: boolean;
  watermark?: string;
  pageNumbers: boolean;
}

export class ProfessionalTemplates {
  /**
   * Generate professional PDF with selected template
   */
  static async generatePDF(
    questions: any[],
    metadata: TestMetadata,
    options: ExportOptions
  ): Promise<Blob> {
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    switch (options.template) {
      case 'academic':
        this.applyAcademicTemplate(pdf, questions, metadata, options);
        break;
      case 'corporate':
        this.applyCorporateTemplate(pdf, questions, metadata, options);
        break;
      case 'standardized':
        this.applyStandardizedTemplate(pdf, questions, metadata, options);
        break;
      case 'minimal':
        this.applyMinimalTemplate(pdf, questions, metadata, options);
        break;
    }
    
    return pdf.output('blob');
  }
  
  /**
   * Academic template (traditional school/university format)
   */
  private static applyAcademicTemplate(
    pdf: jsPDF,
    questions: any[],
    metadata: TestMetadata,
    options: ExportOptions
  ): void {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = margin;
    
    // Header
    if (options.includeHeader) {
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(metadata.title, pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${metadata.course} - ${metadata.year_section}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 6;
      pdf.text(`${metadata.exam_period} | ${metadata.school_year}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;
      
      // Student info section
      pdf.setDrawColor(0);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;
      
      pdf.text(`Name: ______________________________`, margin, yPos);
      pdf.text(`Date: ____________`, pageWidth - margin - 40, yPos);
      yPos += 8;
      pdf.text(`Section: __________`, margin, yPos);
      pdf.text(`Score: ____ / ${metadata.total_points || questions.length}`, pageWidth - margin - 40, yPos);
      yPos += 10;
      
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;
    }
    
    // Instructions
    if (metadata.instructions) {
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('INSTRUCTIONS:', margin, yPos);
      yPos += 6;
      
      pdf.setFont('helvetica', 'normal');
      const instructions = pdf.splitTextToSize(metadata.instructions, pageWidth - 2 * margin);
      pdf.text(instructions, margin, yPos);
      yPos += instructions.length * 5 + 8;
    }
    
    // Questions
    this.addQuestions(pdf, questions, margin, yPos, options);
    
    // Footer with page numbers
    if (options.pageNumbers) {
      this.addPageNumbers(pdf);
    }
    
    // Watermark
    if (options.watermark) {
      this.addWatermark(pdf, options.watermark);
    }
  }
  
  /**
   * Corporate template (professional business format)
   */
  private static applyCorporateTemplate(
    pdf: jsPDF,
    questions: any[],
    metadata: TestMetadata,
    options: ExportOptions
  ): void {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 15;
    let yPos = margin;
    
    // Header with colored bar
    pdf.setFillColor(41, 128, 185); // Professional blue
    pdf.rect(0, 0, pageWidth, 25, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text(metadata.title, margin, yPos + 8);
    
    pdf.setFontSize(10);
    pdf.text(metadata.subject, margin, yPos + 16);
    
    yPos = 35;
    pdf.setTextColor(0, 0, 0);
    
    // Metadata in two columns
    pdf.setFontSize(9);
    pdf.text(`Instructor: ${metadata.instructor || 'N/A'}`, margin, yPos);
    pdf.text(`Time Limit: ${metadata.time_limit || 'N/A'} minutes`, pageWidth - margin - 50, yPos);
    yPos += 6;
    pdf.text(`Date: ${metadata.date || new Date().toLocaleDateString()}`, margin, yPos);
    pdf.text(`Total Points: ${metadata.total_points || questions.length}`, pageWidth - margin - 50, yPos);
    yPos += 15;
    
    // Questions
    this.addQuestions(pdf, questions, margin, yPos, options);
    
    if (options.pageNumbers) {
      this.addPageNumbers(pdf);
    }
  }
  
  /**
   * Standardized test template (bubble sheet compatible)
   */
  private static applyStandardizedTemplate(
    pdf: jsPDF,
    questions: any[],
    metadata: TestMetadata,
    options: ExportOptions
  ): void {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 15;
    let yPos = margin;
    
    // Header
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(metadata.title, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Mark your answers clearly on the answer sheet provided', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;
    
    // Questions with bubble format
    questions.forEach((q, index) => {
      if (yPos > 270) {
        pdf.addPage();
        yPos = margin;
      }
      
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${index + 1}.`, margin, yPos);
      
      pdf.setFont('helvetica', 'normal');
      const questionText = pdf.splitTextToSize(q.question_text || q.text, pageWidth - margin * 2 - 10);
      pdf.text(questionText, margin + 10, yPos);
      yPos += questionText.length * 5 + 5;
      
      // Multiple choice options with bubbles
      if (q.choices || q.options) {
        const choices = q.choices ? Object.values(q.choices) : q.options;
        choices.forEach((choice: any, idx: number) => {
          // Draw bubble
          pdf.circle(margin + 10, yPos - 1.5, 2);
          
          const letter = String.fromCharCode(65 + idx);
          pdf.text(`${letter}.`, margin + 15, yPos);
          
          const choiceText = pdf.splitTextToSize(String(choice), pageWidth - margin * 2 - 25);
          pdf.text(choiceText, margin + 22, yPos);
          yPos += Math.max(choiceText.length * 5, 6);
        });
      }
      
      yPos += 5;
    });
    
    if (options.pageNumbers) {
      this.addPageNumbers(pdf);
    }
  }
  
  /**
   * Minimal template (clean and simple)
   */
  private static applyMinimalTemplate(
    pdf: jsPDF,
    questions: any[],
    metadata: TestMetadata,
    options: ExportOptions
  ): void {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = margin;
    
    // Simple title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(metadata.title, margin, yPos);
    yPos += 15;
    
    // Questions
    this.addQuestions(pdf, questions, margin, yPos, options);
    
    if (options.pageNumbers) {
      this.addPageNumbers(pdf);
    }
  }
  
  /**
   * Add questions to PDF
   */
  private static addQuestions(
    pdf: jsPDF,
    questions: any[],
    margin: number,
    startY: number,
    options: ExportOptions
  ): void {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPos = startY;
    
    questions.forEach((q, index) => {
      if (yPos > pageHeight - 40) {
        pdf.addPage();
        yPos = margin;
      }
      
      // Question number and text
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${index + 1}.`, margin, yPos);
      
      pdf.setFont('helvetica', 'normal');
      const questionText = pdf.splitTextToSize(
        q.question_text || q.text,
        pageWidth - margin * 2 - 10
      );
      pdf.text(questionText, margin + 8, yPos);
      yPos += questionText.length * 6 + 3;
      
      // Add options for multiple choice
      if (q.choices || q.options) {
        const choices = q.choices ? Object.values(q.choices) : q.options;
        choices.forEach((choice: any, idx: number) => {
          if (yPos > pageHeight - 30) {
            pdf.addPage();
            yPos = margin;
          }
          
          const letter = String.fromCharCode(65 + idx);
          const choiceText = pdf.splitTextToSize(
            `${letter}. ${choice}`,
            pageWidth - margin * 2 - 15
          );
          pdf.text(choiceText, margin + 15, yPos);
          yPos += choiceText.length * 6;
        });
      }
      
      yPos += 8;
    });
  }
  
  /**
   * Add page numbers
   */
  private static addPageNumbers(pdf: jsPDF): void {
    const pageCount = pdf.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text(
        `Page ${i} of ${pageCount}`,
        pdf.internal.pageSize.getWidth() / 2,
        pdf.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }
  }
  
  /**
   * Add watermark
   */
  private static addWatermark(pdf: jsPDF, text: string): void {
    const pageCount = pdf.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setTextColor(200, 200, 200);
      pdf.setFontSize(60);
      pdf.text(
        text,
        pdf.internal.pageSize.getWidth() / 2,
        pdf.internal.pageSize.getHeight() / 2,
        {
          align: 'center',
          angle: 45
        }
      );
      pdf.setTextColor(0, 0, 0);
    }
  }
  
  /**
   * Generate LaTeX export
   */
  static generateLaTeX(questions: any[], metadata: TestMetadata): string {
    let latex = `\\documentclass[12pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{enumitem}
\\usepackage{geometry}
\\geometry{a4paper, margin=1in}

\\title{${metadata.title}}
\\author{${metadata.instructor || ''}}
\\date{${metadata.date || '\\today'}}

\\begin{document}
\\maketitle

\\section*{Instructions}
${metadata.instructions || 'Answer all questions to the best of your ability.'}

\\begin{enumerate}[label=\\arabic*.]
`;
    
    questions.forEach(q => {
      latex += `\\item ${q.question_text || q.text}\n`;
      
      if (q.choices || q.options) {
        latex += `\\begin{enumerate}[label=\\alph*.]\n`;
        const choices = q.choices ? Object.values(q.choices) : q.options;
        choices.forEach((choice: any) => {
          latex += `\\item ${choice}\n`;
        });
        latex += `\\end{enumerate}\n`;
      }
      
      latex += `\n`;
    });
    
    latex += `\\end{enumerate}
\\end{document}`;
    
    return latex;
  }
  
  /**
   * Generate assessment documentation
   */
  static async generateDocumentation(
    testId: string,
    includeAnalytics: boolean = true
  ): Promise<string> {
    // Fetch test data
    const { data: test } = await supabase
      .from('generated_tests')
      .select('*')
      .eq('id', testId)
      .single();
    
    if (!test) throw new Error('Test not found');
    
    let documentation = `# Assessment Documentation\n\n`;
    documentation += `## Test Information\n\n`;
    documentation += `- **Title**: ${test.title}\n`;
    documentation += `- **Subject**: ${test.subject}\n`;
    documentation += `- **Date Created**: ${new Date(test.created_at).toLocaleDateString()}\n\n`;
    
    // Add statistics if requested
    if (includeAnalytics) {
      const itemsCount = Array.isArray(test.items) ? test.items.length : 0;
      documentation += `## Statistics\n\n`;
      documentation += `- **Total Questions**: ${itemsCount}\n`;
      documentation += `- **Time Limit**: ${test.time_limit || 'N/A'} minutes\n`;
      documentation += `- **Total Points**: ${(test.points_per_question || 1) * itemsCount}\n\n`;
    }
    
    return documentation;
  }
}
