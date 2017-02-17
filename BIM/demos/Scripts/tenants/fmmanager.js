
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// ajax GET
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++
function loadObjectPropertiesFilter() {
    var url = '/Home/GetObjectPropertiesFilter';

    if (PROJECT.datamapping && PROJECT.datamapping.hasOwnProperty(url)) {
        url = PROJECT.datafolder + PROJECT.datamapping[url];
        getLocalData(url, successGETObjectPropertiesFilterFunc, failGETObjectPropertiesFilterFunc);
        return;
    }

    var params = {
        projectuuid: _currentLevelModel.ParentUUID
    };

    getData(url, params, successGETObjectPropertiesFilterFunc, failGETObjectPropertiesFilterFunc);
}

// ajax GET tenants rooms data at start up and when post tenantrooms data failed
function getTenantRoomsDataForLevel() {
    var url = '/Home/ListTenantRooms';

    if (PROJECT.datamapping && PROJECT.datamapping.hasOwnProperty(url)) {
        // file name can be like '<L>.js' -> will become '1F.js'
        url = PROJECT.datafolder + PROJECT.datamapping[url].replace(LEVEL_TOKEN, PROJECT.levelid);
        getLocalData(url, successGetTenantRooms);
        return;
    }

    var params = { owneruuid: _currentLevelModel.UUID };
    getData(url, params, successGetTenantRooms);
}

// ajax GET tenants rooms data for given level/uuid
function fillTenantRoomsDataForLevel(levelid) {
    var url = '/Home/ListTenantRooms';

    if (PROJECT.datamapping && PROJECT.datamapping.hasOwnProperty(url)) {
        // file name can be like '<L>.js' -> will become '1F.js'
        url = PROJECT.datafolder + PROJECT.datamapping[url].replace(LEVEL_TOKEN, levelid);
        _currentFillLevelId = levelid; //for making level uuid<>id map
        getLocalData(url, successGetFillTenantRooms);
        return;
    }
    
    console.error('[ERROR] no datamapping for', url);

    //var params = { owneruuid: _currentLevelModel.UUID };
    //getData(url, params, successGetTenantRooms);
}

// ajax GET FM Map models for current level
function getRevitToFacilityIdMap() {
    var url = '/Home/GetFacilityModels';

    if (PROJECT.datamapping && PROJECT.datamapping.hasOwnProperty(url)) {
        url = PROJECT.datafolder + PROJECT.datamapping[url];
        getLocalData(url, successGETFMDBFunc, successGETFMDBFunc);
        return;
    }

    var params = { projectuuid: _currentLevelModel.UUID };
    getData(url, params, successGETFMDBFunc, successGETFMDBFunc);
}

// ajax GET tenantRooms models by tenant name
function getTenantRoomsModelsByName(tenantname) {
    var url = '/Home/GetTenantRoomsByTenantName';

    if (PROJECT.datamapping && PROJECT.datamapping.hasOwnProperty(url)) {
        // check if mapping is a function
        var func = eval(PROJECT.datamapping[url]);
        if (typeof func === 'function') {
            func(tenantname); // aka findLocalTenantByName
            return;
        }
        // assume local data file
        url = PROJECT.datafolder + PROJECT.datamapping[url];
        getLocalData(url, successGETTenantsByNameFunc);
        return;
    }

    var params = {
        tenantname: tenantname,
        projectuuid: _currentLevelModel.ParentUUID
    };

    getData(url, params, successGETTenantsByNameFunc);

}

// ajax GET: populate options (= datalist) with tenants from all levels
function updateTenantsOptionsList() {

    //if (PROJECT.canEdit == false) return;

    var url = '/Home/ListTenants';

    if (PROJECT.datamapping && PROJECT.datamapping.hasOwnProperty(url)) {
        url = PROJECT.datafolder + PROJECT.datamapping[url];
        getLocalData(url, successListTenants);
        return;
    }

    var params = { projectuuid: _currentLevelModel.ParentUUID };
    getData(url, params, successListTenants);
}

// +++++++++++++++++++++++++++++
// CALLBACKS after ajax GET success/fail
// +++++++++++++++++++++++++++++

// callback after success reading object properties filter file
var successGETObjectPropertiesFilterFunc = function (result) {

    if (!parseObjectPropertyFilters(result)) {
        console.error('[ERROR] Failed to load property filter', result);
        alert('Failed to load data');
        return;
    }

    initVA3C();

    console.log('[INFO] starting project', PROJECT.id);
    // load first model, then calls itself in processLoadResultProjectModel for next
    loadProjectModel(0);

    initUI();

    forceRender();
}

var failGETObjectPropertiesFilterFunc = function (error) {

    console.error('[ERROR] Failed to load property filter', error);
    //console.error('resonseText:', error.responseText); // very long html string
    console.error('statusText:', error.statusText);
    console.error('status code:', error.status);
    alert('Failed to load data');
}

///
var successListTenants = function (result) {
    if (!result) return;

    if (typeof result === 'string') {
        result = JSON.parse(result);
    }

    populateTenantOptionsList(result);
}

///
var successGetTenantRooms = function (result) {
    if (!result) {
        onProjectReady();
        return;
    }

    if (typeof result === 'string') {
        result = JSON.parse(result);
    }

    if (PROJECT.canView) {
        removeTenantRoomsWithoutRooms(result);
    }

    updateTenantData(result);

    // in LOCAL only
    // set UUID from the data
    if (result.length > 0) {
        _currentLevelModel.UUID = result[0].TenantRooms.LevelUUID;
        _currentLevelModel.ParentUUID = result[0].Tenant.ProjectUUID;
    }
    
    fillFullTenantToomsTable();
}

// store tenantrooms for level '_currentFillLevelId'
var successGetFillTenantRooms = function (result) {
    if (!result) {
        onProjectReady();
        return;
    }

    if (typeof result === 'string') {
        result = JSON.parse(result);
    }

    if (result.length > 0) {
        // keep map for level UUID <> ID
        if (!_levelIdMap) _levelIdMap = {};
        _levelIdMap[result[0].TenantRooms.LevelUUID] = _currentFillLevelId;
        // patch the data
        patchDBData(result);
        // add to full tabl;e
        _fullTenantRoomsTable.push.apply(_fullTenantRoomsTable, result);
    }

    if (_todoFillLevels.length > 0) {
        // next level
        fillTenantRoomsDataForLevel(_todoFillLevels.shift());
        onProjectReady();
        return;
    }


    // all levels collected, now use

    if (PROJECT.canView) {
        // remove invalid contracts
        removeTenantRoomsWithoutRooms(_fullTenantRoomsTable);
    }

    // only show tentants that are used in all levels in option/data list
    var tenants = [];
    var doneuuids = [];
    for (var i in _fullTenantRoomsTable) {
        var model = _fullTenantRoomsTable[i];
        if (doneuuids.indexOf(model.Tenant.UUID) === -1) {
            doneuuids.push(model.Tenant.UUID);
            tenants.push(model.Tenant);
        }
    }

    populateTenantOptionsList(tenants);

    //showRightMenu();

    // apply start search
    if (_searchValStart && _searchValStart !== '') {
        showRightMenu();
        _searchValStart = unescapeAttributeValue(_searchValStart);
        $('#fm_search_val').val(_searchValStart);
        searchFMInfo(_searchValStart);
    }

    onProjectReady();
}


// callbacks after GET FM data
var successGETFMDBFunc = function (result) {
    if (!result) return;

    if (typeof result === 'string') {
        result = JSON.parse(result);
    }
    updateFMMap(result);
}

// critical fail getting essential data: return to dashboard
var failGETFMDBFunc = function (error) {
    console.error('[ERROR] get FM database data failed', error);
    //console.error('resonseText:', error.responseText); // very long html string
    console.error('statusText:', error.statusText);
    console.error('status code:', error.status);
    alert('[CRITICAL] Failed to get FM data. Returning to dashboard...');
    // go back to projects page
    location.href = '/Manage/ListProjects/';
}

// callbacks after GET tenant by name data
var successGETTenantsByNameFunc = function (result) {
    // result hold TenantRooms models for tenant matching a name on all levels in any order
    // as in { Tenant: tmodel, TenantRooms: trmodel, Project: project }
    // NOTE: here we can take the project document as in result[i].Project.DocumentUrl

    if (!result) return;

    if (typeof result === 'string') {
        result = JSON.parse(result);
    }

    // clear last info
    clearLastObject();
    hideFMTenantInfo();

    var models = [];
    var models_other = [];
    var found = false;
    for (var i in result) {
        var tenantroomsmodel = result[i];
        if (tenantroomsmodel.TenantRooms.LevelUUID == _currentLevelModel.UUID) {
            models.push(tenantroomsmodel);
            found = true;
        }
        else {
            models_other.push(tenantroomsmodel);
            found = true;
        }
    }

    if (!found) {
        if (PROJECT.canEdit) {

            var tenantname = ($("#fm_search_val").val() || '').trim();

            if (tenantname !== '' && _tenantsNameMap && _tenantsNameMap.hasOwnProperty(tenantname)) {
                var model = _tenantsNameMap[tenantname];
                $('#fm_search_fb').html(_MSG_NOTHINGFOUND +
                    '<a onclick="removeTenantByUUID(\'' + model.UUID + '\');">Delete this tenant</a>' +
                    '<a style="clear:both;" onclick="removeAllUnassignedTenants();">Purge unassigned tenants</a>');
            }
            else {
                $('#fm_search_fb').html(_MSG_NOTHINGFOUND);
            }
        }
        else {
            $('#fm_search_fb').html(_MSG_NOTHINGFOUND);
        }
    }
    else {
        $('#fm_search_fb').html('&nbsp;');
        showFMTenantsInfoByModels(models, null, true);
        showFMTenantsInfoByModelsOtherLevels(models_other);
    }
}

// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// ajax POST (save/remove)
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++

