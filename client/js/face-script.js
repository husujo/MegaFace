
  $(function() {
    (function() {
        
        $("#ready-btn").click(function(){readyUp(); $(this).hide();});
        $("#e1-btn").click(function(){executiveStart()});
        $("#e2-btn").click(function(){executiveStart2()});
        
        
        var socket = io.connect();
        var myid;
        
        function executiveStart() {
          var passwd = $("#password").val();
          console.log(passwd);
          if (passwd == "derp") {
            socket.emit('executiveStart');
          }
        }
        function executiveStart2() {
          var passwd = $("#password").val();
          console.log(passwd);
          if (passwd == "derp") {
            socket.emit('executiveStart2');
          }
        }
        function readyUp() {
          socket.emit('ready', myid);
        }
        
        function sendPhoto(photo) {
            console.log("sending photo data to server");
            socket.emit('photo',photo,myid /*the photo data */);
        }
        
        socket.on('begin', function(category) {
          console.log("begin");
          console.log(category);
          $("#category").text(category);
          // print the category to the screen (the emotion to make)
          // this should now enable you to take a picture, which should start the game round.
          
          // can i see this broadcast twice in a row?
        });
        
        socket.on('assign id', function(id) {
          myid = id;
          console.log('my id is' + myid);
          // socket.emit('ready');
        });
        
        socket.on('now request microsoft', function(url) {
            // make the request
            
            emotion(url);
        });
        
        socket.on('final results', function(score_results, imageResults) {
            console.log(score_results[0]);
            var winnerURL = imageResults[score_results[0][0]];
            
            console.log("here's the results!");
            console.log(score_results);
            console.log(imageResults);
            console.log(winnerURL);
            console.log("end of results");
            d = new Date();
            $("#winner-img").attr("src", winnerURL+"?"+d.getTime());
            
            
            var secondPlaceURL = imageResults[score_results[1][0]]; // not sure
            console.log(secondPlaceURL + " 2nd");
            if (secondPlaceURL != null) {
              console.log("not null");
              $("#second-img").attr("src", secondPlaceURL+"?"+d.getTime());
            }
            
        });
        
    
    var streaming = false,
      video        = document.querySelector('#localVideo'),
      canvas       = document.querySelector('#canvas'),
      photo        = document.querySelector('#photo'),
      startbutton  = document.querySelector('#startbutton'),
      width = 320,
      height = 0;
    
    navigator.getMedia = ( navigator.getUserMedia ||
                         navigator.webkitGetUserMedia ||
                         navigator.mozGetUserMedia ||
                         navigator.msGetUserMedia);
    
    navigator.getMedia(
    {
      video: true,
      audio: false
    },
    function(stream) {
      if (navigator.mozGetUserMedia) {
        video.mozSrcObject = stream;
      } else {
        var vendorURL = window.URL || window.webkitURL;
        video.src = vendorURL.createObjectURL(stream);
      }
      video.play();
    },
    function(err) {
      console.log("An error occured! " + err);
    }
    );
    
    video.addEventListener('canplay', function(ev){
    if (!streaming) {
      height = video.videoHeight / (video.videoWidth/width);
      video.setAttribute('width', width);
      video.setAttribute('height', height);
      canvas.setAttribute('width', width);
      canvas.setAttribute('height', height);
      streaming = true;
    }
    }, false);
    
    function takepicture() {
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(video, 0, 0, width, height);
    var data = canvas.toDataURL('image/png');
    //photo.setAttribute('src', data);
    
    sendPhoto(data.replace("data:image/png;base64,","")); // socket
    }
    
    startbutton.addEventListener(
    'click',
    function(ev){
        takepicture();
        ev.preventDefault();
        
    },
    false
    );
    
    
    function roundUp(num, precision) {
    return Math.ceil(num * precision) / precision
    }
    
    function drawSquare(params){
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(video, 0, 0, width, height);
    var context = canvas.getContext('2d');
    
    var startX = params.left;
    var startY = params.top;
    
    
    context.clearRect(0, 0, context.width, context.height);
    
    context.beginPath();
    context.rect(startX, startY, params.width, params.height);
    // context.fillStyle = 'yellow';
    // context.fill();
    context.lineWidth = 5;
    context.strokeStyle = 'Lime';
    context.stroke();
    }
    
    
    
    function emotion(src){
      console.log(src);
      var params = {
      // Request parameters
      };
    
    $.ajax({
        url: "https://westus.api.cognitive.microsoft.com/emotion/v1.0/recognize",
        beforeSend: function(xhrObj){
            // Request headers
            xhrObj.setRequestHeader("Content-Type","application/json");
            xhrObj.setRequestHeader("Ocp-Apim-Subscription-Key","6b014a7b7bf64046a61c5c7d9d88c2d6");
        },
        type: "POST",
        // Request body
        data: '{ "url":"'+src+'"}',
        success: function(responseJson) {
            socket.emit('client results', myid, responseJson[0]);
            console.log(JSON.stringify(responseJson[0]));
            $("#tab").children().remove();
            
            drawSquare(responseJson[0].faceRectangle);
            
                $.each(responseJson[0].scores,function(key, value) {
                    var htmlstring = '<div class="progress">'+
    '<div class="progress-bar" role="progressbar" aria-valuenow="'+(value*100) +'" aria-valuemin="0" aria-valuemax="100" style="width:'+(value*100)+'%">'+roundUp(value*100, 100)+
    '%</div></div>';
                    var row= $('<tr> </tr>').appendTo('#tab');  
                    $('<td> </td>').text(key).appendTo(row);
                    $('<td> </td>').html(htmlstring).appendTo(row);
                });
             
             
        },
        error: function(error) {
            alert(JSON.stringify(error));
        }
    });
    }
    
    })();
    
});