var VA3C;

var runningXHTTPrequest; //model download handler, for abort

//var currentAnim;
var renderEnabled;
var windowfocussed = true;
var renderForced = false;

var __CREATESCENETREE = false;

// instancing
var _materialLoader;
var _parametricMaterials = {};
var _defaultInstanceMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });

var _parametricBaseGeometries = {
    'pipe': null,
    'duct': null,
}

var _instancingKeys = {
    baseobjectid: "INSTANCE_BaseObjectId", // MD5 hash from geom vertices + materials
    baseobjectuid: "INSTANCE_BaseObjectUid",
    type: "INSTANCE_Type",
    position: "INSTANCE_Position",
    rotation: "INSTANCE_Rotation",
    connpoints: "INSTANCE_ConnectorPoints",
    connshapes: "INSTANCE_ConnectorShapes",
    // parametrics
    material: "INSTANCE_Material",
    od: "PARAMETRICS_OD",
    id: "PARAMETRICS_ID",
    length: 'Length', // standard revit property for pipes etc
    width: 'Width', // standard revit property for duct
    height: 'Height', // standard revit property for duct
};

function initVA3C() {

    if (VA3C) {
        resetScene();
        return;
    }


    VA3C = {};
    VA3C.sceneExtents = null;
    VA3C.sceneMeshes = [];
    VA3C.canvasSize = { left: 0, top: 0, width: 0, height: 0 };
    VA3C.backgroundColor = new THREE.Color(0.9, 0.95, 1.0).getHex();
    VA3C.highlightMaterial = new THREE.MeshLambertMaterial({ color: 'gold', side: THREE.DoubleSide }); //, opacity: 0.5, transparent: true });   //color for selected mesh element
    VA3C.opacityMaterial = new THREE.MeshLambertMaterial({ color: 'white', opacity: 0.3, transparent: true });   //color for 'greyed out' element
    VA3C.lastObjectMaterials = null;
    VA3C.lastObject3D = null;

    VA3C.cameraZoomDuration = 1000;
    VA3C.isCamAnimating = false;
    //VA3C.defaultCameraAngle = [1, 1, -1];

    // statistics / library stuff
    VA3C.objectCount = 0;
    VA3C.libraryObjects = {};
    VA3C.parametricObjects = {};

    VA3C.renderer = new THREE.WebGLRenderer({ antialias: true });
    VA3C.renderer.setClearColor(VA3C.backgroundColor, 1);
    console.log(VA3C.renderer.domElement.getContext('webgl'));
    // renderer.domElement not yet attached to DOM document: use window size
    VA3C.renderer.setSize(window.innerWidth, window.innerHeight);
    VA3C.renderer.shadowMap.enabled = false;
    $('#canvasholder').append($(VA3C.renderer.domElement));
    // attached: update canvas size var (also on resize)
    updateCanvasSize();
    VA3C.renderer.setSize(VA3C.canvasSize.width, VA3C.canvasSize.height);
    VA3C.scene = new THREE.Scene();
    VA3C.scene.name = 'MAIN SCENE';
    VA3C.scene.autoUpdate = true;
    VA3C.scene.visible = false;
    VA3C.camera = new THREE.PerspectiveCamera(40, VA3C.canvasSize.width / VA3C.canvasSize.height, 1, 200000);
    // for default view angle; actual startup cam depends on scene box
    //VA3C.camera.position.fromArray(VA3C.defaultCameraAngle);

    // only render when canvas has received mouseenter
    $(VA3C.renderer.domElement).on('mouseenter mouseleave', function (e) {
        toggleRenderEnabled(e.type === 'mouseenter');
    });
    // touch
    $(VA3C.renderer.domElement).on('touchstart touchend touchcancel', function (e) {
        toggleRenderEnabled(e.type === 'touchstart');
    });
    // only render when canvas has received focus
    //// doesnt work...
    //$(VA3C.renderer.domElement).on('focusin focusout', function (e) {
    //    toggleRenderEnabled(e.type === 'focusin');
    //});
    $(window).blur(function () {
        windowfocussed = false;
        toggleRenderEnabled(false);
    });
    $(window).focus(function () {
        windowfocussed = true;
        toggleRenderEnabled(true);
    });

    //VA3C.controls = new THREE.OrbitControls(VA3C.camera, VA3C.renderer.domElement);
    VA3C.controls = new EnumaOrbitControls(VA3C.camera, VA3C.renderer.domElement);
    VA3C.CAMVERTANGLEFACT = 0;

    // overlays
    VA3C.overlays = {};

    // dont use click event: is also called when dragging at mouseup
    //VA3C.renderer.domElement.addEventListener('click', clickHandler, false);
    // instead check for changed mouse clientX/Y:
    MousePick(VA3C.renderer);

    // add listener for resize
    WindowResize();
}

function resetScene() {
    if (!VA3C) return;

    var children = VA3C.scene.children;
    for (var i = children.length - 1; i >= 0; i--) {
        var child = children[i];
        VA3C.scene.remove(child);
    };

    VA3C.lastObjectMaterials = null;
    VA3C.lastObject3D = null;
    VA3C.model = null;

    VA3C.scene.fog = null;
    VA3C.sunLight = null;
    VA3C.sun = null;
    VA3C.suntarget = null;
    VA3C.headlight = null;
    VA3C.ambient = null;
    VA3C.sceneExtents = null;
    VA3C.sceneMeshes = [];
    VA3C.annobjects = [];
    $('#annholder').html('');

    VA3C.isCamAnimating = false;

    forceRender();
}

