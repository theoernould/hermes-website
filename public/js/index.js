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

class User {
  username
  pubKey

  constructor(username, pubKey) {
    this.username = username;
    this.pubKey = pubKey;
  }
}

let usersList = new Array();

let socket = io();

socket.on('users', (users) => {
  let $users = $("#users");
  $users.html("");
  console.log("récupération des utilisateurs");
  users.forEach(user => {
    let usr = new User(user.username, user.pubKey);
    usersList.push(usr);
    let $line = $("<span>");
    $line.html(usr.username);
    $line.appendTo($users);
    $line.addClass("discussion");
  });
});

socket.on('globalMessages', (messages) => {
  let $messages = $("#messages");
  $messages.html("");
  console.log("récupération des messages globaux");
  console.log(messages);
  messages.forEach(msg => {
    let $line = $("<div>");
    $("<span>").html(msg.from.username).appendTo($line);
    $("<p>").html(msg.content).appendTo($line);
    $line.addClass("message");
    $line.appendTo($messages);
  });
});

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

let channel = "general";

$('#bottom').on('submit', (e) => {
  e.preventDefault();
  let $messageInput = $("#messageContent");
  let content = $messageInput.val();
  if (channel == "general") {
    socket.emit("sendGlobalMessage", content);
  }
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