function saveObjectFMInfo() {

    // this saves object info ONLY!

    if (_isAssigningRooms) return;

    $('.panelsectionfeedback').html('&nbsp;').css({});

    // validate data before save
    var error = validateSaveData(false);
    if (error) {
        alert(error);
        return;
    }

    $('#fm_objectinfo_savefb').html(_MSG_SAVING);

    $('.fm_objectinfo').each(function () {
        var savedata = $(this).jqPropertyGrid('get');
        var model = $(this).data('model');
        saveFMObjectInfo(savedata, model);
    });
}

function saveTenantFMInfo() {

    // this saves object AND tenant info!

    if (_isAssigningRooms) return;

    $('.panelsectionfeedback').html('&nbsp;').css({});

    // validate data before save
    var error = validateSaveData(true);
    if (error) {
        alert(error);
        return;
    }

    $('#fm_tenantinfo_savefb').html(_MSG_SAVING);

    $('.fm_objectinfo').each(function () {
        var savedata = $(this).jqPropertyGrid('get');
        var model = $(this).data('model');
        saveFMObjectInfo(savedata, model);
    });

    _activeTenantRoomsModels = [];

    $('.fm_tenantroomssavedata').each(function () {
        var savedata = $(this).jqPropertyGrid('get');
        var model = $(this).data('model');
        //delete model.Project;
        saveFMTenantRoomsInfo(savedata, model);
    });
}


function saveFMObjectInfo(savedata, model) {
    //console.log('OBJECT save', savedata, 'to', model);

    // empty savedata.fmid means remove from dbase

    model.FacilityId = savedata.fmid;
    model.Remark = savedata.remarks;
    // keep this revit_id for refresh right panel after posting finished (success and fail)
    _currentFMRevitId = model.RevitId;
    updateModel('/Home/UpdateFacilityEntry', model, successPOSTFMDBFunc);
}

function saveFMTenantRoomsInfo(savedata, model) {
    if (!savedata.tname || savedata.tname == '') {
        console.error('SAVE: No tenant name specified');
        return;
    }

    applySaveDataToCurrentTenantRoomsModel(model, savedata);

    // keep this model for refresh right panel after posting finished (success and fail)
    _activeTenantRoomsModels.push(model);

    updateModel('/Home/UpdateTenantRoomsEntry', model, successPOSTTenantRoomsDBFunc, failPOSTTenantRoomsDBFunc);

}

function removeTenantRoomsEntry($elm) {
    if (_isAssigningRooms) return;

    var model = getTenantRoomsModelFromElement($elm);
    if (!model) return;

    if (!_activeTenantRoomsModels || _activeTenantRoomsModels.length == 0) {
        console.error('[ERROR] No current tenant model set');
        return;
    }

    if (setActiveTenantRoomsIndex(model) == false) {
        return;
    }

    if (confirm(_MSG_AREYOUSURE) === false) return;

    // remove from current set
    _activeTenantRoomsModels.splice(_activeTenantRoomsModelIndex, 1);

    removeTenantRoomsAliasLabel(model);

    if (model.TenantRooms.Id) {
        // item must be removed from db
        // a new table will be returned after ajax POST completes
        updateModel('/Home/RemoveTenantRoomsEntry', model.TenantRooms, successPOSTTenantRoomsDBFunc, failPOSTTenantRoomsDBFunc);
    }
    else {
        // get a new list via ajax
        //getTenantRoomsDataForLevel();
        // remove from local table
        removeFromCurrentTable(model);
    }
}

function removeFromCurrentTable(model) {
    var index = -1;
    for (var i in _currentTenantRoomsTable) {
        if (_activeTenantRoomsModels[i].TenantRooms && _activeTenantRoomsModels[i].TenantRooms.UUID == model.TenantRooms.UUID) {
            index = i;
            break;
        }
    }
    if (index > -1) {
        _currentTenantRoomsTable.splice(index, 1);
    }
}

// validate we have the necessary data to save
function validateSaveData(validatetenantinfo) {
    var error;
    $('.fm_objectinfo').each(function () {
        var savedata = $(this).jqPropertyGrid('get');
        var model = $(this).data('model');
        if (!savedata || !model) {
            error = 'Invalid data detected.';
            return false;
        }
        var existing_revit_id = PROJECT.facilityToRevitId[savedata.fmid];
        if (existing_revit_id && model.RevitId !== existing_revit_id) {
            error = 'FM ID ' + savedata.fmid + ' is already assigned to another object!';
            return false;
        }
    });

    if (error) return error;

    if (!validatetenantinfo) return error;

    $('.fm_tenantroomssavedata').each(function () {
        var savedata = $(this).jqPropertyGrid('get');
        var model = $(this).data('model');
        if (!savedata || !model) {
            error = 'Invalid data detected.';
            return false;
        }
        // must have a tenant name
        if (!savedata.tname || savedata.tname == '') {
            error = 'Please specify a tenant name.';
            return false;
        }
    });

    $('.fm_tenantinfo').each(function () {
        var savedata = $(this).jqPropertyGrid('get');
        var model = $(this).data('model');
        if (!savedata || !model) {
            error = 'Invalid data detected.';
            return false;
        }
        // must have a tenant name
        if (!savedata.tname || savedata.tname == '') {
            error = 'Please specify a tenant name.';
            return false;
        }
    });

    return error;
}

// when defining a new tenantrooms entry, make sure we have all minimum data set before saving
function ensureValidTenantRoomsModel(model) {
    if (!model.Tenant) {
        model.Tenant = {};
    }

    var unsaved = false;
    if (!model.Tenant.UUID) {
        // new tenant
        model.Tenant.UUID = guid();
        model.Tenant.ProjectUUID = _currentLevelModel.ParentUUID;
        //unsaved = true;
    }

    if (!model.TenantRooms) {
        model.TenantRooms = {};
    }

    if (!model.TenantRooms.UUID) {
        // new tenantrooms
        model.TenantRooms.UUID = guid();
        model.TenantRooms.LevelUUID = _currentLevelModel.UUID;
        unsaved = true;
    }

    // tenant can have changed: sync it
    model.TenantRooms.TenantUUID = model.Tenant.UUID;

    if (unsaved) {
        // add to table
        _currentTenantRoomsTable.push(model);
        // update in use map
        addTenantRoomsToMap(model);
    }
}

// +++++++++++++++++++++++++++++
// CALLBACKS after ajax POST success/fail
// +++++++++++++++++++++++++++++

// callbacks after POST FM data
var successPOSTFMDBFunc = function (result) {

    updateFMMap(result);

    if (updateRoomLabel(_currentFMRevitId)) {
        showObjectUserDataByRevitId(_currentFMRevitId);
        showFMObjectInfoByRevitId(_currentFMRevitId);
        showFMTenantsInfoByRevitId(_currentFMRevitId);
        // show directory
        showTenantDirectory();
    }

    showSavedFeedback();

    console.log('[INFO] update FM database finished', result);
}

// callback after save tenant/tenantrooms models
var successPOSTTenantRoomsDBFunc = function (result) {
    $('#fm_search_fb').html('&nbsp;');
    updateTenantData(result);
    closeUploaderPanel();
    showSavedFeedback();

    console.log('[INFO] update TR database finished', result);
}

var failPOSTTenantRoomsDBFunc = function (error) {
    getTenantRoomsDataForLevel();
    closeUploaderPanel();

    console.error('[ERROR] update TR database failed', error);
    //console.error('resonseText:', error.responseText); // very long html string
    console.error('statusText:', error.statusText);
    console.error('status code:', error.status);
    alert('Update database failed');
}

var successPOSTExportTenantInfoFunc = function (result) {
    //console.log('export', result);
    window.location.href = '/Home/DownloadFile?fileuuid=' + result.fileuuid;
}

var failPOSTExportTenantInfoFunc = function (error) {
    console.error('[ERROR] export failed', error);
    //console.error('resonseText:', error.responseText); // very long html string
    console.error('statusText:', error.statusText);
    console.error('status code:', error.status);
    alert('Export failed');
}


// patch db data
function patchDBData(models) {
    if (!models) return;
    for (var i in models) {
        var model = models[i];
        if (typeof model.Tenant !== 'undefined') {
            // assume TenantRoomsModel
            // add field Alias
            if (typeof model.Tenant.Alias === 'undefined') {
                model.Tenant.Alias = null;
            }
            else if (model.Tenant.Alias && model.Tenant.Alias !== '') {
                // set alias as display name
                model.Tenant.DisplayName = model.Tenant.Alias;
            }
        }
        else {
            // assume TenantModel
            // add field Alias
            if (typeof model.Alias === 'undefined') {
                model.Alias = null;
            }
            else if (model.Alias && model.Alias !== '') {
                // set alias as display name
                model.DisplayName = model.Alias;
            }
        }
    }
}

// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// EXPORT
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++

function exportFMInfo() {
    // not during room assignment
    if (_isAssigningRooms) return;

    console.log('exportFMInfo for', _currentLevelModel.UUID);
    window.open('/Home/FacilityIdTable?projectuuid=' + _currentLevelModel.UUID, '_blank');
}

function exportTenantInfo() {
    // not during room assignment
    if (_isAssigningRooms) return;

    var jsondata = getExportTenantInfoJSON();
    if (!jsondata) {
        alert('No tenant data found to export');
        return;
    }

    var url = '/Home/ExportJSONToFile';

    // check if mapping is a function
    var func = eval(PROJECT.datamapping[url]);
    if (typeof func === 'function') {
        func(jsondata);
        return;
    }

    var params = {
        json: JSON.stringify(jsondata),
    };

    updateModel(url, params, successPOSTExportTenantInfoFunc, failPOSTExportTenantInfoFunc);

    //window.location.href = '/Home/ExportJSONToFile?' + $.param(params);
}

