class Room {
    constructor(roomId, worker) {
      this.roomId = roomId;
      this.worker = worker;
      this.router = null;
      this.peers = new Map();
      this.init();
    }
  
    async init() {
      this.router = await this.worker.createRouter({
        mediaCodecs: [
          {
            kind: "audio",
            mimeType: "audio/opus",
            clockRate: 48000,
            channels: 2,
          },
          {
            kind: "video",
            mimeType: "video/VP8",
            clockRate: 90000,
          },
        ],
      });
    }
  
    addPeer(peer) {
      this.peers.set(peer.id, peer);
    }
  
    getPeer(peerId) {
      return this.peers.get(peerId);
    }
  
    removePeer(peerId) {
      this.peers.delete(peerId);
    }
  }
  
  module.exports = Room;
  