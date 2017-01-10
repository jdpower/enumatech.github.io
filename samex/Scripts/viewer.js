var PROJECT;
var fullprojectname;

var viewerModes = {
    generic: 1,
}

var viewerRoles = {
    generic: 1,
}

var LEVEL_TOKEN = '<L>';
var _searchValStart;

// holds viewer UI specific functions
var levelstree;
var modeltree;
var panelSceneTree;

// top menu bar
var timeout = null;
var initialMargin;

// map for locale/chinese userdata keys
var userDataLocaleKeyMap = {};

$(document).ready(function () {

    if (!Detector.webgl) {
        $('#maincontainer').html('<div style="text-align:center; color: red">This browser does not support WebGL. Please download Chrome.</div>');
        return;
    }

    $(window).hashchange( function(e) {
        console.log("Zooming to object "+location.hash);
        ZoomToFMID(location.hash.substr(1));
    });

    $('#fullscreentoggle').click();

    PROJECT = null;

    // 'var PROJECTS' is set in projects.js
    if (!PROJECTS) {
        console.error('[ERROR] no projects defined.');
        alert('[ERROR] no projects defined.');
        return;
    }

    //createProjectList();

    var project;
    var projectID = getUrlVars()['projectid'];
    if (projectID && projectID !== '') {
        if (PROJECTS.hasOwnProperty(projectID) == false) {
            console.error('[ERROR] no project data found for ' + projectID);
            alert('[ERROR] no project data found for ' + projectID);
            return;
        }

        var levelID = getUrlVars()['levelid'];

        _searchValStart = decodeURIComponent(getUrlVars()['search'] || '');

        startProject(projectID, levelID);
    }
    else {
        showProjectSelector();
    }
});

//function createProjectList() {

//    var itemHolder = $('#projectList');
//    itemHolder.html('');

//    for (var projectid in PROJECTS) {
//        // next works without reload but memory increases
//        //var item = $('<div class="projectListItem" onclick="startProject(\'' + projectid + '\');">' + PROJECTS[projectid].title + '</div>').appendTo(itemHolder);
//        // with reload and arg
//        var item = $('<div id="ps_' + projectid + '" class="projectListItem" onclick="openProject(\'' + projectid + '\');">' + PROJECTS[projectid].title + '</div>').appendTo(itemHolder);
//    }
//}

//// reload with arg in url
//function openProject(projectID) {

//    if (PROJECT && PROJECT.id === projectID) return;

//    if (confirm('Open project ' + PROJECTS[projectID].title + ' ?')) {
//        window.location.href = '//' + location.host + location.pathname + '?projectid=' + projectID;
//    }
//}