function getExportTenantInfoJSON() {

    if (!_currentTenantRoomsTable || _currentTenantRoomsTable.length == 0) {
        return null;
    }

    var json = {};

    // export name and type
    json.filename = _currentLevelFullName;
    json.filetype = 'csv';

    // document header stuff
    json.title = 'Tenant information';
    json.location = _currentLevelFullName;
    json.author = '!'; //get in controller
    json.date = '!'; //get in controller

    json.columns = ['#', 'Tenant', 'Unit ID', 'Area (SQM)', 'Lease Period (from)', 'Lease Period (to)', 'Contract No.', 'Revit ID', 'Remark'];
    json.rows = [];

    var reportModels = _currentTenantRoomsTable.slice();

    // sort by tenant name
    reportModels.sort(function (a, b) {
        return ((a.Tenant.DisplayName < b.Tenant.DisplayName) ? -1 : ((a.Tenant.DisplayName > b.Tenant.DisplayName) ? 1 : 0));
    });

    for (var i = 0; i < reportModels.length; i++) {

        var model = reportModels[i];
        var roomobjects = collectTenantRooms(model);
        // sort by name
        roomobjects.sort(function (a, b) {
            var aid = getRoomDisplayName(a);
            var bid = getRoomDisplayName(b);
            return ((aid < bid) ? -1 : ((aid > bid) ? 1 : 0));
        });

        // date range
        var dates = getDateRange(model.TenantRooms.Notes);

        // first contract row with tenant namr and remarks/notes
        var row = [];
        row.push((i + 1));
        row.push(model.Tenant.DisplayName);
        if (roomobjects && roomobjects.length > 0) {
            var roomsinfo = getTenantRoomsInfo(model); // for total 

            // in LOCAL only: skip contracts without rooms
            if (roomsinfo[0] === _MSG_NOROOMS) continue;

            row.push('');
            row.push(roomsinfo[1]);
        }
        else {
            // in LOCAL only: skip contracts without rooms
            continue;
            row.push('- none -');
            row.push('');
        }
        row.push(dates[0]); //LEASE period from
        row.push(dates[1]); //LEASE period to
        row.push(model.TenantRooms.ContractNo || ''); //contract no period
        row.push(''); // revit id
        row.push(''); // remarks for room
        json.rows.push(row);

        // row per room
        if (roomobjects && roomobjects.length > 0) {
            for (var j = 0; j < roomobjects.length; j++) {
                var object = roomobjects[j];
                var row = [];
                row.push(''); // # column
                row.push(''); // tenant name column
                row.push(getRoomDisplayName(object) || '- unknown -')
                row.push(getRoomArea(object) || '- unknown-');
                row.push(''); //lease from
                row.push(''); //lease to
                row.push(''); //contract
                row.push(getObjectRevitId(object));  //revit
                row.push(getObjectRemarks(object) || ''); // room NOTES
                json.rows.push(row);
            }
        }
    }

    return json;
}

function getDateRange(value) {
    var fromdate = ''
    var todate = '';
    var vals = (value || '').split(SEP_ROOMIDS);
    if (Array.isArray(vals) && vals.length > 0) {
        fromdate = (vals[0] || '').trim();
        if (vals.length > 1) {
            todate = (vals[1] || '').trim();
        }
    }
    return [fromdate, todate];
}

// LOCAL save data
function exportTenantInfoJSON(jsondata) {
    var filecontent = '';

    if (jsondata.filetype === 'csv') {
        filecontent = (jsondata.title || '') + '\r\n' +
                        'Location:,' + (jsondata.location || '') + '\r\n' +
                        'Author:,' + (jsondata.author || '') + '\r\n' +
                        'Date:,' + (new Date().format("isoDateTime")) + '\r\n' +
                        '\r\n' +
                        jsondata.columns.join(',') + '\r\n' +
                        // json object fields automatically will be comma sep
                        jsondata.rows.join('\r\n');
    }
    else {
        alert('unsupported file type ' + jsondata.filetype);
        return;
    }

    var blob = new Blob([filecontent], { type: "text/plain;charset=utf-8" });
    saveAs(blob, jsondata.filename + '.' + jsondata.filetype);
}

// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// END ajax related stuff
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++

// fill full table with tenantrooms models on all levels
function fillFullTenantToomsTable() {

    if (_fullTenantRoomsTable) return;

    _fullTenantRoomsTable = [];

    _todoFillLevels = PROJECT.levels.slice();

    fillTenantRoomsDataForLevel(_todoFillLevels.shift());
}

// general update func called after posting any data using result from ajax
function updateTenantData(result) {

    patchDBData(result);

    // make a clone; not sure is needed
    _currentTenantRoomsTable = result.slice();

    if (Array.isArray(_currentTenantRoomsTable) === false) {
        _currentTenantRoomsTable = [];
    }

    _activeRoomObjects = null;

    updateRoomsInUseMap();

    updateTenantRoomsManagerUI();

    //console.log(_currentTenantRoomsTable);
    console.log('[INFO] local table updated');

    forceRender();
}

// filter current table and pass to same function as remote GET
function findLocalTenantByName(tenantname) {

    var filteredModels = [];
    for (var i in _fullTenantRoomsTable) {
        var model = _fullTenantRoomsTable[i];
        // case insensitive
        if (model.Tenant.DisplayName.toLocaleLowerCase().indexOf(tenantname.toLocaleLowerCase()) != -1) {
            filteredModels.push(model);
        }
    }

    //console.log('search for', tenantname, 'resulted in ', filteredModels);
    successGETTenantsByNameFunc(filteredModels);
}

// update revit>fm mapping table using result from ajax
function updateFMMap(result) {
    for (var i in result) {
        var model = result[i];
        updateRevitIdToFmIdMap(model.RevitId, model);
    }
}

// update tenant name datalists using result from ajax
function populateTenantOptionsList(result) {

    if (!result) return;

    // sort
    result.sort(function (a, b) {
        return ((a.DisplayName < b.DisplayName) ? -1 : ((a.DisplayName > b.DisplayName) ? 1 : 0));
    });

    // datalist for search field
    //var options = $("#fm_search_val_list");
    //options.html('');

    $("#fm_search_val").val('');

    // datalist for 'prop grid' via meta 
    tenantRoomsMetaEdit.tname.options = [];

    // because we cannot get text + value in a input+datalist element, we have to keep a name mapping to find the tenant model            
    _tenantsNameMap = {};
    _tenantSearchNameMap = {};

    $.each(result, function (i, tenantModel) {
        tenantRoomsMetaEdit.tname.options.push({ text: tenantModel.DisplayName, value: tenantModel.UUID });
        //options.append($("<option />").val(tenantModel.DisplayName));
        _tenantsNameMap[tenantModel.DisplayName] = tenantModel;
        var lower = tenantModel.DisplayName.toLocaleLowerCase();
        _tenantSearchNameMap[lower] = tenantModel.DisplayName;
        $.each(convertToPinYinSearch(lower), function (i, ascii) {
            _tenantSearchNameMap[ascii] = tenantModel.DisplayName;
        });
    });

    if (tenantRoomsMetaEdit.tname.options.length > 0) {
        tenantRoomsMetaEdit.tname.placeholder = 'Type new tenant name or select from list';
    }
    else {
        tenantRoomsMetaEdit.tname.placeholder = 'Type new tenant name';
    }
}

function showSavedFeedback() {
    if ($('#fm_objectinfo_savefb').html() === _MSG_SAVING) {
        $('#fm_objectinfo_savefb').html(_MSG_SAVED);
        setTimeout(clearFeedback, 2000, $('#fm_objectinfo_savefb'));
    }
    if ($('#fm_tenantinfo_savefb').html() === _MSG_SAVING) {
        $('#fm_tenantinfo_savefb').html(_MSG_SAVED);
        setTimeout(clearFeedback, 2000, $('#fm_tenantinfo_savefb'));
    }
}

function showFMInfo(object) {

    showTenantDirectory();

    if (!object) {
        return;
    }

    var revit_id = getObjectRevitId(object);

    if (PROJECT.canView == false) {
        showFMObjectInfoByRevitId(revit_id);
    }

    showFMTenantsInfoByRevitId(revit_id);

}

function showTenantDirectory() {

    removeUIHandlersDirectory();

    var parentelm = $('#fm_tenant_directory');

    parentelm.html('');

    $('#fm_search_result_tenant_export').hide();

    if (!_currentTenantRoomsTable || _currentTenantRoomsTable.length == 0) {
        showAllAssignedRooms();
        showAllRoomLabels();
        return;
    }

    var title = $('<span id="fm_tenant_directory_title" class="panelmenutitle">' + _MSG_TENANTDIRECTORY + ' (' + _currentLevelModel.DisplayName + ')</span>').appendTo(parentelm);

    var tenantModels = _currentTenantRoomsTable.slice();

    // sort by tenant name
    tenantModels.sort(function (a, b) {
        return ((a.Tenant.DisplayName < b.Tenant.DisplayName) ? -1 : ((a.Tenant.DisplayName > b.Tenant.DisplayName) ? 1 : 0));
    });

    for (var i in tenantModels) {

        var model = tenantModels[i];
        var roomsinfo = getTenantRoomsInfo(model);

        // in LOCAL only: skip contracts without rooms
        if (roomsinfo[0] === _MSG_NOROOMS) continue;

        var entry = $('<div class="fm_tenantroomsmodel fm_tenantdirectory fm_info"></div>').appendTo(parentelm).data('model', model);

        var metadata = {
            name: {
                name: model.Tenant.DisplayName,
                color: model.Tenant.Color || _defaultRoomColor,
                type: 'roomsopen', //hover effect with onclick 
            },
        }

        entry.jqPropertyGrid({
            name: getTenantRoomsAlias(roomsinfo),
        },
        metadata);
    }

    if (!_activeTenantRoomsModels || _activeTenantRoomsModels.length == 0) {
        showAllAssignedRooms();
        showAllRoomLabels();
    }

    addUIHandlersDirectory();

    // not for GP
    if (PROJECT.canEdit)
        $('#fm_search_result_tenant_export').show();

    forceRender();
}

function getObjectRemarks(object) {
    if (!object) return null;
    var revit_id = getObjectRevitId(object);
    if (!revit_id) return null;
    var fmmodel = PROJECT.revitToFacilityId[revit_id];
    return (fmmodel && fmmodel.Remark && fmmodel.Remark != '') ? fmmodel.Remark : '';
}

