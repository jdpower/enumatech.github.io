var _MSG_NOTHINGSELECTED = 'Nothing selected';
var _HTML_NOTHINGSELECTED = '<p class="smallComment center">' + _MSG_NOTHINGSELECTED + '</p>';

var viewerRoles = {
    viewer: 1,
    editor: 2,
    pm: 3,
    developer: 4,
}

function initSceneMode() {

    PROJECT.viewermode = viewerModes[PROJECTS[PROJECT.id].mode];

    // role override
    var role = getUrlVars()['role'];
    if (role && viewerRoles.hasOwnProperty(role)) {
        PROJECT.role = viewerRoles[role];
    }
    else {
        PROJECT.role = viewerRoles[PROJECTS[PROJECT.id].role];
    }

    PROJECT.canCreate = PROJECT.role === viewerRoles.pm || PROJECT.role === viewerRoles.developer;
    PROJECT.canEdit = PROJECT.role === viewerRoles.editor || PROJECT.role === viewerRoles.developer;
    PROJECT.canView = PROJECT.role === viewerRoles.viewer;

    console.log('[INFO] user can create', PROJECT.canCreate);
    console.log('[INFO] user can edit', PROJECT.canEdit);
    console.log('[INFO] user can view', PROJECT.canView);

    if (PROJECT.role === viewerRoles.developer) {
        console.warn('[WARNING] DEVELOPER MODE');
        $('.developer').show();
    }

    // no special operations before loading the project

    initVA3C();

    console.log('[INFO] starting project', PROJECT.id);

    // load first model, then calls itself in processLoadResultProjectModel for next
    loadProjectModel(0);

    initUI();

    forceRender();
}

function onLoadFinished() {

    // start view
    setStartView();

    if (__CREATESCENETREE) {
        createSceneTree(jsonscenegraph);
    }

    createAnnotations();

    // show navbar items
    showMenuItems();

    $('#progressBarHolder').hide();

    onProjectReady();
}

function initUIMode() {
    if (PROJECT.canEdit) {
        $('#objectpropertiesholder').show();
    }
    else {
        $('#objectpropertiesholder').hide();
    }

    $('#viewfilterholder').hide();
    $('#managementholder').hide();
}

function showHints() {
    // nothing
}

function canToggleLeftMenu() {
    return true;
}

function getLevelsNodesData() {
    var jsdata = [];
    for (var levelid in PROJECT.data.levels) {
        var level = PROJECT.data.levels[levelid];
        jsdata.push({
            title: level.title || levelid,
            //children: PROJECT.canEdit ? addViewFilterTreeNodes(levelid) : [],
        });
    }

    // sort by name
    jsdata.sort(function (a, b) {
        return (a.title < b.title) ? -1 : ((a.title > b.title) ? 1 : 0);
    });

    return jsdata;
}

function showObjectMetaData(object) {

    if (populateObjectMetaData(object) === false) {
        return;
    }

    //prop grid meta
    var metadata = {};
    if (PROJECT.data && PROJECT.data.metaformat) {
        $.extend(metadata, PROJECT.data.metaformat);
    }

    if (PROJECT.canEdit) {
        $('#objectproperties').jqPropertyGrid(object.userData, metadata);
    }

    $('#objectinfo').jqPropertyGrid(object.metaData, metadata);


    if (object.extraData && object.extraData.length > 0) {
        // clone metadata (remove name)
        var metadataextra = {};
        $.extend(metadataextra, metadata);
        //metadataextra.name.type = 'hidden';

        var parentelm = $('#objectinfo');
        var extraroot = $('<div><div class="extra_info_header">Companies</div></div>').appendTo(parentelm);

        for (var i = 0; i < object.extraData.length; i++) {
            var extradata = object.extraData[i];
            var extratitle = $('<div class="extra_info_title">' + extradata.name + '</div>').appendTo(extraroot);
            var extrainfo = $('<div class="extra_info fm_info"></div>').appendTo(extratitle);
            extrainfo.jqPropertyGrid(extradata, metadataextra);
        }
    }
}