function loadProjectModel(idx) {

    var modeldata;

    if (PROJECT.levelid) {
        modeldata = PROJECT.data.levels[PROJECT.levelid].models[idx];
    }
    else if (!PROJECT.data.levels) {
        modeldata = PROJECT.data.models[idx];
    }
    else {
        console.log('[INFO] project with levels loaded but no current level specified: nothing loaded');
        showLevelSelector();
        return;
    }

    if (!modeldata.url || modeldata.url === '') {
        console.log('[INFO] no model file specified: nothing loaded');
        showLevelSelector();
        return;
    }

    if (PROJECT.levelid) {
        modeldata.url = modeldata.url.replace(LEVEL_TOKEN, PROJECT.levelid);
    }

    PROJECT.currentmodeldata = modeldata;
    PROJECT.currentmodelname = modeldata.url.substr(modeldata.url.lastIndexOf('/') + 1);

    // check if we already loaded this model; might be a second++ instance of the model file
    var loadedModels = PROJECT.loadedmodels[modeldata.url];
    if (loadedModels) {
        console.log('[INFO] using clone of model', modeldata.url);
        modeldata.isclone = true;
        // first in array is the base model
        var basemodel = loadedModels[0];
        var clone = basemodel.clone();
        PROJECT.currentmodelname = PROJECT.currentmodelname + '#' + loadedModels.length;
        clone.name = basemodel.name + '#' + loadedModels.length;
        loadedModels.push(clone);
        processLoadResultProjectModel(clone, PROJECT.currentmodelname, modeldata);
        return;
    }

    var modelUrl = PROJECT.datafolder + modeldata.url;
    var ext = modeldata.url.substr(modeldata.url.lastIndexOf('.') + 1).toLowerCase();

    if (ext === 'dae') {
        var loader = new THREE.ColladaLoader();
        runningXHTTPrequest = loader.load(modelUrl, onColladaModelLoadSuccess, onXHRModelLoadProgress, onXHRModelLoadFail);
    }
    if (ext === 'gdae') {
        runningXHTTPrequest = getGZipData(modelUrl, onGZIPColladaModelLoadSuccess, onXHRModelLoadProgress, onXHRModelLoadFail);
    }
    else if (ext === 'json' || ext === 'js') {
        var loader = new THREE.XHRLoader();
        runningXHTTPrequest = loader.load(modelUrl, onXHRModelLoadSuccess, onXHRModelLoadProgress, onXHRModelLoadFail);
    }
    else if (ext === 'enumavr') {
        runningXHTTPrequest = getGZipData(modelUrl, onXHRModelLoadSuccess, onXHRModelLoadProgress, onXHRModelLoadFail);
    }
}

var onGZIPColladaModelLoadSuccess = function (result) {
    var loader = new THREE.ColladaLoader();
    loader.parse(result, onColladaModelLoadSuccess, PROJECT.datafolder);
}

var onColladaModelLoadSuccess = function (result) {

    var model = result.scene;
    model.rotation.x = -Math.PI / 2
    model.updateMatrix();
    model.updateMatrixWorld(true);
    // first in array is the base model
    PROJECT.loadedmodels[PROJECT.currentmodeldata.url] = [model];
    processLoadResultProjectModel(model, PROJECT.currentmodelname, PROJECT.currentmodeldata);
}

var onXHRModelLoadSuccess = function (text) {
    var model = new THREE.ObjectLoader().parse(JSON.parse(text));
    // first in array is the base model
    PROJECT.loadedmodels[PROJECT.currentmodeldata.url] = [model];
    processLoadResultProjectModel(model, PROJECT.currentmodelname, PROJECT.currentmodeldata);
}

var onXHRModelLoadProgress = function (xhr) {
    if (!VA3C.model) {
        onLoadStart(PROJECT.modelcount > 1);
    }
}

var onXHRModelLoadFail = function (xhr) {
    onLoadFailed(PROJECT.currentmodelname);
}

function processLoadResultProjectModel(result, modelname, modeldata) {
    runningXHTTPrequest = null;

    // mode specific
    processLoadResult(result, modelname, modeldata);

    // offset from previous model
    if (modeldata.offset) {
        if (VA3C.model.children.length > 0) {
            var pos = VA3C.model.children[VA3C.model.children.length - 1].position;
            result.position.addVectors(pos, v(modeldata.offset[0], modeldata.offset[1], modeldata.offset[2]));
        }
    }

    // abs position
    if (modeldata.position) {
        result.position.fromArray(modeldata.position);
    }

    // abs rotation/euler
    if (modeldata.rotation) {
        result.rotation.fromArray(modeldata.rotation);
    }

    // we need models in meters
    // TODO: add units to JSON file in exporter
    // for now assume models with scale = 0.001 are in millimeters
    VA3C.sceneScale = 0.001;
    if (feq(result.scale.x, VA3C.sceneScale) == false) {
        var scalar = VA3C.sceneScale / result.scale.x;
        result.scale.set(scalar, scalar, scalar);
        console.log('[INFO] SCENE "' + modelname + '" SCALED WITH ' + scalar);
    }

    result.updateMatrix();
    result.updateMatrixWorld(true);

    result.autoUpdate = false; //assume static model, no animations etc
    console.log('[INFO] SCENE "' + modelname + '" MARKED AS STATIC (autoUpdate == false)');

    if (!VA3C.model) {
        VA3C.model = new THREE.Group();
        VA3C.scene.add(VA3C.model);
        VA3C.modelcount = 0;
    }
    // helpers always on root
    if (modeldata.helper) {
        VA3C.scene.add(result);
    }
    else {
        // child of model root VA3C.model
        VA3C.model.add(result);
    }

    // need our own counter; VA3C.model.children.length is not consistent during load
    VA3C.modelcount += 1;
    updateProgressBar(Math.round(VA3C.modelcount / PROJECT.modelcount * 100.0));

    render();

    if (VA3C.modelcount === PROJECT.modelcount) {
        finalizeLoadProject();
    }
    else {
        loadProjectModel(VA3C.modelcount);
    }
}


function finalizeLoadProject() {

    // store scene box before adding helper geometries etc
    var scenebox = new THREE.Box3().setFromObject(VA3C.model);
    VA3C.sceneExtents = { min: scenebox.min.clone(), max: scenebox.max.clone(), dimensions: scenebox.size().clone(), center: scenebox.center().clone(), radius: scenebox.size().length() * 0.5 };
    updateCameraAspectRatio();
    console.log('[INFO] scene extents:', VA3C.sceneExtents);
    VA3C.controls.minDistance = 1.0;
    VA3C.controls.maxDistance = VA3C.sceneExtents.radius * 4;

    addEnvironment();

    showStatistics();

    onLoadFinished();
}

// called when model and data has been loaded
function onProjectReady() {

    if (VA3C && VA3C.scene) {
        VA3C.scene.visible = true;
        forceRender();
    }
}
// ++++++ instancing

