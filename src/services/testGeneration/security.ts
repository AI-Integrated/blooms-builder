import { jsPDF } from 'jspdf';
import { supabase } from '@/integrations/supabase/client';

export interface WatermarkConfig {
  testId: string;
  versionLabel: string;
  studentName?: string;
  studentId?: string;
  uniqueCode: string;
  timestamp: Date;
}

export interface SecurityMetadata {
  watermark_code: string;
  version_label: string;
  student_id?: string;
  generated_at: string;
  distribution_strategy?: string;
}

/**
 * Generate a unique watermark code
 */
export function generateWatermarkCode(
  testId: string,
  versionLabel: string,
  studentId?: string
): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  const idHash = testId.substring(0, 8);
  const studentHash = studentId ? studentId.substring(0, 4) : 'XXXX';
  
  return `${versionLabel}-${idHash}-${studentHash}-${timestamp}-${random}`.toUpperCase();
}

/**
 * Add visual watermark to PDF
 */
export function addWatermarkToPDF(
  pdf: jsPDF,
  config: WatermarkConfig,
  pages: number[]
): void {
  const { versionLabel, studentName, uniqueCode, timestamp } = config;
  
  // Save current state
  const originalFontSize = pdf.getFontSize();
  const originalTextColor = pdf.getTextColor();
  
  pages.forEach(pageNum => {
    pdf.setPage(pageNum);
    
    // Header watermark (top right)
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Version label in top right
    pdf.text(`Version: ${versionLabel}`, pageWidth - 15, 10, { align: 'right' });
    
    // Unique code in top right (smaller)
    pdf.setFontSize(6);
    pdf.text(uniqueCode, pageWidth - 15, 14, { align: 'right' });
    
    // Student name if provided
    if (studentName) {
      pdf.setFontSize(8);
      pdf.text(studentName, 15, 10);
    }
    
    // Footer watermark (bottom center)
    pdf.setFontSize(6);
    pdf.setTextColor(150, 150, 150);
    const footerText = `${versionLabel} • ${uniqueCode} • ${timestamp.toLocaleDateString()}`;
    pdf.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
    
    // Diagonal watermark (light, across page)
    pdf.saveGraphicsState();
    pdf.setTextColor(220, 220, 220);
    pdf.setFontSize(48);
    
    const centerX = pageWidth / 2;
    const centerY = pageHeight / 2;
    
    // Add large version label at 45 degree angle (rotated)
    pdf.text(
      `VERSION ${versionLabel}`,
      centerX,
      centerY,
      { align: 'center', angle: 45 }
    );
    
    pdf.restoreGraphicsState();
  });
  
  // Restore original state
  pdf.setFontSize(originalFontSize);
  pdf.setTextColor(originalTextColor);
}

/**
 * Create watermark metadata for database storage
 */
export function createSecurityMetadata(config: WatermarkConfig): SecurityMetadata {
  return {
    watermark_code: config.uniqueCode,
    version_label: config.versionLabel,
    student_id: config.studentId,
    generated_at: config.timestamp.toISOString()
  };
}

/**
 * Log security event
 */
export async function logSecurityEvent(
  eventType: 'export' | 'distribution' | 'access',
  testId: string,
  metadata: Record<string, any>
): Promise<void> {
  const { data: user } = await supabase.auth.getUser();
  
  await supabase.from('activity_log').insert({
    entity_type: 'generated_tests',
    entity_id: testId,
    action: `security_${eventType}`,
    user_id: user?.user?.id,
    meta: metadata
  });
}

/**
 * Verify watermark integrity
 */
export function verifyWatermark(watermarkCode: string): {
  isValid: boolean;
  versionLabel?: string;
  testIdHash?: string;
  studentHash?: string;
  timestamp?: string;
} {
  const parts = watermarkCode.split('-');
  
  if (parts.length !== 5) {
    return { isValid: false };
  }
  
  return {
    isValid: true,
    versionLabel: parts[0],
    testIdHash: parts[1],
    studentHash: parts[2],
    timestamp: parts[3]
  };
}
