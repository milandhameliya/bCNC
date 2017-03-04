
var TYPE_CTRL = {
    INPUT: 0,
    CHECKBOX: 1,
}
function initSettingDialog() {
    var entries = {
        data: [],
        init: function () {
            this.add('setting_22', 'Homing cycle enable', TYPE_CTRL.CHECKBOX);
            this.add('setting_24', 'Homing locate feed rate [mm/min]', TYPE_CTRL.CHECKBOX);
            this.add('setting_25', 'Homing search seek rate [mm/min]', TYPE_CTRL.CHECKBOX);
            this.add('setting_100', 'X-axis steps per mm', TYPE_CTRL.CHECKBOX);
            this.add('setting_101', 'Y-axis steps per mm', TYPE_CTRL.CHECKBOX);
            this.add('setting_102', 'Z-axis steps per mm', TYPE_CTRL.CHECKBOX);
            this.add('setting_110', 'X-axis maximum rate [mm/min]', TYPE_CTRL.CHECKBOX);
            this.add('setting_111', 'Y-axis maximum rate [mm/min]', TYPE_CTRL.CHECKBOX);
            this.add('setting_112', 'Z-axis maximum rate [mm/min]', TYPE_CTRL.CHECKBOX);
            this.add('setting_120', 'X-axis acceleration [mm/sec^2]', TYPE_CTRL.CHECKBOX);
            this.add('setting_121', 'Y-axis acceleration [mm/sec^2]', TYPE_CTRL.CHECKBOX);
            this.add('setting_122', 'Z-axis acceleration [mm/sec^2]', TYPE_CTRL.CHECKBOX);
        },
        add: function (id, name, type) {
            this.data.push({ id: id, name: name, type: type });
        },
    }

    entries.init();

    for (var i = 0; i < entries.data.length; i++) {
        createEntry_SettingDialog(entries.data[i]);
    }
}

function createEntry_SettingDialog(entry) {
    var row = jQuery("<div/>", { class: "row" });
    var title = jQuery("<div/>", { class: "col-sm-6" });
    var ctrl_div = jQuery("<div/>", { class: "col-sm-6" });
    var ctrl = jQuery("<input/>", { class: "form-control", name: entry.id, type_id: entry.type });

    title.text(entry.name);

    ctrl_div.append(ctrl);

    row.append(title);
    row.append(ctrl_div);

    $("#modal_settings .form").append(row);
}

function openSettingDialog() {
    getSetting();

    $('#modal_settings').modal('show');
}

function getSetting_soft() {
    enableControls_SettingDialog(false);

    $.ajax({
        url: '/setting',
        dataType: 'json',
        timeout: 1000,
        success: function (result, response_status, xhr) {
            handleResponse_SettingDialog(result);
        },
        error: function (xhr, status, error) {
        }
    });
}

function getSetting() {
    enableControls_SettingDialog(false);

    // Send query command so the system will fetch current setting parameters
    sendGcode('$$');
    // Request to read the setting parameters after around half a second
    setTimeout(getSetting_soft, 500);
}

function saveSetting() {
    var inputs = jQuery("#modal_settings input");
    for (var i = 0; i < inputs.length; i++) {
        var name = inputs[i].name;
        if (name.startsWith('setting_')) {
            var id = name.replace("setting_", "");
            sendGcode("$" + id + "=" + inputs[i].value);
        }
    }
}

function handleResponse_SettingDialog(result) {
    if (result[22] /*At-least one basic valid key is present*/) {
        for (var key in result) {
            if (!result.hasOwnProperty(key)) continue;

            // Fill the response value in the text-box fields
            var elem = $("#modal_settings [name='setting_" + key + "']");
            if (elem.length > 0) {
                elem.attr('value', result[key]);
            }
        }

        enableControls_SettingDialog(true);
    }
}

function enableControls_SettingDialog(enabled) {
    if (enabled) {
        $("#modal_settings input").removeAttr('disabled');
    } else {
        $("#modal_settings input").attr('disabled', 'disabled');
    }
}