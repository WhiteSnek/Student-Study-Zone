// Lobby.js
import React, { useCallback, useEffect, useState } from "react";
import { useSocket } from "../context/SocketProvider";
import { useNavigate } from "react-router-dom";
import { useMediasoup } from "../context/MediasoupProvider";

const Lobby = () => {
  const [room, setRoom] = useState("");
  const {setRoomId, createDevice } = useMediasoup()
  const { socket } = useSocket();
  const navigate = useNavigate();

  const handleCreateRoom = useCallback(() => {
    socket.emit("create:room", { name: "Nikhil" }, async (response) => {
      if (response && response.success) {
        console.log(`Room created: ${response.roomId}\nRouter capabilities: ${response.routerRtpCapabilities}`);
        setRoomId(response.roomId)
        await createDevice(response.routerRtpCapabilities)
        navigate(`/room/${response.roomId}`);
      } else {
        console.error(response.error);
      }
    });
  }, [socket, navigate]);

  const handleJoinRoom = useCallback(() => {
    if (room === "") {
      console.log("Please enter room id");
    } else {
      const data = { Name: "Kumar", roomId: room };
      console.log(data);
      socket.emit("join:room", data, async (response) => {
        if (response && response.success) {
          console.log(`Room joined: ${response.roomId}\nRouter capabilities: ${response.routerRtpCapabilities}`);
          setRoomId(room)
          await createDevice(response.routerRtpCapabilities)
          navigate(`/room/${response.roomId}`);
        } else {
          console.error(response.error);
        }
      });
    }
  }, [room, socket, navigate]);

  useEffect(() => {
    return () => {
      socket.off('create:room');
      socket.off('join:room');
    };
  }, []);

  return (
    <div>
      <button onClick={handleCreateRoom}>Create room</button>
      <input
        type="text"
        value={room}
        onChange={(e) => setRoom(e.target.value)}
      />
      <button onClick={handleJoinRoom}>Join room</button>
    </div>
  );
};

export default Lobby;
