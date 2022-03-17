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
  timestamp
  crypted

  constructor(from, to, content, timestamp, crypted) {
    this.from = from;
    this.to = to;
    this.content = content;
    this.timestamp = timestamp;
    this.crypted = crypted;
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

  console.log("connection : " + NAME + " / " + TOKEN);

  $("#username").html(NAME.replace(/</g, "&lt;").replace(/>/g, "&gt;"));

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

    if (content.trim() != "") {
      if (to == "general") {
        socket.emit("sendMessage", {
          to: to,
          content: content,
          crypted: false
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
          content: encryptedMessage,
          timestamp: Date.now(),
          crypted: true
        });
        let message = new Message(USER_ME, userTo.username, content, false);
        messagesList.push(message);
        printMessage(message, false);
      }
    }

    $messageInput.val("");
  });

  function clearMessages() {
    $("#messages").html("");
  }

  function secureContent(content) {
    return content.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  async function printMessage(msg, crypted) {
    let $messages = $("#messages");
    let $line = $("<div>");
    let $title = $("<div>");
    let $username = $("<span>").html(secureContent(msg.from.username));
    let time = new Date(msg.timestamp);
    let $time = $("<span>").html(`${time.getDate().toString().padStart(2,'0')}/${(time.getMonth()+1).toString().padStart(2,'0')} à ${time.getHours()}:${time.getMinutes()}:${time.getSeconds()}`);
    $username.appendTo($title);
    $time.appendTo($title);
    $title.appendTo($line);
    if (crypted) {
      let decryptedMessage = await decryptMessage(msg.content, PRIVATE_KEY);
      $("<p>").html(secureContent(decryptedMessage)).appendTo($line);

      /*let uintArray = new Uint8Array(msg.content);
     
      let string = String.fromCharCode.apply(null, uintArray);
     
      let base64Data = btoa(string);
     
      console.log("encodé : " + base64Data);*/
    } else {
      $("<p>").html(secureContent(msg.content)).appendTo($line);
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
    $line.attr("id", user.username.replace(/</g, "&lt;").replace(/>/g, "&gt;"));
    $line.html(user.username.replace(/</g, "&lt;").replace(/>/g, "&gt;"));
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
    console.log("AFFICHAGE :");
    messagesList.forEach(msg => {
      console.log("message : ");
      console.log(msg);
      if ((msg.to == "general" && channel == "general") || (msg.from.username == channel && msg.to == NAME) || (msg.from.username == NAME && msg.to == channel && !msg.crypted)) {
        printMessage(msg, msg.crypted);
      }
    });
    console.log("------");
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
      printMessage(msg, msg.crypted);
    }
    //}
  });

  socket.on('getAllMessages', (messages) => {
    messages.forEach(msg => {
      messagesList.push(msg);
      let channel = $channelChoosen.attr("id");
      if ((msg.to == "general" && channel == "general") || (msg.from.username == channel && msg.to == NAME) || (msg.from.username == NAME && msg.to == channel)) {
        printMessage(msg, msg.crypted);
      }
    });
  });
});