function showFMObjectInfoByRevitId(revit_id) {

    if (!revit_id) {
        clearLastObject();
        hideFMInfo();
        return false;
    }

    var object = getObjectByRevitId(revit_id);

    console.log(object, revit_id);

    if (!object) {
        clearLastObject();
        hideFMInfo();
        return false;
    }  

    $('#fm_search_fb').html('&nbsp;');
    $('#fm_search_result_object_info').html('');

    var isroom = isRoomObject(object);
    var ispublicroom = isroom && isPublicRoom(object);

    // PROJECT.revitToFacilityId is {revit_id : model}
    var fmmodel = PROJECT.revitToFacilityId[revit_id];
    var facility_id = (fmmodel && fmmodel.FacilityId && fmmodel.FacilityId !== '') ? fmmodel.FacilityId : PROJECT.canEdit ? null : '- no ID -';
    var remarks = (fmmodel && fmmodel.Remark && fmmodel.Remark != '') ? fmmodel.Remark : '';

    if (!facility_id) {
        facility_id = '';
        // adjust meta
        if (PROJECT.canEdit) objectInfoMetaEdit.fmid.placeholder = _MSG_NOFMIDFOUND;
    }

    if (!fmmodel) {
        // new model
        fmmodel = {
            RevitId: revit_id,
            ProjectUUID: _currentLevelModel.UUID
        }
    }

    var entry = $('<div class="fm_objectinfo fm_info"></div>').appendTo('#fm_search_result_object_info').data('model', fmmodel);

    if (PROJECT.canEdit) {

        if (isroom) objectInfoMetaEdit.fmid.name = _MSG_UNITID;
        if (ispublicroom) objectInfoMetaEdit.comments.type = 'label';

        entry.jqPropertyGrid({
            revitid: revit_id,
            fmid: facility_id,
            remarks: remarks,
            comments: ispublicroom ? _MSG_PUBLICFACILITY : ''
        },
        objectInfoMetaEdit);
    }
    else {

        if (isroom) objectInfoMeta.fmid.name = _MSG_UNITID;
        if (ispublicroom) objectInfoMeta.comments.type = 'label';

        entry.jqPropertyGrid({
            fmid: facility_id,
            remarks: remarks,
            comments: ispublicroom ? _MSG_PUBLICFACILITY : ''
        },
        objectInfoMeta);
    }

    if (PROJECT.canEdit) {
        // add element for feedback
        $('<span id="oifb" class="panelsectionfeedback">&nbsp;</span>').appendTo(entry);
    }

    $('#fm_search_result_object').show();
    $('#fm_search_result_fm_export').show();

    if (PROJECT.canEdit) {
        $('#fm_objectinfo_save').show();
    }

    restoreVisualLastObject();

    toggleAnnotation(object.id, true);

    _currentFMRevitId = revit_id;

    return true;
}

function showFMTenantsInfoByRevitId(revit_id) {

    hideFMTenantInfo();

    if (!revit_id) {
        clearLastObject();
        hideFMInfo();
        return false;
    }

    if (!viewfilter.rooms.nodes) {
        // no rooms no tenant to find
        return false;
    }

    var object = getObjectByRevitId(revit_id);
    if (!object) {
        clearLastObject();
        hideFMInfo();
        return false;
    }

    if (!isRoomObject(object)) {
        return false;
    }

    if (isPublicRoom(object)) {
        toggleAnnotation(object.id, true);
        return false;
    }

    var tenantmodel = _roomsInUseMap[revit_id];

    showFMTenantsInfoByModels(tenantmodel ? [tenantmodel] : null, object);
}

// this is called always when we picked a room or searched for a tenant
// if we searched for a tenant then NO roombject or object3 info will be active
// otherwise we have a room object
function showFMTenantsInfoByModels(tenantroomsmodels, object, fromSearch) {

    hideFMTenantInfo();

    $('#fm_search_result_tenant_this_level').html('');

    if (!fromSearch) {
        $('#fm_search_val').val('');
    }

    if (!tenantroomsmodels || tenantroomsmodels.length == 0) {

        if (PROJECT.canEdit == false) {
            if (object) {
                toggleAnnotation(object.id, true);
            }
            return;
        }

        if (!object) return;
        if (!isRoomObject(object)) return;
        if (isPublicRoom(object)) return;

        // add empty one
        tenantroomsmodels = [{
            Tenant: {},
            TenantRooms: {}
        }];

        //if (!object) {
        //    // get via object info panel, if any
        //    var objectmodel = $('.fm_objectinfo').data('model');
        //    if (objectmodel) {
        //        object = getObjectByRevitId(objectmodel.RevitId);
        //    }
        //}

        // add selected room to new entry
        var revit_id = getObjectRevitId(object);
        if (revit_id) {
            tenantroomsmodels[0].TenantRooms.RoomUUIDs = getRoomId(object);
        }
    }

    var parentelm = $('#fm_search_result_tenant_this_level');

    hideAllRooms();

    var usedTenantNames = [];
    var usedTenantModels = [];

    for (var i in tenantroomsmodels) {

        var model = tenantroomsmodels[i];

        var roomsinfo = getTenantRoomsInfo(model);

        // in LOCAL only: skip contracts without rooms
        if (roomsinfo[0] === _MSG_NOROOMS) continue;

        var roomobjects = showTenantRooms(model);
        updateTentantRoomsAliasLabel(model, roomobjects);

        // classes indicate what can be done with this entry, not just for appearance
        var entry = $('<div class="fm_tenantroomsmodel fm_tenantroomssavedata fm_info"></div>').appendTo(parentelm).data('model', model);

        if (PROJECT.canEdit) {

            tenantRoomsMetaEdit.unitid.color = model.Tenant.Color || _defaultRoomColor;

            entry.jqPropertyGrid({
                tname: model.Tenant.DisplayName || '',
                unitid: roomsinfo[0],
                unitsalias: roomsinfo[2],
                area: roomsinfo[1],
                lease: model.TenantRooms.Notes || '',
                contract: model.TenantRooms.ContractNo || ''
            },
            tenantRoomsMetaEdit);

            // add element for feedback
            var initialMessage = (model.Tenant && model.Tenant.UUID) || model.TenantRooms.UUID ? '&nbsp;' : 'No tenant assigned';
            var initialhide = model.TenantRooms.UUID ? '' : ' hide';

            if (model.TenantRooms.UUID && !model.TenantRooms.Id) {
                initialMessage = 'Warning: this assignment has not yet been saved!';
            }

            // add delete
            // in LOCAL only: hide delete
            $('<span id="tifb' + i + '" class="panelsectionfeedback">' + initialMessage + '</span>' +
              '<span class="tmButtonRemove right hide' + initialhide + '" onclick="removeTenantRoomsEntry($(this));"></span>')
                .appendTo(entry);
        }
        else {

            tenantRoomsMeta.unitid.color = model.Tenant.Color || _defaultRoomColor;

            //var dates = getDateRange(model.TenantRooms.Notes);
            //var leaseText = '';
            //if(dates[0] !== '' && dates[1] !== '') 
            //    leaseText = dates[0] + ' > ' + dates[1];
            //else if(dates[0] !== '') {
            //    leaseText = dates[0] + ' > ?';
            //}
            //else if(dates[1] !== '') {
            //    leaseText = '? > ' + dates[1];
            //}

            entry.jqPropertyGrid({
                tname: model.Tenant.DisplayName || '',
                unitid: getTenantRoomsAlias(roomsinfo),
                //area: roomsinfo[1],
                //lease: leaseText,
            },
            tenantRoomsMeta);

            // add element for feedback
            $('<span id="tifb' + i + '" class="panelsectionfeedback">&nbsp;</span>').appendTo(entry);
        }

        if (!model.Tenant.UUID || PROJECT.canView) {
            // new or undefined tenant: hide profile icon
            entry.find('.tmButtonProfile').hide();
        }

        if (PROJECT.canEdit) {
            // FM search
            $(".tenantselect").bind('input', function () {
                var txt = $(this).val().trim();
                if (txt == '') {
                    return;
                }
                if (_tenantsNameMap && _tenantsNameMap.hasOwnProperty(txt)) {
                    //onActiveTenantChanged($(this), _tenantsNameMap[txt]);
                }
            });
        }

        _activeTenantRoomsModels.push(model);

        if (model.Tenant.DisplayName && usedTenantNames.indexOf(model.Tenant.DisplayName) === -1) {
            usedTenantNames.push(model.Tenant.DisplayName);
            usedTenantModels.push(model);
        }
    }

    showSelectedTenantInfos(usedTenantModels);

    addUIHandlersActiveModels();

    if (PROJECT.canEdit) {
        $('#fm_tenantinfo_save').show();
    }

    $('#fm_search_result_tenant').show();
}

function showFMTenantsInfoByModelsOtherLevels(tenantroomsmodels) {

    $('#fm_search_result_tenant_other_levels').html('');

    if (!tenantroomsmodels || tenantroomsmodels.length == 0) {
        return;
    }
    var parentelm = $('#fm_search_result_tenant_other_levels');

    var title = $('<span id="fm_search_result_tenant_other_title" class="panelmenutitle">' + _MSG_FOUNDOTHERLEVELS + '</span>').appendTo(parentelm);

    var usedTenantNames = [];

    for (var i in tenantroomsmodels) {
        var model = tenantroomsmodels[i];

        if (usedTenantNames.indexOf(model.Tenant.DisplayName) != -1) continue;

        if (_levelIdMap.hasOwnProperty(model.TenantRooms.LevelUUID) == false) continue;

        var levelid = _levelIdMap[model.TenantRooms.LevelUUID];

        var entry = $('<div class="fm_tenantroomsinfo_other fm_info"></div>').appendTo(parentelm);

        var metadata = {
            name: {
                name: model.Tenant.DisplayName,
                type: 'openprojectsearch',
                //url: '/Home/Index/?uuid=' + model.Project.UUID + '&search=' + encodeURIComponent(escapeAttributeValue(model.Tenant.DisplayName))
                levelid: levelid
        },
        }

        entry.jqPropertyGrid({
            name: levelid, //model.Project.DisplayName,
        },
        metadata);

        usedTenantNames.push(model.Tenant.DisplayName);
    }
}

