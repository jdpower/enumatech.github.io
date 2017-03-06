var PROJECT;
var fullprojectname;

var _defaultTopView = [0, 0];
var _defaultStartView = [45, 45];

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

var timerTimeOut;// = 3 * 60 * 1000; //3 min

var _MSG_YES = 'Yes';
var _MSG_HELP = 'Help';
var _MSG_LOADINGPROJECT = 'Loading project';
var _MSG_PLEASEWAIT = 'Please wait';

$(document).ready(function () {

    if (!Detector.webgl) {
        $('#maincontainer').html('<div style="text-align:center; color: red; margin: 50px;">This browser does not support WebGL. Please use Chrome (recommended) or any other browser.</div>');
        return;
    }

    if (detectIE()) {
        $('#maincontainer').html('<div style="text-align:center; color: red; margin: 50px;">You are using Internet Explorer. This browser does not have full support for WebGL. Please use Chrome (recommended) or any other browser.</div>');
        return;
    }


    $('#fullscreentoggle').click();

    PROJECT = null;

    // 'var PROJECTS' is set in projects.js
    if (!PROJECTS) {
        console.error('[ERROR] no projects defined.');
        alert('[ERROR] no projects defined.');
        return;
    }

    //createProjectList();

    hideMenuItems();

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

    // show menu after x minutes
    $(document).on("idle.idleTimer", function (e) {
        console.log("Idle timer elapsed");
        showProjectSelector();
    });

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
    $(document).idleTimer("destroy");
    hideMenuItems();

    var itemHolder = $('#projectSelector');

    closeHelp();

    $('#compass').hide();

    if (PROJECT && itemHolder.html() !== '') {
        // opened via a menu while a project is open and menu has content: toggle menu
        //hideLeftRightMenu();
        //$('#leftTopMenuToggle').toggleClass('leftopen');
        //$('#projectSelectorBackground').hide(); // no background
        $('#projectSelectorHolder').toggle();
        return;
    }

    itemHolder.html('');

    var menuitem;
    for (var projectID in PROJECTS) {
        menuitem = $('<div class="projectItem" onclick="selectProject($(this));">' + PROJECTS[projectID].title + '</div>')
            .appendTo(itemHolder)
            .data({ projectid: projectID });
    }

    if (menuitem && Object.keys(PROJECTS).length === 1 && PROJECTS[projectID].levels) {
        // auto-open levels menu when we have a single project with levels
        menuitem.html(''); // no title kiosk
        menuitem.click();
    }

    //$('#leftTopMenuToggle').addClass('leftopen');

    $('#projectSelectorHolder').show();
}


function showLevelSelector($elm) {

    var projectID = $elm.data('projectid');

    //if ($('#maintitle').html().indexOf(PROJECTS[projectID].title) === -1) {
    //    $('#maintitle').html(PROJECTS[projectID].title);
    //}

    if ($elm.children().length > 0) {
        // hide level menu items
        //if (!PROJECT) $elm.html(PROJECTS[projectID].title);
        return;
    }

    //console.log(PROJECTS[projectID].levels);
    for (var ii in PROJECTS[projectID].levels) {
        var levelID = PROJECTS[projectID].levels[ii];
        if (typeof levelID !== 'string') {
            console.log(typeof levelID);
            continue;
        }

        var item = $('<div class="levelItem" onclick="selectProject($(this));">' + levelID + '</div>')
            .appendTo($elm)
            .data({ projectid: projectID, levelid: levelID });
    }

    if (!PROJECT) {
        setProjectData(projectID, null, null, onSetProjectDataDone);
    }
    else {
        $('#projectSelectorHolder').show();
    }
}

function onSetProjectDataDone(data, textStatus) {
    // mode specific
    onSetProjectData(data, textStatus);
    applyLocale();
    $('#projectSelectorHolder').show();
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

// reload page with arguments
function loadProject(projectId, levelId, searchVal) {
    var url = '//' + location.host + location.pathname + '?projectid=' + projectId;
    if (levelId) url = url + '&levelid=' + levelId;
    if (searchVal) url = url + '&search=' + encodeURIComponent(escapeAttributeValue(searchVal));
    window.location.href = url;
}

function startProject(projectID, levelID) {

    // Start the idle timer for given period
    if(timerTimeOut) $(document).idleTimer(timerTimeOut);

    if (PROJECT && PROJECT.id === projectID && PROJECT.levelid === levelID) {
        $('#compass').show();
        $('#projectSelectorHolder').hide();
        showMenuItems();
        return;
    }

    if (PROJECT) {
        // reload page with arguments
        loadProject(projectID, levelID);
        return;
    }

    $('#projectSelectorHolder').hide();

    showUIBranding(projectID);

    if (PROJECTS.hasOwnProperty(projectID) === false) {
        console.error('[ERROR] no project data found for ' + projectID);
        alert('[ERROR] no project data found for ' + projectID);
        return;
    }

    var projectFile = PROJECTS[projectID].projectFile;
    if (!projectFile || projectFile === '') {
        alert('No project file defined for project ' + projectID);
        return;
    }

    resetScene();

    setProjectData(projectID, levelID, projectFile, onLoadProjectFileSuccess);
}

function setProjectData(projectID, levelID, projectFile, callbackWhenDone) {

    // locale override
    var localeFile;
    var lang = getUrlVars()['lang'];
    if (lang) {
        localeFile = (PROJECTS[projectID].dataFolder || '') + lang + '.js';
    }
    else {
        localeFile = PROJECTS[projectID].localeFile;
    }

    var helpFile = PROJECTS[projectID].helpFile;

    PROJECT = {};
    PROJECT.levelid = levelID; //can be undefined
    PROJECT.id = projectID;
    PROJECT.levels = PROJECTS[projectID].levels;
    PROJECT.title = PROJECTS[projectID].title;
    PROJECT.copyright = PROJECTS[projectID].copyright;
    PROJECT.datafolder = PROJECTS[projectID].dataFolder || '';
    // project wide data mapping; will add level/model specific mapping in onLoadProjectFileSuccess
    PROJECT.datamapping = PROJECTS[PROJECT.id].datamapping || {};
    // views
    PROJECT.startview = PROJECTS[projectID].startview || _defaultStartView;
    PROJECT.topview = PROJECTS[projectID].topview || _defaultTopView;
    // label style
    PROJECT.anncss = PROJECTS[projectID].annotationcss;
    // environment
    PROJECT.fog = PROJECTS[projectID].fog || false;
    PROJECT.plane = PROJECTS[projectID].plane || false;
    PROJECT.axes = PROJECTS[projectID].axes || false;
    PROJECT.compass = PROJECTS[projectID].compass || false;
    PROJECT.skybox = PROJECTS[projectID].skybox || false;
    PROJECT.ao = PROJECTS[projectID].ao || false;
    PROJECT.sun = PROJECTS[projectID].sun;

    PROJECT.revitToObjectId = {};

    if (PROJECTS[projectID].includes) {
        var includeFiles = PROJECTS[projectID].includes.slice();
    }
    if (!includeFiles) includeFiles = [];

    // locale file (for UI only, not project  content)
    if (localeFile) includeFiles.push(localeFile);
    // help file
    if (helpFile) includeFiles.push(helpFile);

    if (projectFile) {
        // add project file as last resource
        includeFiles.push(projectFile);
    }

    // load all resources, calls onLoadProjectFileSuccess when last resource (= project file) is loaded
    getLocalDatas(includeFiles, callbackWhenDone);
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

    applyLocale();
}

function applyLocale() {
    // LOCALE is defined in case we have an include of a locale file as in "var LOCALE = { 'Hello': 'Ola' }"
    if (typeof LOCALE !== 'object') return;
    replaceInPage(LOCALE);
    console.log('[INFO] applied locale');
}

function initTopMenuBar() {

    if (getUrlVars()['demo'] === '1') $('#menuprojectlist').hide();

    //$("#siteMenuBar").css({ 'display': 'block', 'margin-top': '0px' });
    //return;


    //initialMargin = parseInt($("#siteMenuBar").css("margin-top"));

    //$("#siteMenuBar").hover(
    //        function () {
    //            if (timeout) {
    //                clearTimeout(timeout);
    //                timeout = null;
    //            }
    //            $(this).animate({ marginTop: 0 }, 'fast');
    //        },
    //        function () {
    //            var menuBar = $(this);
    //            timeout = setTimeout(function () {
    //                timeout = null;
    //                menuBar.animate({ marginTop: initialMargin }, 'slow');
    //            }, 1000);
    //        }
    //    );

    //$("#siteMenuBar").show();
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
    $('#progressLoadmsg').html(_MSG_LOADINGPROJECT + ' ' + fullprojectname + '. ' + _MSG_PLEASEWAIT + '...');
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

    //showRightMenu();

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

function toggleAnnotation(id, show) {
    if (!VA3C.objectannotations) return;
    var anndata = VA3C.objectannotations[id];
    if (!anndata || !anndata.element) return;
    anndata.element.style.display = show ? '' : 'none'; //dont use 'visibility' as it is set at render
}

function removeAnnotation(id) {
    var anndata = VA3C.objectannotations[id];
    if (!anndata || !anndata.element) return;
    var annholder = document.getElementById("annholder");
    if (!annholder) return;
    annholder.removeChild(anndata.element);
    delete VA3C.objectannotations[id];
}

function updateAnnotationColor(id, forecolor, backcolor) {
    if (!VA3C.objectannotations) return;
    var anndata = VA3C.objectannotations[id];
    if (!anndata || !anndata.element) return;
    anndata.element.style.color = forecolor || ''; // '' = use css rule
    anndata.element.style.backgroundColor = backcolor || '';
    anndata.element.style.display = ''; //show
}

function updateAnnotationText(id, text) {
    if (!VA3C.objectannotations) return;
    var anndata = VA3C.objectannotations[id];
    if (!anndata || !anndata.element) return;
    $(anndata.element).html('<p>' + text + '</p>');
}

function createAnnotation(id, box, text, annholder, anncss) {

    if (VA3C.objectannotations.hasOwnProperty(id)) {
        removeAnnotation(id);
    }

    if (!annholder) {
        annholder = document.getElementById("annholder");
        if (!annholder) return false;
    }

    var loddist = box.getSize().length() * 4;
    var position = box.getCenter().clone();
    var anndiv = createAnnotationElement(id, text, annholder, anncss);

    if (anndiv) {
        var anninfo = {
            id: id,
            element: anndiv,
            position: position,
            loddist: loddist
        };
        VA3C.objectannotations[id] = anninfo;
        return anninfo;
    }

    console.error('[Error] failed to create annotation element', id);
    return false;
}

var _annotationHTML = '<div class="annotext" style="visibility: hidden;" id="ann$ANNID"><p>$ANNTEXT</p></div>';

function createAnnotationElement(id, text, annholder, extracss) {
    var fragment = createElementFromFragment(_annotationHTML.replace('$ANNID', id).replace('$ANNTEXT', text));
    annholder.appendChild(fragment);
    var element = document.getElementById('ann' + id);
    if (extracss) $(element).addClass(extracss);
    return element;
}


var offcanvasmargin = 0.95; // TODO should check div size

function filterAnnotation(position, loddist) {
    // LODding
    // make lod dist depend on view angle
    // top/bottom is zero dist, side view is computed dist
    var dist = position.distanceTo(VA3C.camera.position) * (0.5 - VA3C.CAMVERTANGLEFACT);
    if (dist > loddist) return false;
    var screenpos = position.clone();
    screenpos.project(VA3C.camera);
    if (screenpos.z < EPSILON || screenpos.z > 1.0) return false; // behind the cam

    // screenpos range is [-1 > 1]
    // off canvas check
    if (Math.abs(screenpos.x) > offcanvasmargin) return false;
    if (Math.abs(screenpos.y) > offcanvasmargin) return false;
    // convert to screen coordinate for DOM element pos
    screenpos.x = (screenpos.x * VA3C.canvasSize.hwidth) + VA3C.canvasSize.hwidth;
    screenpos.y = (-screenpos.y * VA3C.canvasSize.hheight) + VA3C.canvasSize.hheight;
    return screenpos;

}

function toggleHelp() {

    if ($("#helpButton").hasClass('open')) {
        closeHelp();
    }
    else {
        showHelp();
    }
}

function showHelp() {

    showHelpHints();

    if (typeof HELPCONTENT !== 'undefined') {

        if ($('#helpinfo').html() === '') {
            $('#helpinfo').html(HELPCONTENT);
        }

        $('#helpinfoHolder').show();
    }


    $("#helpButton").addClass('open');

    //if (_panelHelp) {
    //    _panelHelp.show();
    //    return;
    //}

    //$('#helpPanel').html(HELPCONTENT);

    //_panelHelp = $.jsPanel({
    //    headerTitle: _MSG_HELP,
    //    contentSize: { width: 250, height: 250 },
    //    theme: "bootstrap-primary",
    //    headerControls: {
    //        controls: "closeonly",
    //        //minimize: 'remove',
    //        //maximize: 'remove',
    //    },
    //    position: {
    //        my: "right-bottom",
    //        at: "right-bottom",
    //        offsetX: -15,
    //        offsetY: -100
    //    },
    //    resizable: 'disabled',
    //    draggable: 'disabled',
    //    //draggable: {
    //    //    containment: '#maincontainer'
    //    //},
    //    container: '#maincontainer',
    //    content: $('#helpPanel'),
    //    callback: function (panel) {
    //        $(".jsPanel-btn-close", panel)
    //            // remove default handler
    //            .off()
    //            // bind new handler
    //            .click(function () {
    //                closeHelp();
    //            });
    //        $("button", this.content).click(function () { closeHelp(); });
    //    },
    //});
}

function closeHelp() {
    //if (!_panelHelp) return;
    //_panelHelp.hide();
    $('#helpinfoHolder').hide();
    //closeHelpHints();
    $("#helpButton").removeClass('open');
}

function showHelpHints() {
    $('#helpHintsHolder').show();
}

function closeHelpHints() {
    $('#helpHintsHolder').hide();
}

function updateAutoState() {
    //console.log('autostate');
    var autoPanChecked = $('#checkautopan').is(":checked");
    document.getElementById('checkautozoom').disabled = autoPanChecked === false;
    if (autoPanChecked && VA3C.lastObject3D) {
        zoomToObject(VA3C.lastObject3D);
    }
}


//function showMenuItems() {
//    $("#btnLeftMenu").show();
//    $("#btnRightMenu").show();
//    $('#projecttitle').show();
//    showHints();
//}

//function hideMenuItems() {
//    $("#btnLeftMenu").hide();
//    $("#btnRightMenu").hide();
//    $('#projecttitle').hide();
//}

//function toggleLeftMenu() {

//    if (!canToggleLeftMenu()) return;

//    if ($("#btnRightMenu").hasClass('rightopen')) {
//        toggleRightMenu();
//    }
//    $("#leftmenu").toggleClass('open');
//    $("#canvasholder").toggleClass('leftopen');
//    $("#btnLeftMenu").toggleClass('leftopen');
//    if (VA3C) {
//        updateCameraAspectRatio();
//        forceRender();
//    }
//}

//function toggleRightMenu() {
//    if ($("#btnLeftMenu").hasClass('leftopen')) {
//        toggleLeftMenu();
//    }
//    $("#rightmenu").toggleClass('open');
//    $("#canvasholder").toggleClass('rightopen');
//    $("#btnRightMenu").toggleClass('rightopen');
//    if (VA3C) {
//        updateCameraAspectRatio();
//        forceRender();
//    }
//}


function showMenuItems() {
    $('#projecttitle').show();
    $("#siteMenuBar").show();

    //console.log($('.' + getMediaState()));

    //$('.' + getMediaState()).show();
    if (getMediaState() === "landscape") {
        $("#btnLeftMenu").show();
        $("#btnRightMenu").show();
        $("#leftTopMenuToggle").hide();
        $("#rightTopMenuToggle").hide();
        //showHints();
    }
    else {
        $("#btnLeftMenu").hide();
        $("#btnRightMenu").hide();
        $("#leftTopMenuToggle").show();
        $("#rightTopMenuToggle").show();
    }

    //initTopMenuBar();

    if (typeof HELPCONTENT === 'undefined') {
        $("#helpButton").hide();
    }
    else {
        $("#helpButton").show();
    }

    $("#homeButton").show();
    $("#levelButton").show();

    $('.helpitem').tooltip({
        position: { my: "left+5 center", at: "right center" },
        show: true,
        disabled: true,
        //classes: { "ui-tooltip": "helptooltip" }
    });
    $('.helpitem').tooltip('open');
}

function hideMenuItems() {
    $('#projecttitle').hide();
    $("#siteMenuBar").hide();

    $('.helpitem').tooltip('close');
    //$('.' + getMediaState()).hide();
    $('#projecttitle').hide();
}

function toggleLeftMenu() {
    hideHints();

    if (!canToggleLeftMenu()) return;

    if (isPortraitMode()) {
        if ($("#rightTopMenuToggle").hasClass('rightopen')) {
            toggleRightMenu();
        }
        $("#leftTopMenuToggle").toggleClass('leftopen');
    }
    else {
        if ($("#btnRightMenu").hasClass('rightopen')) {
            toggleRightMenu();
        }
        $("#btnLeftMenu").toggleClass('leftopen');
        $("#compass").toggleClass('leftopen');
    }

    $("#leftmenu").toggleClass('open');
    $("#canvasholder").toggleClass('leftopen');

    if (VA3C) {
        updateCameraAspectRatio();
        forceRender();
    }
}

function toggleRightMenu() {

    hideHints();

    if (isPortraitMode()) {
        if ($("#leftTopMenuToggle").hasClass('leftopen')) {
            toggleLeftMenu();
        }
        $("#rightTopMenuToggle").toggleClass('rightopen');
    }
    else {
        if ($("#btnLeftMenu").hasClass('leftopen')) {
            toggleLeftMenu();
        }
        $("#btnRightMenu").toggleClass('rightopen');
    }

    $("#rightmenu").toggleClass('open');
    $("#canvasholder").toggleClass('rightopen');
    $("#footerHolder").toggleClass('rightopen');

    if (VA3C) {
        updateCameraAspectRatio();
        forceRender();
    }
}

function showRightMenu() {
    hideHints();

    if ($("#rightmenu").hasClass('open') == false) {
        $("#rightmenu").addClass('open');
    }
    if ($("#canvasholder").hasClass('open') == false) {
        $("#canvasholder").addClass('rightopen');
    }
    if ($("#footerHolder").hasClass('open') == false) {
        $("#footerHolder").addClass('rightopen');
    }

    if ($("#rightTopMenuToggle").hasClass('rightopen') == false) {
        $("#rightTopMenuToggle").addClass('rightopen');
    }

    if ($("#btnRightMenu").hasClass('rightopen') == false) {
        $("#btnRightMenu").addClass('rightopen');
    }

    if (VA3C) {
        updateCameraAspectRatio();
        forceRender();
    }
}

function hideLeftRightMenu() {

    $("#rightmenu").removeClass('open');
    $("#leftmenu").removeClass('open');
    $("#canvasholder").removeClass('rightopen');
    $("#canvasholder").removeClass('leftopen');
    $("#btnRightMenu").removeClass('rightopen');
    $("#btnLeftMenu").removeClass('leftopen');
    $("#rightTopMenuToggle").removeClass('rightopen');
    $("#leftTopMenuToggle").removeClass('leftopen');

    $("#footerHolder").removeClass('rightopen');
    $("#footerHolder").removeClass('leftopen');

    if (VA3C) {
        updateCameraAspectRatio();
        forceRender();
    }
}

function recurseAdd(list, object) {
    list.push(object);
    for (var ii in object.children) {
        if (typeof object.children[ii] === 'function') continue;
        recurseAdd(list, object.children[ii]);
    }
}

function removeObject(object) {
    if (object.geometry) object.geometry.dispose();
    if (object.material) object.material.dispose();
    if (object.parent) object.parent.remove(object);
}

function recurseDelete(parent) {
    while (parent.children.length > 0) {
        var child = parent.children[0];
        recurseDelete(child);
        removeObject(child);
    }
}

var appliedCustomView = false; //only once
function applyCustomViewSettings() {
    if (appliedCustomView) return;
    appliedCustomView = true;
    var menus = getUrlVars()['menus'] || '';
    if (menus.indexOf('off') !== -1) {
        hideLeftRightMenu();
        $('#btnLeftMenu').hide();
        $('#btnRightMenu').hide();
    }
    if (menus.indexOf('nofminfo') !== -1) {
        $('#fm_search_result_object').hide();
    }
    if (menus.indexOf('leftopen') !== -1) {
        toggleLeftMenu();
        $('#btnRightMenu').hide();
    }
    if (menus.indexOf('rightopen') !== -1) {
        toggleRightMenu();
        $('#btnLeftMenu').hide();
    }
    if (menus.indexOf('noviewfilter') !== -1) {
        $('#viewfilterholder').hide();
    }
}
