import { useEffect, useState, useRef } from "react";
import "./App.scss";
import "@tomtom-international/web-sdk-maps/dist/maps.css";
import * as tt from "@tomtom-international/web-sdk-maps";
import * as ttapi from "@tomtom-international/web-sdk-services";

const App = () => {
  const [map, setMap] = useState({});
  const mapElement = useRef();
  const [longitude, setLongitude] = useState(9.30824);
  const [latitude, setLatitude] = useState(48.74088);

  const convertToPoints = (lngLat) => {
    return {
      point: {
        latitude: lngLat.lat,
        longitude: lngLat.lng,
      },
    };
  };

  const drawRoute = (geoJSON, map) => {
    if (map.getLayer("route")) {
      map.removeLayer("route");
      map.removeSource("route");
    }
    map.addLayer({
      id: "route",
      type: "line",
      source: {
        type: "geojson",
        data: geoJSON,
      },
      paint: {
        "line-color": "red",
        "line-width": 6,
      },
    });
  };

  const addDeliveryPin = (lngLat, map) => {
    const element = document.createElement("div");
    element.className = "pin__delivery";
    new tt.Marker({
      element: element,
    })
      .setLngLat(lngLat)
      .addTo(map);
  };

  useEffect(() => {
    const origin = {
      lng: longitude,
      lat: latitude,
    };
    const destinations = [];

    let map = tt.map({
      key: process.env.REACT_APP_TOM_TOM_KEY,
      container: mapElement.current,
      stylesVisibility: {
        trafficIncidents: true,
        trafficFlow: true,
      },
      center: [longitude, latitude],
      zoom: 14,
    });
    setMap(map);

    const addPin = () => {
      const element = document.createElement("div");
      element.className = "pin";
      const popUpOffset = {
        bottom: [0, -27],
      };
      const popUp = new tt.Popup({ offset: popUpOffset }).setHTML(
        "Here Are You"
      );

      const pin = new tt.Marker({
        draggable: true,
        element: element,
      })
        .setLngLat([longitude, latitude])
        .addTo(map);

      pin.on("dragend", () => {
        const lngLat = pin.getLngLat();
        setLongitude(lngLat.lng);
        setLatitude(lngLat.lat);
      });
      pin.setPopup(popUp).togglePopup();
    };

    addPin();
    const sortDestinations = (locations) => {
      const pointsForDestinations = locations.map((destination) => {
        return convertToPoints(destination);
      });
      const callParameters = {
        key: process.env.REACT_APP_TOM_TOM_KEY,
        destinations: pointsForDestinations,
        origins: [convertToPoints(origin)],
      };

      return new Promise((resolve, reject) => {
        ttapi.services
          .matrixRouting(callParameters)
          .then((matrixAPIResutls) => {
            const results = matrixAPIResutls.matrix[0];
            const resultsArray = results.map((result, i) => {
              return {
                location: locations[i],
                drivingTime: result.response.routeSummary.travelTimeInSeconds,
              };
            });
            resultsArray.sort((a, b) => {
              return a.drivingTime - b.drivingTime;
            });
            const sortedLocations = resultsArray.map((result) => {
              return result.location;
            });
            resolve(sortedLocations);
          });
      });
    };

    const recalculateRoutes = () => {
      sortDestinations(destinations).then((sorted) => {
        sorted.unshift(origin);

        ttapi.services
          .calculateRoute({
            key: process.env.REACT_APP_TOM_TOM_KEY,
            locations: sorted,
          })
          .then((routeData) => {
            const geoJSON = routeData.toGeoJson();
            drawRoute(geoJSON, map);
          });
      });
    };

    map.on("click", (e) => {
      destinations.push(e.lngLat);
      addDeliveryPin(e.lngLat, map);
      recalculateRoutes();
    });

    return () => map.remove();
  }, [latitude, longitude]);

  return (
    <>
      {map && (
        <div className="app">
          <div ref={mapElement} className="app__map" />
          <div className="app__search-bar">
            <h1>Choose your destination:</h1>
            <input
              type="text"
              id="longitutde"
              placeholder="Enter longitude..."
              onChange={(e) => setLongitude(e.target.value)}
            />
            <input
              type="text"
              id="latitude"
              placeholder="Enter latitude..."
              onChange={(e) => setLatitude(e.target.value)}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default App;
