import { useCallback } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { addWatermarkToPDF, generateWatermarkCode, logSecurityEvent } from '@/services/testGeneration/security';

export const usePDFExport = () => {
  const uploadToStorage = useCallback(async (blob: Blob, filename: string, folder: string) => {
    try {
      const timestamp = new Date().toISOString().slice(0, 10);
      const path = `${folder}/${timestamp}/${filename}`;

      const { error: uploadError } = await supabase.storage
        .from('exports')
        .upload(path, blob, {
          upsert: true,
          contentType: 'application/pdf'
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('exports')
        .getPublicUrl(path);

      return {
        storageUrl: urlData.publicUrl,
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

      // Add title
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(testTitle, pageWidth / 2, yPosition, { align: 'center' });
      
      // Add version label if provided
      if (versionLabel) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Version ${versionLabel}`, pageWidth / 2, yPosition + 7, { align: 'center' });
      }
      
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