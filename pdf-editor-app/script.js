// Global variables
let currentPdfDoc = null;
let currentPdfBytes = null;
let uploadedImage = null;
let formElements = [];

// Interactive Editor Variables
let isEditMode = false;
let currentTool = 'select';
let selectedElement = null;
let pdfElements = [];
let copiedElement = null;
let dragState = {
    isDragging: false,
    isResizing: false,
    startX: 0,
    startY: 0,
    startElementX: 0,
    startElementY: 0,
    resizeHandle: null
};
let loadedPdfDoc = null;
let canvas = null;
let ctx = null;
let canvasScale = 1;

// Utility functions
function showLoading() {
    document.getElementById('loading').classList.add('show');
}

function hideLoading() {
    document.getElementById('loading').classList.remove('show');
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    }[type];
    
    toast.innerHTML = `
        <i class="${icon}"></i>
        <span class="toast-message">${message}</span>
        <button class="toast-close"><i class="fas fa-times"></i></button>
    `;
    
    container.appendChild(toast);
    
    // Show toast
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => container.removeChild(toast), 300);
    }, 5000);
    
    // Manual close
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.classList.remove('show');
        setTimeout(() => container.removeChild(toast), 300);
    });
}

function renderPdfInIframe(pdfBytes, containerId) {
    const container = document.getElementById(containerId);
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);
    
    container.innerHTML = `<iframe class="pdf-iframe" src="${blobUrl}"></iframe>`;
}

function downloadPdf(pdfBytes, filename) {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255
    } : null;
}

// Tab functionality
function initializeTabs() {
    const navTabs = document.querySelectorAll('.nav-tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            
            // Remove active class from all tabs
            navTabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));
            
            // Add active class to clicked tab
            tab.classList.add('active');
            document.getElementById(`${targetTab}-tab`).classList.add('active');
        });
    });
}

// Create PDF functionality
async function initializeCreatePdf() {
    const createBtn = document.getElementById('create-pdf');
    const downloadBtn = document.getElementById('download-pdf');
    const clearBtn = document.getElementById('clear-all');
    const addTextBtn = document.getElementById('add-text');
    const addImageBtn = document.getElementById('add-image');
    const addShapeBtn = document.getElementById('add-shape');
    const imageUpload = document.getElementById('image-upload');
    
    let textElements = [];
    let imageElements = [];
    let shapeElements = [];
    
    // Image upload handling
    imageUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                uploadedImage = e.target.result;
                addImageBtn.disabled = false;
                showToast('Image uploaded successfully!', 'success');
            };
            reader.readAsArrayBuffer(file);
        }
    });
    
    // Add text element
    addTextBtn.addEventListener('click', () => {
        const text = document.getElementById('text-content').value;
        if (!text.trim()) {
            showToast('Please enter some text', 'warning');
            return;
        }
        
        const textElement = {
            text: text,
            x: parseInt(document.getElementById('text-x').value),
            y: parseInt(document.getElementById('text-y').value),
            size: parseInt(document.getElementById('font-size').value),
            font: document.getElementById('font-family').value,
            color: document.getElementById('text-color').value
        };
        
        textElements.push(textElement);
        showToast('Text element added!', 'success');
        
        // Clear form
        document.getElementById('text-content').value = '';
    });
    
    // Add image element
    addImageBtn.addEventListener('click', () => {
        if (!uploadedImage) {
            showToast('Please upload an image first', 'warning');
            return;
        }
        
        const imageElement = {
            imageData: uploadedImage,
            x: parseInt(document.getElementById('image-x').value),
            y: parseInt(document.getElementById('image-y').value),
            width: parseInt(document.getElementById('image-width').value),
            height: parseInt(document.getElementById('image-height').value)
        };
        
        imageElements.push(imageElement);
        showToast('Image element added!', 'success');
    });
    
    // Add shape element
    addShapeBtn.addEventListener('click', () => {
        const shapeElement = {
            type: document.getElementById('shape-type').value,
            x: parseInt(document.getElementById('shape-x').value),
            y: parseInt(document.getElementById('shape-y').value),
            width: parseInt(document.getElementById('shape-width').value),
            height: parseInt(document.getElementById('shape-height').value),
            fillColor: document.getElementById('shape-fill').value,
            borderColor: document.getElementById('shape-border').value
        };
        
        shapeElements.push(shapeElement);
        showToast('Shape element added!', 'success');
    });
    
    // Create PDF
    createBtn.addEventListener('click', async () => {
        showLoading();
        
        try {
            const pdfDoc = await PDFLib.PDFDocument.create();
            
            // Set document metadata
            const title = document.getElementById('doc-title').value || 'My Document';
            const author = document.getElementById('doc-author').value || 'PDF Editor Pro';
            const subject = document.getElementById('doc-subject').value || 'Created with PDF Editor Pro';
            
            pdfDoc.setTitle(title);
            pdfDoc.setAuthor(author);
            pdfDoc.setSubject(subject);
            pdfDoc.setCreationDate(new Date());
            
            // Add page
            const width = parseInt(document.getElementById('page-width').value);
            const height = parseInt(document.getElementById('page-height').value);
            const page = pdfDoc.addPage([width, height]);
            
            // Add text elements
            for (const textEl of textElements) {
                const font = await pdfDoc.embedFont(PDFLib.StandardFonts[textEl.font]);
                const rgb = hexToRgb(textEl.color);
                
                page.drawText(textEl.text, {
                    x: textEl.x,
                    y: textEl.y,
                    size: textEl.size,
                    font: font,
                    color: PDFLib.rgb(rgb.r, rgb.g, rgb.b)
                });
            }
            
            // Add image elements
            for (const imgEl of imageElements) {
                const imageBytes = new Uint8Array(imgEl.imageData);
                let image;
                
                // Determine image type and embed
                if (imageBytes[0] === 0x89 && imageBytes[1] === 0x50) { // PNG
                    image = await pdfDoc.embedPng(imageBytes);
                } else if (imageBytes[0] === 0xFF && imageBytes[1] === 0xD8) { // JPEG
                    image = await pdfDoc.embedJpg(imageBytes);
                } else {
                    throw new Error('Unsupported image format');
                }
                
                page.drawImage(image, {
                    x: imgEl.x,
                    y: imgEl.y,
                    width: imgEl.width,
                    height: imgEl.height
                });
            }
            
            // Add shape elements
            for (const shape of shapeElements) {
                const fillRgb = hexToRgb(shape.fillColor);
                const borderRgb = hexToRgb(shape.borderColor);
                
                if (shape.type === 'rectangle') {
                    page.drawRectangle({
                        x: shape.x,
                        y: shape.y,
                        width: shape.width,
                        height: shape.height,
                        color: PDFLib.rgb(fillRgb.r, fillRgb.g, fillRgb.b),
                        borderColor: PDFLib.rgb(borderRgb.r, borderRgb.g, borderRgb.b),
                        borderWidth: 2
                    });
                } else if (shape.type === 'circle') {
                    page.drawCircle({
                        x: shape.x + shape.width / 2,
                        y: shape.y + shape.height / 2,
                        size: Math.min(shape.width, shape.height) / 2,
                        color: PDFLib.rgb(fillRgb.r, fillRgb.g, fillRgb.b),
                        borderColor: PDFLib.rgb(borderRgb.r, borderRgb.g, borderRgb.b),
                        borderWidth: 2
                    });
                } else if (shape.type === 'line') {
                    page.drawLine({
                        start: { x: shape.x, y: shape.y },
                        end: { x: shape.x + shape.width, y: shape.y + shape.height },
                        color: PDFLib.rgb(borderRgb.r, borderRgb.g, borderRgb.b),
                        thickness: 2
                    });
                }
            }
            
            // Save PDF
            currentPdfBytes = await pdfDoc.save();
            currentPdfDoc = pdfDoc;
            
            // Render preview
            renderPdfInIframe(currentPdfBytes, 'preview-container');
            downloadBtn.disabled = false;
            
            showToast('PDF created successfully!', 'success');
        } catch (error) {
            console.error('Error creating PDF:', error);
            showToast('Error creating PDF: ' + error.message, 'error');
        } finally {
            hideLoading();
        }
    });
    
    // Download PDF
    downloadBtn.addEventListener('click', () => {
        if (currentPdfBytes) {
            const title = document.getElementById('doc-title').value || 'my-document';
            downloadPdf(currentPdfBytes, `${title}.pdf`);
        }
    });
    
    // Clear all
    clearBtn.addEventListener('click', () => {
        textElements = [];
        imageElements = [];
        shapeElements = [];
        uploadedImage = null;
        currentPdfDoc = null;
        currentPdfBytes = null;
        
        // Reset form
        document.getElementById('text-content').value = '';
        document.getElementById('image-upload').value = '';
        addImageBtn.disabled = true;
        downloadBtn.disabled = true;
        
        // Clear preview
        document.getElementById('preview-container').innerHTML = `
            <div class="preview-placeholder">
                <i class="fas fa-file-pdf"></i>
                <p>Your PDF preview will appear here</p>
            </div>
        `;
        
        showToast('All elements cleared!', 'info');
    });
}

