// selected file data
var _selectedFile = null;
// blob upload url
var _submitUri = null;
// holds all commit data for db except file info (that is held by _selectedFile)
var _uploaderData = {};
// function to call when upload has been cancelled by user
var _afterCancelFunc = function () {
    closeUploaderPanel();
}
// upload file kinds
var _uploadKinds = {
    model: 'model', //level model
    doc: 'doc', //level doc
    tenantdoc: 'tenantdoc',
    tenantroomsdoc: 'tenantroomsdoc'
};

// uploader panel
var _panelUploader;
//for abort
var _uploaderAjax;
// flag indicating if upload was cancelled by user
var _cancelledByUser = false;

var reader = new FileReader();
var lastPerc = -1;
var maxBlockSize = 256 * 1024;//Each file will be split in 256 KB.
var numberOfBlocks = 1;
var currentFilePointer = 0;
var totalBytesRemaining = 0;
var blockIds = new Array();
var blockIdPrefix = "block-";
var bytesUploaded = 0;

$(document).ready(function () {
    $("#output").hide();
    $("#uploadFileSelector").bind('change', handleFileSelect);
    if (window.File && window.FileReader && window.FileList && window.Blob) {
        // Great success! All the File APIs are supported.
    } else {
        alert('The File APIs are not fully supported in this browser.');
    }
});

// uploader UI
function showUploader(model, commiturl, kind, success, fail, paneltitle) {

    _uploaderData = {
        // ex. Manage/UpdateProjectEntry
        url: commiturl,
        // model for which the upload is intended
        model: model,
        // file kind
        kind: kind,
        // prefix to add before selected file name
        urlprefix: $("#downloadUrlPrefix").val(),
        // function to call when upload succeeded
        success: success,
        // function to call when upload failed
        fail: fail,
    }

    _panelUploader = $.jsPanel({
        theme: "grey",
        paneltype: 'modal',
        content: $('#uploaderholder'),
        headerTitle: paneltitle,
        contentSize: { width: 600, height: 150 }, //'auto'
        callback: function (panel) {
            $(".jsPanel-btn-close", panel)
                // remove default handler
                .off()
                // bind new handler
                .click(function () {
                    closeUploaderPanel();
                });
            $("button", this.content).click(function () { panel.close(); });
        },
    });


    $('#uploadfileselector').show();
    $('#uploaderholder').show();
}

function closeUploaderPanel() {

    if (!_panelUploader) return;

    if (_uploaderAjax) {
        cancelUpload();
        return;
    }

    // normal close
    // re-append content to container and hide it
    var content = $('#uploaderholder').detach();
    content.hide();
    $('#maincontainer').append(content);
    _panelUploader.close();
    $('#uploadfileselector').show();
}

function uploadFile() {
    console.log('upload');
    $('#uploadfileselector').hide();
    uploadFileInBlocks();
}

function onUploadStarted() {
    _cancelledByUser = false;
    $('#progressUploadmsg').html('Uploading file ' + $("#fileInfo").text());
    $('#progressUploadCancel').show();
    $('#progressBarHolderUpload').show();
}

function onUploadDone() {
    _uploaderAjax = null;
    $('#progressBarHolderUpload').hide();
}

function updateProgressBarUpload(iPerc) {
    $('#progressBarUpload').css('width', iPerc + '%');
    $('#progressBarUpload').html(iPerc + '%');
}

function cancelUpload() {
    _cancelledByUser = true;
    if (_uploaderAjax) {
        // clean abort
        _uploaderAjax.abort();
        _uploaderAjax = null;
    }

    $('#progressBarHolderUpload').hide();
    if (_afterCancelFunc) setTimeout(_afterCancelFunc, 500);
    console.log('[INFO] upload cancelled by user');
    return;
}

// end uploader UI

//Read the file and find out how many blocks we would need to split it.
function handleFileSelect(e) {
    maxBlockSize = 256 * 1024;
    currentFilePointer = 0;
    totalBytesRemaining = 0;
    var files = e.target.files;
    _selectedFile = files[0];
    console.log('selected file:', _selectedFile);

    var ftypemsg = '';
    if (_selectedFile.type && _selectedFile.type !== '')
        ftypemsg = ', type:' + _selectedFile.type;

    $("#fileInfo").text(_selectedFile.name + ' (size:' + (_selectedFile.size / 1000000.0).toFixed(2) + 'MB' + ftypemsg + ')');
    $("#output").show();

    //var title = $("#uploadkind").val() == 'model' ? '3D Model File Uploader' : 'Document File Uploader';
    //title += ' - File: ' + _selectedFile.name + '(' + (_selectedFile.size / 1000000.0).toFixed(2) + 'MB)';
    //_panelUploader.headerTitle(title);

    var fileSize = _selectedFile.size;
    if (fileSize < maxBlockSize) {
        maxBlockSize = fileSize;
        //console.log("max block size = " + maxBlockSize);
    }
    totalBytesRemaining = fileSize;
    if (fileSize % maxBlockSize === 0) {
        numberOfBlocks = fileSize / maxBlockSize;
    } else {
        numberOfBlocks = parseInt(fileSize / maxBlockSize, 10) + 1;
    }
    console.log("total blocks = " + numberOfBlocks);
    var baseUrl = $("#uploadsasUrl").val();
    var indexOfQueryStart = baseUrl.indexOf("?");
    _submitUri = baseUrl.substring(0, indexOfQueryStart) + '/' + _selectedFile.name + baseUrl.substring(indexOfQueryStart);
    console.log(_submitUri);
}

