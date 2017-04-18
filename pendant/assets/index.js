/* set up all functions */
var rpmmax = 12000;
var xmlhttp = false;
var WCS = ["G54", "G55", "G56", "G57", "G58", "G59", "G28", "G30", "G92"];
var WCSVAL = ["wcsx", "wcsy", "wcsz"];
var S_NOT_READY = 'not_ready',
    S_READY = 'ready',
    S_BUSY = 'busy',
    S_INIT = 'busy_init',
    S_BUSY_CONNECTING = 'busy_connecting',
    S_BUSY_DISCONNECTING = 'busy_disconnecting',
    S_BUSY_RUN = 'busy_run',
    S_BUSY_FILERUN = 'busy_filerun',
    S_HOLD = 'hold';
var status = -1;
var status_previous_ui = S_BUSY;
var enable_status = { nav_bar: null, motion: null, motion_file: null };
var file_loaded = false;
var timer_status = -1;

function updateUiStatus() {
    if (status == status_previous_ui) {
        return;
    }

    // Show/hide the serial-port connection panel
    if (status == S_NOT_READY) {
        $(".disconnected-panel").removeAttr('hidden');
        $(".connected-panel").attr('hidden', 'hidden');
        $(".motion-file-ctrl button[name='upload']").attr('disabled', 'disabled');
    } else if (isBusy(status_previous_ui) || status_previous_ui == S_INIT) {
        if (status != S_NOT_READY) {
            $(".connected-panel").removeAttr('hidden');
            $(".disconnected-panel").attr('hidden', 'hidden');
            $(".motion-file-ctrl button[name='upload']").removeAttr('disabled');
        }
    }

    if (enable_status.nav_bar) {
        $(".nav-panel button").removeAttr('disabled');
        $(".nav-panel select").removeAttr('disabled');
    } else {
        $(".nav-panel button").attr('disabled', 'disabled');
        $(".nav-panel select").attr('disabled', 'disabled');
    }

    if (enable_status.motion) {
        $(".motion-ctrl button").removeAttr('disabled');
        $(".motion-ctrl select").removeAttr('disabled');
        $(".motion-ctrl input").removeAttr('disabled');
    } else {
        $(".motion-ctrl button").attr('disabled', 'disabled');
        $(".motion-ctrl select").attr('disabled', 'disabled');
        $(".motion-ctrl input").attr('disabled', 'disabled');
    }

    updateUiFileLoaded();

    status_previous_ui = status;
}

function updateUiFileLoaded() {
    if (file_loaded) {
        $(".motion-file-ctrl button[name='unload']").removeAttr('disabled');
        $(".motion-file-ctrl button[name='optimize']").removeAttr('disabled');

        if (enable_status.motion_file) {
            $(".motion-file-ctrl button[name='start']").removeAttr('disabled');
        } else {
            $(".motion-file-ctrl button[name='start']").attr('disabled', 'disabled');
        }
    } else {
        $(".motion-file-ctrl button[name='unload']").attr('disabled', 'disabled');
        $(".motion-file-ctrl button[name='optimize']").attr('disabled', 'disabled');
        $(".motion-file-ctrl button[name='start']").attr('disabled', 'disabled');
    }
}

function setStatus(st) {
    if (status == st) {
        return;
    }

    var status_previous = status;
    status = st;
    //console.log(status);

    enable_status.nav_bar = false;
    enable_status.motion = false;
    enable_status.motion_file = false;

    switch (status) {
        case S_NOT_READY:
            enable_status.nav_bar = true;
            enable_status.motion = false;
            enable_status.motion_file = false;

            // Slower status polling after disconnected
            clearInterval(timer_status);
            timer_status = setInterval(getState, 1000);
            break;
        case S_READY:
            enable_status.nav_bar = true;
            enable_status.motion = true;
            enable_status.motion_file = true;

            if (status_previous == S_BUSY_CONNECTING) {
                sendCmd('STOP');
            }

            // Faster status polling after successful connection
            clearInterval(timer_status);
            timer_status = setInterval(getState, 250);
            break;
        case S_BUSY:
            enable_status.nav_bar = false;
            enable_status.motion = false;
            enable_status.motion_file = false;
            break;
        case S_INIT:
            enable_status.nav_bar = false;
            enable_status.motion = false;
            enable_status.motion_file = false;

            // MuchSlower status polling while initializing
            clearInterval(timer_status);
            getState();
            timer_status = setInterval(getState, 2000);
            break;
        case S_BUSY_CONNECTING:
            enable_status.nav_bar = false;
            enable_status.motion = false;
            enable_status.motion_file = false;
            break;
        case S_BUSY_DISCONNECTING:
            enable_status.nav_bar = false;
            enable_status.motion = false;
            enable_status.motion_file = false;
            break;
        case S_BUSY_RUN:
            enable_status.nav_bar = true;
            enable_status.motion = false;
            enable_status.motion_file = false;
            break;
        case S_BUSY_FILERUN:
            enable_status.nav_bar = true;
            enable_status.motion = false;
            enable_status.motion_file = false;
            break;
        case S_HOLD:
            enable_status.nav_bar = true;
            enable_status.motion = false;
            enable_status.motion_file = false;
            break;
    }

    updateUiStatus();
}

