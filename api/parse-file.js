const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const cors = require('cors');

const app = express();
app.use(cors());

// Configure multer for file upload
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf' || 
            file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            file.mimetype === 'application/msword') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF and Word documents are allowed'));
        }
    }
});

// Function to parse questions from text
function parseQuestionsFromText(text) {
    // Clean the text
    const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Split into lines
    const lines = cleanText.split('\n').filter(line => line.trim() !== '');
    
    const questions = [];
    let currentQuestion = null;
    let questionNumber = 1;
    
    // Regular expression to match question numbers (e.g., "1.", "2.", etc.)
    const questionRegex = /^(\d+)[.)]\s*(.*)$/;
    
    // Regular expression to match options (e.g., "A.", "B.", etc.)
    const optionRegex = /^([A-E])[.)]\s*(.*)$/;
    
    for (const line of lines) {
        // Check if it's a new question
        const questionMatch = line.match(questionRegex);
        if (questionMatch) {
            // Save previous question if exists
            if (currentQuestion) {
                questions.push(currentQuestion);
            }
            
            // Start new question
            currentQuestion = {
                text: questionMatch[2],
                options: []
            };
            
            questionNumber = parseInt(questionMatch[1]);
            continue;
        }
        
        // Check if it's an option
        if (currentQuestion) {
            const optionMatch = line.match(optionRegex);
            if (optionMatch) {
                currentQuestion.options.push(optionMatch[2]);
            } else {
                // If it's not an option, append to the question text
                currentQuestion.text += ' ' + line;
            }
        }
    }
    
    // Add the last question
    if (currentQuestion) {
        questions.push(currentQuestion);
    }
    
    return questions;
}

// API endpoint to parse file
app.post('/api/parse-file', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        let text = '';
        
        if (req.file.mimetype === 'application/pdf') {
            // Parse PDF
            const data = await pdfParse(req.file.buffer);
            text = data.text;
        } else {
            // Parse Word document
            const result = await mammoth.extractRawText({ buffer: req.file.buffer });
            text = result.value;
        }
        
        // Parse questions from text
        const questions = parseQuestionsFromText(text);
        
        if (questions.length === 0) {
            return res.status(400).json({ error: 'No questions found in the document' });
        }
        
        res.json({ questions });
    } catch (error) {
        console.error('Error parsing file:', error);
        res.status(500).json({ error: 'Failed to parse file' });
    }
});

module.exports = app;
