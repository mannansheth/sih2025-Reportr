import { PDFDocument, rgb } from 'pdf-lib';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';

// Simple base64 to Uint8Array converter
function base64ToUint8Array(base64) {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Clean text for PDF (removes problematic characters)
function cleanText(text) {
  if (!text) return '';
  return String(text)
    .replace(/[\u202F\u00A0]/g, ' ') // Fix non-breaking spaces
    .replace(/[^\x20-\x7E]/g, ' ')   // Replace non-ASCII with spaces
    .trim();
}

export const generatePDF = async (reportData, imageUri) => {
  try {
    // Load template PDF
    const asset = Asset.fromModule(require('../assets/templates/PendingReport.pdf'));
    console.log(asset)
    await asset.downloadAsync();
    const pdfBase64 = await FileSystem.readAsStringAsync(asset.localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const pdfBytes = base64ToUint8Array(pdfBase64);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    const page = pdfDoc.getPage(0);
    const { width, height } = page.getSize();
    console.log(`Page size: ${width} x ${height}`);

    // Field coordinates based on your template
    // These are estimates - you may need to adjust based on your actual template
    const fields = {
      // Top section
      reportId: { x: 175, y: 795, size: 18 },      // "Report ID:" field
      date: { x: 640, y: 1015, size: 20 },          // Date field (top right)
      time: { x: 550, y:1015, size:20},
      name: { x: 130, y: 750, size: 20 },           // "Name:" field
      number: { x: 155, y: 700, size: 20 },         // "Number:" field
      category: { x: 80, y: 515, size: 20 },       // "Issue Category:" field
      description: { x: 80, y: 350, size: 20 },    // "Description of Issue:" field
      lat: { x: 80, y: 205, size:20 },       // "Location:" field
      long: { x: 190, y: 205, size:20 },       // "Location:" field
      location: { x: 80, y: 180, size:18 },       // "Location:" field
    };

    // Add text to PDF
    page.drawText(cleanText(reportData.reportID), fields.reportId);
    
    page.drawText(
      cleanText(`${new Date(reportData.createdDate).toLocaleTimeString()},`), 
      fields.time
    );
    page.drawText(
      cleanText(new Date(reportData.createdDate).toLocaleDateString('en-IN')), 
      fields.date
    );
    
    page.drawText(cleanText(reportData.name), fields.name);
    
    if (reportData.number) {
      page.drawText(cleanText(reportData.number), fields.number);
    }
    
    page.drawText(cleanText(reportData.category), fields.category);
    page.drawText(cleanText(reportData.description), fields.description);
    page.drawText(cleanText(reportData.location?.lat+", " || ''), fields.lat);
    page.drawText(cleanText(reportData.location?.lng || ''), fields.long);
    page.drawText(cleanText(reportData.location?.loc || ''), fields.location);

    // Add image if provided
    if (imageUri) {
      try {
        const imgBase64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const imageBytes = base64ToUint8Array(imgBase64);
        
        // Try embedding as JPEG first, then PNG
        let image;
        try {
          image = await pdfDoc.embedJpg(imageBytes);
        } catch {
          image = await pdfDoc.embedPng(imageBytes);
        }
        
        // Image position (right side of the form)
        page.drawImage(image, {
          x: 465,  // Right side
          y: 610, // Adjust as needed
          width: 220,
          height: 280,
        });
      } catch (error) {
        console.warn('Failed to add image:', error);
      }
    }

    // Save PDF
    const pdfBytesFinal = await pdfDoc.save();
    const fileUri = `${FileSystem.documentDirectory}reports/${reportData.reportID}/report.pdf`;
    
    // Convert to base64 and save
    let binary = '';
    for (let i = 0; i < pdfBytesFinal.length; i++) {
      binary += String.fromCharCode(pdfBytesFinal[i]);
    }
    const base64 = globalThis.btoa(binary);
    
    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return fileUri;

  } catch (error) {
    console.error('PDF generation failed:', error);
    throw error;
  }
};