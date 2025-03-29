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
  $("#run_dot").on("click", function (event) {
    if (!isShareMode) play_ball("D");
  });
  $("#run_1").on("click", function (event) {
    if (!isShareMode) play_ball(1);
  });
  $("#run_2").on("click", function (event) {
    if (!isShareMode) play_ball(2);
  });
  $("#run_3").on("click", function (event) {
    if (!isShareMode) play_ball(3);
  });
  $("#run_wide").on("click", function (event) {
    if (!isShareMode) play_ball("+");
  });
  $("#run_no_ball").on("click", function (event) {
    if (!isShareMode) play_ball("NB");
  });
  $("#run_4").on("click", function (event) {
    if (!isShareMode) play_ball(4);
  });
  $("#run_6").on("click", function (event) {
    if (!isShareMode) play_ball(6);
  });
  $("#run_W").on("click", function (event) {
    if (!isShareMode) play_ball("W");
  });
  $("#scoreboard-btn").on("click", function (event) {
    update_scoreboard();
  });
  $("#shareMatchCodeButton").on("click", function (event) {
    generateShareLink();
  });
  init();
});

function init() {
  const urlParams = new URLSearchParams(window.location.search);
  const matchCodeFromUrl = urlParams.get("matchCode");

  if (matchCodeFromUrl) {
    console.log("Joining match with code:", matchCodeFromUrl);
    isShareMode = true;
    disableEditing();
    startConnect(matchCodeFromUrl);
  } else {
    let myModal = new bootstrap.Modal(
      document.getElementById("shareModal"), {}
    );
    myModal.show();
    startConnect(); // Generate a new match code for the creator
  }

  if (urlParams.get("debug") == null || urlParams.get("debug") != "true") {
    $("#messages").hide();
  }
  update_scoreboard();
  update_score(); // Initialize score display
  update_runboard(); // Initialize runboard display
}

function disableEditing() {
  $(".button-grid button").prop("disabled", true);
  $("#bowlerName").prop("disabled", true);
  $("#myModal2 button").prop("disabled", true); // Undo button
  $("#targetModeButton").hide();
  $("#change_score").prop("disabled", true);
  $("#change_over").prop("disabled", true);
  $("#change_ball").prop("disabled", true);
  $("#change_run").prop("disabled", true);
}

function generateShareLink() {
  if (currentMatchCode === -1) {
    alert("Please start or connect to a match first.");
    return;
  }
  const shareableLink = `<span class="math-inline">\{window\.location\.origin\}/watch\.html?matchCode\=</span>{currentMatchCode}`;
  $("#shareableLink").val(shareableLink);
  $("#shareableLinkContainer").show();
}

function play_ball(run) {
  if (isShareMode) return;

  let scoreEffect = 0;
  if (run === "+") {
    runs++;
    scoreboard[over_no][0] = (scoreboard[over_no][0] || 0) + 1;
    scoreEffect = 1;
    publishUpdate({ type: "run", value: run });
  } else if (run === "NB") {
    noBall(true);
    runs++;
    scoreboard[over_no][0] = (scoreboard[over_no][0] || 0) + 1;
    scoreEffect = 1;
    publishUpdate({ type: "run", value: run });
    return;
  } else if (run === "W") {
    wickets++;
    scoreboard[over_no][ball_no] = run;
    publishUpdate({ type: "wicket" });
  } else {
    runs += parseInt(run);
    scoreboard[over_no][ball_no] = parseInt(run);
    scoreEffect = parseInt(run);
    publishUpdate({ type: "run", value: parseInt(run) });
  }

  if (run !== "+" && !isNoBall) {
    update_runboard();
    ball_no++;
    if (ball_no >= 7) {
      saveBowlerName();
      ball_no = 1;
      over_no++;
      scoreboard[over_no] = [0];
    }
  } else if (isNoBall && run !== "+") {
    scoreboard[over_no][ball_no] = run === "D" ? "D" : parseInt(run);
    update_runboard();
    noBall(false);
    publishUpdate({ type: "noBallRun", value: run });
  }

  update_score();
  update_scoreboard();
}

function saveBowlerName() {
  const bowler = $("#bowlerName").val();
  if (bowler && !scoreboardInfo[over_no - 1]?.bowler) {
    scoreboardInfo[over_no - 1] = scoreboardInfo[over_no - 1] || {};
    scoreboardInfo[over_no - 1].bowler = bowler;
    publishScoreboardInfoUpdate(over_no - 1, { bowler: bowler });
    $("#bowlerName").val(''); // Clear after over
  }
}

