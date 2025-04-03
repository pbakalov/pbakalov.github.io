const ApiBaseUrl = 'https://bg-izbori.herokuapp.com/api/';

async function getSidsByDate(ekatte) {
    const url=`${ApiBaseUrl}/sids?ekatte=${ekatte}`;

    const data = await fetchData(url);
    return data;
}

async function getSidResults(el, sid) {
    const url=`${ApiBaseUrl}/single_election_data?el=${el}&sid=${sid}`;

    const data = await fetchData(url);
    return data;
}

async function getSidHist(sid, party) {
    const url=`${ApiBaseUrl}/data?sid=${sid}&party=${party}`;

    const data = await fetchData(url);
    return data;
}

async function getPlaceHist(ekatte, party) {
    const url=`${ApiBaseUrl}/data?ekatte=${ekatte}&party=${party}`;

    const data = await fetchData(url);
    return data;
}

function showSidHistory(sid, party) {
    document.getElementById('chart').innerHTML = loadingMsg;
    getSidHist(sid, party).then(sidData => {
        updatePlot(sidData, party);
    });
}

function showPlaceHistory(ekatte, party) {
    document.getElementById('chart').innerHTML = loadingMsg;
    getPlaceHist(ekatte, party).then(placeData => {
        updatePlot(placeData, party, ekatte);
    });
}

function showSidDetails(el, sid) {
    document.getElementById('text').innerHTML = loadingMsg;
    getSidResults(el, sid).then(sidData => {
        const newContent = sidDetail(sidData, el, sid);
        document.getElementById('text').innerHTML = newContent;
    });
}

function showSidsByDate(ekatte) {
    document.getElementById('text').innerHTML = loadingMsg;
    // TODO add place details: name, municipality, etc.
    getSidsByDate(ekatte).then(sidsByDate => {
        const resultHTML = generateHTML(sidsByDate);
        document.getElementById('text').innerHTML = resultHTML;
    });
}

/**
 * ekatte or SID time-series plot.
 */
