var viewerModes = {
    tenants: 1,
}

var viewerRoles = {
    viewer: 1,
    editor: 2,
    pm: 3,
}

var _currentLevelModel = {}; // @Html.Raw(Json.Encode(Model.Project));
var _currentLevelFullName = ''; //'@Html.Raw(HttpUtility.JavaScriptStringEncode(ViewBag.Title))';

// FM and tenant related stuff

var _panelProfile;

// holds revit ID of object that is saved; for repopulate right panel with db data after successful POST
var _currentFMRevitId;
// active tenant room models shown in right panel
var _activeTenantRoomsModels = [];
// index of _activeTenantRoomsModels that is being edited during room assignment
var _activeTenantRoomsModelIndex = -1;
// room object3Ds affected during colorpicker
var _activeRoomObjects;
// local representation of db table PLUS unsaved entries
var _currentTenantRoomsTable = [];
// local representation of entire db table VIEWER ONLY
var _fullTenantRoomsTable;
var _levelIdMap;
// helpers during fill of entire db
var _todoFillLevels;
var _currentFillLevelId; //for _levelIdMap

//  flag indicating if we are selecting rooms for a tenant
var _isAssigningRooms = false;
// map holding tenant models as in { name: tenantmodel }
var _tenantsNameMap;
var _tenantNames; //list with tenant names used as source in dropdown autocomplete

// holds all room ids that have been assigned; for checking during room assignment
var _roomsInUseMap = {};
// default tenant color
var _defaultRoomColor = 'rgb(204, 204, 204)';
var _defaultRoomOpacity = 0.755; // some special value to find out this is not the initial room material
var _defaultRoomOpacityViewOnly = 1.0; // in view only we do not use transp on rooms
// default room object material with 0.7 (not 0.755!)
var _defaultRoomMaterial = new THREE.MeshLambertMaterial({ color: _defaultRoomColor, opacity: 0.7, transparent: true });

// room id seperator (MUST MATCH WITH CONTROLLER)
// TODO: get from controller
var SEP_ROOMIDS = '!^';

var _MSG_SAVING = 'Saving...';
var _MSG_SAVED = 'Data has been saved';
var _MSG_NOFMIDFOUND = 'No ID found';
var _MSG_NOTHINGFOUND = PROJECT.canEdit ? 'Nothing found' : 'No tenant found';
var _MSG_NOTENANT = PROJECT.canEdit ? 'No tenant' : 'No company';
var _MSG_NOTHINGSELECTED = 'Nothing selected';
var _MSG_NOROOMS = '- no rooms -';
var _MSG_NOMATCH = '- no matches -';
var _HTML_NOTHINGSELECTED = '<p class="smallComment center">' + _MSG_NOTHINGSELECTED + '</p>';
var _MSG_AREYOUSURE = 'Are you sure?';
var _MSG_PRESSSAVEASSIGNMENT = 'Press Save to store this assignment';
var _UI_ADDREMOVEROOMS = '[Add/Remove]';
var _UI_PRESSESCASSIGNMENT = '[Press ESC to stop assignment]';
var _UI_PUBLICFACILITY = 'Public Facility';

var _currentFilterKeys = [];

//== view filter data
var viewfilter = {
    arch: {
        key: 'arch', title: 'Architecture',
        namekeys: ['Wall', 'Window', 'Stair', 'Door', 'Rail', 'Generic', 'Curtain', 'Furniture', '门', '窗', 'Site'],
        nodes: null
    },
    str: {
        key: 'str', title: 'Structural',
        namekeys: ['Column', 'Floor', 'Structural', '梁', '柱', '结构', '楼板'],
        nodes: null
    },
    mep: {
        key: 'mep', title: 'MEP',
        namekeys: ['Pipe', 'Cable', 'Duct', 'Plumbing', 'Equipment', 'Electrical', 'Lighting', 'Air', '管', '机械设备', '卫浴装置', '电气设备', '电缆桥架'],
        nodes: null
    },
    fs: {
        key: 'fs', title: 'Fire Services',
        namekeys: ['Fire', 'Sprinklers', 'Security', '火'],
        nodes: null
    },
    rooms: {
        key: 'rooms', title: 'Tenant Rooms',
        namekeys: ['Rooms', '房间'],
        nodes: null
    }
};

//== user data filter
// loaded from ObjectProperties.txt
var userDataFilters = {};

// metadata for object info in right panel
var objectInfoMeta = {
    fmid: { name: 'FM ID', type: 'label' },
    remarks: { name: 'Remarks', type: 'label' },
    comments: { name: 'Comments', type: 'hidden' },
}

var objectInfoMetaEdit = {
    revitid: { name: 'Revit ID', type: 'label' },
    fmid: { name: 'FM ID', type: 'textbox', placeholder: '' },
    remarks: { name: 'Remarks', type: 'textbox' },
    comments: { name: 'Comments', type: 'hidden' },
}

// metadata for tenant info in right panel
var tenantRoomsMeta = {
    tname: { name: 'Name', type: 'profile' },
    unitid: { name: 'Unit ID', type: 'rooms' },
    //area: { name: 'Area (SQM)', type: 'label' },
    //lease: { name: 'Lease Period', type: 'label' },
    // contract: { name: 'Contract No.', type: 'label' }
}

