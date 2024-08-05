class Peer {
    constructor(id, name) {
      this.id = id;
      this.name = name;
      this.transports = new Map();
      this.producers = new Map();
      this.consumers = new Map();
    }
  
    addTransport(transport) {
      this.transports.set(transport.id, transport);
    }
  
    getTransport(transportId) {
      return this.transports.get(transportId);
    }
  
    addProducer(producer) {
      this.producers.set(producer.id, producer);
    }
  
    addConsumer(consumer) {
      this.consumers.set(consumer.id, consumer);
    }
  }
  
  module.exports = Peer;
  