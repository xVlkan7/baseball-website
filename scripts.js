let participants = [];
let map;
let mapCenter;
let participantLayer;
let addressLayer;
let midpointLayer;
const addressIcon = L.divIcon({
  className: "address-marker",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -8],
});
const midpointIcon = L.divIcon({
  className: "midpoint-marker",
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -11],
});

function renderChecklist() {
  const list = document.getElementById("participant-list");

  participants.forEach((participant) => {
    const li = document.createElement("li");

    li.innerHTML = `
      <label>
        <input
          value="${participant.id}"
          type="checkbox"
        >
        ${participant.name} (${participant.visibleAddress})
      </label>
    `;

    li.querySelector("input").addEventListener("change", updateMap);
    list.appendChild(li);
  });
}

function getDistanceInMiles(firstPoint, secondPoint) {
  const earthRadius = 3958.8;
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(
    secondPoint.coordinates.lat - firstPoint.coordinates.lat,
  );
  const longitudeDelta = toRadians(
    secondPoint.coordinates.lng - firstPoint.coordinates.lng,
  );
  const firstLatitude = toRadians(firstPoint.coordinates.lat);
  const secondLatitude = toRadians(secondPoint.coordinates.lat);
  const sineLatitude = Math.sin(latitudeDelta / 2);
  const sineLongitude = Math.sin(longitudeDelta / 2);
  const haversine =
    sineLatitude * sineLatitude +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      sineLongitude *
      sineLongitude;

  return (
    2 * earthRadius * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

function getMidpoint(points) {
  if (!points.length) {
    return null;
  }

  const weights = points.map((point) => {
    const averageDistance =
      points.reduce(
        (total, otherPoint) => total + getDistanceInMiles(point, otherPoint),
        0,
      ) / points.length;

    return 1 / Math.max(averageDistance, 0.1);
  });
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const weightedCoordinates = points.reduce(
    (sum, point, index) => ({
      lat: sum.lat + point.coordinates.lat * weights[index],
      lng: sum.lng + point.coordinates.lng * weights[index],
    }),
    { lat: 0, lng: 0 },
  );

  return {
    lat: weightedCoordinates.lat / totalWeight,
    lng: weightedCoordinates.lng / totalWeight,
  };
}

function updateMap() {
  const selectedIds = [
    ...document.querySelectorAll("#participant-list input:checked"),
  ].map((checkbox) => Number(checkbox.value));
  const selectedParticipants = participants.filter((participant) =>
    selectedIds.includes(participant.id),
  );
  const summary = document.getElementById("selection-summary");

  addressLayer.clearLayers();
  midpointLayer.clearLayers();
  if (!selectedParticipants.length) {
    summary.textContent = "Select at least two players.";
    map.setView([mapCenter.lat, mapCenter.lng], 10);
    return;
  }

  selectedParticipants.forEach((participant) => {
    L.marker([participant.coordinates.lat, participant.coordinates.lng], {
      title: `${participant.name}'s address`,
      icon: addressIcon,
    })
      .addTo(addressLayer)
      .bindPopup(`${participant.name}: ${participant.visibleAddress}`);
  });

  if (selectedParticipants.length === 1) {
    summary.textContent = "Select at least two players to find a midpoint.";
    map.setView(
      [
        selectedParticipants[0].coordinates.lat,
        selectedParticipants[0].coordinates.lng,
      ],
      12,
    );
    return;
  }

  const midpoint = getMidpoint(selectedParticipants);
  summary.textContent = `${selectedParticipants.length} player${selectedParticipants.length === 1 ? "" : "s"} selected.`;
  map.setView(
    [midpoint.lat, midpoint.lng],
    selectedParticipants.length === 1 ? 12 : 10,
  );
  const googleMapsUrl = new URL("https://www.google.com/maps/search/");
  googleMapsUrl.searchParams.set("api", "1");
  googleMapsUrl.searchParams.set("query", `${midpoint.lat},${midpoint.lng}`);
  L.marker([midpoint.lat, midpoint.lng], {
    title: "Practice midpoint",
    icon: midpointIcon,
  })
    .addTo(midpointLayer)
    .bindPopup(
      `Suggested practice midpoint<br><a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer">Open in Google Maps</a>`,
    )
    .openPopup();
  selectedParticipants.forEach((participant) => {
    L.polyline(
      [
        [participant.coordinates.lat, participant.coordinates.lng],
        [midpoint.lat, midpoint.lng],
      ],
      { color: "#d45b32", dashArray: "6 8", weight: 2 },
    ).addTo(midpointLayer);
  });
}

async function init() {
  const response = await fetch("data.json");
  if (!response.ok) {
    throw new Error(`Could not load data.json (${response.status})`);
  }

  const data = await response.json();
  participants = data.participants;
  mapCenter = data.map.center;
  map = L.map("map").setView([mapCenter.lat, mapCenter.lng], data.map.zoom);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);

  participantLayer = L.layerGroup().addTo(map);
  addressLayer = L.layerGroup().addTo(map);
  midpointLayer = L.layerGroup().addTo(map);
  data.parks.forEach((park) => {
    L.marker([park.lat, park.lng], { title: park.name })
      .addTo(participantLayer)
      .bindPopup(park.name);
  });

  renderChecklist();
}

init().catch((error) => {
  console.error(error);
  document.getElementById("selection-summary").textContent =
    "Unable to load practice data.";
});