function showStatistics() {

    console.log('++++++++++++++ SCENE STATISTICS +++++++++++++++++');
    var tot = VA3C.objectCount;
    console.log('# scene objects:', tot);

    var libcnt = 0;
    var instcnt = -1;
    for (var baseobject in VA3C.libraryObjects) {
        //console.log(baseobject, VA3C.libraryObjects[baseobject].length)
        libcnt++;
        instcnt += VA3C.libraryObjects[baseobject].length;
    }
    instcnt += 1; // plus base object; is 0 when no parametric objects exist
    console.log('# library objects:', libcnt);
    console.log('# library object instances:', instcnt); // plus base object
    var instcntp = -1;
    for (var type in VA3C.parametricObjects) {
        //console.log(type, VA3C.parametricObjects[type].length)
        instcntp += VA3C.parametricObjects[type].length;
    }
    instcntp += 1; // plus base object; is 0 when no parametric objects exist
    console.log('# parametric instances:', instcntp);
    console.log('# non-instanced objects:', tot - instcnt - instcntp);
    console.log('+++++++++++++++++++++++++++++++++++++++++++++++++');
}

function isInstancedObject(object) {
    if (!object) return false;
    if (!object.userData) return false;
    return object.userData.hasOwnProperty(_instancingKeys.baseobjectuid);
}

function getInstanceScale(object, type) {
    var scale;
    switch (type) {
        case 'pipe':
            var slength = object.userData[_instancingKeys.length];
            var length = parseFloat(slength);
            if (isNaN(length) || feqz(length)) {
                console.error('[ERROR] Failed to get length of', type, object);
                return;
            }
            var sdiam = object.userData[_instancingKeys.od];
            var diam = parseFloat(sdiam);
            if (isNaN(diam) || feqz(diam)) {
                sdiam = object.userData[_instancingKeys.connshapes];
                diam = parseFloat(sdiam);
            }
            if (isNaN(diam) || feqz(diam)) {
                console.error('[ERROR] Failed to get outer diameter of', type, object);
                return;
            }
            return [diam, length, diam];
            break;
        case 'duct':
            var slength = object.userData[_instancingKeys.length];
            var length = parseFloat(slength);
            if (isNaN(length) || feqz(length)) {
                console.error('[ERROR] Failed to get length of', type, object);
                return;
            }

            var sw = object.userData[_instancingKeys.width];
            var width = parseFloat(sw);
            if (isNaN(width) || feqz(width)) {
                console.error('[ERROR] Failed to get width of', type, object);
                return;
            }

            var sh = object.userData[_instancingKeys.height];
            var height = parseFloat(sh);
            if (isNaN(height) || feqz(height)) {
                console.error('[ERROR] Failed to get height of', type, object);
                return;
            }
            return [width, length, height];
            break;
    }

    return null;
}

function getInstanceMaterial(object) {
    var smat = object.userData[_instancingKeys.material];
    if (!smat) return null;
    var json = JSON.parse(unescapeJSONString(smat));

    var uuid = json['uuid'];

    var material = _parametricMaterials[uuid];
    if (material) return material;

    if (!_materialLoader) _materialLoader = new THREE.MaterialLoader();
    material = _materialLoader.parse(json);
    _parametricMaterials[uuid] = material;
    return material;
}


function createInstancedObject(object) {

    if (!isInstancedObject(object)) return;

    var baseobjectid = object.userData[_instancingKeys.baseobjectid]; // MD5 hash
    var baseobjectuid = object.userData[_instancingKeys.baseobjectuid]; //revit id
    var type = object.userData[_instancingKeys.type].toLowerCase();

    if (!PROJECT.baseMeshes) PROJECT.baseMeshes = {};

    var isBaseObject = false;

    // compat
    if (!baseobjectid) baseobjectid = baseobjectuid;

    var baseMeshes = PROJECT.baseMeshes[baseobjectid];

    if (!baseMeshes) {

        switch (type) {
            case 'pipe':
                if (!_parametricBaseGeometries[type]) {
                    // params = radius, radius, length, facets, length segments, open end
                    _parametricBaseGeometries[type] = new THREE.CylinderBufferGeometry(0.5, 0.5, 1, 8, 1, true);
                }
                var mesh = new THREE.Mesh(_parametricBaseGeometries[type], null);
                mesh.matrixAutoUpdate = false;
                // points to +Y
                baseMeshes = [mesh];
                break;
            case 'duct':
                if (!_parametricBaseGeometries[type]) {
                    // params = radius, radius, length, facets, length segments, open end
                    _parametricBaseGeometries[type] = new THREE.BoxBufferGeometry(1, 1, 1);
                }
                var mesh = new THREE.Mesh(_parametricBaseGeometries[type], null);
                mesh.matrixAutoUpdate = false;
                // points to +Y
                baseMeshes = [mesh];
                break;
            default:
                var revit_id = getObjectRevitId(object);
                if (baseobjectuid === revit_id) {
                    isBaseObject = true;
                    baseMeshes = object.children;
                }
                else {
                    var baseObject = getObjectByRevitId(baseobjectuid);
                    if (baseObject) baseMeshes = baseObject.children;
                }
                break;
        }

        PROJECT.baseMeshes[baseobjectid] = baseMeshes;
    }

    if (!baseMeshes) return;

    var material = getInstanceMaterial(object);

    if (isBaseObject == false) {
        // make it
        for (var i in baseMeshes) {
            var mesh = baseMeshes[i].clone();
            mesh.material = material || mesh.material || _defaultInstanceMaterial;
            if (PROJECT.lod) {
                var lod = new THREE.LOD();
                lod.addLevel(mesh, 0);
                lod.addLevel(new THREE.Object3D(), 40);
                object.add(lod);
                if (!VA3C.LODs) VA3C.LODs = [];
                VA3C.LODs.push(lod);
            }
            else {
                object.add(mesh);
            }
            mesh.matrixAutoUpdate = false;
        }

        // stats
        var parent = baseMeshes[0].parent;
        if (parent) {
            if (!VA3C.libraryObjects[parent.id]) VA3C.libraryObjects[parent.id] = [];
            VA3C.libraryObjects[parent.id].push(object.id);
        }
        else {
            if (!VA3C.parametricObjects[type]) VA3C.parametricObjects[type] = [];
            VA3C.parametricObjects[type].push(object.id);
        }
    }
    else {
        // add mesh materials to _parametricMaterials ?
    }

    // pos/rot
    var spos = object.userData[_instancingKeys.position].split(',');
    var pos = [parseFloat(spos[0]), parseFloat(spos[1]), parseFloat(spos[2])];
    object.position.fromArray(pos);

    var srot = object.userData[_instancingKeys.rotation].split(',');
    if (srot.length == 3) {
        var euler = [THREE.Math.degToRad(parseFloat(srot[0])), THREE.Math.degToRad(parseFloat(srot[1])), THREE.Math.degToRad(parseFloat(srot[2]))];
        //object.rotation.euleulerOrder = 'ZXY';
        object.rotation.fromArray(euler);
    }
    else if (srot.length == 4) {
        var quat = [parseFloat(srot[0]), parseFloat(srot[1]), parseFloat(srot[2]), parseFloat(srot[3])];
        object.quaternion.fromArray(quat);
    }
    else if (srot.length == 16) {
        var m = [];
        for (var i in srot) {
            m.push(parseFloat(srot[i]));
        }
        object.quaternion.setFromRotationMatrix(new THREE.Matrix4().fromArray(m));
    }

    var scale = getInstanceScale(object, type);
    if (scale) {
        object.scale.fromArray(scale);
    }

    object.castShadow = true;
    object.updateMatrix();
    object.updateMatrixWorld(true);
}