function populateObjectMetaData(object) {

    if (!object) return false;
    if (object.metaData) return true;

    // for editor
    if (PROJECT.canEdit) {
        object.userData = { '3D Object Name': object.name };
    }
    else {
        object.userData = {};
    }

    // for all
    object.metaData = {};
    object.extraData = [];

    if (!PROJECT.data) {
        return false;
    }

    if (!PROJECT.data.meta) {
        return false;
    }

    if (!PROJECT.data.meta.hasOwnProperty(object.name)) {
        return false;
    }

    $.extend(object.metaData, PROJECT.data.meta[object.name].general);

    if (PROJECT.data.meta[object.name].firms) {
        object.extraData = PROJECT.data.meta[object.name].firms.slice();
    }

    return true;
}

function showObjectData(object) {

    showObjectMetaData(object);
}

function hideHTMLProperties() {
    //$('#objectpropertiesholder').hide();
    $('#objectproperties').html(_HTML_NOTHINGSELECTED);
    $('#objectinfo').html(_HTML_NOTHINGSELECTED);
}


function processLoadResult(result, modelname, modeldata) {
    // traverse loaded scene graph
    var toberemoved = [];
    result.traverse(function (object) {

        if (toberemoved.indexOf(object) !== -1) return false;

        if (object instanceof THREE.Camera) {
            recurseAdd(toberemoved, object);
            console.log('[INFO] loaded scene had a camera')
        }
        else if (object instanceof THREE.Light) {
            recurseAdd(toberemoved, object);
            console.log('[INFO] loaded scene had a light')
        }
        else if (object instanceof THREE.Mesh) {
            if (object.geometry.mergeVertices) object.geometry.mergeVertices();
            if (object.geometry.computeFaceNormals) object.geometry.computeFaceNormals();
            //object.geometry.computeBoundingBox();
            if (modeldata.pickable) {
                VA3C.sceneMeshes.push(object);
            }
            object.castShadow = modeldata.castshadow;
            object.receiveShadow = modeldata.receiveshadow;
        }
        else if (object instanceof THREE.Object3D) {

            filterObject(object);

            //var mrx = new THREE.Matrix4();
            //mrx.makeRotationX(-Math.PI / 2);
            //var mo = object.matrix;
            //mo.multiply(mrx);
            //object.rotation.x = -Math.PI / 2
            object.updateMatrix();
            object.updateMatrixWorld(true);

            // add to revit_id > object ID map
            addToRevitIdObject3dMap(object);

            if (modeldata.annotate) {
                if (!VA3C.annobjects) VA3C.annobjects = [];
                VA3C.annobjects.push(object);
            }

            if (modeldata.helper) {
                // helpers for sun light
                if (object.name === 'sun') {
                    VA3C.sun = object;
                }
                else if (object.name === 'suntarget') {
                    VA3C.suntarget = object;
                }
                // more?
                object.visible = false;
            }
            else {
                // statistics
                VA3C.objectCount++;
            }
        }
    });

    // removing unwanted objects in reverse
    for (var ii = toberemoved.length - 1; ii >= 0; ii--) {
        removeObject(toberemoved[ii]);
        //console.log('[INFO] removed object:', toberemoved[ii]);
    }
    console.log('[INFO] # invalid objects that have been removed: ', toberemoved.length);
}


// returns false if not valid, returns filter keyword if valid
function filterObject(object) {

    if (!object.userData) {
        return;
    }

    var revit_id = getObjectRevitId(object);

    if (revit_id) {
        createInstancedObject(object);
    }
}

function getInfoObject(object) {
    infoobject = getTopNamedObject(object);
    if (!infoobject) {
        console.log('[showObjectInfo] WARNING: no object with a name found', object)
        if ($('#checkautopan').is(":checked")) {
            zoomToObject(object);
        }
        clearLastObject();
    }

    return infoobject;
}

function getTopNamedObject(object) {
    var infoobject;
    if (!object) return infoobject;
    // find last node with name
    var parent = object;
    while (parent && parent !== VA3C.model && parent !== VA3C.scene) {
        if (parent.name !== '') {
            infoobject = parent;
        }
        parent = parent.parent;
    }

    return infoobject;
}


