import { Peer as Client, MediaConnection } from "peerjs";

type PeerId = string;
type Peer = {
  id: PeerId;
  stream?: MediaStream;
  connection?: MediaConnection;
};
type PeersState = Map<PeerId, Peer>;
type MeState = {
  client?: Client;
  stream?: MediaStream;
};

// UI
const containerElm = document.querySelector("main");
const callBtnElm = document.querySelector(".call-btn");
const hangUpBtnElm = document.querySelector(".hangup-btn");
const audioContainerElm = document.querySelector(".audio-container");
const messageElm = document.querySelector(".message");

// State
const peers: PeersState = new Map();
const me: MeState = {};

init();

async function init() {
  await startLocalAudioStream();
  await startPeerJSConnection();

  callBtnElm.addEventListener("click", () => {
    const peerId = window.prompt("Please enter the sharing code");
    handleOutgoingCall(peerId);
  });
  hangUpBtnElm.addEventListener("click", () => {
    console.log("hangup");
    console.log("entries", peers.entries);
    peers.forEach((peer) => peer.connection.close());
  });
}

async function startLocalAudioStream() {
  showMessage('Trying to access your microphone. Please click "Allow".');

  const stream = await navigator.mediaDevices.getUserMedia({
    video: false,
    audio: true,
  });

  me.stream = stream;
}

async function startPeerJSConnection() {
  showMessage("Connecting to server...");

  me.client = new Client(createPeerJSId(), { debug: 3 });

  me.client.on("open", handleIddleConnection);
  me.client.on("call", handleIncomingCall);
  me.client.on("error", handleError);
}

/**
 * Handlers
 */
function handleIddleConnection() {
  showMessage(
    `Call a peer or share this code with someone to call you: ${me.client.id}`
  );
  changeStatus("iddle");
  console.log(me.stream);
}

function handleOutgoingCall(peerId: PeerId) {
  showMessage(`Calling ${peerId}...`);

  const peer = getPeer(peerId);
  peer.connection = me.client.call(peerId, me.stream);

  peer.connection.on("stream", function (stream) {
    handleIncomingStream(peer, stream);
  });
  peer.connection.on("close", () => handleEndCall(peer));
  peer.connection.on("error", handleError);

  handlePeersChanged();
}

function handleIncomingCall(connection: MediaConnection) {
  showMessage(`Answering incoming call from ${connection.peer}...`);

  const peer = getPeer(connection.peer);
  peer.connection = connection;

  peer.connection.answer(me.stream);
  // FIXME: verify is called after this issue is fixed: https://github.com/peers/peerjs/issues/636
  peer.connection.on("close", () => handleEndCall(peer));
  peer.connection.on("stream", function (stream) {
    handleIncomingStream(peer, stream);
  });
  peer.connection.on("error", handleError);

  handlePeersChanged();
}

function handleIncomingStream(peer: Peer, stream: MediaStream) {
  changeStatus("connected");

  peer.stream = stream;

  const audioElm = document.createElement("audio");
  audioElm.id = peer.id;
  audioElm.autoplay = true;
  audioElm.controls = true;
  audioElm.muted = true;
  audioElm.srcObject = stream;
  audioContainerElm.appendChild(audioElm);
}

function handleEndCall(peer: Peer) {
  console.log("handleEndCall", peer);
  if (peer.connection.open) {
    peer.connection.close();
  }

  const audioElm = document.querySelector(`#${peer.id}`);
  audioElm.remove();

  peers.delete(peer.id);

  if (peers.size === 0) {
    handleIddleConnection();
  } else {
    handlePeersChanged();
  }
}

function handlePeersChanged() {
  const peerIds = Array.from(peers.keys()).map((peerId) => `${peerId} `);
  showMessage(`In a call with: ${peerIds}`);
}

function handleError(error: Error) {
  throw error;
}

/**
 * Helpers
 */
function showMessage(msg: string) {
  messageElm.innerHTML = msg;
}

function changeStatus(status: "disconnected" | "iddle" | "connected") {
  containerElm.className = status;
}

function createPeerJSId(): PeerId {
  return `${Math.floor(Math.random() * 2 ** 18)
    .toString(36)
    .padStart(6, "GG")}`;
}

function getPeer(peerId: PeerId) {
  let peer: Peer = peers.get(peerId);

  console.log("getPeer", peer);

  if (!peer) {
    peer = {
      id: peerId,
    };
    peers.set(peerId, peer);
  }

  console.log("getPeer", peer);
  console.log("peers", peers.entries);

  return peer;
}
