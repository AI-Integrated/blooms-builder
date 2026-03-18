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

      // Create PDF with landscape A4 dimensions for TOS
      const pdf = new jsPDF('l', 'mm', 'a4');
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
      // Use the print template element if available (same layout as print)
      const printElement = document.querySelector('.print-exam-only') as HTMLElement;
      
      if (printElement) {
        // Temporarily show the print element for capture
        const originalDisplay = printElement.style.display;
        printElement.style.display = 'block';
        printElement.style.position = 'relative';
        printElement.style.background = 'white';
        printElement.style.width = '210mm';
        printElement.style.padding = '15mm';
        printElement.style.fontFamily = '"Times New Roman", Times, serif';

        const canvas = await html2canvas(printElement, {
          scale: 2.5,
          useCORS: true,
          backgroundColor: '#ffffff',
          width: printElement.scrollWidth,
          height: printElement.scrollHeight,
        });

        // Restore original display
        printElement.style.display = originalDisplay;
        printElement.style.position = '';
        printElement.style.width = '';
        printElement.style.padding = '';

        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfW = pdf.internal.pageSize.getWidth();
        const pdfH = pdf.internal.pageSize.getHeight();
        const mx = 10, my = 8;
        const usableW = pdfW - mx * 2;
        const usableH = pdfH - my * 2;
        const imgH = (canvas.height * usableW) / canvas.width;

        if (imgH <= usableH) {
          pdf.addImage(canvas.toDataURL('image/png', 0.95), 'PNG', mx, my, usableW, imgH);
        } else {
          let remaining = imgH, srcY = 0;
          const ratio = canvas.width / usableW;
          while (remaining > 0) {
            if (srcY > 0) pdf.addPage();
            const sliceH = Math.min(remaining, usableH);
            const srcSliceH = sliceH * ratio;
            const sc = document.createElement('canvas');
            sc.width = canvas.width;
            sc.height = srcSliceH;
            const ctx = sc.getContext('2d');
            if (ctx) {
              ctx.drawImage(canvas, 0, srcY, canvas.width, srcSliceH, 0, 0, canvas.width, srcSliceH);
              pdf.addImage(sc.toDataURL('image/png', 0.95), 'PNG', mx, my, usableW, sliceH);
            }
            srcY += srcSliceH;
            remaining -= usableH;
          }
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
        
        if (uploadToCloud) {
          try {
            const { storageUrl } = await uploadToStorage(blob, filename, 'tests');
            toast.success(`Test PDF exported and uploaded successfully!`);
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
            pdf.save(filename);
            return { success: true, filename };
          }
        } else {
          pdf.save(filename);
          return { success: true, filename };
        }
      }

      // Fallback: basic jsPDF text-based export if no print element is available
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 15;
      let yPosition = margin;

      pdf.setFontSize(14);
      pdf.setFont('times', 'bold');
      pdf.text(testTitle, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      pdf.setFontSize(10);
      pdf.setFont('times', 'normal');
      questions.forEach((q, i) => {
        const text = q.question_text || q.question || '';
        if (yPosition > 270) { pdf.addPage(); yPosition = margin; }
        pdf.text(`${i + 1}. ${text}`, margin, yPosition);
        yPosition += 7;
      });

      const filename = `${testTitle.toLowerCase().replace(/\s+/g, '-')}.pdf`;
      pdf.save(filename);
      return { success: true, filename };
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


