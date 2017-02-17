var urlprefix = '../demos/?'
function showDemo(title, projectid, levelid, role) {
    if (!projectid) return;
    var url = urlprefix;
    url += 'projectid=' + projectid;
    if (levelid) url += '&levelid=' + levelid;
    if (role) url += '&role=' + role;

    $.jsPanel({
        theme: "Black filledlight",
        paneltype: 'modal',
        content: $('<iframe id="previewframe" src="' + url + '"></iframe>'),
        headerTitle: title,
        contentSize: { width: $(window).width(), height: $(window).height() - 40 },
    });

    $('.savebuttons').prop('disabled', false);

}
