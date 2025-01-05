
export function getColor(d) {
	return d > .8 ? '#800026' :
		d > .7  ? '#BD0026' :
		d > .6  ? '#E31A1C' :
		d > .4  ? '#FC4E2A' :
		d > .2   ? '#FD8D3C' :
		d > .1   ? '#FEB24C' :
		d > .05   ? '#FED976' : '#FFEDA0';
}

export function style(feature, selectedColumn) {
	return {
		weight: 2,
		opacity: 1,
		color: 'white',
		dashArray: '3',
		fillOpacity: 0.7,
        fillColor: getColor(feature.properties[`${selectedColumn}_prop`]),
	};
}

export function highlightFeature(e) {
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
}

export function isMobileDevice() {
    return typeof window.orientation !== "undefined";
    //return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