// Modify PDF functionality
async function initializeModifyPdf() {
    const pdfUpload = document.getElementById('pdf-upload');
    const loadBtn = document.getElementById('load-pdf');
    const addTextBtn = document.getElementById('add-modify-text');
    const addPageBtn = document.getElementById('add-page');
    const removePageBtn = document.getElementById('remove-page');
    const saveBtn = document.getElementById('save-modified-pdf');
    const downloadBtn = document.getElementById('download-modified-pdf');
    
    pdfUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            loadBtn.disabled = false;
        }
    });
    
    loadBtn.addEventListener('click', async () => {
        const file = pdfUpload.files[0];
        if (!file) return;
        
        showLoading();
        
        try {
            const arrayBuffer = await file.arrayBuffer();
            loadedPdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            loadedPdfBytes = new Uint8Array(arrayBuffer);
            currentPdfBytes = loadedPdfBytes; // Store globally for interactive editor
            
            // Show controls
            document.getElementById('modify-controls').style.display = 'block';
            document.getElementById('page-controls').style.display = 'block';
            document.getElementById('modify-actions').style.display = 'block';
            
            // Update page count
            const pageCount = loadedPdfDoc.getPageCount();
            document.getElementById('modify-page').max = pageCount;
            document.getElementById('remove-page-num').max = pageCount;
            
            // Render preview
            const pdfBytes = await loadedPdfDoc.save();
            renderPdfInIframe(pdfBytes, 'modify-preview-container');
            downloadBtn.disabled = false;
            
            // Enable edit mode toggle
            document.getElementById('editor-mode-toggle').disabled = false;
            
            showToast(`PDF loaded successfully! (${pageCount} pages)`, 'success');
        } catch (error) {
            console.error('Error loading PDF:', error);
            showToast('Error loading PDF: ' + error.message, 'error');
        } finally {
            hideLoading();
        }
    });
    
    addTextBtn.addEventListener('click', async () => {
        if (!loadedPdfDoc) {
            showToast('Please load a PDF first', 'warning');
            return;
        }
        
        const text = document.getElementById('modify-text').value;
        if (!text.trim()) {
            showToast('Please enter some text', 'warning');
            return;
        }
        
        showLoading();
        
        try {
            const pageIndex = parseInt(document.getElementById('modify-page').value) - 1;
            const pages = loadedPdfDoc.getPages();
            
            if (pageIndex >= pages.length) {
                throw new Error('Invalid page number');
            }
            
            const page = pages[pageIndex];
            const font = await loadedPdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
            
            page.drawText(text, {
                x: parseInt(document.getElementById('modify-x').value),
                y: parseInt(document.getElementById('modify-y').value),
                size: parseInt(document.getElementById('modify-font-size').value),
                font: font,
                color: PDFLib.rgb(0, 0, 0)
            });
            
            // Update preview
            const pdfBytes = await loadedPdfDoc.save();
            renderPdfInIframe(pdfBytes, 'modify-preview-container');
            
            document.getElementById('modify-text').value = '';
            showToast('Text added to PDF!', 'success');
        } catch (error) {
            console.error('Error adding text:', error);
            showToast('Error adding text: ' + error.message, 'error');
        } finally {
            hideLoading();
        }
    });
    
    addPageBtn.addEventListener('click', async () => {
        if (!loadedPdfDoc) {
            showToast('Please load a PDF first', 'warning');
            return;
        }
        
        showLoading();
        
        try {
            loadedPdfDoc.addPage();
            
            const pageCount = loadedPdfDoc.getPageCount();
            document.getElementById('modify-page').max = pageCount;
            document.getElementById('remove-page-num').max = pageCount;
            
            // Update preview
            const pdfBytes = await loadedPdfDoc.save();
            renderPdfInIframe(pdfBytes, 'modify-preview-container');
            
            showToast('Page added successfully!', 'success');
        } catch (error) {
            console.error('Error adding page:', error);
            showToast('Error adding page: ' + error.message, 'error');
        } finally {
            hideLoading();
        }
    });
    
    removePageBtn.addEventListener('click', async () => {
        if (!loadedPdfDoc) {
            showToast('Please load a PDF first', 'warning');
            return;
        }
        
        const pageNum = parseInt(document.getElementById('remove-page-num').value);
        const pageCount = loadedPdfDoc.getPageCount();
        
        if (pageNum < 1 || pageNum > pageCount) {
            showToast('Invalid page number', 'warning');
            return;
        }
        
        if (pageCount === 1) {
            showToast('Cannot remove the last page', 'warning');
            return;
        }
        
        showLoading();
        
        try {
            loadedPdfDoc.removePage(pageNum - 1);
            
            const newPageCount = loadedPdfDoc.getPageCount();
            document.getElementById('modify-page').max = newPageCount;
            document.getElementById('remove-page-num').max = newPageCount;
            
            // Update preview
            const pdfBytes = await loadedPdfDoc.save();
            renderPdfInIframe(pdfBytes, 'modify-preview-container');
            
            showToast('Page removed successfully!', 'success');
        } catch (error) {
            console.error('Error removing page:', error);
            showToast('Error removing page: ' + error.message, 'error');
        } finally {
            hideLoading();
        }
    });
    
    saveBtn.addEventListener('click', async () => {
        if (!loadedPdfDoc) {
            showToast('Please load a PDF first', 'warning');
            return;
        }
        
        showLoading();
        
        try {
            // If in edit mode and has interactive elements, export them to PDF
            if (isEditMode && pdfEditor && pdfEditor.elements.length > 0) {
                currentPdfBytes = await pdfEditor.exportToCurrentPdf();
            } else {
                currentPdfBytes = await loadedPdfDoc.save();
            }
            
            downloadBtn.disabled = false;
            
            // Update preview
            renderPdfInIframe(currentPdfBytes, 'modify-preview-container');
            
            showToast('PDF saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving PDF:', error);
            showToast('Error saving PDF: ' + error.message, 'error');
        } finally {
            hideLoading();
        }
    });
    
    downloadBtn.addEventListener('click', () => {
        if (currentPdfBytes) {
            downloadPdf(currentPdfBytes, 'modified-document.pdf');
        }
    });
}

