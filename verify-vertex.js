
const { VertexAI } = require('@google-cloud/vertexai');
const path = require('path');
const fs = require('fs');

// Load env vars
const keyFilename = './producthive-462420-e34a249f38c3.json';
const projectId = 'producthive-462420';
const location = 'us-central1';

async function verify() {
    console.log('--- Verifying Google Cloud Vertex AI access ---');

    if (!fs.existsSync(keyFilename)) {
        console.error(`❌ Error: Service account file not found at ${keyFilename}`);
        return;
    }
    console.log('✅ Service account file found');

    try {
        const vertexAI = new VertexAI({ project: projectId, location: location, keyFilename: keyFilename });
        const model = vertexAI.getGenerativeModel({ model: 'gemini-1.5-pro-001' });

        console.log('Attempting to generate content...');
        const result = await model.generateContent('Hello, are you working? Respond with "Yes, I am working."');
        const response = await result.response;
        const text = response.candidates[0].content.parts[0].text;

        console.log('✅ Success! Model output:');
        console.log(text);
    } catch (error) {
        console.error('❌ Verification Failed:');
        console.error(error.message);
        if (error.stack) console.error(error.stack);
    }
}

verify();