var tenantRoomsMetaEdit = {
    tname: { name: 'Name', type: 'profiledatalist', options: [], placeholder: '' },
    unitid: { name: 'Unit ID', type: 'roomassign' },
    area: { name: 'Area (SQM)', type: 'label' },
    lease: { name: 'Lease Period', type: 'daterangepicker' },
    contract: { name: 'Contract No.', type: 'textbox' }
}

// metadata for tenant profile info in modal panel
var tenantMeta = {
    tname: { name: 'Name', type: 'label' },
    contactname: { name: 'Contact', type: 'label' },
    contactphone: { name: 'Phone', type: 'label' },
    contactemail: { name: 'Email', type: 'label' },
    notes: { name: 'Notes', type: 'label' },
}

var tenantMetaEdit = {
    tname: { name: 'Name', type: 'textbox' },
    contactname: { name: 'Contact', type: 'textbox' },
    contactphone: { name: 'Phone', type: 'textbox' },
    contactemail: { name: 'Email', type: 'textbox' },
    notes: { name: 'Notes', type: 'textbox' },
}

function initSceneMode() {

    PROJECT.viewermode = viewerModes[PROJECTS[PROJECT.id].mode];
    PROJECT.role = viewerRoles[PROJECTS[PROJECT.id].role];
    PROJECT.canCreate = PROJECT.role === viewerRoles.pm;
    PROJECT.canEdit = PROJECT.role === viewerRoles.editor;
    PROJECT.canView = PROJECT.role === viewerRoles.viewer;

    if (PROJECT.canView) {
        // will remove mep and fs objects from scene
        PROJECT.filter = ['arch', 'str', 'rooms'];
    }

    console.log('[INFO] user can create', PROJECT.canCreate);
    console.log('[INFO] user can edit', PROJECT.canEdit);
    console.log('[INFO] user can view', PROJECT.canView);

    if (PROJECT.filter) {
        console.log('[INFO] filter', PROJECT.filter);
    }

    _currentLevelFullName = PROJECT.title + (PROJECT.levelid ? ' - ' + PROJECT.levelid : '');
    // next will be overwritten when loading tenant rooms data
    _currentLevelModel.UUID = PROJECT.levelid ? PROJECT.levelid : PROJECT.id;
    _currentLevelModel.ParentUUID = PROJECT.levelid ? PROJECT.id : '';
    _currentLevelModel.DisplayName = PROJECT.leveltitle ? PROJECT.leveltitle : PROJECT.title;

    PROJECT.revitToFacilityId = {};
    PROJECT.facilityToRevitId = {};
    PROJECT.roomIdToRevitId = {}; //only way out after replacing revit_id by room id in storage
    PROJECT.RevitIdToRoomId = {}; //only way out after replacing revit_id by room id in storage

    // load prop filters, then load models
    loadObjectPropertiesFilter();
}

// +++++++++++++++++++++++++++++
// INIT stuff
// +++++++++++++++++++++++++++++
function onLoadFinished() {

    // by default turn off
    hideAllRooms();

    // call zoom extens to get proper initial camera
    zoomExtents();
    //// set camera reset info
    //VA3C.controls.target0 = VA3C.controls.target.clone();
    //VA3C.controls.position0 = VA3C.controls.object.position.clone();
    //VA3C.controls.up0 = VA3C.controls.object.up.clone();

    if (__CREATESCENETREE) {
        createSceneTree(jsonscenegraph);
    }

    createAnnotations();

    // show navbar items
    showMenuItems();

    $('#progressBarHolder').hide();

    // apply default filter from checkboxes
    // give some delay (Azure seems to have a problem..)
    //setTimeout(handleFilterViewChange, 1000);
    // set default view filter to all
    // must match the levels tree!
    setDefaultViewFilter();

    applyViewFilter(_currentFilterKeys);

    // populate tenants editor
    getTenantRoomsDataForLevel();

    forceRender();
}

var CATCOL = 0;
var NAMECOL = 1;
var PROPCOL = 2;
var DISPNAMECOL = 3;
var UNITCOL = 4;
var LOCALECOL = 5;
var LASTCOL = LOCALECOL;

