let csvData;
let geojsonData;
let map;
let geojsonLayer;
var info = L.control();
let selectedColumn = 'ГЕРБ-СДС';

document.getElementById("csvDropdown").addEventListener("change", function(event) {
    updateGeojson(event).then(populateDropdown); 
});

document.getElementById('showInfo').addEventListener('click', showInfoBox);
document.getElementById('hideInfo').addEventListener('click', showInfoBox);

loadGeoJSON('apr21').then(initializeMap); 

function loadCSV(el_date) {
    const csvFilename = "../../assets/data/mestni/sofia_" + el_date + "_pct.csv";

    return new Promise((resolve, reject) => {
        Papa.parse(csvFilename, {
            download: true,
            header: true,
            dynamicTyping: true,
            complete: (result) => {
                csvData = result.data;
                resolve(result);  
            },
            error: (error) => {
                reject(error); 
            }
        });
    });
}

function updateGeojson(event) {
    const el_date = event.target.value;

    return loadGeoJSON(el_date)
        .then(() => {
            map.removeLayer(geojsonLayer);

            geojsonLayer = L.geoJson(geojsonData, {
                style: style,
                onEachFeature: onEachFeature
            }).addTo(map);
        })
        .catch(error => {
            console.error("Failed to load new GeoJSON data:", error);
        });
}

function loadGeoJSON(el_date) {
  const jsonFile = "../../assets/data/mestni/sofia_" + el_date + ".json";

  return fetch(jsonFile)
    .then((response) => response.json())
    .then((data) => {
      geojsonData = data;
      return loadCSV(el_date); 
    });
}

function matchData(columnName) { // TODO: get rid of this (no need to add data to the GeoJSON features; you can fetch data dynamically from the csv as needed)
  geojsonData.features.forEach((feature) => {
    const match = csvData.find((row) => ('0' + row.id).slice(-9) === feature.properties.sid); 
    if (match) {
      feature.properties[columnName] = match[columnName];
      feature.properties['total'] = match['total']; 
      feature.properties['eligible_voters'] = match['eligible_voters']; 
      feature.properties['активност'] = match['активност']; 
    } else {
      console.log('no match ', columnName)
      feature.properties[columnName] = NaN;
      feature.properties['total'] = NaN; 
      feature.properties['eligible_voters'] = NaN; 
      feature.properties['активност'] = NaN; 
    }
  });
}

function style(feature) {
	return {
		weight: 2,
		opacity: 1,
		color: 'white',
		dashArray: '3',
		fillOpacity: 0.7,
        fillColor: getColor(feature.properties[selectedColumn]),
	};
}

function highlightFeature(e) {
	var layer = e.target;

	layer.setStyle({
		weight: 5,
		color: '#666',
		dashArray: '',
		fillOpacity: 0.7
	});

	if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
		layer.bringToFront();
	}

	info.update(layer.feature.properties, selectedColumn);
}

function zoomToFeature(e) {
	map.fitBounds(e.target.getBounds());
}

function resetHighlight(e) {
	geojsonLayer.resetStyle(e.target);
	info.update(undefined, selectedColumn);
}

function onEachFeature(feature, layer) {
	layer.on({
		mouseover: highlightFeature,
		mouseout: resetHighlight,
		click: zoomToFeature,
		dbclick: function(e) {
            highlightFeature(e);
            zoomToFeature(e);
        }
	});
}

function initializeMap() {
  map = L.map('map').setView([42.691, 23.333], 12);

  var tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  	maxZoom: 19,
  	attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>|<a href="https://twitter.com/petar_baka">petar_baka</a>|<a href="https://data-for-good.bg/">Данни за добро</a>'
  }).addTo(map);

  geojsonLayer = L.geoJson(geojsonData, {
   	style: style,
  	onEachFeature: onEachFeature
  }).addTo(map);

  info.onAdd = function (map) {
  	this._div = L.DomUtil.create('div', 'info');
  	this.update();
  	return this._div;
  };

  info.update = function (props, selectedColumn) {
    var selectedYear = document.getElementById('csvDropdown');
    var selectedYearText = selectedYear.options[selectedYear.selectedIndex].textContent;;
    var table = ''; 
  	var textbox = '<h4>Резултати ' + selectedColumn + ' (' + selectedYearText + ')</h4>';

    if (props) {
        table = generateTableHtmlForRowById(props.sid);

        textbox += '<b>Секция ' + props.sid + '</b><br>';

        if (selectedColumn !== 'активност') {
            textbox += selectedColumn + ' гласове: ' +  Math.round(props[selectedColumn]*props['total']) + '<br>' 
        } else {
            // TODO: breakdown valid votes, invalid votes, total 
            // TODO: breakdown initial voter list, added to voter list, total 
            textbox += 'Общо валидни гласове: ' +  Math.round(props[selectedColumn]*props['eligible_voters']) + '<br>' 
            textbox += 'Избиратели по списък: ' +  props['eligible_voters'] + '<br>'
        }
        textbox += selectedColumn + ` (%): ${isNaN(props[selectedColumn]) ? props[selectedColumn] : (100*props[selectedColumn]).toFixed(1)}<br>`
        textbox += table + '<br>'
        textbox += 'Общо валидни гласове: ' +  props['total']  + '<br>'
        textbox += 'Избиратели по списък: ' +  props['eligible_voters'] + '<br>'
        textbox += `Валидни гласове/избиратели по списък: ${isNaN(props['активност']) ? props['активност'] : props['активност'].toFixed(2)}<br>`
    } else {
        textbox += 'Посочете секция.'
    };

  	this._div.innerHTML = textbox;
  };

  info.addTo(map);

  var legend = L.control({position: 'bottomleft'});

  legend.onAdd = function (map) {

      var div = L.DomUtil.create('div', 'info legend');
      var grades = [0, .1, .2, .3, .4, .5, .6, .7, .8];
      var labels = [];
      var from, to;

      for (var i = 0; i < grades.length; i++) {
          from = grades[i];
          to = grades[i + 1];

          labels.push(
              '<i style="background:' + getColor(from + 0.0001) + '"></i> ' +
              from + (to ? '&ndash;' + to : '+'));
      }

      div.innerHTML = labels.join('<br>');
      return div;
  };

  legend.addTo(map);

  populateDropdown();
  document.getElementById("columnsDropdown").addEventListener("change", updateColumn);
}


