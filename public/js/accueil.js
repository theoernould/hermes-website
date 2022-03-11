let io = sessionStorage.getItem("socket");

const {
    privateKey,
    publicKey
} = await generateKeyPair();
pubKey = publicKey;
privKey = privateKey;
socket.emit("receive publicKey", pubKey);

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