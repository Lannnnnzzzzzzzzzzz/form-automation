const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const { JWT } = require('google-auth-library');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Google Forms API with Service Account
async function getGoogleFormsClient() {
    try {
        // Get service account credentials from environment variable
        const serviceAccountJson = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
        
        // Create JWT client
        const authClient = new JWT({
            email: serviceAccountJson.client_email,
            key: serviceAccountJson.private_key,
            scopes: ['https://www.googleapis.com/auth/forms.body']
        });
        
        return google.forms({
            version: 'v1',
            auth: authClient,
        });
    } catch (error) {
        console.error('Error initializing Google Forms client:', error);
        throw new Error('Failed to initialize Google Forms client');
    }
}

// API endpoint to push questions to Google Form
app.post('/api/push-to-form', async (req, res) => {
    try {
        const { formId, questions, shuffle } = req.body;
        
        if (!formId || !questions || !Array.isArray(questions)) {
            return res.status(400).json({ error: 'Invalid request parameters' });
        }
        
        const forms = await getGoogleFormsClient();
        
        // Get form info
        try {
            await forms.forms.get({ formId });
        } catch (error) {
            return res.status(404).json({ error: 'Google Form not found or access denied' });
        }
        
        // Create batch update requests
        const requests = [];
        
        questions.forEach((question, index) => {
            // Create request for each question
            const request = {
                createItem: {
                    item: {
                        title: question.text,
                        questionItem: {
                            question: {
                                required: true,
                                choiceQuestion: {
                                    type: 'RADIO',
                                    options: question.options.map(option => ({ value: option })),
                                    shuffle: shuffle || false
                                }
                            }
                        }
                    },
                    location: {
                        index: index
                    }
                }
            };
            
            requests.push(request);
        });
        
        // Batch update the form
        const updateResponse = await forms.forms.batchUpdate({
            formId,
            requestBody: {
                requests,
                includeFormInResponse: false
            }
        });
        
        const createdItems = updateResponse.data.replies.filter(reply => reply.createItem);
        
        res.json({
            success: true,
            message: `Successfully added ${createdItems.length} questions to the Google Form`,
            count: createdItems.length
        });
    } catch (error) {
        console.error('Error pushing to form:', error);
        res.status(500).json({ error: 'Failed to push questions to Google Form' });
    }
});

module.exports = app;