reader.onloadend = function (evt) {
    if (evt.target.readyState === FileReader.DONE) { // DONE == 2
        var uri = _submitUri + '&comp=block&blockid=' + blockIds[blockIds.length - 1];
        var requestData = new Uint8Array(evt.target.result);
        // hold _uploaderAjax for abort
        _uploaderAjax = $.ajax({
            url: uri,
            type: "PUT",
            data: requestData,
            processData: false,
            beforeSend: function (xhr) {
                lastPerc = -1;
                xhr.setRequestHeader('x-ms-blob-type', 'BlockBlob');
                xhr.setRequestHeader('Content-Length', requestData.length);
            },
            success: function (data, status) {
                if (lastPerc < 0) {
                    // first update
                    onUploadStarted();
                }
                //console.log(data);
                //console.log(status);
                bytesUploaded += requestData.length;
                var iPerc = Math.round(bytesUploaded / _selectedFile.size * 100.0);
                if (lastPerc != iPerc) {
                    updateProgressBarUpload(iPerc);
                    lastPerc = iPerc;
                    if (lastPerc >= 100) {
                        onUploadDone();
                    }
                }
                uploadFileInBlocks();
            },
            error: function (xhr, desc, err) {
                if (_cancelledByUser == false) {
                    console.log('[ERROR] upload in blocks failed');
                    console.log(desc);
                    console.log(err);
                    alert('Error during upload');
                    cancelUpload();
                }
            }
        });
    }
};

function uploadFileInBlocks() {
    if (totalBytesRemaining > 0) {
        //console.log("current file pointer = " + currentFilePointer + " bytes read = " + maxBlockSize);
        var fileContent = _selectedFile.slice(currentFilePointer, currentFilePointer + maxBlockSize);
        var blockId = blockIdPrefix + pad(blockIds.length, 6);
        //console.log("block id = " + blockId);
        blockIds.push(btoa(blockId));
        reader.readAsArrayBuffer(fileContent);
        currentFilePointer += maxBlockSize;
        totalBytesRemaining -= maxBlockSize;
        if (totalBytesRemaining < maxBlockSize) {
            maxBlockSize = totalBytesRemaining;
        }
    } else {
        console.log('[INFO] upload file finished');
        commitBlockList();
        commitViewModel();
    }
}
         
function commitBlockList() {

    var uri = _submitUri + '&comp=blocklist';
    //console.log('commitBlockList URI:', uri);
    var requestBody = '<?xml version="1.0" encoding="utf-8"?><BlockList>';
    for (var i = 0; i < blockIds.length; i++) {
        requestBody += '<Latest>' + blockIds[i] + '</Latest>';
    }
    requestBody += '</BlockList>';
    //console.log(requestBody);
    $.ajax({
        url: uri,
        type: "PUT",
        data: requestBody,
        beforeSend: function (xhr) {
            // TODO: detect our file format
            if (_selectedFile.name.toLowerCase().endsWith('.enumavr')) {
                xhr.setRequestHeader('x-ms-blob-content-encoding', 'gzip');
            }
            else if (_selectedFile.type == "application/x-gzip") {
                xhr.setRequestHeader('x-ms-blob-content-encoding', 'gzip');
            }
            else {
                xhr.setRequestHeader('x-ms-blob-content-type', _selectedFile.type);
            }
            xhr.setRequestHeader('Content-Length', requestBody.length);
        },
        success: function (data, status) {
            console.log('[INFO] update file info in blob database finished');
            //console.log(data);
            //console.log(status);
        },
        error: function (xhr, desc, err) {
            console.log('[ERROR] update file info in blob database failed');
            console.log(desc);
            console.log(err);
        }
    });
}

function commitViewModel() {
    // update dbase entry

    // assign full url to model member depending on upload kind
    var fileUri = _uploaderData.urlprefix + '/' + _selectedFile.name;

    switch (_uploaderData.kind) {
        case _uploadKinds.doc:
            _uploaderData.model.DocumentUrl = fileUri;
            break;
        case _uploadKinds.model:
            _uploaderData.model.ModelUrl = fileUri;
            break;
        case _uploadKinds.tenantdoc:
            if (_uploaderData.model.Tenant) {
                _uploaderData.model.Tenant.DocumentUrl = fileUri;
            }
            else {
                _uploaderData.model.DocumentUrl = fileUri;
            }
            break;
        case _uploadKinds.tenantroomsdoc:
            if (_uploaderData.model.TenantRooms) {
                _uploaderData.model.TenantRooms.DocumentUrl = fileUri;
            }
            else {
                _uploaderData.model.DocumentUrl = fileUri;
            }
            break;
        case _uploadKinds.model:
            _uploaderData.model.ModelUrl = fileUri;
            break;
        default:
            console.error('[ERROR] invalid upload kind');
            return;
    }

    updateModel(_uploaderData.url, _uploaderData.model, _uploaderData.success, _uploaderData.fail);
}