// Forms functionality
async function initializeForms() {
    const createFormBtn = document.getElementById('create-form');
    const addTextFieldBtn = document.getElementById('add-textfield');
    const addCheckboxBtn = document.getElementById('add-checkbox');
    const addDropdownBtn = document.getElementById('add-dropdown');
    const addRadioBtn = document.getElementById('add-radio');
    const clearFormBtn = document.getElementById('clear-form');
    const downloadFormBtn = document.getElementById('download-form-pdf');
    
    let formPdfDoc = null;
    let formPdfBytes = null;
    
    // Add text field
    addTextFieldBtn.addEventListener('click', () => {
        const name = document.getElementById('textfield-name').value;
        if (!name.trim()) {
            showToast('Please enter a field name', 'warning');
            return;
        }
        
        const textField = {
            type: 'textfield',
            name: name,
            placeholder: document.getElementById('textfield-placeholder').value,
            x: parseInt(document.getElementById('textfield-x').value),
            y: parseInt(document.getElementById('textfield-y').value),
            width: parseInt(document.getElementById('textfield-width').value),
            height: parseInt(document.getElementById('textfield-height').value)
        };
        
        formElements.push(textField);
        showToast('Text field added!', 'success');
        document.getElementById('textfield-name').value = '';
        document.getElementById('textfield-placeholder').value = '';
    });
    
    // Add checkbox
    addCheckboxBtn.addEventListener('click', () => {
        const name = document.getElementById('checkbox-name').value;
        if (!name.trim()) {
            showToast('Please enter a checkbox name', 'warning');
            return;
        }
        
        const checkbox = {
            type: 'checkbox',
            name: name,
            x: parseInt(document.getElementById('checkbox-x').value),
            y: parseInt(document.getElementById('checkbox-y').value)
        };
        
        formElements.push(checkbox);
        showToast('Checkbox added!', 'success');
        document.getElementById('checkbox-name').value = '';
    });
    
    // Add dropdown
    addDropdownBtn.addEventListener('click', () => {
        const name = document.getElementById('dropdown-name').value;
        const options = document.getElementById('dropdown-options').value;
        
        if (!name.trim() || !options.trim()) {
            showToast('Please enter dropdown name and options', 'warning');
            return;
        }
        
        const dropdown = {
            type: 'dropdown',
            name: name,
            options: options.split(',').map(opt => opt.trim()),
            x: parseInt(document.getElementById('dropdown-x').value),
            y: parseInt(document.getElementById('dropdown-y').value)
        };
        
        formElements.push(dropdown);
        showToast('Dropdown added!', 'success');
        document.getElementById('dropdown-name').value = '';
        document.getElementById('dropdown-options').value = '';
    });
    
    // Add radio group
    addRadioBtn.addEventListener('click', () => {
        const name = document.getElementById('radio-name').value;
        const options = document.getElementById('radio-options').value;
        
        if (!name.trim() || !options.trim()) {
            showToast('Please enter radio group name and options', 'warning');
            return;
        }
        
        const radioGroup = {
            type: 'radio',
            name: name,
            options: options.split(',').map(opt => opt.trim()),
            x: parseInt(document.getElementById('radio-x').value),
            y: parseInt(document.getElementById('radio-y').value)
        };
        
        formElements.push(radioGroup);
        showToast('Radio group added!', 'success');
        document.getElementById('radio-name').value = '';
        document.getElementById('radio-options').value = '';
    });
    
    // Create form
    createFormBtn.addEventListener('click', async () => {
        if (formElements.length === 0) {
            showToast('Please add some form elements first', 'warning');
            return;
        }
        
        showLoading();
        
        try {
            formPdfDoc = await PDFLib.PDFDocument.create();
            const page = formPdfDoc.addPage([595, 842]);
            const form = formPdfDoc.getForm();
            
            // Add title
            const font = await formPdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
            const title = document.getElementById('form-title').value || 'Form';
            
            page.drawText(title, {
                x: 50,
                y: 800,
                size: 24,
                font: font,
                color: PDFLib.rgb(0, 0, 0)
            });
            
            // Add form elements
            for (const element of formElements) {
                switch (element.type) {
                    case 'textfield':
                        const textField = form.createTextField(element.name);
                        textField.setText(element.placeholder || '');
                        textField.addToPage(page, {
                            x: element.x,
                            y: element.y,
                            width: element.width,
                            height: element.height
                        });
                        
                        // Add label
                        page.drawText(`${element.name}:`, {
                            x: element.x,
                            y: element.y + element.height + 5,
                            size: 12,
                            font: font,
                            color: PDFLib.rgb(0, 0, 0)
                        });
                        break;
                        
                    case 'checkbox':
                        const checkbox = form.createCheckBox(element.name);
                        checkbox.addToPage(page, {
                            x: element.x,
                            y: element.y,
                            width: 15,
                            height: 15
                        });
                        
                        // Add label
                        page.drawText(element.name, {
                            x: element.x + 20,
                            y: element.y + 2,
                            size: 12,
                            font: font,
                            color: PDFLib.rgb(0, 0, 0)
                        });
                        break;
                        
                    case 'dropdown':
                        const dropdown = form.createDropdown(element.name);
                        dropdown.addOptions(element.options);
                        dropdown.addToPage(page, {
                            x: element.x,
                            y: element.y,
                            width: 150,
                            height: 20
                        });
                        
                        // Add label
                        page.drawText(`${element.name}:`, {
                            x: element.x,
                            y: element.y + 25,
                            size: 12,
                            font: font,
                            color: PDFLib.rgb(0, 0, 0)
                        });
                        break;
                        
                    case 'radio':
                        const radioGroup = form.createRadioGroup(element.name);
                        element.options.forEach((option, index) => {
                            radioGroup.addOptionToPage(option, page, {
                                x: element.x,
                                y: element.y - (index * 25),
                                width: 15,
                                height: 15
                            });
                            
                            // Add option label
                            page.drawText(option, {
                                x: element.x + 20,
                                y: element.y - (index * 25) + 2,
                                size: 12,
                                font: font,
                                color: PDFLib.rgb(0, 0, 0)
                            });
                        });
                        break;
                }
            }
            
            // Save form PDF
            formPdfBytes = await formPdfDoc.save();
            
            // Render preview
            renderPdfInIframe(formPdfBytes, 'form-preview-container');
            downloadFormBtn.disabled = false;
            
            showToast('Form created successfully!', 'success');
        } catch (error) {
            console.error('Error creating form:', error);
            showToast('Error creating form: ' + error.message, 'error');
        } finally {
            hideLoading();
        }
    });
    
    // Clear form
    clearFormBtn.addEventListener('click', () => {
        formElements = [];
        formPdfDoc = null;
        formPdfBytes = null;
        downloadFormBtn.disabled = true;
        
        // Clear preview
        document.getElementById('form-preview-container').innerHTML = `
            <div class="preview-placeholder">
                <i class="fas fa-wpforms"></i>
                <p>Your form preview will appear here</p>
            </div>
        `;
        
        showToast('Form cleared!', 'info');
    });
    
    // Download form
    downloadFormBtn.addEventListener('click', () => {
        if (formPdfBytes) {
            const title = document.getElementById('form-title').value || 'form';
            downloadPdf(formPdfBytes, `${title}.pdf`);
        }
    });
}

