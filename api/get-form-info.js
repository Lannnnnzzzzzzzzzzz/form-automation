const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const { JWT } = require('google-auth-library');

const app = express();
app.use(cors());

// Initialize Google Forms API with Service Account
async function getGoogleFormsClient() {
    try {
        // Create service account credentials from individual environment variables
        const serviceAccountJson = {
            type: process.env.GOOGLE_TYPE || "service_account",
            project_id: process.env.GOOGLE_PROJECT_ID,
            private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
            private_key: process.env.GOOGLE_PRIVATE_KEY,
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            client_id: process.env.GOOGLE_CLIENT_ID,
            auth_uri: process.env.GOOGLE_AUTH_URI || "https://accounts.google.com/o/oauth2/auth",
            token_uri: process.env.GOOGLE_TOKEN_URI || "https://oauth2.googleapis.com/token",
            auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_X509_CERT_URL || "https://www.googleapis.com/oauth2/v1/certs",
            client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL
        };
        
        // Validate required fields
        if (!serviceAccountJson.project_id || !serviceAccountJson.private_key || !serviceAccountJson.client_email) {
            throw new Error('Missing required Google service account credentials');
        }
        
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