function isBusyRunning(st) {
    var _st = (st) ? st : status;
    return _st == S_BUSY || _st == S_BUSY_CONNECTING || _st == S_BUSY_DISCONNECTING || _st == S_BUSY_RUN;
}

function isBusyFileRunning(st) {
    var _st = (st) ? st : status;
    return _st == S_BUSY || _st == S_BUSY_CONNECTING || _st == S_BUSY_DISCONNECTING || _st == S_BUSY_FILERUN;
}

function isReady(st) {
    var _st = (st) ? st : status;
    return !(_st == S_NOT_READY || _st == S_INIT);
}

function isBusy(st) {
    var _st = (st) ? st : status;
    return _st == S_BUSY || _st == S_BUSY_CONNECTING || _st == S_BUSY_DISCONNECTING || _st == S_BUSY_FILERUN || _st == S_BUSY_RUN;
}

function isBusyConnectionChange(st) {
    var _st = (st) ? st : status;
    return _st == S_BUSY_CONNECTING || _st == S_BUSY_DISCONNECTING;
}

function findWcs(x) {
    for (i = 0; i < WCS.length; i++)
        if (WCS[i] == x) return i;
    return -1;
} // findWcs

function getState() {
    $.ajax({
        url: '/state',
        dataType: 'json',
        timeout: 1000,
        success: function (result, response_status, xhr) {
            $('#state').html(result.state);
            $('#state').bgColor = result.color;
            $('#msg').html(result.msg);
            $('#mpos-x').html(result.mx);
            $('#mpos-y').html(result.my);
            $('#mpos-z').html(result.mz);
            $('#wpos-x').html(result.wx);
            $('#wpos-y').html(result.wy);
            $('#wpos-z').html(result.wz);
            //parse $G response
            for (k = 0; k < result.G.length; k++) {
                if (WCS.indexOf(result.G[k]) > -1)
                    $('#wcs').val(result.G[k]);
                else if (result.G[k] == "M8")
                    $('#coolant').val("On");
                else if (result.G[k] == "M3")
                    $('#spindle').val("100%");
            }

            if (status == S_INIT) {
                getComPorts();
                setStatus(result.state == 'Not connected' ? S_NOT_READY : S_READY);
            }
            else if (status == S_BUSY_CONNECTING && result.state != 'Not connected') {
                setStatus(S_READY);
            } else if (status == S_BUSY_DISCONNECTING && result.state == 'Not connected') {
                setStatus(S_NOT_READY);
            } else if (status != S_BUSY_FILERUN && result.state == 'Run') {
                setStatus(S_BUSY_RUN);
            } else if (!isBusyConnectionChange()) {
                if (result.state == 'Idle') {
                    setStatus(S_READY);
                } else if (result.state.startsWith('Hold')) {
                    setStatus(S_HOLD);
                } else if (result.state.startsWith('ALARM')) {
                    setStatus(S_HOLD);
                } else if (result.state == 'Not connected') {
                    setStatus(S_NOT_READY);
                }
            }

            updateUiStatus();
        },
        error: function (xhr, status, error) {
            setStatus(S_INIT);
        }
    });
} // getState

/* parse once configuration */
function getConfig() {
    $.ajax({
        url: '/config',
        dataType: 'json',
        success: function (result, status, xhr) {
            rpmmax = result.rpmmax;
        }
    });
} // getConfig

function getComPorts() {
    $.ajax({
        url: '/ports',
        dataType: 'json',
        success: function (result, status, xhr) {
            //parse comports
            $('[data-name="select-comport"]').html('');
            for (k = 0; k < result.comports.length; k++) {
                $('[data-name="select-comport"]').append($("<option>", { value: result.comports[k], text: result.comports[k] }));
            }
        }
    });
} // getComPorts

function vibrate(t) { //safari has issues with 'notification'
    // if ("vibrate" in navigator) {
    //  navigator.vibrate(t);
    // } else if ("vibrate" in notification) {
    //  navigator.notification.vibrate(t);
    // }
} // vibrate

function sendCmd(command) {
    $.ajax({
        url: '/send',
        data: { cmd: command }
    });
    vibrate(500);
}

/*is this necessary when sendCmd would do the same thing?*/
function sendGcode(command) {
    $.ajax({
        url: '/send',
        data: { gcode: command }
    });

    vibrate(50);
} // sendCmd