// Tools functionality
async function initializeTools() {
    const mergeFiles = document.getElementById('merge-files');
    const mergeBtn = document.getElementById('merge-pdfs');
    const splitFile = document.getElementById('split-file');
    const splitBtn = document.getElementById('split-pdf');
    const infoFile = document.getElementById('info-file');
    const infoBtn = document.getElementById('get-pdf-info');
    
    // Merge PDFs
    mergeFiles.addEventListener('change', () => {
        mergeBtn.disabled = mergeFiles.files.length < 2;
    });
    
    mergeBtn.addEventListener('click', async () => {
        const files = Array.from(mergeFiles.files);
        if (files.length < 2) {
            showToast('Please select at least 2 PDF files', 'warning');
            return;
        }
        
        showLoading();
        
        try {
            const mergedPdf = await PDFLib.PDFDocument.create();
            
            for (const file of files) {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
                const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                copiedPages.forEach((page) => mergedPdf.addPage(page));
            }
            
            const pdfBytes = await mergedPdf.save();
            
            // Render preview
            renderPdfInIframe(pdfBytes, 'tools-preview-container');
            
            // Download
            downloadPdf(pdfBytes, 'merged-document.pdf');
            
            showToast('PDFs merged successfully!', 'success');
        } catch (error) {
            console.error('Error merging PDFs:', error);
            showToast('Error merging PDFs: ' + error.message, 'error');
        } finally {
            hideLoading();
        }
    });
    
    // Split PDF
    splitFile.addEventListener('change', () => {
        splitBtn.disabled = !splitFile.files[0];
    });
    
    splitBtn.addEventListener('click', async () => {
        const file = splitFile.files[0];
        if (!file) {
            showToast('Please select a PDF file', 'warning');
            return;
        }
        
        const startPage = parseInt(document.getElementById('split-start').value);
        const endPage = parseInt(document.getElementById('split-end').value);
        
        if (!startPage || !endPage || startPage > endPage) {
            showToast('Please enter valid page numbers', 'warning');
            return;
        }
        
        showLoading();
        
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
            const totalPages = pdf.getPageCount();
            
            if (startPage < 1 || endPage > totalPages) {
                throw new Error(`Invalid page range. PDF has ${totalPages} pages.`);
            }
            
            const newPdf = await PDFLib.PDFDocument.create();
            const pageIndices = [];
            for (let i = startPage - 1; i < endPage; i++) {
                pageIndices.push(i);
            }
            
            const copiedPages = await newPdf.copyPages(pdf, pageIndices);
            copiedPages.forEach((page) => newPdf.addPage(page));
            
            const pdfBytes = await newPdf.save();
            
            // Render preview
            renderPdfInIframe(pdfBytes, 'tools-preview-container');
            
            // Download
            downloadPdf(pdfBytes, `split-pages-${startPage}-${endPage}.pdf`);
            
            showToast('PDF split successfully!', 'success');
        } catch (error) {
            console.error('Error splitting PDF:', error);
            showToast('Error splitting PDF: ' + error.message, 'error');
        } finally {
            hideLoading();
        }
    });
    
    // Get PDF info
    infoFile.addEventListener('change', () => {
        infoBtn.disabled = !infoFile.files[0];
    });
    
    infoBtn.addEventListener('click', async () => {
        const file = infoFile.files[0];
        if (!file) {
            showToast('Please select a PDF file', 'warning');
            return;
        }
        
        showLoading();
        
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
            
            const pageCount = pdf.getPageCount();
            const title = pdf.getTitle() || 'Not set';
            const author = pdf.getAuthor() || 'Not set';
            const subject = pdf.getSubject() || 'Not set';
            const creator = pdf.getCreator() || 'Not set';
            const producer = pdf.getProducer() || 'Not set';
            const creationDate = pdf.getCreationDate() || 'Not set';
            const modificationDate = pdf.getModificationDate() || 'Not set';
            
            const infoHtml = `
                <div class="pdf-info">
                    <h3>PDF Information</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>File Name:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${file.name}</td></tr>
                        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>File Size:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${(file.size / 1024 / 1024).toFixed(2)} MB</td></tr>
                        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Pages:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${pageCount}</td></tr>
                        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Title:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${title}</td></tr>
                        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Author:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${author}</td></tr>
                        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Subject:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${subject}</td></tr>
                        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Creator:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${creator}</td></tr>
                        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Producer:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${producer}</td></tr>
                        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Created:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${creationDate}</td></tr>
                        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Modified:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${modificationDate}</td></tr>
                    </table>
                </div>
            `;
            
            document.getElementById('tools-preview-container').innerHTML = infoHtml;
            
            showToast('PDF information extracted successfully!', 'success');
        } catch (error) {
            console.error('Error getting PDF info:', error);
            showToast('Error getting PDF info: ' + error.message, 'error');
        } finally {
            hideLoading();
        }
    });
}

