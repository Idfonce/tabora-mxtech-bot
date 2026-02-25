const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('website'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/website/index.html');
});

app.post('/api/pair', (req, res) => {
    const { phone } = req.body;
    
    if (!phone) {
        return res.json({ success: false, message: 'Phone number required' });
    }
    
    // Generate random 6-digit code
    const pairCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    res.json({ 
        success: true, 
        code: pairCode,
        message: 'Code generated successfully'
    });
});

app.listen(port, () => {
    console.log(`🇹🇿 Tabora-MXtech Website running on port ${port}`);
});
