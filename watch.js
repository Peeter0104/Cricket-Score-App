var scoreboard = [[], [0]]; //scoreboard[<over_no>][0] counts wide runs
var scoreboardInfo = {}; // To store bowler info per over
var ball_no = 1; // Ball number will start from 1
var over_no = 1; // Over number will start from 1
var runs = 0;
var edited = [];
var isNoBall = false;
var isTargetMode = false;
var targetRuns = -1; // total runs scored by other team
var targetOvers = -1; //total overs

var topic = -1;

$(document).ready(function () {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("matchCode") != null) {
    console.log(urlParams.get("matchCode"));
    startConnect(urlParams.get("matchCode")); //TODO
  } else {
    let myModal = new bootstrap.Modal(
      document.getElementById("shareModal"),
      {}
    );
    myModal.show();
  }
  console.log(document.location.origin);

  if (urlParams.get("debug") == null || urlParams.get("debug") != "true")
    $("#messages").hide();
});

function getMatchCodeNConnect() {
  let matchCode = $("#matchCodeInput").val();
  startConnect(matchCode);
}

let isStartConnectDone = false;

function startConnect(_topic) {
  clientID = "clientID - " + parseInt(Math.random() * 100);

  host = "test.mosquitto.org";
  port = 8080;
  topic = _topic ?? "" + parseInt(Math.random() * 1000000);

  document.getElementById("messages").innerHTML +=
    "<span> Connecting to " + host + "on port " + port + "</span><br>";
  document.getElementById("messages").innerHTML +=
    "<span> Using the client Id " + clientID + " </span><br>";

  client = new Paho.MQTT.Client(host, Number(port), "/ws", clientID); // Added "/ws" for WebSocket

  client.onConnectionLost = onConnectionLost;
  client.onMessageArrived = onMessageArrived;

  client.connect({
    timeout: 3,
    onSuccess: onConnect,
    onFailure: onFailure, // Added onFailure handler
    //        userName: userId,
    //        passwordId: passwordId
  });
  isStartConnectDone = true;
  console.log("start connect done!");
}

function onFailure(responseObject) {
  document.getElementById("messages").innerHTML += `<span>Error connecting to MQTT: ${responseObject.errorMessage}</span><br>`;
}

function onConnect() {
  document.getElementById("messages").innerHTML +=
    "<span> Subscribing to topic " + topic + "</span><br>";

  client.subscribe("cricket_score/" + topic); // Changed subscription topic to match main.js
  console.log("onConnect called");
}

function onConnectionLost(responseObject) {
  document.getElementById("messages").innerHTML +=
    "<span> ERROR: Connection is lost.</span><br>";
  if (responseObject != 0) {
    document.getElementById("messages").innerHTML +=
      "<span> ERROR:" + responseObject.errorMessage + "</span><br>";
  }
}

function onMessageArrived(message) {
  console.log("OnMessageArrived: " + message.payloadString);
  document.getElementById("messages").innerHTML +=
    "<span> Topic:" +
    message.destinationName +
    "| Message : " +
    message.payloadString +
    "</span><br>";

  let payload = JSON.parse(message.payloadString);
  if (payload.type === "updateHtml") {
    updateHtml(payload.id, payload.html);
  } else if (payload.type === "init") {
    showConnected();
    initHtml(payload.state); // Pass the 'state' object
    scoreboardInfo = payload.state.scoreboardInfo || {};
    scoreboard = payload.state.scoreboard || [[], [0]]; // Initialize scoreboard
    isTargetMode = payload.state.isTargetMode || false;
    targetRuns = payload.state.targetRuns || -1;
    targetOvers = payload.state.targetOvers || -1;
    setTargetMode(isTargetMode, targetRuns, targetOvers, payload.state.runs, payload.state.overBallDisplay);
    updateScoreboard(payload.state.scoreboard); // Pass scoreboard data
    updateLiveScore(payload.state.runs, payload.state.wickets, payload.state.overBallDisplay, payload.state.ballButtons);
  } else if (payload.type === "scoreboardInfoUpdate") {
    scoreboardInfo[payload.scoreboardInfoUpdate.over] = payload.scoreboardInfoUpdate.info;
    updateScoreboard(scoreboard); // Use the current scoreboard data
  } else if (payload.type === "scoreChange") {
    if (scoreboard[payload.scoreChange.over]) {
      scoreboard[payload.scoreChange.over][payload.scoreChange.ball] = payload.scoreChange.run;
      updateScoreboard(scoreboard);
    }
  } else if (payload.type === "targetUpdate") {
    isTargetMode = payload.isTargetMode;
    targetRuns = payload.targetRuns;
    targetOvers = payload.targetOvers;
    setTargetMode(isTargetMode, targetRuns, targetOvers, $("#run").text(), $("#over-ball").text());
  } else if (payload.type === "run") {
    updateLiveScore(parseInt($("#run").text()) + (payload.value === "+" || payload.value === "NB" ? 1 : parseInt(payload.value)), $("#wickets").text(), $("#over-ball").text());
    updateScoreboard(scoreboard);
  } else if (payload.type === "wicket") {
    updateLiveScore($("#run").text(), parseInt($("#wickets").text()) + 1, $("#over-ball").text());
    updateScoreboard(scoreboard);
  } else if (payload.type === "noBallRun") {
    updateScoreboard(scoreboard);
  }
}

