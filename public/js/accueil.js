console.log("yo!");

const {
    PRIVATE_KEY,
    PUBLIC_KEY
} = await genPair();

async function genPair() {
    return await generateKeyPair();
}

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

let socket = io();

socket.emit("receiveInfos", {
    name = 
});

socket.on('users', (users) => {
    let $users = $("#users");
    $users.html("");
    console.log("récupération des utilisateurs");
    users.forEach(user => {
        console.log(user);
        let $line = $("<tr>");
        let $name = $("<td>").html(user.name);
        $name.appendTo($line);
        let $publicKey = $("<td>").html(user.publicKey);
        $publicKey.appendTo($line);
        $line.appendTo($users);
    });
});