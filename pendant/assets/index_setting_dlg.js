
var TYPE_CTRL = {
    INPUT: 0,
    CHECKBOX: 1,
    READONLY: 2,
}

var setting_entries = {
    data: [],
    init: function () {
        this.add(22, 'Homing cycle enable', TYPE_CTRL.CHECKBOX);
        this.add(24, 'Homing locate feed rate [mm/min]', TYPE_CTRL.CHECKBOX);
        this.add(25, 'Homing search seek rate [mm/min]', TYPE_CTRL.CHECKBOX);
        this.add(100, 'X-axis steps per mm', TYPE_CTRL.CHECKBOX);
        this.add(101, 'Y-axis steps per mm', TYPE_CTRL.CHECKBOX);
        this.add(102, 'Z-axis steps per mm', TYPE_CTRL.CHECKBOX);
        this.add(110, 'X-axis maximum rate [mm/min]', TYPE_CTRL.CHECKBOX);
        this.add(111, 'Y-axis maximum rate [mm/min]', TYPE_CTRL.CHECKBOX);
        this.add(112, 'Z-axis maximum rate [mm/min]', TYPE_CTRL.CHECKBOX);
        this.add(120, 'X-axis acceleration [mm/sec^2]', TYPE_CTRL.CHECKBOX);
        this.add(121, 'Y-axis acceleration [mm/sec^2]', TYPE_CTRL.CHECKBOX);
        this.add(122, 'Z-axis acceleration [mm/sec^2]', TYPE_CTRL.CHECKBOX);
        this.add(201, 'Limit Switch', TYPE_CTRL.READONLY);
    },
    add: function (id, name, type) {
        this.data.push({ id: id, name: name, type: type });
    },
    getById: function (id) {
        for (var i = 0; i < this.data.length; i++) {
            if (this.data[i].id == id) {
                return this.data[i];
            }
        }

        return null;
    },
    createAll: function () {
        for (var i = 0; i < this.data.length; i++) {
            createEntry_SettingDialog(this.data[i]);
        }
    },
    create: function (entry) {
        createEntry_SettingDialog(entry);
    },
    setValueById: function (id, value) {
        var entry = this.getById(id);

        // Fill the response value in the text-box fields
        var elem = $("#modal_settings [name='setting_" + id + "']");
        if (elem.length == 0) {
            // If element not found then check if the id is valid for this system
            if (entry != null) {
                // If entry is found for given id, then create element for this
                this.create(entry);
                elem = $("#modal_settings [name='setting_" + id + "']");
            }
        }

        if (elem.length > 0) {
            if (entry.type == TYPE_CTRL.READONLY) {
                elem.text(value);
            } else {
                elem.attr('value', value);
            }
        }
    },
}

function initSettingDialog() {
    setting_entries.init();
    //setting_entries.createAll();
}

function createEntry_SettingDialog(entry) {
    var row = jQuery("<div/>", { class: "row" });
    var title = jQuery("<div/>", { class: "col-sm-6" });
    var ctrl_div = jQuery("<div/>", { class: "col-sm-6" });
    var ctrl = null;
    if (entry.type == TYPE_CTRL.READONLY) {
        ctrl = jQuery("<div/>", { name: "setting_" + entry.id, type_id: entry.type });
    } else {
        ctrl = jQuery("<input/>",
            { class: "form-control", name: "setting_" + entry.id, type_id: entry.type });
    }

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

function saveSettingAndRefresh() {
    saveSetting();

    // Refresh the settings after saving it
    setTimeout(getSetting, 250);
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

            setting_entries.setValueById(key, result[key]);
            // // Fill the response value in the text-box fields
            // var elem = $("#modal_settings [name='setting_" + key + "']");
            // if (elem.length > 0) {
            //     elem.attr('value', result[key]);
            // }
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