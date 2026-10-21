const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
// Use 127.0.0.1 to prevent IPv6 (::1) resolution mismatch on Windows
const FLASK_BACKEND_URL = process.env.FLASK_BACKEND_URL || 'http://127.0.0.1:5000';

app.use(cors());
app.use(express.json());

// Proxy API requests to Python Flask backend
app.use('/api', async (req, res) => {
    // req.url contains the subpath after /api (e.g., /todos, /status)
    const targetUrl = `${FLASK_BACKEND_URL}/api${req.url}`;

    try {
        const fetchOptions = {
            method: req.method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
            fetchOptions.body = JSON.stringify(req.body || {});
        }

        const response = await fetch(targetUrl, fetchOptions);
        const data = await response.text();

        res.status(response.status);
        res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json');
        return res.send(data);
    } catch (err) {
        console.error(`[Node Server] Error proxying ${req.method} to ${targetUrl}:`, err.message);
        return res.status(503).json({
            success: false,
            error: 'Backend Flask server unavailable. Please make sure the Flask backend is running on port 5000.',
            details: err.message
        });
    }
});

// Serve frontend static assets
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all route to serve index.html for SPA behavior
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`Node.js Frontend Server running at: http://localhost:${PORT}`);
    console.log(`Proxying API calls to Flask at: ${FLASK_BACKEND_URL}`);
    console.log(`=================================================`);
});
