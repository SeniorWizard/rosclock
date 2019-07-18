$(document).ready(function() {
  var noSleep = new NoSleep();
  console.log("loaded");
  var wsUri = "wss://broadcast.sms-timing.com:10015/";
  var init = 0;
  var kartfollow = 0;
  var drivers = [];
  var heatstart = 0;
  var heatstate = [ "not started"
                  , "running"
                  , "paused"
                  , "stopped"
                  , "finished"
                  , "next heat"];

  $("#hamburger").click(function() {
    console.log("clicked");
    $("#hamburger i").toggleClass("fa-check-circle").toggleClass("fa-info-circle"); //alternate bars and times
    $("status").toggle();
    $(".clock").toggle();
  });

  // Enable wake lock.
  // (must be wrapped in a user input event handler e.g. a mouse or touch handler)
  document.addEventListener("click", function enableNoSleep() {
    document.removeEventListener("click", enableNoSleep, false);
    console.log("anti sleep");
    noSleep.enable();
  }, false);

  document.addEventListener("visibilitychange", () => {
    console.log(document.visibilityState);
    if(document.visibilityState == "visible") {
      window.location.reload(); //Reload the whole page or use the commands below.
    }
  });

  function setHeatcap(t) {
    $("#heatcap").text(t);
  }

  function setHeatstate(t) {
    $("#heatstatus").text(t);
  }

  function setHeatrunning(t) {
    $("#heatrunning").text(startTotime(t || 0));
  }

  function setHeatstart(t) {
    $("#heatstart").text(startTotime(t || 0));
  }

  function setDrivers(arr,sel) {
    $("#karts").empty();
    $("#karts").append($("<option></option>").val(0).html("None"));
    $.each(arr.sort((a,b) => (parseInt(a.K) > parseInt(b.K) ? 1: -1)), function(key, val) {
       $('#karts').append( $('<option></option>').val(val.K).html(val.K +": " + val.N) )
    } );
    $("#karts select").val(sel || 0);
  }

  function setClock(ms) {
    num = ((ms % 10000) / 1000).toFixed(1);
    $("#clock").text(num);
  }

  function initinfo() {
    setHeatcap("Heat");
    $("#heatstatus").text("?");
    $("#heatstart").text("-");
    $("#heatrunning").text("-");
    //setDrivers( [ { K:2, N:'ole' } ], 0 );
    setDrivers( [ ], 0 );
    $("#datasocket").text("-");
    $("#dataactive").text("-");
    $("#clock").text("?.?");
  }


  /*** websocket ***/

  function startWebSocket(wsUri) {
    websocket = new WebSocket(wsUri);
    websocket.onopen = function(evt) {
      onOpen(evt)
    };
    websocket.onclose = function(evt) {
      onClose(evt)
    };
    websocket.onmessage = function(evt) {
      onMessage(evt)
    };
    websocket.onerror = function(evt) {
      onError(evt)
    };
  }

  function onOpen(evt) {
    socketStatus("CONNECTED");
    websocket.send("START 42829@roskilde");
  }

  function onClose(evt) {
    socketStatus("CLOSED");
    console.log("WS CLOSED:");
    console.log(evt);
    if(evt.code == 1000) {
      //try reconnect
      console.log("WS TRY RECONNECT:");
      startWebSocket(wsUri);
    }
  }

  function onError(evt) {
    socketStatus("ERROR");
    console.log("WS ERROR:");
    console.log(evt);
  }



  function onMessage(evt) {
    var today = new Date();
    $("#dataactive").text(startTotime(today.getTime() - today.getTimezoneOffset() * 60000))
    //console.log("Got RESPONSE:");
    if(init++ % 50 == 0) {
      console.log(JSON.stringify(JSON.parse(evt.data), null, 2));
    }

    d = JSON.parse(evt.data);
    //UpdateHeat();
    if(d.T) {

      drivers = [];
      if(d.D) {
        drivers = d.D.sort((a, b) => (a.P > b.P ? 1 : -1));
      }

      if(d.T != heatstart) {
        kartfollow = 0; 
        NewHeat(d);
        setDrivers(drivers,0);
      }

      setHeatstate(heatstate[d.S]);
      setHeatrunning(d.C);
      if (kartfollow > 0) {
        drivers.forEach( (driver, index, a ) => {
          if (driver.K == kartfollow) {
             //FlashLap();
            setClock(driver.T);
          }
        });
      }
    }
  }

  function socketStatus(msg) {
    $("#datasocket").text(msg);
  }

  function NewHeat (data) {
     heatstart = data.T;
     setHeatcap(data.N.replace(/\[HEAT\] /gi,''));
     setHeatstart(data.T*1000);
  }

  function pad(n) {
    if(n < 10) {
      n = "0" + n;
    }
    return n;
  }

  /*** end websocket ***/
  function startTotime(mseconds) {
    var date = new Date(mseconds);
    var hh = date.getUTCHours();
    var mm = date.getUTCMinutes();
    var ss = date.getSeconds();
    // This formats your string to HH:MM:SS
    var t = hh + ":" + pad(mm) + ":" + pad(ss);
    return t;
  }


  initinfo();
  startWebSocket(wsUri);
  $("#karts" ).change(function() {
    kartfollow = $( this ).val();
    setClock(0);
  });

  screen.orientation.addEventListener("change", function(e) {
    console.log(screen.orientation.type + " " + screen.orientation.angle);
    }, false);
});