function resetCamera() {
    setStartView();
}

function setTopView() {
    setView(PROJECT.topview);
}

function setStartView() {
    setView(PROJECT.startview);
}

function setView(viewValues, noextents) {
    if (!VA3C.sceneExtents) {
        console.error('Error: scene extents not set');
        return;
    }

    if (viewValues.length === 3) {
        // viewVector is direction vector [x,y,z]
        VA3C.controls.setDirection(viewValues);
    }
    else if (viewValues.length === 2) {
        //viewVector is [az, el] in degrees
        VA3C.controls.setPolarAngles(THREE.Math.degToRad(viewValues[0]), THREE.Math.degToRad(viewValues[1]));
    }

    if (!noextents) {
        zoomExtents();
    }

    forceRender();
}

function saveCanvasToPng() {
    // does not include annotations/labels
    forceRender();
    $('canvas')[0].toBlob(function (blob) {
        saveAs(blob, fullprojectname + '.png');
    });
}

function zoomExtents() {

    if (!VA3C.sceneExtents) {
        console.error('Error: scene extents not set');
        return;
    }

    // fix for portrait (kiosk) zoom
    var radiusFact = 1;
    if (VA3C.camera.aspect < 1) {
        radiusFact = 2.5 / VA3C.camera.aspect;
    }

    zoomTo(VA3C.sceneExtents.center, VA3C.sceneExtents.radius * radiusFact, true);
}

function zoomToObject(object) {
    if (object == VA3C.model) {
        zoomExtents();
        return;
    }
    var objectBox = new THREE.Box3().setFromObject(object);
    zoomTo(objectBox.center(), objectBox.size().length() * 0.7, false, true);
}

function zoomTo(center, radius, forceZoom, camanim) {
    if (radius < 0.001) return;
    if (radius == Infinity) return;

    var offset;
    if (forceZoom || $('#checkautozoom').is(":checked")) {
        var vector = new THREE.Vector3(0, 0, 1);
        offset = vector.applyQuaternion(VA3C.controls.object.quaternion);
        radius = Math.max(VA3C.camera.near * 1.2, radius);
        // Compute offset needed to move the camera back that much needed to center AABB (approx: better if from BB front face)
        var zoomscalar = radius / Math.tan(Math.PI / 180.0 * VA3C.controls.object.fov * 0.5);
        // Compute new camera position
        offset.multiplyScalar(zoomscalar);
    }
    else {
        offset = new THREE.Vector3(0, 0, 0);
        offset.subVectors(VA3C.controls.object.position, VA3C.controls.target);
    }

    var campos = VA3C.controls.object.position.clone();
    campos.addVectors(center.clone(), offset);

    if (camanim) {
        VA3C.isCamAnimating = true;
        VA3C.controls.enabled = true;
        var target = center.clone();
        // cam
        new TWEEN.Tween(VA3C.controls.object.position).to({
            x: campos.x,
            y: campos.y,
            z: campos.z
        }, VA3C.cameraZoomDuration)
          .easing(TWEEN.Easing.Sinusoidal.InOut)
          .start()
          .onComplete(function () {
              setTimeout(clearCameraZoom, 100);
          });
        // target
        new TWEEN.Tween(VA3C.controls.target).to({
            x: target.x,
            y: target.y,
            z: target.z
        }, VA3C.cameraZoomDuration)
          .easing(TWEEN.Easing.Sinusoidal.InOut)
          .start()
          .onComplete(function () {
              setTimeout(clearCameraZoom, 100);
          });
    }
    else {
        // set target
        VA3C.controls.target = center.clone();
        // set camera
        VA3C.controls.object.position.set(campos.x, campos.y, campos.z);
    }

    forceRender();
}

function getBoundingBox(object) {
    if (!object) return null;
    if (object instanceof THREE.Object3D) {
        var box = new THREE.Box3().setFromObject(object);
    }
    else if (Array.isArray(object)) {
        var box;
        for (var i in object) {
            var bb = new THREE.Box3().setFromObject(object[i]);
            if (!box) box = bb;
            else {
                box.expandByPoint(bb.min);
                box.expandByPoint(bb.max);
            }
        }
        return box;
    }

    return null;
}

function clearCameraZoom() {
    if (VA3C.isCamAnimating) {
        TWEEN.removeAll();
        VA3C.isCamAnimating = false;
    }
}


function toggleRenderEnabled(enabled) {
    //if (currentAnim) { requestAnimationFrame(currentAnim); }
    // cancels current animation if one is playing to
    // prevent several concurrent loops calling animate()

    renderEnabled = enabled && windowfocussed;

    VA3C.controls.enabled = renderEnabled;

    //console.log(renderEnabled ? 'start rendering' : 'stop rendering');

    requestAnimationFrame(animate);
}

function forceRender() {
    if (!VA3C) return;
    if (!VA3C.renderer) return;

    if (renderEnabled) return;
    renderForced = true;
    animate();
    renderForced = false;
}