function update_runboard() {
  for (let i = 1; i <= 6; i++) {
    const ballScore = scoreboard[over_no]?.[i];
    const displayScore = ballScore === undefined ? "" : ballScore;
    updateHtml("#ball_no_" + i, displayScore, false);
    $("#ball_no_" + i).removeClass("btn-primary").addClass("btn-light");
  }
  if (ball_no >= 1 && ball_no <= 6 && scoreboard[over_no]) {
    $("#ball_no_" + ball_no).removeClass("btn-light").addClass("btn-primary");
  }

  const currentOver = over_no - (ball_no === 1 && over_no > 1 ? 1 : 0);
  const currentBall = ball_no === 1 ? 0 : ball_no - 1;
  updateHtml("#over-ball", `<span class="math-inline">\{currentOver\}\.</span>{currentBall}`, false);
}

function change_score() {
  if (isShareMode) return;
  const over = parseInt($("#change_over").val());
  const ball = parseInt($("#change_ball").val());
  const run = $("#change_run").val();

  if (scoreboard[over] && scoreboard[over][ball] !== undefined) {
    edited.push([over, ball, scoreboard[over][ball], run]);
    scoreboard[over][ball] = run;
    update_score();
    update_scoreboard();
    updateHtml("#run", runs);
    let edited_scores = "Edited scores:<br>";
    for (let i = 0; i < edited.length; i++) {
      edited_scores += `(<span class="math-inline">\{edited\[i\]\[0\]\}\.</span>{edited[i][1]}) = ${edited[i][2]} -> ${edited[i][3]}<br>`;
    }
    updateHtml("#edited-scores", edited_scores, true);
    publishScoreChange(over, ball, run);
  } else {
    alert("Invalid over or ball number.");
  }
}

function update_scoreboard() {
  const tableBody = $("#scoreboard-body");
  tableBody.empty();

  for (let i = 1; i < scoreboard.length; i++) {
    if (scoreboard[i]) {
      const row = $("<tr></tr>");
      const overCell = $("<td></td>").text(i);
      // Extract ball scores (elements at index 1 to 6) and join them
      const ballScores = scoreboard[i].slice(1).filter(score => score !== undefined).join(" - ");
      const extras = scoreboard[i][0] || 0;
      const scoreCell = $("<td></td>").text(`<span class="math-inline">\{ballScores\} \(</span>{extras})`);
      const bowlerCell = $("<td></td>").text(scoreboardInfo[i]?.bowler || "");
      row.append(overCell, scoreCell, bowlerCell);
      tableBody.append(row);
    }
  }
  if (isShareMode) {
    updateHtml("#scoreboard", $("#scoreboard").prop('outerHTML'), false);
  } else {
    updateHtml("#scoreboard", $("#scoreboard").prop('outerHTML'), true);
  }
}

function update_score() {
  runs = 0;
  wickets = 0;
  for (let i = 1; i < scoreboard.length; i++) {
    if (scoreboard[i]) {
      scoreboard[i].forEach(score => {
        if (typeof score === 'number') {
          runs += score;
        } else if (score === '+' || score === 'NB') {
          runs++;
        } else if (score === 'W') {
          wickets++;
        }
      });
    }
  }
  updateTarget();
  updateHtml("#run", runs);
  updateHtml("#wickets", wickets);
}

function back_button() {
  if (isShareMode) return;
  if (over_no === 1 && ball_no === 1) return;

  if (ball_no > 1) {
    ball_no--;
    scoreboard[over_no][ball_no] = undefined;
  } else {
    over_no--;
    ball_no = 6;
    scoreboard[over_no][ball_no] = undefined;
  }
  update_score();
  update_scoreboard();
  update_runboard();
  const currentOver = over_no - (ball_no === 0 && over_no > 0 ? 1 : 0);
  const currentBall = ball_no === 0 ? 6 : ball_no;
  updateHtml("#over-ball", `<span class="math-inline">\{currentOver\}\.</span>{currentBall}`, false);
  publishUndo();
}

function noBall(is_NoBall) {
  if (isShareMode) return;
  isNoBall = is_NoBall;
  const run_no_ball = $("#run_no_ball");
  if (is_NoBall) {
    $("#no-ball-warning").show();
    $("#run_wide").prop("disabled", true);
    $("#run_no_ball").prop("disabled", true);
    $("#run_W").prop("disabled", true);
    run_no_ball.css("backgroundColor", "#0D6EFD").css("color", "#ffffff");
  } else {
    $("#no-ball-warning").hide();
    $("#run_wide").prop("disabled", false);
    $("#run_no_ball").prop("disabled", false);
    $("#run_W").prop("disabled", false);
    run_no_ball.css("backgroundColor", "#e5f3ff").css("color", "#0D6EFD");
  }
}

