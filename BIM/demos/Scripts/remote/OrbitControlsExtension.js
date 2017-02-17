// extension of THREE.OrbitControls
// allows to set camera angles via azimuth (theta) and elevation (phi) and via diection vector

var EnumaOrbitControls = function (object, domElement) {

    THREE.OrbitControls.call(this, object, domElement);

    this.setDirection = function (viewDirection) {
        // set angle like this
        this.target.set(0, 0, 0);
        // set camera angle
        this.object.position.fromArray(viewVector);
        this.update();
    }

    this.setPolarAngles = function(az, el) {
        var spherical = new THREE.Spherical();
        var offset = new THREE.Vector3();
        var position = this.object.position;
        var quat = new THREE.Quaternion().setFromUnitVectors(this.object.up, new THREE.Vector3(0, 1, 0));
        var quatInverse = quat.clone().inverse();

        offset.copy(position).sub(this.target);
        // rotate offset to "y-axis-is-up" space
        offset.applyQuaternion(quat);
        // angle from z-axis around y-axis
        spherical.setFromVector3(offset);
        spherical.theta = az;
        spherical.phi = el;

        // restrict theta to be between desired limits
        spherical.theta = Math.max(this.minAzimuthAngle, Math.min(this.maxAzimuthAngle, spherical.theta));
        // restrict phi to be between desired limits
        spherical.phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, spherical.phi));
        spherical.makeSafe();
        // restrict radius to be between desired limits
        spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, spherical.radius));
        offset.setFromSpherical(spherical);
        // rotate offset back to "camera-up-vector-is-up" space
        offset.applyQuaternion(quatInverse);
        position.copy(this.target).add(offset);
        this.object.lookAt(this.target);
        this.update();
    }

    Object.defineProperties(this, {

        azimuth: {
            get: function () {
                return this.getAzimuthalAngle();
            },
        },

        elevation: {
            get: function () {
                return this.getPolarAngle();
            },
        },

    });
}

EnumaOrbitControls.prototype = Object.assign(Object.create(THREE.OrbitControls.prototype), {

    constructor: EnumaOrbitControls,

});

