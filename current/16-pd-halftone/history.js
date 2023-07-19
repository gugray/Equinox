import JSZip from "jszip";

function getLatestGist() {
  let i = 0;
  let lastGist = null;
  while (true) {
    const name = "gist" + i;
    const itmJson = localStorage.getItem(name);
    if (itmJson == null) break;
    const itm = JSON.parse(itmJson);
    lastGist = itm.code;
    ++i;
  }
  return [i, lastGist];
}

function storeGist(gist, seqId) {

  // Only store if gist has changed
  let prevGist = null;
  if (seqId > 0) {
    const itmJson = localStorage.getItem("gist" + (seqId - 1));
    prevGist = JSON.parse(itmJson).code;
  }
  if (prevGist == gist) return false;

  const name = "gist" + seqId;
  const itm = {
    ts: performance.now(),
    code: gist,
  }
  const itmJson = JSON.stringify(itm);
  localStorage.setItem(name, itmJson);
  return  true;
}

function saveHistory(clearStorage) {
  let i = 0;
  let items = [];
  while (true) {
    const name = "gist" + i;
    const itmJson = localStorage.getItem(name);
    if (itmJson == null) break;
    items.push(JSON.parse(itmJson));
    if (clearStorage) localStorage.removeItem(name);
    ++i;
  }

  // Zip it up
  let zip = new JSZip();
  for (let i = 0; i < items.length; ++i) {
    const itm = items[i];
    const name = i.toString().padStart(3, "0") + "-gist-" + msecToTime(itm.ts) + ".glsl";
    zip.file(name, itm.code);
  }
  zip.generateAsync({type: "blob"}).then(content => {
    const fileName = "show.zip";
    let file;
    let data = [];
    data.push(content);
    let properties = {type: 'application/zip'};
    try {
      file = new File(data, fileName, properties);
    } catch {
      file = new Blob(data, properties);
    }
    let url = URL.createObjectURL(file);
    const elmDownload = document.createElement("a");
    elmDownload.href = url;
    elmDownload.download = fileName;
    elmDownload.style.display = "block";
    elmDownload.style.position = "fixed";
    elmDownload.style.visibility = "hidden";
    elmDownload.click();
  });
}

function msecToTime(val) {
  const tenth = Math.floor((val % 1000) / 100);
  val = Math.floor(val / 1000);
  const sec = val % 60;
  val = Math.floor(val / 60);
  const min = val;
  return min.toString().padStart(2, "0") + "-" +
    sec.toString().padStart(2, "0") + "." +
    tenth.toString();
}

export {getLatestGist, storeGist, saveHistory}
