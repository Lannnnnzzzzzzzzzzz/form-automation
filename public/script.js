document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');
    const fileInfo = document.getElementById('file-info');
    const fileName = document.getElementById('file-name');
    const removeFile = document.getElementById('remove-file');
    const uploadLoading = document.getElementById('upload-loading');
    const previewSection = document.getElementById('preview-section');
    const formSection = document.getElementById('form-section');
    const statusSection = document.getElementById('status-section');
    const maxOptions = document.getElementById('max-options');
    const questionsTable = document.getElementById('questions-table');
    const formIdInput = document.getElementById('form-id');
    const shuffleOptions = document.getElementById('shuffle-options');
    const pushToFormBtn = document.getElementById('push-to-form');
    const statusBox = document.getElementById('status-box');
    
    let uploadedFile = null;
    let parsedQuestions = [];
    
    // File upload handlers
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        dropArea.classList.add('drag-over');
    }
    
    function unhighlight() {
        dropArea.classList.remove('drag-over');
    }
    
    dropArea.addEventListener('drop', handleDrop, false);
    fileInput.addEventListener('change', handleFileSelect, false);
    removeFile.addEventListener('click', resetFileUpload, false);
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }
    
    function handleFileSelect() {
        handleFiles(this.files);
    }
    
    function handleFiles(files) {
        if (files.length) {
            uploadedFile = files[0];
            fileName.textContent = uploadedFile.name;
            fileInfo.classList.add('hidden');
            uploadLoading.classList.remove('hidden');
            parseFile(uploadedFile);
        }
    }
    
    function resetFileUpload() {
        uploadedFile = null;
        fileInput.value = '';
        fileInfo.classList.add('hidden');
        uploadLoading.classList.add('hidden');
        previewSection.classList.add('hidden');
        formSection.classList.add('hidden');
        statusSection.classList.add('hidden');
    }
    
    // Parse file
    async function parseFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const response = await fetch('/api/parse-file', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('Failed to parse file');
            }
            
            const data = await response.json();
            parsedQuestions = data.questions;
            
            // Hide loading and show file info
            uploadLoading.classList.add('hidden');
            fileInfo.classList.remove('hidden');
            
            displayQuestions();
            
            // Show preview section
            previewSection.classList.remove('hidden');
            
            // Auto-select max options based on parsed data
            const maxOptionCount = Math.max(...parsedQuestions.map(q => q.options.length));
            if (maxOptionCount === 5) {
                maxOptions.value = '5';
            } else {
                maxOptions.value = '4';
            }
            
            // Show form section
            formSection.classList.remove('hidden');
        } catch (error) {
            console.error('Error parsing file:', error);
            uploadLoading.classList.add('hidden');
            alert('Error parsing file. Please try again.');
        }
    }
    
    // Display questions in table
    function displayQuestions() {
        questionsTable.innerHTML = '';
        
        parsedQuestions.forEach((question, index) => {
            const row = document.createElement('tr');
            
            // Number cell
            const numberCell = document.createElement('td');
            numberCell.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-500';
            numberCell.textContent = index + 1;
            row.appendChild(numberCell);
            
            // Question cell
            const questionCell = document.createElement('td');
            questionCell.className = 'px-6 py-4 text-sm text-gray-900';
            questionCell.textContent = question.text;
            row.appendChild(questionCell);
            
            // Options cell
            const optionsCell = document.createElement('td');
            optionsCell.className = 'px-6 py-4 text-sm text-gray-500';
            
            const optionsList = document.createElement('div');
            optionsList.className = 'flex flex-wrap gap-1';
            
            question.options.forEach((option, i) => {
                const optionTag = document.createElement('span');
                optionTag.className = 'bg-gray-100 rounded-full px-2 py-1 text-xs';
                optionTag.textContent = `${String.fromCharCode(65 + i)}. ${option}`;
                optionsList.appendChild(optionTag);
            });
            
            optionsCell.appendChild(optionsList);
            row.appendChild(optionsCell);
            
            questionsTable.appendChild(row);
        });
    }
    
    // Update max options
    maxOptions.addEventListener('change', function() {
        displayQuestions();
    });
    
    // Push to form
    pushToFormBtn.addEventListener('click', async function() {
        const formId = formIdInput.value.trim();
        
        if (!formId) {
            alert('Please enter Google Form ID or link');
            return;
        }
        
        // Extract form ID if URL is provided
        let extractedFormId = formId;
        const urlMatch = formId.match(/\/forms\/d\/([a-zA-Z0-9_-]+)/);
        if (urlMatch) {
            extractedFormId = urlMatch[1];
        }
        
        // Prepare data
        const maxOptionCount = parseInt(maxOptions.value);
        const shouldShuffle = shuffleOptions.checked;
        
        // Filter questions based on max options
        const filteredQuestions = parsedQuestions.map(q => ({
            text: q.text,
            options: q.options.slice(0, maxOptionCount)
        }));
        
        // Show status section
        statusSection.classList.remove('hidden');
        statusBox.innerHTML = `
            <div class="flex items-center">
                <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-3"></div>
                <span class="text-gray-700">Mengirim soal ke Google Form...</span>
            </div>
        `;
        
        try {
            const response = await fetch('/api/push-to-form', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    formId: extractedFormId,
                    questions: filteredQuestions,
                    shuffle: shouldShuffle
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                statusBox.className = 'rounded-lg p-4 bg-green-50 border border-green-200';
                statusBox.innerHTML = `
                    <div class="flex items-center">
                        <i class="fas fa-check-circle text-green-500 text-xl mr-3"></i>
                        <div>
                            <p class="text-green-800 font-medium">Berhasil!</p>
                            <p class="text-green-700">${data.message}</p>
                        </div>
                    </div>
                `;
            } else {
                throw new Error(data.error || 'Failed to push to form');
            }
        } catch (error) {
            console.error('Error pushing to form:', error);
            statusBox.className = 'rounded-lg p-4 bg-red-50 border border-red-200';
            statusBox.innerHTML = `
                <div class="flex items-center">
                    <i class="fas fa-exclamation-circle text-red-500 text-xl mr-3"></i>
                    <div>
                        <p class="text-red-800 font-medium">Gagal!</p>
                        <p class="text-red-700">${error.message}</p>
                    </div>
                </div>
            `;
        }
    });
});
