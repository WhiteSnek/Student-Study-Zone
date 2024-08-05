const {server} = require('./sockets/socket.config')
require('./sockets/video')

server.listen(3000, () => {
    console.log('Server running at http://localhost:3000');
  });