function parseObjectPropertyFilters(result) {

    if (!result || result === '') {
        return false;
    }

    var rows;
    if (result.indexOf('\t') !== -1) {
        var data = result.split(/\r?\n/);
        rows = [];
        for (var i = 0; i < data.length; i++) {
            rows.push(data[i].split('\t', -1)); // -1 means keep empty entries
        }
    }
    else {
        rows = JSON.parse(result);
    }

    if (Array.isArray(rows) === false) {
        return false;
    }

    var propfilters = {};
    var curcat;
    var curname;
    for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        if (!row) continue;
        if (Array.isArray(row) === false) continue;
        if (row.length < LASTCOL + 1) continue;
        for (var j = 0; j < row.length; j++) {
            if (j > CATCOL) {
                if (!curcat) continue;
                if (j > NAMECOL) {
                    if (!curname) continue;
                }
            }

            var val = row[j].trim();
            val = val || '';

            switch (j) {
                case CATCOL:
                    if (val !== '') {
                        // validate new cat name (1st row will be skipped)
                        curcat = null;
                        for (var f in viewfilter) {
                            if (val === viewfilter[f].title) {
                                curcat = viewfilter[f].key;
                                propfilters[curcat] = {};
                            }
                        }
                    }
                    break;
                case NAMECOL:
                    if (val !== '') {
                        curname = val;
                        propfilters[curcat][curname] = {};
                        propfilters[curcat][curname].props = [];
                        propfilters[curcat][curname].displaynames = [];
                        propfilters[curcat][curname].units = [];
                    }
                    break;
                case PROPCOL:
                    // also add empty vals
                    propfilters[curcat][curname].props.push(val);
                    break;
                case DISPNAMECOL:
                    // also add empty vals
                    propfilters[curcat][curname].displaynames.push(val);
                    break;
                case UNITCOL:
                    // also add empty vals
                    propfilters[curcat][curname].units.push(val);
                    break;
                case LOCALECOL:
                    // locale key mapping
                    if (!userDataLocaleKeyMap) userDataLocaleKeyMap = {};
                    if (val !== '' && propfilters[curcat][curname].props.length > 0) {
                        var prop = propfilters[curcat][curname].props[propfilters[curcat][curname].props.length - 1];
                        if (prop !== '') {
                            userDataLocaleKeyMap[prop] = val;
                        }
                    }
                    break;
            }
        }
    }

    // fix wildcard name
    for (var pcat in propfilters) {
        for (var pname in propfilters[pcat]) {
            if (pname == '*') {
                propfilters[pcat][''] = propfilters[pcat][pname];
                delete propfilters[pcat][pname];
            }
        }
    }

    userDataFilters = propfilters;

    console.log('[INFO] object properties filter loaded');

    return true;
}

function initUIMode() {

    var datePickerFormat = { dateFormat: 'yy-mm-dd' };
    $.datepicker.setDefaults(datePickerFormat);

    $('#infoholder').hide();

    // FM
    getRevitToFacilityIdMap();

    if (PROJECT.canEdit) {
        document.getElementById('fm_search_val').placeholder = 'Search by tenant, FM ID or Revit ID';
    }
    else {
        document.getElementById('fm_search_val').placeholder = 'Search by tenant';
    }

    // FM search
    $("#fm_search_val")
        .bind('input', function () {
            // search while typing
            var searchtxt = ($(this).val() || '').trim();
            if (searchtxt === '' || searchtxt === _MSG_NOMATCH) {
                $('#fm_search_fb').html('&nbsp;');
                return;
            }
            // only when we have a match
            if (_tenantsNameMap && _tenantsNameMap.hasOwnProperty(searchtxt)) {
                getTenantRoomsModelsByName(searchtxt);
            }
            else if (PROJECT.facilityToRevitId && PROJECT.facilityToRevitId.hasOwnProperty(searchtxt)) {
                searchFMInfo(searchtxt);
            }
        })
        .autocomplete({
            minLength: 0, // so it shows straight away without typing anything
            source: function (request, response) {
                // you can change source '_tenantNames' dynamically here to another array
                response(filterSearchOptionsList(_tenantNames, request.term));
            },
            select: function (event, option) {
                $(this).val(option.item.value);
                $("#fm_search_button").click();
            }
        })
        .on('focus', function () {
            $(this).autocomplete('search', '');
        });

    $("#fm_search_button").click(function (e) {
        e.preventDefault();
        var searchtxt = ($("#fm_search_val").val() || '').trim();
        if (searchtxt === '' || searchtxt === _MSG_NOMATCH) {
            $('#fm_search_fb').html('&nbsp;');
            return;
        }
        searchFMInfo(searchtxt);
        //$("#fm_search_val").select();
        //$("#fm_search_val").focus();
    });

    // save
    $('#fm_objectinfo_save_btn').click(function (e) {
        e.preventDefault();
        saveObjectFMInfo();
    });
    $('#fm_tenantinfo_save_btn').click(function (e) {
        e.preventDefault();
        saveTenantFMInfo();
    });

    // export
    $('#fm_export').click(function (e) {
        e.preventDefault();
        exportFMInfo();
    });

    $('#tenant_export').click(function (e) {
        e.preventDefault();
        exportTenantInfo();
    });

    $('#fm_search_result_object_fmid').keypress(function (e) {
        if (e.which === 13)
            e.target.blur();
    });
    // FM end

    //// top menu items
    //if (PROJECT.canEdit) {
    //    $("#menutenantseditor").click(function (e) {
    //        e.preventDefault();
    //        $(this).blur();
    //        showTenantsEditor();
    //    });
    //    $("#menuscenetree").click(function (e) {
    //        e.preventDefault();
    //        $(this).blur();
    //        showSceneTree();
    //    });

    //}
}

function showHints() {
    // right menu is open when search in url 
    if ($("#btnRightMenu").hasClass('rightopen')) {
        return;
    }

    if (!getCookie('DidHintsToday')) {
        setCookie('DidHintsToday', "1", 1);
        $('<span class="tt ttl">Click here to open the side panel</span>' +
            '<span class="tt ttr">Click here to open the side panel</span>' +
            '<span class="tt tttop">Move mouse to top to open the menu bar</span>')
            .appendTo($('#maincontainer'));

        $(".tt").fadeTo(500, 1, function () {
            setTimeout(fadOutHints, 3000, $(".ttl"));
            setTimeout(fadOutHints, 3000, $(".ttr"));
            setTimeout(fadOutHints, 5000, $(".tttop"));
        });
    }
}

