var PROJECT = {};
var listlevels = '/Home/ListLevels'; //?owneruuid=57d36edb-436d-9f8b-5a71-6615b8aa8984'
var roomsURL = '/Home/ListTenantRooms';
var tenantsURL = '/Home/ListTenants';

$(document).ready(function () {

});


function populateData() {
    PROJECT.remotedataurlprefix = $('#txtBaseURL').val(); //'http://revit.azurewebsites.net';
    PROJECT.projectuuid = $('#txtProjectUUID').val();
    var holder = $('#fb_dump');
    holder.html('');
    $('<h2>Controller: ' + listlevels + '</h2>').appendTo(holder);
    var url = PROJECT.remotedataurlprefix + listlevels + '?owneruuid=' + PROJECT.projectuuid;
    $('<div>' +
        '<p style="text-align:left;">SUESS</p>' + 
        '<iframe style="height:200px;width:300px;" id="listlevels" src="' + url + '"></iframe>' + 
        '<textarea id="txtLevels" style="height:200px;width:300px;"></textarea>' +
        '<br/><button id="btnLevels" onclick="populateDataLevels();">Fetch levels</button>' +
        '</div>').appendTo(holder);

}

function populateDataLevels() {
    var json = $('#txtLevels').val();
    if (json === null || json === '') {
        alert('Copy-paste the data from left panel into right panel');
        return;
    }

    successGetLevels(json);
}

var successGetLevels = function (result) {
    if (!result) return;

    if (typeof result === 'string') {
        result = JSON.parse(result);
    }

    if (result.length == 0) {
        return;
    }

    var holder = $('#fb_dump');
    $('<br/><hr/>').appendTo(holder);
    // tenants
    $('<h2>Controller: ' + tenantsURL + '</h2>').appendTo(holder);
    var turl = PROJECT.remotedataurlprefix + tenantsURL + '?projectuuid=' + PROJECT.projectuuid;
    $('<div><p style="text-align:left;">SUESS</p><iframe src="' + turl + '"></iframe></div>').appendTo(holder);
    $('<br/><hr/>').appendTo(holder);
    // contracts per level
    $('<h2>Controller: ' + roomsURL + '</h2>').appendTo(holder);
    var baseurl = PROJECT.remotedataurlprefix + roomsURL + '?owneruuid=';
    for (var i in result) {
        var model = result[i];
        var url = baseurl + model.UUID;
        $('<div style="float:left;"><p style="text-align:center;"><a href="' + model.ModelUrl + '" target="_blank">' + model.DisplayName + '</a></p><iframe src="' + url + '"></iframe></div>').appendTo(holder);
    }
}