function updatePlot(jsonData, parties, ekatte=null)  {

    parties = parties.split(';');
    const dates = Object.keys(jsonData.eligible_voters);
    
    let tableHTML = '';
    let title;
    let cols;
    let placeName;

    if (ekatte!==null) { // ekatte plot
        cols = ['n_stations', 'eligible_voters', 'total'].concat(parties);
        placeName = jsonData['place'][dates[0]]; 
        munName = jsonData['municipality_name'][dates[dates.length-1]]; // TODO use NSI data instead of CEC data
        regName = jsonData['region_name'][dates[0]];
        tableHTML += `<h3>${placeName}, общ. ${munName}, ${regName}</h3>`; 
        title = `Резултати в ${placeName}`;
    } else { // SID plot
        cols = ['address', 'place', 'n_stations', 'eligible_voters', 'total'].concat(parties);
        tableHTML += `<h3>Данни за секция ${sid}</h3>`; 
        title = `Резултати секция ${sid}`;
    }

    const traces = ['eligible_voters', 'total'].concat(parties);
    
    // metadata 
    const meta = document.getElementById('text')

    tableHTML += '<table><thead><tr>';
    tableHTML += '<th>Дата</th>';
    cols.forEach(col => {
        tableHTML += `<th>${(renameMap[col]||col)}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';
    
    dates.forEach(key => {
        tableHTML += `<tr><td>${key}</td>`;
        cols.forEach(col => {
            const value = jsonData[col][key];
            tableHTML += `<td>${value}</td>`;
        });
        tableHTML += `</tr>`;
    });
    tableHTML += '</tbody></table>';

    meta.innerHTML = tableHTML;

    const colorMap = {
        'eligible_voters' : 'gray',
        'total' : 'black',
    }

    const data = traces.map(col => ({
        x: dates,
        y: Object.values(jsonData[col]),
        mode: 'lines+markers',
        type: (col in colorMap) ? 'scatter' : 'bar',
        marker: {
            size: 10,
            color: colorMap[col]||null,
        },
        name: (renameMap[col]||col),
        visible: (col in colorMap) ? 'legendonly' : true 
    }));
    
    const layout = {
        title: title,
        xaxis: {
            title: 'Дата'
        },
        yaxis: {
            title: 'Гласове'
        },
        showlegend : true,
        barmode: 'stack',
        responsive: true,
        autosize: true,
        width: Math.min(800, window.innerWidth - 20), // 20px padding
        height: Math.min(600, Math.max(200, window.innerHeight * 0.8)) // 80% of viewport height but not less than 300
    };

    document.getElementById('chart').innerHTML = '';
    Plotly.newPlot('chart', data, layout);
}

function sidDetail(sidData, el, sid) {
    const skipKeys = ['region', 'station', 'admin_reg', 'municipality'];

    // metadata
    let tableHTML = `<h3>${el} секция ${sid}</h3>`; 
    tableHTML += '<table><thead><tr><th>Данни за секцията</th><th></th></tr></thead><tbody>';
    metadataKeys.forEach(key => {
        if (!renameMap.hasOwnProperty(key)) renameMap[key] = key;
        const value = sidData[key][sid] || 'н.д.'; 
        if (!skipKeys.includes(key)) {
            tableHTML += `<tr><td>${renameMap[key]}</td><td>${value}</td></tr>`;
        };
    });
    tableHTML += '</tbody></table>';

    // votes
    const partyVotes = [];

    for (const key in sidData) {
        if (!metadataKeys.includes(key)) {
            if (!renameMap.hasOwnProperty(key)) renameMap[key] = key;
            const votes = sidData[key][sid];
            partyVotes.push({ party: renameMap[key], votes: votes });
        }
    }

    partyVotes.sort((a, b) => b.votes - a.votes);

    let voteTableHTML = '<h4>Резултати</h4>'; 
    voteTableHTML += '<table><thead><tr><th>Партия</th><th>Гласове</th></tr></thead><tbody>';
    
    partyVotes.forEach(item => {
        voteTableHTML += `<tr><td>${item.party}</td><td>${item.votes}</td></tr>`;
    });
    
    voteTableHTML += '</tbody></table>';

    return tableHTML + voteTableHTML;
}

function generateHTML(sidsByDate) {
    const pageUrl = `${window.location.pathname}`
    let htmlOutput = '';

    for (const date in sidsByDate) {
        htmlOutput += `<strong>${date}</strong><br>`;
        const sids = sidsByDate[date];
        sids.forEach(sid => {
            htmlOutput += `<a href="${pageUrl}?el=${date}&sid=${sid}" onclick="showSidDetails('${date}', '${sid}')">${sid}</a> `;
            htmlOutput += `<a href="${pageUrl}?sid=${sid}&party=ГЕРБ;ГЕРБ-СДС;ДПС;ДПС-Пеев;ДПС-Доган">история</a><br>`;
        });
        htmlOutput += '<br>';
    }

    return htmlOutput;
}

async function populateComboBox(csvFilePath, inputId, datalistId) { //provides some customizations that are missing in CSVCombobox
    const response = await fetch(csvFilePath);
    const csvText = await response.text();
    const rows = csvText.split("\n").map(row => row.trim());
    rows.shift(); // Remove headers

    const inputElement = document.getElementById(inputId);
    const dataList = document.getElementById(datalistId);

    dataList.innerHTML = ""; 

    rows.forEach(row => {
        const [ind, ekatte, region_name, municipality_name, place, notes, nuts4] = row.split(";");
        if (ekatte && place) {
            const option = document.createElement("option");
            option.value = `${place.trim()} (${municipality_name.trim()})`;
            //option.value = ekatte.trim(); // ekatte shown in input/dropdown; no
            //option.textContent = `${place.trim()} (${municipality_name.trim()})`;
            option.dataset.value = ekatte.trim(); 
            dataList.appendChild(option);
        }
    });

    inputElement.addEventListener("change", () => {
        const selectedText = inputElement.value;
        const selectedOption = Array.from(dataList.children).find(
            option => option.value === selectedText
        );

        if (selectedOption) {
            //console.log("Display:", selectedOption.value); // Visible text
            //console.log("Value:", selectedOption.dataset.value); // Hidden value
            //window.location.href = `${window.location.href}?ekatte=${selectedOption.dataset.value}`;
        } else {
            console.log("Custom input:", selectedText);
        }
    });

}

function updateSelection() {
    const partyValue = partySelect.value;
    const placeValue = placeSelect.value; // place (municipality)
    const placeOptions = document.getElementById('placeOptions'); // ekatte matching placeValue
    const chart = document.getElementById('chart'); 

    if (partyValue && placeValue) { // show place history plot
        const ekatte = Array.from(placeOptions.children).find(
            option => option.value === placeValue
        ).dataset.value;
        showPlaceHistory(ekatte, partyValue);
        updateUrl(ekatte, null, partyValue);
    } else if (placeValue) { // show SIDs by date
        const ekatte = Array.from(placeOptions.children).find(
            option => option.value === placeValue
        ).dataset.value;
        updateUrl(ekatte);
        showSidsByDate(ekatte);
        chart.innerHTML = '';
    } else if (partyValue) {
        const partyLabels = partyValue.split(',').map(value => {
            const partyOption = document.querySelector(`#partyOptionsList div[data-value="${value}"]`);
            return partyOption ? partyOption.textContent : value;
        });
        updateUrl(null, null, partyValue);
    }

}