function filterSearchOptionsList(array, searchTerm) {
    var matchingItems = [];
    for (var i = 0; i < array.length; i++) {
        // case insensitive
        if (array[i].toLocaleLowerCase().indexOf(searchTerm.toLocaleLowerCase()) >= 0) {
            matchingItems.push(array[i]);
        }
    }
    if (matchingItems.length === 0) {
        return [_MSG_NOMATCH];
    }
    return matchingItems;
};

function canToggleLeftMenu() {
    // not during room assignment
    return _isAssigningRooms == false;
}

function showObjectUserDataByRevitId(revit_id) {

    if (!revit_id) {
        //$('#objectpropertiesholder').hide();
        $('#objectproperties').html(_HTML_NOTHINGSELECTED);
        return;
    }
    var object = getObjectByRevitId(revit_id);
    if (!object) {
        //$('#objectpropertiesholder').hide();
        $('#objectproperties').html(_HTML_NOTHINGSELECTED);
        return;
    }

    showObjectUserData(object);
}


function showObjectUserData(object) {

    if (PROJECT.canEdit) {
        console.log('+++++++++++++++++++++++++++++++')
        console.log('UNUSED USERDATA FOR', object.name)
        console.log(object.userDataNotUsed);
        console.log('+++++++++++++++++++++++++++++++')
    }

    if (PROJECT.canEdit) {
        $('#objectproperties').jqPropertyGrid(getObjectDisplayUserData(object), {
            revit_id: { name: 'Revit ID', type: 'label' } //meta
        });
    }
    else {
        $('#objectproperties').jqPropertyGrid(getObjectDisplayUserData(object), {
            revit_id: { name: 'Revit ID', type: 'hidden' } //meta
        });
    }

    // get data from object via
    //var modifiedjson = $('#objectproperties').jqPropertyGrid('get');

    $('#objectpropertiesholder').show();
}

// because userData['Name'] of rooms is used as ID for storage we cannot override it when chaning FM ID for it
// therefore do this
function getObjectDisplayUserData(object) {
    if (!object) return {};
    if (!object.userData) return {};
    if (!isRoomObject(object)) return object.userData;
    // check if differs
    var displayname = getRoomDisplayName(object);
    if (displayname === object.userData['Name']) {
        if (PROJECT.canEdit) return object.userData;
    }

    // name differs
    // clone
    if (PROJECT.canEdit) {
        var userData = {};
        $.extend(userData, object.userData);
        userData['Name'] = displayname;
        return userData;
    }

    // special treatment for GP

    if (isPublicRoom(object)) {
        var userData = {};
        userData['Unit ID'] = displayname;
        userData[_UI_PUBLICFACILITY] = "Yes";
        //$.extend(userData, object.userData);
        // no area for GP
        //deleteUserDataProp(userData, 'Area');
        //userData['Name'] = displayname;
        return userData;
    }

    // non-public room for GP
    var userData = {};

    var revit_id = getObjectRevitId(object);
    var model = _roomsInUseMap[revit_id];
    if (!model) {
        userData['Company'] = _MSG_NOTENANT;
        userData['Unit ID'] = displayname;
        //$.extend(userData, object.userData);
        //deleteUserDataProp(userData, 'Name');
        //deleteUserDataProp(userData, 'Area');
        return userData;
    }

    userData['Company'] = model.Tenant.DisplayName;
    var roomsinfo = getTenantRoomsInfo(model);
    userData['Units'] = roomsinfo[0];
    //$.extend(userData, object.userData);
    //deleteUserDataProp(userData, 'Name');
    //deleteUserDataProp(userData, 'Area');
    return userData;
}

function showObjectData(object) {

    showObjectUserData(object);
    showFMInfo(object);
}

function hideHTMLProperties() {
    //$('#objectpropertiesholder').hide();
    $('#objectproperties').html(_HTML_NOTHINGSELECTED);

    hideFMInfo();
}


// returns false if not valid, returns filter keyword if valid
function filterObject(object, modeldata) {

    if (!object.userData) {
        console.log('[WARNING] object does not have userData:', object);
        return false;
    }

    var revit_id = getObjectRevitId(object);
    if (!revit_id) {
        console.log('[WARNING] object does not have revit_id:', object);
        //return false;
    }

    var objectname = object.name;

    var filter = null;
    for (var f in viewfilter) {

        for (var k = 0; k < viewfilter[f].namekeys.length; k++) {

            var nameFilterKey = viewfilter[f].namekeys[k];

            //// TODO if needed
            //// if name key starts with 'U:' check the user data, otherwise check objct name
            //if (nameFilterKey.indexOf('U:') == 0) {
            //    nameFilterKey = nameFilterKey.slice(0, 2);
            //}

            if (objectname.indexOf(nameFilterKey) == -1) {
                continue;
            }

            createInstancedObject(object);

            if (!object.children || object.children.length == 0) {
                return false;
            }

            if (PROJECT.filter) {
                if (PROJECT.filter.indexOf(viewfilter[f].key) === -1) {
                    return false;
                }
            }

            if (modeldata.exclude) {
                if (modeldata.exclude.indexOf(viewfilter[f].key) !== -1) {
                    return false;
                }
            }

            if (viewfilter[f].key === viewfilter.rooms.key) {
                // only allow rooms with number
                // room is not yet added to nodes so use getNiceObjectName not getRoomId!
                if (!object.runtimeInfo) object.runtimeInfo = {};
                var roomid = getNiceObjectName(object);
                if (validateRoomNameIsPublic(object)) {
                    object.runtimeInfo['publicroom'] = true;
                    console.log('[INFO] public room', roomid);
                }

                // hold roomid like this
                PROJECT.roomIdToRevitId[roomid] = revit_id;
                PROJECT.RevitIdToRoomId[revit_id] = roomid;
            }

            if (!viewfilter[f].nodes) viewfilter[f].nodes = [];

            viewfilter[f].nodes.push(object);
            filter = f;

            break;
        }
        // no need to check other filters
        if (filter) break;
    }

    if (!filter) {
        if (PROJECT.debug) {
            console.warn('view filter not assigned for:', objectname);
        }
        return false;
    }

    if (!modeldata.isclone) {
        filterObjectUserData(object, filter);
    }

    return viewfilter[filter].key;
}