function showSelectedTenantInfos(models) {
    if (!models || models.length === 0) {
        $('#extraLabel').html('');
        $('#extraLabel').data('model', null);
        $('#extraLabel').hide();
        return;
    }

    if (PROJECT.canView) {
        for (var i in models) {
            showTenantProfileInfo(models[i], true);
        }
    }

    var model = models[0];
    var tenantname = model.Tenant.DisplayName;
    //var roomsalias = (model.TenantRooms.RoomsAlias || '').trim();
    //var infotxt;
    //if (roomsalias !== '') {
    //    infotxt = tenantname + ' - ' + roomsalias;
    //}
    //else {
    //    infotxt = tenantname;
    //}
    $('#extraLabel').html(tenantname);
    $('#extraLabel').data('model', model);
    $('#extraLabel').show();
}

function addUIHandlersActiveModels() {

    if (!_activeTenantRoomsModels || _activeTenantRoomsModels.length === 0) return;

    if (PROJECT.canEdit) {
        $('.roomscolor').each(function (index, value) {
            $(this).colorpicker({
                showOn: 'button',
                //color: $(this).css('background-color'),
                //defaultPalette: 'web',
            })
            .on('change.color', function (e, color) {
                //console.log('picker click', color);
                updateTenantColor($(this), color, true);
            })
            .on('mouseover.color', function (e, color) {
                if (color) {
                    updateTenantColor($(this), color, false);
                }
            })
            .on('colorpicker.hide', function () {
                //console.log('picker hide');
                restoreRoomMaterials();
            })
        });

        $('.date').each(function (index, value) {
            $(this).datepicker({})
        });
    }

    $('.roomsrow').on('mouseenter mouseleave', function (e) {
        showTenantRoomsHover($(this), e.type === 'mouseenter');
    });
}

function removeUIHandlersActiveModels() {
    $('.roomscolor')
        .off('change.color')
        .off('mouseover.color')
        .off('colorpicker.show');

    $('.roomsrow').off('mouseenter mouseleave');
}

function addUIHandlersDirectory() {
    // directory
    $('.roomsopen').click(function (e) {
        e.preventDefault();
        var model = getTenantRoomsModelFromElement($(this));
        if (model) showFMTenantsInfoByModels([model]);
    });

    // hover effect for all room related rows in right panel
    $('.roomsopen').on('mouseenter mouseleave', function (e) {
        showDirectoryTenantRoomsHover($(this), e.type === 'mouseenter');
    });
}

function removeUIHandlersDirectory() {
    $('.roomsopen').off('click');
    $('.roomsopen').off('mouseenter mouseleave');
}

function hideFMInfo() {
    closeHelp();
    $('#tenantinfoHolder').hide();
    hideFMObjectInfo();
    hideFMTenantInfo();
    showTenantDirectory();
}

function hideFMObjectInfo() {
    _currentFMRevitId = null;
    $('#fm_objectinfo_save').hide();
    $('#fm_search_result_object').hide();
    $('#fm_search_result_object_info').html('');
}

function hideFMTenantInfo() {

    _activeTenantRoomsModels = [];

    hideAllRooms();

    // selected object can be a room but without tenant: make sure it is visible
    if (VA3C.lastObject3D) {
        VA3C.lastObject3D.visible = true;
    }

    removeUIHandlersActiveModels();
    $('#fm_tenantinfo_save').hide();
    $('#fm_search_result_tenant').hide();
    $('#fm_search_result_tenant_this_level').html('');
    $('#fm_search_result_tenant_other_levels').html('');

    $('#fm_search_val').val('');

    showSelectedTenantInfos();
}

// $elm is clicked div
function startAssignTenantRooms($elm) {

    var $root = $elm.closest('.fm_tenantroomsmodel');

    var model = getTenantRoomsModelFromElement($elm);
    if (!model) {
        stopRoomAssignment($elm, $root);
        return;
    }

    if (!_activeTenantRoomsModels || _activeTenantRoomsModels.length == 0) {
        stopRoomAssignment($elm, $root);
        console.error('[ERROR] No current tenant model set');
        return;
    }

    if (_isAssigningRooms) {
        stopRoomAssignment($elm, $root);
        return;
    }

    ensureValidTenantRoomsModel(model);

    if (setActiveTenantRoomsIndex(model) == false) {
        stopRoomAssignment($elm, $root);
        return;
    }

    // ESC handler
    $(document).on('keyup', function (e) {
        if (e.keyCode === 27)
            stopRoomAssignment($elm, $root);
    });

    // remove highlight from room if any
    restoreVisualLastObject();

    hideAllRooms();

    showTenantRooms(model);

    setAssignRoomsUI($elm, $root);

    // tell clickHandler we are picking rooms for assignment
    _currentFilterKeys = [viewfilter.rooms.key];
    _isAssigningRooms = true;

    forceRender();
}

function stopRoomAssignment($elm, $root) {
    // toggle
    _isAssigningRooms = false;
    $(document).off('keyup');
    $('#rightmenu').find('input, textarea, button, select').removeAttr('disabled');
    $('#leftmenu').find('input, textarea, button, select').removeAttr('disabled');
    $root.css({});
    $elm.html(_MSG_ADDREMOVEROOMS).css({});

    var model = $root.data('model');
    var savedata = $root.jqPropertyGrid('get');
    applySaveDataToCurrentTenantRoomsModel(model, savedata);

    // debug
    var currentmodel = _activeTenantRoomsModels[_activeTenantRoomsModelIndex];
    if (currentmodel.Tenant.UUID != model.Tenant.UUID) {
        console.error('MISMATCH betweenn current and UI model!');
    }

    // refresh UI with new data
    showFMTenantsInfoByModels(_activeTenantRoomsModels);
    setViewFilter();

    $('#tifb' + _activeTenantRoomsModelIndex).html(_MSG_PRESSSAVEASSIGNMENT).css({ color: 'red' });
    setTimeout(clearFeedback, 5000, $('#tifb' + _activeTenantRoomsModelIndex));

}

function onActiveTenantChanged($elm, tenantmodel) {
    if (!tenantmodel) return;
    var model = getTenantRoomsModelFromElement($elm);
    if (!model) return;
    if (model.Tenant.UUID === tenantmodel.UUID) return;
    model.Tenant = tenantmodel;

    //// update visuals
    //restoreVisualLastObject();
    //collectTenantRooms(model, true);
    //showFMTenantsInfoByModels(_activeTenantRoomsModels);
    //forceRender();
}

function applySaveDataToCurrentTenantRoomsModel(model, savedata) {

    if (!model) {
        console.error('[ERROR] No tenant model found for tenant');
        return;
    }

    var tenantcolor = (model.Tenant && model.Tenant.Color) || '';
    model.Tenant = _tenantsNameMap && _tenantsNameMap[savedata.tname];
    ensureValidTenantRoomsModel(model);
    model.Tenant.DisplayName = savedata.tname;
    model.Tenant.Color = tenantcolor;
    model.TenantRooms.RoomsAlias = (savedata.unitsalias || '').trim();
    model.TenantRooms.Notes = savedata.lease;
    model.TenantRooms.ContractNo = savedata.contract;
    //model.TenantRooms.RoomUUIDs = savedata.roomuuids; // RoomUUIDs not in savedata but set during assignment
}

function setActiveTenantRoomsIndex(model) {
    // we can have multiple tenantrooms entries in right panel: hold the active one
    _activeTenantRoomsModelIndex = -1;
    for (var i in _activeTenantRoomsModels) {
        if (_activeTenantRoomsModels[i].TenantRooms.UUID == model.TenantRooms.UUID) {
            _activeTenantRoomsModelIndex = i;
            break;
        }
    }

    if (_activeTenantRoomsModelIndex == -1) {
        console.error('Failed to find active model');
        return false;
    }

    return true;
}

function setAssignRoomsUI($elm, $root) {
    $root.css({ border: '2px solid red' });
    $elm.html(_MSG_PRESSESCASSIGNMENT).css({ color: 'red' });
    $('.panelsectionfeedback').html('&nbsp;').css({});
    // disable all input in left and right panel
    // only ESC can save us
    $('#rightmenu').find('input, textarea, button, select').attr('disabled', 'disabled');
    $('#leftmenu').find('input, textarea, button, select').attr('disabled', 'disabled');
}

function clearFeedback($elm) {
    $elm.html('&nbsp;').css({});
}

function searchFMInfo(searchVal) {

    if (!searchVal || searchVal == '') {
        $('#fm_search_fb').html('&nbsp;');
        clearLastObject();
        return;
    }

    if (PROJECT.canEdit) {
        // check for FM ID first, resulting in object3D.id
        // id is either facility ID added by user, or revit ID from json model
        var object_id = searchVal;

        if (PROJECT.revitToObjectId.hasOwnProperty(object_id) === false) {
            // not a revit ID but maybe FM id: get the revit ID
            object_id = PROJECT.facilityToRevitId[object_id];
        }

        if (PROJECT.revitToObjectId.hasOwnProperty(object_id)) {
            var res = showObjectInfoById(PROJECT.revitToObjectId[object_id]);
            $('#fm_search_fb').html(res ? '&nbsp;' : _MSG_NOTHINGFOUND);
            return;
        }
    }

    // something else: tenant name
    // call ajax
    getTenantRoomsModelsByName(searchVal);
}

