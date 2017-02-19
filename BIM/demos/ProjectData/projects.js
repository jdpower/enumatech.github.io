// must have var PROJECTS
var PROJECTS = {
    'WestGate': {
        title: 'West Gate Business Park',
        //copyright: 'Copyright (c) 2016 Atelier Vitec',
        mode: 'generic',
        projectFile: './ProjectData/WestGate.js',
        dataFolder: './ProjectData/WestGate/',
        includes: ['./Scripts/generic/viewergeneric.js'],
        role: 'editor', //'viewer'
        fog: true,
        ao: false, // ambient occlusion
        sun: [60.8, 137.5], // el, az (E)
        compass: ['compass.png', 'compass', 0, 100], //[image, css class, extra vert.axis rot in deg, size in pixels]
    },
    'SUESSP': {
        title: 'Shanghai Engineering University',
        //branding: 'Copyright (c) 2016 GreenCity',
        //brandinglogo: 'LOGO.png',
        mode: 'tenants',
        startview: [135, 45], //[az, el] or direction vector as in [1,1,1]
        topview: [180, 0], //[az, el] or direction vector as in [0,1,0]
        projectFile: './ProjectData/SEU.js',
        //localeFile: './ProjectData/SEU/zh-CN.js',
        helpFile: './ProjectData/SEU/help.js',
        levels: ['B1', '1F', '2F', '3F', '4F', '5F', '6F', '7F', '8F', '9F', '10F', '11F'], //, 'RF'],
        dataFolder: './ProjectData/SEU/',
        includes: ['./Scripts/tenants/uploader2.js', './Scripts/pinyinmap.js', './Scripts/tenants/fmmanager.js', './Scripts/tenants/viewertenants.js'],
        role: 'viewer',
        datamapping: {
            '/Home/GetObjectPropertiesFilter': 'ObjectPropertiesFilter.txt',
            '/Home/ExportJSONToFile': 'exportTenantInfoJSON', //function
            //'/Home/ListTenants': 'ListTenants.js', // not used; tenants are collected from level contract datas
            '/Home/ListTenantRooms': '<L>.js',
            '/Home/GetTenantRoomsByTenantName': 'findLocalTenantByName', //function
        },
        // env
        compass: ['compass.png', 'compass', 180, 100], //[image, css class, extra vert.axis rot in deg, size in pixels]
    },
    'SUESSPVR': {
        title: 'Shanghai Engineering University',
        //branding: 'Copyright (c) 2016 GreenCity',
        //brandinglogo: 'LOGO.png',
        mode: 'tenants',
        startview: [0,0,0], //[az, el] or direction vector as in [1,1,1], in webVR offset from center
        topview: [180, 0], //[az, el] or direction vector as in [0,1,0]
        projectFile: './ProjectData/SEU.js',
        //localeFile: './ProjectData/SEU/zh-CN.js',
        //helpFile: './ProjectData/SEU/help.js',
        levels: ['B1', '1F', '2F', '3F', '4F', '5F', '6F', '7F', '8F', '9F', '10F', '11F'], //, 'RF'],
        dataFolder: './ProjectData/SEU/',
        includes: ['./Scripts/tenants/uploader2.js', './Scripts/pinyinmap.js', './Scripts/tenants/fmmanager.js', './Scripts/tenants/viewertenants.js'],
        role: 'viewer',
        datamapping: {
            '/Home/GetObjectPropertiesFilter': 'ObjectPropertiesFilter.txt',
            '/Home/ExportJSONToFile': 'exportTenantInfoJSON', //function
            //'/Home/ListTenants': 'ListTenants.js', // not used; tenants are collected from level contract datas
            '/Home/ListTenantRooms': '<L>.js',
            '/Home/GetTenantRoomsByTenantName': 'findLocalTenantByName', //function
        },
        // env
        //compass: ['compass.png', 'compass', 180, 100], //[image, css class, extra vert.axis rot in deg, size in pixels]
    },
    'YX': {
        title: 'Project X',
        //mode: 'generic',
        mode: 'tenants',
        projectFile: './ProjectData/YX.js',
        levels: ['10F'], // for project selector; model details inside projectFile
        dataFolder: './ProjectData/YX/',
        includes: ['./Scripts/tenants/uploader2.js', './Scripts/tenants/fmmanager.js', './Scripts/tenants/viewertenants.js'],
        role: 'editor', //'viewer'
        datamapping: {
            '/Home/GetObjectPropertiesFilter': 'ObjectPropertiesFilter.txt',
            '/Home/ExportJSONToFile': 'exportTenantInfoJSON', //function
            //'/Home/ListTenants': 'ListTenants.js', // not used; tenants are collected from level contract datas
            //'/Home/ListTenantRooms': '<L>.js',
            '/Home/GetTenantRoomsByTenantName': 'findLocalTenantByName', //function
        },
        // env
        fog: false,
        //plane: [0.8, 1, 0.8, 0.5], //color, opac
        axes: ['min', 10.0], //location (min/max/center/origin), size
        sun: [60.8, 137.5], // el, az (E)
        compass: ['compass.png', 'compass', 0, 100], //[image, css class, extra vert.axis rot in deg, size in pixels]
    },
    'TianjinHenglung': {
        title: 'Tianjin Henglung',
        mode: 'tenants',
        projectFile: './ProjectData/TianjinHenglung.js',
        levels: ['B3', 'B3 (rev1)', 'B3 (rev2)', 'B3 (rev3)', 'B3 (rev4)'], // for project selector; model details inside projectFile
        dataFolder: './ProjectData/TianjinHenglung/',
        includes: ['./Scripts/tenants/uploader2.js', './Scripts/tenants/fmmanager.js', './Scripts/tenants/viewertenants.js'],
        role: 'editor', //'viewer'
        datamapping: {
            '/Home/GetObjectPropertiesFilter': 'ObjectPropertiesFilter.txt',
            '/Home/ExportJSONToFile': 'exportTenantInfoJSON', //function
        },
        // env
        fog: false,
        //plane: [0.8, 1, 0.8, 0.5], //color, opac
        axes: ['min', 10.0], //location (min/max/center/origin), size
        sun: [60.8, 137.5], // el, az (E)
        compass: ['compass.png', 'compass', 0, 100], //[image, css class, extra vert.axis rot in deg, size in pixels]
    },
    'SAMEX': {
        title: 'Samex FM',
        branding: ' ',
        brandinglogo: 'enuma.png',
        mode: 'tenant',
        startview: [135, 45], //[az, el] or direction vector as in [1,1,1]
        topview: [180, 0], //[az, el] or direction vector as in [0,1,0]
        projectFile: './ProjectData/Samex.js',
        //localeFile: './ProjectData/Samex/zh-CN.js',
        //helpFile: './ProjectData/Samex/help.js',
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