// filter userdata
function filterObjectUserData(object, filter) {
    var propcnt = 0; //for feedback
    var userData = {};
    var userDataUsed = {};
    // clone
    $.extend(userData, object.userData);

    // SAMEX
    if (userData.hasOwnProperty('资产编号')) {
        //console.log('资产编号', userData['资产编号']);
        userDataUsed['资产编号'] = userData['资产编号'];
    }

    // for rooms add extra field; changes when it gets FM ID
    //if (viewfilter[filter].key === viewfilter.rooms.key) {
    //    userDataUsed['Unit ID'] = getNiceObjectName(object);
    //}

    // always Name
    userDataUsed['Name'] = getNiceObjectName(object);

    // rooms
    if (viewfilter[filter].key === viewfilter.rooms.key) {
        // public room info
        if (isPublicRoom(object)) {
            userDataUsed[_UI_PUBLICFACILITY] = "Yes";
        }
        // fix volume inside userData (not userDataUsed > this is updated below)
        var area = parseFloat(getUserDataProp(userData, 'Area'));
        var height = parseFloat(getUserDataProp(userData, 'Unbounded Height'));
        var vol = parseFloat(getUserDataProp(userData, 'Volume'));
        if (isNaN(vol) || feqz(vol)) {
            if (isNaN(height) == false && isNaN(area) == false) {
                userData['Volume'] = Math.round(height * 0.001 * area * 100) / 100;
            }
            else {
                userData['Volume'] = '- unknown -';
            }
        }
    }

    var objectname = object.name;
    for (var namefilter in userDataFilters[filter]) {
        if (objectname.indexOf(namefilter) === -1) continue;
        var nf = userDataFilters[filter][namefilter];
        for (var i = 0; i < nf.props.length; i++) {
            var prop = nf.props[i];
            var val = getUserDataProp(userData, prop);
            if (!val) continue;
            var dname = nf.displaynames[i] === '' ? prop : nf.displaynames[i];
            if (userDataUsed.hasOwnProperty(dname)) continue; //already set; probably chinese equivalent
            var unit = nf.units[i];
            userDataUsed[dname] = val + ' ' + unit;
            // delete from userData for easy debugging
            deleteUserDataProp(userData, prop);
            propcnt++;
        }
    }

    // always revit_id
    userDataUsed['revit_id'] = getObjectRevitId(object);


    // overwrite original userdata
    object.userData = userDataUsed;

    if (PROJECT.canEdit) {
        // keep unused data for debugging
        object.userDataNotUsed = userData;
        if (PROJECT.debug) {
            if (propcnt === 0) { //always has revit_id and name
                console.warn('[FILTER] No matching userData found for', object.name, object.userDataNotUsed);
            }
        }
    }
}


function setRoomMaterial(object, material, final, forcenew) {
    if (!object) return;

    // avoid unnecessary updates
    if (final && !forcenew && !object.runtimeInfo.lastmaterial) return;

    if (!material) {
        resetRoomMaterial(object);
        return;
    }

    for (var n = 0; n < object.children.length; n++) {
        var child = object.children[n];

        if (!child.material) {
            console.error('no material for', object);
        }

        if (!object.runtimeInfo.origmaterial) {
            // for restore
            object.runtimeInfo.origmaterial = child.material;
        }

        if (!final && !object.runtimeInfo.lastmaterial) {
            // for restore
            object.runtimeInfo.lastmaterial = child.material;
        }

        child.material = material;
    }

    // final: last material is current material
    if (final) {
        delete object.runtimeInfo.lastmaterial;
    }

    if (feq(material.opacity, PROJECT.canEdit ? _defaultRoomOpacity : _defaultRoomOpacityViewOnly) == false) {
        // restore original label color
        updateAnnotationColor(object.id);
    }
    else {
        updateAnnotationColor(object.id, getForeColor(material.color), getRGB(material.color));
    }

}

function restoreRoomMaterials() {

    if (!_activeRoomObjects) return;

    for (var i in _activeRoomObjects) {
        restoreLastMaterial(_activeRoomObjects[i]);
    }

    _activeRoomObjects = null;
}

function restoreLastMaterial(object) {
    // restore color
    setRoomMaterial(object, object.runtimeInfo.lastmaterial, true, true);
}

function resetRoomMaterial(object) {
    if (!object) return;
    // reset color
    setRoomMaterial(object, object.runtimeInfo.origmaterial || _defaultRoomMaterial, true, true);
}


// level tree