function setWcs() {
    wcs = $('#wcs').val();
    p = findWcs(wcs);

    if (p < 6)
        cmd = "G10L20P" + (p + 1);
    else
        if (p == 6)
            cmd = "G28.1";
        else
            if (p == 7)
                cmd = "G30.1";
            else
                if (p == 8)
                    cmd = "G92";

    for (i = 0; i < WCSVAL.length; i++) {
        x = $("#" + WCSVAL[i]).val();
        if (x != "") {
            cmd += "XYZ"[i] + x;
            $("#" + WCSVAL[i]).val("");
        }
    }
    sendGcode(cmd + "\n$#\n$G");
} // setWcs

function wcsChange() {
    sendGcode($('#wcs option:selected').text() + "\n$G");
} // wcsChange

function spindleChange() {
    rpm = $('#spindle option:selected').text();
    if (rpm == "Off")
        sendGcode("M5");
    else {
        getConfig();
        rpm = (parseInt(rpm) * rpmmax) / 100;
        sendGcode("M3 S" + rpm);
    }
} // spindleChange

function coolantChange() {
    coolant = $('#coolant option:selected').text();
    if (coolant == "Off")
        sendGcode("M9");
    else
        if (coolant == "On")
            sendGcode("M8");
} // spindleChange

function sendMove(command) {
    gcode = "G91G0";
    step = parseFloat($('#step_input').val());
    if (step === NaN) {
        step = parseFloat($('#step option:selected').text());
    }
    switch (command) {
        case 'XOYO':
            gcode = "G90G0X0Y0";
            break;
        case 'XO':
            gcode = "G90G0X0";
            break;
        case 'YO':
            gcode = "G90G0Y0";
            break;
        case 'ZO':
            gcode = "G90G0Z0";
            break;
        case 'XdYu':
            gcode += "X-" + step + "Y" + step;
            break;
        case 'Yu':
            gcode += "Y" + step;
            break;
        case 'XuYu':
            gcode += "X" + step + "Y" + step;
            break;
        case 'Xu':
            gcode += "X" + step;
            break;
        case 'Xd':
            gcode += "X-" + step;
            break;
        case 'XdYd':
            gcode += "X-" + step + "Y-" + step;
            break;
        case 'Yd':
            gcode += "Y-" + step;
            break;
        case 'XuYd':
            gcode += "X" + step + "Y-" + step;
            break;
        case 'Zu':
            gcode += "Z" + step;
            break;
        case 'Zd':
            gcode += "Z-" + step;
            break;
        default:
            //handle for errors here.
            break;
    }
    sendGcode(gcode);
    sendGcode("G90");
} // sendMove

function stepSelectionChanged() {
    step = $('#step option:selected').text();
    $('#step_input').val(step);
}

function openFileDialog() {
    $('#upload-file')[0].reset();
    $('[name="file"]').click();
}

function fileChange() {
    clearFile();
    setTimeout(perform_fileUpload, 800);
}

function perform_fileUpload() {
    var formData = new FormData($('#upload-file')[0]);
    $.ajax({
        url: '/upload',  //Server script to process data
        data: formData,
        type: 'POST',
        cache: false,
        contentType: false,
        processData: false,
        success: function (result, status, xhr) {
            file_loaded = true;
            updateUiFileLoaded();
        }
    });
}

function clearFile() {
    file_loaded = false;
    updateUiFileLoaded();
    sendCmd('CLEAR_GCODE')
}

function optimizeDrawing() {
    sendCmd('DESELECTALL');
    sendCmd('ORIENT');
    sendCmd('OPTIMIZE');
}

function runFile() {
    sendCmd('RUN')
    setStatus(S_BUSY_FILERUN);
}

function connect() {
    sendCmd('OPEN,' + $('[data-name="select-comport"]')[0].value + ',' + $('[data-name="select-baudrate"]')[0].value);
    setStatus(S_BUSY_CONNECTING);
}

function disconnect() {
    sendCmd('OPEN');
    setStatus(S_BUSY_DISCONNECTING);
}

function try_shutdown() {
    $('#modal_confirm_shutdown').modal('show');
}

function shutdown() {
    sendCmd('SYS_HALT');
    setStatus(S_INIT);
}

function try_restart() {
    $('#modal_confirm_restart').modal('show');
}

function restart() {
    sendCmd('SYS_REBOOT');
    setStatus(S_INIT);
}

/* PERFORM THESE ACTIONS ONCE THE PAGE HAS LOADED */
$(document).ready(function () {
    //set up fast click to handle mobile browser delay
    FastClick.attach(document.body);

    sendGcode("$#\n$G\n");
    getConfig();
    timer_status = setInterval(getState, 1000);
    setStatus(S_INIT);
    /* ASSIGN FUNCTIONS TO UI ELEMENTS */

    initSettingDialog();
});
