const WebSocket = require("ws");
const net = require("net");
const tcpPort = 2907;
const wsSendPort = 2908;
const wsRecvPort = 2909;

const openSendSockets = [];
const openRecvSockets = [];

function handleConnection(conn) {
  const remoteAddress = conn.remoteAddress + ":" + conn.remotePort;
  console.log("TCP client connection from %s", remoteAddress);
  conn.on("data", onConnData);
  conn.once("close", onConnClose);
  conn.on("error", onConnError);
  function onConnData(d) {
    const msg = d.toString("ascii").trim();
    for (const ws of openSendSockets) {
      try { ws.send(msg); }
      catch (error) {
        console.log("Failed to write message to socket; error: " + error);
      }
    }
  }
  function onConnClose() {
    console.log("TCP connection from %s closed", remoteAddress);
  }
  function onConnError(err) {
    console.log("TCP connection %s error: %s", remoteAddress, err.message);
  }
}

const tcpServer = net.createServer();
tcpServer.on("connection", handleConnection);
tcpServer.listen(tcpPort, "0.0.0.0", function() {
  console.log("TCP server listening: %j", tcpServer.address());
});


const wsSendServer = new WebSocket.Server({ port: wsSendPort });
wsSendServer.on("connection", ws => {
  console.log("WebSocket client connected to SEND server");
  openSendSockets.push(ws);
  ws.on("close", () => {
    console.log("WebSocket client disconnected from SEND server");
    const index = openSendSockets.indexOf(ws);
    if (index > -1) openSendSockets.splice(index, 1);
  });
});
console.log("WebSocket SEND server listening on port " + wsSendPort);


const wsRecvServer = new WebSocket.Server({ port: wsRecvPort });
wsRecvServer.on("connection", ws => {
  console.log("WebSocket client connected to RECV server");
  openRecvSockets.push(ws);
  ws.on("close", () => {
    console.log("WebSocket client disconnected from RECV server");
    const index = openRecvSockets.indexOf(ws);
    if (index > -1) openRecvSockets.splice(index, 1);
  });
  ws.on('message', msg => {
    msg = "//GIST\n" + msg;
    for (const ws of openSendSockets) {
      try { ws.send(msg); }
      catch (error) {
        console.log("Failed to write message to socket; error: " + error);
      }
    }
  });
});
console.log("WebSocket RECV server listening on port " + wsRecvPort);