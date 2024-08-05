const express = require('express');
const cors = require('cors');
const { getRouter } = require('./sockets/mediasoup.config');

const app = express();
const options = {
  origin: "http://localhost:5173"
};

app.use(cors(options));

app.get('/', (req, res) => {
  res.send("Server is live");
});

app.get('/api/rtpCapabilities', (req, res) => {
  try {
    const router = getRouter();
    res.json({ routerRtpCapabilities: router.rtpCapabilities });
  } catch (error) {
    res.status(500).send('Router not initialized');
  }
});

module.exports = app;
