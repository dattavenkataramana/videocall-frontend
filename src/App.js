 


// import React, { useEffect, useRef } from 'react';
// import io from 'socket.io-client';
// import './App.css'

// const socket = io('https://videocallbackend-p3r2.onrender.com/');

// const App = () => {
//   const localVideoRef = useRef(null);
//   const remoteVideoRef = useRef(null);

//   useEffect(() => {
//     const pc = new RTCPeerConnection({
//       iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
//     });

//     pc.onicecandidate = (event) => {
//       if (event.candidate) {
//         socket.emit('candidate', event.candidate);
//       }
//     };

//     pc.ontrack = (event) => {
//       remoteVideoRef.current.srcObject = event.streams[0];
//     };

//     socket.on('offer', async (data) => {
//       await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
//       const answer = await pc.createAnswer();
//       await pc.setLocalDescription(answer);
//       socket.emit('answer', { answer, to: data.from });
//     });

//     socket.on('answer', async (data) => {
//       await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
//     });

//     socket.on('candidate', async (data) => {
//       await pc.addIceCandidate(new RTCIceCandidate(data));
//     });

//     socket.emit('join', 'room1');

//     const startVideo = async () => {
//       const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
//       localVideoRef.current.srcObject = stream;
//       stream.getTracks().forEach(track => pc.addTrack(track, stream));
//     };

//     startVideo();
//   }, []);

//   return (
//     <div className="container">
//       <h1>Video Call App</h1>
//       <div className="video-container">
//         <video ref={localVideoRef} autoPlay playsInline muted></video>
//         <video ref={remoteVideoRef} autoPlay playsInline></video>
//       </div>
//     </div>
//   );
// };

// export default App;


import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import './App.css'
//https://videocallbackend-p3r2.onrender.com/
const socket = io('http://localhost:5000');

const App = () => {
  const localVideoRef = useRef(null);
  const [remoteVideos, setRemoteVideos] = useState({});
  const [peerConnections, setPeerConnections] = useState({});

  useEffect(() => {
    const pcConfig = {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    };

    const startVideo = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localVideoRef.current.srcObject = stream;

      socket.on('user-joined', async (socketId) => {
        const pc = new RTCPeerConnection(pcConfig);
        setPeerConnections((prev) => ({ ...prev, [socketId]: pc }));

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('candidate', { to: socketId, candidate: event.candidate });
          }
        };

        pc.ontrack = (event) => {
          setRemoteVideos((prev) => ({ ...prev, [socketId]: event.streams[0] }));
        };

        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', { to: socketId, offer });
      });

      socket.on('offer', async ({ from, offer }) => {
        const pc = new RTCPeerConnection(pcConfig);
        setPeerConnections((prev) => ({ ...prev, [from]: pc }));

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('candidate', { to: from, candidate: event.candidate });
          }
        };

        pc.ontrack = (event) => {
          setRemoteVideos((prev) => ({ ...prev, [from]: event.streams[0] }));
        };

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { to: from, answer });
      });

      socket.on('answer', async ({ from, answer }) => {
        const pc = peerConnections[from];
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      });

      socket.on('candidate', async ({ from, candidate }) => {
        const pc = peerConnections[from];
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      });

      socket.emit('join', 'room1');
    };

    startVideo();

  }, [peerConnections]);

  return (
    <div className="container">
      <h1>Video Call App</h1>
      <div className="video-container">
        <video ref={localVideoRef} autoPlay playsInline muted></video>
        {Object.keys(remoteVideos).map((socketId) => (
          <video key={socketId} ref={video => video && (video.srcObject = remoteVideos[socketId])} autoPlay playsInline></video>
        ))}
      </div>
    </div>
  );
};

export default App;