function animate() {

    if (!VA3C) return;

    if (renderEnabled || renderForced || VA3C.isCamAnimating) {
        requestAnimationFrame(animate);

        render();
    }
}

function render() {

    if (!VA3C) return;

    TWEEN.update();

    // headlight
    if (VA3C.headlight) {
        VA3C.headlight.position.copy(VA3C.controls.object.position);
    }

    // skybox
    if (VA3C.cube) {
        VA3C.cube.position.copy(VA3C.controls.object.position);
    }

    VA3C.controls.update();

    updateCameraVerticalAngle();

    processEnvironment();

    if (VA3C.LODs) {
        VA3C.scene.updateMatrixWorld();
        for (var i in VA3C.LODs) {
            VA3C.LODs[i].update(VA3C.camera);
        }
    }

    if (VA3C.settingsAO && VA3C.settingsAO['AO enabled'] && VA3C.effectComposer) {
        // Render depth into depthRenderTarget
        VA3C.scene.overrideMaterial = VA3C.depthMaterial;
        VA3C.renderer.render(VA3C.scene, VA3C.camera, VA3C.depthRenderTarget, true);

        // Render renderPass and SSAO shaderPass
        VA3C.scene.overrideMaterial = null;
        VA3C.effectComposer.render();
    }
    else {
        VA3C.renderer.render(VA3C.scene, VA3C.camera);
    }

    for (var type in VA3C.overlays) {
        var overlay = VA3C.overlays[type];
        overlay.renderer.render(overlay.scene, overlay.camera);
    }

    // html overlays last
    processAnnotations();

}

// clears prop panel, tree and highlight
function clearLastObject() {

    restoreVisualLastObject();

    // hide prop panel
    hideHTMLProperties();

    forceRender();
}

function restoreVisualLastObject() {

    if (!VA3C.lastObject3D || !VA3C.lastObjectMaterials) return;

    // clear highlight
    for (var n = 0; n < VA3C.lastObject3D.children.length; n++) {
        var child = VA3C.lastObject3D.children[n];
        if (VA3C.sceneMeshes.indexOf(child) == -1) {
            continue;
        }
        child.material = VA3C.lastObjectMaterials[n];
    }

    toggleAnnotation(VA3C.lastObject3D.id, false);
    // deselect tree nodes
    //deselectTreeNodes();
    VA3C.lastObject3D = null;
    VA3C.lastObjectMaterials = null;

}

function highlightObject(object) {

    if (!object) return;

    // object must NEVER be a mesh!
    if (object instanceof THREE.Mesh) {
        console.log('[highlightObject] WARNING: unexpected mesh object:')
        console.log(object);
        return;
    }

    if (object == VA3C.model) return; // root node picked in tree

    if (object.children.length == 0) return; // no leafs

    VA3C.lastObjectMaterials = new Array(object.children.length);
    for (var n = 0; n < object.children.length; n++) {
        var child = object.children[n];
        if (VA3C.sceneMeshes.indexOf(child) == -1) {
            continue;
        }
        VA3C.lastObjectMaterials[n] = child.material;
        if (PROJECT.canView === false) {
            child.material = VA3C.highlightMaterial;
        }
    }

    object.visible = true;

    VA3C.lastObject3D = object;

    forceRender();
}

function isGreyedOut(mesh) {
    if (!mesh) return false;
    if (!mesh.userData) return false;
    if (!mesh.userData.origmaterial) return false;
    return true;
}

function makeTransparent(object) {
    for (var n = 0; n < object.children.length; n++) {
        var child = object.children[n];
        if (isGreyedOut(child)) {
            // already assigned
            continue;
        }
        if (!child.material) {
            console.error('no material for', object);
        }
        if (!child.userData) child.userData = {};
        child.userData.origmaterial = child.material; //can be undefined/null
        child.material = VA3C.opacityMaterial;
    }
}

function makeOpaque(object) {
    for (var n = 0; n < object.children.length; n++) {
        var child = object.children[n];
        if (isGreyedOut(child)) {
            child.material = child.userData.origmaterial;
            delete child.userData.origmaterial;
        }
    }
}


// handles mouse pick, ignores mouse drag/move
MousePick = function (renderer) {

    var clientClickX, clientClickY;

    renderer.domElement.addEventListener('mousedown', function (ev) {
        clientClickX = ev.clientX;
        clientClickY = ev.clientY;
    }, false);

    renderer.domElement.addEventListener('mouseup', function (ev) {
        if (ev.target == renderer.domElement) {
            var x = ev.clientX;
            var y = ev.clientY;
            // If the mouse moved since the mousedown then don't consider this a selection
            // consider a tolerance of a few pixels
            if (x == clientClickX && y == clientClickY)
                clickHandler(ev);
        }
    }, false);
}

// derived from THREEx.WindowResize
// adjusts renderer and camera on window resize
WindowResize = function () {
    var callback = function () {
        //console.log('resize container detected');
        updateCameraAspectRatio();
        forceRender();
    }
    window.addEventListener('resize', callback, false);
    //$(window).resize(callback);
    return {
        stop: function () {
            //console.log('resize handler removed');
            //$(window).off("resize", callback);
            window.removeEventListener('resize', callback);
        }
    };
}

// update vertical angle; used by annotations and fog atm
function updateCameraVerticalAngle() {
    // view angle factor (0 = horizontal, 1 = top/bottom)
    VA3C.CAMVERTANGLEFACT = Math.abs(HPI - VA3C.controls.getPolarAngle());
    //VA3C.controls.getAzimuthalAngle() is angle around vert axis
}

