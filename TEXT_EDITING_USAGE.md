# PDF Text Editing Feature - Usage Guide

## Overview
The PDF Text Editing feature allows users to click on existing text in PDF documents and edit it interactively. This is accomplished using text extraction from PDF.js and text replacement with pdf-lib.

## How to Use

### 1. Load a PDF
1. Navigate to the "Modify PDF" tab
2. Click "Select PDF file" and choose a PDF with text content
3. Click "Load PDF" to upload and render the document

### 2. Enter Edit Mode
1. Click the "Edit Mode" button in the preview panel
2. The interface will switch to the interactive canvas editor

### 3. Edit Existing Text
1. Click the "Edit Existing Text" tool (pencil icon) in the toolbar
2. Hover over existing text in the PDF - you'll see blue highlight overlays
3. Click on any text element you want to edit
4. The text will be converted to an editable element and selected
5. Use the Properties Panel on the right to modify:
   - Text content
   - Font size
   - Color
   - Position (X, Y coordinates)
6. Click "Apply Changes" to update the text

### 4. Additional Features
- **Delete**: Select an edited text element and press Delete key or click delete button
- **Copy/Paste**: Use Ctrl+C/Ctrl+V or the toolbar buttons
- **Undo**: Delete a replacement text element to restore the original text

### 5. Save Changes
1. Click "Save Modified PDF" to apply all changes to the PDF
2. Click "Download" to save the modified PDF file

## Technical Implementation

### Text Extraction
- Uses PDF.js `getTextContent()` to extract text elements with positioning
- Converts PDF coordinates (bottom-left origin) to canvas coordinates (top-left origin)
- Preserves font size and positioning information

### Interactive Overlays
- Creates invisible overlay divs positioned over extracted text
- Shows blue highlights on hover for visual feedback
- Click to convert text to editable element

### Text Replacement
- Original text is masked with white rectangles
- New text is drawn at the same position with pdf-lib
- Changes are preserved in the PDF structure

### Coordinate Mapping
```javascript
// PDF coordinates (bottom-left) to Canvas coordinates (top-left)
canvasY = canvasHeight - pdfY - textHeight
canvasX = pdfX * scale
```

## Browser Compatibility
- Requires modern browsers with support for:
  - Canvas API
  - PDF.js
  - ES6+ JavaScript features

## Limitations
- Single-line text editing only
- Standard fonts (Helvetica, Times, Courier)
- Works best with simple text layouts
- Complex PDF structures may not be fully supported

## Testing Files
Use these sample PDFs from the assets folder for testing:
- `normal.pdf` - Simple document with text
- `us_constitution.pdf` - Multi-page document with various text
- `standard_fonts_demo.pdf` - Different font examples

## Error Handling
- Toast notifications provide user feedback
- Console logging for debugging
- Graceful fallbacks for unsupported text elements