function applyViewFilter(filterkeys) {

    clearLastObject();

    if (_currentFilterKeys === [viewfilter.rooms.key] && _isAssigningRooms) {
        // while selecting rooms cannot change filter
        return false;
    }

    var forceOnFilterKeys = [];

    if (filterkeys && filterkeys.length > 0) {
        forceOnFilterKeys = filterkeys.slice();
        if (forceOnFilterKeys.indexOf(viewfilter.arch.key) !== -1 ||
            forceOnFilterKeys.indexOf(viewfilter.str.key) !== -1) {
            makeBuildingOpaque();
        }
        else if (forceOnFilterKeys.indexOf(viewfilter.mep.key) !== -1 ||
                    forceOnFilterKeys.indexOf(viewfilter.fs.key) !== -1 ||
                    forceOnFilterKeys.indexOf(viewfilter.rooms.key) !== -1) {
            // we have mep and/or fs and/or rooms but no arch+str: make building transp
            forceOnFilterKeys.push.apply(forceOnFilterKeys, makeBuildingTransparent());
        }
    }
    else {
        // empty/null: show nothing
    }

    for (var f in viewfilter) {
        if (!viewfilter[f].nodes) continue;
        var forceVisible = forceOnFilterKeys.indexOf(viewfilter[f].key) !== -1;
        var state = (filterkeys && filterkeys.indexOf(viewfilter[f].key) !== -1);
        for (var i = 0; i < viewfilter[f].nodes.length; i++) {
            viewfilter[f].nodes[i].visible = state || forceVisible;
        }

        // update tree
        //if (!state) hideTreeNodeByKey(f);
        //else showNodeByKey(f);
    }

    _currentFilterKeys = filterkeys;

    //console.log(_currentFilterKeys);

    forceRender();

    return true;
}

function onLevelNodeSelected(data) {
    if (data.node.isFolder()) return;
    handleFilterViewChange();
}

function onLevelNodeDeselected(data) {
    if (data.node.isFolder()) return;
    handleFilterViewChange();
}

function onLevelNodeActivated(data) {
    // data.tree is tree
    //console.log('activate');
    if (data.node.isFolder()) {
        if (data.node.key !== _currentLevelModel.UUID) {
            openLevelProject(data.node.title); //, '/Home/Index/?uuid=' + data.node.key);
        }
    }
    else {
        handleFilterViewChange();
    }
}

function openLevelProject(modelname, searchval) {

    if (modelname === PROJECT.levelid) return;

    if (confirm('Open level ' + modelname + ' ?')) {
        var url = '//' + location.host + location.pathname + '?projectid=' + PROJECT.id + '&levelid=' + modelname;
        if (searchval) {
            url = url + '&search=' + encodeURIComponent(escapeAttributeValue(searchval));
        }
        window.location.href = url;
    }
}

function setViewFilter() {
    _currentFilterKeys = [];
    if (!levelstree) {
        // when tree is not ready assume all viewfilter checkboxes are checked
        setDefaultViewFilter();
    }
    else {
        var selNodes = levelstree.getSelectedNodes();
        for (var i in selNodes) {
            _currentFilterKeys.push(selNodes[i].data.filterkey);
        }
    }
}

function setDefaultViewFilter() {
    if (PROJECT.canEdit && PROJECT.filter) {
        console.log('[INFO] filter keys:', PROJECT.filter);
        _currentFilterKeys = PROJECT.filter.slice();
        return;
    }

    _currentFilterKeys = [];
    if (PROJECT.canEdit) {
        for (f in viewfilter) {
            _currentFilterKeys.push(viewfilter[f].key);
        }
    }
    else {
        //_currentFilterKeys.push(viewfilter.fs.key);
        _currentFilterKeys.push(viewfilter.rooms.key);
    }
}

function handleFilterViewChange() {
    setViewFilter();
    applyViewFilter(_currentFilterKeys);
}

function onLevelNodeDeactivated() {
    //console.log('deactivate');
}

function getLevelsNodesData() {
    var jsdata = [];
    for (var levelid in PROJECT.data.levels) {
        var level = PROJECT.data.levels[levelid];
        var active = levelid === PROJECT.levelid;
        jsdata.push({
            title: level.title || levelid,
            key: levelid,
            folder: true,
            hideCheckbox: true,
            //active: active,
            expanded: active,
            children: (active && PROJECT.canEdit) ? addViewFilterTreeNodes(levelid, PROJECT.data.levels[levelid].filter) : [],
        });
    }

    // sort by name
    //jsdata.sort(function (a, b) {
    //    return (a.title < b.title) ? -1 : ((a.title > b.title) ? 1 : 0);
    //});

    return jsdata;
}

function addViewFilterTreeNodes(uuid, filter) {
    var nodes = [];
    for (f in viewfilter) {
        if (!filter || filter.indexOf(viewfilter[f].key) !== -1) {
            nodes.push(addViewFilterTreeNode(viewfilter[f], uuid));
        }
    }

    return nodes;
}

function addViewFilterTreeNode(filter, uuid) {
    return {
        title: filter.title,
        key: filter.key + '@' + uuid,
        selected: true, //filter !== viewfilter.rooms,
        data: {
            filterkey: filter.key
        }
    };
}

