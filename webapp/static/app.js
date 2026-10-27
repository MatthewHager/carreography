// The page: choose a song and cars, send them to /api/jobs, then follow the job until it's done.
// The job's id lives in the address (?job=<id>), so reloading or sharing the address picks it up again.

const $ = (id) => document.getElementById(id);
let config = { vehicles: [], max_cars: 5, max_upload_mb: 60, max_minutes: 10, keep_hours: 24 };
let cars = ["Y"];                       // the lineup, crowd's left to right: one vehicle letter per car

// --- the form --------------------------------------------------------------------------------

function renderCars() {
  const list = $("cars");
  list.replaceChildren(...cars.map((letter, i) => {
    const select = document.createElement("select");
    select.id = `car-${i}`;
    select.setAttribute("aria-label", `Car ${i + 1}`);
    for (const v of config.vehicles) select.add(new Option(v.label, v.letter, false, v.letter === letter));
    select.onchange = () => { cars[i] = select.value; };

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "secondary remove";
    remove.textContent = "Remove";
    remove.setAttribute("aria-label", `Remove car ${i + 1}`);
    remove.disabled = cars.length === 1;
    remove.onclick = () => { cars.splice(i, 1); renderCars(); };

    const num = document.createElement("span");
    num.className = "num";
    num.textContent = `Car ${i + 1}`;
    const li = document.createElement("li");
    li.append(num, select, remove);
    return li;
  }));
  $("add-car").disabled = cars.length >= config.max_cars;
}

function chooseFile(file) {
  $("drop-text").textContent = file ? `${file.name} (${(file.size / 1e6).toFixed(1)} MB)` : "Drop a song here, or tap to choose one";
  $("drop").classList.toggle("chosen", !!file);
  if (file && !$("name").value) $("name").placeholder = file.name.replace(/\.[^.]+$/, "");
}

function showError(text) {
  $("form-error").textContent = text;
  $("form-error").hidden = !text;
}

async function submit(event) {
  event.preventDefault();
  showError("");
  const file = $("song").files[0];
  if (!file) return showError("Choose a song first.");
  if (file.size > config.max_upload_mb * 1e6) return showError(`That file is too big: the limit is ${config.max_upload_mb} MB.`);

  const data = new FormData();
  data.set("song", file);
  data.set("name", $("name").value);
  data.set("lineup", cars.join(""));
  data.set("start", $("start").value);
  data.set("end", $("end").value);
  data.set("stems", $("stems").checked);
  data.set("style", $("legato").checked ? "legato" : "none");
  data.set("max_level", $("max_level").value);
  data.set("diagnostic", $("diagnostic").checked);
  data.set("no_liftgate", $("no_liftgate").checked);

  $("submit").disabled = true;
  $("submit").textContent = "Uploading...";
  try {
    const reply = await fetch("/api/jobs", { method: "POST", body: data });
    const body = await reply.json().catch(() => ({}));
    if (!reply.ok) throw new Error(typeof body.detail === "string" ? body.detail : "The upload was not accepted.");
    history.replaceState(null, "", `?job=${body.id}`);
    follow(body.id);
  } catch (e) {
    showError(e.message);
    $("submit").disabled = false;
    $("submit").textContent = "Make the light show";
  }
}

// --- following a job -------------------------------------------------------------------------

function show(section) {
  for (const id of ["form", "progress", "failed", "done"]) $(id).hidden = id !== section;
}

async function follow(id) {
  show("progress");
  let job;
  try {
    const reply = await fetch(`/api/jobs/${id}`);
    const body = await reply.json().catch(() => ({}));
    if (!reply.ok) return fail(body.detail || "Could not find this show.");
    job = body;
  } catch {
    $("step").textContent = "Lost contact with the server, trying again...";
    return setTimeout(() => follow(id), 2000);
  }

  if (job.status === "failed") return fail(job.error);
  if (job.status === "done") return finish(job);
  $("queue").hidden = !job.queue_position;
  $("queue").textContent = job.queue_position ? `Waiting in the queue: you are number ${job.queue_position}.` : "";
  $("bar").value = job.percent;
  $("step").textContent = job.status === "queued" ? "Waiting for the songs ahead of yours." : `${job.step} (${job.percent}%)`;
  setTimeout(() => follow(id), 2000);
}

function fail(text) {
  $("error-text").textContent = text;
  show("failed");
}

function finish(job) {
  $("done-title").textContent = `"${job.name}" is ready`;
  $("download-all").href = job.download_url;
  $("viewer").href = job.viewer_url;
  $("viewer-diagnostic").hidden = !job.diagnostic_viewer_url;
  if (job.diagnostic_viewer_url) $("viewer-diagnostic").href = job.diagnostic_viewer_url;
  $("car-links").replaceChildren(...job.cars.map((car) => {
    const a = document.createElement("a");
    a.href = car.download_url;
    a.textContent = `Car ${car.number} · ${car.vehicle} · ${car.place}`;
    const li = document.createElement("li");
    li.append(a);
    return li;
  }));
  show("done");
}

// --- start -----------------------------------------------------------------------------------

async function start() {
  try {
    config = await (await fetch("/api/config")).json();
  } catch { /* the defaults are fine; the server will check everything anyway */ }
  $("limits").textContent = `Shows can be up to ${config.max_minutes} minutes long; files up to ${config.max_upload_mb} MB.`;
  $("rights").textContent = `Please use music you have the right to use. Uploads and results are deleted after ${config.keep_hours} hours.`;
  renderCars();

  $("add-car").onclick = () => { cars.push(cars[cars.length - 1]); renderCars(); };
  $("form").onsubmit = submit;
  $("song").onchange = () => chooseFile($("song").files[0]);
  const drop = $("drop");
  for (const type of ["dragenter", "dragover"]) drop.addEventListener(type, (e) => { e.preventDefault(); drop.classList.add("over"); });
  for (const type of ["dragleave", "drop"]) drop.addEventListener(type, () => drop.classList.remove("over"));
  drop.addEventListener("drop", (e) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) { $("song").files = e.dataTransfer.files; chooseFile($("song").files[0]); }
  });

  const id = new URLSearchParams(location.search).get("job");
  if (id) follow(id);
}

start();