function publishMessage(msg) {
  if (!isStartConnectDone) return;

  Message = new Paho.MQTT.Message(msg);
  Message.destinationName = "cricket_score/" + topic; // Changed publish topic to match main.js

  client.send(Message);
  document.getElementById("messages").innerHTML +=
    "<span> Message to topic " + topic + " is sent </span><br>";
}

function updateHtml(eleId, newHtml) {
  $(eleId).html(newHtml);
}

function initHtml(state) {
  if (state) {
    $("#run").html(state.runDisplay);
    $("#wickets").html(state.wicketsDisplay);
    $("#over-ball").html(state.overBallDisplay);
    updateBallButtons(state.ballButtons);
  }
}

function updateBallButtons(ballButtonsState) {
  for (const key in ballButtonsState) {
    $("#" + key).html(ballButtonsState[key]);
    $("#" + key).removeClass("btn-primary").addClass("btn-light");
  }
}

function setTargetMode(isTargetMode, targetRuns, targetOvers, currentRuns, currentOverBall) {
  const targetBody = $("#targetBody");
  if (isTargetMode && targetRuns !== -1 && targetOvers !== -1) {
    $("#targetBody").parent().show();
    const runsRequired = targetRuns - parseInt(currentRuns);
    const overBallParts = currentOverBall.split('.');
    const oversBowled = parseInt(overBallParts[0]);
    const ballsBowledInOver = parseFloat("0." + overBallParts[1]) * 10 / 6; // Approximate balls in decimal
    const totalOversBowled = oversBowled + ballsBowledInOver;
    const oversLeft = targetOvers - totalOversBowled;

    let ballsLeft = Math.ceil((targetOvers - totalOversBowled) * 6);
    if (ballsLeft < 0) ballsLeft = 0;

    let message = "";
    if (ballsLeft <= 0 && parseInt(currentRuns) < targetRuns) {
      message = "Bowling team wins!";
    } else if (parseInt(currentRuns) > targetRuns) {
      message = "Batting team wins!";
    } else if (parseInt(currentRuns) === targetRuns && ballsLeft <= 0) {
      message = "Match tied!";
    } else {
      message = `Require <strong>${runsRequired}</strong> runs in <strong>${Math.floor(ballsLeft / 6)}.${ballsLeft % 6}</strong> overs`;
    }
    targetBody.html(message);
  } else {
    $("#targetBody").parent().hide();
    targetBody.html("");
  }
}

function updateLiveScore(runs, wickets, overBall, ballButtons) {
  $("#run").html(runs);
  $("#wickets").html(wickets);
  $("#over-ball").html(overBall);
  if (ballButtons) {
    updateBallButtons(ballButtons);
  }
}

function updateScoreboard(scoreboardData) {
  var tableBody = $("#scoreboard-body");
  tableBody.empty();

  if (scoreboardData) {
    for (var i = 1; i < scoreboardData.length; i++) {
      if (scoreboardData[i]) {
        var row = $("<tr></tr>");
        var overCell = $("<td></td>").text(i.toString());
        var score = scoreboardData[i].slice(1).filter(s => s !== undefined).join(" - ") + " (" + (scoreboardData[i][0] || 0).toString() + ")";
        var scoreCell = $("<td></td>").text(score);
        var bowlerCell = $("<td></td>").text(scoreboardInfo[i]?.bowler || '');
        row.append(overCell, scoreCell, bowlerCell);
        tableBody.append(row);
      }
    }
  }
}
