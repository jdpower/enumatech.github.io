var urlprefix = '../demos/';

var COMMONINSTRUCTIONS =
"<div class='title'>Navigation:</div>" +
"<div>Left mouse button: Rotate</div>" +
"<div>Right mouse button: Pan</div>" +
"<div>Mouse wheel: Zoom</div>" +
"<div>Click 3D object: Zoom to object</div>";

var DEMOPANELSRC =
'<div class="col-xs-12 col-md-12 demopanel"><div class="row">' +
'<div class="col-xs-12 col-md-10 demoframeholder"><iframe id="demoframe" src="$URL$"></iframe></div>' +
'<div class="col-xs-12 col-md-2 demoinstructions">$INSTRUCTIONS$</div>' +
'</div></div>';

var DEMOS = {
    'ProjectX-nomenu': {
        projectid: 'YX',
        levelid: '10F',
        title: 'Revit BIM model converted to BIM 3D using EnumaVR Export tools',
        role: 'editor',
        filter: ["arch", "str", "mep", "fs"],
        menus: 'off',
    },
    'ProjectX-properties': {
        projectid: 'YX',
        levelid: '10F',
        title: 'Revit BIM model in BIM 3D with filtered object properties',
        role: 'editor',
        filter: ["arch", "str", "mep", "fs"],
        menus: 'leftopen noviewfilter',
        instructions: 'Click an object to diplay its properties.<hr>',
    },
    'ProjectX-viewfilter': {
        projectid: 'YX',
        levelid: '10F',
        title: 'Revit BIM model in BIM 3D with view filters',
        role: 'editor',
        filter: ["arch", "str", "mep", "fs"],
        menus: 'leftopen',
        instructions: 'Turn view filters on and off in left menu.<hr>',
    },
    'SUESSP-editor': {
        projectid: 'SUESSP',
        levelid: '4F',
        title: 'Revit BIM model in BIM 3D for facility managers',
        role: 'editor',
        //filter: ["arch", "str", "mep", "fs"],
        menus: 'rightopen nofminfo',
        instructions:
            'Move mouse over Company Directory in right panel to highlight the rooms for each company<br><br>' +
            'Use the Search field to locate a company by name (can be on another building level)<br><br>' +
            'Click on a room in 3D window to display the tenant contract.<br><br>' +
            'Note that tenant contract details can be modified.<hr>',
    },
    'SUESSP-viewer': {
        projectid: 'SUESSP',
        levelid: '4F',
        title: 'Revit BIM model in BIM 3D for general public',
        role: 'viewer',
        //filter: ["arch", "str", "mep", "fs"],
        menus: 'rightopen nofminfo',
        instructions:
            'Move mouse over Company Directory in right panel to highlight the rooms for each company<br><br>' +
            'Use the Search field to locate a company by name (can be on another building level)<br><br>' +
            'Click on a room in 3D window to display the tenant contract.<br><br>' +
            'Note that only basic company information is shown.<hr>',
    },
    'WestGate-view': {
        projectid: 'WestGate',
        title: '3D Studio Max model in BIM 3D',
        menus: 'off',
        instructions: 'Click a building to zoom into it<hr>',
    },
    'WestGate-data': {
        projectid: 'WestGate',
        title: '3D Studio Max model in BIM 3D with integrated external company directory',
        menus: 'rightopen',
        instructions: 'Click a building to display the company directory for this building<hr>',
    },
    'Samex-data': {
        page: 'fmsamex.html',
        title: 'A single webpage with on left an existing Facility Management system and on right the connected BIM 3D environment',
        instructions: 'Click an item in the FM system table to focus on the corresponding object in BIM 3D<hr>',
    },
}

function getDemoPanelContent(demo) {
    var url = urlprefix;
    if (demo.projectid) {
        url += '?projectid=' + demo.projectid || '';
        if (demo.levelid) url += '&levelid=' + demo.levelid;
        if (demo.role) url += '&role=' + demo.role;
        if (demo.menus) url += '&menus=' + demo.menus;
        url += '&demo=1'; //demo mode
    }
    else if(demo.page) {
        url += demo.page;
    }

    var instr = (demo.instructions || '') + COMMONINSTRUCTIONS;

    return $(DEMOPANELSRC.replace('$URL$', url).replace('$INSTRUCTIONS$', instr));
}

function showDemo(demoid) {
    if (!demoid) return;
    if (DEMOS.hasOwnProperty(demoid) == false) return;

    $.jsPanel({
        theme: "Black filledlight",
        paneltype: 'modal',
        content: getDemoPanelContent(DEMOS[demoid]),
        headerTitle: DEMOS[demoid].title,
        contentSize: { width: $(window).width(), height: $(window).height() - 40 },
    });

    $('.savebuttons').prop('disabled', false);

}
