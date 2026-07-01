// Live gallery driver.
//
// Wires the REAL webview runtime (window.A2uiRuntime.mountRuntime, from
// ../dist/runtime.iife.js) to a FAKE host transport implemented entirely in the
// page. The runtime cannot tell the difference from the real VS Code host: it
// receives the same HostToInset messages (RENDER / STATE_DELTA) and posts back the
// same InsetToHost messages (READY / INTERACTION / RESIZE).
//
// Transport contract (src/host.tsx):
//   mountRuntime(rootEl, {
//     postMessage(msg),                 // inset -> host  (we log these)
//     onMessage(cb),                    // host -> inset  (we store cb, then feed it)
//   })

import { examples } from './examples.js';

const A2uiRuntime = /** @type {any} */ (window).A2uiRuntime;
if (!A2uiRuntime || typeof A2uiRuntime.mountRuntime !== 'function') {
  document.getElementById('render-host').textContent =
    'A2uiRuntime global not found. Run `npm run build` so dist/runtime.iife.js exists, then reload.';
  throw new Error('A2uiRuntime.mountRuntime unavailable — build dist first');
}

const hostEl = document.getElementById('render-host');
const sidebarEl = document.getElementById('sidebar');
const logEl = document.getElementById('log');
const sourceEl = document.getElementById('source');
const sourcePane = document.getElementById('source-pane');
const targetBadge = document.getElementById('target-badge');
const renderTitle = document.getElementById('render-title');

// ─── One live gallery session ─────────────────────────────────────────────────────
// Each time an example is chosen we tear down the previous runtime + feed and mount
// a fresh one, so hook/interval state never leaks between examples.
let current = null; // { dispose(): void }

function log(kind, detail) {
  const empty = logEl.querySelector('.empty');
  if (empty) { empty.remove(); }
  const line = document.createElement('div');
  line.className = `entry ${kind}`;
  const ts = new Date().toLocaleTimeString();
  line.textContent = `[${ts}] ${kind}${detail ? ' ' + detail : ''}`;
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
}