// Interactive PDF Editor
class InteractivePdfEditor {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.elements = [];
        this.selectedElement = null;
        this.currentTool = 'select';
        this.isDragging = false;
        this.isResizing = false;
        this.dragStart = { x: 0, y: 0 };
        this.pdfPage = null;
        this.scale = 1;
        this.copiedElement = null;
        this.extractedTextElements = [];
        this.textOverlays = [];
        this.maskedTextElements = new Set();
        this.pdfPageData = null;
    }

    initialize() {
        this.canvas = document.getElementById('pdf-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.setupEventListeners();
        this.updateToolbar();
    }

    async extractTextElements(pdfPage) {
        try {
            const textContent = await pdfPage.getTextContent();
            const viewport = pdfPage.getViewport({ scale: this.scale });
            
            this.extractedTextElements = textContent.items.map((item, index) => {
                const transform = item.transform;
                const x = transform[4];
                const y = viewport.height - transform[5]; // Convert to canvas coordinates
                const fontSize = Math.abs(transform[3]) || 12;
                
                return {
                    id: `extracted_${index}`,
                    text: item.str.trim(),
                    x: x,
                    y: y - fontSize, // Adjust for text baseline
                    width: item.width || 100,
                    height: fontSize,
                    fontSize: fontSize,
                    fontName: item.fontName || 'Arial',
                    isExtracted: true,
                    originalItem: item
                };
            }).filter(item => item.text.length > 0); // Filter out empty text
            
            return this.extractedTextElements;
        } catch (error) {
            console.error('Error extracting text:', error);
            return [];
        }
    }

    createTextOverlays() {
        // Remove existing overlays
        this.clearTextOverlays();
        
        if (this.currentTool !== 'edit-text') return;
        
        const canvasContainer = this.canvas.parentElement;
        
        this.extractedTextElements.forEach(textElement => {
            if (this.maskedTextElements.has(textElement.id)) return;
            
            const overlay = document.createElement('div');
            overlay.className = 'text-overlay';
            
            // Calculate position accounting for container padding and canvas centering
            const containerStyle = window.getComputedStyle(canvasContainer);
            const paddingLeft = parseFloat(containerStyle.paddingLeft);
            const paddingTop = parseFloat(containerStyle.paddingTop);
            
            // The canvas is centered, so we need to account for that
            const containerWidth = canvasContainer.clientWidth - paddingLeft * 2;
            const canvasWidth = this.canvas.clientWidth;
            const xOffset = paddingLeft + (containerWidth - canvasWidth) / 2;
            
            overlay.style.cssText = `
                position: absolute;
                left: ${xOffset + textElement.x}px;
                top: ${paddingTop + textElement.y}px;
                width: ${textElement.width}px;
                height: ${textElement.height}px;
                cursor: pointer;
                background: rgba(100, 102, 241, 0.1);
                border: 1px solid rgba(100, 102, 241, 0.3);
                opacity: 0;
                transition: opacity 0.2s ease;
                z-index: 10;
                pointer-events: auto;
            `;
            
            overlay.addEventListener('mouseenter', () => {
                overlay.style.opacity = '1';
            });
            
            overlay.addEventListener('mouseleave', () => {
                overlay.style.opacity = '0';
            });
            
            overlay.addEventListener('click', (e) => {
                e.stopPropagation();
                this.convertTextToEditableElement(textElement);
            });
            
            canvasContainer.appendChild(overlay);
            this.textOverlays.push(overlay);
        });
    }

    clearTextOverlays() {
        this.textOverlays.forEach(overlay => {
            if (overlay.parentElement) {
                overlay.parentElement.removeChild(overlay);
            }
        });
        this.textOverlays = [];
    }

    convertTextToEditableElement(textElement) {
        // Create editable element
        const editableElement = {
            id: Date.now(),
            type: 'text',
            x: textElement.x,
            y: textElement.y,
            text: textElement.text,
            fontSize: textElement.fontSize,
            color: '#000000',
            width: textElement.width,
            height: textElement.height,
            isReplacement: true,
            replacesId: textElement.id
        };
        
        // Add to elements and select
        this.elements.push(editableElement);
        this.selectElement(editableElement);
        
        // Mask original text
        this.maskedTextElements.add(textElement.id);
        
        // Switch to select tool
        this.setTool('select');
        
        // Redraw and update overlays
        this.redraw();
        this.createTextOverlays();
        
        showToast('Text converted to editable element', 'success');
    }

    setupEventListeners() {
        // Toolbar buttons
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setTool(e.currentTarget.dataset.tool);
            });
        });

        // Canvas events
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('click', this.handleClick.bind(this));

        // Delete, copy, paste
        document.getElementById('delete-element').addEventListener('click', this.deleteSelected.bind(this));
        document.getElementById('copy-element').addEventListener('click', this.copySelected.bind(this));
        document.getElementById('paste-element').addEventListener('click', this.pasteElement.bind(this));

        // Properties panel
        document.getElementById('apply-properties').addEventListener('click', this.applyProperties.bind(this));

        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }

    setTool(tool) {
        this.currentTool = tool;
        this.updateToolbar();
        this.updateCanvasCursor();
        this.clearSelection();
        
        // Handle edit-text tool
        if (tool === 'edit-text') {
            this.createTextOverlays();
            showToast('Click on existing text to edit it', 'info');
        } else {
            this.clearTextOverlays();
        }
    }

    updateToolbar() {
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === this.currentTool);
        });
    }

    updateCanvasCursor() {
        this.canvas.className = `pdf-canvas ${this.currentTool}-mode`;
    }

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.scale;
        const y = (e.clientY - rect.top) / this.scale;

        this.dragStart = { x, y };

        if (this.currentTool === 'select') {
            const element = this.getElementAt(x, y);
            if (element) {
                this.selectElement(element);
                this.isDragging = true;
                element.dragOffset = {
                    x: x - element.x,
                    y: y - element.y
                };
            } else {
                this.clearSelection();
            }
        }
    }

    handleMouseMove(e) {
        if (!this.isDragging || this.currentTool !== 'select') return;

        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.scale;
        const y = (e.clientY - rect.top) / this.scale;

        if (this.selectedElement) {
            this.selectedElement.x = x - this.selectedElement.dragOffset.x;
            this.selectedElement.y = y - this.selectedElement.dragOffset.y;
            this.redraw();
            this.updatePropertiesPanel();
        }
    }

    handleMouseUp(e) {
        this.isDragging = false;
        this.isResizing = false;
    }

    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.scale;
        const y = (e.clientY - rect.top) / this.scale;

        if (this.currentTool === 'text') {
            this.addTextElement(x, y);
        } else if (this.currentTool === 'shape') {
            this.addShapeElement(x, y);
        } else if (this.currentTool === 'image') {
            this.addImageElement(x, y);
        }
    }

    handleKeyDown(e) {
        if (e.key === 'Delete' && this.selectedElement) {
            this.deleteSelected();
        } else if (e.ctrlKey && e.key === 'c' && this.selectedElement) {
            this.copySelected();
        } else if (e.ctrlKey && e.key === 'v' && this.copiedElement) {
            this.pasteElement();
        }
    }

    addTextElement(x, y) {
        const element = {
            id: Date.now(),
            type: 'text',
            x: x,
            y: y,
            text: 'New Text',
            fontSize: 12,
            color: '#000000',
            width: 100,
            height: 20
        };
        this.elements.push(element);
        this.selectElement(element);
        this.redraw();
        showToast('Text element added', 'success');
    }

    addShapeElement(x, y) {
        const element = {
            id: Date.now(),
            type: 'shape',
            x: x,
            y: y,
            width: 100,
            height: 50,
            shapeType: 'rectangle',
            fillColor: '#3498db',
            borderColor: '#2c3e50'
        };
        this.elements.push(element);
        this.selectElement(element);
        this.redraw();
        showToast('Shape element added', 'success');
    }

    addImageElement(x, y) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        const element = {
                            id: Date.now(),
                            type: 'image',
                            x: x,
                            y: y,
                            width: Math.min(img.width, 200),
                            height: Math.min(img.height, 200),
                            imageData: event.target.result,
                            image: img
                        };
                        this.elements.push(element);
                        this.selectElement(element);
                        this.redraw();
                        showToast('Image element added', 'success');
                    };
                    img.src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    }

    getElementAt(x, y) {
        // Check elements in reverse order (top to bottom)
        for (let i = this.elements.length - 1; i >= 0; i--) {
            const element = this.elements[i];
            if (x >= element.x && x <= element.x + element.width &&
                y >= element.y && y <= element.y + element.height) {
                return element;
            }
        }
        return null;
    }

    selectElement(element) {
        this.selectedElement = element;
        this.updatePropertiesPanel();
        this.updateActionButtons();
        this.redraw();
    }

    clearSelection() {
        this.selectedElement = null;
        this.hidePropertiesPanel();
        this.updateActionButtons();
        this.redraw();
        
        // Clear text overlays if not in edit-text mode
        if (this.currentTool !== 'edit-text') {
            this.clearTextOverlays();
        }
    }

    deleteSelected() {
        if (this.selectedElement) {
            const index = this.elements.indexOf(this.selectedElement);
            if (index > -1) {
                // If this was a text replacement, restore the original text
                if (this.selectedElement.isReplacement && this.selectedElement.replacesId) {
                    this.maskedTextElements.delete(this.selectedElement.replacesId);
                }
                
                this.elements.splice(index, 1);
                this.clearSelection();
                this.redraw();
                
                // Update text overlays if in edit-text mode
                if (this.currentTool === 'edit-text') {
                    this.createTextOverlays();
                }
                
                showToast('Element deleted', 'success');
            }
        }
    }

    copySelected() {
        if (this.selectedElement) {
            this.copiedElement = { ...this.selectedElement };
            document.getElementById('paste-element').disabled = false;
            showToast('Element copied', 'success');
        }
    }

    pasteElement() {
        if (this.copiedElement) {
            const newElement = {
                ...this.copiedElement,
                id: Date.now(),
                x: this.copiedElement.x + 20,
                y: this.copiedElement.y + 20
            };
            this.elements.push(newElement);
            this.selectElement(newElement);
            this.redraw();
            showToast('Element pasted', 'success');
        }
    }

    updateActionButtons() {
        const hasSelection = !!this.selectedElement;
        document.getElementById('delete-element').disabled = !hasSelection;
        document.getElementById('copy-element').disabled = !hasSelection;
    }

    updatePropertiesPanel() {
        if (!this.selectedElement) {
            this.hidePropertiesPanel();
            return;
        }

        const panel = document.getElementById('properties-panel');
        panel.style.display = 'block';

        // Hide all property groups
        document.querySelectorAll('.property-group').forEach(group => {
            group.style.display = 'none';
        });

        // Show relevant property group
        const element = this.selectedElement;
        if (element.type === 'text') {
            document.getElementById('text-properties').style.display = 'block';
            document.getElementById('prop-text-content').value = element.text;
            document.getElementById('prop-font-size').value = element.fontSize;
            document.getElementById('prop-text-color').value = element.color;
        } else if (element.type === 'image') {
            document.getElementById('image-properties').style.display = 'block';
            document.getElementById('prop-image-width').value = element.width;
            document.getElementById('prop-image-height').value = element.height;
        } else if (element.type === 'shape') {
            document.getElementById('shape-properties').style.display = 'block';
            document.getElementById('prop-shape-width').value = element.width;
            document.getElementById('prop-shape-height').value = element.height;
            document.getElementById('prop-shape-fill').value = element.fillColor;
            document.getElementById('prop-shape-border').value = element.borderColor;
        }

        // Update position properties
        document.getElementById('prop-x').value = Math.round(element.x);
        document.getElementById('prop-y').value = Math.round(element.y);
    }

    hidePropertiesPanel() {
        document.getElementById('properties-panel').style.display = 'none';
    }

    applyProperties() {
        if (!this.selectedElement) return;

        const element = this.selectedElement;

        // Update position
        element.x = parseInt(document.getElementById('prop-x').value);
        element.y = parseInt(document.getElementById('prop-y').value);

        // Update type-specific properties
        if (element.type === 'text') {
            element.text = document.getElementById('prop-text-content').value;
            element.fontSize = parseInt(document.getElementById('prop-font-size').value);
            element.color = document.getElementById('prop-text-color').value;
            // Recalculate text dimensions
            this.ctx.font = `${element.fontSize}px Arial`;
            const metrics = this.ctx.measureText(element.text);
            element.width = metrics.width;
            element.height = element.fontSize * 1.2;
        } else if (element.type === 'image') {
            element.width = parseInt(document.getElementById('prop-image-width').value);
            element.height = parseInt(document.getElementById('prop-image-height').value);
        } else if (element.type === 'shape') {
            element.width = parseInt(document.getElementById('prop-shape-width').value);
            element.height = parseInt(document.getElementById('prop-shape-height').value);
            element.fillColor = document.getElementById('prop-shape-fill').value;
            element.borderColor = document.getElementById('prop-shape-border').value;
        }

        this.redraw();
        showToast('Properties applied', 'success');
    }

    redraw() {
        if (!this.ctx || !this.pdfPage) return;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw PDF page
        this.ctx.drawImage(this.pdfPage, 0, 0);

        // Mask original text that has been replaced
        this.maskOriginalText();

        // Draw elements
        this.elements.forEach(element => {
            this.drawElement(element);
        });

        // Draw selection
        if (this.selectedElement) {
            this.drawSelection(this.selectedElement);
        }
    }

    maskOriginalText() {
        this.extractedTextElements.forEach(textElement => {
            if (this.maskedTextElements.has(textElement.id)) {
                this.ctx.save();
                this.ctx.fillStyle = '#ffffff';
                this.ctx.fillRect(
                    textElement.x - 2,
                    textElement.y - 2,
                    textElement.width + 4,
                    textElement.height + 4
                );
                this.ctx.restore();
            }
        });
    }

    drawElement(element) {
        this.ctx.save();

        if (element.type === 'text') {
            this.ctx.font = `${element.fontSize}px Arial`;
            this.ctx.fillStyle = element.color;
            this.ctx.fillText(element.text, element.x, element.y + element.fontSize);
        } else if (element.type === 'image' && element.image) {
            this.ctx.drawImage(element.image, element.x, element.y, element.width, element.height);
        } else if (element.type === 'shape') {
            this.ctx.fillStyle = element.fillColor;
            this.ctx.strokeStyle = element.borderColor;
            this.ctx.lineWidth = 2;

            if (element.shapeType === 'rectangle') {
                this.ctx.fillRect(element.x, element.y, element.width, element.height);
                this.ctx.strokeRect(element.x, element.y, element.width, element.height);
            } else if (element.shapeType === 'circle') {
                const centerX = element.x + element.width / 2;
                const centerY = element.y + element.height / 2;
                const radius = Math.min(element.width, element.height) / 2;
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
                this.ctx.fill();
                this.ctx.stroke();
            }
        }

        this.ctx.restore();
    }

    drawSelection(element) {
        this.ctx.save();
        this.ctx.strokeStyle = '#6366f1';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeRect(element.x - 2, element.y - 2, element.width + 4, element.height + 4);
        this.ctx.restore();
    }

    async loadPdfPage(pdfDoc, pageIndex = 0) {
        try {
            const page = await pdfDoc.getPage(pageIndex + 1);
            this.pdfPageData = page;
            const viewport = page.getViewport({ scale: 1.5 });
            
            this.canvas.width = viewport.width;
            this.canvas.height = viewport.height;
            this.scale = 1.5;

            const renderContext = {
                canvasContext: this.ctx,
                viewport: viewport
            };

            await page.render(renderContext).promise;
            
            // Create a copy for redrawing
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = this.canvas.width;
            tempCanvas.height = this.canvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(this.canvas, 0, 0);
            this.pdfPage = tempCanvas;

            // Extract text elements
            await this.extractTextElements(page);
            
            this.redraw();
        } catch (error) {
            console.error('Error loading PDF page:', error);
            showToast('Error loading PDF page', 'error');
        }
    }

    async exportToCurrentPdf() {
        if (!loadedPdfDoc || this.elements.length === 0) return;

        try {
            // Get current page
            const pages = loadedPdfDoc.getPages();
            const page = pages[0]; // For now, just work with first page

            // First, mask original text that has been replaced
            this.maskedTextElements.forEach(maskedId => {
                const originalElement = this.extractedTextElements.find(el => el.id === maskedId);
                if (originalElement) {
                    // Draw white rectangle to mask original text
                    page.drawRectangle({
                        x: originalElement.x / this.scale,
                        y: (this.canvas.height - originalElement.y - originalElement.height) / this.scale,
                        width: (originalElement.width + 4) / this.scale,
                        height: (originalElement.height + 4) / this.scale,
                        color: PDFLib.rgb(1, 1, 1), // White
                        borderWidth: 0
                    });
                }
            });

            // Add elements to PDF
            for (const element of this.elements) {
                if (element.type === 'text') {
                    const font = await loadedPdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
                    const rgb = this.hexToRgb(element.color);
                    
                    page.drawText(element.text, {
                        x: element.x / this.scale,
                        y: (this.canvas.height - element.y - element.height) / this.scale,
                        size: element.fontSize,
                        font: font,
                        color: PDFLib.rgb(rgb.r, rgb.g, rgb.b)
                    });
                } else if (element.type === 'shape') {
                    const fillRgb = this.hexToRgb(element.fillColor);
                    const borderRgb = this.hexToRgb(element.borderColor);
                    
                    if (element.shapeType === 'rectangle') {
                        page.drawRectangle({
                            x: element.x / this.scale,
                            y: (this.canvas.height - element.y - element.height) / this.scale,
                            width: element.width / this.scale,
                            height: element.height / this.scale,
                            color: PDFLib.rgb(fillRgb.r, fillRgb.g, fillRgb.b),
                            borderColor: PDFLib.rgb(borderRgb.r, borderRgb.g, borderRgb.b),
                            borderWidth: 2
                        });
                    }
                }
            }

            return await loadedPdfDoc.save();
        } catch (error) {
            console.error('Error exporting to PDF:', error);
            throw error;
        }
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16) / 255,
            g: parseInt(result[2], 16) / 255,
            b: parseInt(result[3], 16) / 255
        } : { r: 0, g: 0, b: 0 };
    }
}