function updateCameraAspectRatio() {
    if (!VA3C) return;
    if (!VA3C.renderer) return;

    // notify the renderer of the size change
    // must call setSize with window size first, then get actual size of renderer.domElement
    VA3C.renderer.setSize(window.innerWidth, window.innerHeight);
    updateCanvasSize();

    VA3C.renderer.setSize(VA3C.canvasSize.width, VA3C.canvasSize.height);

    // update the camera
    VA3C.camera.aspect = VA3C.canvasSize.width / VA3C.canvasSize.height;
    // FIXME: clipping planes get messed up when calling camera.updateProjectionMatrix()
    //        but must be done to have the right aspect ratio of rendering
    // NOTE: also occurs with original THREEx.WindowResize
    VA3C.camera.near = 1.0;
    VA3C.camera.far = VA3C.sceneExtents ? VA3C.sceneExtents.radius * 5 : 1000;
    VA3C.camera.updateProjectionMatrix();

    if (VA3C.effectComposer) {
        // Resize renderTargets
        VA3C.ssaoPass.uniforms['size'].value.set(VA3C.canvasSize.width, VA3C.canvasSize.height);
        VA3C.ssaoPass.uniforms['cameraNear'].value = VA3C.camera.near;
        VA3C.ssaoPass.uniforms['cameraFar'].value = VA3C.camera.far;
        var pixelRatio = VA3C.renderer.getPixelRatio();
        var newWidth = Math.floor(VA3C.canvasSize.width / pixelRatio) || 1;
        var newHeight = Math.floor(VA3C.canvasSize.height / pixelRatio) || 1;
        VA3C.depthRenderTarget.setSize(newWidth, newHeight);
        VA3C.effectComposer.setSize(newWidth, newHeight);
    }
}

// called at init and on resize
function updateCanvasSize() {
    // this is the right one!
    var canvasparent = document.getElementById('canvasholder');
    VA3C.canvasSize.left = canvasparent.offsetLeft;
    VA3C.canvasSize.top = canvasparent.offsetTop;
    // clientWidth/clientHeight is size incl padding without border, scrollbars etc
    // see also offsetWidth/offsetHeight for incl border, scrollbars etc
    VA3C.canvasSize.width = canvasparent.clientWidth;
    VA3C.canvasSize.height = canvasparent.clientHeight; // height incl padding without border, scrollbars etc
    VA3C.canvasSize.hwidth = canvasparent.clientWidth / 2; // half
    VA3C.canvasSize.hheight = canvasparent.clientHeight / 2; // half
}

var LIGHT_INTENSITY = 3;
var FOG_NEAR = 20;
var FOG_H, FOG_S, FOG_V;
var SHADOW_MAP_WIDTH = 2048;
var SHADOW_MAP_HEIGHT = 2048;

var configDay = {

    LIGHT_INTENSITY: 1,

    FOG_NEAR: 20,
    FAR: 400,

    FOG_H: 0.59,
    FOG_S: 0.2,
    FOG_V: 1

};

var configNight = {

    LIGHT_INTENSITY: 1.7,

    FOG_NEAR: 1,
    FAR: 100,

    FOG_H: 0,
    FOG_S: 0,
    FOG_V: 0

};