// auto assign to revit_id <> facility_id map, where facility_id is taken from userData
// filterkey indicates type of object
function autoAddToRevitIdFmMap(object, filterkey) {

    var revit_id = getObjectRevitId(object);
    if (!revit_id) return;

    var facility_id;
    switch (filterkey) {
        case viewfilter.rooms.key:
            // userData Name is FM ID
            facility_id = getObjectUserDataProperty(object, 'Name');
            break
        case viewfilter.mep.key:
            if (PROJECT.id === 'SAMEX') {
                facility_id = getObjectUserDataProperty(object, '资产编号', true);
            }
            break;
        default:
            // userData Mark is FM ID for all others
            //facility_id = getObjectUserDataProperty(object, 'Mark', true);
            break;
    }

    if (facility_id && facility_id != '') {

        var model = {
            RevitId: revit_id,
            FacilityId: facility_id,
            ProjectUUID: _currentLevelModel.UUID
        }

        updateRevitIdToFmIdMap(revit_id, model);
    }
}

function updateRevitIdToFmIdMap(revit_id, model) {

    if (!revit_id) {
        console.log('[WARNING] no revit ID defined');
        return;
    }

    if (!model.FacilityId || model.FacilityId == '') {
        // remove from map
        if (PROJECT.revitToFacilityId.hasOwnProperty(revit_id)) {
            var oldfmmodel = PROJECT.revitToFacilityId[revit_id];
            if (PROJECT.facilityToRevitId.hasOwnProperty(oldfmmodel.FacilityId)) {
                delete PROJECT.facilityToRevitId[oldfmmodel.FacilityId]
            }
            console.log('[INFO] removed ', oldfmmodel, 'for', revit_id);
            delete PROJECT.revitToFacilityId[revit_id];
        }
    }
    else {

        if (PROJECT.revitToFacilityId[revit_id] == model.FacilityId) {
            // already assigned
            console.log('[INFO] object', VA3C.lastObject3D, 'already has FM ID', model.FacilityId);
            return;
        }

        PROJECT.revitToFacilityId[revit_id] = model;
        PROJECT.facilityToRevitId[model.FacilityId] = revit_id;
    }
}

// get room ID; for storage!!
function getRoomId(object) {
    if (!object) return '';
    var revit_id = getObjectRevitId(object);
    if (!revit_id) return '';
    if (!isRoomObject(object)) {
        return '';
    }

    return PROJECT.RevitIdToRoomId[revit_id] || revit_id;
}

// get unit ID; for display!!
function getRoomDisplayName(object) {
    if (!object) return '';
    if (!isRoomObject(object)) {
        return getNiceObjectName(object);
    }
    var roomid;
    var revit_id = getObjectRevitId(object);
    var fmmodel = PROJECT.revitToFacilityId[revit_id];
    if (fmmodel && fmmodel.FacilityId && fmmodel.FacilityId !== '') {
        roomid = fmmodel.FacilityId;
    }
    else {
        roomid = getObjectUserDataProperty(object, 'Name');
        if (!roomid || roomid === '') {
            roomid = object.name;
        }
    }

    return roomid;
}

// returns tenant's Alias if set otherwise DisplayName
function getTenantAlias(model) {
    if (!model) return null;
    if (typeof model.Tenant !== 'undefined') {
        // tenantrooms model
        if (model.Tenant.Alias && model.Tenant.Alias != '') {
            return model.Tenant.Alias;
        }
        return model.Tenant.DisplayName;
    }

    if (typeof model.Alias !== 'undefined') {
        // tenant model
        if (model.Alias && model.Alias != '') {
            return model.Alias;
        }
        return model.DisplayName;
    }

    return null;
}

//// update tenant model in local table
//function updateTenantProfiles(tenantmodel) {

//    if (!_currentTenantRoomsTable) _currentTenantRoomsTable = [];

//    for (var i in _currentTenantRoomsTable) {
//        var model = _currentTenantRoomsTable[i];
//        if (model.Tenant.UUID == tenantmodel.UUID) {
//            console.log('tenant updated')
//            model.Tenant = tenantmodel.slice();
//            console.log('tenant updated', model.Tenant);
//        }
//    }
//}

function updateTenantRoomsManagerUI() {
    // update data for models shown in right panel
    updateActiveTenantRoomsModels();
    // update the list with tenants for select in combobox
    updateTenantsOptionsList();
    // show the updated models in right panel
    showFMTenantsInfoByModels(_activeTenantRoomsModels);
    // show directory
    showTenantDirectory();
    // show all assigned rooms
    showAllAssignedRooms(true);
}

function updateActiveTenantRoomsModels() {

    // _activeTenantRoomsModels holds the models that are visible in right panel
    // sync its values with the values return from ajax POST during save, or during room assignment (rooms info not saved to db when stopping assignment)

    if (!_activeTenantRoomsModels || _activeTenantRoomsModels.length == 0) {
        console.log('[INFO] no current tenant room info');
        return;
    }

    // collect UUIDs from active items that need update
    var toUpdateUUIDs = [];
    for (var i in _activeTenantRoomsModels) {
        toUpdateUUIDs.push(_activeTenantRoomsModels[i].TenantRooms.UUID);
    }

    // get the entries from ajax POST result (_currentTenantRoomsTable) and give to active items
    _activeTenantRoomsModels = _currentTenantRoomsTable.filter(function (val, index, array) {
        return toUpdateUUIDs.indexOf(val.TenantRooms.UUID) != -1;
    });
}

// create mapping as in [revit_id : tenant name]
function updateRoomsInUseMap() {

    _roomsInUseMap = {};

    if (!viewfilter.rooms.nodes) return;
    for (var i = 0; i < viewfilter.rooms.nodes.length; i++) {
        if (isPublicRoom(viewfilter.rooms.nodes[i])) continue;
        resetRoomMaterial(viewfilter.rooms.nodes[i]);
    }

    for (var i in _currentTenantRoomsTable) {
        var model = _currentTenantRoomsTable[i];
        addTenantRoomsToMap(model)
    }

    forceRender();


}

// returns true when we updated a label on a room, otherwise false
function updateRoomLabel(revit_id) {
    if (!revit_id) return false;
    var object = getObjectByRevitId(revit_id);
    if (!object) return false;
    if (!isRoomObject(object)) return false;

    updateAnnotationText(object.id, getRoomDisplayName(object));
    forceRender();

    return true;
}

function addTenantRoomsToMap(model) {
    if (!model) return;
    if (!model.TenantRooms) return;
    if (!model.TenantRooms.RoomUUIDs) return;

    var roomscolor = model.Tenant.Color;
    if (roomscolor === '') roomscolor = null;

    var roomMaterial = roomscolor ?
                        (PROJECT.canEdit ?
                        new THREE.MeshLambertMaterial({ color: roomscolor, opacity: _defaultRoomOpacity, transparent: true }) :
                        new THREE.MeshLambertMaterial({ color: roomscolor, opacity: _defaultRoomOpacityViewOnly, transparent: false }))
                        : null;

    var ids = getTenantRoomIds(model);
    for (var idx in ids) {
        var roomid = ids[idx].trim();
        if (!roomid || roomid == '') continue;
        var revit_id = PROJECT.roomIdToRevitId[roomid];
        if (revit_id) {
            var object = getObjectByRevitId(revit_id);
            if (object && isPublicRoom(object) == false) {
                _roomsInUseMap[revit_id] = model;
                setRoomMaterial(getObjectByRevitId(revit_id), roomMaterial, true, true);
            }
            else {
                console.warn('[WARNING] skipped assigned public room', roomid, 'for', model);
            }
        }
    }
}

function getTenantRoomsModelFromElement($elm) {
    var model = $elm.data('model');
    if (model) return model;

    var $root = $elm.closest('.fm_tenantroomsmodel');
    if ($root.length == 0) {
        console.error('[ERROR] No tenant table root node found');
        return null;
    }

    model = $root.data('model');
    if (!model) {
        console.error('[ERROR] No tenant model found for tenant');
        return null;
    }

    return model;
}

// show on hover

function showTenantRoomsHover($elm, show) {

    if (_currentFilterKeys.indexOf(viewfilter.rooms.key) == -1) return;

    if (_isAssigningRooms) return;
    if (_activeRoomObjects) return; //during color pick

    var model = getTenantRoomsModelFromElement($elm);
    if (!model) return;

    hideAllRooms();

    if (show) {
        var roomobjects = showTenantRooms(model);
        updateTentantRoomsAliasLabel(model, roomobjects);
    }
    else {
        if (_activeTenantRoomsModels && _activeTenantRoomsModels.length > 0) {
            // hover on active tenant sections
            showActiveRooms();
        }
        else {
            // hover on directory
            showAllAssignedRooms();
        }
    }
}

function showDirectoryTenantRoomsHover($elm, show) {
    if (_currentFilterKeys.indexOf(viewfilter.rooms.key) == -1) return;
    if (_isAssigningRooms) return;
    if (_activeRoomObjects) return; //during color pick

    var model = getTenantRoomsModelFromElement($elm);
    if (!model) return;

    hideAllRooms();

    if (show) {
        var roomobjects = showTenantRooms(model);
        updateTentantRoomsAliasLabel(model, roomobjects);
    }
    else {
        showAllAssignedRooms();
    }
}

// all assigned rooms on this level
function showAllAssignedRooms(forceUpdate) {
    if (_currentFilterKeys.indexOf(viewfilter.rooms.key) == -1) return false;
    for (var i in _currentTenantRoomsTable) {
        var roomobjects = showTenantRooms(_currentTenantRoomsTable[i], forceUpdate);
        updateTentantRoomsAliasLabel(_currentTenantRoomsTable[i], roomobjects, true);
    }
}

// rooms used by active tenants
function showActiveRooms() {
    if (_currentFilterKeys.indexOf(viewfilter.rooms.key) == -1) return false;

    if (_activeTenantRoomsModels && _activeTenantRoomsModels.length > 0) {
        for (var i in _activeTenantRoomsModels) {
            var roomobjects = showTenantRooms(_activeTenantRoomsModels[i]);
            updateTentantRoomsAliasLabel(_activeTenantRoomsModels[i], roomobjects);
        }
        return true;
    }

    return false;
}

// show object3d in scene
function showTenantRooms(model, forceUpdate) {
    if (_currentFilterKeys.indexOf(viewfilter.rooms.key) == -1) return;
    if (!model) return;
    var roomobjects = collectTenantRooms(model, forceUpdate);
    for (var i = 0; i < roomobjects.length; i++) {
        roomobjects[i].visible = true;
        toggleAnnotation(roomobjects[i].id, true);
    }

    forceRender();

    return roomobjects;
}

