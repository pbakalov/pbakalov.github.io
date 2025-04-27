let csvData;
let geojsonData;
let map;
let geojsonLayer;
var info = L.control();
let selectedColumn = null;

document.getElementById("csvDropdown").addEventListener("change", function(event) {
    loadCSV(event).then(populateDropdown);
});
document.getElementById('hideInfo').addEventListener('click', closeInfoBox);

loadGeoJSON().then(initializeMap);

function loadCSV(event) {
    const csvFilename = event.target.value;

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

function loadGeoJSON() {
  return fetch("../../assets/data/municipalities.json")
    .then((response) => response.json())
    .then((data) => {
      geojsonData = data;
      return loadCSV({ target: { value: "../../assets/data/2024-06-09ns_mun.csv" } }); 
    });
}

function matchData(columnName) { // TODO: get rid of this (no need to add data to the GeoJSON features; you can fetch data dynamically from the csv as needed)
  geojsonData.features.forEach((feature) => {
    const match = csvData.find((row) => row.nuts4 === feature.properties.nuts4); 
    if (match) {
      feature.properties[columnName] = match[columnName];
      if (columnName !=='total') {
        feature.properties[`${columnName}_prop`] = match[columnName]/match['total'];
      } else {
        feature.properties[`${columnName}_prop`] = match[columnName]/match['eligible_voters'];
      };
      feature.properties['total'] = match['total']; 
      feature.properties['eligible_voters'] = match['eligible_voters']; 
      feature.properties['активност'] = match['total']/match['eligible_voters']; 
    } else {
      feature.properties[columnName] = NaN;
      feature.properties['total'] = NaN; 
      feature.properties['eligible_voters'] = NaN; 
      feature.properties['активност'] = NaN; 
    }
  });
}

function getColor(d) {
	return d > .8 ? '#800026' :
		d > .7  ? '#BD0026' :
		d > .6  ? '#E31A1C' :
		d > .4  ? '#FC4E2A' :
		d > .2   ? '#FD8D3C' :
		d > .1   ? '#FEB24C' :
		d > .05   ? '#FED976' : '#FFEDA0';
}

function style(feature) {
	return {
		weight: 2,
		opacity: 1,
		color: 'white',
		dashArray: '3',
		fillOpacity: 0.7,
        fillColor: getColor(feature.properties[`${selectedColumn}_prop`]),
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
  map = L.map('map').setView([42.934, 25.938], 8);

  var tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  	maxZoom: 19,
  	attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>|<a href="https://twitter.com/petar_baka">petar_baka</a>'
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
  	var textbox = generateTextbox(props, selectedColumn)

  	this._div.innerHTML = textbox;
  };

  info.addTo(map);

  var legend = L.control({position: 'bottomleft'});

  legend.onAdd = function (map) {

      var div = L.DomUtil.create('div', 'info legend');
      var grades = [0, 0.05, 0.1, .2, .4, .6, .7, .8]; 
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

  L.Control.InfoButton = L.Control.extend({
      onAdd: function(map) {
          var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
  
          container.style.backgroundColor = 'white';     
          container.style.width = '30px';
          container.style.height = '30px';
          container.innerHTML = 'i'; 
          container.style.fontSize = '18px';
          container.style.textAlign = 'center';
          container.style.lineHeight = '30px';
          container.style.cursor = 'pointer';
  
          container.onclick = function(){
              openInfoBox();
          }
  
          return container;
      }
  });
  
  var infoButton = new L.Control.InfoButton({ position: 'topleft' });
  infoButton.addTo(map);

}

function populateDropdown() {
  const dropdown = document.getElementById("columnsDropdown");
  const columns = Object.keys(csvData[0]);
  let parties = [];
  const excluded = [
    'id', 'eligible_voters', 
    //'total', 
    'activity',
    'nuts4', 'municipality_name', 'region', 'region_name', 'n_stations'
  ];

  dropdown.innerHTML = ''; 

  columns.forEach((column) => {
    
    if (! excluded.includes(column)) { 
      const option = document.createElement("option");
      option.value = column;
      if (column ==='total') {
        option.textContent = 'активност';
      } else {
        option.textContent = column;
      }
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
      fillColor: getColor(feature.properties[`${selectedColumn}_prop`]),
      
    };
  });

  info.update(undefined, selectedColumn);
}

function updateColumn(event) {
  selectedColumn = event.target.value;
  matchData(selectedColumn);
  geojsonLayer.setStyle(feature => {
    return {
      fillColor: getColor(feature.properties[`${selectedColumn}_prop`]),
      
    };
  });
  info.update(undefined, selectedColumn);
}

function generateTextbox(props, selectedColumn) {

    var selectedYear = document.getElementById('csvDropdown');
    var selectedYearText = selectedYear.options[selectedYear.selectedIndex].textContent;;
    if (selectedColumn!=='total') {
        var textbox = '<h4>Резултати ' + selectedColumn + ' (' + selectedYearText + ')</h4>';
    } else {
        var textbox = '<h4>Активност (' + selectedYearText + ')</h4>';
    }

    if (props) {
        const targetRow  = csvData.find((row) => row.nuts4 === props.nuts4); 
        var table = generateTableHtmlForRowById(props.nuts4);

        textbox += `<b>Община ${props.name}</b><br>`;
        //TODO number of stations; number of settlements;

        if (selectedColumn !== 'total') {
            textbox += selectedColumn + ' гласове: ' +  props[selectedColumn] + '<br>' 
            textbox += `${selectedColumn} (%): ${isNaN(props[selectedColumn]) ? 'н.д.' : (100*props[selectedColumn]/props['total']).toFixed(1)}<br>`
        } else {
            // TODO: breakdown valid votes, invalid votes, total 
            // TODO: breakdown initial voter list, added to voter list, total 
            textbox += 'Общо гласували: ' +  props['total'] + '<br>' 
            textbox += 'Невалидни: ' +  targetRow['невалидни'] + '<br>' 
            textbox += 'Не подкрепям никого: ' +  targetRow['не подкрепям никого'] + '<br>' 
            textbox += 'Избиратели по списък: ' +  props['eligible_voters'] + '<br>'
            textbox += `Активност (%): ${isNaN(props['total']) ? 'н.д.' : (100*props['total']/props['eligible_voters']).toFixed(1)}<br>`
        }
        textbox += table + '<br>'
        textbox += 'Общо гласували (вкл. невалидни): ' +  props['total']  + '<br>'
        textbox += 'Избиратели по списък: ' +  props['eligible_voters'] + '<br>'
        textbox += `Гласували/избиратели по списък: ${isNaN(props['total']) ? 'н.д.' : (props['total']/props['eligible_voters']).toFixed(2)}<br>`
        textbox += `Брой секции: ${targetRow['n_stations']}<br>`
    } else {
        textbox += 'Посочете община.'
    };
    
    return textbox;
}

function generateTableHtmlForRowById(targetId) {
    
    const targetRow  = csvData.find((row) => row.nuts4 === targetId); 

    if (!targetRow) return '';

    let html = '<table>';

    html += '<thead><tr>';
    html += '<th>Партия</th>';
    html += '<th>Гласове</th>';
    html += '<th>Пропорция</th>';
    html += '</tr></thead>';

    html += '<tbody><tr>';
    for (let key in targetRow) {
        if (![
                "total",
                "id",
                "eligible_voters",
                "activity",
                'region',
                'region_name',
                'nuts4',
                'municipality_name',
                'n_stations'
            ].includes(key)) {
            const nVotes = targetRow[key];
            const proportion = nVotes / targetRow.total;

            html += `<tr>`;
            html += `<td>${key}</td>`;
            html += `<td>${nVotes}</td>`;
            html += `<td>${isNaN(proportion) ? 'н.д.' : proportion.toFixed(2)}</td>`;
            html += `</tr>`;
        }
    }
    html += '</tr></tbody>';

    html += '</table>';
    return html;
}

function openInfoBox() {
    document.getElementById('infoBox').style.display = 'block';
}

function closeInfoBox() {
    document.getElementById('infoBox').style.display = 'none';
}