function addEnvironment() {

    if (!VA3C.sceneExtents) {
        console.error('[Error] scene extents not set');
        return;
    }

    VA3C.ambient = new THREE.AmbientLight(0x444444);
    //ambient.color.setHSL(0.1, 0.0, 0.25);
    VA3C.scene.add(VA3C.ambient);

    // headlight, update each frame with camera
    VA3C.headlight = new THREE.PointLight(0xffffff, 1.0);
    VA3C.scene.add(VA3C.headlight);

    // if sunhelper.xml is added with object 'sun' and 'suntarget' make sun with shadow
    if (!VA3C.sunLight && VA3C.sun && VA3C.suntarget) {

        VA3C.renderer.shadowMap.enabled = true;
        VA3C.renderer.shadowMap.type = THREE.PCFSoftShadowMap; //THREE.PCFShadowMap;

        // clipping planes for orthocam are determined by objects with name 'sun' and 'suntarget'from a helper model file
        // near is at sun position (= 1), far is twice distance between sun and target
        var sunpos = VA3C.sun.getWorldPosition();
        var targetdist = sunpos.distanceTo(VA3C.suntarget.getWorldPosition());
        var targetboxsize = new THREE.Box3().setFromObject(VA3C.suntarget).size();
        // ortho size is determined by size of suntarget geometry
        var horthosize = Math.max(targetboxsize.x, targetboxsize.y) / 2; //half

        VA3C.sunLight = new THREE.DirectionalLight(0xffffff, configDay.LIGHT_INTENSITY);
        VA3C.sunLight.castShadow = true;
        VA3C.sunLight.shadow = new THREE.LightShadow(new THREE.OrthographicCamera(-horthosize, horthosize, horthosize, -horthosize, 1, targetdist * 2));
        VA3C.sunLight.shadow.bias = 0.0001;
        VA3C.sunLight.shadow.mapSize.width = SHADOW_MAP_WIDTH;
        VA3C.sunLight.shadow.mapSize.height = SHADOW_MAP_HEIGHT;

        VA3C.sunLight.position.copy(sunpos);
        // use object as target; via position seems not to work
        VA3C.sunLight.target = VA3C.suntarget;

        VA3C.scene.add(VA3C.sunLight);

        if (PROJECT.debug) {
            // debug visual helpers
            VA3C.scene.add(new THREE.DirectionalLightHelper(VA3C.sunLight));
            VA3C.scene.add(new THREE.CameraHelper(VA3C.sunLight.shadow.camera));
        }

        // turn off headlight
        VA3C.headlight.visible = false;

        console.log('[INFO] sun with shadow created from sun helper file');
    }
    else if (!VA3C.sunLight && PROJECT.sun) {

        VA3C.renderer.shadowMap.enabled = true;
        VA3C.renderer.shadowMap.type = THREE.PCFSoftShadowMap; //THREE.PCFShadowMap;

        var suntarget = VA3C.sceneExtents.center.clone();
        var l = VA3C.sceneExtents.radius;// * 2;
        var el = THREE.Math.degToRad(90 - PROJECT.sun[0]);
        var az = THREE.Math.degToRad(PROJECT.sun[1] - 180);
        var offset = v(-Math.cos(az) * Math.sin(el) * l,
                         Math.cos(el) * l,
                        -Math.sin(az) * Math.sin(el) * l);
        var targetdist = offset.length();
        var sunpos = v(0, 0, 0).addVectors(suntarget, offset);
        var targetboxsize = VA3C.sceneExtents.dimensions.clone();
        var horthosize = Math.max(targetboxsize.x, targetboxsize.y) / 2; //half
        VA3C.sunLight = new THREE.DirectionalLight(0xffffff, configDay.LIGHT_INTENSITY);
        VA3C.scene.add(VA3C.sunLight);
        VA3C.sunLight.castShadow = true;
        VA3C.sunLight.shadow = new THREE.LightShadow(new THREE.OrthographicCamera(-horthosize, horthosize, horthosize, -horthosize, 1, targetdist * 2));
        VA3C.sunLight.shadow.bias = 0.0001;
        VA3C.sunLight.shadow.mapSize.width = SHADOW_MAP_WIDTH;
        VA3C.sunLight.shadow.mapSize.height = SHADOW_MAP_HEIGHT;
        VA3C.sunLight.target.position.copy(suntarget);
        VA3C.sunLight.position.copy(sunpos);
        VA3C.sunLight.target.updateMatrix();
        VA3C.sunLight.updateMatrix();

        if (PROJECT.debug) {
            // debug visual helpers
            VA3C.scene.add(new THREE.DirectionalLightHelper(VA3C.sunLight));
            VA3C.scene.add(new THREE.CameraHelper(VA3C.sunLight.shadow.camera));
        }

        // turn off headlight
        VA3C.headlight.visible = false;

        console.log('[INFO] sun with shadow created from elevation and azimuth');
    }
    else {
        console.log('[INFO] no sun created; using headlight');
    }

    if (PROJECT.fog) {
        VA3C.scene.fog = new THREE.Fog(VA3C.backgroundColor, VA3C.sceneExtents.radius / 2, VA3C.sceneExtents.radius * 5);
    }

    if (PROJECT.axes) {
        // axes
        var pivot = v(0, 0, 0);
        var loc = PROJECT.axes[0];
        var size = PROJECT.axes[1];
        if (loc === 'center') {
            pivot = VA3C.sceneExtents.center.clone();
        }
        else if (loc === 'min') {
            pivot = v(VA3C.sceneExtents.min.x, VA3C.sceneExtents.min.y, VA3C.sceneExtents.max.z);
        }
        else if (loc === 'max') {
            pivot = v(VA3C.sceneExtents.max.x, VA3C.sceneExtents.max.y, VA3C.sceneExtents.min.z);
        }

        VA3C.scene.add(new THREE.ArrowHelper(v(1, 0, 0), pivot, size, 0xcc0000));
        VA3C.scene.add(new THREE.ArrowHelper(v(0, 1, 0), pivot, size, 0x00cc00));
        VA3C.scene.add(new THREE.ArrowHelper(v(0, 0, -1), pivot, size, 0x0000cc));
    }

    if (PROJECT.plane) {
        // ground plane
        var color = PROJECT.plane;
        var opacity = 1.0;
        if (Array.isArray(color) == false) {
            color = [0.7, 0.9, 0.7];
        }
        else {
            if (color.length > 3) {
                opacity = color.pop()
            }
        }
        var planecolor = new THREE.Color().fromArray(color).getHex();
        var plane = new THREE.Mesh(
          new THREE.PlaneBufferGeometry(Math.max(10.0, VA3C.sceneExtents.dimensions.x * 1.2), Math.max(10.0, VA3C.sceneExtents.dimensions.z * 1.2)),
          new THREE.MeshBasicMaterial({ color: planecolor, opacity: opacity, transparent: lte(opacity, 0.95) })
        );
        var planepos = new THREE.Vector3(VA3C.sceneExtents.center.x, VA3C.sceneExtents.min.y - 0.01, VA3C.sceneExtents.center.z);
        plane.rotateX(-Math.PI / 2);
        plane.position.add(planepos);
        plane.castShadow = false;
        plane.receiveShadow = false;
        VA3C.scene.add(plane);
    }

    if (PROJECT.skybox && Array.isArray(PROJECT.skybox) && PROJECT.skybox.length == 6) {
        var boxsize = VA3C.sceneExtents.radius * 3;
        var geometry = new THREE.BoxGeometry(boxsize, boxsize, boxsize);
        var loader = new THREE.CubeTextureLoader();
        loader.setCrossOrigin('anonymous');
        var textureCube = loader.load(PROJECT.skybox);
        var material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            envMap: textureCube,
            side: THREE.BackSide
        });
        VA3C.cube = new THREE.Mesh(geometry, material);
        //VA3C.cube.scale.set(500, 500, 500);
        VA3C.scene.add(VA3C.cube);
    }

    if (PROJECT.compass && Array.isArray(PROJECT.compass)) {
        //[img file, css class, <, rotY, <size>>]
        // compass via 2nd scene/camera
        var texture = PROJECT.datafolder + PROJECT.compass[0];
        var compassclass = PROJECT.compass[1];
        var rotVert = PROJECT.compass.length > 2 ? THREE.Math.degToRad(PROJECT.compass[2]) : 0;
        var size = PROJECT.compass.length > 3 ? PROJECT.compass[3] : 100;
        var compassHolder = $('<div id="compass" class="' + compassclass + '"></div>').appendTo($('#maincontainer'));
        if (feqz(size)) size = 100;

        var overlay = {
            renderer: new THREE.WebGLRenderer({ alpha: true }), // transp background
            scene: new THREE.Scene(),
            camera: new THREE.PerspectiveCamera(50, size / size, 1, 1000),
        };

        overlay.renderer.setClearColor(0x000000, 0);
        overlay.renderer.setSize(size, size);
        $(overlay.renderer.domElement).appendTo(compassHolder);
        overlay.camera.up = VA3C.camera.up; // important
        overlay.cameradistance = size * 1.4; // for cam update during render

        var material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
        var compass = createTexturedPlane(texture, material, size, size);
        compass.rotation.z = rotVert;
        compass.rotation.x = -HPI;
        overlay.scene.add(compass);
        VA3C.overlays['compass'] = overlay;

        console.log('[INFO] compass added');
    }

    VA3C.settingsAO = { 'AO enabled': !!PROJECT.ao, 'AO renderMode': 0, 'AO clamp': 1.0, 'AO luminfl': 1.0, 'AO radius': 20.0 };
    VA3C.settingsEnv = { 'Sun': !!VA3C.sunLight };

    setAmbientOcclusion(VA3C.settingsAO['AO enabled']);

}

function createTexturedPlane(texfile, material, width, height, repeatX, repeatY) {
    var plane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
    loadTextureForMaterial(texfile, plane.material, 'map', repeatX, repeatY);
    return plane;
}