function updateTenantColor($elm, color, save) {
    var model = getTenantRoomsModelFromElement($elm);
    if (!model) return;

    var force = false;
    if (!_activeRoomObjects) {
        // color is per tenant not per contract/tenantrooms
        // collect all rooms on this level assigned to same tenant
        _activeRoomObjects = [];
        for (var i in _currentTenantRoomsTable) {
            var trmodel = _currentTenantRoomsTable[i];
            if (trmodel.Tenant.UUID === model.Tenant.UUID) {
                _activeRoomObjects.push.apply(_activeRoomObjects, collectTenantRooms(trmodel));
            }
        }
        // force new color
        force = true;
        //console.log('# rooms', _activeRoomObjects.length);
    }

    // keep $root as $elm seems to disappear on close colorpicker
    var $root = $elm.closest('.fm_tenantroomsmodel');
    // color is hex code as in #fe2342
    // set on hidden input to get rgb and for correct color at open colorpick
    $elm.css('background-color', color);
    // get from css: color will be rgb
    var rgbcolor = $elm.css('background-color');
    var roomMaterial = new THREE.MeshLambertMaterial({ color: rgbcolor, opacity: _defaultRoomOpacity, transparent: true });

    for (var i in _activeRoomObjects) {
        setRoomMaterial(_activeRoomObjects[i], roomMaterial, save, force);
    }

    if (save) {
        _activeRoomObjects = null;
        model.Tenant.Color = rgbcolor;
        //if(model.Tenant.UUID)
        //    saveTenantProfile($elm ,$root);
    }

    forceRender();
}

function removeTenantRoomsWithoutRooms(result) {
    // remove contracts without rooms
    var toremove = [];
    for (var i in result) {
        var model = result[i];
        var ids = getTenantRoomIds(model);
        if (ids.length === 0) {
            toremove.push(i);
        }
    }

    while (toremove.length !== 0) {
        result.splice(toremove.shift(), 1);
    }
}


function getTenantRoomIds(model) {
    if (!model || !model.TenantRooms) return [];
    if (!model.TenantRooms.RoomUUIDs) return [];
    return model.TenantRooms.RoomUUIDs.split(SEP_ROOMIDS).filter(function (el) { return el.length != 0 });
}

function collectTenantRooms(model, forceUpdate) {
    var roomobjects = [];

    if (!viewfilter.rooms.nodes) return roomobjects;
    if (!model) return roomobjects;
    if (!model.TenantRooms) return roomobjects;
    if (!model.TenantRooms.RoomUUIDs) return roomobjects;

    var uuid = model.TenantRooms.UUID;
    for (var revit_id in _roomsInUseMap) {
        if (_roomsInUseMap[revit_id].TenantRooms.UUID == uuid) {
            var object = getObjectByRevitId(revit_id);
            if (object) roomobjects.push(object);
        }
    }

    if (roomobjects.length == 0) {
        // we have RoomUUIDs so when not found it means a new entry at click on unassigned room: parse from RoomUUIDs
        var ids = getTenantRoomIds(model);
        for (var idx in ids) {
            var roomid = ids[idx].trim();
            if (!roomid || roomid == '') continue;
            var revit_id = PROJECT.roomIdToRevitId[roomid];
            var object = getObjectByRevitId(revit_id);
            if (object) roomobjects.push(object);
        }

        if (roomobjects.length == 0)
            return roomobjects;
    }

    //if (forceUpdate || roomobjects[0].runtimeInfo.lastmaterial) {
    //    // first visit or refresh
    //    var roomscolor = model.Tenant.Color;
    //    if (roomscolor === '') roomscolor = null;
    //    var roomMaterial = roomscolor ? new THREE.MeshLambertMaterial({ color: roomscolor, opacity: _defaultRoomOpacity, transparent: true }) : null;
    //    for (var i in roomobjects) {
    //        setRoomMaterial(roomobjects[i], roomMaterial, true, true);
    //    }
    //}

    return roomobjects;
}

function updateTentantRoomsAliasLabel(model, roomobjects, doShow) {
    // kiosk: no label with roomsalias?
    if(!doShow) return;

    if (!model.Tenant.DisplayName) return; // has rooms but no tenant yet
    var box = getBoundingBox(roomobjects);
    if (!box) {
        removeTenantRoomsAliasLabel(model);
        return;
    }
    var id = model.TenantRooms.UUID;
    var labeltext;
    var roomsalias = (model.TenantRooms.RoomsAlias || '').trim();
    if (roomsalias !== '') {
        labeltext = roomsalias;
    }
    else {
        labeltext = model.Tenant.DisplayName;
    }
    var anninfo = createAnnotation(id, box, labeltext, null, 'roomsalias');
    if (anninfo) {
        var roomscolor = model.Tenant.Color;
        if (roomscolor && roomscolor !== '') {
            updateAnnotationColor(id, getForeColor(roomscolor), getRGB(roomscolor));
        }

        _tenantRoomsLabels[id] = anninfo;

        forceRender();
    }
}

function removeTenantRoomsAliasLabel(model) {
    var id = model.TenantRooms.UUID;
    if (_tenantRoomsLabels.hasOwnProperty(id)) {
        delete _tenantRoomsLabels[id];
        removeAnnotation(id);
    }
}

//
function getTenantRoomsInfo(model) {
    var roomobjects = collectTenantRooms(model);
    if (!roomobjects || roomobjects.length == 0)
        return [_MSG_NOROOMS, ''];

    var roomNames = [];
    var totarea = 0;
    for (var i in roomobjects) {
        var object = roomobjects[i];
        roomNames.push(getRoomDisplayName(object));
        var area = getRoomArea(object);
        if (area) totarea += area;
    }

    roomNames.sort();

    return [roomNames.join(', '), Math.round(totarea * 100) / 100, (model.TenantRooms.RoomsAlias || '').trim()];
}

function getTenantRoomsAlias(roomsinfo) {
    if (!roomsinfo) return _MSG_NOROOMS;
    var roomIds = roomsinfo[0];
    var roomsAlias = roomsinfo[2];
    if (roomsAlias && roomsAlias !== '') {
        if (PROJECT.canEdit) {
            return roomsAlias + ' (' + roomIds + ')';
        }
        else {
            return roomsAlias;
        }
    }
    return roomIds;
}

function getRoomArea(object) {
    if (!object) return null;
    var sarea = getObjectUserDataProperty(object, 'Area');
    if (!sarea) return null;
    var area = parseFloat(sarea);
    if (isNaN(area)) {
        console.log('[WARNING] object has invalid Area value', object);
        return null;
    }
    return area;
}

function addTenantRoom(object) {
    if (!_activeTenantRoomsModels) {
        console.log('[WARNING] no current tenant room info');
        return;
    }

    var model = _activeTenantRoomsModels[_activeTenantRoomsModelIndex];
    if (!model) {
        console.log('[WARNING] no current tenant room info');
        return;
    }

    if (!object) {
        console.log('[WARNING] no room object');
        return;
    }

    if (!isRoomObject(object)) {
        console.log('[WARNING] not a room object');
        return;
    }

    var roomid = getRoomId(object);
    var revit_id = getObjectRevitId(object);

    if (isPublicRoom(object)) {
        object.visible = false;
        $('#tifb' + _activeTenantRoomsModelIndex).html('Room ' + getRoomDisplayName(object) + ' is a public facility and cannot be assigned');
        console.log('[INFO] room is a public facility and cannot be assigned');
        return;
    }

    object.visible = true;

    if (!model.TenantRooms.RoomUUIDs) model.TenantRooms.RoomUUIDs = '';

    if (_roomsInUseMap.hasOwnProperty(revit_id)) {

        var ownermodel = _roomsInUseMap[revit_id];

        if (ownermodel.TenantRooms.UUID == model.TenantRooms.UUID) {
            // remove from assignment

            object.visible = false;
            resetRoomMaterial(object);

            // yacks
            model.TenantRooms.RoomUUIDs = model.TenantRooms.RoomUUIDs.replace(roomid, '');
            model.TenantRooms.RoomUUIDs = model.TenantRooms.RoomUUIDs.replace(SEP_ROOMIDS + SEP_ROOMIDS, SEP_ROOMIDS);
            delete _roomsInUseMap[revit_id];

            $('#tifb' + _activeTenantRoomsModelIndex).html('Room ' + getRoomDisplayName(object) + ' has been removed');
            console.log('[INFO] room removed from assignment', model.TenantRooms.RoomUUIDs);
        }
        else {
            object.visible = false;
            $('#tifb' + _activeTenantRoomsModelIndex).html('Room ' + getRoomDisplayName(object) + ' is already assigned to a contract for ' + (ownermodel.Tenant.DisplayName || ''));
            console.log('[INFO] room is already assigned to another contract/tenant');
        }
    }
    else {
        // add to model
        model.TenantRooms.RoomUUIDs += (SEP_ROOMIDS + roomid);
        // set color
        var roomscolor = model.Tenant.Color;
        if (roomscolor === '') roomscolor = null;
        var roomMaterial = roomscolor ? new THREE.MeshLambertMaterial({ color: roomscolor, opacity: _defaultRoomOpacity, transparent: true }) : null;
        setRoomMaterial(object, roomMaterial, true, true);
        // add to in use map
        _roomsInUseMap[revit_id] = model;
        // feedback
        $('#tifb' + _activeTenantRoomsModelIndex).html('Room ' + getRoomDisplayName(object) + ' has been added');
        // show picked object in UI
        showFMObjectInfoByRevitId(revit_id);
    }
}

function onAssignRoomsNothingPicked() {
    $('#tifb' + _activeTenantRoomsModelIndex).html(_MSG_NOTHINGSELECTED);
}

