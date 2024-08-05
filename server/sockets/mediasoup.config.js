const mediasoup = require('mediasoup');

const createWorker = async () => {
  const wr = await mediasoup.createWorker({
    rtcMinPort: 2000,
    rtcMaxPort: 2100
  });

  console.log(`Worker pid ${wr.pid}`);
  wr.on('died', error => {
    console.error('Mediasoup worker dead!!');
    setTimeout(() => process.exit(1), 2000);
  });

  return wr;
}

const mediaCodecs = [
  {
    kind: 'audio',
    mimeType: 'audio/opus',
    clockRate: 48000,
    channels: 2,
  },
  {
    kind: 'video',
    mimeType: 'video/VP8',
    clockRate: 90000,
    parameters: {
      'x-google-start-bitrate': 1000,
    },
  },
];

let workerPromise = createWorker();

module.exports = { workerPromise, mediaCodecs };