function loadTextureForMaterial(texfile, material, map, repeatX, repeatY) {
    var loader = new THREE.TextureLoader();
    // load a resource
    loader.load(
        // resource URL
        texfile,
        // Function when resource is loaded
        function (texture) {
            repeatX = repeatX || 1;
            repeatY = repeatY || repeatX;
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(repeatX, repeatY);
            material[map] = texture;
            material.needsUpdate = true; //important
            forceRender();
        },
        // Function called when download progresses
        function (xhr) {
            //console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        // Function called when download errors
        function (xhr) {
            console.err('[ERROR] failed to load texture', texfile);
        }
    );
}

function openDebugGUI() {

    var guiopen = $('#debugtoggle').is(":checked");

    if (!VA3C.gui) {
        VA3C.gui = new dat.GUI();
        VA3C.gui.add(VA3C.settingsAO, "AO enabled").onChange(toggleAO);
        VA3C.gui.add(VA3C.settingsAO, "AO radius", 1.0, 40.0).onChange(processGuiAORadius);
        VA3C.gui.add(VA3C.settingsAO, "AO clamp", 0, 1).onChange(processGuiClamp);
        VA3C.gui.add(VA3C.settingsAO, "AO luminfl", 0, 1).onChange(processGuiLumInfluence);
        VA3C.gui.add(VA3C.settingsAO, "AO renderMode", { framebuffer: 0, onlyAO: 1 }).onChange(processGuiRenderMode).listen();
        if (VA3C.sunLight) {
            VA3C.gui.add(VA3C.settingsEnv, "Sun").onChange(toggleSun);
        }
    }

    if (guiopen) {
        VA3C.gui.open();
    }
    else {
        VA3C.gui.close();
    }
}

function setAmbientOcclusion(value) {

    VA3C.settingsAO['AO enabled'] = value;

    if (value && !VA3C.effectComposer) {

        // Setup render pass
        var renderPass = new THREE.RenderPass(VA3C.scene, VA3C.camera);

        // Setup depth pass
        VA3C.depthMaterial = new THREE.MeshDepthMaterial();
        VA3C.depthMaterial.depthPacking = THREE.RGBADepthPacking;
        VA3C.depthMaterial.blending = THREE.NoBlending;

        var pars = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
        VA3C.depthRenderTarget = new THREE.WebGLRenderTarget(VA3C.canvasSize.width, VA3C.canvasSize.height, pars);

        // Setup SSAO pass
        VA3C.ssaoPass = new THREE.ShaderPass(THREE.SSAOShader);
        VA3C.ssaoPass.renderToScreen = true;
        //ssaoPass.uniforms[ "tDiffuse" ].value will be set by ShaderPass
        VA3C.ssaoPass.uniforms["tDepth"].value = VA3C.depthRenderTarget.texture;
        VA3C.ssaoPass.uniforms['size'].value.set(VA3C.canvasSize.width, VA3C.canvasSize.height);
        VA3C.ssaoPass.uniforms['cameraNear'].value = VA3C.camera.near;
        VA3C.ssaoPass.uniforms['cameraFar'].value = VA3C.camera.far;
        VA3C.ssaoPass.uniforms['onlyAO'].value = (VA3C.settingsAO['AO renderMode'] === 1);
        VA3C.ssaoPass.uniforms['aoClamp'].value = VA3C.settingsAO['AO clamp'];
        VA3C.ssaoPass.uniforms['radius'].value = VA3C.settingsAO['AO radius'];
        VA3C.ssaoPass.uniforms['lumInfluence'].value = VA3C.settingsAO['AO luminfl'];

        // Add pass to effect composer
        VA3C.effectComposer = new THREE.EffectComposer(VA3C.renderer);
        VA3C.effectComposer.addPass(renderPass);
        VA3C.effectComposer.addPass(VA3C.ssaoPass);
    }

    forceRender();

    console.log('[INFO] ambient occlusion', value);
}

function processGuiRenderMode(value) {

    if (value == 0) {
        VA3C.ssaoPass.uniforms['onlyAO'].value = false; // framebuffer
    }
    else if (value == 1) {
        VA3C.ssaoPass.uniforms['onlyAO'].value = true; // onlyAO
    }

    forceRender();
}

function processGuiAORadius(value) {
    VA3C.ssaoPass.uniforms['radius'].value = value;
    forceRender();
}

function processGuiClamp(value) {
    VA3C.ssaoPass.uniforms['aoClamp'].value = value;
    forceRender();
}

function processGuiLumInfluence(value) {
    VA3C.ssaoPass.uniforms['lumInfluence'].value = value;
    forceRender();
}

function toggleSun(value) {
    if (VA3C.sunLight) {
        VA3C.sunLight.visible = value;
        VA3C.headlight.visible = !value;
        forceRender();
    }
}

function processEnvironment() {
    if (VA3C.scene.fog) {
        // distance to sunlight target (can be sceneExtents.center)
        var targetpos = VA3C.sunLight ? VA3C.sunLight.target.getWorldPosition() : VA3C.sceneExtents.center.clone();
        var targetdist = targetpos.distanceTo(VA3C.controls.object.getWorldPosition());
        var vanglefact = Math.max(0.1, VA3C.CAMVERTANGLEFACT);
        //var scenesize = VA3C.sunLight.shadow.camera.right - VA3C.sunLight.shadow.camera.left; // VA3C.sceneExtents.radius * 2;
        var reldist = targetdist / VA3C.sceneExtents.radius;
        var scenesize = VA3C.sceneExtents.radius * 2;
        var foglimit = Math.max(scenesize, targetdist);
        VA3C.scene.fog.far = Math.max(foglimit, foglimit * Math.max(reldist, vanglefact));
        VA3C.scene.fog.near = Math.max(1, VA3C.scene.fog.far - scenesize);
    }

    for (var type in VA3C.overlays) {
        var overlay = VA3C.overlays[type];
        switch (type) {
            case 'compass': {
                overlay.camera.position.copy(VA3C.camera.position);
                overlay.camera.position.sub(VA3C.controls.target);
                overlay.camera.position.setLength(overlay.cameradistance);
                overlay.camera.lookAt(overlay.scene.position);
            }
        }
    }

}

