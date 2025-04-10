import { getColor, style, highlightFeature, isMobileDevice } from './shared.js';

let csvData;
let geojsonData;
let markerData;
let markerGroup;
let map;
let geojsonLayer;
var info = L.control();
let selectedColumn = null;

document.getElementById("csvDropdown").addEventListener("change", function(event) {
    loadCSV(event.target.value).then(() => populateDropdown());
});

document.getElementById("columnsDropdown").addEventListener("change", updateColumn);
document.getElementById("pinsDropdown").addEventListener("change", updatePins);

loadGeoJSON().then(initializeMap);

function loadCSV(csvFilename) {
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
  return new Promise((resolve, reject) => {
    fetch("../../assets/data/settlements_simplified1pct.json")
      .then((response) => response.json())
      .then((data) => {
        geojsonData = data;
        resolve();
      })
      .catch((error) => {
        reject(error);
      });
  });
}

function loadMarkerData(file) {
    return fetch(file)
    .then(response => {
        if (!response.ok) {
            throw new Error('Грешка.' + response.statusText);
        }
        return response.json();
    })
    .catch(error => console.error('Error fetching marker data:', error));
}

function matchData(columnName) {
  geojsonData.features.forEach((feature) => {
    const match = csvData.find((row) => ('00000' + row.id).slice(-5) === feature.properties.ncode); 
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

function onEachFeature(feature, layer) {
    const defaultPopup = `<h3>${feature.properties.name}, общ.${feature.properties.obsht_name}, обл.${feature.properties.oblast_name}</h3>`;
    
    layer.bindPopup(
        `${defaultPopup}Зарежда се... (ако виждаш това, вероятно сървърът се буди)`,
        {maxWidth: 600}
    );

    layer.on({
        mouseover: function(e) {
            highlightFeature(e);
            info.update(layer.feature.properties, selectedColumn);
        },
        mouseout: function(e) {
	        geojsonLayer.resetStyle(e.target);
	        info.update(undefined, selectedColumn);
        },
        click: function(e) {
            map.fitBounds(e.target.getBounds()); // zoom to feature
            getTsData(selectedColumn, feature.properties.ncode).then(
                tsData => {
                const popupContent = JsonToTable(tsData); // TODO show figure instead of table
                const sids = `<br><a href="../hist.html?ekatte=${feature.properties.ncode}">виж секции</a>`;
                layer.setPopupContent(
                    `${defaultPopup}${popupContent}${sids}`
                );
            })
            .catch(error => {
                console.error('Error fetching data:', error);
                layer.setPopupContent('Грешка.');
            });
        },
	});
}

function initializeMap() {
  map = L.map('map').setView([42.934, 25.938], 8);

  var tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  	maxZoom: 19,
  	attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>|<a href="https://twitter.com/petar_baka">petar_baka</a>'
  }).addTo(map);

  geojsonLayer = L.geoJson(geojsonData, {
    style: (feature) => style(feature, selectedColumn),
  	onEachFeature: onEachFeature
  }).addTo(map);


  info.onAdd = function (map) {
  	this._div = L.DomUtil.create('div', 'info');
  	this.update();
  	return this._div;
  };

  info.update = function (props, selectedColumn) {
  	var textbox = generateTextbox(props, selectedColumn);

    this._div.innerHTML = '';
    var closeButton;
    if (props && isMobileDevice()) {
        closeButton = L.DomUtil.create('button', 'close-btn', this._div);
        closeButton.innerHTML = 'x';
        closeButton.style.float = 'right';
    };

    let contentDiv = L.DomUtil.create("div", "info-content", this._div);
    contentDiv.innerHTML = textbox;

    if (props && isMobileDevice()) {
        L.DomEvent.on(closeButton, 'click', () => {
            this.close();
        });
    };
  };

  info.close = function() { // why does this close the popup in addition to the infobox?
      info.update(undefined, selectedColumn);
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

  markerGroup = L.layerGroup().addTo(map);

  const urlParams = new URLSearchParams(window.location.search);
  const lat = parseFloat(urlParams.get('lat'));
  const lng = parseFloat(urlParams.get('lng'));
  const zoom = parseInt(urlParams.get('zoom'), 10);

  if (lat && lng && zoom) {
      map.setView([lat, lng], zoom);
  }

  const party = urlParams.get('party');
  const el = urlParams.get('el');

  set_el_and_party(el, party);
  
  map.on('moveend zoomend', updateUrlWithMapState);

}

function set_el_and_party(el, party) {
    const csvDropdown = document.getElementById('csvDropdown');
    const options = Array.from(csvDropdown.options).map(option => option.value);
    const selectedCsv = `../../assets/data/${el}`;

    if (options.includes(selectedCsv)) {
        csvDropdown.value=selectedCsv; //does not trigger event listeners
        loadCSV(csvDropdown.value).then(() => populateDropdown(party));
    } else {
        loadCSV(csvDropdown.value).then(() => populateDropdown());
    }
}

const updateUrlWithMapState = () => {
    const center = map.getCenter();
    const zoom = map.getZoom();

    const parts = document.getElementById('csvDropdown').value.split('/');
    const el = parts[parts.length-1];
    const party = document.getElementById('columnsDropdown').value;

    const newUrl = `${window.location.pathname}?lat=${center.lat}&lng=${center.lng}&zoom=${zoom}&el=${el}&party=${party}`;
    window.history.replaceState(null, '', newUrl);
};

function populateDropdown(colOverride=null) {
  
  const parts = document.getElementById('csvDropdown').value;

  const dropdown = document.getElementById("columnsDropdown");
  const columns = Object.keys(csvData[0]);
  let parties = [];
  const excluded = [
    'id', 'eligible_voters', 
    'total_valid', 
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

  if (columns.includes(colOverride)) {
    dropdown.value = colOverride;
    selectedColumn = colOverride;
  };

  matchData(selectedColumn);
  geojsonLayer.setStyle(feature => {
    return {
      fillColor: getColor(feature.properties[`${selectedColumn}_prop`]),
      
    };
  });

  info.update(undefined, selectedColumn);
  updateUrlWithMapState();
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
  updateUrlWithMapState();
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
        const targetRow  = csvData.find((row) => ('00000' + row.id).slice(-5) === props.ncode); 

        var table = generateTableHtmlForRowById(props.ncode);

        textbox += `<b>${props.name}, общ. ${props.obsht_name} (${props.ncode})</b><br>`;

        if (selectedColumn !== 'total') {
            textbox += selectedColumn + ' гласове: ' +  props[selectedColumn] + '<br>' 
            textbox += `${selectedColumn} (%): ${isNaN(props[selectedColumn]) ? 'н.д.' : (100*props[selectedColumn]/props['total']).toFixed(1)}<br>`
        } else {
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
        textbox += `Брой секции: ${targetRow ? targetRow['n_stations'] : 0}<br>`
    } else {
        textbox += 'Посочете населено место.'
    };
    
    return textbox;
}

function generateTableHtmlForRowById(targetId) {
    
    const targetRow  = csvData.find((row) => ('00000' + row.id).slice(-5) === targetId); 

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
                "total_valid",
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

async function getTsData(party, ekatte) {
    const renameMap = {
        'не подкрепям никого' : 'npn'
    }

    const p_ = renameMap[party] || party;

    try {
        const response = await fetch(`https://bg-izbori.herokuapp.com/api/data?party=${p_}&ekatte=${ekatte}`);
        const tsData = await response.json();

        return tsData; 
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

function JsonToTable(data) {
    const skip = ['place', 'region_name', 'invalid', 'municipality_name'];
    const renameMap = {
        'invalid' : 'Невалидни',
        'eligible_voters' : 'По списък',
        'n_stations' : 'Секции',
        'invalid' : 'Невалидни',
        'total' : 'Общо гласували',
        'npn' : 'Не подкрепям никого',
    }

    let thead = '<table><thead><tr><th>Дата</th>';
    for (let key in data) {
        if (!skip.includes(key))  {
            thead += `<th>${renameMap[key]||key}</th>`;
        }
    }
    thead += '</tr></thead>';
    
    let tbody = '<tbody>';

    const dates = Object.keys(data.eligible_voters);

    dates.forEach(date => {
        tbody += `<tr><td>${date}</td>`;
        for (let key in data) {
            if (!skip.includes(key)) tbody += `<td>${data[key][date]}</td>`;
        }
        tbody += '</tr>';
    });
    tbody += '</tbody></table>';

    return thead + tbody;
}

function updatePins (event) {
  const selectedSus = event.target.value;
  var markerData;
  markerGroup.clearLayers();
  if (selectedSus!=='') {
    loadMarkerData(selectedSus).then(data =>{
        markerData = data;
        updateSusLayer(markerData, markerGroup);
    });
  };
};

function updateSusLayer(markerData, markerGroup) {
  geojsonData.features.forEach(feature => {
      var id = feature.properties.ncode;
      if (id in markerData) {

        const point = markerData[id];
        id = id.replace(/^0+/, "");

        var popupContent = `${feature.properties.name}, общ. ${feature.properties.obsht_name} (${id})</b><br>`;
        popupContent += `<img src="../../assets/2021/spadove/${id}.png" style="width:500px; height:auto;" />`;
        popupContent += `<br><a href="../../assets/2021/spadove/${id}.html" target="_blank">Виж секции</a>`;
        popupContent += ' <a href="../2021/top.html" target="_blank">Защо има карфица тук?</a>';
        
        L.marker([point[1], point[0]])
            .addTo(markerGroup)
            .bindPopup(
                popupContent,
                {
                    maxWidth: 600,
                    minWidth: 300
                }
            );
      }
  });
};

