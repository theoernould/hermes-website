const enc = new TextEncoder();
const dec = new TextDecoder();

async function generateKeyPair() {
  return await window.crypto.subtle.generateKey({
    name: "RSA-OAEP",
    modulusLength: 4096,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: "SHA-256"
  },
    true,
    ["encrypt", "decrypt"]
  );
}

async function encryptMessage(msg, publicKey) {
  return await window.crypto.subtle.encrypt({
    name: "RSA-OAEP"
  },
    publicKey,
    enc.encode(msg)
  )
}

async function decryptMessage(msg, privateKey) {
  let decryptedMessage = await window.crypto.subtle.decrypt({
    name: "RSA-OAEP"
  },
    privateKey,
    msg
  );
  return dec.decode(decryptedMessage);
}

const NAME = sessionStorage.getItem("name");
const TOKEN = sessionStorage.getItem("token");

async function s() {

  const {
    PRIVATE_KEY,
    PUBLIC_KEY
  } = await generateKeyPair();
  console.log("Vous êtes : " + NAME + " / " + TOKEN);

  socket.emit("receiveInfos", {
    name: NAME,
    token: TOKEN,
    key: PUBLIC_KEY
  });
}

s();

let $channelChoosen = $("#general");
$channelChoosen.addClass("active");

$("#general").on("click", userHandler);

$("#deconnexion").on("click", (e) => {
  fetch('/logout', { method: "POST" }).then((res) => {
    window.location.href = "/";
  });
});

$('#bottom').on('submit', (e) => {
  e.preventDefault();
  let $messageInput = $("#messageContent");
  let content = $messageInput.val();
  let to = $channelChoosen.attr("id");
  console.log("to : " + to);
  socket.emit("sendMessage", {
    to: to,
    content: content
  });
  $messageInput.val("");
  /*let messageOriginal = $("#login").val();
  console.log("original : " + messageOriginal);
 
  const {
      privateKey,
      publicKey
  } = await generateKeyPair();
 
  let encryptedMessage = await encryptMessage(messageOriginal, publicKey);
 
  let uintArray = new Uint8Array(encryptedMessage);
 
  let string = String.fromCharCode.apply(null, uintArray);
 
  let base64Data = btoa(string);
 
  console.log("encodé : " + base64Data);
 
  let decryptedMessage = await decryptMessage(encryptedMessage, privateKey);
  
  console.log(decryptedMessage);*/

  /*console.log("trying");

  let login = $('#login').val();
  let password = $('#password').val();
  console.log(login + " " + password);
  socket.emit('login', {
    login: login,
    password: password
  });
  $("#login").html("");
  $("#password").html("");*/
});

class User {
  username
  pubKey

  constructor(username, pubKey) {
    this.username = username;
    this.pubKey = pubKey;
  }
}

let usersList = new Array();

class Message {
  from
  to
  content

  constructor(from, to, content) {
    this.from = from;
    this.to = to;
    this.content = content;
  }
}

let messagesList = new Array();

let socket = io();

function clearMessages() {
  $("#messages").html("");
}

function printMessage(msg) {
  let $messages = $("#messages");
  let $line = $("<div>");
  $("<span>").html(msg.from.username).appendTo($line);
  $("<p>").html(msg.content).appendTo($line);
  $line.addClass("message");
  $line.appendTo($messages);
}

function clearUsers() {
  $("#users").html("");
}

function printUser(user) {
  let $users = $("#users");
  usersList.push(user);
  let $line = $("<span>");
  $line.attr("id", user.username);
  $line.html(user.username);
  $line.appendTo($users);
  $line.addClass("discussion");
  $line.on("click", userHandler);
}

function userHandler(e) {
  $channelChoosen.removeClass("active");
  $channelChoosen = $(e.currentTarget);
  $channelChoosen.addClass("active");
  let channel = $channelChoosen.attr("id");
  clearMessages();
  messagesList.forEach(msg => {
    console.log("channel actuel : " + channel + " | msg " + msg);
    if ((msg.to == "general" && channel == "general") || (msg.from.username == channel && msg.to == NAME) || (msg.from.username == NAME && msg.to == channel)) {
      printMessage(msg);
    }
  });
}

socket.on("newUser", (user) => {
  printUser(user);
});

socket.on("getAllUsers", (users) => {
  clearUsers();
  users.forEach(user => {
    printUser(user);
  });
});

socket.on("newMessage", (msg) => {
  console.log("nouveau message : " + msg);
  messagesList.push(msg);
  if (msg.from.username != NAME) {
    const audio = new Audio("/sounds/notif.mp3");
    audio.volume = 0.25;
    audio.play();
  }
  let channel = $channelChoosen.attr("id");
  if ((msg.to == "general" && channel == "general") || (msg.from.username == channel && msg.to == NAME) || (msg.from.username == NAME && msg.to == channel)) {
    printMessage(msg);
  }
});

socket.on('getAllMessages', (messages) => {
  messages.forEach(msg => {
    messagesList.push(msg);
    let channel = $channelChoosen.attr("id");
    if ((msg.to == "general" && channel == "general") || (msg.from.username == channel && msg.to == NAME) || (msg.from.username == NAME && msg.to == channel)) {
      printMessage(msg);
    }
  });
});