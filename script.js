$(document).ready(function() {
  var noSleep = new NoSleep();
  var viewmode = "info";
  addTolog("loaded ");
  var wsUri = "wss://broadcast.sms-timing.com:10015/";
  var init = 0;
  var kartfollow = 0;
  var namefollow = '';
  var lastlap=0;
  var drivers = [];
  var heatstart = 0;
  var heatstate = [ "not started"
                  , "running"
                  , "paused"
                  , "stopped"
                  , "finished"
                  , "next heat"];

  // Check if it is iOS
  var isiOS = (navigator.userAgent.match(/(iPad|iPhone|iPod)/g) ? true : false);

  if(isiOS === true) {

  // Store -webkit-tap-highlight-color as this gets set to rgba(0, 0, 0, 0) in the next part of the code
    var tempCSS = $('a').css('-webkit-tap-highlight-color');
      $('body').css('cursor', 'pointer')                                    // Make iOS honour the click event on body
        .css('-webkit-tap-highlight-color', 'rgba(0, 0, 0, 0)');     // Stops content flashing when body is clicked

      // Re-apply cached CSS
      $('a').css('-webkit-tap-highlight-color', tempCSS);
  }

  $( "body" ).on( "click", function(evt) {
    console.log(evt.target.id);
    if (evt.target.id != "karts" && evt.target.id != '') {
      changeView();
    }

  });


function changeView () {
    //console.log("clicked");
    if ( viewmode === "info" ) {
      showClock();
    } else {
      showInfo();
    }
 }

  // Enable wake lock.
  // (must be wrapped in a user input event handler e.g. a mouse or touch handler)
  document.addEventListener("click", function enableNoSleep() {
    document.removeEventListener("click", enableNoSleep, false);
    addTolog("anti sleep enable");
    noSleep.enable();
  }, false);

  document.addEventListener("visibilitychange", function visChange() {
    addTolog(document.visibilityState);
	if (document.hidden) {
        clearTimeout(noSleepTimer);
        noSleep.disable();
    } else {
        noSleep.disable(); // Make sure old instance is disabled or the below iOS fix may break Android
        noSleep = new NoSleep(); // For iOS
    }
  });

  function showClock() {
    viewmode = "clock";
    $("#col1").hide()
    $("#col2").hide()
    $("#colall").show()
    //$("status").hide();
    //$(".clock").show();
  }

  function showInfo() {
    viewmode = "info";
    $("#col1").show()
    $("#col2").show()
    $("#colall").hide()
    //$("status").show();
    //$(".clock").hide();
    //screen.orientation.unlock();
  }

  function setApptitle(t) {
    $("#apptitle").text(t);
  }

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
    //setApptitle("setdrivers run: " + arr.length);
    var selected = sel || 0;
    $("#karts").empty();
    $("#karts").append($("<option></option>").val(0).html("None"));
    $.each(arr.sort((a,b) => (parseInt(a.K) > parseInt(b.K) ? 1: -1)), function(key, val) {
       $('#karts').append( $('<option></option>').val(val.K).html(val.K +": " + val.N) )
       if ( selected == 0 && val.N == namefollow ) {
         selected = val.K;
         kartfollow = val.K;
         console.log("found "+namefollow);
       }
    } );
    console.log("setting  "+selected);
    //$("#karts select").val(selected);
    $('#karts option[value="' + selected +'"]').prop('selected', true);
  }

  function setClock(ms) {
    var num = ((ms % 10000) / 1000).toFixed(1);
    $("#clock").text(num);
  }

  function unFlashLap() {
    $('#clock').removeClass('glow');
  }

  function FlashLap() {
    $('#clock').addClass('glow');
    var tid = setTimeout(unFlashLap, 2000);
  }

  function getTime() {
    var today = new Date();
    var now = startTotime(today.getTime() - today.getTimezoneOffset() * 60000);
    return now;
  }

  function initinfo() {
    setApptitle("Roskilde Racingcenter");
    setHeatcap("Heat");
    $("#heatstatus").text("NO RACE");
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
    console.log(evt);
    if(evt.code === 1000) {
      //try reconnect
      addTolog("reconnecting :");
      startWebSocket(wsUri);
    } else {
      addTolog("WS CLOSED:" + evt.code);
    }
  }

  function onError(evt) {
    socketStatus("ERROR");
    addTolog("WS ERROR:");
    addTolog(evt);
  }


  function setDriver (driver) {
     if (driver.L > 0) {
       setClock(driver.T);
       if (driver.L > lastlap) {
          lastlap = driver.L;
          var best = 0;
          var log = driver.N + " ("+ driver.L + "): " + lapTotime(driver.T);
          if ( driver.T <= driver.B && driver.L > 1) {
            best = 1;
            log += " **";
          }
            
          addTolog(log);
          FlashLap();
       }

       setApptitle(driver.N + ' ' + driver.P )
    }
  }

  function onMessage(evt) {
    $("#dataactive").text(getTime());
    if(init++ % 500 === 0) {
      console.log(JSON.stringify(JSON.parse(evt.data), null, 2));
    }

    d = JSON.parse(evt.data);
    //UpdateHeat();
    if(d.T) {

      //var drivers = [];
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
	  //console.log("find kart: "+kartfollow);
      if (kartfollow > 0) {
        drivers.forEach( (driver, index, a ) => {
          if (driver.K === kartfollow && driver.L > 0) {
            setDriver(driver);
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
     var heatname = data.N.replace(/\[HEAT\] /gi,'');
     setHeatcap(heatname);
     addTolog("New heat: " + heatname);
     setHeatstart(data.T*1000);
     showInfo();
  }

  function pad(n) {
    if(n < 10) {
      n = "0" + n;
    }
    return n;
  }

  /*** end websocket ***/

  function addTolog(msg) {
    console.log(msg);
    $("<div />").text(getTime() +': ' + msg).appendTo("#debuglog")
    var height = $("#debuglog").get(0).scrollHeight;
    //console.log('h:'+ height);
    $("#debuglog").animate({
      scrollTop: height
    }, 100);
  }

  function startTotime(mseconds) {
    var date = new Date(mseconds);
    var hh = date.getUTCHours();
    var mm = date.getUTCMinutes();
    var ss = date.getSeconds();
    // This formats your string to HH:MM:SS
    var t = hh + ":" + pad(mm) + ":" + pad(ss);
    return t;
  }

  function lapTotime(mseconds) {
    var date = new Date(mseconds);
    var t = date.getMinutes() + ":" + pad(date.getSeconds()) + "." + pad(Math.round(date.getMilliseconds()/10));
    return t;
  }

const Installer = function(root) {
  let promptEvent;

  const install = function(e) {
    if(promptEvent) {
      promptEvent.prompt();
      promptEvent.userChoice
        .then(function(choiceResult) {
          // The user actioned the prompt (good or bad).
          // good is handled in 
          promptEvent = null;
          root.classList.remove('available');
          console.log("rm ava inst ok");
        })
        .catch(function(installError) {
          // Boo. update the UI.
          promptEvent = null;
          root.classList.remove('available');
          console.log("rm ava inst not ok");
        });
    }
  };

  const installed = function(e) {
    promptEvent = null;
    // This fires after onbeforinstallprompt OR after manual add to homescreen.
    root.classList.remove('available');
          console.log("rm ava is installed");
  };

  const beforeinstallprompt = function(e) {
    promptEvent = e;
    promptEvent.preventDefault();
    root.classList.add('available');
    return false;
  };

  window.addEventListener('beforeinstallprompt', beforeinstallprompt);
  window.addEventListener('appinstalled', installed);

  root.addEventListener('click', install.bind(this));
  root.addEventListener('touchend', install.bind(this));
  console.log("installer init");
};


  const installEl = document.getElementById('installer');
  const installer = new Installer(installEl);

  initinfo();
  startWebSocket(wsUri);

  $("#karts" ).change(function() {
    kartfollow = $( this ).val();
    lastlap=0;
    //setClock(0);
    $("#clock").text('?.?');
    showClock();
    setApptitle($(this).find("option:selected").text());
    drivers.forEach( (driver, index, a ) => {
      if (driver.K === kartfollow) {
        lastlap = driver.L;
        namefollow = driver.N;
        setDriver(driver);
      }
    });
  });

  screen.orientation.addEventListener("change", function(e) {
    console.log(screen.orientation.type + " " + screen.orientation.angle);
    }, false);
});
