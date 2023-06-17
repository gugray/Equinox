import { JSONParser } from '@streamparser/json';
import {contains} from "codemirror/src/util/dom";

async function loadDanceData(url) {

  const frames = [];

  const jsonparser = new JSONParser({ stringBufferSize: undefined, paths: ['$.*'] });
  jsonparser.onValue = ({ value, key, parent, stack }) => {
    // Each returned value is the array that makes up a single frame
    const pts = processFrame(value);
    if (pts == null)
      return;
    frames.push(pts);
  };

  const response = await fetch(url);
  const reader = response.body.getReader();
  while(true) {
    const { done, value } = await reader.read();
    if (done) break;
    jsonparser.write(value);
  }

  return frames;
}

const figurePtKeys = [
  "LEFT_FOOT_INDEX",
  "LEFT_HEEL",
  "LEFT_ANKLE",
  "LEFT_KNEE",
  "LEFT_HIP",
  "LEFT_SHOULDER",
  "LEFT_ELBOW",
  "LEFT_WRIST",
  "LEFT_THUMB",
  "LEFT_INDEX",
  "LEFT_PINKY",
  "LEFT_EYE",
  "LEFT_EAR",
  "RIGHT_FOOT_INDEX",
  "RIGHT_HEEL",
  "RIGHT_ANKLE",
  "RIGHT_KNEE",
  "RIGHT_HIP",
  "RIGHT_SHOULDER",
  "RIGHT_ELBOW",
  "RIGHT_WRIST",
  "RIGHT_THUMB",
  "RIGHT_INDEX",
  "RIGHT_PINKY",
  "RIGHT_EYE",
  "RIGHT_EAR",
  "NOSE",
  "MOUTH_LEFT",
  "MOUTH_RIGHT",
];

function processFrame(items) {
  const pts = {};
  for (const key of figurePtKeys)
    pts[key] = null;
  // {
  //   "x": 0.5119538903236389,
  //   "y": 0.8362327218055725,
  //   "z": 0.11035990715026855,
  //   "name": "LEFT_ANKLE",
  //   "type": "body",
  //   "index": 27,
  //   "frame_index": 0
  // },
  let count = 0;
  for (const itm of items) {
    if (itm.type != "body") continue;
    if (!pts.hasOwnProperty(itm.name)) continue;
    pts[itm.name] = [itm.x, -itm.y, -itm.z, 0];
    ++count;
  }
  if (count != figurePtKeys.length) return null;
  const res = [];
  for (const key of figurePtKeys)
    res.push(pts[key]);
  return res;
}

export {figurePtKeys, loadDanceData}