function updateUrl (ekatte=null, sid=null, party=null, el=null) {
    const args = {ekatte, sid, party, el};
    let newUrl = `${window.location.pathname}?`;
    for (const [key, value] of Object.entries(args)) {
        if (value !== null) {
            newUrl += `${key}=${value}&`;
        }
    }
    newUrl = newUrl.endsWith('&') ? newUrl.slice(0, -1) : newUrl;
    window.history.replaceState(null, '', newUrl);
};

function updatePlaceInput(ekatte) {
    const inputElement = document.getElementById('placeCombobox');
    const placeOptions = document.getElementById('placeOptions'); 
    const placeName = Array.from(placeOptions.children).find(
        option => option.dataset.value === String(ekatte)
    ).value;
    inputElement.value = placeName;
}

const metadataKeys = [
    "place", "address", "admin_reg", "ekatte", "eligible_voters",
    "municipality", "municipality_name", "station", "region", "region_name"
];

const renameMap = {
    'invalid' : 'Невалидни',
    'eligible_voters' : 'По списък',
    'n_stations' : 'Секции',
    'invalid' : 'Невалидни',
    'total' : 'Общо гласували',
    'npn' : 'Не подкрепям никого',
    'place' : 'Населено място',
    'address' : 'Адрес',
    'ekatte' : 'ЕКАТТЕ',
    'municipality_name' : 'Община',
    'region_name' : 'Избирателен район',
}

const loadingMsg = 'Зарежда се ...';

const urlParams = new URLSearchParams(window.location.search); 
const ekatte = parseInt(urlParams.get('ekatte'));
const el = urlParams.get('el');
const sid = urlParams.get('sid');
const party = urlParams.get('party');

const partyCombobox = new CSVCombobox('../assets/data/parties.csv', { // TODO get party list from API
    inputId: 'partyCombobox',
    listId: 'partyOptionsList',
    hiddenValueId: 'partySelectedValue',
    tagsContainerId: 'partySelectedTags',
    valueColumnIndex: 0, 
    labelColumnIndex: 1, 
    multiSelect: true
});

populateComboBox(
    "../../assets/data/place_data.csv", //TODO get place data from skriptove_za_izbori repo
    "placeCombobox", 
    "placeOptions"
).then(() => {
    //TODO all cases: update party selection input fields
    if (!isNaN(ekatte) && party!==null) {
        showPlaceHistory(ekatte, party);
        updatePlaceInput(ekatte);
    } else if (!isNaN(ekatte) && el!==null) {
        //TODO showPlaceDetails(el, ekatte);
        updatePlaceInput(ekatte);
    } else if (!isNaN(ekatte)) {
        //TODO add sidHistory link next to each SID (default to GERB/DPS)
        showSidsByDate(ekatte);
        updatePlaceInput(ekatte);
    } else if (el!==null && sid!==null) {
        showSidDetails(el, sid);
    } else if (sid!==null && party!==null) {
        showSidHistory(sid, party);
    } else {
        document.getElementById('text').innerHTML = '';
    }
});

const placeSelect = document.getElementById('placeCombobox');
const partySelect = document.getElementById('partySelectedValue');

partySelect.addEventListener('change', updateSelection);
placeSelect.addEventListener('change', updateSelection);