function setTarget(isTargetModeOn = true) {
  if (isShareMode) return;
  isTargetMode = isTargetModeOn;
  if (!isTargetModeOn) {
    $("#targetBoard").hide();
    $("#targetModeButton").show();
  } else {
    targetRuns = parseInt($("#targetRuns").val());
    targetOvers = parseInt($("#targetOvers").val());
    updateTarget();
    $("#targetBoard").show(2500);
    $("#targetModeButton").hide();
  }
  publishTargetUpdate(isTargetMode, targetRuns, targetOvers);
}

function updateTarget() {
  if (!isTargetMode || targetRuns === -1 || targetOvers === -1) {
    $("#targetBoard").hide();
    return;
  }

  const runsRequired = targetRuns - runs;
  const ballsBowled = (over_no - 1) * 6 + (ball_no - 1);
  const totalBalls = targetOvers * 6;
  const ballsLeft = totalBalls - ballsBowled;

  updateHtml("#targetRunsRequired", runsRequired);
  updateHtml("#targetOversLeft", ballsLeft);

  let message = "";
  const closeButton = '&nbsp;&nbsp;<button type="button" class="btn-close" onClick="setTarget(false)"></button>';

  if (ballsLeft <= 0) {
    message = runs > targetRuns ? "Batting team wins!" : runs === targetRuns ? "Match tied!" : "Bowling team wins!";
    if (!isShareMode) $("#targetModeButton").show();
  } else if (runs >= targetRuns) {
    message = "Batting team wins!";
    if (!isShareMode) $("#targetModeButton").show();
  } else {
    message = `Require <h5 style="display: inline;"><span class="badge bg-secondary" id="targetRunsRequired"><span class="math-inline">\{runsRequired\}</span\></h5\> runs in <h5 style\="display\: inline;"\><span class\="badge bg\-secondary" id\="targetOversLeft"\></span>{ballsLeft}</span></h5> balls ${closeButton}`;
  }

  updateHtml("#targetBody", message + (ballsLeft <= 0 || runs >= targetRuns ? closeButton : ""));
  $("#targetBoard").show();
}

function updateHtml(eleId, newHtml, shouldPublish = true) {
  const element = $(eleId);
  if (element.length > 0 && element.html() !== newHtml) {
    element.html(newHtml);
    if (shouldPublish && !isShareMode && isStartConnectDone) {
      publishMessage(JSON.stringify({ type: "updateHtml", id: eleId, html: newHtml }));
    }
  }
}

function sendInitVariables() {
  const initState = {
    ball_no: ball_no,
    over_no: over_no,
    runs: runs,
    wickets: wickets,
    scoreboard: scoreboard,
    scoreboardInfo: scoreboardInfo,
    isNoBall: isNoBall,
    isTargetMode: isTargetMode,
    targetRuns: targetRuns,
    targetOvers: targetOvers,
    overBallDisplay: $("#over-ball").html(),
    runDisplay: $("#run").html(),
    wicketsDisplay: $("#wickets").html(),
    ballButtons: {},
    targetBoardVisible: $("#targetBoard").is(":visible"),
    targetModeButtonVisible: $("#targetModeButton").is(":visible"),
  };
  for (let i = 1; i <= 6; i++) {
    initState.ballButtons["#ball_no_" + i] = $("#ball_no_" + i).html();
  }
  publishMessage(JSON.stringify({ type: "init", state: initState }));
}

function onConnect() {
  document.getElementById("messages").innerHTML += "<span>Connected to MQTT broker</span><br>";
  client.subscribe(topic, { qos: 0 });
  isStartConnectDone = true;
  currentMatchCode = topic;
  if (!isShareMode) {
    sendInitVariables();
  }
}

function onConnectionLost(responseObject) {
  if (responseObject.errorCode !== 0) {
    document.getElementById("messages").innerHTML += `<span>Connection Lost: ${responseObject.errorMessage}</span><br>`;
  }
}

function onMessageArrived(message) {
  try {
    const payload = JSON.parse(message.payloadString);

    if (payload.type === "init") {
      const state = payload.state;
      ball_no = state.ball_no;
      over_no = state.over_no;
      runs = state.runs;
      wickets = state.wickets;
      scoreboard = state.scoreboard;
      scoreboardInfo = state.scoreboardInfo;
