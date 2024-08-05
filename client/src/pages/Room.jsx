import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useMediasoup } from "../context/MediasoupProvider";
import { useSocket } from "../context/SocketProvider";

const Room = () => {
  const { roomId } = useParams();
  const {
    device,
    producer,
    createSendTransport,
    createDevice,
    setRoomId,
    streamSuccess,
    createRecvTransport,
    remoteStream,
  } = useMediasoup();
  const [localStream, setLocalStream] = useState(null);
  const { socket } = useSocket();

  useEffect(() => {
    const getLocalStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        await streamSuccess(stream); // Ensure streamSuccess is called here
        setLocalStream(stream);
      } catch (error) {
        console.error("Error accessing local media devices:", error);
      }
    };
    getLocalStream();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [streamSuccess]); // Ensure streamSuccess is a dependency

  useEffect(() => {
    const initializeTransport = async () => {
      if (localStream && !producer) {
        await createSendTransport();
      }
    };
    initializeTransport();
  }, [localStream, producer, createSendTransport]);

  useEffect(() => {
    const handleReceiveMedia = async () => {
      if (device) {
        await createRecvTransport();
      }
    };

    socket.on("sending:media", handleReceiveMedia);

    return () => {
      socket.off("sending:media", handleReceiveMedia);
    };
  }, [socket, device, createRecvTransport]);

  useEffect(() => {
    const joinRoom = async () => {
      if (roomId && device) {
        setRoomId(roomId);
        const routerRtpCapabilities = await socket.emit("getRouterRtpCapabilities");
        await createDevice(routerRtpCapabilities);
      }
    };
    joinRoom();
  }, [roomId, device, setRoomId, createDevice, socket]);

  return (
    <div>
      <h1>Room ID: {roomId}</h1>
      {localStream && (
        <video
          autoPlay
          playsInline
          ref={(video) => {
            if (video) {
              video.srcObject = localStream;
            }
          }}
        />
      )}
      {remoteStream && (
        <>
          <h1>Remote Stream</h1>
          <video
            autoPlay
            playsInline
            ref={(video) => {
              if (video) {
              video.srcObject = remoteStream;
              }
            }}
          />
        </>
      )}
    </div>
  );
};

export default Room;
