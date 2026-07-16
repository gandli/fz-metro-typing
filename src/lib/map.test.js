import test from "node:test";
import assert from "node:assert/strict";
import { getLineRuns, getPlayableStations, ROUTE_DIRECTIONS } from "./map.js";

const line = {
  stations: [
    { stationId: "A", nameZh: "甲站" },
    { stationId: "B", nameZh: "乙站" },
    { stationId: "C", nameZh: "丙站" },
    { stationId: "D", nameZh: "丁站" },
  ],
  segments: [
    ["A", "B", "C"],
    ["B", "D"],
  ],
};

test("line runs expose each playable interval in source order", () => {
  const runs = getLineRuns(line);

  assert.equal(runs.length, 2);
  assert.equal(runs[0].label, "甲站 → 丙站");
  assert.deepEqual(
    runs[1].stations.map((station) => station.stationId),
    ["B", "D"],
  );
});

test("playable stations can follow either travel direction", () => {
  assert.deepEqual(
    getPlayableStations(line, 0, ROUTE_DIRECTIONS.FORWARD).map(
      (station) => station.stationId,
    ),
    ["A", "B", "C"],
  );
  assert.deepEqual(
    getPlayableStations(line, 0, ROUTE_DIRECTIONS.REVERSE).map(
      (station) => station.stationId,
    ),
    ["C", "B", "A"],
  );
});

test("reversing a run does not mutate the source station order", () => {
  getPlayableStations(line, 1, ROUTE_DIRECTIONS.REVERSE);

  assert.deepEqual(line.segments[1], ["B", "D"]);
  assert.deepEqual(
    getLineRuns(line)[1].stations.map((station) => station.stationId),
    ["B", "D"],
  );
});
