import { useCallback } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { addWatermarkToPDF, generateWatermarkCode, logSecurityEvent } from '@/services/testGeneration/security';

export const usePDFExport = () => {
  const uploadToStorage = useCallback(async (blob: Blob, filename: string, folder: string) => {
    try {
      // Get current user for owner-based storage path
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User must be authenticated to upload files');
      }

      const timestamp = new Date().toISOString().slice(0, 10);
      // Use user ID as first folder segment for owner-based RLS
      const path = `${user.id}/${folder}/${timestamp}/${filename}`;

      const { error: uploadError } = await supabase.storage
        .from('exports')
        .upload(path, blob, {
          upsert: true,
          contentType: 'application/pdf'
        });

      if (uploadError) throw uploadError;

      // Use signed URL instead of public URL for secure access
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('exports')
        .createSignedUrl(path, 3600); // 1 hour expiry

      if (signedUrlError) throw signedUrlError;

      return {
        storageUrl: signedUrlData.signedUrl,
        storagePath: path
      };
    } catch (error) {
      console.error('Storage upload error:', error);
      throw new Error('Failed to upload PDF to storage');
    }
  }, []);

  const exportTOSMatrix = useCallback(async (elementId: string = 'tos-document', uploadToCloud: boolean = false) => {
    try {
      const element = document.getElementById(elementId);
      if (!element) {
        throw new Error('TOS matrix element not found');
      }

      // Create PDF with A4 dimensions
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Convert HTML to canvas
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pdfWidth - 20; // 10mm margin on each side
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Add image to PDF
      if (imgHeight <= pdfHeight - 20) {
        // Fits on one page
        pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      } else {
        // Multiple pages needed
        let remainingHeight = imgHeight;
        let position = 0;
        
        while (remainingHeight > 0) {
          const pageHeight = Math.min(remainingHeight, pdfHeight - 20);
          
          if (position > 0) {
            pdf.addPage();
          }
          
          pdf.addImage(
            imgData, 
            'PNG', 
            10, 
            10, 
            imgWidth, 
            imgHeight
          );
          
          remainingHeight -= (pdfHeight - 20);
          position += (pdfHeight - 20);
        }
      }

      const blob = pdf.output('blob');
      
      // Upload to storage if requested
      if (uploadToCloud) {
        try {
          const { storageUrl } = await uploadToStorage(blob, 'table-of-specifications.pdf', 'tos');
          toast.success(`PDF exported and uploaded successfully!`);
          
          // Also download locally
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'table-of-specifications.pdf';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          return { success: true, storageUrl };
        } catch (error) {
          toast.error('Failed to upload PDF to cloud storage');
          // Fallback to local download
          pdf.save('table-of-specifications.pdf');
          return { success: true };
        }
      } else {
        // Save locally only
        pdf.save('table-of-specifications.pdf');
        return { success: true };
      }
    } catch (error) {
      console.error('Error exporting TOS as PDF:', error);
      return false;
    }
  }, [uploadToStorage]);

  const exportTestQuestions = useCallback(async (
    questions: any[], 
    testTitle: string, 
    uploadToCloud: boolean = false, 
    versionLabel?: string,
    testId?: string,
    studentName?: string,
    studentId?: string
  ) => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const lineHeight = 7;
      
      let yPosition = margin;

      // Add title (Times New Roman, Bold, Centered)
      pdf.setFontSize(14);
      pdf.setFont('times', 'bold');
      pdf.text(testTitle, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += lineHeight;
      
      // Add metadata line (course, section, exam period, school year)
      pdf.setFontSize(10);
      pdf.setFont('times', 'normal');
      const metaLine = [
        versionLabel ? `Version ${versionLabel}` : '',
        'Midterm Examination',
        `S.Y. ${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
      ].filter(Boolean).join('     ');
      pdf.text(metaLine, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += lineHeight * 1.5;
      
      // Add horizontal line
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += lineHeight;

      // Add student info section (two columns layout)
      pdf.setFontSize(10);
      pdf.setFont('times', 'bold');
      const halfWidth = (pageWidth - margin * 2) / 2;
      
      // Row 1: Name and Date
      pdf.text('Name:', margin, yPosition);
      pdf.setFont('times', 'normal');
      pdf.line(margin + 15, yPosition, margin + halfWidth - 10, yPosition);
      
      pdf.setFont('times', 'bold');
      pdf.text('Date:', margin + halfWidth, yPosition);
      pdf.setFont('times', 'normal');
      pdf.line(margin + halfWidth + 12, yPosition, pageWidth - margin, yPosition);
      yPosition += lineHeight;
      
      // Row 2: Section and Score
      pdf.setFont('times', 'bold');
      pdf.text('Section:', margin, yPosition);
      pdf.setFont('times', 'normal');
      pdf.line(margin + 18, yPosition, margin + halfWidth - 10, yPosition);
      
      pdf.setFont('times', 'bold');
      pdf.text('Score:', margin + halfWidth, yPosition);
      pdf.setFont('times', 'normal');
      pdf.line(margin + halfWidth + 14, yPosition, pageWidth - margin - 20, yPosition);
      pdf.setFont('times', 'bold');
      pdf.text(`/ ${questions.length}`, pageWidth - margin - 18, yPosition);
      yPosition += lineHeight * 1.5;

      // Group questions by type
      const grouped = {
        mcq: [] as any[],
        true_false: [] as any[],
        short_answer: [] as any[],
        essay: [] as any[],
        other: [] as any[]
      };

      questions.forEach(q => {
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

      let questionNumber = 1;

      // Section A: MCQ
      if (grouped.mcq.length > 0) {
        yPosition = addSectionHeader(pdf, 'Section A: Multiple Choice Questions', 
          'Choose the best answer from the options provided.', yPosition, margin, pageWidth, pageHeight);
        
        for (const question of grouped.mcq) {
          yPosition = addQuestion(pdf, question, questionNumber++, yPosition, margin, pageWidth, pageHeight, lineHeight);
        }
      }

      // Section B: True/False
      if (grouped.true_false.length > 0) {
        yPosition = addSectionHeader(pdf, 'Section B: True or False', 
          'Write TRUE if the statement is correct, FALSE if incorrect.', yPosition, margin, pageWidth, pageHeight);
        
        for (const question of grouped.true_false) {
          yPosition = addQuestion(pdf, question, questionNumber++, yPosition, margin, pageWidth, pageHeight, lineHeight);
        }
      }

      // Section C: Short Answer
      if (grouped.short_answer.length > 0) {
        yPosition = addSectionHeader(pdf, 'Section C: Fill in the Blank / Short Answer', 
          'Write the correct answer on the blank provided.', yPosition, margin, pageWidth, pageHeight);
        
        for (const question of grouped.short_answer) {
          yPosition = addQuestion(pdf, question, questionNumber++, yPosition, margin, pageWidth, pageHeight, lineHeight);
        }
      }

      // Section D: Essay
      if (grouped.essay.length > 0) {
        yPosition = addSectionHeader(pdf, 'Section D: Essay Questions', 
          'Answer the following questions in complete sentences.', yPosition, margin, pageWidth, pageHeight);
        
        for (const question of grouped.essay) {
          yPosition = addQuestion(pdf, question, questionNumber++, yPosition, margin, pageWidth, pageHeight, lineHeight, true);
        }
      }

      // Section E: Other
      if (grouped.other.length > 0) {
        yPosition = addSectionHeader(pdf, 'Section E: Other Questions', 
          'Answer the following questions.', yPosition, margin, pageWidth, pageHeight);
        
        for (const question of grouped.other) {
          yPosition = addQuestion(pdf, question, questionNumber++, yPosition, margin, pageWidth, pageHeight, lineHeight);
        }
      }

      // Create answer key on new page - compact multi-column layout
      pdf.addPage();
      yPosition = margin;
      
      // Answer Key header matching exam header style
      pdf.setFontSize(14);
      pdf.setFont('times', 'bold');
      pdf.text('Answer Key', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += lineHeight;
      
      // Add test title and version info
      pdf.setFontSize(10);
      pdf.setFont('times', 'normal');
      pdf.text(testTitle + (versionLabel ? ` - Version ${versionLabel}` : ''), pageWidth / 2, yPosition, { align: 'center' });
      yPosition += lineHeight;
      
      // Add horizontal line
      pdf.setLineWidth(0.3);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += lineHeight * 1.5;

      // Build answer key data
      const answerKeyData: { num: number; answer: string }[] = [];
      questionNumber = 1;
      for (const section of [grouped.mcq, grouped.true_false, grouped.short_answer, grouped.essay, grouped.other]) {
        for (const question of section) {
          const correctAnswer = question.correct_answer ?? question.correctAnswer ?? '';
          const questionType = (question.question_type || question.type || '').toLowerCase();
          
          let answer = '';
          if (questionType === 'mcq' || questionType === 'multiple-choice' || questionType === 'multiple_choice') {
            if (typeof correctAnswer === 'number') {
              answer = String.fromCharCode(65 + correctAnswer);
            } else if (typeof correctAnswer === 'string' && /^[A-Da-d]$/.test(correctAnswer)) {
              answer = correctAnswer.toUpperCase();
            } else {
              answer = String(correctAnswer).substring(0, 20);
            }
          } else if (questionType === 'true_false' || questionType === 'true-false' || questionType === 'truefalse') {
            answer = String(correctAnswer).toLowerCase() === 'true' ? 'T' : 'F';
          } else if (correctAnswer) {
            answer = String(correctAnswer).substring(0, 20) + (String(correctAnswer).length > 20 ? '...' : '');
          } else {
            answer = 'Rubric';
          }
          
          answerKeyData.push({ num: questionNumber, answer });
          questionNumber++;
        }
      }

      // Render in multi-column grid layout (4 columns for compact display)
      pdf.setFontSize(10);
      pdf.setFont('times', 'normal');
      
      const columns = 4;
      const columnWidth = (pageWidth - margin * 2) / columns;
      const itemHeight = 5;
      const itemsPerColumn = Math.ceil((pageHeight - yPosition - 30) / itemHeight);
      const maxItemsPerPage = itemsPerColumn * columns;
      
      let currentItem = 0;
      const startY = yPosition;
      
      while (currentItem < answerKeyData.length) {
        // Check if we need a new page
        if (currentItem > 0 && currentItem % maxItemsPerPage === 0) {
          pdf.addPage();
          yPosition = margin + lineHeight;
        }
        
        const pageStartItem = Math.floor(currentItem / maxItemsPerPage) * maxItemsPerPage;
        const itemInPage = currentItem - pageStartItem;
        const col = Math.floor(itemInPage / itemsPerColumn);
        const row = itemInPage % itemsPerColumn;
        
        const x = margin + col * columnWidth;
        const y = (currentItem >= maxItemsPerPage ? margin + lineHeight : startY) + row * itemHeight;
        
        const item = answerKeyData[currentItem];
        const numText = `${item.num}.`;
        const answerText = item.answer;
        
        // Right-align the number and left-align answer
        pdf.text(numText, x + 8, y, { align: 'right' });
        pdf.text(answerText, x + 10, y);
        
        currentItem++;
      }

      // Add watermarks if version label and test ID are provided
      if (versionLabel && testId) {
        const watermarkCode = generateWatermarkCode(testId, versionLabel, studentId);
        const totalPages = pdf.getNumberOfPages();
        const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
        
        addWatermarkToPDF(pdf, {
          testId,
          versionLabel,
          studentName,
          studentId,
          uniqueCode: watermarkCode,
          timestamp: new Date()
        }, pages);
        
        // Log security event
        await logSecurityEvent('export', testId, {
          version_label: versionLabel,
          student_id: studentId,
          student_name: studentName,
          watermark_code: watermarkCode,
          exported_at: new Date().toISOString()
        });
      }

      const filename = `${testTitle.toLowerCase().replace(/\s+/g, '-')}${versionLabel ? `-version-${versionLabel}` : ''}${studentName ? `-${studentName.toLowerCase().replace(/\s+/g, '-')}` : ''}.pdf`;
      const blob = pdf.output('blob');
      
      // Upload to storage if requested
      if (uploadToCloud) {
        try {
          const { storageUrl } = await uploadToStorage(blob, filename, 'tests');
          toast.success(`Test PDF exported and uploaded successfully!`);
          
          // Also download locally
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          return { success: true, storageUrl, filename };
        } catch (error) {
          toast.error('Failed to upload PDF to cloud storage');
          // Fallback to local download
          pdf.save(filename);
          return { success: true, filename };
        }
      } else {
        // Save locally only
        pdf.save(filename);
        return { success: true, filename };
      }
    } catch (error) {
      console.error('Error exporting test as PDF:', error);
      return false;
    }
  }, [uploadToStorage]);

  return {
    exportTOSMatrix,
    exportTestQuestions,
    uploadToStorage
  };
};

// Helper function to add section header
function addSectionHeader(
  pdf: jsPDF, 
  title: string, 
  instruction: string, 
  yPosition: number, 
  margin: number, 
  pageWidth: number,
  pageHeight: number
): number {
  if (yPosition > pageHeight - 60) {
    pdf.addPage();
    yPosition = margin;
  }

  pdf.setFontSize(11);
  pdf.setFont('times', 'bold');
  pdf.text(title, margin, yPosition);
  yPosition += 5;
  
  pdf.setFontSize(9);
  pdf.setFont('times', 'italic');
  pdf.text(instruction, margin, yPosition);
  yPosition += 8;
  
  return yPosition;
}

// Helper function to add a question
function addQuestion(
  pdf: jsPDF,
  question: any,
  number: number,
  yPosition: number,
  margin: number,
  pageWidth: number,
  pageHeight: number,
  lineHeight: number,
  isEssay: boolean = false
): number {
  // Check if we need a new page
  if (yPosition > pageHeight - 50) {
    pdf.addPage();
    yPosition = margin;
  }

  // Get question text - handle both field naming conventions
  const questionText = question.question_text || question.question || 'Question text not available';
  const questionType = (question.question_type || question.type || '').toLowerCase();
  const rawChoices = question.choices || question.options;
  
  // Normalize choices to array of { key, text } for consistent rendering
  const getMCQOptions = (): { key: string; text: string }[] => {
    if (!rawChoices) return [];
    
    // Handle object format: { A: "text", B: "text", ... }
    if (typeof rawChoices === 'object' && !Array.isArray(rawChoices)) {
      return ['A', 'B', 'C', 'D', 'E', 'F']
        .filter(key => rawChoices[key])
        .map(key => ({ key, text: String(rawChoices[key]) }));
    }
    
    // Handle array format: ["option1", "option2", ...]
    if (Array.isArray(rawChoices)) {
      return rawChoices.map((text, idx) => ({
        key: String.fromCharCode(65 + idx),
        text: typeof text === 'string' ? text : String(text)
      }));
    }
    
    return [];
  };
  
  const mcqOptions = getMCQOptions();

  // Question number and text
  pdf.setFontSize(10);
  pdf.setFont('times', 'bold');
  pdf.text(`${number}.`, margin, yPosition);
  
  pdf.setFont('times', 'normal');
  const questionLines = pdf.splitTextToSize(questionText, pageWidth - margin * 2 - 10);
  pdf.text(questionLines, margin + 8, yPosition);
  yPosition += questionLines.length * lineHeight;

  // Add options for multiple choice
  if ((questionType === 'mcq' || questionType === 'multiple-choice' || questionType === 'multiple_choice') && mcqOptions.length > 0) {
    yPosition += 3;
    mcqOptions.forEach((option) => {
      if (yPosition > pageHeight - 20) {
        pdf.addPage();
        yPosition = margin;
      }
      
      const optionLines = pdf.splitTextToSize(`${option.key}. ${option.text}`, pageWidth - margin * 2 - 15);
      pdf.text(optionLines, margin + 15, yPosition);
      yPosition += optionLines.length * lineHeight;
    });
  }

  // Add True/False options
  if (questionType === 'true_false' || questionType === 'true-false' || questionType === 'truefalse') {
    yPosition += 3;
    pdf.text('( ) True    ( ) False', margin + 15, yPosition);
    yPosition += lineHeight;
  }

  // Add blank line for short answer
  if (questionType === 'short_answer' || questionType === 'fill-blank' || questionType === 'fill_blank' || questionType === 'identification') {
    yPosition += 3;
    pdf.text('Answer: _____________________________________________', margin + 8, yPosition);
    yPosition += lineHeight;
  }

  // Add space for essay
  if (isEssay || questionType === 'essay') {
    yPosition += 5;
    for (let i = 0; i < 5; i++) {
      if (yPosition > pageHeight - 15) {
        pdf.addPage();
        yPosition = margin;
      }
      pdf.text('___________________________________________________________________________', margin, yPosition);
      yPosition += lineHeight;
    }
  }

  yPosition += lineHeight;
  return yPosition;
}