function processLoadResult(result, modelname, modeldata) {
    // traverse loaded scene graph
    var toberemoved = [];
    var jsonscenegraph = [];
    var object3Dcount = 0;
    var matchFilterOnce = false;
    result.traverse(function (object) {
        if (object instanceof THREE.Camera) {
            toberemoved.push(object);
            console.log('[INFO] loaded scene had a camera')
        }
        else if (object instanceof THREE.Light) {
            toberemoved.push(object);
            console.log('[INFO] loaded scene had a light')
        }
        else if (object instanceof THREE.Mesh) {
            if (object.geometry.mergeVertices) object.geometry.mergeVertices();
            if (object.geometry.computeFaceNormals) object.geometry.computeFaceNormals();
            //object.geometry.computeBoundingBox();
            object.castShadow = !!PROJECT.sun;
            object.receiveShadow = !!PROJECT.sun;
            VA3C.sceneMeshes.push(object);
        }
        else if (object instanceof THREE.LOD) {
            // nothing
        }
        else if (object instanceof THREE.Object3D) {

            if (object.parent != null) {
                // CHILD NODE
                object3Dcount++;
                var filterkey = filterObject(object, modeldata);
                if (!filterkey) {
                    toberemoved.push(object);
                }
                else {
                    matchFilterOnce = true;
                    // add to revit_id > object ID map
                    addToRevitIdObject3dMap(object);
                    // auto assign facility_id for special objects (rooms)
                    autoAddToRevitIdFmMap(object, filterkey);
                    // tree
                    if (__CREATESCENETREE) {
                        jsonscenegraph.push({ text: getNiceObjectName(object), id: object.id, parent: filterkey });
                    }
                    // statistics
                    VA3C.objectCount++;
                }
            }
            else {
                // ROOT/SCENE NODE
                if (__CREATESCENETREE) {
                    var n = getNiceObjectName(object);
                    if (n == '') n = modelname;
                    else scenename = n;
                    jsonscenegraph.push({ text: n, id: object.id, folder: true, expanded: true });
                    // add tree nodes representing disciplines (arch etc)
                    for (var f in viewfilter) {
                        jsonscenegraph.push({ text: viewfilter[f].title, id: viewfilter[f].key, folder: true, expanded: false, parent: object.id });
                    }
                }
            }
        }
    });

    if (matchFilterOnce) {
        if (object3Dcount == toberemoved.length) {
            // we have a model without valid objects
            // can be model without userdata and/or revit id
            // for debugging, keep entire scene
            console.warn('[WARNING] model does not have objects with userData and/or revit_id; showing entire model nevertheless')
        }
        else {
            // removing unwanted objects in reverse
            for (var ii = toberemoved.length - 1; ii >= 0; ii--) {
                result.remove(toberemoved[ii]);
                //console.log('[INFO] removed object:', toberemoved[ii]);
            }
            console.log('[INFO] # invalid objects that have been removed: ', toberemoved.length);
        }
    }
}


function getInfoObject(object) {
    if ($.isEmptyObject(object.userData)) {
        // no user data; maybe root?
        console.log('[showObjectInfo] WARNING: no user data found for object', object)
        if ($('#checkautopan').is(":checked")) {
            zoomToObject(object);
        }
        clearLastObject();
        return null;
    }

    return object;

}

// room id, userData[Name] or object.name
function getNiceObjectName(object) {

    if (!object) return '';


    if (isRoomObject(object)) {
        return getRoomDisplayName(object);
    }
    var name = getObjectUserDataProperty(object, 'Name', true);
    if (name) return name;
    return object.name;
}

function getObjectByFacilityId(facility_id) {
    var revit_id = PROJECT.facilityToRevitId[facility_id];
    return getObjectById(PROJECT.revitToObjectId[revit_id]);
}

// SAMEX
function ZoomToFMID(facility_id) {
    var object = getObjectByFacilityId(facility_id);
    if (object) showObjectInfo(object);
    else alert('No object not found with FM ID ' + facility_id);
}

function validateRoomNameIsPublic(object) {
    var roomid = getNiceObjectName(object);
    if (isNaN(parseInt(roomid)) === false) return false;

    // room name exceptions: B05 etc
    if (roomid.charAt(0) === 'B') {
        if (isNaN(parseInt(roomid.substr(1))) === false) return false;
    }

    return true;
}

function makeBuildingTransparent() {
    clearLastObject();

    // filter keys that must be forced visible
    forceOnFilterKeys = [];

    if (viewfilter.arch.nodes) {
        for (var i = 0; i < viewfilter.arch.nodes.length; i++) {
            makeTransparent(viewfilter.arch.nodes[i]);
        }
        forceOnFilterKeys.push(viewfilter.arch.key);
    }
    if (viewfilter.str.nodes) {
        for (var i = 0; i < viewfilter.str.nodes.length; i++) {
            makeTransparent(viewfilter.str.nodes[i]);
        }
        forceOnFilterKeys.push(viewfilter.str.key);
    }

    return forceOnFilterKeys;
}

function makeBuildingOpaque() {
    clearLastObject();
    if (viewfilter.arch.nodes) {
        for (var i = 0; i < viewfilter.arch.nodes.length; i++) {
            makeOpaque(viewfilter.arch.nodes[i]);
        }
    }
    if (viewfilter.str.nodes) {
        for (var i = 0; i < viewfilter.str.nodes.length; i++) {
            makeOpaque(viewfilter.str.nodes[i]);
        }
    }
}

function isRoomObject(object) {
    if (!object) return false;
    if (!viewfilter.rooms.nodes) return false;
    return viewfilter.rooms.nodes.indexOf(object) != -1;
}

