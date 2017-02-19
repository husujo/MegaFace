var dotenv = require('dotenv');
var fs = require('fs');
var http = require('http');
var path = require('path');
var async = require('async');
var socketio = require('socket.io');
var express = require('express');
var router = express();
var server = http.createServer(router);
var io = socketio.listen(server);
var img64 = require('img64');
var querystring = require('querystring');
var request = require('request');
var easyrtc = require("easyrtc")
var Peer = require("simple-peer")

// load configuration from .env
dotenv.load();

io.set('log level', 1); // reduce logging

router.use(express.static(__dirname + '/client'));

router.get('/vdo', function(req, res) {
  res.sendfile('./client/vdo-capture.html');

});

router.get('/face', function(req, res) {
  res.sendfile('./client/face.html');

});

router.get('/call', function(req, res) {
  res.sendfile('./client/call.html');

});


router.get('/getimage/:id', function(req, res) {
  var id = req.params.id;
  console.log('id '+ id);
  res.sendfile('./client/img/'+id);
});

var categories = ["anger","fear","happiness","neutral","sadness","surprise","contempt","disgust"];
// var players = {};
function newCategory() {
  // console.log(Math.floor(Math.random()*6));
  return categories[Math.floor(Math.random()*8)];
}


var executiveStart = false;
var executiveStart2 = false;

var numPlayers = 0;
var readyCount = 0;
var photoReady = 0;
var localNumPlayers = 0;
var currentCategory;
var playerscores = {};
var playerImages = {};
var playerReadys = {};

function startGame() {
  
  console.log("trying to start game");
  console.log(numPlayers + " numPlayers");
  console.log(readyCount + "readyCount");
  if ((numPlayers < 2 || readyCount != numPlayers) && executiveStart==false) {
    return;
  };
  executiveStart = false;
  console.log("starting game with " + readyCount + " players");
  localNumPlayers = readyCount; // only consider these players this round
  // readyCount = 0;
  
  console.log("emitting: begin");
  var cat = newCategory();
  currentCategory = cat;
  console.log(cat);
  
  // send everyone the category
  sockets.forEach(function (socket) {
    socket.emit('begin', cat);
  });
  
}

function getPhotos() {
  
  if ((localNumPlayers != photoReady) && executiveStart2==false) { // wait until everyone sent a photo
    return;
  }
  executiveStart2 = false;
  
  console.log("photoReady: " + photoReady);
  
  console.log("in get photos, " + playerscores);

  // calculate results
  for (var key in playerscores) {
    console.log("score for player " + key + "=" + playerscores[key]);
  }
  
  var score_results = [];
  for (var key in playerscores) {
    score_results.push([key, playerscores[key]]);
  }
  
  score_results.sort(function(a, b) {
    return b[1] - a[1];
  });
  
   // send everyone the results, who won etc
    sockets.forEach(function (socket) {
      socket.emit('final results', score_results, playerImages);
    });
  
  // reset any variables you need ** maybe before you emit*****
  photoReady = 0;
  counter = 0;
  playerscores = {};
  playerImages = {};
  playerReadys = {};
  
  startGame();
}



var counter = 0;
var idcounter = 0;
var sockets = [];


