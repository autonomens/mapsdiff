import React, { Component } from 'react';
import './App.css';
import LogoImg from './cartoparty.png';

import mapboxgl from 'mapbox-gl';
import './../node_modules/mapbox-gl/dist/mapbox-gl.css';

import MapboxStyle from './services/mapbox.style.js';
import OverpassAPI from './services/overpass-api.js';

import injectTapEventPlugin from 'react-tap-event-plugin';
injectTapEventPlugin();

import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import RaisedButton from 'material-ui/RaisedButton';
import DatePicker from 'material-ui/DatePicker';
import {Card, CardTitle, CardMedia} from 'material-ui/Card';
import CircularProgress from 'material-ui/CircularProgress';
import Popover from 'material-ui/Popover';
import {List, ListItem} from 'material-ui/List';

import areIntlLocalesSupported from 'intl-locales-supported';
import moment from 'moment';


let DateTimeFormat;

DateTimeFormat = global.Intl.DateTimeFormat;


class App extends Component {
    constructor() {
      super();
      const startDate = new Date(moment(new Date()).subtract(10, 'days').format()); // 09/11/2016
      this.state = {
        map: null,
        pendingSearch: false,
        startDate: startDate
      };
    }

    componentDidMount() {
        const map = new mapboxgl.Map({
          container: 'map',
          style: MapboxStyle,
          center: [1.47448, 43.54616], // ramonville st agne
          // center: [1.4121, 43.58], // bagatelle
          // center: [-76.53063297271729, 39.18174077994108],
          zoom: 14,
          attributionControl: false
        });

        map.on('load', function () {
          map.addControl(new mapboxgl.Navigation({position: 'top-right'}));
          map.addControl(new mapboxgl.Geolocate({position: 'top-right'}));
          map.addControl(new mapboxgl.Attribution({position: 'bottom-right'}));
          map.addControl(new mapboxgl.Scale({position: 'bottom-left', maxWidth: 80}));

          // Create a popup, but don't add it to the map yet.
          var popup = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: false
          });
        });

        map.on('click', function (e) {
          var features = map.queryRenderedFeatures(e.point, { layers: ['polygon', 'line', 'point'] });
          if (!features.length) {
              return;
          }

          var feature = features[0],
              meta = JSON.parse(feature.properties.meta),
              tags = JSON.parse(feature.properties.tags);
          var tagsTable = '';
          for (var tag in tags) {
            tagsTable += `<tr><td>` + tag + `</td><td>` + tags[tag] + `</td></tr>`
          }
          var description =
                  `<ul class="popup-content">
                    <li>Auteur<p class="data">` + meta.user + `</p></li>
                    <li>Version<p class="data">` + meta.version + `</p></li>
                    <li>Date<p class="data">` + moment(meta.timestamp).format('DD/MM/YYYY') + `</p></li>
                    <li>Tags
                      <table>` + tagsTable + `</table>
                    </li>
                  </ul>`,

              coordinates = Array.isArray(feature.geometry.coordinates[0]) ? map.unproject(e.point) : feature.geometry.coordinates,

              // Populate the popup and set its coordinates
              // based on the feature found.
              popup = new mapboxgl.Popup()
                  .setLngLat(coordinates)
                  .setHTML(description)
                  .addTo(map);
        });

        this.setState({
          map: map
        });
  }

  handleChange = (event, date) => {
    this.setState({
      startDate: date,
    });
  };

  searchHistory = (event) => {
    // first, get the bounding box
    // second, call overpass api to get geojson shapes
    this.setState({pendingSearch: true});
    var date = moment(this.state.startDate).format('YYYY-MM-DDT07:00:00Z');
    OverpassAPI.get(this.state.map.getBounds(), date)
    .then((geojson) => {
      this.setState({pendingSearch: false});


      if (this.state.map.getLayer('polygon') !== undefined)
          this.state.map.removeLayer('polygon')
      if (this.state.map.getLayer('line') !== undefined)
          this.state.map.removeLayer('line')
      if (this.state.map.getLayer('point') !== undefined)
          this.state.map.removeLayer('point')

      if (this.state.map.getSource('osm-data-polygon') !== undefined)
          this.state.map.removeSource('osm-data-polygon')
      if (this.state.map.getSource('osm-data-line') !== undefined)
          this.state.map.removeSource('osm-data-line')
      if (this.state.map.getSource('osm-data-point') !== undefined)
          this.state.map.removeSource('osm-data-point')

      var features = geojson.features,
      sourcePolygon = { type:'FeatureCollection', features: geojson.features.filter(function(element) { return element.geometry.type === 'Polygon' }) },
      sourceLineString = { type:'FeatureCollection', features: geojson.features.filter(function(element) { return element.geometry.type === 'LineString' }) },
      sourcePoint = { type:'FeatureCollection', features: geojson.features.filter(function(element) { return element.geometry.type === 'Point' }) };

      this.state.map.addSource('osm-data-polygon', {
        type: 'geojson',
        data: sourcePolygon
      });

      this.state.map.addSource('osm-data-line', {
        type: 'geojson',
        data: sourceLineString
      });

      this.state.map.addSource('osm-data-point', {
        type: 'geojson',
        data: sourcePoint
      });

      this.state.map.addLayer({
        "id": "polygon",
        'type': 'fill',
        'source': 'osm-data-polygon',
        'layout': {},
        'paint': {
          'fill-color': '#00bcd4',
          'fill-opacity': 0.4
        }

      });

      this.state.map.addLayer({
        "id": "line",
        "type": "line",
        "source": "osm-data-line",
        "layout": {
          "line-join": "round",
          "line-cap": "round"
        },
        "paint": {
          "line-color": "#00ACC1",
          "line-width": 6
        }
      });

      this.state.map.addLayer({
        "id": "point",

        "type": "circle",
        "source": "osm-data-point",
        "paint": {
          "circle-radius": 6,
          "circle-color": "#006064",
        }

        // "filter": {}
      });
    })
    .catch(() => {
      this.setState({pendingSearch: false});
    })

    // third, get history of the different shapes
    // then display geojson and history
  }

  render() {
    return (
      <MuiThemeProvider>
          <div className="App">
            <div id="map" onClick={this.openPopup}></div>

            <nav id="filter-group" className="filter-group"></nav>
            <Card
              style={{
                position: 'absolute',
                top: 0,
                botto: 0,
                margin: 12,
              }}>
              <CardMedia>
                <img src={LogoImg} style={{width: 340}} />
              </CardMedia>
              <CardTitle
                title="Comparer les données OSM"
                style={{paddingBottom: 0}}
                titleStyle={{fontSize: 16}}
                titleColor="#006064" />

              <form
                style={{
                  marginLeft: 16,
                  marginRight: 16,
                  marginBottom: 16
                }}>
                <DatePicker
                  locale="fr"
                  DateTimeFormat={DateTimeFormat}
                  okLabel="OK"
                  cancelLabel="Annuler"
                  floatingLabelText="Entre aujourd'hui et..."
                  container="inline"
                  onChange={this.handleChange}
                  defaultDate={this.state.startDate}
                  fullWidth={true}
                  maxDate={new Date()} />

                {(() => {
                  if (this.state.pendingSearch) {
                    return <CircularProgress
                      style={{
                        paddingTop: 12,
                        paddingBottom: 24,
                        marginLeft: 'auto',
                        marginRight: 'auto',
                        textAlign: 'center',
                        display: 'block'
                      }} />
                  }
                })()}

                <RaisedButton
                  label='Cherchez les contributions'
                  primary={true}
                  onTouchTap={this.searchHistory}
                  onClick={this.searchHistory}
                  disabled={this.state.pendingSearch}
                  fullWidth={true} />
              </form>
            </Card>
          </div>
      </MuiThemeProvider>
    );
  }
}

export default App;