function hideAllRooms() {

    if (!viewfilter.rooms.nodes) return;
    for (var i = 0; i < viewfilter.rooms.nodes.length; i++) {
        viewfilter.rooms.nodes[i].visible = false;
        toggleAnnotation(viewfilter.rooms.nodes[i].id, false);
    }

    for (var id in _tenantRoomsLabels) {
        delete _tenantRoomsLabels[id];
        removeAnnotation(id);
    }

    _tenantRoomsLabels = {};

    forceRender();
}

function showAllRoomLabels() {

    if (!viewfilter.rooms.nodes) return;
    for (var i = 0; i < viewfilter.rooms.nodes.length; i++) {
        toggleAnnotation(viewfilter.rooms.nodes[i].id, true);
    }

    forceRender();
}

//function showAllRooms() {
//    if (!viewfilter.rooms.nodes) return;
//    for (var i = 0; i < viewfilter.rooms.nodes.length; i++) {
//        viewfilter.rooms.nodes[i].visible = true;
//    }

//    forceRender();
//}


// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// Profile Page
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++


function openTenantProfile($elm) {
    var MODALPOPUP = true;
    var parentelm;
    if (MODALPOPUP) {
        parentelm = $('#profile');
    }
    else {
        parentelm = $('#tenantinfo');
        if ($('#tenantinfoHolder').css('display') === 'block') {
            $('#tenantinfoHolder').hide();
            parentelm.html('');
            return;
        }
    }


    if (_isAssigningRooms) {
        return;
    }

    var model = getTenantRoomsModelFromElement($elm);
    if (!model) return;

    if (!_activeTenantRoomsModels || _activeTenantRoomsModels.length == 0) {
        console.error('[ERROR] No current tenant model set');
        return;
    }

    if (!model.Tenant.UUID) {
        console.error('[ERROR] Unsaved tenant model');
        return;
    }

    closeHelp();

    if (PROJECT.canEdit) {
        // set current UI data to model
        var $root = $elm.closest('.fm_tenantroomsmodel');
        var savedata = $root.jqPropertyGrid('get');
        applySaveDataToCurrentTenantRoomsModel(model, savedata);
    }

    showTenantProfileInfo(model);
}

function showTenantProfileInfo(model, isappend) {

    var MODALPOPUP = true;
    var parentelm;
    if (MODALPOPUP) {
        parentelm = $('#profile');
    }
    else {
        parentelm = $('#tenantinfo');
    }

    parentelm.html('');

    var entry = $('<div class="fm_tenantinfo fm_info"></div>').appendTo(parentelm).data('model', model);

    if (isappend) {
        // info is appended to contract info table: no name, no notes (GP)
        // this is done in view mode only
        entry.jqPropertyGrid({
            contactname: model.Tenant.ContactName || '',
            contactphone: model.Tenant.ContactPhone || '',
            contactemail: model.Tenant.ContactEmail || '',
            //notes: model.Tenant.Notes || '',
        },
        PROJECT.canEdit ? tenantMetaEdit : tenantMetaAppend);
    }
    else {
        entry.jqPropertyGrid({
            tname: model.Tenant.DisplayName || '',
            contactname: model.Tenant.ContactName || '',
            contactphone: model.Tenant.ContactPhone || '',
            contactemail: model.Tenant.ContactEmail || '',
            notes: model.Tenant.Notes || '',
        },
        PROJECT.canEdit ? tenantMetaEdit : tenantMeta);
    }

    // add save button
    // in LOCAL only: hide buttons
    if (PROJECT.canEdit) {
        $('<div style="width:100%;padding:10px;">' +
          '<button id="btnProfileDelete" class="btn btn-warning left hide" onclick="removeTenantProfile($(this));">Remove</button>' +
          '<button id="btnProfileSave" class="btn right hide" onclick="saveTenantProfile($(this));">Save</button>' +
          '</div>').appendTo(entry);
    }

    var title = _MSG_DETAILSOFTENANT + ': ' + model.Tenant.DisplayName;

    if (MODALPOPUP) {
        // for modal popup:
        _panelProfile = $.jsPanel({
            theme: "grey",
            paneltype: 'modal',
            content: $('#profileholder'),
            headerTitle: title,
            contentSize: { width: 450, height: 260 },
            callback: function (panel) {
                $(".jsPanel-btn-close", panel)
                    // remove default handler
                    .off()
                    // bind new handler
                    .click(function () {
                        closeProfilePanel();
                    });
                $("button", this.content).click(function () { closeProfilePanel(); });
            },
        });

        $('#profileholder').show();
    }
    else {
        $('#tenantinfoTitle').html(title);
        $('#tenantinfoHolder').show();
    }
}

function saveTenantProfile($elm, $root) {

    // $root is optional, can be set by caller
    // if not set get it below

    if (_isAssigningRooms) {
        return;
    }

    // validate data before save
    var error = validateSaveData(true);
    if (error) {
        alert(error);
        return;
    }

    // get model from tenant profile table (not tenant rooms table)
    if (!$root)
        $root = $elm.closest('.fm_tenantinfo');

    if ($root.length == 0) {
        console.error('[ERROR] No tenant table root node found');
        return;
    }

    var model = $root.data('model');
    if (!model) {
        console.error('[ERROR] No tenant model found for tenant');
        return;
    }

    if (!_activeTenantRoomsModels || _activeTenantRoomsModels.length == 0) {
        console.error('[ERROR] No current tenant model set');
        return;
    }

    var savedata = $root.jqPropertyGrid('get');
    if (applySaveDataToTenantModel(model, savedata) == false) {
        return;
    }

    // post tenant but return new complete table, which will be used to refresh the right panel
    // for this we need level uuid
    var params = {
        model: model.Tenant,
        leveluuid: model.TenantRooms.LevelUUID
    };

    updateModel('/Home/UpdateTenantEntry', params, successPOSTTenantRoomsDBFunc, failPOSTTenantRoomsDBFunc);
}

function removeTenantProfile($elm, $root) {

    // $root is optional, can be set by caller
    // if not set get it below

    if (_isAssigningRooms) {
        return;
    }

    //// validate data before save
    //var error = validateSaveData(true);
    //if (error) {
    //    alert(error);
    //    return;
    //}

    // get model from tenant profile table (not tenant rooms table)
    if (!$root)
        $root = $elm.closest('.fm_tenantinfo');

    if ($root.length == 0) {
        console.error('[ERROR] No tenant table root node found');
        return;
    }

    var model = $root.data('model');
    if (!model) {
        console.error('[ERROR] No tenant model found for tenant');
        return;
    }

    if (model.Tenant.Id && model.Tenant.Id != 0) {
        if (!confirm('This will delete tenant ' + model.Tenant.DisplayName + ' and ALL its contracts on ALL levels!\n\nAre you sure you want this?')) {
            return;
        }

        if (!confirm('Are you REALLY sure you want this?')) {
            return;
        }
    }
    else {
        // just a refresh of right panel
        if (!confirm(_MSG_AREYOUSURE)) {
            return;
        }
    }

    // remove tenant and all associated tenantRooms; return new complete table, which will be used to refresh the right panel
    // for this we need level uuid
    var params = {
        model: model.Tenant,
        leveluuid: model.TenantRooms.LevelUUID
    };

    updateModel('/Home/RemoveTenantEntry', params, successPOSTTenantRoomsDBFunc, failPOSTTenantRoomsDBFunc);
}


function removeTenantByUUID(tenantuuid) {

    if (_isAssigningRooms) {
        return;
    }

    if (!_tenantsNameMap) {
        return;
    }

    var tenantname;
    for (var name in _tenantsNameMap) {
        if (_tenantsNameMap[name].UUID === tenantuuid) {
            tenantname = name;
            break;
        }
    }

    if (!tenantname) {
        return;
    }

    var model = _tenantsNameMap[tenantname];
    if (!model) {
        return;
    }

    if (model.Id && model.Id != 0) {
        if (!confirm('This will delete tenant ' + model.DisplayName + ' from this project!\n\nAre you sure you want this?')) {
            return;
        }
    }
    else {
        // just a refresh of right panel
        if (!confirm(_MSG_AREYOUSURE)) {
            return;
        }
    }

    // remove tenant and all associated tenantRooms; return new complete table, which will be used to refresh the right panel
    // for this we need level uuid
    var params = {
        model: model,
        leveluuid: _currentLevelModel.UUID
    };

    updateModel('/Home/RemoveTenantEntry', params, successPOSTTenantRoomsDBFunc, failPOSTTenantRoomsDBFunc);
}

function removeAllUnassignedTenants() {

    if (!confirm('This will delete ALL unassigned tenants from this project!\n\nAre you sure you want this?')) {
        return;
    }

    if (!confirm('Are you REALLY sure you want this?')) {
        return;
    }

    // remove all unassigned tenants from project
    var params = {
        leveluuid: _currentLevelModel.UUID,
        projectuuid: _currentLevelModel.ParentUUID
    };

    updateModel('/Home/RemoveUnassignedTenantEntries', params, successPOSTTenantRoomsDBFunc, failPOSTTenantRoomsDBFunc);

}

function applySaveDataToTenantModel(model, savedata) {

    if (!model) {
        console.error('[ERROR] No tenant model found for tenant');
        return;
    }

    var existingtenant = model.Tenant.DisplayName !== savedata.tname && _tenantsNameMap && _tenantsNameMap[savedata.tname];
    if (existingtenant) {
        alert('A tenant with name ' + savedata.tname + ' already exists!');
        return false;
    }

    //console.log('savedata tenant', savedata);

    ensureValidTenantRoomsModel(model);
    model.Tenant.DisplayName = savedata.tname;
    model.Tenant.ContactName = savedata.contactname;
    model.Tenant.ContactEmail = savedata.contactemail;
    model.Tenant.ContactPhone = savedata.contactphone;
    model.Tenant.Notes = savedata.notes;
}

function closeProfilePanel() {

    //console.log('close', _panelProfile);

    if (!_panelProfile) return;

    // normal close
    // re-append content to container and hide it
    var content = $('#profileholder').detach();
    content.hide();
    $('#maincontainer').append(content);
    _panelProfile.close();

}