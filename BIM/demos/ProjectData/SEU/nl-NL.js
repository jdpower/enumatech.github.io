// words hardcoded in html, replaced via function 'replaceInPage', case-sens
var LOCALE = {
    'Shanghai Engineering University': '上海工程技术大学科创楼',
    'Welcome to the digital catalog': '欢迎使用入驻企业BIM-3D导航',
    'Select the floor you want to query or use the drop-down list to query the company directory.': '选择楼层或使用搜索功能查询公司目录',
    'Select Another Level': '选择楼层',
    'Company Details': '备选公司和单位',
    'Search': '搜索',
    'Find': '搜索',
    'Help': '帮助',
    'Reset view': '恢复默认视图', // is already set in html
    'Show egress route': '显示出口路线',// is already set in html
    'Management Panel': '管理小组',
    'Level Selector': '级别选择器',
    'Object Properties': '对象属性',
    'Cancel': '取消',
    'Reset View': '重置视图',
    'Top View': '顶视图',
    'Project List': '项目列表',
    'Object Information': '',
    'Remarks': '',
}

// words via variables
var _MSG_SAVING = 'Saving...';
var _MSG_SAVED = 'Data has been saved';
var _MSG_NOFMIDFOUND = 'No ID found';
var _MSG_NOTHINGFOUND = PROJECT.canEdit ? '没有找到' : '没有找到租戶';
var _MSG_NOTENANT = PROJECT.canEdit ? 'No tenant' : '没有提供内容';
var _MSG_NOTHINGSELECTED = '没有选择';
var _MSG_NOROOMS = '- 没有提供房间 -';
var _MSG_NOMATCH = '- 没有找到 -';
var _HTML_NOTHINGSELECTED = '<p class="smallComment center">' + _MSG_NOTHINGSELECTED + '</p>';
var _MSG_AREYOUSURE = '确定?';
var _MSG_PRESSSAVEASSIGNMENT = 'Press Save to store this assignment';
var _MSG_ADDREMOVEROOMS = '[Add/Remove]';
var _MSG_PRESSESCASSIGNMENT = '[Press ESC to stop assignment]';
var _MSG_PUBLICFACILITY = '共工设所';
var _MSG_TENANTDIRECTORY = '租戶名录';
var _MSG_FOUNDOTHERLEVELS = '在其他楼层';
var _MSG_COMPANY = '公司';
var _MSG_UNITID = '单位ID';
var _MSG_UNITS = '单位';
var _MSG_NAME = '名称';
var _MSG_DETAILSOFTENANT = '租戶信息内容';
var _MSG_SEARCHALL = '由租客，FM ID或Revit中的ID搜索';
var _MSG_SEARCHTENANT = '由房客搜索';
var _MSG_SEARCH = '搜索';
var _MSG_YES = '是';
var _MSG_HELP = '帮助';
var _MSG_LOADINGPROJECT = '加载项目';
var _MSG_PLEASEWAIT = '请稍候';
var _MSG_EXAMPLECOMPANY = '公司示例';

// words via meta data
var objectInfoMeta = {
    fmid: { name: 'FM ID', type: 'label' },
    remarks: { name: '备注', type: 'label' }, // Remarks
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
    tname: { name: '名称', type: 'profile' }, // Name
    unitid: { name: '单位ID', type: 'rooms' }, //Unit ID
    //area: { name: 'Area (SQM)', type: 'label' },
    //lease: { name: 'Lease Period', type: 'label' },
    // contract: { name: 'Contract No.', type: 'label' }
}

var tenantRoomsMetaEdit = {
    tname: { name: 'Name', type: 'profiledatalist', options: [], placeholder: '' },
    unitid: { name: '单位ID', type: 'roomassign' },
    unitsalias: { name: '客房 别名', type: 'textbox' },
    area: { name: '面积(SQM)', type: 'label' },
    lease: { name: '租期', type: 'daterangepicker' },
    contract: { name: '合同号', type: 'textbox' }
}

// metadata for tenant profile info in modal panel
var tenantMeta = {
    tname: { name: '名称', type: 'label' },
    contactname: { name: '联系人', type: 'label' }, //contact person
    contactphone: { name: '电话号码', type: 'label' }, //phone
    contactemail: { name: '电子邮件地址', type: 'label' }, //email address
    notes: { name: '备注', type: 'label' }, // notes
}

var tenantMetaAppend = {
    contactname: { name: '联系人', type: 'label' }, //contact person
    contactphone: { name: '电话号码', type: 'label' }, //phone
    contactemail: { name: '电子邮件地址', type: 'label' }, //email address
    //notes: { name: '备注', type: 'label' }, // notes
}

var tenantMetaEdit = {
    tname: { name: '名称', type: 'textbox' },
    contactname: { name: '联系人', type: 'textbox' },
    contactphone: { name: '电话号码', type: 'textbox' },
    contactemail: { name: '电子邮件地址', type: 'textbox' },
    notes: { name: '备注', type: 'textbox' }, //notes
}

var keyboardDisplay = {'cancel':'取消', 'bksp':'退格'}
