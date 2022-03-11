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
const {
    PRIVATE_KEY,
    PUBLIC_KEY
} = await generateKeyPair();

let socket = io();

console.log("Vous êtes : " + sessionStorage.getItem("username"));

$('#form').on('submit', (e) => {
    e.preventDefault();
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

    console.log("trying");

    let login = $('#login').val();
    let password = $('#password').val();
    console.log(login + " " + password);
    socket.emit('login', {
        login: login,
        password: password
    });
    $("#login").html("");
    $("#password").html("");
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

/*socket.on('login response', function (logged) {
    if (logged) {
        console.log("connecté !");
        sessionStorage.setItem("socket", socket);
        window.location.replace("/accueil.html");
    }
});*/