const { createServer } = require('node:http');
const { Server } = require('socket.io');
const  app = require('../app')

const server = createServer(app);
const io = new Server(server,{
    cors: {
        origin: "http://localhost:5173"
      }
});

const peers = io.of("/mediasoup");

module.exports = {io, server, peers};