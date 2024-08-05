const { io } = require("./socket.config");
const { workerPromise, mediaCodecs } = require('./mediasoup.config');

const routerToRoomMap = new Map();
const roomToRouterMap = new Map();

io.on("connection", (socket) => {
  console.log(`Socket Connected!: ${socket.id}`);

  // Store transports and producer/consumer for each socket
  socket.producerTransport = null;
  socket.consumerTransport = null;
  socket.producer = null;
  socket.consumer = null;

  // Create room
  socket.on("create:room", async (name, callback) => {
    if (socket.room) {
      console.error("Socket is already in a room!");
      if (typeof callback === "function") {
        callback({ success: false, error: "Already in a room" });
      }
      return;
    }
    const roomId = `room_${Math.random().toString(36).substr(2, 9)}`;
    socket.join(roomId);
    const worker = await workerPromise;
    const router = await worker.createRouter({ mediaCodecs });
    routerToRoomMap.set(router, roomId);
    roomToRouterMap.set(roomId, router);
    socket.name = name;
    socket.room = roomId;
    console.log(`Room created: ${roomId} \nRouter created: ${router}`);
    if (typeof callback === "function") {
      callback({ success: true, roomId, routerRtpCapabilities: router.rtpCapabilities });
    }
  });

  // Join room
  socket.on("join:room", async (data, callback) => {
    const { name, roomId } = data;
    if (!roomId) {
      console.error(`Attempted to join non-existent room: ${roomId}`);
      if (typeof callback === "function") {
        callback({ success: false, error: "Room does not exist" });
      }
      return;
    }
    if (socket.room) {
      console.error("Socket is already in a room!");
      if (typeof callback === "function") {
        callback({ success: false, error: "Already in a room" });
      }
      return;
    }
    
    const router = roomToRouterMap.get(roomId);
    if (!router) {
      console.error('Room not found!');
      if (typeof callback === 'function') {
        callback({ success: false, error: 'Room not found' });
      }
      return;
    }
    socket.join(roomId);
    socket.name = name;
    socket.room = roomId;
    console.log(`Socket joined room: ${roomId}\nRouter: ${router}`);
    if (typeof callback === "function") {
      callback({
        success: true,
        roomId,
        routerRtpCapabilities: router.rtpCapabilities,
      });
    }
  });

  // Create WebRTC Transport
  socket.on('createWebRtcTransport', async ({ sender }, callback) => {
    const router = roomToRouterMap.get(socket.room);
    if (!router) {
      console.error('Router not found for room:', socket.room);
      if (typeof callback === 'function') {
        callback({ success: false, error: 'Router not found' });
      }
      return;
    }
    
    try {
      const transportOptions = {
        listenIps: [
          {
            ip: '0.0.0.0', // replace with relevant IP address
            announcedIp: '127.0.0.1',
          }
        ],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
      };

      const transport = await router.createWebRtcTransport(transportOptions);
      console.log(`Transport created: ${transport.id}`);

      transport.on('dtlsstatechange', dtlsState => {
        if (dtlsState === 'closed') {
          transport.close();
        }
      });

      transport.on('close', () => {
        console.log('Transport closed');
      });

      if (sender) {
        socket.producerTransport = transport;
      } else {
        socket.consumerTransport = transport;
      }

      callback({
        params: {
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters,
        }
      });
    } catch (error) {
      console.error('Failed to create WebRTC transport:', error);
      callback({ success: false, error: 'Failed to create WebRTC transport' });
    }
  });

  // Transport Connect
  socket.on('transport-connect', async ({ dtlsParameters }) => {
    try {
      await socket.producerTransport.connect({ dtlsParameters });
      console.log('Producer transport connected');
    } catch (error) {
      console.error('Failed to connect producer transport:', error);
    }
  });

  // Transport Produce
  socket.on('transport-produce', async ({ kind, rtpParameters }, callback) => {
    try {
      socket.producer = await socket.producerTransport.produce({ kind, rtpParameters });
      console.log('Producer created:', socket.producer.id);
      callback({ id: socket.producer.id });
    } catch (error) {
      console.error('Failed to create producer:', error);
      callback({ success: false, error: 'Failed to create producer' });
    }
  });

  // Transport Recv Connect
  socket.on('transport-recv-connect', async ({ dtlsParameters }) => {
    try {
      await socket.consumerTransport.connect({ dtlsParameters });
      console.log('Consumer transport connected');
    } catch (error) {
      console.error('Failed to connect consumer transport:', error);
    }
  });

  // Consume
  socket.on('consume', async ({ rtpCapabilities }, callback) => {
    try {
      const router = roomToRouterMap.get(socket.room);
      if (!router) {
        console.error('Router not found for room:', socket.room);
        callback({ success: false, error: 'Router not found' });
        return;
      }

      if (router.canConsume({ producerId: socket.producer.id, rtpCapabilities })) {
        socket.consumer = await socket.consumerTransport.consume({
          producerId: socket.producer.id,
          rtpCapabilities,
          paused: true,
        });

        console.log('Consumer created:', socket.consumer.id);

        socket.consumer.on('transportclose', () => {
          console.log('Transport close from consumer');
        });

        socket.consumer.on('producerclose', () => {
          console.log('Producer of consumer closed');
        });

        callback({
          params: {
            id: socket.consumer.id,
            producerId: socket.producer.id,
            kind: socket.consumer.kind,
            rtpParameters: socket.consumer.rtpParameters,
          }
        });
      } else {
        console.error('Cannot consume');
        callback({ success: false, error: 'Cannot consume' });
      }
    } catch (error) {
      console.error('Failed to create consumer:', error);
      callback({ success: false, error: 'Failed to create consumer' });
    }
  });

  // Consumer Resume
  socket.on('consumer-resume', async () => {
    try {
      await socket.consumer.resume();
      console.log('Consumer resumed');
    } catch (error) {
      console.error('Failed to resume consumer:', error);
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`Socket Disconnected: ${socket.id}`);
  });
});
