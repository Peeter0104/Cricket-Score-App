var scoreboard = [[], [0]]; // Initialize with an empty first element and the first over with 0 extras
var scoreboardInfo = {};
var ball_no = 1;
var over_no = 1;
var runs = 0;
var wickets = 0;
var edited = [];
var isNoBall = false;
var isTargetMode = false;
var targetRuns = -1;
var targetOvers = -1;
var isShareMode = false;
let currentMatchCode = -1;
let client = null;
let isStartConnectDone = false;
let topic = "";
let clientID = "";
let host = "test.mosquitto.org";
let port = 8080;

$(document).ready(function () {
  console.log("Document ready in main.js"); // ADDED LOG
  $("#run_dot").on("click", function (event) { console.log("Dot button clicked"); if (!isShareMode) play_ball("D"); }); // ADDED LOG
  $("#run_1").on("click", function (event) { console.log("1 button clicked"); if (!isShareMode) play_ball(1); }); // ADDED LOG
  $("#run_2").on("click", function (event) { console.log("2 button clicked"); if (!isShareMode) play_ball(2); }); // ADDED LOG
  $("#run_3").on("click", function (event) { console.log("3 button clicked"); if (!isShareMode) play_ball(3); }); // ADDED LOG
  $("#run_wide").on("click", function (event) { console.log("Wide button clicked"); if (!isShareMode) play_ball("+"); }); // ADDED LOG
  $("#run_no_ball").on("click", function (event) { console.log("No ball button clicked"); if (!isShareMode) play_ball("NB"); }); // ADDED LOG
  $("#run_4").on("click", function (event) { console.log("4 button clicked"); if (!isShareMode) play_ball(4); }); // ADDED LOG
  $("#run_6").on("click", function (event) { console.log("6 button clicked"); if (!isShareMode) play_ball(6); }); // ADDED LOG
  $("#run_W").on("click", function (event) { console.log("Wicket button clicked"); if (!isShareMode) play_ball("W"); }); // ADDED LOG
  $("#scoreboard-btn").on("click", function (event) { console.log("Scoreboard button clicked"); update_scoreboard(); }); // ADDED LOG
  $("#shareMatchCodeButton").on("click", function (event) { console.log("Share button clicked"); generateShareLink(); }); // ADDED LOG
  init();
});

function init() {
  const urlParams = new URLSearchParams(window.location.search);
  const matchCodeFromUrl = urlParams.get("matchCode");
  if (matchCodeFromUrl) { isShareMode = true; disableEditing(); startConnect(matchCodeFromUrl); } else { let myModal = new bootstrap.Modal(document.getElementById("shareModal"), {}); myModal.show(); startConnect(); }
  if (urlParams.get("debug") == null || urlParams.get("debug") != "true") { $("#messages").hide(); }
  update_scoreboard();
  update_score();
  update_runboard();
}

function disableEditing() { /* ... */ }
function generateShareLink() { /* ... */ }

function play_ball(run) {
  console.log("play_ball called with run:", run); // ADDED LOG
  if (isShareMode) {
    console.log("isShareMode is true, returning from play_ball"); // ADDED LOG
    return;
  }

  let scoreEffect = 0;
  if (run === "+") { runs++; scoreboard[over_no][0] = (scoreboard[over_no][0] || 0) + 1; scoreEffect = 1; publishUpdate({ type: "run", value: run }); }
  else if (run === "NB") { noBall(true); runs++; scoreboard[over_no][0] = (scoreboard[over_no][0] || 0) + 1; scoreEffect = 1; publishUpdate({ type: "run", value: run }); return; }
  else if (run === "W") { wickets++; scoreboard[over_no][ball_no] = run; publishUpdate({ type: "wicket" }); }
  else { runs += parseInt(run); scoreboard[over_no][ball_no] = parseInt(run); scoreEffect = parseInt(run); publishUpdate({ type: "run", value: parseInt(run) }); }

  if (run !== "+" && !isNoBall) {
    update_runboard();
    ball_no++;
    if (ball_no >= 7) {
      saveBowlerName();
      ball_no = 1;
      over_no++;
      scoreboard[over_no] = [0]; // Ensure new over starts with [0] for extras
      console.log("Started new over:", over_no, "Scoreboard:", scoreboard); // LOGGING
    }
  } else if (isNoBall && run !== "+") {
    scoreboard[over_no][ball_no] = run === "D" ? "D" : parseInt(run);
    update_runboard();
    noBall(false);
    publishUpdate({ type: "noBallRun", value: run });
  }

  update_score();
  update_scoreboard();
  console.log("After play_ball - Over:", over_no, "Ball:", ball_no, "Scoreboard:", scoreboard); // LOGGING
}

function saveBowlerName() { /* ... */ }
function update_runboard() { /* ... */ }
function change_score() { /* ... */ }

