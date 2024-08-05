import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import * as mediasoupClient from 'mediasoup-client';
import { useSocket } from './SocketProvider';

const MediasoupContext = createContext(null);

export const useMediasoup = () => {
    return useContext(MediasoupContext);
};

const MediasoupProvider = ({ children }) => {
    const { socket } = useSocket();
    const [device, setDevice] = useState(null);
    const [roomId, setRoomId] = useState(null);
    const [producerTransport, setProducerTransport] = useState(null);
    const [consumerTransport, setConsumerTransport] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [producer, setProducer] = useState(null);
    const [consumer, setConsumer] = useState(null);
    const remoteVideoRef = useRef(null);

    let params = {
        encodings: [
            { rid: 'r0', maxBitrate: 100000, scalabilityMode: 'S1T3' },
            { rid: 'r1', maxBitrate: 300000, scalabilityMode: 'S1T3' },
            { rid: 'r2', maxBitrate: 900000, scalabilityMode: 'S1T3' },
        ],
        codecOptions: { videoGoogleStartBitrate: 1000 }
    };

    const streamSuccess = async (stream) => {
        const track = stream.getVideoTracks()[0];
        console.log(track)
        params = { track, ...params };
    };

    const createDevice = async (routerRtpCapabilities) => {
        try {
            if (device) return;
            const newDevice = new mediasoupClient.Device();
            await newDevice.load({ routerRtpCapabilities });
            setDevice(newDevice);
            console.log('Device created');
        } catch (error) {
            console.error('Failed to create device', error);
        }
    };

    const createSendTransport = async () => {
        socket.emit('createWebRtcTransport', { sender: true }, ({ params }) => {
            if (params.error) {
                console.log(params.error);
                return;
            }

            const newProducerTransport = device.createSendTransport(params);
            setProducerTransport(newProducerTransport);

            newProducerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
                try {
                    await socket.emit('transport-connect', { dtlsParameters });
                    callback();
                } catch (error) {
                    errback(error);
                }
            });

            newProducerTransport.on('produce', async (parameters, callback, errback) => {
                try {
                    await socket.emit('transport-produce', {
                        kind: parameters.kind,
                        rtpParameters: parameters.rtpParameters,
                        appData: parameters.appData,
                    }, ({ id }) => callback({ id }));
                } catch (error) {
                    errback(error);
                }
            });

            connectSendTransport(newProducerTransport);
        });
    };

    const connectSendTransport = async (newProducerTransport) => {
        const newProducer = await newProducerTransport.produce(params);
        setProducer(newProducer);

        newProducer.on('trackended', () => {
            console.log('Track ended');
        });

        newProducer.on('transportclose', () => {
            console.log('Transport ended');
        });
    };

    const createRecvTransport = async () => {
        socket.emit('createWebRtcTransport', { sender: false }, ({ params }) => {
            if (params.error) {
                console.log(params.error);
                return;
            }

            const newConsumerTransport = device.createRecvTransport(params);
            setConsumerTransport(newConsumerTransport);

            newConsumerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
                try {
                    await socket.emit('transport-recv-connect', { dtlsParameters });
                    callback();
                } catch (error) {
                    errback(error);
                }
            });

            connectRecvTransport(newConsumerTransport);
        });
    };

    const connectRecvTransport = async (newConsumerTransport) => {
        socket.emit('consume', { rtpCapabilities: device.rtpCapabilities }, async ({ params }) => {
            if (params.error) {
                console.log('Cannot consume');
                return;
            }

            const newConsumer = await newConsumerTransport.consume({
                id: params.id,
                producerId: params.producerId,
                kind: params.kind,
                rtpParameters: params.rtpParameters,
            });
            setConsumer(newConsumer);
            console.log(newConsumer)
            const { track } = newConsumer;
            const remoteStream = new MediaStream([track]);
            setRemoteStream(remoteStream);

            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = remoteStream;
            }

            socket.emit('consumer-resume');
        });
    };

    const value = {
        device,
        roomId,
        setRoomId,
        producer,
        consumer,
        remoteStream,
        createSendTransport,
        createDevice,
        streamSuccess,
        createRecvTransport,
        connectRecvTransport,
        connectSendTransport
    };

    return (
        <MediasoupContext.Provider value={value}>
            {children}
            <video ref={remoteVideoRef} autoPlay />
        </MediasoupContext.Provider>
    );
};

export default MediasoupProvider;
