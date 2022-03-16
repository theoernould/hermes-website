const enc = new TextEncoder();
const dec = new TextDecoder();

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

class User {
  username
  pubKey

  constructor(username, pubKey) {
    this.username = username;
    this.pubKey = pubKey;
  }
}

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

window.crypto.subtle.generateKey({
  name: "RSA-OAEP",
  modulusLength: 4096,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: "SHA-256"
},
  true,
  ["encrypt", "decrypt"]
).then(pair => {
  const PUBLIC_KEY = pair.publicKey;
  const PRIVATE_KEY = pair.privateKey;
  const NAME = sessionStorage.getItem("name");
  const TOKEN = sessionStorage.getItem("token");

  $("#username").html(NAME);

  const USER_ME = new User(NAME, PUBLIC_KEY);

  let socket = io();

  window.crypto.subtle.exportKey(
    "jwk",
    PUBLIC_KEY
  ).then(exported => {
    socket.emit("receiveInfos", {
      name: NAME,
      token: TOKEN,
      key: exported
    });
  });

  let $channelChoosen = $("#general");
  $channelChoosen.addClass("active");

  $("#general").on("click", userHandler);

  $("#deconnexion").on("click", (e) => {
    fetch('/logout', { method: "POST" }).then((res) => {
      window.location.href = "/";
    });
  });

  let usersList = new Array();
  let messagesList = new Array();

  $('#bottom').on('submit', async (e) => {
    e.preventDefault();
    let $messageInput = $("#messageContent");
    let content = $messageInput.val();
    let to = $channelChoosen.attr("id");

    if (to == "general") {
      socket.emit("sendMessage", {
        to: to,
        content: content
      });
    } else {
      let userTo = usersList.find(user => user.username == to);

      let userToPubKey = await window.crypto.subtle.importKey(
        "jwk",
        userTo.pubKey,
        {
          name: "RSA-OAEP",
          modulusLength: 4096,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: "SHA-256"
        },
        true,
        ["encrypt"]
      );

      let encryptedMessage = await encryptMessage(content, userToPubKey);

      socket.emit("sendMessage", {
        to: to,
        content: encryptedMessage
      });
      let message = new Message(USER_ME, userTo, content);
      messagesList.push(message);
      printMessage(message, false);
    }

    $messageInput.val("");
  });

  function clearMessages() {
    $("#messages").html("");
  }

  async function printMessage(msg, crypted) {
    let $messages = $("#messages");
    let $line = $("<div>");
    $("<span>").html(msg.from.username).appendTo($line);
    if (crypted) {
      let decryptedMessage = await decryptMessage(msg.content, PRIVATE_KEY);
      $("<p>").html(decryptedMessage).appendTo($line);

      /*let uintArray = new Uint8Array(msg.content);
     
      let string = String.fromCharCode.apply(null, uintArray);
     
      let base64Data = btoa(string);
     
      console.log("encodé : " + base64Data);*/
    } else {
      $("<p>").html(msg.content).appendTo($line);
    }
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
      if ((msg.to == "general" && channel == "general") || (msg.from.username == channel && msg.to == NAME) || (msg.from.username == NAME && msg.to == channel)) {
        printMessage(msg, !(msg.to == "general"));
      }
    });
  }

  socket.on("newUser", (user) => {
    printUser(user);
  });

  socket.on("userDisconnected", (user) => {
    $("#users span").filter(function () {
      return $(this).html() == user.username;
    }).remove();
  });

  socket.on("getAllUsers", (users) => {
    clearUsers();
    users.forEach(user => {
      printUser(user);
    });
  });

  socket.on("newMessage", async (msg) => {
    //if (msg.from.username != NAME) {
      messagesList.push(msg);
      if (msg.from.username != NAME) {
        const audio = new Audio("/sounds/notif.mp3");
        audio.volume = 0.25;
        audio.play();
      }
      let channel = $channelChoosen.attr("id");
      if ((msg.to == "general" && channel == "general") || (msg.from.username == channel && msg.to == NAME) || (msg.from.username == NAME && msg.to == channel)) {
        printMessage(msg, !(msg.to == "general"));
      }
    //}
  });

  socket.on('getAllMessages', (messages) => {
    messages.forEach(msg => {
      messagesList.push(msg);
      let channel = $channelChoosen.attr("id");
      if ((msg.to == "general" && channel == "general") || (msg.from.username == channel && msg.to == NAME) || (msg.from.username == NAME && msg.to == channel)) {
        printMessage(msg, !(msg.to == "general"));
      }
    });
  });
});