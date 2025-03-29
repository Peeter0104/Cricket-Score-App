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
  $("#run_dot").on("click", function (event) { if (!isShareMode) play_ball("D"); });
  $("#run_1").on("click", function (event) { if (!isShareMode) play_ball(1); });
  $("#run_2").on("click", function (event) { if (!isShareMode) play_ball(2); });
  $("#run_3").on("click", function (event) { if (!isShareMode) play_ball(3); });
  $("#run_wide").on("click", function (event) { if (!isShareMode) play_ball("+"); });
  $("#run_no_ball").on("click", function (event) { if (!isShareMode) play_ball("NB"); });
  $("#run_4").on("click", function (event) { if (!isShareMode) play_ball(4); });
  $("#run_6").on("click", function (event) { if (!isShareMode) play_ball(6); });
  $("#run_W").on("click", function (event) { if (!isShareMode) play_ball("W"); });
  $("#scoreboard-btn").on("click", function (event) { update_scoreboard(); });
  $("#shareMatchCodeButton").on("click", function (event) { generateShareLink(); });
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
  if (isShareMode) return;

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

function update_score() { /* ... */ }
function back_button() { /* ... */ }
function noBall(is_NoBall) { /* ... */ }
function setTarget(isTargetModeOn = true) { /* ... */ }
function updateTarget() { /* ... */ }
function updateHtml(eleId, newHtml, shouldPublish = true) { /* ... */ }
function sendInitVariables() { /* ... */ }
function onConnect() { /* ... */ }
function onConnectionLost(responseObject) { /* ... */ }
function onMessageArrived(message) { /* ... */ }