function update_scoreboard() {
  const tableBody = $("#scoreboard-body");
  tableBody.empty();
  console.log("Updating scoreboard. Current scoreboard data:", scoreboard); // LOGGING

  for (let i = 1; i < scoreboard.length; i++) {
    if (scoreboard[i]) {
      const row = $("<tr></tr>");
      const overCell = $("<td></td>").text(i);
      // Extract ball scores, filter out undefined, and join
      const ballScores = scoreboard[i].slice(1).filter(score => score !== undefined).join(" - ");
      const extras = scoreboard[i][0] || 0;
      const scoreCell = $("<td></td>").text(`${ballScores} (${extras})`);
      const bowlerCell = $("<td></td>").text(scoreboardInfo[i]?.bowler || "");
      row.append(overCell, scoreCell, bowlerCell);
      tableBody.append(row);
      console.log("Processed over:", i, "Data:", scoreboard[i], "Ball Scores:", ballScores, "Extras:", extras); // LOGGING
    } else {
      console.log("Scoreboard data is undefined for over:", i); // LOGGING
    }
  }
  if (isShareMode) { updateHtml("#scoreboard", $("#scoreboard").prop('outerHTML'), false); }
  else { updateHtml("#scoreboard", $("#scoreboard").prop('outerHTML'), true); }
}

function update_score() {
  runs = 0;
  wickets = 0;
  for (let i = 1; i < scoreboard.length; i++) {
    if (scoreboard[i]) {
      runs += scoreboard[i].slice(1).reduce((sum, val) => sum + (Number.isInteger(val) ? val : 0), 0) + (scoreboard[i][0] || 0);
      wickets += scoreboard[i].slice(1).filter(val => val === "W").length;
    }
  }
  updateHtml("#run", runs);
  updateHtml("#wickets", wickets);
}

function back_button() {
  if (over_no > 1 || ball_no > 1) {
    if (ball_no === 1) {
      over_no--;
      ball_no = scoreboard[over_no].length;
    } else {
      ball_no--;
    }
    const lastBall = scoreboard[over_no][ball_no];
    if (lastBall === "W") {
      wickets--;
    } else if (Number.isInteger(lastBall)) {
      runs -= lastBall;
    }
    scoreboard[over_no][ball_no] = undefined;
    update_score();
    update_scoreboard();
    update_runboard();
    publishUpdate({ type: "undo" });
  }
}

function noBall(is_NoBall) {
  isNoBall = is_NoBall;
  if (isNoBall) {
    $("#no-ball-warning").show();
  } else {
    $("#no-ball-warning").hide();
  }
}

function setTarget(isTargetModeOn = true) {
  isTargetMode = isTargetModeOn;
  if (isTargetMode) {
    targetRuns = parseInt($("#targetRuns").val());
    targetOvers = parseInt($("#targetOvers").val());
    $("#targetBoard").show();
    updateTarget();
  } else {
    $("#targetBoard").hide();
    targetRuns = -1;
    targetOvers = -1;
    publishUpdate({ type: "targetUpdate", isTargetMode: false, targetRuns: -1, targetOvers: -1 });
  }
  publishUpdate({ type: "targetUpdate", isTargetMode: isTargetMode, targetRuns: targetRuns, targetOvers: targetOvers });
}

function updateTarget() {
  if (isTargetMode && targetRuns !== -1 && targetOvers !== -1) {
    const runsRequired = targetRuns - runs;
    const ballsBowled = (over_no - 1) * 6 + (ball_no - 1);
    const ballsRemaining = targetOvers * 6 - ballsBowled;
    $("#targetRunsRequired").text(runsRequired > 0 ? runsRequired : 0);
    $("#targetOversLeft").text(Math.floor(ballsRemaining / 6) + "." + (ballsRemaining % 6));
  }
}

function updateHtml(eleId, newHtml, shouldPublish = true) {
  $(eleId).html(newHtml);
  if (isShareMode && shouldPublish) {
    publishUpdate({ type: "updateHtml", id: eleId.substring(1), html: newHtml });
  }
}

function sendInitVariables() {
  const state = {
    runs: runs,
    wickets: wickets,
    overBallDisplay: `${over_no - 1}.${ball_no - 1}`,
    scoreboard: scoreboard,
    scoreboardInfo: scoreboardInfo,
    isTargetMode: isTargetMode,
    targetRuns: targetRuns,
    targetOvers: targetOvers,
    ballButtons: getBallButtonStates()
  };
  publishMessage(JSON.stringify({ type: "init", state: state }));
}

function getBallButtonStates() {
  const states = {};
  for (let i = 1; i <= 6; i++) {
    states[`ball_no_${i}`] = $(`#ball_no_${i}`).text();
  }
  return states;
}

function onConnect() {
  console.log("Connected to MQTT");
  isStartConnectDone = true;
  sendInitVariables();
}

function onConnectionLost(responseObject) {
  console.log("Connection Lost: " + responseObject.errorMessage);
}

function onMessageArrived(message) {
  // Handle messages if needed in main.js
}

function publishUpdate(payload) {
  if (isShareMode && isStartConnectDone && client && client.isConnected()) {
    payload.matchCode = currentMatchCode;
    client.send(new Paho.MQTT.Message(JSON.stringify(payload)));
  }
}