function populateDropdown() {
  const dropdown = document.getElementById("columnsDropdown");
  const columns = Object.keys(csvData[0]);
  let parties = [];
  const excluded = ['id', 'eligible_voters', 'total'];

  dropdown.innerHTML = ''; 

  columns.forEach((column) => {
    
    if (! excluded.includes(column)) { 
      const option = document.createElement("option");
      option.value = column;
      option.textContent = column;
      dropdown.appendChild(option);
      parties.push(column)
    }
  });

  if ((selectedColumn == null) || !( columns.includes(selectedColumn))) { 
    selectedColumn = parties[0]; 
  } else if (columns.includes(selectedColumn)) {
    dropdown.value = selectedColumn;
  };

  matchData(selectedColumn);
  geojsonLayer.setStyle(feature => {
    return {
      fillColor: getColor(feature.properties[selectedColumn]),
      
    };
  });

  info.update(undefined, selectedColumn);
}

function updateColumn(event) {
  selectedColumn = event.target.value;
  matchData(selectedColumn);
  geojsonLayer.setStyle(feature => {
    return {
      fillColor: getColor(feature.properties[selectedColumn]),
      
    };
  });
  info.update(undefined, selectedColumn);
}

function generateTableHtmlForRowById(targetId) {
    
    const targetRow  = csvData.find((row) => ('0000000' + row.id).slice(-9) === targetId); 

    if (!targetRow) return '';

    let html = '<table>';

    html += '<thead><tr>';
    html += '<th>Партия/Кандидат</th>';
    html += '<th>Гласове</th>';
    html += '<th>Гласове/<br>общо валидни</th>';
    html += '</tr></thead>';

    html += '<tbody><tr>';
    for (let key in targetRow) {
        if (key !== "total" && key !== "id" && key !== 'eligible_voters' && key !== 'активност') {  
            const originalValue = targetRow[key];
            const multipliedValue = originalValue * targetRow.total;

            html += `<tr>`;
            html += `<td>${key}</td>`;
            html += `<td>${Math.round(multipliedValue)}</td>`;
            html += `<td>${isNaN(originalValue) ? originalValue : originalValue.toFixed(2)}</td>`;
            html += `</tr>`;
        }
    }
    html += '</tr></tbody>';

    html += '</table>';
    return html;
}

function interpolateColor(color1, color2, factor) {
    const r = Math.round(color1[0] + factor * (color2[0] - color1[0]));
    const g = Math.round(color1[1] + factor * (color2[1] - color1[1]));
    const b = Math.round(color1[2] + factor * (color2[2] - color1[2]));
    return `rgb(${r}, ${g}, ${b})`;
}

function getColor(d) {
    const colors = [ // check out https://colorbrewer2.org/?type=sequential&scheme=YlOrRd&n=9
        [255,255,204],
        [255,237,160],
        [254,217,118],
        [254,178,76],
        [253,141,60],
        [252,78,42],
        [227,26,28],
        [189,0,38],
        [128,0,38]
    ];

	if (isNaN(d)) return 'rgb(255,255,204)';
    if (d <= 0) return 'rgb(255,255,204)';
    if (d >= 0.8) return 'rgb(128,0,38)';

    const index = Math.floor(d * 10); 
    const factor = (d * 10) - index;  

    return interpolateColor(colors[index], colors[index + 1], factor);
}

function showInfoBox() {
    var infoBox = document.getElementById('infoBox');
    if (infoBox.style.display === 'none') {
        infoBox.style.display = 'block';
    } else {
        infoBox.style.display = 'none';
    }
}

