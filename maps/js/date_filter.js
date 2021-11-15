function filterRows() {
  var from = $('#datefilterfrom').val();
  var to = $('#datefilterto').val();

  if (!from && !to) { // no value for from and to
    return;
  }

  from = from || '1600-01-01'; // default from to a old date if it is not set
  to = to || '2999-12-31';

  var dateFrom = moment(from);
  var dateTo = moment(to);

  $('#table tr').each(function(i, tr) {
    //var val = $(tr).find("td:nth-child(3)").text();
    //var dateVal = moment(val, "DD/MM/YYYY");
    var val = $(tr).find("td:nth-child(2)").text();
    var dateVal = moment(val, "YYYY-MM-DD");
    var visible = (dateVal.isBetween(dateFrom, dateTo, null, [])) ? "" : "none"; // [] for inclusive
    $(tr).css('display', visible);
  });
}

//$('#datefilterfrom').on("change", filterRows);
//$('#datefilterto').on("change", filterRows);