function mountExample(ex) {
  // Tear down any previous session.
  if (current) { current.dispose(); current = null; }
  hostEl.replaceChildren();
  logEl.replaceChildren();

  // The fake host holds the inset's message handler once the runtime calls
  // onMessage during mount. Anything we want to push to the runtime goes through it.
  let insetHandler = null;
  let feedTimer = null;

  const transport = {
    // inset -> host: the runtime posts READY / INTERACTION / RESIZE here.
    postMessage(msg) {
      if (!msg || typeof msg !== 'object') { return; }
      if (msg.type === 'INTERACTION') {
        log('INTERACTION', `${msg.componentId} → ${msg.binding}:${msg.action} ${JSON.stringify(msg.payload)}`);
        handleInteraction(ex, msg);
      } else if (msg.type === 'READY') {
        log('READY', `surface="${msg.surfaceId}"`);
        // Push the initial document once the inset signals it is ready.
        send({ type: 'RENDER', doc: ex.doc });
      } else if (msg.type === 'RESIZE') {
        log('RESIZE', `height=${msg.height}px`);
      }
    },
    // host -> inset: store the handler the runtime registers.
    onMessage(cb) { insetHandler = cb; },
  };

  // host -> inset: feed a HostToInset message into the runtime.
  function send(hostMsg) {
    if (insetHandler) {
      log('HOST', hostMsg.type + (hostMsg.type === 'STATE_DELTA' ? ` ${JSON.stringify(hostMsg.patch)}` : ''));
      insetHandler(hostMsg);
    }
  }

  // ── Interaction round-trip: the button/grid emits INTERACTION; a real host would
  // ── run a tool and answer with a STATE_DELTA. We simulate that reply here.
  const counterState = { clicks: 0 };
  function handleInteraction(example, msg) {
    if (example.id === 'counter' && msg.action === 'increment') {
      counterState.clicks += 1;
      send({
        type: 'STATE_DELTA',
        surfaceId: example.doc.surfaceId,
        patch: [
          { op: 'add', path: '/clicks', value: `Clicks: ${counterState.clicks}` },
          { op: 'add', path: '/lastAction', value: `Last action: ${msg.action}` },
        ],
      });
    } else if (example.id === 'seat-grid' && msg.payload && msg.payload.cellId) {
      // Confirm the selected seat as `selected` in the bound `seats` map.
      const cellId = msg.payload.cellId;
      send({
        type: 'STATE_DELTA',
        surfaceId: example.doc.surfaceId,
        patch: [{ op: 'add', path: `/seats/${cellId}`, value: 'selected' }],
      });
    }
  }

  // Mount the REAL runtime against the fake transport. It will synchronously call
  // onMessage (storing insetHandler) and postMessage({type:'READY'}), which triggers
  // our initial RENDER above.
  A2uiRuntime.mountRuntime(hostEl, transport);

  // ── Seed non-live examples that need an initial bound state before first paint.
  if (ex.id === 'counter') {
    send({
      type: 'STATE_DELTA',
      surfaceId: ex.doc.surfaceId,
      patch: [
        { op: 'add', path: '/clicks', value: 'Clicks: 0' },
        { op: 'add', path: '/lastAction', value: 'Last action: (none yet)' },
      ],
    });
  } else if (ex.id === 'seat-grid') {
    // A few seats start taken to show the disabled cell state.
    send({
      type: 'STATE_DELTA',
      surfaceId: ex.doc.surfaceId,
      patch: [{ op: 'add', path: '/seats', value: { r0c1: 'taken', r1c3: 'taken', r2c5: 'taken' } }],
    });
  }

  // ── Live feed: for examples with a `live` binding, push a STATE_DELTA on an
  // ── interval that grows the bound series so the chart animates. This mirrors the
  // ── host's SnapshotSource → McpDataPipe → STATE_DELTA path.
  if (ex.live) {
    const key = ex.live.stateKey;
    let series = [10, 12, 11, 14];
    // Seed the series so the chart has data immediately.
    send({ type: 'STATE_DELTA', surfaceId: ex.doc.surfaceId, patch: [{ op: 'add', path: `/${key}`, value: series }] });
    const MAX_POINTS = 40;
    feedTimer = setInterval(() => {
      const next = Math.max(2, Math.round(20 + 15 * Math.sin(Date.now() / 1200) + (Math.random() * 10 - 5)));
      series = [...series, next].slice(-MAX_POINTS);
      send({ type: 'STATE_DELTA', surfaceId: ex.doc.surfaceId, patch: [{ op: 'replace', path: `/${key}`, value: series }] });
    }, ex.live.intervalMs ?? 1000);
  }

  current = {
    dispose() {
      if (feedTimer) { clearInterval(feedTimer); feedTimer = null; }
      insetHandler = null;
    },
  };

  // Update the surrounding UI.
  renderTitle.textContent = `Render — ${ex.title}`;
  targetBadge.textContent = `target: ${ex.doc.target ?? 'inset'}${ex.doc.live ? ' · live' : ''}`;
  sourceEl.textContent = JSON.stringify(ex.doc, null, 2);
  for (const node of sidebarEl.children) {
    node.classList.toggle('active', node.dataset.id === ex.id);
  }
}

// ─── Build the sidebar list ─────────────────────────────────────────────────────
for (const ex of examples) {
  const item = document.createElement('div');
  item.className = 'example';
  item.dataset.id = ex.id;
  item.tabIndex = 0;
  item.setAttribute('role', 'button');
  item.innerHTML = `<div class="title"></div><div class="blurb"></div>`;
  item.querySelector('.title').textContent = ex.title;
  item.querySelector('.blurb').textContent = ex.blurb;
  item.addEventListener('click', () => mountExample(ex));
  item.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); mountExample(ex); } });
  sidebarEl.appendChild(item);
}

// ─── Source toggle ───────────────────────────────────────────────────────────────
document.getElementById('toggle-source').addEventListener('click', () => {
  sourcePane.hidden = !sourcePane.hidden;
});

// Mount the first example on load.
if (examples.length > 0) { mountExample(examples[0]); }