io.on('connection', function (socket) {
    
    var localid = idcounter;
    socket.emit('assign id', idcounter);
    console.log("new player: " + idcounter);
    idcounter += 1;
    numPlayers += 1;
    sockets.push(socket);
    playerReadys[localid] = false;
    
    socket.on('ready',function(userid) {
      if (playerReadys[userid] == true) {
        return;
      }
      playerReadys[userid] = true;
      readyCount += 1;
      startGame();
    });
    
    socket.on('photo', function (msg, userid) {
      if (playerReadys[userid] == false) {
        return;
      }
      console.log("photo from " + userid);
      // console.log(msg);
      
      // save the file to the server:
      var decodedImage = new Buffer(msg, 'base64');
      var imgstr = 'client/img/' + counter + 'image.png';
      var imgurl = 'https://ahem-aha-aw-tkhunkhe.c9users.io/getimage/' + counter + 'image.png';// + new Date().getTime();
      // playerImages[userid] = counter;
      counter += 1;
      fs.writeFile(imgstr, decodedImage, function(err) {});
      
      // send the url back to the client
      playerImages[userid] = imgurl;
      socket.emit('now request microsoft', imgurl);
    });
    
    socket.on('client results', function(id, results) {
      
      if (results == null) {
        return;
      }
      
      // add results to the list or something
      console.log("getting results from " + id);
      // console.log(results);
      var score;
      var temp;
      
      for (var key in results.scores) {
        temp = results.scores[key];
        // console.log(temp);
        if (key == currentCategory) {
            console.log("score: " + temp);
            score = results.scores[key];
        }
      }
      
      playerscores[id] = score;
      
      photoReady += 1;
      
      // var imgpath = url.replace("https://ahem-aha-aw-tkhunkhe.c9users.io/getimage/","client/img/");
      
      
      // fs.unlinkSync(imgpath);
      // delete the image on the server side
      
      getPhotos();
    });
    
    socket.on('disconnect', function () {
        console.log("disconnection");
        // subtract the appropriate variables
        numPlayers -= 1;
        readyCount -= 1;
        if (readyCount < 0) {
          readyCount = 0;
        }
        sockets.splice(sockets.indexOf(socket), 1);
    });
    
    socket.on('executiveStart', function() {
        executiveStart = true;
        startGame();
    });
    
    socket.on('executiveStart2', function () {
      executiveStart2 = true;
      getPhotos();
    });
  
});















// /* try easyrtc */

// easyrtc.setOption("logLevel", "debug");

// // Overriding the default easyrtcAuth listener, only so we can directly access its callback
// easyrtc.events.on("easyrtcAuth", function(socket, easyrtcid, msg, socketCallback, callback) {
//     easyrtc.events.defaultListeners.easyrtcAuth(socket, easyrtcid, msg, socketCallback, function(err, connectionObj){
//         if (err || !msg.msgData || !msg.msgData.credential || !connectionObj) {
//             callback(err, connectionObj);
//             return;
//         }

//         connectionObj.setField("credential", msg.msgData.credential, {"isShared":false});

//         console.log("["+easyrtcid+"] Credential saved!", connectionObj.getFieldValueSync("credential"));

//         callback(err, connectionObj);
//     });
// });

// // To test, lets print the credential to the console for every room join!
// easyrtc.events.on("roomJoin", function(connectionObj, roomName, roomParameter, callback) {
//     console.log("["+connectionObj.getEasyrtcid()+"] Credential retrieved!", connectionObj.getFieldValueSync("credential"));
//     easyrtc.events.defaultListeners.roomJoin(connectionObj, roomName, roomParameter, callback);
// });

// // Start EasyRTC server
// var rtc = easyrtc.listen(router, io, null, function(err, rtcRef) {
//     console.log("Initiated");

//     rtcRef.events.on("roomCreate", function(appObj, creatorConnectionObj, roomName, roomOptions, callback) {
//         console.log("roomCreate fired! Trying to create: " + roomName);

//         appObj.events.defaultListeners.roomCreate(appObj, creatorConnectionObj, roomName, roomOptions, callback);
//     });
// });















server.listen(process.env.PORT || 8080, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("server listening at", addr.address + ":" + addr.port);
  console.log("emotion api key ", process.env.MICROSOFT_EMOTION_API_KEY);

});



















function postRequest(imgurl, res) {

  // call request with the following paramaters:
  request.post(
    {headers: {
        // 'Content-Length': contentLength,
        "Content-Type":"application/json",
        'Ocp-Apim-Subscription-Key':process.env.MICROSOFT_EMOTION_API_KEY
      },
      uri: 'https://westus.api.cognitive.microsoft.com/emotion/v1.0/recognize',
      data: '{ "url": "https://cauldronsandcupcakes.files.wordpress.com/2013/04/sad-eyes.jpg" }',
       },
    function (err, res, data) {
      // console.log(data);
    }
  );
  
  // end of request function
}