function isPublicRoom(object) {
    if (!object) return false;
    return object.runtimeInfo && object.runtimeInfo.hasOwnProperty('publicroom');
}

function clickHandler(event) {
    event.preventDefault();

    //console.log('click at', event, 'for', VA3C.canvasSize);

    var vector = new THREE.Vector3(((event.clientX - VA3C.canvasSize.left) / VA3C.canvasSize.width) * 2 - 1, -((event.clientY - VA3C.canvasSize.top) / VA3C.canvasSize.height) * 2 + 1, 0.5);
    vector.unproject(VA3C.camera);
    var raycaster = new THREE.Raycaster(VA3C.camera.position, vector.sub(VA3C.camera.position).normalize());
    var intersects;

    console.log('pick with filter', _currentFilterKeys);

    if (_currentFilterKeys) {
        var allowRooms = viewfilter.rooms.nodes && (_currentFilterKeys.indexOf(viewfilter.rooms.key) != -1);
        if (allowRooms && _isAssigningRooms) {
            // pick rooms only; other non-room objects are visible but should not be picked
            intersects = raycaster.intersectObjects(VA3C.sceneMeshes.filter(function (mesh) {
                // must be child of room node
                return isRoomObject(mesh.parent);
            }));
        }
        else {
            intersects = raycaster.intersectObjects(VA3C.sceneMeshes.filter(function (mesh) {
                // accept when visible or invisible room when isroom and not greyed out
                return (mesh.parent.visible || allowRooms && viewfilter.rooms.nodes.indexOf(mesh.parent) != -1) && !isGreyedOut(mesh); // must be visible and not greyed out
            }));
        }
    }
    else {
        // no filter: all on
        intersects = raycaster.intersectObjects(VA3C.sceneMeshes);
    }

    if (intersects.length > 0) {
        // find parent of picked leaf that has user data
        var j = 0;
        while (j < intersects.length) {
            if ($.isEmptyObject(intersects[j].object.parent.userData) == false) {
                if (_isAssigningRooms) {
                    addTenantRoom(intersects[j].object.parent);
                }
                else {
                    showObjectInfo(intersects[j].object.parent);
                }
                return;
            }
            j++;
        }
    }

    // nothing picked
    onNothingPicked();
}

function onNothingPicked() {
    if (!_isAssigningRooms) {
        clearLastObject();
    }
    else {
        onAssignRoomsNothingPicked();
    }
}

function createAnnotations() {
    var nodes = viewfilter.rooms.nodes; // ? viewfilter.rooms.nodes : viewfilter.arch.nodes;
    if (!nodes) return;
    if (!nodes.length) return;

    var annholder = document.getElementById("annholder");
    if (!annholder) return;

    VA3C.objectannotations = [];
    var offset = v(0, 0, 0);

    $.each(nodes, function (i, object) {

        // set the default color
        object.runtimeInfo.origmaterial = _defaultRoomMaterial;
        setRoomMaterial(object, _defaultRoomMaterial, true, true);

        var objectbox = new THREE.Box3().setFromObject(object);
        var loddist = objectbox.size().length() * 4;
        var position = new THREE.Vector3();
        position = objectbox.center().clone();
        var anntext = getNiceObjectName(object);
        var anndiv = makeAnnotationElement('ann' + object.id, anntext, annholder, object.runtimeInfo.hasOwnProperty('publicroom'));
        if (anndiv) {
            VA3C.objectannotations[object.id] = {
                id: object.id, //THREE id
                element: anndiv,
                position: position,
                loddist: loddist,
                offset: offset
            };
        }
        else {
            console.error('[Error] failed to create annotation element');
        }
    });
}

function processAnnotations() {
    if (!VA3C.objectannotations) return;
    //$.each(VA3C.objectannotations, function (i, anndata) {
    for (var id in VA3C.objectannotations) {
        var anndata = VA3C.objectannotations[id];
        if (_currentFilterKeys.indexOf(viewfilter.rooms.key) == -1) {
            anndata.element.style.visibility = 'hidden';
            continue;
        }
        if (anndata.element.style.display !== '') continue; //forced hidden
        var screenpos = filterAnnotation(anndata.position, anndata.loddist);
        if (screenpos) {
            anndata.element.style.left = (screenpos.x - (anndata.element.offsetWidth / 2)) + 'px';
            anndata.element.style.top = (screenpos.y - (anndata.element.offsetHeight / 2)) + 'px';
            anndata.element.style.visibility = 'visible';
        }
        else {
            anndata.element.style.visibility = 'hidden';
        }
    };
}

// ann html template

var _annotationHTML = '<div class="annotext" style="visibility: hidden;" id="ann$ANNID"><p>$ANNTEXT</p></div>';

function makeAnnotationElement(id, text, annholder, isgrey) {
    var fragment = createElementFromFragment(_annotationHTML.replace('$ANNID', id).replace('$ANNTEXT', text));
    annholder.appendChild(fragment);
    //return fragment.querySelector('#' + id); --> no result
    var element = document.getElementById('ann' + id);
    if (isgrey) {
        element.style.color = 'black';
        element.style.backgroundColor = 'white';
    }
    return element;
}

function createElementFromFragment(htmlStr) {
    var frag = document.createDocumentFragment(),
        temp = document.createElement('div');
    temp.innerHTML = htmlStr;
    while (temp.firstChild) {
        frag.appendChild(temp.firstChild);
    }
    return frag;
}