function toggleFullScreen() {
    if (!document.fullscreenElement &&    // alternative standard method
        !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {  // current working methods
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
        } else if (document.documentElement.msRequestFullscreen) {
            document.documentElement.msRequestFullscreen();
        } else if (document.documentElement.mozRequestFullScreen) {
            document.documentElement.mozRequestFullScreen();
        } else if (document.documentElement.webkitRequestFullscreen) {
            document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
    }
}

function showProjectSelector() {

    var itemHolder = $('#projectSelector');
    itemHolder.html('');

    var menuitem;
    for (var projectID in PROJECTS) {
        menuitem = $('<div class="projectItem" onclick="selectProject($(this));">' + PROJECTS[projectID].title + '</div>')
            .appendTo(itemHolder)
            .data({ projectid: projectID });
    }

    if (menuitem && Object.keys(PROJECTS).length === 1 && PROJECTS[projectID].levels) {
        // auto-open levels menu
        menuitem.click();
    }

    $('#projectSelectorHolder').show();
}

function showLevelSelector($elm) {

    var projectID = $elm.data('projectid');

    if ($elm.children().length > 0) {
        $elm.html(PROJECTS[projectID].title);
        return;
    }

    var projectID = $elm.data('projectid');
    for (var i in PROJECTS[projectID].levels) {
        var levelID = PROJECTS[projectID].levels[i];
        var item = $('<div class="levelItem" onclick="selectProject($(this));">' + levelID + '</div>')
            .appendTo($elm)
            .data({ projectid: projectID, levelid: levelID });
    }
}

function selectProject($elm) {

    var projectID = $elm.data('projectid');
    var levelID = $elm.data('levelid');

    showUIBranding(projectID);

    if (!levelID && PROJECTS[projectID].levels) {
        showLevelSelector($elm);
    }
    else {
        startProject(projectID, levelID);
    }
}

function startProject(projectID, levelID) {

    $('#projectSelectorHolder').hide();

    showUIBranding(projectID);

    if (PROJECTS.hasOwnProperty(projectID) == false) {
        console.error('[ERROR] no project data found for ' + projectID);
        alert('[ERROR] no project data found for ' + projectID);
        return;
    }

    resetScene();

    var projectFile = PROJECTS[projectID].projectFile;
    if (!projectFile || projectFile === '') {
        alert('No project file defined for project ' + projectID);
        return;
    }

    PROJECT = {};
    PROJECT.levelid = levelID; //can be undefined
    PROJECT.id = projectID;
    PROJECT.title = PROJECTS[projectID].title;
    PROJECT.copyright = PROJECTS[projectID].copyright;
    PROJECT.datafolder = PROJECTS[projectID].dataFolder || '';
    // project wide data mapping; will add level/model specific mapping in onLoadProjectFileSuccess
    PROJECT.datamapping = PROJECTS[PROJECT.id].datamapping || {};

    // environment
    PROJECT.fog = PROJECTS[projectID].fog || false;
    PROJECT.plane = PROJECTS[projectID].plane || false;
    PROJECT.axes = PROJECTS[projectID].axes || false;
    PROJECT.skybox = PROJECTS[projectID].skybox || false;
    PROJECT.ao = PROJECTS[projectID].ao || false;
    PROJECT.sun = PROJECTS[projectID].sun;

    PROJECT.revitToObjectId = {};

    if (PROJECTS[projectID].includes) {
        var includeFiles = PROJECTS[projectID].includes.slice();
    }
    if (!includeFiles) includeFiles = [];

    // add project file as last resource
    includeFiles.push(projectFile);

    // load all resources, calls onLoadProjectFileSuccess when last resource (= project file) is loaded
    getLocalDatas(includeFiles, onLoadProjectFileSuccess);
}

function onLoadProjectFileSuccess(data, textStatus) {
    // 'projectData' is var inside projectFile
    if (!projectData) {
        console.error('[ERROR] no project data found for ' + projectID);
        alert('[ERROR] no project data found for ' + projectID);
        return;
    }

    // content of file PROJECTS[projectID].projectFile
    PROJECT.data = projectData;
    PROJECT.debug = PROJECT.data.debug;

    if (PROJECT.levelid) {

        if (!PROJECT.data.levels) {
            console.error('[ERROR] no levels defined in project');
            alert('[ERROR] no levels defined in project');
            return;
        }
        if (PROJECT.data.levels.hasOwnProperty(PROJECT.levelid) == false) {
            console.error('[ERROR] invalid level id', PROJECT.levelid);
            alert('[ERROR] invalid level id ' + PROJECT.levelid);
            return;
        }

        PROJECT.leveltitle = PROJECT.data.levels[PROJECT.levelid].title || PROJECT.levelid;
        PROJECT.modelcount = PROJECT.data.levels[PROJECT.levelid].models.length;
        PROJECT.filter = PROJECT.data.levels[PROJECT.levelid].filter;
        PROJECT.lod = PROJECT.data.levels[PROJECT.levelid].lod;
        $.extend(PROJECT.datamapping, PROJECT.data.levels[PROJECT.levelid].datamapping || {});
    }
    else if (!PROJECT.data.levels) {
        PROJECT.modelcount = PROJECT.data.models.length;
        PROJECT.filter = PROJECT.data.filter;
        PROJECT.lod = PROJECT.data.lod;
        $.extend(PROJECT.datamapping, PROJECT.data.datamapping || {});
    }
    else {
        console.log('[INFO] project with levels loaded but no current level specified: nothing loaded');
        showLevelSelector();
        return;
    }

    // holds each loaded model with url as key
    PROJECT.loadedmodels = {};

    // mode specific init
    initSceneMode();

    // for all modes
    createLevelsTree();
}

// +++++++++++++++++++++++++++++
// UI
// +++++++++++++++++++++++++++++

function initUI() {

    fullprojectname = PROJECT.title + (PROJECT.levelid ? ' - ' + PROJECT.levelid : '');

    $('#objectproperties').html(_HTML_NOTHINGSELECTED);
    $('#objectinfo').html(_HTML_NOTHINGSELECTED);

    document.title = fullprojectname + ' - EnumaVR Viewer';
    $('#ps_' + PROJECT.id).addClass('selected');

    $('#projecttitle').html(fullprojectname);

    if (PROJECT.copyright) {
        $('#footer').html($('#footer').html() + ' | ' + PROJECT.copyright);
    }

    $("#btnLeftMenu").click(function (e) {
        e.preventDefault();
        $(this).blur();
        hideHints();
        toggleLeftMenu();
    });

    $("#btnRightMenu").click(function (e) {
        e.preventDefault();
        $(this).blur();
        hideHints();
        toggleRightMenu();
    });

    // toggle panel content by click on title bar
    $('.sidepaneltitlebar').click(function (e) {
        e.preventDefault();
        $(this).siblings('.sidepanelcontent').toggle();
    });

    $("#progressLoadCancel").click(function (e) {
        e.preventDefault();
        cancelDownload();
    });

    updateAutoState(); //auto-pan/zoom state

    $('.autopanzoom').change(function () {
        updateAutoState();
    });

    $('#debugtoggle').change(function () {
        openDebugGUI();
    });

    initTopMenuBar();

    // mode specific init
    initUIMode();

}

function initTopMenuBar() {

    $("#siteMenuBar").css({ 'display': 'block', 'margin-top': '0px' });
    return;


    initialMargin = parseInt($("#siteMenuBar").css("margin-top"));

    $("#siteMenuBar").hover(
            function () {
                if (timeout) {
                    clearTimeout(timeout);
                    timeout = null;
                }
                $(this).animate({ marginTop: 0 }, 'fast');
            },
            function () {
                var menuBar = $(this);
                timeout = setTimeout(function () {
                    timeout = null;
                    menuBar.animate({ marginTop: initialMargin }, 'slow');
                }, 1000);
            }
        );

    $("#siteMenuBar").show();
}

function showUIBranding(projectID) {

    var branding = '';

    if (PROJECTS[projectID].branding) {
        branding = PROJECTS[projectID].branding;
    }

    if (PROJECTS[projectID].brandinglogo) {
        branding = branding + '<img src="' + PROJECTS[projectID].dataFolder + PROJECTS[projectID].brandinglogo + '" class="footerlogo">';
    }

    $('#footer span').remove();

    if (branding !== '') {
        $('#footer').html($('#footer').html() + '<span> | ' + branding + '</span>');
    }
}

function showMenuItems() {
    $("#btnLeftMenu").show();
    $("#btnRightMenu").show();
    $('#projecttitle').show();
    showHints();
}

function hideMenuItems() {
    $("#btnLeftMenu").hide();
    $("#btnRightMenu").hide();
    $('#projecttitle').hide();
}

function toggleLeftMenu() {

    if (!canToggleLeftMenu()) return;

    if ($("#btnRightMenu").hasClass('rightopen')) {
        toggleRightMenu();
    }
    $("#leftmenu").toggleClass('open');
    $("#canvasholder").toggleClass('leftopen');
    $("#btnLeftMenu").toggleClass('leftopen');
    if (VA3C) {
        updateCameraAspectRatio();
        forceRender();
    }
}

function toggleRightMenu() {
    if ($("#btnLeftMenu").hasClass('leftopen')) {
        toggleLeftMenu();
    }
    $("#rightmenu").toggleClass('open');
    $("#canvasholder").toggleClass('rightopen');
    $("#btnRightMenu").toggleClass('rightopen');
    if (VA3C) {
        updateCameraAspectRatio();
        forceRender();
    }
}

function updateAutoState() {
    //console.log('autostate');
    var autoPanChecked = $('#checkautopan').is(":checked");
    document.getElementById('checkautozoom').disabled = autoPanChecked === false;
    if (autoPanChecked && VA3C.lastObject3D) {
        zoomToObject(VA3C.lastObject3D);
    }
}

function createLevelsTree() {
    if (!PROJECT.data.levels) {
        $('#viewfilterholder').hide();
        $('#levelstree').html('');
        return;
    }

    var jsdata = getLevelsNodesData();

    if (levelstree) {
        // reload with new jsondata
        levelstree.reload(jsdata);
        return;
    }

    levelstree = $('#levelstree').fancytree({
        source: jsdata,
        // need these for auto focus / scrollintoview
        autoScroll: true,
        activeVisible: true,
        autoActivate: false,
        focusOnSelect: false,
        titlesTabbable: true,
        checkbox: true,
        selectMode: 2,
        select: function (event, data) {
            onLevelNodeSelected(data);
        },
        deselect: function (event, data) {
            onLevelNodeDeselected(data);
        },
        activate: function (event, data) {
            onLevelNodeActivated(data);
        },
        deactivate: function (event, data) {
            onLevelNodeDeactivated();
        },
    })
    .fancytree('getTree');
}

function onLoadStart(withProgress) {
    if (!withProgress) {
        // no total bytes known: show active toolbar without text
        $('#progressBar').css('width', '100%');
        $('#progressBar').html('');
    }
    var fullprojectname = PROJECT.title + (PROJECT.levelid ? ' - ' + PROJECT.levelid : '');
    $('#progressLoadmsg').html('Loading project ' + fullprojectname + '. Please wait...');
    $('#progressLoadCancel').show();
    $('#progressBarHolder').show();

}

function onXHRLoadDone(modelname) {
    $('#progressLoadmsg').html('Loading done. Preparing project ' + modelname + '. Please wait...');
}

function onLoadFailed(modelname) {
    hideMenuItems();
    console.error('[ERROR] Failed to load model:', modelname);
    $('#progressBar').removeClass('progress-bar-success');
    $('#progressBar').addClass('progress-bar-danger');
    $('#progressBar').css('width', '100%');
    $('#progressBar').html('ERROR');
    $('#progressLoadmsg').html('Failed to load model ' + modelname);
    $('#progressLoadCancel').hide();
    $('#progressBarHolder').show();
}

function cancelDownload() {
    if (runningXHTTPrequest) {
        // clean abort
        runningXHTTPrequest.abort();
        runningXHTTPrequest = null;
    }
    setTimeout(function () { location.href = '/Manage/ListProjects'; }, 500);
    console.log('[INFO] download cancelled by user');
    return;
}

function updateProgressBar(iPerc) {
    $('#progressBar').css('width', iPerc + '%');
    $('#progressBar').html(iPerc + '%');
}

function onPanelClose(panel) {
    panel.hide();
}

function fadOutHints($elm) {
    $elm.fadeTo(500, 0, function () {
        hideHints($elm);
    });
}

function hideHints($elm) {
    if (!$elm) $elm = $('.tt'); // all tooltips/hints
    $elm.remove();
}

function showSceneTree() {
    if (!panelSceneTree)
        return;
    panelSceneTree.toggle();
}

function hideTreeNodeByKey(key) {
    // TODO
}

function selectTreeNodeById(oid) {
    var node = getTreeNodeByKey(modeltree, oid.toString());
    if (node) {
        node.setActive();
    }
}

function deselectTreeNodes() {
}

function onNodeSelected(node) {
    showObjectInfoById(parseInt(node.key));
}

function onNodeDeselected() {
    clearLastObject();
}

function zoomToSelectedTreeNode(selectedNodes) {
    //console.log(selectedNodes);

    //if (selectedNodes.length === 0) return;
    //var objectid = parseInt(selectedNodes[0]);
    //zoomToObject(VA3C.model.getObjectById(objectid));
}


// - tree stuff ---------------------

// model tree

var _panelDefaultOptions = {
    theme: "bootstrap-primary",
    headerControls: {
        minimize: 'remove',
        maximize: 'remove',
    },
    extensions: ["filter"],
    position: {
        my: "left-top",
        at: "left-top",
        offsetY: 110
    },
    //contentOverflow: 'scroll',
    draggable: {
        containment: 'maincontainer'
    },
    container: '#maincontainer',
    callback: function (panel) {
        // close means hide
        $(".jsPanel-btn-close", panel)
            // remove default handler
            .off()
            // bind new handler
            .click(function () {
                onPanelClose(panel);
            });
    }
};

function createSceneTree(jsonscenegraph) {

    // create graph if not yet done, hide it
    if (!panelSceneTree) {
        panelSceneTree = $.jsPanel($.extend({}, _panelDefaultOptions, {
            content: $('#scenetreeholder'),
            headerTitle: "Model Tree",
        }));
    }

    modeltree = $('#scenetree').fancytree({
        source: convertSceneData(jsonscenegraph),
        // need these for auto focus / scrollintoview
        autoScroll: true,
        activeVisible: true,
        autoActivate: true,
        focusOnSelect: true,
        titlesTabbable: true,
        // filter not in use yet
        filter: {
            //    mode: "hide"
        },
        activate: function (event, data) {
            onNodeSelected(data.node);
        },
        deactivate: function (event, data) {
            onNodeDeselected();
        },
    })
    .fancytree('getTree');

    $('#scenetreeholder').show();
    panelSceneTree.hide();
}

function convertSceneData(jsonscenegraph) {
    var parent,
        nodeMap = {};

    // Pass 1: store all tasks in reference map
    $.each(jsonscenegraph, function (i, c) {
        nodeMap[c.id] = c;
    });

    // Pass 2: adjust fields and fix child structure
    jsonscenegraph = $.map(jsonscenegraph, function (c) {
        // Rename 'key' to 'id'
        c.key = c.id;
        delete c.id;
        c.title = c.text;
        delete c.text;
        // Check if c is a child node
        if (c.parent && nodeMap[c.parent]) {
            // add c to `children` array of parent node
            parent = nodeMap[c.parent];
            if (parent.children) {
                parent.children.push(c);
            } else {
                parent.children = [c];
            }
            return null;  // Remove c from jsonscenegraph
        }
        return c;  // Keep top-level nodes
    });
    // Pass 3: sort chldren of children of root (= Arch etc) by 'title'
    if (jsonscenegraph.length > 0 && jsonscenegraph[0].children) {
        $.each(jsonscenegraph[0].children, function (i, c) {
            if (c.folder && c.parent) {
                // sort childer of c
                if (c.children && c.children.length > 1) {
                    c.children.sort(function (a, b) {
                        return ((a.title < b.title) ? -1 : ((a.title > b.title) ? 1 : 0));
                    });
                }
            }
        });
    }
    return jsonscenegraph;
}


function getObjectById(oid) {
    if (!oid) return null;
    // getObjectById must have int
    if (oid instanceof String) oid = parseInt(oid);
    if (isNaN(oid)) return null;
    return VA3C.model.getObjectById(oid);
}

function showObjectInfoById(oid) {
    return showObjectInfo(getObjectById(oid));
}

// if object has user data, show it and highlight it;
// if not, ignore it;
function showObjectInfo(object) {

    if (!object) {
        console.log('[WARNING] showObjectInfo undefined object')
        clearLastObject();
        return false;
    }

    // object must NEVER be a mesh!
    if (object instanceof THREE.Mesh) {
        console.log('[WARNING] showObjectInfo unexpected mesh object:')
        console.log(object);
        clearLastObject();
        return false;
    }

    // highlight object can differ from info object
    var infoobject = getInfoObject(object);
    if (!infoobject) return;

    // same as last object?
    if (object == VA3C.lastObject3D) return true;

    // new object
    clearLastObject();

    showObjectData(infoobject);

    highlightObject(object);

    if ($('#checkautopan').is(":checked")) {
        zoomToObject(object);
    }

    forceRender();

    return true;
}

// add to revit_id <> object.id map
function addToRevitIdObject3dMap(object) {

    var revit_id = getObjectRevitId(object);
    if (!revit_id) return;

    var id = object.id; // id is an integer
    PROJECT.revitToObjectId[revit_id] = id;
}

function getObjectByRevitId(revit_id) {
    return getObjectById(PROJECT.revitToObjectId[revit_id]);
}

function getObjectRevitId(object) {
    return getObjectUserDataProperty(object, 'revit_id', true);
}

function getObjectUserDataProperty(object, prop, suppresswarning) {

    if (!object) {
        console.warn('[WARNING] object not defined for lookup userData', prop);
        return null;
    }

    if (!object.userData) {
        console.warn('[WARNING] object has no userData', object);
        return null;
    }

    if (!prop) {
        console.warn('[WARNING] prop not defined for lookup userData in', object);
        return null;
    }

    var val = getUserDataProp(object.userData, prop);
    if (val) return val;

    //if (object.userDataNotUsed) {
    //    if (object.userDataNotUsed.hasOwnProperty(prop)) {
    //        return object.userDataNotUsed[prop];
    //    }
    //}

    if (!suppresswarning)
        console.warn('[WARNING] object does not have property', prop, object);

    return null;

}

// get userData by prop or its mapped equivalent
function getUserDataProp(userData, prop) {

    if (!userData) return;
    if (!prop) return;

    if (userData.hasOwnProperty(prop)) {
        return userData[prop];
    }

    var mappedProp = userDataLocaleKeyMap[prop];
    if (mappedProp && userData.hasOwnProperty(mappedProp)) {
        return userData[mappedProp];
    }

    return null;
}

// delete prop or its mapped equivalent from userData
function deleteUserDataProp(userData, prop) {

    if (!userData) return;
    if (!prop) return;

    if (userData.hasOwnProperty(prop)) {
        delete userData[prop];
        return;
    }
    var mappedProp = userDataLocaleKeyMap[prop];
    if (mappedProp && userData.hasOwnProperty(mappedProp)) {
        delete userData[mappedProp];
    }
}
