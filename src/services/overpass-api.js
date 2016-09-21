/* eslint-disable */
var osmtogeojson = require('./osmtogeojson.js');

var OverpassAPI = function() {};

OverpassAPI.url = 'http://overpass-api.de/api/interpreter?data=[out:xml]';
// OverpassAPI.url = 'http://overpass.osm.rambler.ru/cgi/interpreter?data=[out:xml]';
// OverpassAPI.url = 'http://overpass.osm.ch/api/interpreter?data=[out:xml]';

OverpassAPI.stringifyBounds = function(bounds) {
  return bounds._sw.lat  + ',' + bounds._sw.lng + ',' + bounds._ne.lat  + ',' + bounds._ne.lng ;
}

/**
 * Get geojson information from a bounding box
 *
 * By calling overpass api
 *
 * @param  {LngLatBounds} bounds [description]
 * @return {Promise}        [description]
 */
OverpassAPI.get = function(lngLatBounds, start) {
  var promise = new Promise( function (resolve, reject) {

    var bounds = OverpassAPI.stringifyBounds(lngLatBounds),
        url = OverpassAPI.url + ';node(changed:"' + start + '")(' + bounds + ');way(changed:"' + start + '")(' + bounds + ');out body;>;out meta qt;',
        resultOverpassAPI = fetch(url);

    resultOverpassAPI.then((response) => {
      console.log(response);
      return response.text();
    })
    .then((data) => {
      var osmGeojson = osmtogeojson(new DOMParser().parseFromString(data, 'text/xml'));

      // osmtogeojson writes polygon coordinates in anticlockwise order, not fitting the geojson specs.
      // Polygon coordinates need therefore to be reversed
      osmGeojson.features.forEach(function(feature, index) {

          if (feature.geometry.type === 'Polygon') {
              var n = feature.geometry.coordinates.length;
              feature.geometry.coordinates[0].reverse();

              if (n > 1) {
                  for (var i = 1; i < n; i++) {
                      var reversedCoordinates = feature.geometry.coordinates[i].slice().reverse();
                      osmGeojson.features[index].geometry.coordinates[i] = reversedCoordinates;
                  }
              }
          }

          if (feature.geometry.type === 'MultiPolygon') {
              // Split it in simple polygons
              feature.geometry.coordinates.forEach(function(coords) {
                  var n = coords.length;
                  coords[0].reverse();

                  if (n > 1) {
                      for (var i = 1; i < n; i++) {
                          coords[i] = coords[i].slice().reverse();
                      }
                  }
                  osmGeojson.features.push(
                      {
                          'type': 'Feature',
                          'properties': osmGeojson.features[index].properties,
                          'geometry': {
                              'type': 'Polygon',
                              'coordinates': coords
                          }
                      });
              });
          }
      });
      console.log(osmGeojson);
      resolve(osmGeojson);
    })
  });

  return promise;
}

module.exports = OverpassAPI;
