const peer = new Peer(
  "" +
    Math.floor(Math.random() * 2 ** 18)
      .toString(36)
      .padStart(6, 0),
  {
    debug: 3,
  }
);

window.peer = peer;

const callBtn = document.querySelector(".call-btn");
const hangUpBtn = document.querySelector(".hangup-btn");
const audioContainer = document.querySelector(".call-container");

let conn;

function getLocalStream() {
  navigator.mediaDevices
    .getUserMedia({ video: false, audio: true })
    .then((stream) => {
      window.localStream = stream; // A
      window.localAudio.srcObject = stream; // B
      window.localAudio.autoplay = true; // C
    })
    .catch((err) => {
      console.log("u got an error:" + err);
    });
}

function showCallContent() {
  window.caststatus.textContent = `Your device ID is: ${peer.id}`;
  callBtn.hidden = false;
  audioContainer.hidden = true;
}

function showConnectedContent() {
  window.caststatus.textContent = `You're connected`;
  callBtn.hidden = true;
  audioContainer.hidden = false;
}

callBtn.addEventListener("click", function () {
  const code = window.prompt("Please enter the sharing code");
  conn = peer.connect(code);
  const call = peer.call(code, window.localStream); // A

  call.on("stream", function (stream) {
    // B
    window.remoteAudio.srcObject = stream; // C
    window.remoteAudio.autoplay = true; // D
    window.peerStream = stream; //E
    showConnectedContent(); //F    });
  });
});

hangUpBtn.addEventListener("click", function () {
  conn.close();
  showCallContent();
});

peer.on("open", function () {
  showCallContent();
});

peer.on("connection", function (connection) {
  conn = connection;
});

peer.on("call", function (call) {
  const answerCall = confirm("Do you want to answer?");

  if (answerCall) {
    call.answer(window.localStream); // A
    showConnectedContent(); // B
    // start the call (listen to the stream)
    call.on("stream", function (stream) {
      // C
      window.remoteAudio.srcObject = stream;
      window.remoteAudio.autoplay = true;
      window.peerStream = stream;
    });
    // close the call if remote hang up
    conn.on("close", function () {
      showCallContent();
    });
  } else {
    console.log("call denied"); // D
  }
});

// init
getLocalStream();
