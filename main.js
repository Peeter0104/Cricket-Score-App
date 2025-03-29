var scoreboard = [[], [0]];
var scoreboardInfo = {};
var ball_no = 1;
var over_no = 1;
var runs = 0;
var edited = [];
var isNoBall = false;
var isTargetMode = false;
var targetRuns = -1;
var targetOvers = -1;
var isShareMode = false;
let currentMatchCode = -1; // Store the current match code

$(document).ready(function () {
  $("#run_dot").on("click", function (event) {
    if (!isShareMode) play_ball("D", 0);
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
    if (!isShareMode) play_ball("+", 0);
  });
  $("#run_no_ball").on("click", function (event) {
    if (!isShareMode) play_ball("NB", 0);
  });
  $("#run_4").on("click", function (event) {
    if (!isShareMode) play_ball(4);
  });
  $("#run_6").on("click", function (event) {
    if (!isShareMode) play_ball(6);
  });
  $("#run_W").on("click", function (event) {
    if (!isShareMode) play_ball("W", 0);
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
  if (urlParams.get("matchCode") != null) {
    console.log("Joining match with code:", urlParams.get("matchCode"));
    isShareMode = true; // Mark as viewer
    startConnect(urlParams.get("matchCode"));
  } else {
    let myModal = new bootstrap.Modal(
      document.getElementById("shareModal"), {}
    );
    myModal.show();
    startConnect(); // Generate a new match code for the creator
  }
  if (urlParams.get("debug") == null || urlParams.get("debug") != "true")
    $("#messages").hide();
  update_scoreboard(); // Initial call to display scoreboard (empty initially)
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

function shareModeStart() {
  // This function is now triggered by the "Share" button and handles link generation
}

function play_ball(run, score = 1) {
  if (isShareMode) return; // Prevent editing in share mode

  if (run == "+") {
    runs++;
    scoreboard[over_no][0] += 1;
    update_score();
    publishUpdate({ run: "+", score: 1 });
    return;
  }
  if (run == "NB") {
    noBall(true);
    runs++;
    scoreboard[over_no][0] += 1;
    update_score();
    publishUpdate({ run: "NB", score: 1 });
    return;
  }
  if (score == 1) {
    runs += run;
  }

  if (isNoBall) {
    scoreboard[over_no][0] += run == "D" ? 0 : run;
    noBall(false);
    publishUpdate({ run: run, score: 0, isNoBall: true });
  } else {
    scoreboard[over_no][ball_no] = run;
    update_runboard();
    publishUpdate({ run: run, score: 0 });
    ball_no++;
    if (ball_no >= 7) {
      scoreboardInfo[over_no] = scoreboardInfo[over_no] || {};
      scoreboardInfo[over_no]['bowler'] = $("#bowlerName").val();
      publishScoreboardInfoUpdate(over_no, { bowler: $("#bowlerName").val() });

      ball_no = 1;
      over_no++;
      scoreboard[over_no] = [];
      scoreboard[over_no][0] = 0;
      $("#bowlerName").val('');
    }
  }
  update_score();
  update_scoreboard();
}

function update_runboard() {
  for (i = 1; i < 7; i++) {
    let score_und = (_score_und) => (_score_und == undefined ? "" : _score_und);
    updateHtml("#ball_no_" + i.toString(), score_und(scoreboard[over_no][i]), false);
  }
  if (ball_no != 1) {
    $("#ball_no_" + ball_no.toString()).removeClass("btn-light");
    $("#ball_no_" + ball_no.toString()).addClass("btn-primary");
  } else {
    for (i = 2; i <= 6; i++) {
      $("#ball_no_" + i.toString()).removeClass("btn-primary");
      $("#ball_no_" + i.toString()).addClass("btn-light");
    }
  }
  updateHtml(
    "#over-ball",
    (ball_no == 6 ? over_no : over_no - 1).toString() +
    "." +
    (ball_no == 6 ? 0 : ball_no).toString(),
    false
  );
}

function change_score() {
  if (isShareMode) return;
  let over = parseInt($("#change_over").val());
  let ball = parseInt($("#change_ball").val());
  let run = parseInt($("#change_run").val());
  if (scoreboard[over] && scoreboard[over][ball] !== undefined) {
    edited.push([over, ball, scoreboard[over][ball], run]);
    scoreboard[over][ball] = run;
    update_score();
    update_scoreboard();
    updateHtml("#run", runs);
    let edited_scores = "Edited scores:<br>";
    for (i = 0; i < edited.length; i++) {
      edited_scores +=
        "(" +
        edited[i][0].toString() +
        "." +
        edited[i][1].toString() +
        ") = " +
        edited[i][2].toString() +
        " -> " +
        edited[i][3].toString();
      edited_scores += "<br>";
    }
    updateHtml("#edited-scores", edited_scores, true);
    publishScoreChange(over, ball, run);
  } else {
    alert("Invalid over or ball number.");
  }
}

function update_scoreboard() {
  var tableBody = $("#scoreboard-body");
  tableBody.empty();

  for (var i = 1; i <= over_no; i++) {
    var row = $("<tr></tr>");

    var overCell = $("<td></td>").text(i.toString());
    var scoreCell = $("<td></td>").text(scoreboard[i] ? scoreboard[i].slice(1, 7).join(" - ") + " (" + scoreboard[i][0].toString() + ")" : '');
    var bowlerCell = $("<td></td>").text(scoreboardInfo[i] ? scoreboardInfo[i]['bowler'] : '');

    row.append(overCell, scoreCell, bowlerCell);
    tableBody.append(row);
  }
  if (isShareMode) {
    updateHtml("#scoreboard", $("#scoreboard").prop('outerHTML'), false);
  } else {
    updateHtml("#scoreboard", $("#scoreboard").prop('outerHTML'), true);
  }
}

function update_score() {
  let score = 0;
  let wickets = 0;

  for (i = 1; i <= over_no; i++) {
    if (scoreboard[i]) {
      let numOr0 = (n) => (n == "+" ? 1 : isNaN(n) ? 0 : n);
      score += scoreboard[i].reduce((a, b) => numOr0(a) + numOr0(b));
      scoreboard[i].forEach((element) => {
        if (element == "W") wickets++;
      });
    }
  }
  runs = score;
  updateTarget();
  updateHtml("#run", runs);
  updateHtml("#wickets", wickets);
}

function back_button() {
  if (isShareMode) return;
  if (over_no == 1 && ball_no == 1) return;
  ball_no--;
  if (ball_no == 0) {
    ball_no = 6;
    over_no--;
  }
  scoreboard[over_no][ball_no] = undefined;
  update_score();
  update_scoreboard();
  update_runboard();
  updateHtml(
    "#over-ball",
    (over_no - 1).toString() + "." + (ball_no - 1).toString()
  );
  publishUndo();
}

function noBall(is_NoBall) {
  if (isShareMode) return;
  isNoBall = is_NoBall;
  var run_no_ball = $("#run_no_ball");
  if (is_NoBall) {
    $("#no-ball-warning").show();
    $("#run_wide").prop("disabled", true);
    $("#run_no_ball").prop("disabled", true);
    $("#run_W").prop("disabled", true);

    run_no_ball.css("backgroundColor", "#0D6EFD");
    run_no_ball.css("color", "#ffffff");
  } else {
    $("#no-ball-warning").hide();
    $("#run_wide").prop("disabled", false);
    $("#run_no_ball").prop("disabled", false);
    $("#run_W").prop("disabled", false);

    run_no_ball.css("backgroundColor", "#e5f3ff");
    run_no_ball.css("color", "#0D6EFD");
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
  updateHtml("#targetRunsRequired", targetRuns - runs);
  let ballsLeft = targetOvers * 6 - ((over_no - 1) * 6 + ball_no - 1);
  updateHtml("#targetOversLeft", ballsLeft);

  let closeButton =
    '&nbsp;&nbsp;<button type="button" class="btn-close" onClick="setTarget(false)"></button>';
  if (ballsLeft == 0) {
    if (targetRuns < runs) {
      updateHtml(
        "#targetBody",
        "Hurray! The batting team has Won!!" + closeButton
      );
    } else if (targetRuns - 1 == runs) {
      updateHtml("#targetBody", "Match Over! It's a tie." + closeButton);
    } else {
      updateHtml(
        "#targetBody",
        "Hurray! The bowling team has Won!!" + closeButton
      );
    }
    if (!isShareMode) $("#targetModeButton").show();
  }
  if (targetRuns <= runs) {
    updateHtml(
      "#targetBody",
      "Hurray! The batting team has Won!!" + closeButton
    );
    if (!isShareMode) $("#targetModeButton").show();
  } else if (isTargetMode) {
    updateHtml(
      "#targetBody",
      `Require <h5 style="display: inline;"><span class="badge bg-secondary" id="targetRunsRequired"><span class="math-inline">\{targetRuns \- runs\}</span\></h5\> runs in <h5 style\="display\: inline;"\><span class\="badge bg\-secondary" id\="targetOversLeft"\></span>{ballsLeft}</span></h5> balls ${closeButton}`
    );
  } else {
    $("#targetBody").html("");
    $("#targetBoard").hide();
  }
}

function updateHtml(eleId, newHtml, shouldPublish = true) {
  let isSame = $(eleId).html() == newHtml;
  $(eleId).html(newHtml);

  if (isShareMode && !isSame) {
    // Viewers receive updates via onMessageArrived
  } else if (shouldPublish && !isSame && isStartConnectDone) {
    publishMessage(
      JSON.stringify({
        update: { eleId: eleId, newHtml: newHtml },
      })
    );
  }
}

function sendInitVariables() {
  let vars = {
    "#ball_no_1": $("#ball_no_1").html(),
    "#ball_no_2": $("#ball_no_2").html(),
    "#ball_no_3": $("#ball_no_3").html(),
    "#ball_no_4": $("#ball_no_4").html(),
    "#ball_no_5": $("#ball_no_5").html(),
    "#ball_no_6": $("#ball_no_6").html(),
    "#over-ball": $("#over-ball").html(),
    "#run": $("#run").html(),
    "#edited-scores": $("#edited-scores").html(),
    "#scoreboard": $("#scoreboard").prop('outerHTML'),
    "#wickets": $("#wickets").html(),
    "#targetRunsRequired": $("#targetRunsRequired").html(),
    "#targetBody": $("#targetBody").html(),
    "#targetBoard": $("#targetBoard").is(":visible"),
    "#targetModeButton": $("#targetModeButton").is(":visible"),
  };
  publishMessage(
    JSON.stringify({
      init: vars,
      isTargetMode: isTargetMode,
      targetRuns: targetRuns,
      targetOvers: targetOvers,
      scoreboardInfo: scoreboardInfo
    })
  );
}

function onConnect() {
  document.getElementById("messages").innerHTML += "<span>Connected</span><br>";
  client.subscribe(topic, {
    qos: 0
  });
  message = new Paho.MQTT.Message("Hello");
  message.destinationName = topic;
  client.send(message);
  currentMatchCode = topic; // Store the generated topic
  if (!isShareMode) {
    sendInitVariables(); // Send initial state to potential viewers
  }
}

function onConnectionLost(responseObject) {
  if (responseObject.errorCode !== 0) {
    document.getElementById("messages").innerHTML +=
      "<span> Connection Lost : " + responseObject.errorMessage + "</span><br>";
  }
}

function onMessageArrived(message) {
  console.log("Message Arrived: " + message.payloadString);
  let payload = JSON.parse(message.payloadString);

  if (payload.init) {
    // Apply initial state for viewers
    for (const key in payload.init) {
      updateHtml(key, payload.init[key], false);
    }
    isTargetMode = payload.isTargetMode;
    targetRuns = payload.targetRuns;
    targetOvers = payload.targetOvers;
    scoreboardInfo = payload.scoreboardInfo || {};
    if (payload.scoreboard && $("#scoreboard").prop('outerHTML') !== payload.scoreboard) {
      <span class="math-inline">\("\#scoreboard"\)\.html\(</span>(payload.scoreboard).find('tbody').html());
    }
    if (isTargetMode) {
      $("#targetBoard").show();
      updateTarget();
    } else {
      $("#targetBoard").hide();
    }
  } else if (payload.update) {
    // Apply individual updates for viewers
    updateHtml(payload.update.eleId, payload.update.newHtml, false);
  } else if (payload.scoreboardInfoUpdate) {
    scoreboardInfo[payload.scoreboardInfoUpdate.over] = payload.scoreboardInfoUpdate.info;
    update_scoreboard();
  } else if (payload.scoreChange) {
    scoreboard[payload.scoreChange.over][payload.scoreChange.ball] = payload.scoreChange.run;
