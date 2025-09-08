const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const { JWT } = require('google-auth-library');

const app = express();
app.use(cors());

// Initialize Google Forms API with Service Account
async function getGoogleFormsClient() {
    try {
        // Get service account credentials from environment variable
        const serviceAccountJson = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
        
        // Create JWT client
        const authClient = new JWT({
            email: serviceAccountJson.client_email,
            key: serviceAccountJson.private_key,
            scopes: ['https://www.googleapis.com/auth/forms.body.readonly']
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

// API endpoint to get Google Form info
app.get('/api/get-form-info/:formId', async (req, res) => {
    try {
        const { formId } = req.params;
        
        if (!formId) {
            return res.status(400).json({ error: 'Form ID is required' });
        }
        
        const forms = await getGoogleFormsClient();
        
        // Get form info
        const form = await forms.forms.get({ formId });
        
        res.json({
            title: form.data.info.title,
            description: form.data.info.description,
            itemCount: form.data.items.length
        });
    } catch (error) {
        console.error('Error getting form info:', error);
        res.status(500).json({ error: 'Failed to get form info' });
    }
});

module.exports = app;
