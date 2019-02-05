var hash = require('hash.js');
const { randomBytes } = require('crypto')
var EC = require('elliptic').ec;
var ec = new EC('secp256k1');
var WebSocket = require('ws');
var express = require('express');
var app = express();

// //..............................C++ Full-node websocket api message enum.............................
// enum MSG_TYPE
// {
//     MSG_SYS,
//     MSG_ACCOUNT,
//     MSG_TX,
//     MSG_BLOCK,
//     MSG_TOPIC,
//     MSG_EXPLORER,
//     MSG_EXCHANGE
// };

// enum MSG_CMD
// {
//     SYS_PING,
//     SYS_PONG,
//     SYS_INFO,

//     ACCOUNT_IMPORT = 0,
//     ACCOUNT_TOP100,
//     ACCOUNT_PROBE,
//     ACCOUNT_QUERY,
//     ACCOUNT_HISTORY,

//     TX_CMD = 0,

//     BLOCK_SYNC = 0,

//     TOPIC_QUESTION_PROBE = 0,
//     TOPIC_DETAIL_PROBE,
//     TOPIC_LIST,
//     TOPIC_ANSWER_LIST,

//     EXPLORER_MAIN_PAGE = 0,
//     EXPLORER_NEXT_PAGE,
//     EXPLORER_BLOCK_PAGE,
//     EXPLORER_TX_PAGE,
//     EXPLORER_ACCOUNT_PAGE,
//     EXPLORER_QUERY,

//     EXCHANGE_LOGIN = 0,
//     EXCHANGE_NOTIFY_DEPOSIT,
//     EXCHANGE_DEPOSIT_TX_PROBE,
//     EXCHANGE_WITHDRAW_TX_PROBE
// };

var privkey_str = "Vm1wSmQwMVhSWGxUYTJScVUwWktXRmxzVWtKaVJUQjN="; // change this to your privkey
var privkey_buf = Buffer.from(privkey_str, 'base64');
var privkey = ec.keyFromPrivate(privkey_buf);
var pubkey_hex = privkey.getPublic('hex');
var pubkey_b64 = Buffer.from(pubkey_hex, 'hex').toString('base64');
var ws = new WebSocket('ws://node1.askcoin.me:19050');

var latest_block_id = 0;

ws.on('open', function() {
    // send ping message
    ws.send(JSON.stringify({msg_type:0, msg_cmd:0, msg_id:0}));
    
    // get info from server
    ws.send(JSON.stringify({msg_type:0, msg_cmd:2, msg_id:0}));
});

ws.on('error', function(err) {
    console.log("error happened: ", err);
    process.exit();
});

ws.on('close', function() {
    console.log("websocket closed");
    process.exit();
});

ws.on('message', function(msg_data) {
    var msg_obj = JSON.parse(msg_data);

    if(msg_obj.msg_type == 0 && msg_obj.msg_cmd == 2) { // SYS_INFO
        // import account msg
        var data_obj = {};
        data_obj.utc = msg_obj.utc;
        data_obj.pubkey = pubkey_b64;
        var tx_hash_raw = hash.sha256().update(hash.sha256().update(JSON.stringify(data_obj)).digest()).digest();
        var sign = privkey.sign(tx_hash_raw).toDER();
        var sign_b64 = Buffer.from(sign).toString('base64');
        ws.send(JSON.stringify({msg_type:1, msg_cmd:0, msg_id:0, sign:sign_b64, data:data_obj}));
    } else if(msg_obj.msg_type == 0 && msg_obj.msg_cmd == 1) { // SYS_PONG
        setTimeout(function() {
            ws.send(JSON.stringify({msg_type:0, msg_cmd:0, msg_id:0})); // SYS_PING
        }, 10000);
    }
    else if(msg_obj.msg_type == 1 && msg_obj.msg_cmd == 0) { // ACCOUNT_IMPORT
	if(msg_obj.err_code == null) {
	    console.log("start askcoin-gen-reg-sign server successfully.");
	    latest_block_id = msg_obj.block_id;
	} else {
	    console.log("error: your privkey is not registered in Fullnode");
	}
    }
    else if(msg_obj.msg_type == 3 && msg_obj.msg_cmd == 0) // BLOCK_SYNC
    {
        latest_block_id = msg_obj.block_id;
    }
});

app.use(express.static("/usr/share/nginx/askcoin-gen-reg-sign/www"));

app.get('/', function (req, res) {
   res.sendFile("/index.html");
});

app.get('/generate', function (req, res) {
    if(req.query.user == null) {
	res.send("user can't be null");
	return;
    }

    var data_obj = {};
    data_obj.block_id = latest_block_id + 1;
    data_obj.fee = 2;
    data_obj.name = req.query.user;
    data_obj.referrer = pubkey_b64;
    var data_obj_hash_raw = hash.sha256().update(hash.sha256().update(JSON.stringify(data_obj)).digest()).digest();
    var sign = privkey.sign(data_obj_hash_raw).toDER();
    var sign_b64 = Buffer.from(sign).toString('base64');
    var sign_string = '{"sign":"' + sign_b64 + '","sign_data":' + JSON.stringify(data_obj) + '}';
    res.send(sign_string);
});

app.listen(8088, function () {});
