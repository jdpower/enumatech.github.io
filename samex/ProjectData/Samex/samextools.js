var fmdataurl = 'ProjectData/Samex/fm.js';

$(document).ready(function () {

    getLocalData(fmdataurl, successGetFMData);

//    <table>
//    <tr><td><a id="fm1234" href="#1234">1234</a></td><td>Chair</td></tr>
//</table>

});

var successGetFMData = function (result) {
    var holder = $('#fmtable');
    if (!result) {
        holder.html('<h2>Failed to load FM data</h2>');
        return;
    }

    if (typeof result === 'string') {
        result = JSON.parse(result);
    }

    if (result.length > 0) {
        holder.html('<h2>Failed to load FM data</h2>');
    }

    holder.html('');

    var table = $('<table></table>').appendTo(holder);
    for (var rowcnt in result) {
        var row = $('<tr class="fmrow"></tr>').appendTo(table);
        for (var cellcnt in result[rowcnt]) {
            //console.log(cellcnt);
            $('<td>' + result[rowcnt][cellcnt] + '</td>').appendTo(row);
            if (cellcnt == 0) {
                row.data({ fmid: result[rowcnt][cellcnt] });
            }
        }
    }

    $(".fmrow").click(function (e) {
        e.preventDefault();
        $(this).blur();
        var fmid = $(this).data().fmid;
        console.log('zoom to', fmid);
        //document.getElementById("viewer").contentWindow.ZoomToFMID(fmid);
        //document.getElementById("viewer").contentWindow.location.hash = fmid;
        document.getElementById('viewer').src='index.html?projectid=SAMEX&levelid=B3#'+fmid;
    });

}