// room id, userData[Name] or object.name
function getNiceObjectName(object) {

    if (!object) return '';


    var name = getNiceObjectNameGeneric(object);
    if (name) return name;
    return object.name;
}

function getNiceObjectNameGeneric(object) {
    if (!object) return null;

    var infoobject = getTopNamedObject(object);
    if (!infoobject) return null;
    if (!populateObjectMetaData(object)) return null;
    if (!object.metaData) return null;
    if (object.metaData.unit)
        return object.metaData.unit;
    if (object.metaData.name)
        return object.metaData.name;
    return null;
}

function clickHandler(event) {
    event.preventDefault();

    //console.log('click at', event, 'for', VA3C.canvasSize);

    var vector = new THREE.Vector3(((event.clientX - VA3C.canvasSize.left) / VA3C.canvasSize.width) * 2 - 1, -((event.clientY - VA3C.canvasSize.top) / VA3C.canvasSize.height) * 2 + 1, 0.5);
    vector.unproject(VA3C.camera);
    var raycaster = new THREE.Raycaster(VA3C.camera.position, vector.sub(VA3C.camera.position).normalize());
    var intersects;

    intersects = raycaster.intersectObjects(VA3C.sceneMeshes);

    var somecondition = true; // some filter

    if (intersects.length > 0) {
        // find parent of picked leaf that has user data
        var j = 0;
        while (j < intersects.length) {
            if (somecondition) {
                showObjectInfo(intersects[j].object.parent);
                return;
            }
            j++;
        }
    }

    if (intersects.length > 0) {
        while (j < intersects.length) {
            showObjectInfo(intersects[j].object.parent);
            return;
        }
    }

    // nothing picked
    onNothingPicked();
}

function onNothingPicked() {
    clearLastObject();
}

function createAnnotations() {
    if (!VA3C.annobjects) return;
    for (var i in VA3C.annobjects) {
        createAnnotationGeneric(VA3C.annobjects[i]);
    }
}

function createAnnotationGeneric(object) {

    if (!object) return;

    var annholder = document.getElementById("annholder");
    if (!annholder) return;

    if (!VA3C.objectannotations) VA3C.objectannotations = [];

    var infoobject = getTopNamedObject(object);
    if (!infoobject) return;

    // already made
    if (VA3C.objectannotations.hasOwnProperty(infoobject.id)) return;

    var anntext = getNiceObjectNameGeneric(infoobject);
    if (!anntext || anntext === '') return;

    var offset = v(0, 0, 0);

    var objectbox = new THREE.Box3().setFromObject(object);
    var loddist = objectbox.getSize().length() * 4;
    var position = new THREE.Vector3();
    //object.getWorldPosition(position);
    //console.log('scale', object.getWorldScale());
    position = objectbox.getCenter().clone();

    var anndiv = createAnnotationElement('ann' + infoobject.id, anntext, annholder, 'anngreenwhite');
    if (anndiv) {
        VA3C.objectannotations[infoobject.id] = {
            id: infoobject.id, //THREE id
            element: anndiv,
            position: position,
            loddist: loddist,
            offset: offset
        };
    }
    else {
        console.error('[Error] failed to create annotation element', infoobject);
    }
}

function processAnnotations() {
    if (!VA3C.objectannotations) return;
    //$.each(VA3C.objectannotations, function (i, anndata) {
    for (var annid in VA3C.objectannotations) {
        var anndata = VA3C.objectannotations[annid];
        if (!anndata || !anndata.element) continue;
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

//function makeAnnotationElement(id, text, annholder, isgrey) {
//    var fragment = createElementFromFragment(_annotationHTML.replace('$ANNID', id).replace('$ANNTEXT', text));
//    annholder.appendChild(fragment);
//    //return fragment.querySelector('#' + id); --> no result
//    var element = document.getElementById('ann' + id);
//    $(element).addClass('anngreenwhite');
//    return element;
//}

//function createElementFromFragment(htmlStr) {
//    var frag = document.createDocumentFragment(),
//        temp = document.createElement('div');
//    temp.innerHTML = htmlStr;
//    while (temp.firstChild) {
//        frag.appendChild(temp.firstChild);
//    }
//    return frag;
//}
