import { useCallback } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const usePDFExport = () => {
  const exportTOSMatrix = useCallback(async (elementId: string = 'tos-document') => {
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

      // Save the PDF
      pdf.save('table-of-specifications.pdf');
      return true;
    } catch (error) {
      console.error('Error exporting TOS as PDF:', error);
      return false;
    }
  }, []);

  const exportTestQuestions = useCallback(async (questions: any[], testTitle: string) => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const lineHeight = 7;
      
      let yPosition = margin;

      // Add title
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(testTitle, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += lineHeight * 2;

      // Add instructions
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Instructions: Read each question carefully and select the best answer.', margin, yPosition);
      yPosition += lineHeight * 2;

      // Add questions
      questions.forEach((question, index) => {
        // Check if we need a new page
        if (yPosition > pageHeight - 40) {
          pdf.addPage();
          yPosition = margin;
        }

        // Question number and text
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${index + 1}.`, margin, yPosition);
        
        pdf.setFont('helvetica', 'normal');
        const questionLines = pdf.splitTextToSize(question.question, pageWidth - margin * 2 - 10);
        pdf.text(questionLines, margin + 8, yPosition);
        yPosition += questionLines.length * lineHeight;

        // Add options for multiple choice
        if (question.type === 'multiple-choice' && question.options) {
          yPosition += 3;
          question.options.forEach((option: string, optIndex: number) => {
            if (yPosition > pageHeight - 20) {
              pdf.addPage();
              yPosition = margin;
            }
            
            const optionLetter = String.fromCharCode(65 + optIndex);
            const optionLines = pdf.splitTextToSize(`${optionLetter}. ${option}`, pageWidth - margin * 2 - 15);
            pdf.text(optionLines, margin + 15, yPosition);
            yPosition += optionLines.length * lineHeight;
          });
        }

        yPosition += lineHeight;
      });

      // Create answer key on new page
      pdf.addPage();
      yPosition = margin;
      
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Answer Key', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += lineHeight * 2;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      questions.forEach((question, index) => {
        if (yPosition > pageHeight - 20) {
          pdf.addPage();
          yPosition = margin;
        }

        let answer = '';
        if (question.type === 'multiple-choice' && typeof question.correctAnswer === 'number') {
          answer = String.fromCharCode(65 + question.correctAnswer);
        } else {
          answer = 'See rubric';
        }
        
        pdf.text(`${index + 1}. ${answer}`, margin, yPosition);
        yPosition += lineHeight;
      });

      pdf.save(`${testTitle.toLowerCase().replace(/\s+/g, '-')}.pdf`);
      return true;
    } catch (error) {
      console.error('Error exporting test as PDF:', error);
      return false;
    }
  }, []);

  return {
    exportTOSMatrix,
    exportTestQuestions
  };
};