const participants = [
  {
    id: 1,
    name: "John Doe",
    visibleAddress: "Springfield",
    hiddenAddress: "123 Secret Lane",
    coordinates: {
      lat: 39.7956,
      lng: -86.1351,
    },
  },
];

const map = L.map("map").setView([39.7956, -86.1351], 10);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
}).addTo(map);

const participantLayer = L.layerGroup().addTo(map);
const midpointLayer = L.layerGroup().addTo(map);

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

function getMidpoint(points) {
  const total = points.reduce(
    (sum, point) => ({
      lat: sum.lat + point.coordinates.lat,
      lng: sum.lng + point.coordinates.lng,
    }),
    { lat: 0, lng: 0 },
  );

  return points.length
    ? { lat: total.lat / points.length, lng: total.lng / points.length }
    : null;
}

const parks = [
  {
    name: "Baseball Park A",
    lat: 39.7956,
    lng: -86.1351,
  },
  {
    name: "Batting Cage B",
    lat: 39.794,
    lng: -86.132,
  },
];

parks.forEach((park) => {
  L.marker([park.lat, park.lng], { title: park.name })
    .addTo(participantLayer)
    .bindPopup(park.name);
});

function updateMap() {
  const selectedIds = [
    ...document.querySelectorAll("#participant-list input:checked"),
  ].map((checkbox) => Number(checkbox.value));
  const selectedParticipants = participants.filter((participant) =>
    selectedIds.includes(participant.id),
  );
  const summary = document.getElementById("selection-summary");

  midpointLayer.clearLayers();
  if (!selectedParticipants.length) {
    summary.textContent = "Select at least one player.";
    map.setView([39.7956, -86.1351], 10);
    return;
  }

  const midpoint = getMidpoint(selectedParticipants);
  summary.textContent = `${selectedParticipants.length} player${selectedParticipants.length === 1 ? "" : "s"} selected.`;
  map.setView(
    [midpoint.lat, midpoint.lng],
    selectedParticipants.length === 1 ? 12 : 10,
  );
  L.marker([midpoint.lat, midpoint.lng], { title: "Practice midpoint" })
    .addTo(midpointLayer)
    .bindPopup("Suggested practice midpoint")
    .openPopup();
}

renderChecklist();