// Initialize interactive editor
let pdfEditor = null;

function initializeInteractiveEditor() {
    pdfEditor = new InteractivePdfEditor();
    
    // Mode toggle button
    const modeToggle = document.getElementById('editor-mode-toggle');
    modeToggle.disabled = true; // Disabled until PDF is loaded
    
    modeToggle.addEventListener('click', () => {
        isEditMode = !isEditMode;
        
        if (isEditMode) {
            document.getElementById('modify-preview-container').style.display = 'none';
            document.getElementById('interactive-editor').style.display = 'block';
            modeToggle.innerHTML = '<i class="fas fa-eye"></i> Preview Mode';
            
            if (currentPdfBytes && !pdfEditor.canvas) {
                pdfEditor.initialize();
                // Convert the loaded PDF to use PDF.js for canvas rendering
                renderPdfToCanvas();
            } else if (pdfEditor.canvas) {
                pdfEditor.redraw();
            }
        } else {
            document.getElementById('modify-preview-container').style.display = 'block';
            document.getElementById('interactive-editor').style.display = 'none';
            modeToggle.innerHTML = '<i class="fas fa-edit"></i> Edit Mode';
        }
    });
}

async function renderPdfToCanvas() {
    if (!currentPdfBytes) return;
    
    try {
        // Load PDF with PDF.js
        const pdf = await pdfjsLib.getDocument({ data: currentPdfBytes }).promise;
        if (pdfEditor) {
            await pdfEditor.loadPdfPage(pdf, 0);
            showToast('PDF loaded in edit mode', 'success');
        }
    } catch (error) {
        console.error('Error rendering PDF to canvas:', error);
        showToast('Error loading PDF for editing', 'error');
    }
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    initializeTabs();
    initializeCreatePdf();
    initializeModifyPdf();
    initializeForms();
    initializeTools();
    initializeInteractiveEditor();
    
    showToast('PDF Editor Pro loaded successfully!', 'success');
});
