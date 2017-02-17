// must have var PROJECTS
var PROJECTS = {
    'SAMEX': {
        title: 'Samex Demo',
        branding: ' ',
        brandinglogo: 'enuma.png',
        mode: 'tenant',
        startview: [135, 45], //[az, el] or direction vector as in [1,1,1]
        topview: [180, 0], //[az, el] or direction vector as in [0,1,0]
        projectFile: './ProjectData/Samex.js',
        localeFile: './ProjectData/x/zh-CN.js',
        helpFile: './ProjectData/x/help.js',
        levels: ['B3'],
        dataFolder: './ProjectData/Samex/',
        includes: ['./Scripts/tenants/fmmanager.js', './Scripts/tenants/viewertenants.js'],
        role: 'editor',
        levelid: 'B3',
        datamapping: {
            '/Home/GetObjectPropertiesFilter': 'ObjectPropertiesFilter.txt',
            '/Home/ExportJSONToFile': 'exportTenantInfoJSON', //function
            //'/Home/ListTenants': 'ListTenants.js', // not used; tenants are collected from level contract datas
            //'/Home/ListTenantRooms': '<L>.js',
            //'/Home/GetTenantRoomsByTenantName': 'findLocalTenantByName', //function
        },
        // env
        compass: ['compass.png', 'compass', 180, 100], //[image, css class, extra vert.axis rot in deg, size in pixels]
    },
};
