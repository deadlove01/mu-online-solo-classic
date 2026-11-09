// include: shell.js
// include: minimum_runtime_check.js
(function() {
  // "30.0.0" -> 300000
  function humanReadableVersionToPacked(str) {
    str = str.split('-')[0]; // Remove any trailing part from e.g. "12.53.3-alpha"
    var vers = str.split('.').slice(0, 3);
    while(vers.length < 3) vers.push('00');
    vers = vers.map((n, i, arr) => n.padStart(2, '0'));
    return vers.join('');
  }
  // 300000 -> "30.0.0"
  var packedVersionToHumanReadable = n => [n / 10_000 | 0, (n / 100 | 0) % 100, n % 100].join('.');

  var TARGET_NOT_SUPPORTED = 2147483647;

  // Note: We use a typeof check here instead of optional chaining using
  // globalThis because older browsers might not have globalThis defined.

  // We skip the node version checking when running on Bun/Deno since the node
  // version they report doesn't seem to be useful.
  if (typeof process !== 'undefined' && !process.versions?.bun && typeof Deno == "undefined") {
    var currentNodeVersion = process.versions?.node ? humanReadableVersionToPacked(process.versions.node) : TARGET_NOT_SUPPORTED;
    if (currentNodeVersion < 180300) {
      throw new Error(`This emscripten-generated code requires node v${ packedVersionToHumanReadable(180300) } (detected v${packedVersionToHumanReadable(currentNodeVersion)})`);
    }
  }

  var userAgent = typeof navigator !== 'undefined' && navigator.userAgent;
  if (!userAgent) {
    return;
  }

  var currentSafariVersion = userAgent.includes("Safari/") && !userAgent.includes("Chrome/") && userAgent.match(/Version\/(\d+\.?\d*\.?\d*)/) ? humanReadableVersionToPacked(userAgent.match(/Version\/(\d+\.?\d*\.?\d*)/)[1]) : TARGET_NOT_SUPPORTED;
  if (currentSafariVersion < 150000) {
    throw new Error(`This emscripten-generated code requires Safari v${ packedVersionToHumanReadable(150000) } (detected v${currentSafariVersion})`);
  }

  var currentFirefoxVersion = userAgent.match(/Firefox\/(\d+(?:\.\d+)?)/) ? parseFloat(userAgent.match(/Firefox\/(\d+(?:\.\d+)?)/)[1]) : TARGET_NOT_SUPPORTED;
  if (currentFirefoxVersion < 79) {
    throw new Error(`This emscripten-generated code requires Firefox v79 (detected v${currentFirefoxVersion})`);
  }

  var currentChromeVersion = userAgent.match(/Chrome\/(\d+(?:\.\d+)?)/) ? parseFloat(userAgent.match(/Chrome\/(\d+(?:\.\d+)?)/)[1]) : TARGET_NOT_SUPPORTED;
  if (currentChromeVersion < 85) {
    throw new Error(`This emscripten-generated code requires Chrome v85 (detected v${currentChromeVersion})`);
  }
})();

// end include: minimum_runtime_check.js
// The Module object: Our interface to the outside world. We import
// and export values on it. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(moduleArg) => Promise<Module>
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to check if Module already exists (e.g. case 3 above).
// Substitution will be replaced with actual code on later stage of the build,
// this way Closure Compiler will not mangle it (e.g. case 4. above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module = typeof Module != 'undefined' ? Module : {};

// Determine the runtime environment we are in. You can customize this by
// setting the ENVIRONMENT setting at compile time (see settings.js).

// Attempt to auto-detect the environment
var ENVIRONMENT_IS_WEB = !!globalThis.window;
var ENVIRONMENT_IS_WORKER = !!globalThis.WorkerGlobalScope;
// N.b. Electron.js environment is simultaneously a NODE-environment, but
// also a web environment.
var ENVIRONMENT_IS_NODE = globalThis.process?.versions?.node && globalThis.process?.type != 'renderer';
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

// --pre-jses are emitted after the Module integration code, so that they can
// refer to Module (if they choose; they can also define Module)

  if (!Module['expectedDataFileDownloads']) Module['expectedDataFileDownloads'] = 0;
  Module['expectedDataFileDownloads']++;
  (() => {
    // Do not attempt to redownload the virtual filesystem data when in a pthread or a Wasm Worker context.
    var isPthread = typeof ENVIRONMENT_IS_PTHREAD != 'undefined' && ENVIRONMENT_IS_PTHREAD;
    var isWasmWorker = typeof ENVIRONMENT_IS_WASM_WORKER != 'undefined' && ENVIRONMENT_IS_WASM_WORKER;
    if (isPthread || isWasmWorker) return;
    var isNode = globalThis.process && globalThis.process.versions && globalThis.process.versions.node && globalThis.process.type != 'renderer';
    async function loadPackage(metadata) {

      var PACKAGE_PATH = '';
      if (typeof window === 'object') {
        PACKAGE_PATH = window['encodeURIComponent'](window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/')) + '/');
      } else if (typeof process === 'undefined' && typeof location !== 'undefined') {
        // web worker
        PACKAGE_PATH = encodeURIComponent(location.pathname.substring(0, location.pathname.lastIndexOf('/')) + '/');
      }
      var PACKAGE_NAME = 'D:/Games/UnityGames/mu-online-solo-classic/src/client/out/shell_login.data';
      var REMOTE_PACKAGE_BASE = 'shell_login.data';
      var REMOTE_PACKAGE_NAME = Module['locateFile'] ? Module['locateFile'](REMOTE_PACKAGE_BASE, '') : REMOTE_PACKAGE_BASE;
      var REMOTE_PACKAGE_SIZE = metadata['remote_package_size'];

      async function fetchRemotePackage(packageName, packageSize) {
        if (isNode) {
          var contents = require('fs').readFileSync(packageName);
          return new Uint8Array(contents).buffer;
        }
        if (!Module['dataFileDownloads']) Module['dataFileDownloads'] = {};
        try {
          var response = await fetch(packageName);
        } catch (e) {
          throw new Error(`Network Error: ${packageName}`, {e});
        }
        if (!response.ok) {
          throw new Error(`${response.status}: ${response.url}`);
        }

        const chunks = [];
        const headers = response.headers;
        const contentLength = Number(headers.get('Content-Length')) || 0;
        const total = contentLength > 0 ? contentLength : (Number(packageSize) || 0);
        const uncompressedTotal = Number(packageSize) || total || 1;
        let loaded = 0;

        Module['setStatus'] && Module['setStatus']('Downloading data...');
        const reader = response.body.getReader();

        while (1) {
          var {done, value} = await reader.read();
          if (done) {
            Module['dataFileDownloads'][packageName] = {loaded: total, total};
            let totalLoaded = 0;
            let totalSize = 0;
            for (const download of Object.values(Module['dataFileDownloads'])) {
              totalLoaded += download.loaded;
              totalSize += download.total;
            }
            Module['setStatus'] && Module['setStatus'](`Downloading data... (${totalLoaded}/${totalSize})`);
            break;
          }
          chunks.push(value);
          loaded += value.length;
          const wireLoaded = total === uncompressedTotal
            ? loaded
            : Math.min(total, Math.round(loaded * (total / uncompressedTotal)));
          Module['dataFileDownloads'][packageName] = {loaded: wireLoaded, total};

          let totalLoaded = 0;
          let totalSize = 0;

          for (const download of Object.values(Module['dataFileDownloads'])) {
            totalLoaded += download.loaded;
            totalSize += download.total;
          }

          Module['setStatus'] && Module['setStatus'](`Downloading data... (${totalLoaded}/${totalSize})`);
        }

        const packageData = new Uint8Array(chunks.map((c) => c.length).reduce((a, b) => a + b, 0));
        let offset = 0;
        for (const chunk of chunks) {
          packageData.set(chunk, offset);
          offset += chunk.length;
        }
        return packageData.buffer;
      }

      var fetchPromise;
      var fetched = Module['getPreloadedPackage'] && Module['getPreloadedPackage'](REMOTE_PACKAGE_NAME, REMOTE_PACKAGE_SIZE);

      if (!fetched) {
        // Note that we don't use await here because we want to execute the
        // the rest of this function immediately.
        fetchPromise = fetchRemotePackage(REMOTE_PACKAGE_NAME, REMOTE_PACKAGE_SIZE);
      }

    async function runWithFS(Module) {

      function assert(check, msg) {
        if (!check) throw new Error(msg);
      }
Module['FS_createPath']("/", "Data", true, true);
Module['FS_createPath']("/Data", "Effect", true, true);
Module['FS_createPath']("/Data", "Interface", true, true);
Module['FS_createPath']("/Data", "Item", true, true);
Module['FS_createPath']("/Data/Item", "Custom", true, true);
Module['FS_createPath']("/Data/Item/Custom", "20", true, true);
Module['FS_createPath']("/Data/Item/Custom", "72", true, true);
Module['FS_createPath']("/Data/Item/Custom", "Rudolph", true, true);
Module['FS_createPath']("/Data", "Local", true, true);
Module['FS_createPath']("/Data", "Logo", true, true);
Module['FS_createPath']("/Data", "Monster", true, true);
Module['FS_createPath']("/Data/Monster", "Karane", true, true);
Module['FS_createPath']("/Data/Monster", "Pichula", true, true);
Module['FS_createPath']("/Data", "Music", true, true);
Module['FS_createPath']("/Data", "NPC", true, true);
Module['FS_createPath']("/Data", "Object1", true, true);
Module['FS_createPath']("/Data", "Object10", true, true);
Module['FS_createPath']("/Data", "Object11", true, true);
Module['FS_createPath']("/Data", "Object12", true, true);
Module['FS_createPath']("/Data", "Object2", true, true);
Module['FS_createPath']("/Data", "Object3", true, true);
Module['FS_createPath']("/Data", "Object4", true, true);
Module['FS_createPath']("/Data", "Object5", true, true);
Module['FS_createPath']("/Data", "Object6", true, true);
Module['FS_createPath']("/Data", "Object7", true, true);
Module['FS_createPath']("/Data", "Object8", true, true);
Module['FS_createPath']("/Data", "Object9", true, true);
Module['FS_createPath']("/Data", "Player", true, true);
Module['FS_createPath']("/Data/Player", "Custom", true, true);
Module['FS_createPath']("/Data/Player/Custom", "21", true, true);
Module['FS_createPath']("/Data", "Skill", true, true);
Module['FS_createPath']("/Data", "Sound", true, true);
Module['FS_createPath']("/Data", "World1", true, true);
Module['FS_createPath']("/Data", "World10", true, true);
Module['FS_createPath']("/Data", "World11", true, true);
Module['FS_createPath']("/Data", "World12", true, true);
Module['FS_createPath']("/Data", "World2", true, true);
Module['FS_createPath']("/Data", "World3", true, true);
Module['FS_createPath']("/Data", "World4", true, true);
Module['FS_createPath']("/Data", "World5", true, true);
Module['FS_createPath']("/Data", "World6", true, true);
Module['FS_createPath']("/Data", "World7", true, true);
Module['FS_createPath']("/Data", "World8", true, true);
Module['FS_createPath']("/Data", "World9", true, true);

      async function processPackageData(arrayBuffer) {
        assert(arrayBuffer, 'Loading data file failed.');
        assert(arrayBuffer.constructor.name === ArrayBuffer.name, 'bad input to processPackageData ' + arrayBuffer.constructor.name);
        var byteArray = new Uint8Array(arrayBuffer);
        var curr;
        // Reuse the bytearray from the XHR as the source for file reads.
          for (var file of metadata['files']) {
            var name = file['filename'];
            var data = byteArray.subarray(file['start'], file['end']);
            // canOwn this data in the filesystem, it is a slice into the heap that will never change
        Module['FS_createDataFile'](name, null, data, true, true, true);
          }
          Module['removeRunDependency']('datafile_D:/Games/UnityGames/mu-online-solo-classic/src/client/out/shell_login.data');
      }
      Module['addRunDependency']('datafile_D:/Games/UnityGames/mu-online-solo-classic/src/client/out/shell_login.data');

      if (!Module['preloadResults']) Module['preloadResults'] = {};

      Module['preloadResults'][PACKAGE_NAME] = {fromCache: false};
      if (!fetched) {
        fetched = await fetchPromise;
      }
      await processPackageData(fetched);

    }
    // Detect whether the module JS file has already been loaded.
    if (Module['FS_createPath']) {
      runWithFS(Module);
    } else {
      if (!Module['preRun']) Module['preRun'] = [];
      Module['preRun'].push(runWithFS); // FS is not initialized yet, wait for it
    }

    }
    loadPackage({"files": [{"filename": "/Data/Dec2.dat", "start": 0, "end": 54}, {"filename": "/Data/Effect/Chrome01.OZJ", "start": 54, "end": 9058}, {"filename": "/Data/Effect/Chrome02.OZJ", "start": 9058, "end": 15349}, {"filename": "/Data/Effect/DinoE.OZJ", "start": 15349, "end": 27677}, {"filename": "/Data/Effect/Explotion01.OZJ", "start": 27677, "end": 69591}, {"filename": "/Data/Effect/Fire01.OZJ", "start": 69591, "end": 83871}, {"filename": "/Data/Effect/Fire02.OZJ", "start": 83871, "end": 93374}, {"filename": "/Data/Effect/Fire03.OZJ", "start": 93374, "end": 107099}, {"filename": "/Data/Effect/Fire04.OZJ", "start": 107099, "end": 116508}, {"filename": "/Data/Effect/Flame01.OZJ", "start": 116508, "end": 125987}, {"filename": "/Data/Effect/Flare.OZJ", "start": 125987, "end": 137190}, {"filename": "/Data/Effect/JointEnergy01.OZJ", "start": 137190, "end": 142044}, {"filename": "/Data/Effect/JointLaser01.OZJ", "start": 142044, "end": 147741}, {"filename": "/Data/Effect/JointLaser02.OZJ", "start": 147741, "end": 156207}, {"filename": "/Data/Effect/JointSpirit01.OZJ", "start": 156207, "end": 166383}, {"filename": "/Data/Effect/JointThunder01.OZJ", "start": 166383, "end": 178222}, {"filename": "/Data/Effect/Magic_Circle1.OZJ", "start": 178222, "end": 185145}, {"filename": "/Data/Effect/Magic_Ground1.OZJ", "start": 185145, "end": 198830}, {"filename": "/Data/Effect/Magic_Ground2.OZJ", "start": 198830, "end": 212768}, {"filename": "/Data/Effect/NSkill.OZJ", "start": 212768, "end": 216646}, {"filename": "/Data/Effect/PoundingBall.OZJ", "start": 216646, "end": 222215}, {"filename": "/Data/Effect/Shiny01.OZJ", "start": 222215, "end": 227150}, {"filename": "/Data/Effect/Shiny02.OZJ", "start": 227150, "end": 233739}, {"filename": "/Data/Effect/Shiny03.OZJ", "start": 233739, "end": 237258}, {"filename": "/Data/Effect/Spark01.OZJ", "start": 237258, "end": 242166}, {"filename": "/Data/Effect/Spark02.OZJ", "start": 242166, "end": 247050}, {"filename": "/Data/Effect/Spark03.OZJ", "start": 247050, "end": 252781}, {"filename": "/Data/Effect/Thunder01.OZJ", "start": 252781, "end": 261625}, {"filename": "/Data/Effect/bab2.OZJ", "start": 261625, "end": 267318}, {"filename": "/Data/Effect/blood.OZT", "start": 267318, "end": 332902}, {"filename": "/Data/Effect/blood01.OZT", "start": 332902, "end": 349334}, {"filename": "/Data/Effect/blur01.OZJ", "start": 349334, "end": 354638}, {"filename": "/Data/Effect/cloudLight.OZJ", "start": 354638, "end": 372372}, {"filename": "/Data/Effect/clouds.OZJ", "start": 372372, "end": 402036}, {"filename": "/Data/Effect/eye01.OZJ", "start": 402036, "end": 407166}, {"filename": "/Data/Effect/fi01.OZJ", "start": 407166, "end": 419685}, {"filename": "/Data/Effect/fi02.OZT", "start": 419685, "end": 681877}, {"filename": "/Data/Effect/flare01.OZJ", "start": 681877, "end": 687728}, {"filename": "/Data/Effect/flare02.OZJ", "start": 687728, "end": 691398}, {"filename": "/Data/Effect/flareBlue.OZJ", "start": 691398, "end": 696031}, {"filename": "/Data/Effect/lightning.OZJ", "start": 696031, "end": 754597}, {"filename": "/Data/Effect/lightning2.OZJ", "start": 754597, "end": 773981}, {"filename": "/Data/Effect/motion_blur.OZJ", "start": 773981, "end": 782715}, {"filename": "/Data/Effect/motion_blur_r.OZJ", "start": 782715, "end": 790085}, {"filename": "/Data/Effect/motion_blur_r2.OZJ", "start": 790085, "end": 802471}, {"filename": "/Data/Effect/ring.OZJ", "start": 802471, "end": 811559}, {"filename": "/Data/Effect/smoke01.OZJ", "start": 811559, "end": 818377}, {"filename": "/Data/Effect/smoke02.OZT", "start": 818377, "end": 834809}, {"filename": "/Data/Effect/spark.OZJ", "start": 834809, "end": 845280}, {"filename": "/Data/Enc1.dat", "start": 845280, "end": 845334}, {"filename": "/Data/Gate.bmd", "start": 845334, "end": 846234}, {"filename": "/Data/Interface/Accept_box01.OZJ", "start": 846234, "end": 852229}, {"filename": "/Data/Interface/Accept_box02.OZJ", "start": 852229, "end": 858400}, {"filename": "/Data/Interface/Back1.OZJ", "start": 858400, "end": 864417}, {"filename": "/Data/Interface/Back2.OZJ", "start": 864417, "end": 871038}, {"filename": "/Data/Interface/Back3.OZJ", "start": 871038, "end": 877610}, {"filename": "/Data/Interface/Bar.OZJ", "start": 877610, "end": 883380}, {"filename": "/Data/Interface/Buy_01.OZJ", "start": 883380, "end": 889312}, {"filename": "/Data/Interface/Buy_02.OZJ", "start": 889312, "end": 895200}, {"filename": "/Data/Interface/Cancel.OZJ", "start": 895200, "end": 902123}, {"filename": "/Data/Interface/Cancel2.OZJ", "start": 902123, "end": 909820}, {"filename": "/Data/Interface/Cursor.OZT", "start": 909820, "end": 913964}, {"filename": "/Data/Interface/Cursorattack.OZT", "start": 913964, "end": 918108}, {"filename": "/Data/Interface/Cursordontmove.OZT", "start": 918108, "end": 922252}, {"filename": "/Data/Interface/Cursoreye.OZT", "start": 922252, "end": 938684}, {"filename": "/Data/Interface/Cursorget.OZT", "start": 938684, "end": 942828}, {"filename": "/Data/Interface/Cursorleanagainst.OZT", "start": 942828, "end": 946972}, {"filename": "/Data/Interface/Cursorpush.OZT", "start": 946972, "end": 951116}, {"filename": "/Data/Interface/Cursorrepair.OZT", "start": 951116, "end": 955260}, {"filename": "/Data/Interface/Cursorsitdown.OZT", "start": 955260, "end": 959404}, {"filename": "/Data/Interface/Cursortalk.OZT", "start": 959404, "end": 975836}, {"filename": "/Data/Interface/Dialogue1.OZJ", "start": 975836, "end": 985884}, {"filename": "/Data/Interface/Dialogue2.OZJ", "start": 985884, "end": 995662}, {"filename": "/Data/Interface/Dialogue2_1.OZJ", "start": 995662, "end": 1000892}, {"filename": "/Data/Interface/Exit_01.OZJ", "start": 1000892, "end": 1006846}, {"filename": "/Data/Interface/Exit_02.OZJ", "start": 1006846, "end": 1012912}, {"filename": "/Data/Interface/Font.OZT", "start": 1012912, "end": 1275104}, {"filename": "/Data/Interface/Fontinput.OZT", "start": 1275104, "end": 1307920}, {"filename": "/Data/Interface/Fonttest.OZT", "start": 1307920, "end": 1340736}, {"filename": "/Data/Interface/Guild.OZJ", "start": 1340736, "end": 1347057}, {"filename": "/Data/Interface/Guild.OZT", "start": 1347057, "end": 1347361}, {"filename": "/Data/Interface/Inventorybox2.OZJ", "start": 1347361, "end": 1353231}, {"filename": "/Data/Interface/Item_Back02.OZJ", "start": 1353231, "end": 1387301}, {"filename": "/Data/Interface/Item_back01.OZJ", "start": 1387301, "end": 1434499}, {"filename": "/Data/Interface/Item_boots.OZJ", "start": 1434499, "end": 1440792}, {"filename": "/Data/Interface/Item_box.OZJ", "start": 1440792, "end": 1446292}, {"filename": "/Data/Interface/Item_cap.OZJ", "start": 1446292, "end": 1452604}, {"filename": "/Data/Interface/Item_fairy.OZJ", "start": 1452604, "end": 1458999}, {"filename": "/Data/Interface/Item_gloves.OZJ", "start": 1458999, "end": 1465440}, {"filename": "/Data/Interface/Item_lower.OZJ", "start": 1465440, "end": 1471919}, {"filename": "/Data/Interface/Item_money.OZJ", "start": 1471919, "end": 1478678}, {"filename": "/Data/Interface/Item_necklace.OZJ", "start": 1478678, "end": 1483929}, {"filename": "/Data/Interface/Item_ring.OZJ", "start": 1483929, "end": 1489159}, {"filename": "/Data/Interface/Item_upper.OZJ", "start": 1489159, "end": 1496572}, {"filename": "/Data/Interface/Item_weapon01.OZJ", "start": 1496572, "end": 1503953}, {"filename": "/Data/Interface/Item_weapon02.OZJ", "start": 1503953, "end": 1511205}, {"filename": "/Data/Interface/Item_wing.OZJ", "start": 1511205, "end": 1518182}, {"filename": "/Data/Interface/Level01.OZJ", "start": 1518182, "end": 1523229}, {"filename": "/Data/Interface/Level_01.OZJ", "start": 1523229, "end": 1529473}, {"filename": "/Data/Interface/Level_02.OZJ", "start": 1529473, "end": 1535695}, {"filename": "/Data/Interface/Level_box.OZJ", "start": 1535695, "end": 1542807}, {"filename": "/Data/Interface/Lock_01.OZJ", "start": 1542807, "end": 1548981}, {"filename": "/Data/Interface/Lock_02.OZJ", "start": 1548981, "end": 1555295}, {"filename": "/Data/Interface/Lock_03.OZJ", "start": 1555295, "end": 1561525}, {"filename": "/Data/Interface/Lock_04.OZJ", "start": 1561525, "end": 1567876}, {"filename": "/Data/Interface/Menu01_new.OZJ", "start": 1567876, "end": 1584577}, {"filename": "/Data/Interface/Menu02.OZJ", "start": 1584577, "end": 1599484}, {"filename": "/Data/Interface/Menu03_new.OZJ", "start": 1599484, "end": 1618522}, {"filename": "/Data/Interface/Menu03_new_ag.OZJ", "start": 1618522, "end": 1621397}, {"filename": "/Data/Interface/Menu04.OZT", "start": 1621397, "end": 1640885}, {"filename": "/Data/Interface/Menu_blue.OZJ", "start": 1640885, "end": 1651154}, {"filename": "/Data/Interface/Menu_character.OZJ", "start": 1651154, "end": 1656798}, {"filename": "/Data/Interface/Menu_green.OZJ", "start": 1656798, "end": 1666738}, {"filename": "/Data/Interface/Menu_inventory.OZJ", "start": 1666738, "end": 1672549}, {"filename": "/Data/Interface/Menu_party.OZJ", "start": 1672549, "end": 1678347}, {"filename": "/Data/Interface/Menu_red.OZJ", "start": 1678347, "end": 1688239}, {"filename": "/Data/Interface/Message_box.OZJ", "start": 1688239, "end": 1707054}, {"filename": "/Data/Interface/Message_box1.OZJ", "start": 1707054, "end": 1714847}, {"filename": "/Data/Interface/Message_box2.OZJ", "start": 1714847, "end": 1719759}, {"filename": "/Data/Interface/MiniMap.OZT", "start": 1719759, "end": 1824299}, {"filename": "/Data/Interface/Mix_button1.OZJ", "start": 1824299, "end": 1829339}, {"filename": "/Data/Interface/Mix_button2.OZJ", "start": 1829339, "end": 1834852}, {"filename": "/Data/Interface/Money_01.OZJ", "start": 1834852, "end": 1840736}, {"filename": "/Data/Interface/Money_02.OZJ", "start": 1840736, "end": 1846694}, {"filename": "/Data/Interface/Nis_back.OZJ", "start": 1846694, "end": 1848460}, {"filename": "/Data/Interface/Nis_bar.OZJ", "start": 1848460, "end": 1850223}, {"filename": "/Data/Interface/Nis_btnalpha.OZJ", "start": 1850223, "end": 1852615}, {"filename": "/Data/Interface/Nis_btnarrow.OZJ", "start": 1852615, "end": 1854984}, {"filename": "/Data/Interface/Nis_btnchat.OZJ", "start": 1854984, "end": 1857395}, {"filename": "/Data/Interface/Nis_btnend.OZJ", "start": 1857395, "end": 1859767}, {"filename": "/Data/Interface/Nis_btnmax.OZJ", "start": 1859767, "end": 1861827}, {"filename": "/Data/Interface/Nis_btnmin.OZJ", "start": 1861827, "end": 1863906}, {"filename": "/Data/Interface/Nis_btnsize.OZJ", "start": 1863906, "end": 1866306}, {"filename": "/Data/Interface/Nis_hframe.OZJ", "start": 1866306, "end": 1871548}, {"filename": "/Data/Interface/Nis_rsframe.OZJ", "start": 1871548, "end": 1874526}, {"filename": "/Data/Interface/Nis_rsframe.OZT", "start": 1874526, "end": 1875630}, {"filename": "/Data/Interface/Nis_vframe.OZJ", "start": 1875630, "end": 1878055}, {"filename": "/Data/Interface/Ok.OZJ", "start": 1878055, "end": 1884769}, {"filename": "/Data/Interface/Ok2.OZJ", "start": 1884769, "end": 1892121}, {"filename": "/Data/Interface/Progress.OZJ", "start": 1892121, "end": 1895763}, {"filename": "/Data/Interface/Progress_back.OZJ", "start": 1895763, "end": 1900137}, {"filename": "/Data/Interface/Repair_01.OZJ", "start": 1900137, "end": 1906096}, {"filename": "/Data/Interface/Repair_02.OZJ", "start": 1906096, "end": 1912096}, {"filename": "/Data/Interface/Sell_01.OZJ", "start": 1912096, "end": 1917949}, {"filename": "/Data/Interface/Sell_02.OZJ", "start": 1917949, "end": 1923794}, {"filename": "/Data/Interface/Skill.OZJ", "start": 1923794, "end": 2021659}, {"filename": "/Data/Interface/Trading_line.OZJ", "start": 2021659, "end": 2030467}, {"filename": "/Data/Item/Antidote01.bmd", "start": 2030467, "end": 2039031}, {"filename": "/Data/Item/Arrows01.bmd", "start": 2039031, "end": 2043188}, {"filename": "/Data/Item/Arrows02.bmd", "start": 2043188, "end": 2050718}, {"filename": "/Data/Item/Axe01.bmd", "start": 2050718, "end": 2055440}, {"filename": "/Data/Item/Axe02.bmd", "start": 2055440, "end": 2061294}, {"filename": "/Data/Item/Axe03.bmd", "start": 2061294, "end": 2067732}, {"filename": "/Data/Item/Axe04.bmd", "start": 2067732, "end": 2073566}, {"filename": "/Data/Item/Axe05.bmd", "start": 2073566, "end": 2077234}, {"filename": "/Data/Item/Axe06.bmd", "start": 2077234, "end": 2082736}, {"filename": "/Data/Item/Axe07.bmd", "start": 2082736, "end": 2089182}, {"filename": "/Data/Item/Axe08.bmd", "start": 2089182, "end": 2096404}, {"filename": "/Data/Item/Axe09.bmd", "start": 2096404, "end": 2106893}, {"filename": "/Data/Item/Axes02.OZJ", "start": 2106893, "end": 2113044}, {"filename": "/Data/Item/Axes03.OZJ", "start": 2113044, "end": 2119285}, {"filename": "/Data/Item/Axes04.OZJ", "start": 2119285, "end": 2130438}, {"filename": "/Data/Item/Axes05.OZJ", "start": 2130438, "end": 2141357}, {"filename": "/Data/Item/Axes06.OZJ", "start": 2141357, "end": 2146749}, {"filename": "/Data/Item/Axes06.OZT", "start": 2146749, "end": 2163181}, {"filename": "/Data/Item/Axes07.OZJ", "start": 2163181, "end": 2173949}, {"filename": "/Data/Item/Axes08.OZJ", "start": 2173949, "end": 2185030}, {"filename": "/Data/Item/Axes09.OZJ", "start": 2185030, "end": 2197242}, {"filename": "/Data/Item/Axes10.OZJ", "start": 2197242, "end": 2207992}, {"filename": "/Data/Item/Beer01.bmd", "start": 2207992, "end": 2211402}, {"filename": "/Data/Item/Beer02.bmd", "start": 2211402, "end": 2223912}, {"filename": "/Data/Item/Book01.bmd", "start": 2223912, "end": 2225574}, {"filename": "/Data/Item/Book02.bmd", "start": 2225574, "end": 2227236}, {"filename": "/Data/Item/Book03.bmd", "start": 2227236, "end": 2228898}, {"filename": "/Data/Item/Book04.bmd", "start": 2228898, "end": 2230560}, {"filename": "/Data/Item/Book05.bmd", "start": 2230560, "end": 2232222}, {"filename": "/Data/Item/Book06.bmd", "start": 2232222, "end": 2233884}, {"filename": "/Data/Item/Book07.bmd", "start": 2233884, "end": 2235546}, {"filename": "/Data/Item/Book08.bmd", "start": 2235546, "end": 2237208}, {"filename": "/Data/Item/Book09.bmd", "start": 2237208, "end": 2238870}, {"filename": "/Data/Item/Book10.bmd", "start": 2238870, "end": 2240532}, {"filename": "/Data/Item/Book11.bmd", "start": 2240532, "end": 2242194}, {"filename": "/Data/Item/Book12.bmd", "start": 2242194, "end": 2243856}, {"filename": "/Data/Item/Book13.bmd", "start": 2243856, "end": 2245518}, {"filename": "/Data/Item/Book14.bmd", "start": 2245518, "end": 2247180}, {"filename": "/Data/Item/Book15.bmd", "start": 2247180, "end": 2248842}, {"filename": "/Data/Item/Book16.bmd", "start": 2248842, "end": 2250504}, {"filename": "/Data/Item/Book17.bmd", "start": 2250504, "end": 2252166}, {"filename": "/Data/Item/Book18.bmd", "start": 2252166, "end": 2253828}, {"filename": "/Data/Item/Book19.bmd", "start": 2253828, "end": 2255490}, {"filename": "/Data/Item/Bow01.bmd", "start": 2255490, "end": 2263714}, {"filename": "/Data/Item/Bow02.bmd", "start": 2263714, "end": 2273888}, {"filename": "/Data/Item/Bow03.bmd", "start": 2273888, "end": 2284698}, {"filename": "/Data/Item/Bow04.bmd", "start": 2284698, "end": 2296864}, {"filename": "/Data/Item/Bow05.bmd", "start": 2296864, "end": 2318310}, {"filename": "/Data/Item/Bow06.bmd", "start": 2318310, "end": 2331202}, {"filename": "/Data/Item/Bow07.bmd", "start": 2331202, "end": 2362398}, {"filename": "/Data/Item/Bow18.bmd", "start": 2362398, "end": 2432796}, {"filename": "/Data/Item/Bow19.bmd", "start": 2432796, "end": 2453944}, {"filename": "/Data/Item/Bow20.bmd", "start": 2453944, "end": 2514311}, {"filename": "/Data/Item/ConChip00.bmd", "start": 2514311, "end": 2518513}, {"filename": "/Data/Item/CrossBow01.bmd", "start": 2518513, "end": 2530650}, {"filename": "/Data/Item/CrossBow02.bmd", "start": 2530650, "end": 2543015}, {"filename": "/Data/Item/CrossBow03.bmd", "start": 2543015, "end": 2558800}, {"filename": "/Data/Item/CrossBow04.bmd", "start": 2558800, "end": 2571133}, {"filename": "/Data/Item/CrossBow05.bmd", "start": 2571133, "end": 2589966}, {"filename": "/Data/Item/CrossBow06.bmd", "start": 2589966, "end": 2610466}, {"filename": "/Data/Item/CrossBow07.bmd", "start": 2610466, "end": 2631966}, {"filename": "/Data/Item/CrossBow17.bmd", "start": 2631966, "end": 2664318}, {"filename": "/Data/Item/CrossBow20.bmd", "start": 2664318, "end": 2695907}, {"filename": "/Data/Item/Custom/20/nks01.OZJ", "start": 2695907, "end": 2706686}, {"filename": "/Data/Item/Custom/20/nks02.OZJ", "start": 2706686, "end": 2724156}, {"filename": "/Data/Item/Custom/20/nks03.OZJ", "start": 2724156, "end": 2733452}, {"filename": "/Data/Item/Custom/20/nks04.OZJ", "start": 2733452, "end": 2744327}, {"filename": "/Data/Item/Custom/20/sword21.bmd", "start": 2744327, "end": 2767045}, {"filename": "/Data/Item/Custom/72/Mace72.bmd", "start": 2767045, "end": 2805814}, {"filename": "/Data/Item/Custom/72/nfm01.OZJ", "start": 2805814, "end": 2835905}, {"filename": "/Data/Item/Custom/72/nfm02.OZT", "start": 2835905, "end": 2868721}, {"filename": "/Data/Item/Custom/72/nfm03.OZJ", "start": 2868721, "end": 2877470}, {"filename": "/Data/Item/Custom/Rudolph/flareRed.OZJ", "start": 2877470, "end": 2887841}, {"filename": "/Data/Item/Custom/Rudolph/gold_tree.OZJ", "start": 2887841, "end": 2901100}, {"filename": "/Data/Item/Custom/Rudolph/xmas_deer.bmd", "start": 2901100, "end": 2993289}, {"filename": "/Data/Item/Custom/Rudolph/xmassasum02.OZJ", "start": 2993289, "end": 3011714}, {"filename": "/Data/Item/DarkHorseHorn.bmd", "start": 3011714, "end": 3014886}, {"filename": "/Data/Item/DarkHorseSoul.bmd", "start": 3014886, "end": 3019032}, {"filename": "/Data/Item/DarkLordRobe.OZT", "start": 3019032, "end": 3150152}, {"filename": "/Data/Item/DarkLordRobe.bmd", "start": 3150152, "end": 3151986}, {"filename": "/Data/Item/DarkLordSign.OZJ", "start": 3151986, "end": 3163421}, {"filename": "/Data/Item/DarkLordSleeve.OZT", "start": 3163421, "end": 3171661}, {"filename": "/Data/Item/DarkLordSleeve.bmd", "start": 3171661, "end": 3172507}, {"filename": "/Data/Item/Devil00.bmd", "start": 3172507, "end": 3178259}, {"filename": "/Data/Item/Devil01.bmd", "start": 3178259, "end": 3185671}, {"filename": "/Data/Item/Devil02.bmd", "start": 3185671, "end": 3202881}, {"filename": "/Data/Item/Drax.OZJ", "start": 3202881, "end": 3217118}, {"filename": "/Data/Item/Drax_N.OZJ", "start": 3217118, "end": 3220148}, {"filename": "/Data/Item/Drax_R.OZJ", "start": 3220148, "end": 3226766}, {"filename": "/Data/Item/Drink00.bmd", "start": 3226766, "end": 3239856}, {"filename": "/Data/Item/Ds_B.OZJ", "start": 3239856, "end": 3241868}, {"filename": "/Data/Item/Ds_R.OZJ", "start": 3241868, "end": 3243880}, {"filename": "/Data/Item/Dstic.OZJ", "start": 3243880, "end": 3259980}, {"filename": "/Data/Item/Ebow4.OZJ", "start": 3259980, "end": 3273404}, {"filename": "/Data/Item/Ebow_R.OZJ", "start": 3273404, "end": 3275890}, {"filename": "/Data/Item/Eccross.OZJ", "start": 3275890, "end": 3315256}, {"filename": "/Data/Item/Eccross.OZT", "start": 3315256, "end": 3446376}, {"filename": "/Data/Item/Eldobox.OZJ", "start": 3446376, "end": 3450550}, {"filename": "/Data/Item/Elf_E.OZJ", "start": 3450550, "end": 3455762}, {"filename": "/Data/Item/Esh.OZJ", "start": 3455762, "end": 3462458}, {"filename": "/Data/Item/Esh.OZT", "start": 3462458, "end": 3470698}, {"filename": "/Data/Item/Esh2.OZJ", "start": 3470698, "end": 3474055}, {"filename": "/Data/Item/Estic.OZJ", "start": 3474055, "end": 3478194}, {"filename": "/Data/Item/Estic2.OZJ", "start": 3478194, "end": 3481300}, {"filename": "/Data/Item/Estic2_R.OZJ", "start": 3481300, "end": 3488785}, {"filename": "/Data/Item/Event01.bmd", "start": 3488785, "end": 3497082}, {"filename": "/Data/Item/Event02.bmd", "start": 3497082, "end": 3500076}, {"filename": "/Data/Item/Event03.bmd", "start": 3500076, "end": 3512742}, {"filename": "/Data/Item/EventBloodCastle00.bmd", "start": 3512742, "end": 3514635}, {"filename": "/Data/Item/EventBloodCastle01.bmd", "start": 3514635, "end": 3518269}, {"filename": "/Data/Item/EventBloodCastle02.bmd", "start": 3518269, "end": 3526963}, {"filename": "/Data/Item/EventBloodCastle03.bmd", "start": 3526963, "end": 3529057}, {"filename": "/Data/Item/EventBloodCastle04.bmd", "start": 3529057, "end": 3534690}, {"filename": "/Data/Item/EventBloodCastle05.bmd", "start": 3534690, "end": 3540323}, {"filename": "/Data/Item/EventBloodCastle06.bmd", "start": 3540323, "end": 3545956}, {"filename": "/Data/Item/EventChaosCastle.bmd", "start": 3545956, "end": 3565958}, {"filename": "/Data/Item/Gem01.bmd", "start": 3565958, "end": 3570456}, {"filename": "/Data/Item/Gem02.bmd", "start": 3570456, "end": 3574954}, {"filename": "/Data/Item/Gem03.bmd", "start": 3574954, "end": 3579452}, {"filename": "/Data/Item/Gem04.bmd", "start": 3579452, "end": 3583950}, {"filename": "/Data/Item/Gem05.bmd", "start": 3583950, "end": 3588448}, {"filename": "/Data/Item/Gem06.bmd", "start": 3588448, "end": 3592946}, {"filename": "/Data/Item/Gem07.bmd", "start": 3592946, "end": 3597444}, {"filename": "/Data/Item/Gem08.bmd", "start": 3597444, "end": 3601942}, {"filename": "/Data/Item/Gem10.bmd", "start": 3601942, "end": 3606440}, {"filename": "/Data/Item/Gem11.bmd", "start": 3606440, "end": 3610938}, {"filename": "/Data/Item/Gem12.bmd", "start": 3610938, "end": 3615436}, {"filename": "/Data/Item/Gem13.bmd", "start": 3615436, "end": 3619934}, {"filename": "/Data/Item/Gem14.bmd", "start": 3619934, "end": 3624432}, {"filename": "/Data/Item/Gold01.bmd", "start": 3624432, "end": 3627426}, {"filename": "/Data/Item/HELLASITEM00.bmd", "start": 3627426, "end": 3640262}, {"filename": "/Data/Item/HELLASITEM01.bmd", "start": 3640262, "end": 3648272}, {"filename": "/Data/Item/Javelins01.OZJ", "start": 3648272, "end": 3654737}, {"filename": "/Data/Item/Javelins03.OZJ", "start": 3654737, "end": 3660658}, {"filename": "/Data/Item/Javelins04.OZJ", "start": 3660658, "end": 3666865}, {"filename": "/Data/Item/Javelins05.OZJ", "start": 3666865, "end": 3678447}, {"filename": "/Data/Item/Jewel01.bmd", "start": 3678447, "end": 3679761}, {"filename": "/Data/Item/Jewel02.bmd", "start": 3679761, "end": 3681863}, {"filename": "/Data/Item/Jewel03.bmd", "start": 3681863, "end": 3685985}, {"filename": "/Data/Item/Jewel15.bmd", "start": 3685985, "end": 3688827}, {"filename": "/Data/Item/Ksword.OZJ", "start": 3688827, "end": 3703634}, {"filename": "/Data/Item/Ksword2.OZJ", "start": 3703634, "end": 3706029}, {"filename": "/Data/Item/Ktext.OZJ", "start": 3706029, "end": 3719575}, {"filename": "/Data/Item/MMsS.OZJ", "start": 3719575, "end": 3722245}, {"filename": "/Data/Item/MMsS2.OZJ", "start": 3722245, "end": 3727208}, {"filename": "/Data/Item/MMsS_r.OZJ", "start": 3727208, "end": 3730398}, {"filename": "/Data/Item/MMsSs_r.OZJ", "start": 3730398, "end": 3743103}, {"filename": "/Data/Item/Mace01.bmd", "start": 3743103, "end": 3746893}, {"filename": "/Data/Item/Mace02.bmd", "start": 3746893, "end": 3758183}, {"filename": "/Data/Item/Mace03.bmd", "start": 3758183, "end": 3772745}, {"filename": "/Data/Item/Mace04.bmd", "start": 3772745, "end": 3778015}, {"filename": "/Data/Item/Mace05.bmd", "start": 3778015, "end": 3797295}, {"filename": "/Data/Item/Mace06.bmd", "start": 3797295, "end": 3814461}, {"filename": "/Data/Item/Mace07.bmd", "start": 3814461, "end": 3828257}, {"filename": "/Data/Item/Mace08.bmd", "start": 3828257, "end": 3853858}, {"filename": "/Data/Item/Mace09.bmd", "start": 3853858, "end": 3890641}, {"filename": "/Data/Item/Mace10.bmd", "start": 3890641, "end": 3926668}, {"filename": "/Data/Item/Mace11.bmd", "start": 3926668, "end": 3963660}, {"filename": "/Data/Item/Mace12.bmd", "start": 3963660, "end": 4010916}, {"filename": "/Data/Item/Mace13.bmd", "start": 4010916, "end": 4067923}, {"filename": "/Data/Item/Mace14.bmd", "start": 4067923, "end": 4106692}, {"filename": "/Data/Item/MagicBox01.bmd", "start": 4106692, "end": 4112524}, {"filename": "/Data/Item/MagicBox02.bmd", "start": 4112524, "end": 4114958}, {"filename": "/Data/Item/MagicBox03.bmd", "start": 4114958, "end": 4117312}, {"filename": "/Data/Item/MagicBox04.bmd", "start": 4117312, "end": 4129283}, {"filename": "/Data/Item/MagicBox05.bmd", "start": 4129283, "end": 4137580}, {"filename": "/Data/Item/MagicBox06.bmd", "start": 4137580, "end": 4145220}, {"filename": "/Data/Item/MagicBox07.bmd", "start": 4145220, "end": 4152860}, {"filename": "/Data/Item/MagicBox08.bmd", "start": 4152860, "end": 4157302}, {"filename": "/Data/Item/MagicRing.OZJ", "start": 4157302, "end": 4165869}, {"filename": "/Data/Item/MagicRing00.bmd", "start": 4165869, "end": 4171517}, {"filename": "/Data/Item/MagicRingPendant.OZJ", "start": 4171517, "end": 4179895}, {"filename": "/Data/Item/Msword.OZJ", "start": 4179895, "end": 4214390}, {"filename": "/Data/Item/NDEE.OZJ", "start": 4214390, "end": 4217207}, {"filename": "/Data/Item/NDEE.OZT", "start": 4217207, "end": 4225447}, {"filename": "/Data/Item/NDW.OZJ", "start": 4225447, "end": 4234821}, {"filename": "/Data/Item/NDW_R.OZJ", "start": 4234821, "end": 4241546}, {"filename": "/Data/Item/NEWWW.OZJ", "start": 4241546, "end": 4252353}, {"filename": "/Data/Item/NEWW_R.OZJ", "start": 4252353, "end": 4264248}, {"filename": "/Data/Item/Necklace01.bmd", "start": 4264248, "end": 4271370}, {"filename": "/Data/Item/Necklace02.bmd", "start": 4271370, "end": 4279180}, {"filename": "/Data/Item/NewingEl.OZJ", "start": 4279180, "end": 4298346}, {"filename": "/Data/Item/Polearms02.OZJ", "start": 4298346, "end": 4308444}, {"filename": "/Data/Item/Polearms03.OZJ", "start": 4308444, "end": 4318886}, {"filename": "/Data/Item/Polearms04.OZJ", "start": 4318886, "end": 4328783}, {"filename": "/Data/Item/Polearms05.OZJ", "start": 4328783, "end": 4340416}, {"filename": "/Data/Item/Potion01.bmd", "start": 4340416, "end": 4345096}, {"filename": "/Data/Item/Potion02.bmd", "start": 4345096, "end": 4347996}, {"filename": "/Data/Item/Potion03.bmd", "start": 4347996, "end": 4351776}, {"filename": "/Data/Item/Potion04.bmd", "start": 4351776, "end": 4358532}, {"filename": "/Data/Item/Potion05.bmd", "start": 4358532, "end": 4361432}, {"filename": "/Data/Item/Potion06.bmd", "start": 4361432, "end": 4365212}, {"filename": "/Data/Item/Potion07.bmd", "start": 4365212, "end": 4371976}, {"filename": "/Data/Item/Quest00.bmd", "start": 4371976, "end": 4377609}, {"filename": "/Data/Item/Quest01.bmd", "start": 4377609, "end": 4389002}, {"filename": "/Data/Item/Quest02.bmd", "start": 4389002, "end": 4394887}, {"filename": "/Data/Item/Quest03.bmd", "start": 4394887, "end": 4407596}, {"filename": "/Data/Item/Quest04.bmd", "start": 4407596, "end": 4409070}, {"filename": "/Data/Item/Quest05.bmd", "start": 4409070, "end": 4419812}, {"filename": "/Data/Item/QuestItem3rd00.bmd", "start": 4419812, "end": 4426213}, {"filename": "/Data/Item/QuestItem3rd01.bmd", "start": 4426213, "end": 4434359}, {"filename": "/Data/Item/RedDragonT.OZJ", "start": 4434359, "end": 4456438}, {"filename": "/Data/Item/Ring01.bmd", "start": 4456438, "end": 4461196}, {"filename": "/Data/Item/Ring02.bmd", "start": 4461196, "end": 4465694}, {"filename": "/Data/Item/RingOfLordEvent.OZJ", "start": 4465694, "end": 4474241}, {"filename": "/Data/Item/RingOfLordEvent00.bmd", "start": 4474241, "end": 4484601}, {"filename": "/Data/Item/RingPenOfLordEvent.OZJ", "start": 4484601, "end": 4493481}, {"filename": "/Data/Item/Scroll01.bmd", "start": 4493481, "end": 4500891}, {"filename": "/Data/Item/Shield01.bmd", "start": 4500891, "end": 4502861}, {"filename": "/Data/Item/Shield02.bmd", "start": 4502861, "end": 4505763}, {"filename": "/Data/Item/Shield03.bmd", "start": 4505763, "end": 4508305}, {"filename": "/Data/Item/Shield04.bmd", "start": 4508305, "end": 4512641}, {"filename": "/Data/Item/Shield05.bmd", "start": 4512641, "end": 4514883}, {"filename": "/Data/Item/Shield06.bmd", "start": 4514883, "end": 4517319}, {"filename": "/Data/Item/Shield07.bmd", "start": 4517319, "end": 4527439}, {"filename": "/Data/Item/Shield08.bmd", "start": 4527439, "end": 4532877}, {"filename": "/Data/Item/Shield09.bmd", "start": 4532877, "end": 4535283}, {"filename": "/Data/Item/Shield10.bmd", "start": 4535283, "end": 4537509}, {"filename": "/Data/Item/Shield11.bmd", "start": 4537509, "end": 4540831}, {"filename": "/Data/Item/Shield12.bmd", "start": 4540831, "end": 4548046}, {"filename": "/Data/Item/Shield13.bmd", "start": 4548046, "end": 4558945}, {"filename": "/Data/Item/Shield14.bmd", "start": 4558945, "end": 4575176}, {"filename": "/Data/Item/Shield15.bmd", "start": 4575176, "end": 4590251}, {"filename": "/Data/Item/SkillScroll01.bmd", "start": 4590251, "end": 4591913}, {"filename": "/Data/Item/SkillScroll02.bmd", "start": 4591913, "end": 4593575}, {"filename": "/Data/Item/SkillScroll03.bmd", "start": 4593575, "end": 4595237}, {"filename": "/Data/Item/SkillScroll04.bmd", "start": 4595237, "end": 4596899}, {"filename": "/Data/Item/Spear01.bmd", "start": 4596899, "end": 4608085}, {"filename": "/Data/Item/Spear02.bmd", "start": 4608085, "end": 4617501}, {"filename": "/Data/Item/Spear03.bmd", "start": 4617501, "end": 4621759}, {"filename": "/Data/Item/Spear04.bmd", "start": 4621759, "end": 4627729}, {"filename": "/Data/Item/Spear05.bmd", "start": 4627729, "end": 4638679}, {"filename": "/Data/Item/Spear06.bmd", "start": 4638679, "end": 4644833}, {"filename": "/Data/Item/Spear07.bmd", "start": 4644833, "end": 4650031}, {"filename": "/Data/Item/Spear08.bmd", "start": 4650031, "end": 4660485}, {"filename": "/Data/Item/Spear09.bmd", "start": 4660485, "end": 4673819}, {"filename": "/Data/Item/Spear10.bmd", "start": 4673819, "end": 4687393}, {"filename": "/Data/Item/Spear11.bmd", "start": 4687393, "end": 4703830}, {"filename": "/Data/Item/Staff01.bmd", "start": 4703830, "end": 4717144}, {"filename": "/Data/Item/Staff02.bmd", "start": 4717144, "end": 4721944}, {"filename": "/Data/Item/Staff03.bmd", "start": 4721944, "end": 4728466}, {"filename": "/Data/Item/Staff04.bmd", "start": 4728466, "end": 4738588}, {"filename": "/Data/Item/Staff05.bmd", "start": 4738588, "end": 4759530}, {"filename": "/Data/Item/Staff06.bmd", "start": 4759530, "end": 4787341}, {"filename": "/Data/Item/Staff07.bmd", "start": 4787341, "end": 4837673}, {"filename": "/Data/Item/Staff08.bmd", "start": 4837673, "end": 4888048}, {"filename": "/Data/Item/Staff09.bmd", "start": 4888048, "end": 4893789}, {"filename": "/Data/Item/Staff10.bmd", "start": 4893789, "end": 4934369}, {"filename": "/Data/Item/Staff11.bmd", "start": 4934369, "end": 4970709}, {"filename": "/Data/Item/Staff12.bmd", "start": 4970709, "end": 5051067}, {"filename": "/Data/Item/Stts.OZJ", "start": 5051067, "end": 5053305}, {"filename": "/Data/Item/Sword01.bmd", "start": 5053305, "end": 5060171}, {"filename": "/Data/Item/Sword02.bmd", "start": 5060171, "end": 5064821}, {"filename": "/Data/Item/Sword03.bmd", "start": 5064821, "end": 5069579}, {"filename": "/Data/Item/Sword04.bmd", "start": 5069579, "end": 5079269}, {"filename": "/Data/Item/Sword05.bmd", "start": 5079269, "end": 5085495}, {"filename": "/Data/Item/Sword06.bmd", "start": 5085495, "end": 5094939}, {"filename": "/Data/Item/Sword07.bmd", "start": 5094939, "end": 5101101}, {"filename": "/Data/Item/Sword08.bmd", "start": 5101101, "end": 5110371}, {"filename": "/Data/Item/Sword09.bmd", "start": 5110371, "end": 5118113}, {"filename": "/Data/Item/Sword10.bmd", "start": 5118113, "end": 5125809}, {"filename": "/Data/Item/Sword11.bmd", "start": 5125809, "end": 5131987}, {"filename": "/Data/Item/Sword12.bmd", "start": 5131987, "end": 5145489}, {"filename": "/Data/Item/Sword13.bmd", "start": 5145489, "end": 5163932}, {"filename": "/Data/Item/Sword14.bmd", "start": 5163932, "end": 5179972}, {"filename": "/Data/Item/Sword15.bmd", "start": 5179972, "end": 5188982}, {"filename": "/Data/Item/Sword16.bmd", "start": 5188982, "end": 5191540}, {"filename": "/Data/Item/Sword17.bmd", "start": 5191540, "end": 5214210}, {"filename": "/Data/Item/Sword18.bmd", "start": 5214210, "end": 5233742}, {"filename": "/Data/Item/Sword19.bmd", "start": 5233742, "end": 5250624}, {"filename": "/Data/Item/Sword20.bmd", "start": 5250624, "end": 5278332}, {"filename": "/Data/Item/Sword32.bmd", "start": 5278332, "end": 5312819}, {"filename": "/Data/Item/WDNN.OZJ", "start": 5312819, "end": 5317362}, {"filename": "/Data/Item/WD_R.OZJ", "start": 5317362, "end": 5319743}, {"filename": "/Data/Item/WD_a.OZJ", "start": 5319743, "end": 5325254}, {"filename": "/Data/Item/WD_t.OZJ", "start": 5325254, "end": 5327384}, {"filename": "/Data/Item/WDn.OZJ", "start": 5327384, "end": 5329428}, {"filename": "/Data/Item/WDn.OZT", "start": 5329428, "end": 5362244}, {"filename": "/Data/Item/W_S.OZJ", "start": 5362244, "end": 5367463}, {"filename": "/Data/Item/Wing01.bmd", "start": 5367463, "end": 5371507}, {"filename": "/Data/Item/Wing02.bmd", "start": 5371507, "end": 5378014}, {"filename": "/Data/Item/Wing03.bmd", "start": 5378014, "end": 5383385}, {"filename": "/Data/Item/Wing04.bmd", "start": 5383385, "end": 5396760}, {"filename": "/Data/Item/Wing05.bmd", "start": 5396760, "end": 5501146}, {"filename": "/Data/Item/Wing06.bmd", "start": 5501146, "end": 5564155}, {"filename": "/Data/Item/Wing07.bmd", "start": 5564155, "end": 5598978}, {"filename": "/Data/Item/a9.OZJ", "start": 5598978, "end": 5607991}, {"filename": "/Data/Item/a_2.OZJ", "start": 5607991, "end": 5612932}, {"filename": "/Data/Item/a_a.OZJ", "start": 5612932, "end": 5618724}, {"filename": "/Data/Item/af.OZT", "start": 5618724, "end": 5651540}, {"filename": "/Data/Item/agnecklace.OZJ", "start": 5651540, "end": 5662023}, {"filename": "/Data/Item/agnecklace.bmd", "start": 5662023, "end": 5672243}, {"filename": "/Data/Item/angel_wing.OZT", "start": 5672243, "end": 5737827}, {"filename": "/Data/Item/angelscroll01.OZT", "start": 5737827, "end": 5754259}, {"filename": "/Data/Item/apple.OZJ", "start": 5754259, "end": 5759375}, {"filename": "/Data/Item/bloodbone02.OZJ", "start": 5759375, "end": 5768118}, {"filename": "/Data/Item/blue_jewel.OZJ", "start": 5768118, "end": 5773022}, {"filename": "/Data/Item/bone02.OZT", "start": 5773022, "end": 5789454}, {"filename": "/Data/Item/book.OZJ", "start": 5789454, "end": 5801137}, {"filename": "/Data/Item/bottle.OZT", "start": 5801137, "end": 5805281}, {"filename": "/Data/Item/bow01.OZJ", "start": 5805281, "end": 5811409}, {"filename": "/Data/Item/bow02.OZJ", "start": 5811409, "end": 5821187}, {"filename": "/Data/Item/bow03.OZJ", "start": 5821187, "end": 5832886}, {"filename": "/Data/Item/bow04.OZJ", "start": 5832886, "end": 5845608}, {"filename": "/Data/Item/bow05.OZJ", "start": 5845608, "end": 5858918}, {"filename": "/Data/Item/bow05.OZT", "start": 5858918, "end": 5863062}, {"filename": "/Data/Item/bow06.OZJ", "start": 5863062, "end": 5875290}, {"filename": "/Data/Item/bow77.OZJ", "start": 5875290, "end": 5894128}, {"filename": "/Data/Item/bowbox.OZJ", "start": 5894128, "end": 5904683}, {"filename": "/Data/Item/box.OZJ", "start": 5904683, "end": 5911087}, {"filename": "/Data/Item/change.OZJ", "start": 5911087, "end": 5919798}, {"filename": "/Data/Item/chip.OZJ", "start": 5919798, "end": 5922227}, {"filename": "/Data/Item/crossbow01.OZJ", "start": 5922227, "end": 5928092}, {"filename": "/Data/Item/crossbow02.OZJ", "start": 5928092, "end": 5937303}, {"filename": "/Data/Item/crossbow03.OZJ", "start": 5937303, "end": 5947180}, {"filename": "/Data/Item/crossbow04.OZJ", "start": 5947180, "end": 5958593}, {"filename": "/Data/Item/crossbow05.OZJ", "start": 5958593, "end": 5985005}, {"filename": "/Data/Item/crossbow06.OZJ", "start": 5985005, "end": 5992510}, {"filename": "/Data/Item/crossbow06_2.OZJ", "start": 5992510, "end": 6000002}, {"filename": "/Data/Item/crossbow06_2.OZT", "start": 6000002, "end": 6008242}, {"filename": "/Data/Item/crossbow06_R.OZJ", "start": 6008242, "end": 6015645}, {"filename": "/Data/Item/crossbow_box.OZJ", "start": 6015645, "end": 6022004}, {"filename": "/Data/Item/darkhorn.OZJ", "start": 6022004, "end": 6033225}, {"filename": "/Data/Item/darksoul_r.OZJ", "start": 6033225, "end": 6042274}, {"filename": "/Data/Item/darkstone8.OZJ", "start": 6042274, "end": 6051046}, {"filename": "/Data/Item/darkstonered.OZJ", "start": 6051046, "end": 6059485}, {"filename": "/Data/Item/devil_wing.OZT", "start": 6059485, "end": 6125069}, {"filename": "/Data/Item/devileye.OZJ", "start": 6125069, "end": 6129625}, {"filename": "/Data/Item/devileye2.OZJ", "start": 6129625, "end": 6132370}, {"filename": "/Data/Item/devilkey.OZJ", "start": 6132370, "end": 6139011}, {"filename": "/Data/Item/dkScroll.OZJ", "start": 6139011, "end": 6145935}, {"filename": "/Data/Item/dkScroll2_R.OZJ", "start": 6145935, "end": 6150814}, {"filename": "/Data/Item/dkScroll_R.OZJ", "start": 6150814, "end": 6159287}, {"filename": "/Data/Item/du_shield1.OZJ", "start": 6159287, "end": 6166148}, {"filename": "/Data/Item/du_shield2.OZJ", "start": 6166148, "end": 6172621}, {"filename": "/Data/Item/elfin_wing.OZJ", "start": 6172621, "end": 6182303}, {"filename": "/Data/Item/etcring.OZJ", "start": 6182303, "end": 6194206}, {"filename": "/Data/Item/fairy.OZJ", "start": 6194206, "end": 6199200}, {"filename": "/Data/Item/fairy2.OZJ", "start": 6199200, "end": 6204714}, {"filename": "/Data/Item/firecracker.OZJ", "start": 6204714, "end": 6208162}, {"filename": "/Data/Item/firering.OZJ", "start": 6208162, "end": 6217239}, {"filename": "/Data/Item/firering.bmd", "start": 6217239, "end": 6224523}, {"filename": "/Data/Item/flail00.OZT", "start": 6224523, "end": 6225595}, {"filename": "/Data/Item/flail02.OZJ", "start": 6225595, "end": 6231862}, {"filename": "/Data/Item/ft6.OZJ", "start": 6231862, "end": 6249323}, {"filename": "/Data/Item/ft72.OZJ", "start": 6249323, "end": 6255133}, {"filename": "/Data/Item/gloryring.OZJ", "start": 6255133, "end": 6265812}, {"filename": "/Data/Item/godest01.OZJ", "start": 6265812, "end": 6276043}, {"filename": "/Data/Item/godest02.OZJ", "start": 6276043, "end": 6284552}, {"filename": "/Data/Item/godest03.OZJ", "start": 6284552, "end": 6293061}, {"filename": "/Data/Item/godesteel.bmd", "start": 6293061, "end": 6301387}, {"filename": "/Data/Item/godesteel.smd", "start": 6301387, "end": 6321126}, {"filename": "/Data/Item/gold.OZJ", "start": 6321126, "end": 6326372}, {"filename": "/Data/Item/goldmedal.OZJ", "start": 6326372, "end": 6332050}, {"filename": "/Data/Item/groundring.OZJ", "start": 6332050, "end": 6340693}, {"filename": "/Data/Item/groundring.bmd", "start": 6340693, "end": 6346217}, {"filename": "/Data/Item/hellasmap.OZT", "start": 6346217, "end": 6350361}, {"filename": "/Data/Item/hhj.OZJ", "start": 6350361, "end": 6355325}, {"filename": "/Data/Item/hound_shield1.OZT", "start": 6355325, "end": 6363565}, {"filename": "/Data/Item/hound_shield2.OZJ", "start": 6363565, "end": 6375796}, {"filename": "/Data/Item/hound_sword1.OZJ", "start": 6375796, "end": 6385284}, {"filename": "/Data/Item/icenecklace.OZJ", "start": 6385284, "end": 6395582}, {"filename": "/Data/Item/icenecklace.bmd", "start": 6395582, "end": 6405314}, {"filename": "/Data/Item/item.bmd", "start": 6405314, "end": 6433474}, {"filename": "/Data/Item/items.OZJ", "start": 6433474, "end": 6440860}, {"filename": "/Data/Item/jewel22.bmd", "start": 6440860, "end": 6444560}, {"filename": "/Data/Item/jh01.OZJ", "start": 6444560, "end": 6459047}, {"filename": "/Data/Item/jh02.OZJ", "start": 6459047, "end": 6466037}, {"filename": "/Data/Item/jh03.OZT", "start": 6466037, "end": 6498853}, {"filename": "/Data/Item/jk00.OZJ", "start": 6498853, "end": 6513915}, {"filename": "/Data/Item/jk01.OZJ", "start": 6513915, "end": 6520566}, {"filename": "/Data/Item/jo00.OZJ", "start": 6520566, "end": 6535147}, {"filename": "/Data/Item/jo01.OZJ", "start": 6535147, "end": 6542616}, {"filename": "/Data/Item/kmap.OZJ", "start": 6542616, "end": 6553201}, {"filename": "/Data/Item/kmap02.OZJ", "start": 6553201, "end": 6561958}, {"filename": "/Data/Item/ksing01.OZJ", "start": 6561958, "end": 6573630}, {"filename": "/Data/Item/ksing02.OZJ", "start": 6573630, "end": 6585315}, {"filename": "/Data/Item/ksing02.OZT", "start": 6585315, "end": 6589459}, {"filename": "/Data/Item/ksing03.OZJ", "start": 6589459, "end": 6598313}, {"filename": "/Data/Item/kundunStic.OZJ", "start": 6598313, "end": 6611220}, {"filename": "/Data/Item/kundunStic2.OZJ", "start": 6611220, "end": 6623870}, {"filename": "/Data/Item/kundunStic_R.OZJ", "start": 6623870, "end": 6629574}, {"filename": "/Data/Item/lopi00.OZJ", "start": 6629574, "end": 6635696}, {"filename": "/Data/Item/loveB.OZJ", "start": 6635696, "end": 6638732}, {"filename": "/Data/Item/lower_14m.OZT", "start": 6638732, "end": 6655164}, {"filename": "/Data/Item/mace.OZJ", "start": 6655164, "end": 6662964}, {"filename": "/Data/Item/mace02.OZJ", "start": 6662964, "end": 6668663}, {"filename": "/Data/Item/mace03.OZJ", "start": 6668663, "end": 6673657}, {"filename": "/Data/Item/maceB.OZJ", "start": 6673657, "end": 6677653}, {"filename": "/Data/Item/magictext.OZJ", "start": 6677653, "end": 6684034}, {"filename": "/Data/Item/manaring.OZJ", "start": 6684034, "end": 6692561}, {"filename": "/Data/Item/manaring.bmd", "start": 6692561, "end": 6699117}, {"filename": "/Data/Item/mangto04.OZJ", "start": 6699117, "end": 6715050}, {"filename": "/Data/Item/maul.OZJ", "start": 6715050, "end": 6736255}, {"filename": "/Data/Item/maul03.OZJ", "start": 6736255, "end": 6743258}, {"filename": "/Data/Item/maulB.OZJ", "start": 6743258, "end": 6761213}, {"filename": "/Data/Item/medal.OZJ", "start": 6761213, "end": 6767375}, {"filename": "/Data/Item/medal1.OZJ", "start": 6767375, "end": 6770810}, {"filename": "/Data/Item/medal2.OZJ", "start": 6770810, "end": 6775429}, {"filename": "/Data/Item/medicine1.OZJ", "start": 6775429, "end": 6781354}, {"filename": "/Data/Item/medicine2.OZJ", "start": 6781354, "end": 6786377}, {"filename": "/Data/Item/nds01.OZJ", "start": 6786377, "end": 6802062}, {"filename": "/Data/Item/nds02.OZJ", "start": 6802062, "end": 6815273}, {"filename": "/Data/Item/nds03.OZJ", "start": 6815273, "end": 6824067}, {"filename": "/Data/Item/nfb.OZJ", "start": 6824067, "end": 6858719}, {"filename": "/Data/Item/nfb01.OZJ", "start": 6858719, "end": 6890514}, {"filename": "/Data/Item/nfb02.OZJ", "start": 6890514, "end": 6911384}, {"filename": "/Data/Item/nfb2_R.OZJ", "start": 6911384, "end": 6923339}, {"filename": "/Data/Item/nfb4.OZT", "start": 6923339, "end": 6939771}, {"filename": "/Data/Item/nfb_R.OZJ", "start": 6939771, "end": 6948060}, {"filename": "/Data/Item/nfm01.OZJ", "start": 6948060, "end": 6978151}, {"filename": "/Data/Item/nfm02.OZT", "start": 6978151, "end": 7010967}, {"filename": "/Data/Item/nfm03.OZJ", "start": 7010967, "end": 7019716}, {"filename": "/Data/Item/ni99.OZJ", "start": 7019716, "end": 7035744}, {"filename": "/Data/Item/nks01.OZJ", "start": 7035744, "end": 7046523}, {"filename": "/Data/Item/nks02.OZJ", "start": 7046523, "end": 7063993}, {"filename": "/Data/Item/nks03.OZJ", "start": 7063993, "end": 7073289}, {"filename": "/Data/Item/nks04.OZJ", "start": 7073289, "end": 7084164}, {"filename": "/Data/Item/olive.OZJ", "start": 7084164, "end": 7086636}, {"filename": "/Data/Item/pe.OZJ", "start": 7086636, "end": 7093281}, {"filename": "/Data/Item/pearl.OZJ", "start": 7093281, "end": 7099353}, {"filename": "/Data/Item/poket.OZJ", "start": 7099353, "end": 7106591}, {"filename": "/Data/Item/pot3.OZT", "start": 7106591, "end": 7110735}, {"filename": "/Data/Item/power_a.OZT", "start": 7110735, "end": 7143551}, {"filename": "/Data/Item/power_a3.OZT", "start": 7143551, "end": 7159983}, {"filename": "/Data/Item/red.OZJ", "start": 7159983, "end": 7164878}, {"filename": "/Data/Item/red_jewel.OZJ", "start": 7164878, "end": 7169815}, {"filename": "/Data/Item/ring.OZJ", "start": 7169815, "end": 7181718}, {"filename": "/Data/Item/rok.OZT", "start": 7181718, "end": 7183814}, {"filename": "/Data/Item/satan.OZJ", "start": 7183814, "end": 7188920}, {"filename": "/Data/Item/satan2.OZT", "start": 7188920, "end": 7193064}, {"filename": "/Data/Item/sep01.OZJ", "start": 7193064, "end": 7204789}, {"filename": "/Data/Item/sep011.OZJ", "start": 7204789, "end": 7215794}, {"filename": "/Data/Item/sep02.OZJ", "start": 7215794, "end": 7238315}, {"filename": "/Data/Item/sep0202.OZJ", "start": 7238315, "end": 7259899}, {"filename": "/Data/Item/sep03.OZJ", "start": 7259899, "end": 7282075}, {"filename": "/Data/Item/sep0303.OZJ", "start": 7282075, "end": 7294565}, {"filename": "/Data/Item/sep03030303.OZJ", "start": 7294565, "end": 7303497}, {"filename": "/Data/Item/sep03_R.OZJ", "start": 7303497, "end": 7311966}, {"filename": "/Data/Item/sep04.OZJ", "start": 7311966, "end": 7323904}, {"filename": "/Data/Item/sep0404.OZJ", "start": 7323904, "end": 7335512}, {"filename": "/Data/Item/sep05.OZJ", "start": 7335512, "end": 7355698}, {"filename": "/Data/Item/sep055.OZJ", "start": 7355698, "end": 7366177}, {"filename": "/Data/Item/sep06.OZJ", "start": 7366177, "end": 7431065}, {"filename": "/Data/Item/sep0606.OZJ", "start": 7431065, "end": 7456125}, {"filename": "/Data/Item/sep062.OZJ", "start": 7456125, "end": 7478917}, {"filename": "/Data/Item/sep063.OZJ", "start": 7478917, "end": 7511481}, {"filename": "/Data/Item/sep064.OZJ", "start": 7511481, "end": 7521057}, {"filename": "/Data/Item/sep065.OZJ", "start": 7521057, "end": 7529323}, {"filename": "/Data/Item/sep06e_R.OZJ", "start": 7529323, "end": 7538830}, {"filename": "/Data/Item/sep06effe.OZJ", "start": 7538830, "end": 7548332}, {"filename": "/Data/Item/shield02.OZJ", "start": 7548332, "end": 7562062}, {"filename": "/Data/Item/shield03.OZJ", "start": 7562062, "end": 7573546}, {"filename": "/Data/Item/shield04.OZJ", "start": 7573546, "end": 7580513}, {"filename": "/Data/Item/shield04.OZT", "start": 7580513, "end": 7588753}, {"filename": "/Data/Item/shield05.OZJ", "start": 7588753, "end": 7600969}, {"filename": "/Data/Item/shield06.OZJ", "start": 7600969, "end": 7625726}, {"filename": "/Data/Item/shield07.OZJ", "start": 7625726, "end": 7633451}, {"filename": "/Data/Item/shield07.OZT", "start": 7633451, "end": 7641691}, {"filename": "/Data/Item/shield08.OZJ", "start": 7641691, "end": 7661371}, {"filename": "/Data/Item/shield082.OZJ", "start": 7661371, "end": 7665916}, {"filename": "/Data/Item/shield09.OZJ", "start": 7665916, "end": 7675102}, {"filename": "/Data/Item/shield092.OZJ", "start": 7675102, "end": 7679762}, {"filename": "/Data/Item/shield10.OZJ", "start": 7679762, "end": 7688760}, {"filename": "/Data/Item/shield102.OZJ", "start": 7688760, "end": 7693422}, {"filename": "/Data/Item/shield11.OZT", "start": 7693422, "end": 7709854}, {"filename": "/Data/Item/shield11_a.OZJ", "start": 7709854, "end": 7715316}, {"filename": "/Data/Item/shield16.bmd", "start": 7715316, "end": 7725361}, {"filename": "/Data/Item/shield17.bmd", "start": 7725361, "end": 7747609}, {"filename": "/Data/Item/shield_a_01.OZJ", "start": 7747609, "end": 7756491}, {"filename": "/Data/Item/shield_a_02.OZJ", "start": 7756491, "end": 7764309}, {"filename": "/Data/Item/skillScroll.bmd", "start": 7764309, "end": 7771846}, {"filename": "/Data/Item/spiritbill.bmd", "start": 7771846, "end": 7781816}, {"filename": "/Data/Item/star.OZJ", "start": 7781816, "end": 7783814}, {"filename": "/Data/Item/stone02.OZJ", "start": 7783814, "end": 7794233}, {"filename": "/Data/Item/sword015.OZJ", "start": 7794233, "end": 7807894}, {"filename": "/Data/Item/sword015_2.OZJ", "start": 7807894, "end": 7814128}, {"filename": "/Data/Item/sword02.OZJ", "start": 7814128, "end": 7820444}, {"filename": "/Data/Item/sword03.OZJ", "start": 7820444, "end": 7829303}, {"filename": "/Data/Item/sword04.OZJ", "start": 7829303, "end": 7835881}, {"filename": "/Data/Item/sword05.OZJ", "start": 7835881, "end": 7842229}, {"filename": "/Data/Item/sword05.OZT", "start": 7842229, "end": 7842293}, {"filename": "/Data/Item/sword06.OZJ", "start": 7842293, "end": 7850222}, {"filename": "/Data/Item/sword07.OZJ", "start": 7850222, "end": 7863273}, {"filename": "/Data/Item/sword077.OZJ", "start": 7863273, "end": 7870523}, {"filename": "/Data/Item/sword07_2.OZJ", "start": 7870523, "end": 7876867}, {"filename": "/Data/Item/sword08.OZJ", "start": 7876867, "end": 7886249}, {"filename": "/Data/Item/sword09.OZJ", "start": 7886249, "end": 7899232}, {"filename": "/Data/Item/sword11.OZJ", "start": 7899232, "end": 7906049}, {"filename": "/Data/Item/sword11.OZT", "start": 7906049, "end": 7908145}, {"filename": "/Data/Item/sword12.OZJ", "start": 7908145, "end": 7913722}, {"filename": "/Data/Item/sword12_2.OZJ", "start": 7913722, "end": 7919104}, {"filename": "/Data/Item/sword12_3.OZJ", "start": 7919104, "end": 7924597}, {"filename": "/Data/Item/sword13.OZJ", "start": 7924597, "end": 7938113}, {"filename": "/Data/Item/sword14.OZJ", "start": 7938113, "end": 7947449}, {"filename": "/Data/Item/sword14.OZT", "start": 7947449, "end": 7951593}, {"filename": "/Data/Item/sword15.OZJ", "start": 7951593, "end": 7964675}, {"filename": "/Data/Item/sword15_2.OZJ", "start": 7964675, "end": 7977055}, {"filename": "/Data/Item/sword16.OZJ", "start": 7977055, "end": 7983485}, {"filename": "/Data/Item/sword16_2.OZJ", "start": 7983485, "end": 7990620}, {"filename": "/Data/Item/sword17.OZJ", "start": 7990620, "end": 7998185}, {"filename": "/Data/Item/sword22.bmd", "start": 7998185, "end": 8034442}, {"filename": "/Data/Item/sword442.OZJ", "start": 8034442, "end": 8041659}, {"filename": "/Data/Item/sword44_R.OZJ", "start": 8041659, "end": 8047772}, {"filename": "/Data/Item/t_lower_14m.OZT", "start": 8047772, "end": 8064204}, {"filename": "/Data/Item/u2u.OZJ", "start": 8064204, "end": 8073273}, {"filename": "/Data/Item/u2u2.OZJ", "start": 8073273, "end": 8078418}, {"filename": "/Data/Item/u2u3.OZJ", "start": 8078418, "end": 8083531}, {"filename": "/Data/Item/unicon.OZJ", "start": 8083531, "end": 8110555}, {"filename": "/Data/Item/unicon01.OZT", "start": 8110555, "end": 8114699}, {"filename": "/Data/Item/visitor.OZJ", "start": 8114699, "end": 8121879}, {"filename": "/Data/Item/visitor2.OZJ", "start": 8121879, "end": 8124479}, {"filename": "/Data/Item/wand01.OZJ", "start": 8124479, "end": 8131401}, {"filename": "/Data/Item/wand02.OZJ", "start": 8131401, "end": 8145919}, {"filename": "/Data/Item/wand03.OZJ", "start": 8145919, "end": 8152627}, {"filename": "/Data/Item/wand03.OZT", "start": 8152627, "end": 8153699}, {"filename": "/Data/Item/wand04.OZJ", "start": 8153699, "end": 8164974}, {"filename": "/Data/Item/wand05.OZJ", "start": 8164974, "end": 8174974}, {"filename": "/Data/Item/wand06.OZJ", "start": 8174974, "end": 8187249}, {"filename": "/Data/Item/wand10.OZJ", "start": 8187249, "end": 8194374}, {"filename": "/Data/Item/wand10.OZT", "start": 8194374, "end": 8202614}, {"filename": "/Data/Item/wand10_2.OZJ", "start": 8202614, "end": 8208919}, {"filename": "/Data/Item/wand44.OZJ", "start": 8208919, "end": 8216318}, {"filename": "/Data/Item/wand44_R.OZJ", "start": 8216318, "end": 8223907}, {"filename": "/Data/Item/waternecklace.OZJ", "start": 8223907, "end": 8233943}, {"filename": "/Data/Item/waternecklace.bmd", "start": 8233943, "end": 8243723}, {"filename": "/Data/Item/waterring.bmd", "start": 8243723, "end": 8251007}, {"filename": "/Data/Item/wdn_R.OZJ", "start": 8251007, "end": 8253370}, {"filename": "/Data/Item/windnecklace.OZJ", "start": 8253370, "end": 8263548}, {"filename": "/Data/Item/windnecklace.bmd", "start": 8263548, "end": 8274196}, {"filename": "/Data/Item/windring.OZJ", "start": 8274196, "end": 8283302}, {"filename": "/Data/Item/windring.bmd", "start": 8283302, "end": 8290250}, {"filename": "/Data/Item/wolf02.OZJ", "start": 8290250, "end": 8295126}, {"filename": "/Data/Item/wwa.OZJ", "start": 8295126, "end": 8300387}, {"filename": "/Data/Item/wwe.OZJ", "start": 8300387, "end": 8311804}, {"filename": "/Data/Item/wwe00.OZJ", "start": 8311804, "end": 8319897}, {"filename": "/Data/Item/yellow_jewel.OZJ", "start": 8319897, "end": 8324838}, {"filename": "/Data/Local/Dialog.bmd", "start": 8324838, "end": 8529638}, {"filename": "/Data/Local/Dialog_Eng.bmd", "start": 8529638, "end": 8734438}, {"filename": "/Data/Local/Dialog_Por.bmd", "start": 8734438, "end": 8939238}, {"filename": "/Data/Local/Dialog_Spn.bmd", "start": 8939238, "end": 9144038}, {"filename": "/Data/Local/Everyone.OZJ", "start": 9144038, "end": 9170227}, {"filename": "/Data/Local/Filter.bmd", "start": 9170227, "end": 9190231}, {"filename": "/Data/Local/FilterName.bmd", "start": 9190231, "end": 9210235}, {"filename": "/Data/Local/Item.bmd", "start": 9210235, "end": 9243007}, {"filename": "/Data/Local/Loading01.OZJ", "start": 9243007, "end": 9268689}, {"filename": "/Data/Local/Loading02.OZJ", "start": 9268689, "end": 9321217}, {"filename": "/Data/Local/Loading03.OZJ", "start": 9321217, "end": 9347199}, {"filename": "/Data/Local/NPCName(kor).txt", "start": 9347199, "end": 9350668}, {"filename": "/Data/Local/NPCName.txt", "start": 9350668, "end": 9354153}, {"filename": "/Data/Local/Quest.bmd", "start": 9354153, "end": 9470953}, {"filename": "/Data/Local/Skill.bmd", "start": 9470953, "end": 9473517}, {"filename": "/Data/Local/Text.bmd", "start": 9473517, "end": 9773517}, {"filename": "/Data/Local/Text_Eng.bmd", "start": 9773517, "end": 10073517}, {"filename": "/Data/Local/Text_Por.bmd", "start": 10073517, "end": 10373517}, {"filename": "/Data/Local/Text_Spn.bmd", "start": 10373517, "end": 10673517}, {"filename": "/Data/Local/Webzenlogo.OZJ", "start": 10673517, "end": 10724905}, {"filename": "/Data/Logo/0account.OZT", "start": 10724905, "end": 10940953}, {"filename": "/Data/Logo/0account_new.OZT", "start": 10940953, "end": 11157001}, {"filename": "/Data/Logo/0box.OZJ", "start": 11157001, "end": 11165799}, {"filename": "/Data/Logo/0new_account01.OZT", "start": 11165799, "end": 11427991}, {"filename": "/Data/Logo/0new_account02.OZT", "start": 11427991, "end": 11506887}, {"filename": "/Data/Logo/0on_botton.OZJ", "start": 11506887, "end": 11512873}, {"filename": "/Data/Logo/0on_botton2.OZJ", "start": 11512873, "end": 11519091}, {"filename": "/Data/Logo/0text_box.OZJ", "start": 11519091, "end": 11525229}, {"filename": "/Data/Logo/Cface01.OZJ", "start": 11525229, "end": 11562040}, {"filename": "/Data/Logo/Cface02.OZJ", "start": 11562040, "end": 11574850}, {"filename": "/Data/Logo/Cface04.OZT", "start": 11574850, "end": 11575922}, {"filename": "/Data/Logo/Cface09.OZT", "start": 11575922, "end": 11584162}, {"filename": "/Data/Logo/Delete01.OZT", "start": 11584162, "end": 11656370}, {"filename": "/Data/Logo/Delete02.OZJ", "start": 11656370, "end": 11663638}, {"filename": "/Data/Logo/Face01.bmd", "start": 11663638, "end": 11802962}, {"filename": "/Data/Logo/Face02.bmd", "start": 11802962, "end": 11948822}, {"filename": "/Data/Logo/Face03.bmd", "start": 11948822, "end": 12126009}, {"filename": "/Data/Logo/Face04.bmd", "start": 12126009, "end": 12311501}, {"filename": "/Data/Logo/Fairy_back.OZJ", "start": 12311501, "end": 12323908}, {"filename": "/Data/Logo/Interface01.OZT", "start": 12323908, "end": 12412020}, {"filename": "/Data/Logo/Interface02.OZT", "start": 12412020, "end": 12477604}, {"filename": "/Data/Logo/Interface03.OZT", "start": 12477604, "end": 12534996}, {"filename": "/Data/Logo/Interface04.OZT", "start": 12534996, "end": 12567812}, {"filename": "/Data/Logo/Logo.OZJ", "start": 12567812, "end": 12601755}, {"filename": "/Data/Logo/Logo01.bmd", "start": 12601755, "end": 12603720}, {"filename": "/Data/Logo/Logo02.bmd", "start": 12603720, "end": 12609534}, {"filename": "/Data/Logo/Logo03.bmd", "start": 12609534, "end": 12683253}, {"filename": "/Data/Logo/Logo04.bmd", "start": 12683253, "end": 12690436}, {"filename": "/Data/Logo/Logo05.bmd", "start": 12690436, "end": 12842530}, {"filename": "/Data/Logo/Logo2.OZJ", "start": 12842530, "end": 12866235}, {"filename": "/Data/Logo/Magic_01.OZJ", "start": 12866235, "end": 12893182}, {"filename": "/Data/Logo/Magic_02.OZT", "start": 12893182, "end": 13024302}, {"filename": "/Data/Logo/Magic_03.OZJ", "start": 13024302, "end": 13036712}, {"filename": "/Data/Logo/Magic_09.OZJ", "start": 13036712, "end": 13073082}, {"filename": "/Data/Logo/Magic_09_2.OZJ", "start": 13073082, "end": 13084368}, {"filename": "/Data/Logo/Main_earth.OZJ", "start": 13084368, "end": 13161917}, {"filename": "/Data/Logo/Main_stone.OZJ", "start": 13161917, "end": 13171208}, {"filename": "/Data/Logo/Main_wood1.OZJ", "start": 13171208, "end": 13195523}, {"filename": "/Data/Logo/Main_wood2.OZJ", "start": 13195523, "end": 13206531}, {"filename": "/Data/Logo/Main_wood3.OZT", "start": 13206531, "end": 13222963}, {"filename": "/Data/Logo/Main_wood4.OZT", "start": 13222963, "end": 13227107}, {"filename": "/Data/Logo/Main_wood5.OZT", "start": 13227107, "end": 13243539}, {"filename": "/Data/Logo/Main_wood6.OZJ", "start": 13243539, "end": 13248807}, {"filename": "/Data/Logo/Main_wood6.OZT", "start": 13248807, "end": 13265239}, {"filename": "/Data/Logo/Mulogo_01.OZJ", "start": 13265239, "end": 13292610}, {"filename": "/Data/Logo/New_character001.OZJ", "start": 13292610, "end": 13298388}, {"filename": "/Data/Logo/New_character002.OZJ", "start": 13298388, "end": 13304201}, {"filename": "/Data/Logo/New_character003.OZJ", "start": 13304201, "end": 13310020}, {"filename": "/Data/Logo/New_character004.OZJ", "start": 13310020, "end": 13315838}, {"filename": "/Data/Logo/New_character01.OZT", "start": 13315838, "end": 13533998}, {"filename": "/Data/Logo/New_character02.OZT", "start": 13533998, "end": 13635434}, {"filename": "/Data/Logo/New_character201.OZT", "start": 13635434, "end": 13722246}, {"filename": "/Data/Logo/New_character202.OZJ", "start": 13722246, "end": 13730674}, {"filename": "/Data/Logo/New_character_cancel.OZJ", "start": 13730674, "end": 13738281}, {"filename": "/Data/Logo/New_character_ok.OZJ", "start": 13738281, "end": 13745641}, {"filename": "/Data/Logo/Ok01.OZT", "start": 13745641, "end": 13817849}, {"filename": "/Data/Logo/Ok02.OZJ", "start": 13817849, "end": 13824782}, {"filename": "/Data/Logo/Sky0.OZJ", "start": 13824782, "end": 13905147}, {"filename": "/Data/Logo/Sky2.OZJ", "start": 13905147, "end": 13912455}, {"filename": "/Data/Logo/Sky3.OZJ", "start": 13912455, "end": 13927246}, {"filename": "/Data/Logo/Sky4.OZJ", "start": 13927246, "end": 13934107}, {"filename": "/Data/Logo/Sky5.OZJ", "start": 13934107, "end": 13997918}, {"filename": "/Data/Logo/Titel01.OZJ", "start": 13997918, "end": 14005005}, {"filename": "/Data/Logo/Titel02.OZJ", "start": 14005005, "end": 14014585}, {"filename": "/Data/Logo/Warrior.OZJ", "start": 14014585, "end": 14041497}, {"filename": "/Data/Logo/Warrior02.OZJ", "start": 14041497, "end": 14053931}, {"filename": "/Data/Logo/Warrior03.OZT", "start": 14053931, "end": 14062171}, {"filename": "/Data/Logo/Warrior_back.OZJ", "start": 14062171, "end": 14070896}, {"filename": "/Data/Logo/Wave.OZJ", "start": 14070896, "end": 14089500}, {"filename": "/Data/Logo/back1.OZJ", "start": 14089500, "end": 14126202}, {"filename": "/Data/Logo/back2.OZJ", "start": 14126202, "end": 14169163}, {"filename": "/Data/Macro.txt", "start": 14169163, "end": 14169183}, {"filename": "/Data/Monster/BGcl.OZT", "start": 14169183, "end": 14185615}, {"filename": "/Data/Monster/Karane/Boss_Karane_body.OZJ", "start": 14185615, "end": 14195510}, {"filename": "/Data/Monster/Karane/Boss_Karane_cloth.OZT", "start": 14195510, "end": 14326630}, {"filename": "/Data/Monster/Karane/Boss_Karane_head.OZJ", "start": 14326630, "end": 14329243}, {"filename": "/Data/Monster/Karane/Boss_Karane_pants.OZJ", "start": 14329243, "end": 14337463}, {"filename": "/Data/Monster/Karane/Boss_Karane_r.OZJ", "start": 14337463, "end": 14338482}, {"filename": "/Data/Monster/Karane/Karane.bmd", "start": 14338482, "end": 14819019}, {"filename": "/Data/Monster/King11.OZJ", "start": 14819019, "end": 14885547}, {"filename": "/Data/Monster/Kni000.OZJ", "start": 14885547, "end": 14922450}, {"filename": "/Data/Monster/Kni011.OZJ", "start": 14922450, "end": 14942436}, {"filename": "/Data/Monster/Kni022.OZJ", "start": 14942436, "end": 14952444}, {"filename": "/Data/Monster/Ktutl.OZJ", "start": 14952444, "end": 15030497}, {"filename": "/Data/Monster/Monster01.bmd", "start": 15030497, "end": 15189053}, {"filename": "/Data/Monster/Monster02.bmd", "start": 15189053, "end": 15302442}, {"filename": "/Data/Monster/Monster03.bmd", "start": 15302442, "end": 15390436}, {"filename": "/Data/Monster/Monster04.bmd", "start": 15390436, "end": 15556501}, {"filename": "/Data/Monster/Monster05.bmd", "start": 15556501, "end": 15716046}, {"filename": "/Data/Monster/Monster06.bmd", "start": 15716046, "end": 15880321}, {"filename": "/Data/Monster/Monster07.bmd", "start": 15880321, "end": 15920493}, {"filename": "/Data/Monster/Monster08.bmd", "start": 15920493, "end": 15982675}, {"filename": "/Data/Monster/Monster09.bmd", "start": 15982675, "end": 16086362}, {"filename": "/Data/Monster/Monster10.bmd", "start": 16086362, "end": 16138038}, {"filename": "/Data/Monster/Monster11.bmd", "start": 16138038, "end": 16278725}, {"filename": "/Data/Monster/Monster12.bmd", "start": 16278725, "end": 16433869}, {"filename": "/Data/Monster/Monster13.bmd", "start": 16433869, "end": 16580050}, {"filename": "/Data/Monster/Monster14.bmd", "start": 16580050, "end": 16765318}, {"filename": "/Data/Monster/Monster15.bmd", "start": 16765318, "end": 16881944}, {"filename": "/Data/Monster/Monster16.bmd", "start": 16881944, "end": 16964545}, {"filename": "/Data/Monster/Monster17.bmd", "start": 16964545, "end": 17091179}, {"filename": "/Data/Monster/Monster18.bmd", "start": 17091179, "end": 17148956}, {"filename": "/Data/Monster/Monster19.bmd", "start": 17148956, "end": 17371468}, {"filename": "/Data/Monster/Monster20.bmd", "start": 17371468, "end": 17461582}, {"filename": "/Data/Monster/Monster21.bmd", "start": 17461582, "end": 17493594}, {"filename": "/Data/Monster/Monster22.bmd", "start": 17493594, "end": 17614733}, {"filename": "/Data/Monster/Monster23.bmd", "start": 17614733, "end": 17716267}, {"filename": "/Data/Monster/Monster24.bmd", "start": 17716267, "end": 17846813}, {"filename": "/Data/Monster/Monster25.bmd", "start": 17846813, "end": 17964131}, {"filename": "/Data/Monster/Monster26.bmd", "start": 17964131, "end": 18053039}, {"filename": "/Data/Monster/Monster27.bmd", "start": 18053039, "end": 18168097}, {"filename": "/Data/Monster/Monster28.bmd", "start": 18168097, "end": 18398154}, {"filename": "/Data/Monster/Monster29.bmd", "start": 18398154, "end": 18507909}, {"filename": "/Data/Monster/Monster30.bmd", "start": 18507909, "end": 18694645}, {"filename": "/Data/Monster/Monster31.bmd", "start": 18694645, "end": 18884199}, {"filename": "/Data/Monster/Monster32.bmd", "start": 18884199, "end": 19212649}, {"filename": "/Data/Monster/Monster33.bmd", "start": 19212649, "end": 19375713}, {"filename": "/Data/Monster/Monster34.bmd", "start": 19375713, "end": 19507563}, {"filename": "/Data/Monster/Monster35.bmd", "start": 19507563, "end": 19616163}, {"filename": "/Data/Monster/Monster36.bmd", "start": 19616163, "end": 19733711}, {"filename": "/Data/Monster/Monster37.bmd", "start": 19733711, "end": 19910325}, {"filename": "/Data/Monster/Monster38.bmd", "start": 19910325, "end": 20185977}, {"filename": "/Data/Monster/Monster39.bmd", "start": 20185977, "end": 20229750}, {"filename": "/Data/Monster/Monster40.bmd", "start": 20229750, "end": 20455322}, {"filename": "/Data/Monster/Monster41.bmd", "start": 20455322, "end": 20605737}, {"filename": "/Data/Monster/Monster42.bmd", "start": 20605737, "end": 20754635}, {"filename": "/Data/Monster/Monster43.bmd", "start": 20754635, "end": 20963600}, {"filename": "/Data/Monster/Monster44.bmd", "start": 20963600, "end": 21083646}, {"filename": "/Data/Monster/Monster45.bmd", "start": 21083646, "end": 21294263}, {"filename": "/Data/Monster/Monster46.bmd", "start": 21294263, "end": 21414242}, {"filename": "/Data/Monster/Monster47.bmd", "start": 21414242, "end": 21510849}, {"filename": "/Data/Monster/Monster48.bmd", "start": 21510849, "end": 21620543}, {"filename": "/Data/Monster/Monster49.bmd", "start": 21620543, "end": 21783236}, {"filename": "/Data/Monster/Monster51.bmd", "start": 21783236, "end": 21927932}, {"filename": "/Data/Monster/Monster52.bmd", "start": 21927932, "end": 22070018}, {"filename": "/Data/Monster/Monster53.bmd", "start": 22070018, "end": 22210144}, {"filename": "/Data/Monster/Monster54.bmd", "start": 22210144, "end": 22389724}, {"filename": "/Data/Monster/Monster55.bmd", "start": 22389724, "end": 22658610}, {"filename": "/Data/Monster/Monster56.bmd", "start": 22658610, "end": 22838806}, {"filename": "/Data/Monster/Monster57.bmd", "start": 22838806, "end": 22959671}, {"filename": "/Data/Monster/Monster58.bmd", "start": 22959671, "end": 23106815}, {"filename": "/Data/Monster/Monster59.bmd", "start": 23106815, "end": 23348607}, {"filename": "/Data/Monster/Monster60.bmd", "start": 23348607, "end": 23479038}, {"filename": "/Data/Monster/Monster61.bmd", "start": 23479038, "end": 23521865}, {"filename": "/Data/Monster/Monster62.bmd", "start": 23521865, "end": 23537532}, {"filename": "/Data/Monster/Monster63.bmd", "start": 23537532, "end": 23683694}, {"filename": "/Data/Monster/Monster64.bmd", "start": 23683694, "end": 23862472}, {"filename": "/Data/Monster/Monster66.bmd", "start": 23862472, "end": 24073541}, {"filename": "/Data/Monster/Monster67.bmd", "start": 24073541, "end": 24270647}, {"filename": "/Data/Monster/Monster70.bmd", "start": 24270647, "end": 24616856}, {"filename": "/Data/Monster/Monster71.bmd", "start": 24616856, "end": 24736044}, {"filename": "/Data/Monster/Monster72.bmd", "start": 24736044, "end": 24853072}, {"filename": "/Data/Monster/Monster73.bmd", "start": 24853072, "end": 24977660}, {"filename": "/Data/Monster/Monster74.bmd", "start": 24977660, "end": 24986916}, {"filename": "/Data/Monster/Pichula/Boss_Karane_body.OZJ", "start": 24986916, "end": 24996811}, {"filename": "/Data/Monster/Pichula/Boss_Karane_cloth.OZT", "start": 24996811, "end": 25127931}, {"filename": "/Data/Monster/Pichula/Boss_Karane_head.OZJ", "start": 25127931, "end": 25130544}, {"filename": "/Data/Monster/Pichula/Boss_Karane_pants.OZJ", "start": 25130544, "end": 25138764}, {"filename": "/Data/Monster/Pichula/Boss_Karane_r.OZJ", "start": 25138764, "end": 25139783}, {"filename": "/Data/Monster/Pichula/Pichula.bmd", "start": 25139783, "end": 25620320}, {"filename": "/Data/Monster/Pnix.OZJ", "start": 25620320, "end": 25744558}, {"filename": "/Data/Monster/Polearms03.OZJ", "start": 25744558, "end": 25755000}, {"filename": "/Data/Monster/Tamachan.bmd", "start": 25755000, "end": 25901162}, {"filename": "/Data/Monster/ar1.OZJ", "start": 25901162, "end": 25938172}, {"filename": "/Data/Monster/armor_lower2.OZJ", "start": 25938172, "end": 25963351}, {"filename": "/Data/Monster/armor_up2.OZJ", "start": 25963351, "end": 25991075}, {"filename": "/Data/Monster/as.OZJ", "start": 25991075, "end": 26074919}, {"filename": "/Data/Monster/as_1.OZJ", "start": 26074919, "end": 26081778}, {"filename": "/Data/Monster/b4.OZJ", "start": 26081778, "end": 26187360}, {"filename": "/Data/Monster/baron.OZT", "start": 26187360, "end": 26203792}, {"filename": "/Data/Monster/baron01.OZJ", "start": 26203792, "end": 26245027}, {"filename": "/Data/Monster/bbb01.OZT", "start": 26245027, "end": 26310611}, {"filename": "/Data/Monster/bbb02.OZT", "start": 26310611, "end": 26318851}, {"filename": "/Data/Monster/bbbb.OZJ", "start": 26318851, "end": 26363008}, {"filename": "/Data/Monster/bbbb00.OZJ", "start": 26363008, "end": 26414801}, {"filename": "/Data/Monster/bbbb02.OZJ", "start": 26414801, "end": 26420461}, {"filename": "/Data/Monster/bbbb03.OZJ", "start": 26420461, "end": 26425450}, {"filename": "/Data/Monster/bee03_r.OZJ", "start": 26425450, "end": 26439041}, {"filename": "/Data/Monster/big_spider.OZJ", "start": 26439041, "end": 26469228}, {"filename": "/Data/Monster/blast_r.OZJ", "start": 26469228, "end": 26489469}, {"filename": "/Data/Monster/bons.OZJ", "start": 26489469, "end": 26517268}, {"filename": "/Data/Monster/boots2.OZJ", "start": 26517268, "end": 26527157}, {"filename": "/Data/Monster/boss.OZJ", "start": 26527157, "end": 26611510}, {"filename": "/Data/Monster/boss_eye.OZJ", "start": 26611510, "end": 26616687}, {"filename": "/Data/Monster/boss_pattern1.OZJ", "start": 26616687, "end": 26634671}, {"filename": "/Data/Monster/boss_pattern2.OZJ", "start": 26634671, "end": 26648783}, {"filename": "/Data/Monster/bossblack.OZJ", "start": 26648783, "end": 26657037}, {"filename": "/Data/Monster/bossmap1.OZJ", "start": 26657037, "end": 26724117}, {"filename": "/Data/Monster/bossmap1_r.OZJ", "start": 26724117, "end": 26742395}, {"filename": "/Data/Monster/bossmap2.OZJ", "start": 26742395, "end": 26813436}, {"filename": "/Data/Monster/bossseptormap2.OZJ", "start": 26813436, "end": 26872153}, {"filename": "/Data/Monster/bosswing.OZJ", "start": 26872153, "end": 26876781}, {"filename": "/Data/Monster/bosswing.OZT", "start": 26876781, "end": 26893213}, {"filename": "/Data/Monster/bosswingbone.OZJ", "start": 26893213, "end": 26912336}, {"filename": "/Data/Monster/bow01.OZJ", "start": 26912336, "end": 26918464}, {"filename": "/Data/Monster/bow05.OZT", "start": 26918464, "end": 26922608}, {"filename": "/Data/Monster/branch.OZJ", "start": 26922608, "end": 26939236}, {"filename": "/Data/Monster/bsh01.OZJ", "start": 26939236, "end": 26977159}, {"filename": "/Data/Monster/bsh02.OZT", "start": 26977159, "end": 26985399}, {"filename": "/Data/Monster/bsh03.OZT", "start": 26985399, "end": 26989543}, {"filename": "/Data/Monster/bug.OZJ", "start": 26989543, "end": 27017818}, {"filename": "/Data/Monster/bug2.OZJ", "start": 27017818, "end": 27024678}, {"filename": "/Data/Monster/bug3.OZJ", "start": 27024678, "end": 27033306}, {"filename": "/Data/Monster/bulldug.OZJ", "start": 27033306, "end": 27092228}, {"filename": "/Data/Monster/bulldughair.OZT", "start": 27092228, "end": 27096372}, {"filename": "/Data/Monster/bv01.OZJ", "start": 27096372, "end": 27121517}, {"filename": "/Data/Monster/bv01_2.OZJ", "start": 27121517, "end": 27132097}, {"filename": "/Data/Monster/bv02.OZJ", "start": 27132097, "end": 27172660}, {"filename": "/Data/Monster/bv02_2.OZJ", "start": 27172660, "end": 27195437}, {"filename": "/Data/Monster/bv03.OZJ", "start": 27195437, "end": 27200269}, {"filename": "/Data/Monster/cannon.OZJ", "start": 27200269, "end": 27279029}, {"filename": "/Data/Monster/cd71a.bmd", "start": 27279029, "end": 27291699}, {"filename": "/Data/Monster/cd71b.bmd", "start": 27291699, "end": 27304369}, {"filename": "/Data/Monster/cd71c.bmd", "start": 27304369, "end": 27330025}, {"filename": "/Data/Monster/cd71d.bmd", "start": 27330025, "end": 27356993}, {"filename": "/Data/Monster/cd71e.bmd", "start": 27356993, "end": 27383961}, {"filename": "/Data/Monster/cd71f.bmd", "start": 27383961, "end": 27489426}, {"filename": "/Data/Monster/cd71g.bmd", "start": 27489426, "end": 27525928}, {"filename": "/Data/Monster/cd71h.bmd", "start": 27525928, "end": 27559626}, {"filename": "/Data/Monster/chain.OZT", "start": 27559626, "end": 27560698}, {"filename": "/Data/Monster/chest.OZJ", "start": 27560698, "end": 27588446}, {"filename": "/Data/Monster/chest_R.OZJ", "start": 27588446, "end": 27604119}, {"filename": "/Data/Monster/cloak.OZT", "start": 27604119, "end": 27735239}, {"filename": "/Data/Monster/cloak_R.OZJ", "start": 27735239, "end": 27747655}, {"filename": "/Data/Monster/cr_balgass.OZT", "start": 27747655, "end": 27878775}, {"filename": "/Data/Monster/cr_balgass02.OZT", "start": 27878775, "end": 28009895}, {"filename": "/Data/Monster/cr_werewolf01.OZJ", "start": 28009895, "end": 28121139}, {"filename": "/Data/Monster/cr_werewolf02.OZJ", "start": 28121139, "end": 28230668}, {"filename": "/Data/Monster/cundun1.OZJ", "start": 28230668, "end": 28297493}, {"filename": "/Data/Monster/cundun2.OZJ", "start": 28297493, "end": 28309985}, {"filename": "/Data/Monster/cundun3.OZJ", "start": 28309985, "end": 28348658}, {"filename": "/Data/Monster/cundun4.OZJ", "start": 28348658, "end": 28362797}, {"filename": "/Data/Monster/cundun4.OZT", "start": 28362797, "end": 28363357}, {"filename": "/Data/Monster/cundun5.OZJ", "start": 28363357, "end": 28383630}, {"filename": "/Data/Monster/cundunHead.OZJ", "start": 28383630, "end": 28412111}, {"filename": "/Data/Monster/cundun_gone.bmd", "start": 28412111, "end": 28615851}, {"filename": "/Data/Monster/cundunend.OZJ", "start": 28615851, "end": 28620525}, {"filename": "/Data/Monster/cundunend.OZT", "start": 28620525, "end": 28624669}, {"filename": "/Data/Monster/cundunskin.OZJ", "start": 28624669, "end": 28630891}, {"filename": "/Data/Monster/defencenpc_1_head.OZJ", "start": 28630891, "end": 28651435}, {"filename": "/Data/Monster/defencenpc_1_should.OZJ", "start": 28651435, "end": 28655766}, {"filename": "/Data/Monster/defencenpc_2_food.OZJ", "start": 28655766, "end": 28674187}, {"filename": "/Data/Monster/defencenpc_2_head.OZJ", "start": 28674187, "end": 28692485}, {"filename": "/Data/Monster/defencenpc_2_should.OZJ", "start": 28692485, "end": 28713256}, {"filename": "/Data/Monster/defencenpc_body.OZJ", "start": 28713256, "end": 28817371}, {"filename": "/Data/Monster/defencenpc_weapon.OZJ", "start": 28817371, "end": 28829726}, {"filename": "/Data/Monster/devil.OZJ", "start": 28829726, "end": 28884591}, {"filename": "/Data/Monster/devilhair.OZT", "start": 28884591, "end": 28888735}, {"filename": "/Data/Monster/devilwing.OZJ", "start": 28888735, "end": 28913708}, {"filename": "/Data/Monster/doorc01.OZJ", "start": 28913708, "end": 28956323}, {"filename": "/Data/Monster/drr_01.OZJ", "start": 28956323, "end": 29045398}, {"filename": "/Data/Monster/drr_02.OZJ", "start": 29045398, "end": 29117279}, {"filename": "/Data/Monster/drr_03.OZJ", "start": 29117279, "end": 29194465}, {"filename": "/Data/Monster/drt00.OZJ", "start": 29194465, "end": 29204441}, {"filename": "/Data/Monster/drt01.OZJ", "start": 29204441, "end": 29269112}, {"filename": "/Data/Monster/drt02.OZJ", "start": 29269112, "end": 29315771}, {"filename": "/Data/Monster/drt02.OZT", "start": 29315771, "end": 29332203}, {"filename": "/Data/Monster/drt03.OZJ", "start": 29332203, "end": 29338948}, {"filename": "/Data/Monster/drt03.OZT", "start": 29338948, "end": 29355380}, {"filename": "/Data/Monster/drt05.OZJ", "start": 29355380, "end": 29360809}, {"filename": "/Data/Monster/eagle.OZT", "start": 29360809, "end": 29369049}, {"filename": "/Data/Monster/eagle01.OZJ", "start": 29369049, "end": 29377581}, {"filename": "/Data/Monster/epiboss_armor.OZJ", "start": 29377581, "end": 29460018}, {"filename": "/Data/Monster/epibossskin.OZJ", "start": 29460018, "end": 29534674}, {"filename": "/Data/Monster/epibosswing.OZJ", "start": 29534674, "end": 29556150}, {"filename": "/Data/Monster/fireeffect.OZJ", "start": 29556150, "end": 29616923}, {"filename": "/Data/Monster/fmammor.OZJ", "start": 29616923, "end": 29722838}, {"filename": "/Data/Monster/fmbody_r.OZJ", "start": 29722838, "end": 29762333}, {"filename": "/Data/Monster/forestgost.OZJ", "start": 29762333, "end": 29900589}, {"filename": "/Data/Monster/forestgost_should.OZJ", "start": 29900589, "end": 29939205}, {"filename": "/Data/Monster/fr00.OZJ", "start": 29939205, "end": 30005426}, {"filename": "/Data/Monster/fs00.OZJ", "start": 30005426, "end": 30056238}, {"filename": "/Data/Monster/fs01.OZT", "start": 30056238, "end": 30121822}, {"filename": "/Data/Monster/fs02.OZJ", "start": 30121822, "end": 30126615}, {"filename": "/Data/Monster/garp.OZJ", "start": 30126615, "end": 30137194}, {"filename": "/Data/Monster/gate.OZJ", "start": 30137194, "end": 30179297}, {"filename": "/Data/Monster/gh1.OZJ", "start": 30179297, "end": 30243884}, {"filename": "/Data/Monster/gh2.OZJ", "start": 30243884, "end": 30313791}, {"filename": "/Data/Monster/gh3.OZJ", "start": 30313791, "end": 30318920}, {"filename": "/Data/Monster/gloves2.OZJ", "start": 30318920, "end": 30339126}, {"filename": "/Data/Monster/gp01.OZJ", "start": 30339126, "end": 30394683}, {"filename": "/Data/Monster/gp02.OZT", "start": 30394683, "end": 30411115}, {"filename": "/Data/Monster/h_r.OZT", "start": 30411115, "end": 30443931}, {"filename": "/Data/Monster/head.OZJ", "start": 30443931, "end": 30453510}, {"filename": "/Data/Monster/helmat_01.OZJ", "start": 30453510, "end": 30459297}, {"filename": "/Data/Monster/helmat_02.OZJ", "start": 30459297, "end": 30464489}, {"filename": "/Data/Monster/helmet2.OZJ", "start": 30464489, "end": 30474542}, {"filename": "/Data/Monster/ho9_11.OZJ", "start": 30474542, "end": 30581594}, {"filename": "/Data/Monster/ho9_2.OZJ", "start": 30581594, "end": 30592917}, {"filename": "/Data/Monster/hop01.OZJ", "start": 30592917, "end": 30665724}, {"filename": "/Data/Monster/hound_head01.OZJ", "start": 30665724, "end": 30677431}, {"filename": "/Data/Monster/hound_head02.OZJ", "start": 30677431, "end": 30689108}, {"filename": "/Data/Monster/hound_lower.OZJ", "start": 30689108, "end": 30720684}, {"filename": "/Data/Monster/hp00.OZJ", "start": 30720684, "end": 30756777}, {"filename": "/Data/Monster/hp01.OZT", "start": 30756777, "end": 30822361}, {"filename": "/Data/Monster/ice_m.OZJ", "start": 30822361, "end": 30843760}, {"filename": "/Data/Monster/it.OZJ", "start": 30843760, "end": 30872631}, {"filename": "/Data/Monster/iui01.OZT", "start": 30872631, "end": 31134823}, {"filename": "/Data/Monster/iui02.OZJ", "start": 31134823, "end": 31146649}, {"filename": "/Data/Monster/iui02.OZT", "start": 31146649, "end": 31154889}, {"filename": "/Data/Monster/iui03.OZJ", "start": 31154889, "end": 31179309}, {"filename": "/Data/Monster/iui03.OZT", "start": 31179309, "end": 31187549}, {"filename": "/Data/Monster/iui06.OZJ", "start": 31187549, "end": 31190156}, {"filename": "/Data/Monster/king01.OZJ", "start": 31190156, "end": 31210264}, {"filename": "/Data/Monster/king08.OZT", "start": 31210264, "end": 31212360}, {"filename": "/Data/Monster/king09.OZJ", "start": 31212360, "end": 31272362}, {"filename": "/Data/Monster/kni00.OZJ", "start": 31272362, "end": 31314822}, {"filename": "/Data/Monster/kni01.OZJ", "start": 31314822, "end": 31338856}, {"filename": "/Data/Monster/kni02.OZJ", "start": 31338856, "end": 31348925}, {"filename": "/Data/Monster/kuo00.OZJ", "start": 31348925, "end": 31409536}, {"filename": "/Data/Monster/kuo01.OZJ", "start": 31409536, "end": 31422976}, {"filename": "/Data/Monster/kuo02.OZJ", "start": 31422976, "end": 31450711}, {"filename": "/Data/Monster/leaves.OZT", "start": 31450711, "end": 31467143}, {"filename": "/Data/Monster/legs.OZJ", "start": 31467143, "end": 31491094}, {"filename": "/Data/Monster/legs_R.OZJ", "start": 31491094, "end": 31507719}, {"filename": "/Data/Monster/lobfur.OZT", "start": 31507719, "end": 31511863}, {"filename": "/Data/Monster/lobster.OZJ", "start": 31511863, "end": 31562337}, {"filename": "/Data/Monster/lpo01.OZT", "start": 31562337, "end": 31824529}, {"filename": "/Data/Monster/m1.OZT", "start": 31824529, "end": 31955649}, {"filename": "/Data/Monster/ma001.OZT", "start": 31955649, "end": 31963889}, {"filename": "/Data/Monster/ma002.OZJ", "start": 31963889, "end": 31964686}, {"filename": "/Data/Monster/ma1.OZJ", "start": 31964686, "end": 31979283}, {"filename": "/Data/Monster/ma2.OZJ", "start": 31979283, "end": 31979955}, {"filename": "/Data/Monster/ma_1.OZJ", "start": 31979955, "end": 32019856}, {"filename": "/Data/Monster/magic_BB.OZT", "start": 32019856, "end": 32036288}, {"filename": "/Data/Monster/magic_H.OZT", "start": 32036288, "end": 32040432}, {"filename": "/Data/Monster/manto.OZT", "start": 32040432, "end": 32171552}, {"filename": "/Data/Monster/mon2_01.OZJ", "start": 32171552, "end": 32254891}, {"filename": "/Data/Monster/mon2_02.OZJ", "start": 32254891, "end": 32299350}, {"filename": "/Data/Monster/mon3_03.OZJ", "start": 32299350, "end": 32334295}, {"filename": "/Data/Monster/mon_01.OZJ", "start": 32334295, "end": 32363925}, {"filename": "/Data/Monster/mon_05.OZJ", "start": 32363925, "end": 32375120}, {"filename": "/Data/Monster/mono3.OZJ", "start": 32375120, "end": 32472203}, {"filename": "/Data/Monster/mono3eye.OZJ", "start": 32472203, "end": 32482702}, {"filename": "/Data/Monster/monster(1).bmd", "start": 32482702, "end": 32723792}, {"filename": "/Data/Monster/monster.bmd", "start": 32723792, "end": 32895479}, {"filename": "/Data/Monster/monster101.bmd", "start": 32895479, "end": 33197726}, {"filename": "/Data/Monster/monster102.bmd", "start": 33197726, "end": 33374398}, {"filename": "/Data/Monster/monster103.bmd", "start": 33374398, "end": 33608544}, {"filename": "/Data/Monster/monster104.bmd", "start": 33608544, "end": 33811470}, {"filename": "/Data/Monster/monster105.bmd", "start": 33811470, "end": 33987271}, {"filename": "/Data/Monster/monster106.bmd", "start": 33987271, "end": 34354595}, {"filename": "/Data/Monster/monster65.bmd", "start": 34354595, "end": 34869271}, {"filename": "/Data/Monster/monster68.bmd", "start": 34869271, "end": 35045764}, {"filename": "/Data/Monster/monster69.bmd", "start": 35045764, "end": 35212727}, {"filename": "/Data/Monster/monster75.bmd", "start": 35212727, "end": 35293084}, {"filename": "/Data/Monster/monster77.bmd", "start": 35293084, "end": 35441821}, {"filename": "/Data/Monster/monster78.bmd", "start": 35441821, "end": 35594569}, {"filename": "/Data/Monster/monster79.bmd", "start": 35594569, "end": 35602161}, {"filename": "/Data/Monster/monster80.bmd", "start": 35602161, "end": 35676099}, {"filename": "/Data/Monster/monster81.OZJ", "start": 35676099, "end": 35690521}, {"filename": "/Data/Monster/monster81_r.OZJ", "start": 35690521, "end": 35702959}, {"filename": "/Data/Monster/monster81_r2.OZJ", "start": 35702959, "end": 35715029}, {"filename": "/Data/Monster/monster82.bmd", "start": 35715029, "end": 35889668}, {"filename": "/Data/Monster/monster83.bmd", "start": 35889668, "end": 36094809}, {"filename": "/Data/Monster/monster84.bmd", "start": 36094809, "end": 36291437}, {"filename": "/Data/Monster/monster85.bmd", "start": 36291437, "end": 36524364}, {"filename": "/Data/Monster/monster86.bmd", "start": 36524364, "end": 36681221}, {"filename": "/Data/Monster/monster87.bmd", "start": 36681221, "end": 36702438}, {"filename": "/Data/Monster/monster88.bmd", "start": 36702438, "end": 37085289}, {"filename": "/Data/Monster/monster90.bmd", "start": 37085289, "end": 37305345}, {"filename": "/Data/Monster/monster91.bmd", "start": 37305345, "end": 37538627}, {"filename": "/Data/Monster/monster92.bmd", "start": 37538627, "end": 37804349}, {"filename": "/Data/Monster/monster93.bmd", "start": 37804349, "end": 37997890}, {"filename": "/Data/Monster/monster94.bmd", "start": 37997890, "end": 38197999}, {"filename": "/Data/Monster/monster95.bmd", "start": 38197999, "end": 38386013}, {"filename": "/Data/Monster/monster96.bmd", "start": 38386013, "end": 38633809}, {"filename": "/Data/Monster/monster97.bmd", "start": 38633809, "end": 38843685}, {"filename": "/Data/Monster/monster98.bmd", "start": 38843685, "end": 39035879}, {"filename": "/Data/Monster/monster99.bmd", "start": 39035879, "end": 39268489}, {"filename": "/Data/Monster/monster_wolf_weapon.OZJ", "start": 39268489, "end": 39307789}, {"filename": "/Data/Monster/monster_worlf.OZJ", "start": 39307789, "end": 39396360}, {"filename": "/Data/Monster/monx01.OZJ", "start": 39396360, "end": 39497853}, {"filename": "/Data/Monster/monx02.OZT", "start": 39497853, "end": 39563437}, {"filename": "/Data/Monster/mop01.OZJ", "start": 39563437, "end": 39603348}, {"filename": "/Data/Monster/mop02.OZJ", "start": 39603348, "end": 39686490}, {"filename": "/Data/Monster/mop03.OZJ", "start": 39686490, "end": 39696310}, {"filename": "/Data/Monster/mop03.OZT", "start": 39696310, "end": 39729126}, {"filename": "/Data/Monster/mopmop.OZJ", "start": 39729126, "end": 39755749}, {"filename": "/Data/Monster/mopmop.OZT", "start": 39755749, "end": 39788565}, {"filename": "/Data/Monster/mopmop02.OZJ", "start": 39788565, "end": 39813368}, {"filename": "/Data/Monster/mopmop03.OZJ", "start": 39813368, "end": 39827014}, {"filename": "/Data/Monster/npc_a_01.OZJ", "start": 39827014, "end": 39837763}, {"filename": "/Data/Monster/npc_a_02.OZJ", "start": 39837763, "end": 39848157}, {"filename": "/Data/Monster/npc_a_03.OZJ", "start": 39848157, "end": 39854104}, {"filename": "/Data/Monster/npc_a_04.OZJ", "start": 39854104, "end": 39861992}, {"filename": "/Data/Monster/npc_a_05.OZJ", "start": 39861992, "end": 39869428}, {"filename": "/Data/Monster/npc_a_06.OZJ", "start": 39869428, "end": 39874779}, {"filename": "/Data/Monster/npc_a_07.OZJ", "start": 39874779, "end": 39881195}, {"filename": "/Data/Monster/npc_a_08_01.OZJ", "start": 39881195, "end": 39891353}, {"filename": "/Data/Monster/npc_a_08_02.OZJ", "start": 39891353, "end": 39901499}, {"filename": "/Data/Monster/npc_a_09_01.OZJ", "start": 39901499, "end": 39911788}, {"filename": "/Data/Monster/npc_a_09_02.OZJ", "start": 39911788, "end": 39922102}, {"filename": "/Data/Monster/npc_a_clothes.OZT", "start": 39922102, "end": 39926246}, {"filename": "/Data/Monster/npc_b1.OZJ", "start": 39926246, "end": 39952531}, {"filename": "/Data/Monster/npc_g.OZJ", "start": 39952531, "end": 39979710}, {"filename": "/Data/Monster/ob2.OZJ", "start": 39979710, "end": 40004310}, {"filename": "/Data/Monster/ogre.OZJ", "start": 40004310, "end": 40032693}, {"filename": "/Data/Monster/p_d.OZJ", "start": 40032693, "end": 40059739}, {"filename": "/Data/Monster/p_d.OZT", "start": 40059739, "end": 40076171}, {"filename": "/Data/Monster/poisongolem.OZT", "start": 40076171, "end": 40338363}, {"filename": "/Data/Monster/poisongolem01.OZJ", "start": 40338363, "end": 40350197}, {"filename": "/Data/Monster/prizm.OZJ", "start": 40350197, "end": 40364605}, {"filename": "/Data/Monster/pt.OZJ", "start": 40364605, "end": 40408339}, {"filename": "/Data/Monster/pt2.OZJ", "start": 40408339, "end": 40451568}, {"filename": "/Data/Monster/pt3.OZJ", "start": 40451568, "end": 40483537}, {"filename": "/Data/Monster/remonelf.OZJ", "start": 40483537, "end": 40591466}, {"filename": "/Data/Monster/rt03.OZJ", "start": 40591466, "end": 40670997}, {"filename": "/Data/Monster/sander.OZJ", "start": 40670997, "end": 40718669}, {"filename": "/Data/Monster/sander.OZT", "start": 40718669, "end": 40722813}, {"filename": "/Data/Monster/sander2.OZJ", "start": 40722813, "end": 40738415}, {"filename": "/Data/Monster/satan_a.OZT", "start": 40738415, "end": 41000607}, {"filename": "/Data/Monster/seta.OZJ", "start": 41000607, "end": 41101050}, {"filename": "/Data/Monster/setb.OZT", "start": 41101050, "end": 41166634}, {"filename": "/Data/Monster/shadow_a.OZJ", "start": 41166634, "end": 41174141}, {"filename": "/Data/Monster/shadow_b.OZJ", "start": 41174141, "end": 41179423}, {"filename": "/Data/Monster/shadow_c.OZJ", "start": 41179423, "end": 41188674}, {"filename": "/Data/Monster/skR.OZJ", "start": 41188674, "end": 41229313}, {"filename": "/Data/Monster/smoke04.OZJ", "start": 41229313, "end": 41240680}, {"filename": "/Data/Monster/snake.OZJ", "start": 41240680, "end": 41248149}, {"filename": "/Data/Monster/snake02.OZT", "start": 41248149, "end": 41252293}, {"filename": "/Data/Monster/snow_queen01.OZJ", "start": 41252293, "end": 41273326}, {"filename": "/Data/Monster/snow_queen02.OZJ", "start": 41273326, "end": 41280997}, {"filename": "/Data/Monster/snow_queen03.OZJ", "start": 41280997, "end": 41286924}, {"filename": "/Data/Monster/snowking.OZJ", "start": 41286924, "end": 41308185}, {"filename": "/Data/Monster/snowman.OZJ", "start": 41308185, "end": 41333450}, {"filename": "/Data/Monster/snowman02.OZJ", "start": 41333450, "end": 41359993}, {"filename": "/Data/Monster/soram01.OZJ", "start": 41359993, "end": 41475204}, {"filename": "/Data/Monster/soram02.OZJ", "start": 41475204, "end": 41515912}, {"filename": "/Data/Monster/spider01.OZT", "start": 41515912, "end": 41524152}, {"filename": "/Data/Monster/spider02.OZJ", "start": 41524152, "end": 41533748}, {"filename": "/Data/Monster/st091.OZJ", "start": 41533748, "end": 41573550}, {"filename": "/Data/Monster/starp00.OZJ", "start": 41573550, "end": 41635388}, {"filename": "/Data/Monster/stmop01.OZJ", "start": 41635388, "end": 41712554}, {"filename": "/Data/Monster/stmop02.OZJ", "start": 41712554, "end": 41733919}, {"filename": "/Data/Monster/stmop03.OZJ", "start": 41733919, "end": 41749543}, {"filename": "/Data/Monster/ston1.OZJ", "start": 41749543, "end": 41762087}, {"filename": "/Data/Monster/stonegolem.OZJ", "start": 41762087, "end": 41893015}, {"filename": "/Data/Monster/sword05.OZJ", "start": 41893015, "end": 41899363}, {"filename": "/Data/Monster/tgh03.OZT", "start": 41899363, "end": 41907603}, {"filename": "/Data/Monster/towergate_r.OZJ", "start": 41907603, "end": 41910245}, {"filename": "/Data/Monster/treemonster01.OZT", "start": 41910245, "end": 41975829}, {"filename": "/Data/Monster/treemonster02.OZJ", "start": 41975829, "end": 42097365}, {"filename": "/Data/Monster/uo00.OZJ", "start": 42097365, "end": 42112500}, {"filename": "/Data/Monster/uo01.OZT", "start": 42112500, "end": 42120740}, {"filename": "/Data/Monster/w.OZJ", "start": 42120740, "end": 42179993}, {"filename": "/Data/Monster/w_merchant_a.OZJ", "start": 42179993, "end": 42214321}, {"filename": "/Data/Monster/wa1.OZJ", "start": 42214321, "end": 42250416}, {"filename": "/Data/Monster/wa2.OZJ", "start": 42250416, "end": 42290823}, {"filename": "/Data/Monster/wa3.OZJ", "start": 42290823, "end": 42335675}, {"filename": "/Data/Monster/weapon64.bmd", "start": 42335675, "end": 42367225}, {"filename": "/Data/Monster/wheel.OZJ", "start": 42367225, "end": 42436805}, {"filename": "/Data/Monster/wizard_gloves_02.OZJ", "start": 42436805, "end": 42445211}, {"filename": "/Data/Monster/wizard_head_02.OZJ", "start": 42445211, "end": 42457501}, {"filename": "/Data/Monster/wizard_lower_02.OZJ", "start": 42457501, "end": 42469338}, {"filename": "/Data/Monster/wizard_upper_02.OZJ", "start": 42469338, "end": 42478546}, {"filename": "/Data/Monster/wolf01.OZJ", "start": 42478546, "end": 42521770}, {"filename": "/Data/Monster/wolf03.OZT", "start": 42521770, "end": 42587354}, {"filename": "/Data/Monster/wolfa01.OZJ", "start": 42587354, "end": 42627256}, {"filename": "/Data/Monster/wolfa02.OZJ", "start": 42627256, "end": 42666573}, {"filename": "/Data/Monster/wolfa02.OZT", "start": 42666573, "end": 42715773}, {"filename": "/Data/Monster/wolfbody.OZJ", "start": 42715773, "end": 42756655}, {"filename": "/Data/Monster/wwo.OZJ", "start": 42756655, "end": 42785562}, {"filename": "/Data/Music/Atlans.mp3", "start": 42785562, "end": 47311958}, {"filename": "/Data/Music/Cathedral.mp3", "start": 47311958, "end": 52331358}, {"filename": "/Data/Music/Devias.mp3", "start": 52331358, "end": 58620936}, {"filename": "/Data/Music/DuelArena.mp3", "start": 58620936, "end": 59506908}, {"filename": "/Data/Music/Dungeon.mp3", "start": 59506908, "end": 65336940}, {"filename": "/Data/Music/Icarus.mp3", "start": 65336940, "end": 68629939}, {"filename": "/Data/Music/Lorencia.mp3", "start": 68629939, "end": 73658116}, {"filename": "/Data/Music/MuTheme.mp3", "start": 73658116, "end": 78686293}, {"filename": "/Data/Music/Noria.mp3", "start": 78686293, "end": 83222693}, {"filename": "/Data/Music/PK_Field.mp3", "start": 83222693, "end": 84055166}, {"filename": "/Data/Music/Pub.mp3", "start": 84055166, "end": 87347720}, {"filename": "/Data/Music/devil_square_intro.mp3", "start": 87347720, "end": 88277995}, {"filename": "/Data/Music/devil_square_outro.mp3", "start": 88277995, "end": 90125691}, {"filename": "/Data/Music/login_theme.mp3", "start": 90125691, "end": 92945323}, {"filename": "/Data/Music/lost_tower_a.mp3", "start": 92945323, "end": 96980199}, {"filename": "/Data/Music/lost_tower_b.mp3", "start": 96980199, "end": 100067980}, {"filename": "/Data/Music/main_theme.mp3", "start": 100067980, "end": 102218278}, {"filename": "/Data/Music/tarkan.mp3", "start": 102218278, "end": 105267606}, {"filename": "/Data/NPC/BloodCastle01.bmd", "start": 105267606, "end": 105353112}, {"filename": "/Data/NPC/BloodCastle02.bmd", "start": 105353112, "end": 105441847}, {"filename": "/Data/NPC/Breeder.bmd", "start": 105441847, "end": 105569063}, {"filename": "/Data/NPC/DeviasTrader01.bmd", "start": 105569063, "end": 105664319}, {"filename": "/Data/NPC/DevilNpc01.bmd", "start": 105664319, "end": 105713611}, {"filename": "/Data/NPC/Elf01.bmd", "start": 105713611, "end": 105781043}, {"filename": "/Data/NPC/ElfMerchant01.bmd", "start": 105781043, "end": 105848475}, {"filename": "/Data/NPC/ElfWizard01.bmd", "start": 105848475, "end": 105942670}, {"filename": "/Data/NPC/Female01.bmd", "start": 105942670, "end": 105985488}, {"filename": "/Data/NPC/FemaleBoots01.bmd", "start": 105985488, "end": 105999712}, {"filename": "/Data/NPC/FemaleBoots02.bmd", "start": 105999712, "end": 106012504}, {"filename": "/Data/NPC/FemaleHead01.bmd", "start": 106012504, "end": 106024136}, {"filename": "/Data/NPC/FemaleHead02.bmd", "start": 106024136, "end": 106035768}, {"filename": "/Data/NPC/FemaleLower01.bmd", "start": 106035768, "end": 106046462}, {"filename": "/Data/NPC/FemaleLower02.bmd", "start": 106046462, "end": 106059676}, {"filename": "/Data/NPC/FemaleUpper01.bmd", "start": 106059676, "end": 106084914}, {"filename": "/Data/NPC/FemaleUpper02.bmd", "start": 106084914, "end": 106108598}, {"filename": "/Data/NPC/Girl01.bmd", "start": 106108598, "end": 106142027}, {"filename": "/Data/NPC/GirlHead01.bmd", "start": 106142027, "end": 106152137}, {"filename": "/Data/NPC/GirlHead02.bmd", "start": 106152137, "end": 106162247}, {"filename": "/Data/NPC/GirlLower01.bmd", "start": 106162247, "end": 106180017}, {"filename": "/Data/NPC/GirlLower02.bmd", "start": 106180017, "end": 106188299}, {"filename": "/Data/NPC/GirlUpper01.bmd", "start": 106188299, "end": 106211251}, {"filename": "/Data/NPC/GirlUpper02.bmd", "start": 106211251, "end": 106232889}, {"filename": "/Data/NPC/Man01.bmd", "start": 106232889, "end": 106253424}, {"filename": "/Data/NPC/ManBoots01.bmd", "start": 106253424, "end": 106265282}, {"filename": "/Data/NPC/ManBoots02.bmd", "start": 106265282, "end": 106277668}, {"filename": "/Data/NPC/ManGloves01.bmd", "start": 106277668, "end": 106291673}, {"filename": "/Data/NPC/ManGloves02.bmd", "start": 106291673, "end": 106305630}, {"filename": "/Data/NPC/ManHead01.bmd", "start": 106305630, "end": 106316088}, {"filename": "/Data/NPC/ManHead02.bmd", "start": 106316088, "end": 106326750}, {"filename": "/Data/NPC/ManUpper01.bmd", "start": 106326750, "end": 106351592}, {"filename": "/Data/NPC/ManUpper02.bmd", "start": 106351592, "end": 106378986}, {"filename": "/Data/NPC/Master01.bmd", "start": 106378986, "end": 106480289}, {"filename": "/Data/NPC/MixNpc01.bmd", "start": 106480289, "end": 106545426}, {"filename": "/Data/NPC/Sevina01.bmd", "start": 106545426, "end": 106628134}, {"filename": "/Data/NPC/Smith01.bmd", "start": 106628134, "end": 106743586}, {"filename": "/Data/NPC/SnowMerchant01.bmd", "start": 106743586, "end": 106836602}, {"filename": "/Data/NPC/SnowSmith01.bmd", "start": 106836602, "end": 106937227}, {"filename": "/Data/NPC/SnowWizard01.bmd", "start": 106937227, "end": 107016134}, {"filename": "/Data/NPC/Storage01.bmd", "start": 107016134, "end": 107184569}, {"filename": "/Data/NPC/Tournament01.bmd", "start": 107184569, "end": 107301715}, {"filename": "/Data/NPC/Wizard01.bmd", "start": 107301715, "end": 107402231}, {"filename": "/Data/NPC/agic_shop01.OZT", "start": 107402231, "end": 107410471}, {"filename": "/Data/NPC/birdnpc.OZJ", "start": 107410471, "end": 107450699}, {"filename": "/Data/NPC/blackhole.OZJ", "start": 107450699, "end": 107469981}, {"filename": "/Data/NPC/bnpc01.OZT", "start": 107469981, "end": 107502797}, {"filename": "/Data/NPC/bnpc02.OZT", "start": 107502797, "end": 107506941}, {"filename": "/Data/NPC/boots_07.OZJ", "start": 107506941, "end": 107516432}, {"filename": "/Data/NPC/boots_12.OZJ", "start": 107516432, "end": 107527010}, {"filename": "/Data/NPC/caterf.OZJ", "start": 107527010, "end": 107599311}, {"filename": "/Data/NPC/caterf2.OZJ", "start": 107599311, "end": 107677739}, {"filename": "/Data/NPC/crown.OZJ", "start": 107677739, "end": 107686002}, {"filename": "/Data/NPC/dksbody.OZT", "start": 107686002, "end": 107751586}, {"filename": "/Data/NPC/dkshelmet.OZJ", "start": 107751586, "end": 107761887}, {"filename": "/Data/NPC/dkswing.OZJ", "start": 107761887, "end": 107774031}, {"filename": "/Data/NPC/elder.OZJ", "start": 107774031, "end": 107869693}, {"filename": "/Data/NPC/fire_02.OZJ", "start": 107869693, "end": 107875532}, {"filename": "/Data/NPC/fire_03.OZJ", "start": 107875532, "end": 107883052}, {"filename": "/Data/NPC/foot.OZJ", "start": 107883052, "end": 107892867}, {"filename": "/Data/NPC/gggi01.OZJ", "start": 107892867, "end": 107909508}, {"filename": "/Data/NPC/gggi02.OZJ", "start": 107909508, "end": 107953072}, {"filename": "/Data/NPC/girl_a.OZJ", "start": 107953072, "end": 107976450}, {"filename": "/Data/NPC/girl_b.OZJ", "start": 107976450, "end": 108005967}, {"filename": "/Data/NPC/gloves_07.OZJ", "start": 108005967, "end": 108016118}, {"filename": "/Data/NPC/gloves_12.OZJ", "start": 108016118, "end": 108027638}, {"filename": "/Data/NPC/guard_gold2.OZJ", "start": 108027638, "end": 108094174}, {"filename": "/Data/NPC/guard_hair.OZT", "start": 108094174, "end": 108098318}, {"filename": "/Data/NPC/head_02.OZJ", "start": 108098318, "end": 108110602}, {"filename": "/Data/NPC/head_07.OZJ", "start": 108110602, "end": 108119553}, {"filename": "/Data/NPC/head_12.OZJ", "start": 108119553, "end": 108129327}, {"filename": "/Data/NPC/hide.OZJ", "start": 108129327, "end": 108133867}, {"filename": "/Data/NPC/hound_sword1.OZJ", "start": 108133867, "end": 108143355}, {"filename": "/Data/NPC/hpp.OZJ", "start": 108143355, "end": 108183842}, {"filename": "/Data/NPC/hugerock02.OZJ", "start": 108183842, "end": 108213236}, {"filename": "/Data/NPC/ju01_R.OZJ", "start": 108213236, "end": 108227645}, {"filename": "/Data/NPC/knifestone.OZJ", "start": 108227645, "end": 108246857}, {"filename": "/Data/NPC/lnn01.OZT", "start": 108246857, "end": 108279673}, {"filename": "/Data/NPC/lower_12.OZJ", "start": 108279673, "end": 108308086}, {"filename": "/Data/NPC/lplower.OZJ", "start": 108308086, "end": 108322948}, {"filename": "/Data/NPC/lptgq.OZT", "start": 108322948, "end": 108355764}, {"filename": "/Data/NPC/lpwing.OZJ", "start": 108355764, "end": 108366310}, {"filename": "/Data/NPC/magic_shop012.OZT", "start": 108366310, "end": 108374550}, {"filename": "/Data/NPC/magic_shop01a.OZJ", "start": 108374550, "end": 108399534}, {"filename": "/Data/NPC/magic_shop01b.OZJ", "start": 108399534, "end": 108424691}, {"filename": "/Data/NPC/magic_shop02.OZT", "start": 108424691, "end": 108428835}, {"filename": "/Data/NPC/magic_shop022.OZT", "start": 108428835, "end": 108432979}, {"filename": "/Data/NPC/man.OZJ", "start": 108432979, "end": 108474536}, {"filename": "/Data/NPC/merchant_moster_b01.OZJ", "start": 108474536, "end": 108515020}, {"filename": "/Data/NPC/model_npc_catapult_att.bmd", "start": 108515020, "end": 108773741}, {"filename": "/Data/NPC/model_npc_catapult_def.bmd", "start": 108773741, "end": 109036273}, {"filename": "/Data/NPC/mon_01.OZJ", "start": 109036273, "end": 109098341}, {"filename": "/Data/NPC/mon_011.OZJ", "start": 109098341, "end": 109156347}, {"filename": "/Data/NPC/mon_02.OZJ", "start": 109156347, "end": 109171067}, {"filename": "/Data/NPC/mon_022.OZJ", "start": 109171067, "end": 109185324}, {"filename": "/Data/NPC/ng01.OZJ", "start": 109185324, "end": 109265976}, {"filename": "/Data/NPC/npc.OZJ", "start": 109265976, "end": 109310860}, {"filename": "/Data/NPC/npc_mulyak.bmd", "start": 109310860, "end": 109374834}, {"filename": "/Data/NPC/npc_mulyak01.OZJ", "start": 109374834, "end": 109479120}, {"filename": "/Data/NPC/npcbarrier.bmd", "start": 109479120, "end": 109482570}, {"filename": "/Data/NPC/npccheckfloor.OZJ", "start": 109482570, "end": 109507985}, {"filename": "/Data/NPC/npccheckfloor.bmd", "start": 109507985, "end": 109540457}, {"filename": "/Data/NPC/npccheckfloor_r.OZJ", "start": 109540457, "end": 109548633}, {"filename": "/Data/NPC/npcclerk.bmd", "start": 109548633, "end": 109673660}, {"filename": "/Data/NPC/npccrown.bmd", "start": 109673660, "end": 109694186}, {"filename": "/Data/NPC/npcgateswitch.OZJ", "start": 109694186, "end": 109718423}, {"filename": "/Data/NPC/npcgateswitch.bmd", "start": 109718423, "end": 109733869}, {"filename": "/Data/NPC/npcsenatus.bmd", "start": 109733869, "end": 109864722}, {"filename": "/Data/NPC/ob.OZJ", "start": 109864722, "end": 109889385}, {"filename": "/Data/NPC/ob3.OZJ", "start": 109889385, "end": 109917497}, {"filename": "/Data/NPC/obj_donkey.bmd", "start": 109917497, "end": 110004925}, {"filename": "/Data/NPC/obj_flag.bmd", "start": 110004925, "end": 110009679}, {"filename": "/Data/NPC/receiptnpc_1.OZJ", "start": 110009679, "end": 110113649}, {"filename": "/Data/NPC/receiptnpc_2.OZT", "start": 110113649, "end": 110146465}, {"filename": "/Data/NPC/science.OZJ", "start": 110146465, "end": 110172351}, {"filename": "/Data/NPC/science02.OZT", "start": 110172351, "end": 110176495}, {"filename": "/Data/NPC/sebina.OZJ", "start": 110176495, "end": 110205507}, {"filename": "/Data/NPC/skin_barbarian_01.OZJ", "start": 110205507, "end": 110263797}, {"filename": "/Data/NPC/skin_special_01.OZJ", "start": 110263797, "end": 110337976}, {"filename": "/Data/NPC/smith.OZJ", "start": 110337976, "end": 110363923}, {"filename": "/Data/NPC/snow_girl.OZJ", "start": 110363923, "end": 110397516}, {"filename": "/Data/NPC/snow_girl02.OZT", "start": 110397516, "end": 110401660}, {"filename": "/Data/NPC/snows.OZJ", "start": 110401660, "end": 110427115}, {"filename": "/Data/NPC/tile_02.OZJ", "start": 110427115, "end": 110437487}, {"filename": "/Data/NPC/tile_03.OZJ", "start": 110437487, "end": 110447235}, {"filename": "/Data/NPC/towergate_r2.OZJ", "start": 110447235, "end": 110455498}, {"filename": "/Data/NPC/treasure_chest.OZJ", "start": 110455498, "end": 110485255}, {"filename": "/Data/NPC/twlight.OZJ", "start": 110485255, "end": 110528535}, {"filename": "/Data/NPC/twlight2.OZJ", "start": 110528535, "end": 110582163}, {"filename": "/Data/NPC/upper_02_m.OZJ", "start": 110582163, "end": 110604570}, {"filename": "/Data/NPC/upper_02b_m.OZT", "start": 110604570, "end": 110608714}, {"filename": "/Data/NPC/upper_12.OZJ", "start": 110608714, "end": 110634171}, {"filename": "/Data/NPC/w_merchant_a.OZJ", "start": 110634171, "end": 110665929}, {"filename": "/Data/NPC/w_merchant_b.OZJ", "start": 110665929, "end": 110696121}, {"filename": "/Data/NPC/warp01.bmd", "start": 110696121, "end": 110705051}, {"filename": "/Data/NPC/warp02.bmd", "start": 110705051, "end": 110713981}, {"filename": "/Data/NPC/warp03.bmd", "start": 110713981, "end": 110714375}, {"filename": "/Data/NPC/yellow_jewel.OZJ", "start": 110714375, "end": 110719316}, {"filename": "/Data/Object1/Beer01.bmd", "start": 110719316, "end": 110740382}, {"filename": "/Data/Object1/Beer02.bmd", "start": 110740382, "end": 110761695}, {"filename": "/Data/Object1/Beer03.bmd", "start": 110761695, "end": 110771445}, {"filename": "/Data/Object1/Bird01.bmd", "start": 110771445, "end": 110784687}, {"filename": "/Data/Object1/Bonfire01.bmd", "start": 110784687, "end": 110796192}, {"filename": "/Data/Object1/Bridge01.bmd", "start": 110796192, "end": 110813703}, {"filename": "/Data/Object1/BridgeStone01.bmd", "start": 110813703, "end": 110821478}, {"filename": "/Data/Object1/Butterfly.OZT", "start": 110821478, "end": 110825622}, {"filename": "/Data/Object1/Butterfly01.bmd", "start": 110825622, "end": 110829030}, {"filename": "/Data/Object1/Candle01.bmd", "start": 110829030, "end": 110841746}, {"filename": "/Data/Object1/Cannon01.bmd", "start": 110841746, "end": 110857596}, {"filename": "/Data/Object1/Cannon02.bmd", "start": 110857596, "end": 110871446}, {"filename": "/Data/Object1/Cannon03.bmd", "start": 110871446, "end": 110878392}, {"filename": "/Data/Object1/Carriage01.bmd", "start": 110878392, "end": 110911259}, {"filename": "/Data/Object1/Carriage02.bmd", "start": 110911259, "end": 110934876}, {"filename": "/Data/Object1/Carriage03.bmd", "start": 110934876, "end": 110966229}, {"filename": "/Data/Object1/Carriage04.bmd", "start": 110966229, "end": 111000865}, {"filename": "/Data/Object1/Curtain01.bmd", "start": 111000865, "end": 111012087}, {"filename": "/Data/Object1/DoungeonGate01.bmd", "start": 111012087, "end": 111042623}, {"filename": "/Data/Object1/Fence01.bmd", "start": 111042623, "end": 111046213}, {"filename": "/Data/Object1/Fence02.bmd", "start": 111046213, "end": 111047907}, {"filename": "/Data/Object1/Fence03.bmd", "start": 111047907, "end": 111049017}, {"filename": "/Data/Object1/Fence04.bmd", "start": 111049017, "end": 111050127}, {"filename": "/Data/Object1/FireLight01.bmd", "start": 111050127, "end": 111055337}, {"filename": "/Data/Object1/FireLight02.bmd", "start": 111055337, "end": 111059014}, {"filename": "/Data/Object1/Fish01.bmd", "start": 111059014, "end": 111071363}, {"filename": "/Data/Object1/Furniture01.bmd", "start": 111071363, "end": 111095978}, {"filename": "/Data/Object1/Furniture02.bmd", "start": 111095978, "end": 111134374}, {"filename": "/Data/Object1/Furniture03.bmd", "start": 111134374, "end": 111138332}, {"filename": "/Data/Object1/Furniture04.bmd", "start": 111138332, "end": 111142286}, {"filename": "/Data/Object1/Furniture05.bmd", "start": 111142286, "end": 111145484}, {"filename": "/Data/Object1/Furniture06.bmd", "start": 111145484, "end": 111150560}, {"filename": "/Data/Object1/Furniture07.bmd", "start": 111150560, "end": 111155038}, {"filename": "/Data/Object1/Grass01.bmd", "start": 111155038, "end": 111168252}, {"filename": "/Data/Object1/Grass02.bmd", "start": 111168252, "end": 111181466}, {"filename": "/Data/Object1/Grass03.bmd", "start": 111181466, "end": 111196127}, {"filename": "/Data/Object1/Grass04.bmd", "start": 111196127, "end": 111210788}, {"filename": "/Data/Object1/Grass05.bmd", "start": 111210788, "end": 111223507}, {"filename": "/Data/Object1/Grass06.bmd", "start": 111223507, "end": 111236226}, {"filename": "/Data/Object1/Grass07.bmd", "start": 111236226, "end": 111249802}, {"filename": "/Data/Object1/Grass08.bmd", "start": 111249802, "end": 111255742}, {"filename": "/Data/Object1/Hanging01.bmd", "start": 111255742, "end": 111272981}, {"filename": "/Data/Object1/House01.bmd", "start": 111272981, "end": 111288356}, {"filename": "/Data/Object1/House02.bmd", "start": 111288356, "end": 111303756}, {"filename": "/Data/Object1/House03.bmd", "start": 111303756, "end": 111328780}, {"filename": "/Data/Object1/House04.bmd", "start": 111328780, "end": 111372450}, {"filename": "/Data/Object1/House05.bmd", "start": 111372450, "end": 111406527}, {"filename": "/Data/Object1/HouseEtc01.bmd", "start": 111406527, "end": 111409911}, {"filename": "/Data/Object1/HouseEtc02.bmd", "start": 111409911, "end": 111431277}, {"filename": "/Data/Object1/HouseEtc03.bmd", "start": 111431277, "end": 111432981}, {"filename": "/Data/Object1/HouseWall01.bmd", "start": 111432981, "end": 111436671}, {"filename": "/Data/Object1/HouseWall02.bmd", "start": 111436671, "end": 111443623}, {"filename": "/Data/Object1/HouseWall03.bmd", "start": 111443623, "end": 111445501}, {"filename": "/Data/Object1/HouseWall04.bmd", "start": 111445501, "end": 111451307}, {"filename": "/Data/Object1/HouseWall05.bmd", "start": 111451307, "end": 111454379}, {"filename": "/Data/Object1/HouseWall06.bmd", "start": 111454379, "end": 111457207}, {"filename": "/Data/Object1/Light01.bmd", "start": 111457207, "end": 111458401}, {"filename": "/Data/Object1/Light02.bmd", "start": 111458401, "end": 111459595}, {"filename": "/Data/Object1/Light03.bmd", "start": 111459595, "end": 111460789}, {"filename": "/Data/Object1/MerchantAnimal01.bmd", "start": 111460789, "end": 111598074}, {"filename": "/Data/Object1/MerchantAnimal02.bmd", "start": 111598074, "end": 111669114}, {"filename": "/Data/Object1/PoseBox01.bmd", "start": 111669114, "end": 111669916}, {"filename": "/Data/Object1/Ship01.bmd", "start": 111669916, "end": 111757347}, {"filename": "/Data/Object1/Sign01.bmd", "start": 111757347, "end": 111762790}, {"filename": "/Data/Object1/Sign02.bmd", "start": 111762790, "end": 111765616}, {"filename": "/Data/Object1/Stair01.bmd", "start": 111765616, "end": 111772258}, {"filename": "/Data/Object1/SteelDoor01.bmd", "start": 111772258, "end": 111777866}, {"filename": "/Data/Object1/SteelStatue01.bmd", "start": 111777866, "end": 111784000}, {"filename": "/Data/Object1/SteelWall01.bmd", "start": 111784000, "end": 111789360}, {"filename": "/Data/Object1/SteelWall02.bmd", "start": 111789360, "end": 111795921}, {"filename": "/Data/Object1/SteelWall03.bmd", "start": 111795921, "end": 111797889}, {"filename": "/Data/Object1/Stone01.bmd", "start": 111797889, "end": 111814013}, {"filename": "/Data/Object1/Stone02.bmd", "start": 111814013, "end": 111830069}, {"filename": "/Data/Object1/Stone03.bmd", "start": 111830069, "end": 111837183}, {"filename": "/Data/Object1/Stone04.bmd", "start": 111837183, "end": 111841485}, {"filename": "/Data/Object1/Stone05.bmd", "start": 111841485, "end": 111852567}, {"filename": "/Data/Object1/StoneMuWall01.bmd", "start": 111852567, "end": 111880677}, {"filename": "/Data/Object1/StoneMuWall02.bmd", "start": 111880677, "end": 111886039}, {"filename": "/Data/Object1/StoneMuWall03.bmd", "start": 111886039, "end": 111891679}, {"filename": "/Data/Object1/StoneMuWall04.bmd", "start": 111891679, "end": 111917927}, {"filename": "/Data/Object1/StoneStatue01.bmd", "start": 111917927, "end": 111926449}, {"filename": "/Data/Object1/StoneStatue02.bmd", "start": 111926449, "end": 111936155}, {"filename": "/Data/Object1/StoneStatue03.bmd", "start": 111936155, "end": 111958683}, {"filename": "/Data/Object1/StoneWall01.bmd", "start": 111958683, "end": 111985827}, {"filename": "/Data/Object1/StoneWall02.bmd", "start": 111985827, "end": 112012971}, {"filename": "/Data/Object1/StoneWall03.bmd", "start": 112012971, "end": 112039310}, {"filename": "/Data/Object1/StoneWall04.bmd", "start": 112039310, "end": 112048175}, {"filename": "/Data/Object1/StoneWall05.bmd", "start": 112048175, "end": 112053906}, {"filename": "/Data/Object1/StoneWall06.bmd", "start": 112053906, "end": 112065276}, {"filename": "/Data/Object1/Straw01.bmd", "start": 112065276, "end": 112076340}, {"filename": "/Data/Object1/Straw02.bmd", "start": 112076340, "end": 112107539}, {"filename": "/Data/Object1/StreetLight01.bmd", "start": 112107539, "end": 112120063}, {"filename": "/Data/Object1/Tent01.bmd", "start": 112120063, "end": 112129512}, {"filename": "/Data/Object1/TileGround03.OZJ", "start": 112129512, "end": 112154846}, {"filename": "/Data/Object1/Tomb01.bmd", "start": 112154846, "end": 112159151}, {"filename": "/Data/Object1/Tomb02.bmd", "start": 112159151, "end": 112162953}, {"filename": "/Data/Object1/Tomb03.bmd", "start": 112162953, "end": 112165907}, {"filename": "/Data/Object1/TreasureChest01.bmd", "start": 112165907, "end": 112172966}, {"filename": "/Data/Object1/TreasureDrum01.bmd", "start": 112172966, "end": 112178560}, {"filename": "/Data/Object1/Tree01.bmd", "start": 112178560, "end": 112228651}, {"filename": "/Data/Object1/Tree02.bmd", "start": 112228651, "end": 112319284}, {"filename": "/Data/Object1/Tree03.bmd", "start": 112319284, "end": 112345114}, {"filename": "/Data/Object1/Tree04.bmd", "start": 112345114, "end": 112371304}, {"filename": "/Data/Object1/Tree05.bmd", "start": 112371304, "end": 112379622}, {"filename": "/Data/Object1/Tree06.bmd", "start": 112379622, "end": 112389060}, {"filename": "/Data/Object1/Tree07.bmd", "start": 112389060, "end": 112397796}, {"filename": "/Data/Object1/Tree08.bmd", "start": 112397796, "end": 112414254}, {"filename": "/Data/Object1/Tree09.bmd", "start": 112414254, "end": 112436700}, {"filename": "/Data/Object1/Tree10.bmd", "start": 112436700, "end": 112477681}, {"filename": "/Data/Object1/Tree11.bmd", "start": 112477681, "end": 112500960}, {"filename": "/Data/Object1/Tree12.bmd", "start": 112500960, "end": 112547160}, {"filename": "/Data/Object1/Tree13.bmd", "start": 112547160, "end": 112594179}, {"filename": "/Data/Object1/Tree_a.OZT", "start": 112594179, "end": 112659763}, {"filename": "/Data/Object1/Waterspout01.bmd", "start": 112659763, "end": 112722909}, {"filename": "/Data/Object1/Well01.bmd", "start": 112722909, "end": 112760579}, {"filename": "/Data/Object1/Well02.bmd", "start": 112760579, "end": 112772269}, {"filename": "/Data/Object1/Well03.bmd", "start": 112772269, "end": 112790516}, {"filename": "/Data/Object1/Well04.bmd", "start": 112790516, "end": 112825695}, {"filename": "/Data/Object1/angel_stone_statue.OZJ", "start": 112825695, "end": 112844931}, {"filename": "/Data/Object1/apple.OZJ", "start": 112844931, "end": 112850047}, {"filename": "/Data/Object1/badge_01.OZJ", "start": 112850047, "end": 112855682}, {"filename": "/Data/Object1/badge_02.OZT", "start": 112855682, "end": 112863922}, {"filename": "/Data/Object1/badge_03.OZT", "start": 112863922, "end": 112880354}, {"filename": "/Data/Object1/bird.OZT", "start": 112880354, "end": 112888594}, {"filename": "/Data/Object1/bookshelf.OZJ", "start": 112888594, "end": 112926980}, {"filename": "/Data/Object1/bottle.OZT", "start": 112926980, "end": 112931124}, {"filename": "/Data/Object1/bridge_01.OZJ", "start": 112931124, "end": 112977479}, {"filename": "/Data/Object1/bridge_shadow01.OZT", "start": 112977479, "end": 112977783}, {"filename": "/Data/Object1/c_wall04.OZJ", "start": 112977783, "end": 113005581}, {"filename": "/Data/Object1/c_wall05.OZJ", "start": 113005581, "end": 113038142}, {"filename": "/Data/Object1/c_wall06.OZJ", "start": 113038142, "end": 113071187}, {"filename": "/Data/Object1/candle.OZJ", "start": 113071187, "end": 113078815}, {"filename": "/Data/Object1/candle2.OZJ", "start": 113078815, "end": 113084228}, {"filename": "/Data/Object1/chair2.OZT", "start": 113084228, "end": 113088372}, {"filename": "/Data/Object1/copra_gate.OZJ", "start": 113088372, "end": 113109265}, {"filename": "/Data/Object1/desk_big.OZJ", "start": 113109265, "end": 113149293}, {"filename": "/Data/Object1/doorknob.OZT", "start": 113149293, "end": 113150365}, {"filename": "/Data/Object1/drum.OZJ", "start": 113150365, "end": 113175418}, {"filename": "/Data/Object1/fire_01.OZJ", "start": 113175418, "end": 113181631}, {"filename": "/Data/Object1/fire_02.OZJ", "start": 113181631, "end": 113187470}, {"filename": "/Data/Object1/fire_light_01.OZT", "start": 113187470, "end": 113189822}, {"filename": "/Data/Object1/fish.OZT", "start": 113189822, "end": 113198062}, {"filename": "/Data/Object1/grass_01.OZT", "start": 113198062, "end": 113206302}, {"filename": "/Data/Object1/grave_01.OZJ", "start": 113206302, "end": 113228621}, {"filename": "/Data/Object1/grave_02.OZJ", "start": 113228621, "end": 113257338}, {"filename": "/Data/Object1/horse_drawn_01.OZJ", "start": 113257338, "end": 113330394}, {"filename": "/Data/Object1/horse_drawn_02.OZT", "start": 113330394, "end": 113334538}, {"filename": "/Data/Object1/horse_drawn_03.OZJ", "start": 113334538, "end": 113343673}, {"filename": "/Data/Object1/jar_01.OZJ", "start": 113343673, "end": 113362725}, {"filename": "/Data/Object1/joint.OZJ", "start": 113362725, "end": 113369267}, {"filename": "/Data/Object1/light.OZT", "start": 113369267, "end": 113385699}, {"filename": "/Data/Object1/light2.OZJ", "start": 113385699, "end": 113391168}, {"filename": "/Data/Object1/light3.OZJ", "start": 113391168, "end": 113396746}, {"filename": "/Data/Object1/light_02.OZJ", "start": 113396746, "end": 113401756}, {"filename": "/Data/Object1/merchant_moster_a01.OZJ", "start": 113401756, "end": 113446041}, {"filename": "/Data/Object1/merchant_moster_a02.OZT", "start": 113446041, "end": 113462473}, {"filename": "/Data/Object1/merchant_moster_b01.OZJ", "start": 113462473, "end": 113489702}, {"filename": "/Data/Object1/mushroom.OZJ", "start": 113489702, "end": 113495964}, {"filename": "/Data/Object1/notice.OZJ", "start": 113495964, "end": 113507836}, {"filename": "/Data/Object1/plate.OZJ", "start": 113507836, "end": 113514232}, {"filename": "/Data/Object1/plate2.OZJ", "start": 113514232, "end": 113521029}, {"filename": "/Data/Object1/pot.OZJ", "start": 113521029, "end": 113528287}, {"filename": "/Data/Object1/pot2.OZJ", "start": 113528287, "end": 113535311}, {"filename": "/Data/Object1/pot3.OZT", "start": 113535311, "end": 113539455}, {"filename": "/Data/Object1/reagon_waterspout.OZJ", "start": 113539455, "end": 113558663}, {"filename": "/Data/Object1/ship01.OZJ", "start": 113558663, "end": 113591771}, {"filename": "/Data/Object1/ship03.OZJ", "start": 113591771, "end": 113601558}, {"filename": "/Data/Object1/ship04.OZJ", "start": 113601558, "end": 113617572}, {"filename": "/Data/Object1/ship05.OZJ", "start": 113617572, "end": 113623626}, {"filename": "/Data/Object1/ship05.OZT", "start": 113623626, "end": 113631866}, {"filename": "/Data/Object1/ship06.OZJ", "start": 113631866, "end": 113637153}, {"filename": "/Data/Object1/ship06.OZT", "start": 113637153, "end": 113637457}, {"filename": "/Data/Object1/ship07.OZJ", "start": 113637457, "end": 113677482}, {"filename": "/Data/Object1/ship07.OZT", "start": 113677482, "end": 113678554}, {"filename": "/Data/Object1/signboard.OZT", "start": 113678554, "end": 113686794}, {"filename": "/Data/Object1/steel.OZJ", "start": 113686794, "end": 113691899}, {"filename": "/Data/Object1/steel_barred_a.OZT", "start": 113691899, "end": 113724715}, {"filename": "/Data/Object1/steel_barred_b.OZJ", "start": 113724715, "end": 113731075}, {"filename": "/Data/Object1/steel_barred_door.OZT", "start": 113731075, "end": 113763891}, {"filename": "/Data/Object1/ston01.OZJ", "start": 113763891, "end": 113786218}, {"filename": "/Data/Object1/ston02.OZJ", "start": 113786218, "end": 113816843}, {"filename": "/Data/Object1/ston02.OZT", "start": 113816843, "end": 113820987}, {"filename": "/Data/Object1/ston03.OZJ", "start": 113820987, "end": 113825527}, {"filename": "/Data/Object1/stone_statue01.OZJ", "start": 113825527, "end": 113843441}, {"filename": "/Data/Object1/stone_statue02.OZJ", "start": 113843441, "end": 113863205}, {"filename": "/Data/Object1/streetlight.OZJ", "start": 113863205, "end": 113876965}, {"filename": "/Data/Object1/streetlight_brightness2.OZJ", "start": 113876965, "end": 113882838}, {"filename": "/Data/Object1/tile_01.OZJ", "start": 113882838, "end": 113892636}, {"filename": "/Data/Object1/tile_02.OZJ", "start": 113892636, "end": 113903008}, {"filename": "/Data/Object1/tile_03.OZJ", "start": 113903008, "end": 113912756}, {"filename": "/Data/Object1/tile_house01.OZJ", "start": 113912756, "end": 113950888}, {"filename": "/Data/Object1/tile_space01.OZJ", "start": 113950888, "end": 113956986}, {"filename": "/Data/Object1/tile_ston01.OZJ", "start": 113956986, "end": 113983813}, {"filename": "/Data/Object1/tile_ston04.OZJ", "start": 113983813, "end": 114009447}, {"filename": "/Data/Object1/tile_ston05.OZJ", "start": 114009447, "end": 114032937}, {"filename": "/Data/Object1/tile_ston06.OZJ", "start": 114032937, "end": 114069200}, {"filename": "/Data/Object1/tile_ston07.OZT", "start": 114069200, "end": 114134784}, {"filename": "/Data/Object1/tile_windows01.OZJ", "start": 114134784, "end": 114146852}, {"filename": "/Data/Object1/tile_wood01.OZJ", "start": 114146852, "end": 114180593}, {"filename": "/Data/Object1/tile_wood02.OZJ", "start": 114180593, "end": 114211447}, {"filename": "/Data/Object1/tile_wood03.OZJ", "start": 114211447, "end": 114233623}, {"filename": "/Data/Object1/tombstone.OZJ", "start": 114233623, "end": 114255804}, {"filename": "/Data/Object1/tombstone_big.OZJ", "start": 114255804, "end": 114281652}, {"filename": "/Data/Object1/treasure_chest.OZJ", "start": 114281652, "end": 114311409}, {"filename": "/Data/Object1/tree.OZJ", "start": 114311409, "end": 114326739}, {"filename": "/Data/Object1/tree_01.OZJ", "start": 114326739, "end": 114342640}, {"filename": "/Data/Object1/tree_01.OZT", "start": 114342640, "end": 114346784}, {"filename": "/Data/Object1/tree_02.OZJ", "start": 114346784, "end": 114367999}, {"filename": "/Data/Object1/tree_02.OZT", "start": 114367999, "end": 114372143}, {"filename": "/Data/Object1/tree_03.OZJ", "start": 114372143, "end": 114386852}, {"filename": "/Data/Object1/tree_04.OZJ", "start": 114386852, "end": 114392991}, {"filename": "/Data/Object1/tree_04.OZT", "start": 114392991, "end": 114409423}, {"filename": "/Data/Object1/tree_05.OZT", "start": 114409423, "end": 114425855}, {"filename": "/Data/Object1/tree_06.OZT", "start": 114425855, "end": 114491439}, {"filename": "/Data/Object1/tree_07.OZT", "start": 114491439, "end": 114495583}, {"filename": "/Data/Object1/tree_08.OZT", "start": 114495583, "end": 114499727}, {"filename": "/Data/Object1/tree_09.OZT", "start": 114499727, "end": 114507967}, {"filename": "/Data/Object1/tub.OZJ", "start": 114507967, "end": 114522746}, {"filename": "/Data/Object1/well.OZJ", "start": 114522746, "end": 114559019}, {"filename": "/Data/Object1/winecup.OZJ", "start": 114559019, "end": 114565367}, {"filename": "/Data/Object10/Javelins03.OZJ", "start": 114565367, "end": 114571288}, {"filename": "/Data/Object10/Object01.bmd", "start": 114571288, "end": 114595374}, {"filename": "/Data/Object10/Object02.bmd", "start": 114595374, "end": 114605484}, {"filename": "/Data/Object10/Object03.bmd", "start": 114605484, "end": 114664913}, {"filename": "/Data/Object10/Object04.bmd", "start": 114664913, "end": 114740883}, {"filename": "/Data/Object10/Object05.bmd", "start": 114740883, "end": 114742149}, {"filename": "/Data/Object10/Object06.bmd", "start": 114742149, "end": 114745173}, {"filename": "/Data/Object10/Object07.bmd", "start": 114745173, "end": 114746901}, {"filename": "/Data/Object10/bacc00.OZJ", "start": 114746901, "end": 114809093}, {"filename": "/Data/Object10/bacc01.OZJ", "start": 114809093, "end": 114832719}, {"filename": "/Data/Object10/boots_11.OZJ", "start": 114832719, "end": 114845863}, {"filename": "/Data/Object10/gloves_11.OZJ", "start": 114845863, "end": 114859831}, {"filename": "/Data/Object10/guard_hair.OZT", "start": 114859831, "end": 114863975}, {"filename": "/Data/Object10/head_11.OZJ", "start": 114863975, "end": 114875057}, {"filename": "/Data/Object10/hide.OZJ", "start": 114875057, "end": 114879597}, {"filename": "/Data/Object10/kni00.OZJ", "start": 114879597, "end": 114920440}, {"filename": "/Data/Object10/kni01.OZJ", "start": 114920440, "end": 114944258}, {"filename": "/Data/Object10/lower_11.OZJ", "start": 114944258, "end": 114979105}, {"filename": "/Data/Object10/shield06.OZJ", "start": 114979105, "end": 115003862}, {"filename": "/Data/Object10/upper_11.OZJ", "start": 115003862, "end": 115040769}, {"filename": "/Data/Object11/Object01.bmd", "start": 115040769, "end": 115041963}, {"filename": "/Data/Object11/Object02.bmd", "start": 115041963, "end": 115043157}, {"filename": "/Data/Object11/Object03.bmd", "start": 115043157, "end": 115044351}, {"filename": "/Data/Object11/Object04.bmd", "start": 115044351, "end": 115045545}, {"filename": "/Data/Object11/Object05.bmd", "start": 115045545, "end": 115046739}, {"filename": "/Data/Object11/Object06.bmd", "start": 115046739, "end": 115047933}, {"filename": "/Data/Object11/Object07.bmd", "start": 115047933, "end": 115049011}, {"filename": "/Data/Object11/Object08.bmd", "start": 115049011, "end": 115054007}, {"filename": "/Data/Object11/Object09.bmd", "start": 115054007, "end": 115059867}, {"filename": "/Data/Object11/Object10.bmd", "start": 115059867, "end": 115065727}, {"filename": "/Data/Object11/Object11.bmd", "start": 115065727, "end": 115082018}, {"filename": "/Data/Object11/Object13.bmd", "start": 115082018, "end": 115116652}, {"filename": "/Data/Object11/Object14.bmd", "start": 115116652, "end": 115126286}, {"filename": "/Data/Object11/Object15.bmd", "start": 115126286, "end": 115175613}, {"filename": "/Data/Object11/Object16.bmd", "start": 115175613, "end": 115176691}, {"filename": "/Data/Object11/cloud.OZJ", "start": 115176691, "end": 115185955}, {"filename": "/Data/Object11/cloud.bmd", "start": 115185955, "end": 115188769}, {"filename": "/Data/Object11/gyg_R.OZJ", "start": 115188769, "end": 115230505}, {"filename": "/Data/Object11/test12_H.OZJ", "start": 115230505, "end": 115232421}, {"filename": "/Data/Object11/top02_R.OZJ", "start": 115232421, "end": 115255428}, {"filename": "/Data/Object11/top03_B.OZJ", "start": 115255428, "end": 115266795}, {"filename": "/Data/Object11/top04_B.OZJ", "start": 115266795, "end": 115278800}, {"filename": "/Data/Object12/Crow01.bmd", "start": 115278800, "end": 115286378}, {"filename": "/Data/Object12/Gate01.bmd", "start": 115286378, "end": 115291904}, {"filename": "/Data/Object12/Gate02.bmd", "start": 115291904, "end": 115294898}, {"filename": "/Data/Object12/Object01.bmd", "start": 115294898, "end": 115300396}, {"filename": "/Data/Object12/Object02.bmd", "start": 115300396, "end": 115305462}, {"filename": "/Data/Object12/Object03.bmd", "start": 115305462, "end": 115310176}, {"filename": "/Data/Object12/Object04.bmd", "start": 115310176, "end": 115315242}, {"filename": "/Data/Object12/Object05.bmd", "start": 115315242, "end": 115320740}, {"filename": "/Data/Object12/Object06.bmd", "start": 115320740, "end": 115321130}, {"filename": "/Data/Object12/Object07.bmd", "start": 115321130, "end": 115321740}, {"filename": "/Data/Object12/Object08.bmd", "start": 115321740, "end": 115322672}, {"filename": "/Data/Object12/Object09.bmd", "start": 115322672, "end": 115357256}, {"filename": "/Data/Object12/Object10.bmd", "start": 115357256, "end": 115358446}, {"filename": "/Data/Object12/Object11.bmd", "start": 115358446, "end": 115430069}, {"filename": "/Data/Object12/Object12.bmd", "start": 115430069, "end": 115436904}, {"filename": "/Data/Object12/Object13.bmd", "start": 115436904, "end": 115438679}, {"filename": "/Data/Object12/Object14.bmd", "start": 115438679, "end": 115477553}, {"filename": "/Data/Object12/Object15.bmd", "start": 115477553, "end": 115491053}, {"filename": "/Data/Object12/Object16.bmd", "start": 115491053, "end": 115514009}, {"filename": "/Data/Object12/Object17.bmd", "start": 115514009, "end": 115641601}, {"filename": "/Data/Object12/Object18.bmd", "start": 115641601, "end": 115646707}, {"filename": "/Data/Object12/Object19.bmd", "start": 115646707, "end": 115648365}, {"filename": "/Data/Object12/Object20.bmd", "start": 115648365, "end": 115649539}, {"filename": "/Data/Object12/Object21.bmd", "start": 115649539, "end": 115652386}, {"filename": "/Data/Object12/Object22.bmd", "start": 115652386, "end": 115659528}, {"filename": "/Data/Object12/Object23.bmd", "start": 115659528, "end": 115662390}, {"filename": "/Data/Object12/Object24.bmd", "start": 115662390, "end": 115669334}, {"filename": "/Data/Object12/Object25.bmd", "start": 115669334, "end": 115670266}, {"filename": "/Data/Object12/Object26.bmd", "start": 115670266, "end": 115677363}, {"filename": "/Data/Object12/Object27.bmd", "start": 115677363, "end": 115711265}, {"filename": "/Data/Object12/Object28.bmd", "start": 115711265, "end": 115716667}, {"filename": "/Data/Object12/Object29.bmd", "start": 115716667, "end": 115801157}, {"filename": "/Data/Object12/Object30.bmd", "start": 115801157, "end": 115879201}, {"filename": "/Data/Object12/Object31.bmd", "start": 115879201, "end": 115943860}, {"filename": "/Data/Object12/Object32.bmd", "start": 115943860, "end": 116014156}, {"filename": "/Data/Object12/Object33.bmd", "start": 116014156, "end": 116015088}, {"filename": "/Data/Object12/Object34.bmd", "start": 116015088, "end": 116016962}, {"filename": "/Data/Object12/Object35.bmd", "start": 116016962, "end": 116017744}, {"filename": "/Data/Object12/Object36.bmd", "start": 116017744, "end": 116021362}, {"filename": "/Data/Object12/Object37.bmd", "start": 116021362, "end": 116029660}, {"filename": "/Data/Object12/Shine01.bmd", "start": 116029660, "end": 116030050}, {"filename": "/Data/Object12/StoneCoffin01.bmd", "start": 116030050, "end": 116033060}, {"filename": "/Data/Object12/StoneCoffin02.bmd", "start": 116033060, "end": 116034614}, {"filename": "/Data/Object12/bird.OZT", "start": 116034614, "end": 116051046}, {"filename": "/Data/Object12/br001.OZJ", "start": 116051046, "end": 116120698}, {"filename": "/Data/Object12/br002.OZT", "start": 116120698, "end": 116121002}, {"filename": "/Data/Object12/bro01.OZJ", "start": 116121002, "end": 116190552}, {"filename": "/Data/Object12/cs001.OZJ", "start": 116190552, "end": 116253697}, {"filename": "/Data/Object12/doorc01.OZJ", "start": 116253697, "end": 116296312}, {"filename": "/Data/Object12/hop01.OZJ", "start": 116296312, "end": 116369119}, {"filename": "/Data/Object12/ju01.OZJ", "start": 116369119, "end": 116448476}, {"filename": "/Data/Object12/ju01_R.OZJ", "start": 116448476, "end": 116462885}, {"filename": "/Data/Object12/king01.OZJ", "start": 116462885, "end": 116482993}, {"filename": "/Data/Object12/light01.OZJ", "start": 116482993, "end": 116488735}, {"filename": "/Data/Object12/light2_R.OZJ", "start": 116488735, "end": 116496579}, {"filename": "/Data/Object12/light_R.OZJ", "start": 116496579, "end": 116502769}, {"filename": "/Data/Object12/lnn01.OZT", "start": 116502769, "end": 116535585}, {"filename": "/Data/Object12/ng01.OZJ", "start": 116535585, "end": 116616237}, {"filename": "/Data/Object12/pan01_B.OZJ", "start": 116616237, "end": 116621651}, {"filename": "/Data/Object12/pan_B.OZJ", "start": 116621651, "end": 116627065}, {"filename": "/Data/Object12/pan_R.OZJ", "start": 116627065, "end": 116632552}, {"filename": "/Data/Object12/pant01.OZJ", "start": 116632552, "end": 116702653}, {"filename": "/Data/Object12/pant01_R.OZJ", "start": 116702653, "end": 116711379}, {"filename": "/Data/Object12/ses.OZJ", "start": 116711379, "end": 116716371}, {"filename": "/Data/Object12/st09.OZJ", "start": 116716371, "end": 116756173}, {"filename": "/Data/Object12/wcd.OZJ", "start": 116756173, "end": 116781744}, {"filename": "/Data/Object12/woodc01.OZJ", "start": 116781744, "end": 116811257}, {"filename": "/Data/Object2/Bat01.bmd", "start": 116811257, "end": 116816194}, {"filename": "/Data/Object2/DungeonStone01.bmd", "start": 116816194, "end": 116817204}, {"filename": "/Data/Object2/Object01.bmd", "start": 116817204, "end": 116822520}, {"filename": "/Data/Object2/Object02.bmd", "start": 116822520, "end": 116823574}, {"filename": "/Data/Object2/Object03.bmd", "start": 116823574, "end": 116836230}, {"filename": "/Data/Object2/Object04.bmd", "start": 116836230, "end": 116844894}, {"filename": "/Data/Object2/Object05.bmd", "start": 116844894, "end": 116850220}, {"filename": "/Data/Object2/Object06.bmd", "start": 116850220, "end": 116855654}, {"filename": "/Data/Object2/Object07.bmd", "start": 116855654, "end": 116862530}, {"filename": "/Data/Object2/Object08.bmd", "start": 116862530, "end": 116870778}, {"filename": "/Data/Object2/Object09.bmd", "start": 116870778, "end": 116878038}, {"filename": "/Data/Object2/Object10.bmd", "start": 116878038, "end": 116891342}, {"filename": "/Data/Object2/Object11.bmd", "start": 116891342, "end": 116903820}, {"filename": "/Data/Object2/Object12.bmd", "start": 116903820, "end": 116923951}, {"filename": "/Data/Object2/Object13.bmd", "start": 116923951, "end": 116929671}, {"filename": "/Data/Object2/Object14.bmd", "start": 116929671, "end": 116933523}, {"filename": "/Data/Object2/Object15.bmd", "start": 116933523, "end": 116934641}, {"filename": "/Data/Object2/Object16.bmd", "start": 116934641, "end": 116974245}, {"filename": "/Data/Object2/Object17.bmd", "start": 116974245, "end": 117013198}, {"filename": "/Data/Object2/Object18.bmd", "start": 117013198, "end": 117014252}, {"filename": "/Data/Object2/Object19.bmd", "start": 117014252, "end": 117076707}, {"filename": "/Data/Object2/Object20.bmd", "start": 117076707, "end": 117096637}, {"filename": "/Data/Object2/Object21.bmd", "start": 117096637, "end": 117100547}, {"filename": "/Data/Object2/Object22.bmd", "start": 117100547, "end": 117102693}, {"filename": "/Data/Object2/Object23.bmd", "start": 117102693, "end": 117123079}, {"filename": "/Data/Object2/Object24.bmd", "start": 117123079, "end": 117143465}, {"filename": "/Data/Object2/Object25.bmd", "start": 117143465, "end": 117167919}, {"filename": "/Data/Object2/Object26.bmd", "start": 117167919, "end": 117170827}, {"filename": "/Data/Object2/Object27.bmd", "start": 117170827, "end": 117173719}, {"filename": "/Data/Object2/Object28.bmd", "start": 117173719, "end": 117219471}, {"filename": "/Data/Object2/Object29.bmd", "start": 117219471, "end": 117226875}, {"filename": "/Data/Object2/Object30.bmd", "start": 117226875, "end": 117253627}, {"filename": "/Data/Object2/Object31.bmd", "start": 117253627, "end": 117258011}, {"filename": "/Data/Object2/Object32.bmd", "start": 117258011, "end": 117300601}, {"filename": "/Data/Object2/Object33.bmd", "start": 117300601, "end": 117343171}, {"filename": "/Data/Object2/Object34.bmd", "start": 117343171, "end": 117344413}, {"filename": "/Data/Object2/Object35.bmd", "start": 117344413, "end": 117351559}, {"filename": "/Data/Object2/Object36.bmd", "start": 117351559, "end": 117360834}, {"filename": "/Data/Object2/Object37.bmd", "start": 117360834, "end": 117369324}, {"filename": "/Data/Object2/Object38.bmd", "start": 117369324, "end": 117372556}, {"filename": "/Data/Object2/Object39.bmd", "start": 117372556, "end": 117391082}, {"filename": "/Data/Object2/Object40.bmd", "start": 117391082, "end": 117393368}, {"filename": "/Data/Object2/Object41.bmd", "start": 117393368, "end": 117397288}, {"filename": "/Data/Object2/Object42.bmd", "start": 117397288, "end": 117401764}, {"filename": "/Data/Object2/Object43.bmd", "start": 117401764, "end": 117408372}, {"filename": "/Data/Object2/Object44.bmd", "start": 117408372, "end": 117459619}, {"filename": "/Data/Object2/Object45.bmd", "start": 117459619, "end": 117502209}, {"filename": "/Data/Object2/Object46.bmd", "start": 117502209, "end": 117544799}, {"filename": "/Data/Object2/Object47.bmd", "start": 117544799, "end": 117584353}, {"filename": "/Data/Object2/Object48.bmd", "start": 117584353, "end": 117608971}, {"filename": "/Data/Object2/Object49.bmd", "start": 117608971, "end": 117644121}, {"filename": "/Data/Object2/Object50.bmd", "start": 117644121, "end": 117679271}, {"filename": "/Data/Object2/Object51.bmd", "start": 117679271, "end": 117684361}, {"filename": "/Data/Object2/Object52.bmd", "start": 117684361, "end": 117690339}, {"filename": "/Data/Object2/Object53.bmd", "start": 117690339, "end": 117690985}, {"filename": "/Data/Object2/Object54.bmd", "start": 117690985, "end": 117754357}, {"filename": "/Data/Object2/Object55.bmd", "start": 117754357, "end": 117769657}, {"filename": "/Data/Object2/Object56.bmd", "start": 117769657, "end": 117783893}, {"filename": "/Data/Object2/Object57.bmd", "start": 117783893, "end": 117785003}, {"filename": "/Data/Object2/Object58.bmd", "start": 117785003, "end": 117788393}, {"filename": "/Data/Object2/Object59.bmd", "start": 117788393, "end": 117789503}, {"filename": "/Data/Object2/Object60.bmd", "start": 117789503, "end": 117790613}, {"filename": "/Data/Object2/Rat01.bmd", "start": 117790613, "end": 117794862}, {"filename": "/Data/Object2/TileRock01.OZJ", "start": 117794862, "end": 117866817}, {"filename": "/Data/Object2/bat01.OZJ", "start": 117866817, "end": 117873798}, {"filename": "/Data/Object2/bat02.OZT", "start": 117873798, "end": 117882038}, {"filename": "/Data/Object2/bons.OZJ", "start": 117882038, "end": 117909837}, {"filename": "/Data/Object2/cobweb.OZJ", "start": 117909837, "end": 117930972}, {"filename": "/Data/Object2/cobweb.OZT", "start": 117930972, "end": 117996556}, {"filename": "/Data/Object2/deep_dragon.OZJ", "start": 117996556, "end": 118015114}, {"filename": "/Data/Object2/deep_wall01.OZJ", "start": 118015114, "end": 118051147}, {"filename": "/Data/Object2/deep_wall02.OZJ", "start": 118051147, "end": 118095741}, {"filename": "/Data/Object2/deep_wall03.OZJ", "start": 118095741, "end": 118119749}, {"filename": "/Data/Object2/deep_wall04.OZJ", "start": 118119749, "end": 118148533}, {"filename": "/Data/Object2/deep_wall05.OZJ", "start": 118148533, "end": 118180033}, {"filename": "/Data/Object2/deep_wall06.OZJ", "start": 118180033, "end": 118204606}, {"filename": "/Data/Object2/deep_wall07.OZJ", "start": 118204606, "end": 118235749}, {"filename": "/Data/Object2/deep_wall08.OZJ", "start": 118235749, "end": 118254294}, {"filename": "/Data/Object2/deep_wall09.OZJ", "start": 118254294, "end": 118282424}, {"filename": "/Data/Object2/deep_wall10.OZJ", "start": 118282424, "end": 118311198}, {"filename": "/Data/Object2/deep_wall11.OZJ", "start": 118311198, "end": 118324004}, {"filename": "/Data/Object2/deep_wall12.OZJ", "start": 118324004, "end": 118401666}, {"filename": "/Data/Object2/fire0a.OZJ", "start": 118401666, "end": 118407572}, {"filename": "/Data/Object2/flower_vase.OZJ", "start": 118407572, "end": 118416755}, {"filename": "/Data/Object2/logo01.OZT", "start": 118416755, "end": 118449571}, {"filename": "/Data/Object2/mouse.OZJ", "start": 118449571, "end": 118456557}, {"filename": "/Data/Object2/squid01.OZJ", "start": 118456557, "end": 118490457}, {"filename": "/Data/Object2/squid02.OZJ", "start": 118490457, "end": 118497171}, {"filename": "/Data/Object2/steel_01.OZT", "start": 118497171, "end": 118505411}, {"filename": "/Data/Object2/steel_02.OZT", "start": 118505411, "end": 118570995}, {"filename": "/Data/Object2/wire_netting01.OZJ", "start": 118570995, "end": 118581604}, {"filename": "/Data/Object2/wood01.OZJ", "start": 118581604, "end": 118646079}, {"filename": "/Data/Object3/Javelins03.OZJ", "start": 118646079, "end": 118652000}, {"filename": "/Data/Object3/Object01.bmd", "start": 118652000, "end": 118675337}, {"filename": "/Data/Object3/Object02.bmd", "start": 118675337, "end": 118679509}, {"filename": "/Data/Object3/Object03.bmd", "start": 118679509, "end": 118710127}, {"filename": "/Data/Object3/Object04.bmd", "start": 118710127, "end": 118715681}, {"filename": "/Data/Object3/Object05.bmd", "start": 118715681, "end": 118731107}, {"filename": "/Data/Object3/Object06.bmd", "start": 118731107, "end": 118733768}, {"filename": "/Data/Object3/Object07.bmd", "start": 118733768, "end": 118735633}, {"filename": "/Data/Object3/Object08.bmd", "start": 118735633, "end": 118738619}, {"filename": "/Data/Object3/Object09.bmd", "start": 118738619, "end": 118740533}, {"filename": "/Data/Object3/Object10.bmd", "start": 118740533, "end": 118745289}, {"filename": "/Data/Object3/Object100.bmd", "start": 118745289, "end": 118752769}, {"filename": "/Data/Object3/Object101.bmd", "start": 118752769, "end": 118753455}, {"filename": "/Data/Object3/Object102.bmd", "start": 118753455, "end": 118834611}, {"filename": "/Data/Object3/Object103.bmd", "start": 118834611, "end": 118841001}, {"filename": "/Data/Object3/Object104.bmd", "start": 118841001, "end": 118901982}, {"filename": "/Data/Object3/Object106.bmd", "start": 118901982, "end": 118906092}, {"filename": "/Data/Object3/Object107.bmd", "start": 118906092, "end": 118985556}, {"filename": "/Data/Object3/Object108.bmd", "start": 118985556, "end": 119015488}, {"filename": "/Data/Object3/Object109.bmd", "start": 119015488, "end": 119045420}, {"filename": "/Data/Object3/Object11.bmd", "start": 119045420, "end": 119050248}, {"filename": "/Data/Object3/Object110.bmd", "start": 119050248, "end": 119063044}, {"filename": "/Data/Object3/Object111.bmd", "start": 119063044, "end": 119092976}, {"filename": "/Data/Object3/Object112.bmd", "start": 119092976, "end": 119099285}, {"filename": "/Data/Object3/Object113.bmd", "start": 119099285, "end": 119107769}, {"filename": "/Data/Object3/Object12.bmd", "start": 119107769, "end": 119123195}, {"filename": "/Data/Object3/Object13.bmd", "start": 119123195, "end": 119137237}, {"filename": "/Data/Object3/Object14.bmd", "start": 119137237, "end": 119143415}, {"filename": "/Data/Object3/Object15.bmd", "start": 119143415, "end": 119148049}, {"filename": "/Data/Object3/Object16.bmd", "start": 119148049, "end": 119152033}, {"filename": "/Data/Object3/Object17.bmd", "start": 119152033, "end": 119158165}, {"filename": "/Data/Object3/Object18.bmd", "start": 119158165, "end": 119164925}, {"filename": "/Data/Object3/Object19.bmd", "start": 119164925, "end": 119172309}, {"filename": "/Data/Object3/Object20.bmd", "start": 119172309, "end": 119179025}, {"filename": "/Data/Object3/Object21.bmd", "start": 119179025, "end": 119197072}, {"filename": "/Data/Object3/Object22.bmd", "start": 119197072, "end": 119203534}, {"filename": "/Data/Object3/Object23.bmd", "start": 119203534, "end": 119211712}, {"filename": "/Data/Object3/Object24.bmd", "start": 119211712, "end": 119214910}, {"filename": "/Data/Object3/Object25.bmd", "start": 119214910, "end": 119214952}, {"filename": "/Data/Object3/Object26.bmd", "start": 119214952, "end": 119221582}, {"filename": "/Data/Object3/Object27.bmd", "start": 119221582, "end": 119221624}, {"filename": "/Data/Object3/Object28.bmd", "start": 119221624, "end": 119225370}, {"filename": "/Data/Object3/Object29.bmd", "start": 119225370, "end": 119231676}, {"filename": "/Data/Object3/Object30.bmd", "start": 119231676, "end": 119237270}, {"filename": "/Data/Object3/Object31.bmd", "start": 119237270, "end": 119242480}, {"filename": "/Data/Object3/Object32.bmd", "start": 119242480, "end": 119249810}, {"filename": "/Data/Object3/Object33.bmd", "start": 119249810, "end": 119249852}, {"filename": "/Data/Object3/Object34.bmd", "start": 119249852, "end": 119253958}, {"filename": "/Data/Object3/Object35.bmd", "start": 119253958, "end": 119260196}, {"filename": "/Data/Object3/Object36.bmd", "start": 119260196, "end": 119266254}, {"filename": "/Data/Object3/Object37.bmd", "start": 119266254, "end": 119274875}, {"filename": "/Data/Object3/Object38.bmd", "start": 119274875, "end": 119285529}, {"filename": "/Data/Object3/Object39.bmd", "start": 119285529, "end": 119296585}, {"filename": "/Data/Object3/Object40.bmd", "start": 119296585, "end": 119303068}, {"filename": "/Data/Object3/Object41.bmd", "start": 119303068, "end": 119308160}, {"filename": "/Data/Object3/Object42.bmd", "start": 119308160, "end": 119312118}, {"filename": "/Data/Object3/Object43.bmd", "start": 119312118, "end": 119314774}, {"filename": "/Data/Object3/Object44.bmd", "start": 119314774, "end": 119318184}, {"filename": "/Data/Object3/Object45.bmd", "start": 119318184, "end": 119321886}, {"filename": "/Data/Object3/Object46.bmd", "start": 119321886, "end": 119326348}, {"filename": "/Data/Object3/Object47.bmd", "start": 119326348, "end": 119330302}, {"filename": "/Data/Object3/Object48.bmd", "start": 119330302, "end": 119351368}, {"filename": "/Data/Object3/Object49.bmd", "start": 119351368, "end": 119372681}, {"filename": "/Data/Object3/Object50.bmd", "start": 119372681, "end": 119382431}, {"filename": "/Data/Object3/Object51.bmd", "start": 119382431, "end": 119422553}, {"filename": "/Data/Object3/Object52.bmd", "start": 119422553, "end": 119460949}, {"filename": "/Data/Object3/Object53.bmd", "start": 119460949, "end": 119485564}, {"filename": "/Data/Object3/Object54.bmd", "start": 119485564, "end": 119487753}, {"filename": "/Data/Object3/Object55.bmd", "start": 119487753, "end": 119500469}, {"filename": "/Data/Object3/Object56.bmd", "start": 119500469, "end": 119505561}, {"filename": "/Data/Object3/Object57.bmd", "start": 119505561, "end": 119518301}, {"filename": "/Data/Object3/Object58.bmd", "start": 119518301, "end": 119529296}, {"filename": "/Data/Object3/Object59.bmd", "start": 119529296, "end": 119534228}, {"filename": "/Data/Object3/Object60.bmd", "start": 119534228, "end": 119539160}, {"filename": "/Data/Object3/Object61.bmd", "start": 119539160, "end": 119544286}, {"filename": "/Data/Object3/Object62.bmd", "start": 119544286, "end": 119552272}, {"filename": "/Data/Object3/Object63.bmd", "start": 119552272, "end": 119559218}, {"filename": "/Data/Object3/Object64.bmd", "start": 119559218, "end": 119566708}, {"filename": "/Data/Object3/Object65.bmd", "start": 119566708, "end": 119573162}, {"filename": "/Data/Object3/Object66.bmd", "start": 119573162, "end": 119591209}, {"filename": "/Data/Object3/Object67.bmd", "start": 119591209, "end": 119602714}, {"filename": "/Data/Object3/Object68.bmd", "start": 119602714, "end": 119622827}, {"filename": "/Data/Object3/Object69.bmd", "start": 119622827, "end": 119631816}, {"filename": "/Data/Object3/Object70.bmd", "start": 119631816, "end": 119639669}, {"filename": "/Data/Object3/Object71.bmd", "start": 119639669, "end": 119646791}, {"filename": "/Data/Object3/Object72.bmd", "start": 119646791, "end": 119650679}, {"filename": "/Data/Object3/Object73.bmd", "start": 119650679, "end": 119680935}, {"filename": "/Data/Object3/Object74.bmd", "start": 119680935, "end": 119683537}, {"filename": "/Data/Object3/Object75.bmd", "start": 119683537, "end": 119709387}, {"filename": "/Data/Object3/Object76.bmd", "start": 119709387, "end": 119732704}, {"filename": "/Data/Object3/Object77.bmd", "start": 119732704, "end": 119738332}, {"filename": "/Data/Object3/Object78.bmd", "start": 119738332, "end": 119741920}, {"filename": "/Data/Object3/Object79.bmd", "start": 119741920, "end": 119748750}, {"filename": "/Data/Object3/Object80.bmd", "start": 119748750, "end": 119750708}, {"filename": "/Data/Object3/Object81.bmd", "start": 119750708, "end": 119757427}, {"filename": "/Data/Object3/Object82.bmd", "start": 119757427, "end": 119760635}, {"filename": "/Data/Object3/Object83.bmd", "start": 119760635, "end": 119763623}, {"filename": "/Data/Object3/Object84.bmd", "start": 119763623, "end": 119772852}, {"filename": "/Data/Object3/Object85.bmd", "start": 119772852, "end": 119781889}, {"filename": "/Data/Object3/Object86.bmd", "start": 119781889, "end": 119790926}, {"filename": "/Data/Object3/Object87.bmd", "start": 119790926, "end": 119800204}, {"filename": "/Data/Object3/Object88.bmd", "start": 119800204, "end": 119871772}, {"filename": "/Data/Object3/Object89.bmd", "start": 119871772, "end": 119889819}, {"filename": "/Data/Object3/Object90.bmd", "start": 119889819, "end": 119889861}, {"filename": "/Data/Object3/Object91.bmd", "start": 119889861, "end": 119898405}, {"filename": "/Data/Object3/Object92.bmd", "start": 119898405, "end": 119899091}, {"filename": "/Data/Object3/Object93.bmd", "start": 119899091, "end": 119920163}, {"filename": "/Data/Object3/Object94.bmd", "start": 119920163, "end": 119934432}, {"filename": "/Data/Object3/Object95.bmd", "start": 119934432, "end": 119941894}, {"filename": "/Data/Object3/Object96.bmd", "start": 119941894, "end": 119954241}, {"filename": "/Data/Object3/Object97.bmd", "start": 119954241, "end": 119957351}, {"filename": "/Data/Object3/Object98.bmd", "start": 119957351, "end": 119959351}, {"filename": "/Data/Object3/Object99.bmd", "start": 119959351, "end": 119966831}, {"filename": "/Data/Object3/apple.OZJ", "start": 119966831, "end": 119971947}, {"filename": "/Data/Object3/art.OZJ", "start": 119971947, "end": 119985502}, {"filename": "/Data/Object3/aurora.OZJ", "start": 119985502, "end": 119997862}, {"filename": "/Data/Object3/badge_01.OZT", "start": 119997862, "end": 120014294}, {"filename": "/Data/Object3/badge_02.OZT", "start": 120014294, "end": 120030726}, {"filename": "/Data/Object3/badge_03.OZT", "start": 120030726, "end": 120047158}, {"filename": "/Data/Object3/blockhead.OZJ", "start": 120047158, "end": 120054530}, {"filename": "/Data/Object3/books.OZJ", "start": 120054530, "end": 120061925}, {"filename": "/Data/Object3/bookshelf.OZJ", "start": 120061925, "end": 120093688}, {"filename": "/Data/Object3/boots_11.OZJ", "start": 120093688, "end": 120106832}, {"filename": "/Data/Object3/bottle.OZT", "start": 120106832, "end": 120110976}, {"filename": "/Data/Object3/bridge01.OZJ", "start": 120110976, "end": 120118720}, {"filename": "/Data/Object3/candle.OZJ", "start": 120118720, "end": 120126348}, {"filename": "/Data/Object3/candle2.OZJ", "start": 120126348, "end": 120131761}, {"filename": "/Data/Object3/chair.OZJ", "start": 120131761, "end": 120143351}, {"filename": "/Data/Object3/chair2.OZT", "start": 120143351, "end": 120147495}, {"filename": "/Data/Object3/deer.OZJ", "start": 120147495, "end": 120165751}, {"filename": "/Data/Object3/desk.OZJ", "start": 120165751, "end": 120193638}, {"filename": "/Data/Object3/desk_big.OZJ", "start": 120193638, "end": 120221822}, {"filename": "/Data/Object3/dog_g99.OZJ", "start": 120221822, "end": 120243310}, {"filename": "/Data/Object3/dog_g991.OZJ", "start": 120243310, "end": 120274071}, {"filename": "/Data/Object3/drum.OZJ", "start": 120274071, "end": 120298524}, {"filename": "/Data/Object3/drum2.OZJ", "start": 120298524, "end": 120318336}, {"filename": "/Data/Object3/drums.OZJ", "start": 120318336, "end": 120343359}, {"filename": "/Data/Object3/feather.OZT", "start": 120343359, "end": 120344431}, {"filename": "/Data/Object3/fire_01.OZJ", "start": 120344431, "end": 120354044}, {"filename": "/Data/Object3/fire_02.OZJ", "start": 120354044, "end": 120359885}, {"filename": "/Data/Object3/fireplace.OZT", "start": 120359885, "end": 120376317}, {"filename": "/Data/Object3/fireplace_down.OZT", "start": 120376317, "end": 120441901}, {"filename": "/Data/Object3/giftbox_blue.OZJ", "start": 120441901, "end": 120479725}, {"filename": "/Data/Object3/giftbox_green.OZJ", "start": 120479725, "end": 120520065}, {"filename": "/Data/Object3/giftbox_red.OZJ", "start": 120520065, "end": 120565130}, {"filename": "/Data/Object3/gloves_11.OZJ", "start": 120565130, "end": 120579098}, {"filename": "/Data/Object3/gold.OZJ", "start": 120579098, "end": 120589877}, {"filename": "/Data/Object3/guard_hair.OZT", "start": 120589877, "end": 120594021}, {"filename": "/Data/Object3/han_ax1.OZJ", "start": 120594021, "end": 120609062}, {"filename": "/Data/Object3/han_ax2.OZT", "start": 120609062, "end": 120641878}, {"filename": "/Data/Object3/han_ctreeax2.OZJ", "start": 120641878, "end": 120659294}, {"filename": "/Data/Object3/han_ctreeax4.OZT", "start": 120659294, "end": 120724878}, {"filename": "/Data/Object3/han_misle.OZT", "start": 120724878, "end": 120790462}, {"filename": "/Data/Object3/han_mistl2.OZJ", "start": 120790462, "end": 120814173}, {"filename": "/Data/Object3/han_xtree.OZT", "start": 120814173, "end": 121076365}, {"filename": "/Data/Object3/head_11.OZJ", "start": 121076365, "end": 121087447}, {"filename": "/Data/Object3/hide.OZJ", "start": 121087447, "end": 121091987}, {"filename": "/Data/Object3/house_stone_out.OZJ", "start": 121091987, "end": 121124190}, {"filename": "/Data/Object3/ice.OZJ", "start": 121124190, "end": 121153072}, {"filename": "/Data/Object3/ice01.OZJ", "start": 121153072, "end": 121168443}, {"filename": "/Data/Object3/ice_block01.OZJ", "start": 121168443, "end": 121250908}, {"filename": "/Data/Object3/ice_block07.OZJ", "start": 121250908, "end": 121328897}, {"filename": "/Data/Object3/leaf.OZT", "start": 121328897, "end": 121345329}, {"filename": "/Data/Object3/light.OZT", "start": 121345329, "end": 121361761}, {"filename": "/Data/Object3/light2.OZJ", "start": 121361761, "end": 121367230}, {"filename": "/Data/Object3/light3.OZJ", "start": 121367230, "end": 121372808}, {"filename": "/Data/Object3/light_02.OZJ", "start": 121372808, "end": 121377818}, {"filename": "/Data/Object3/lower_11.OZJ", "start": 121377818, "end": 121412665}, {"filename": "/Data/Object3/plate.OZJ", "start": 121412665, "end": 121421677}, {"filename": "/Data/Object3/plate2.OZJ", "start": 121421677, "end": 121433824}, {"filename": "/Data/Object3/pot.OZJ", "start": 121433824, "end": 121441082}, {"filename": "/Data/Object3/pot2.OZJ", "start": 121441082, "end": 121448106}, {"filename": "/Data/Object3/pot3.OZT", "start": 121448106, "end": 121452250}, {"filename": "/Data/Object3/sdoorknob.OZT", "start": 121452250, "end": 121453322}, {"filename": "/Data/Object3/shield02.OZJ", "start": 121453322, "end": 121467052}, {"filename": "/Data/Object3/shield03.OZJ", "start": 121467052, "end": 121478536}, {"filename": "/Data/Object3/show_ston01.OZJ", "start": 121478536, "end": 121500656}, {"filename": "/Data/Object3/sky.OZJ", "start": 121500656, "end": 121523293}, {"filename": "/Data/Object3/sky.OZT", "start": 121523293, "end": 121525389}, {"filename": "/Data/Object3/snotice.OZJ", "start": 121525389, "end": 121537523}, {"filename": "/Data/Object3/snotice02.OZJ", "start": 121537523, "end": 121549345}, {"filename": "/Data/Object3/snotice03.OZJ", "start": 121549345, "end": 121557229}, {"filename": "/Data/Object3/snow_ston.OZJ", "start": 121557229, "end": 121576307}, {"filename": "/Data/Object3/snowmachine2.OZJ", "start": 121576307, "end": 121610808}, {"filename": "/Data/Object3/ssignboard.OZT", "start": 121610808, "end": 121619048}, {"filename": "/Data/Object3/sston.OZJ", "start": 121619048, "end": 121643101}, {"filename": "/Data/Object3/sston2.OZJ", "start": 121643101, "end": 121647908}, {"filename": "/Data/Object3/stree.OZJ", "start": 121647908, "end": 121655430}, {"filename": "/Data/Object3/stree.OZT", "start": 121655430, "end": 121721014}, {"filename": "/Data/Object3/sword04.OZJ", "start": 121721014, "end": 121727592}, {"filename": "/Data/Object3/sword08.OZJ", "start": 121727592, "end": 121736974}, {"filename": "/Data/Object3/ti01.OZJ", "start": 121736974, "end": 121758349}, {"filename": "/Data/Object3/ti02.OZJ", "start": 121758349, "end": 121772673}, {"filename": "/Data/Object3/ti03.OZJ", "start": 121772673, "end": 121779358}, {"filename": "/Data/Object3/ti05.OZJ", "start": 121779358, "end": 121801179}, {"filename": "/Data/Object3/ti06.OZJ", "start": 121801179, "end": 121812626}, {"filename": "/Data/Object3/tile_02.OZJ", "start": 121812626, "end": 121822998}, {"filename": "/Data/Object3/tile_wood04.OZJ", "start": 121822998, "end": 121846292}, {"filename": "/Data/Object3/titel_a03.OZJ", "start": 121846292, "end": 121867115}, {"filename": "/Data/Object3/titel_a04.OZJ", "start": 121867115, "end": 121889758}, {"filename": "/Data/Object3/titel_a05.OZJ", "start": 121889758, "end": 121908731}, {"filename": "/Data/Object3/titel_a06.OZJ", "start": 121908731, "end": 121918555}, {"filename": "/Data/Object3/titel_b01.OZJ", "start": 121918555, "end": 121924455}, {"filename": "/Data/Object3/titel_b03.OZJ", "start": 121924455, "end": 121945246}, {"filename": "/Data/Object3/titel_b04.OZJ", "start": 121945246, "end": 121966475}, {"filename": "/Data/Object3/titel_b05.OZJ", "start": 121966475, "end": 121989588}, {"filename": "/Data/Object3/titel_b06.OZJ", "start": 121989588, "end": 122013332}, {"filename": "/Data/Object3/treasure_chest.OZJ", "start": 122013332, "end": 122025925}, {"filename": "/Data/Object3/tree_03.OZJ", "start": 122025925, "end": 122041569}, {"filename": "/Data/Object3/upper_11.OZJ", "start": 122041569, "end": 122078476}, {"filename": "/Data/Object3/wall_door01.OZJ", "start": 122078476, "end": 122099971}, {"filename": "/Data/Object3/wall_door02.OZJ", "start": 122099971, "end": 122109881}, {"filename": "/Data/Object3/wall_door03.OZJ", "start": 122109881, "end": 122132498}, {"filename": "/Data/Object3/winecup.OZJ", "start": 122132498, "end": 122138846}, {"filename": "/Data/Object4/Object01.bmd", "start": 122138846, "end": 122156086}, {"filename": "/Data/Object4/Object02.bmd", "start": 122156086, "end": 122168427}, {"filename": "/Data/Object4/Object03.bmd", "start": 122168427, "end": 122192193}, {"filename": "/Data/Object4/Object04.bmd", "start": 122192193, "end": 122206113}, {"filename": "/Data/Object4/Object05.bmd", "start": 122206113, "end": 122225265}, {"filename": "/Data/Object4/Object06.bmd", "start": 122225265, "end": 122238825}, {"filename": "/Data/Object4/Object07.bmd", "start": 122238825, "end": 122243169}, {"filename": "/Data/Object4/Object08.bmd", "start": 122243169, "end": 122247011}, {"filename": "/Data/Object4/Object09.bmd", "start": 122247011, "end": 122250193}, {"filename": "/Data/Object4/Object10.bmd", "start": 122250193, "end": 122264214}, {"filename": "/Data/Object4/Object11.bmd", "start": 122264214, "end": 122269258}, {"filename": "/Data/Object4/Object12.bmd", "start": 122269258, "end": 122281667}, {"filename": "/Data/Object4/Object13.bmd", "start": 122281667, "end": 122290247}, {"filename": "/Data/Object4/Object14.bmd", "start": 122290247, "end": 122298867}, {"filename": "/Data/Object4/Object15.bmd", "start": 122298867, "end": 122304759}, {"filename": "/Data/Object4/Object16.bmd", "start": 122304759, "end": 122312035}, {"filename": "/Data/Object4/Object17.bmd", "start": 122312035, "end": 122320615}, {"filename": "/Data/Object4/Object18.bmd", "start": 122320615, "end": 122460799}, {"filename": "/Data/Object4/Object19.bmd", "start": 122460799, "end": 122547158}, {"filename": "/Data/Object4/Object20.bmd", "start": 122547158, "end": 122557880}, {"filename": "/Data/Object4/Object21.bmd", "start": 122557880, "end": 122619530}, {"filename": "/Data/Object4/Object22.bmd", "start": 122619530, "end": 122624714}, {"filename": "/Data/Object4/Object23.bmd", "start": 122624714, "end": 122666827}, {"filename": "/Data/Object4/Object24.bmd", "start": 122666827, "end": 122709220}, {"filename": "/Data/Object4/Object25.bmd", "start": 122709220, "end": 122763870}, {"filename": "/Data/Object4/Object26.bmd", "start": 122763870, "end": 122838012}, {"filename": "/Data/Object4/Object27.bmd", "start": 122838012, "end": 122887431}, {"filename": "/Data/Object4/Object28.bmd", "start": 122887431, "end": 122916135}, {"filename": "/Data/Object4/Object29.bmd", "start": 122916135, "end": 122952805}, {"filename": "/Data/Object4/Object30.bmd", "start": 122952805, "end": 122972475}, {"filename": "/Data/Object4/Object31.bmd", "start": 122972475, "end": 123002303}, {"filename": "/Data/Object4/Object32.bmd", "start": 123002303, "end": 123009729}, {"filename": "/Data/Object4/Object33.bmd", "start": 123009729, "end": 123017163}, {"filename": "/Data/Object4/Object34.bmd", "start": 123017163, "end": 123019261}, {"filename": "/Data/Object4/Object35.bmd", "start": 123019261, "end": 123026566}, {"filename": "/Data/Object4/Object36.bmd", "start": 123026566, "end": 123037070}, {"filename": "/Data/Object4/Object37.bmd", "start": 123037070, "end": 123060185}, {"filename": "/Data/Object4/Object38.bmd", "start": 123060185, "end": 123061117}, {"filename": "/Data/Object4/Object39.bmd", "start": 123061117, "end": 123061803}, {"filename": "/Data/Object4/Object40.bmd", "start": 123061803, "end": 123192769}, {"filename": "/Data/Object4/Object41.bmd", "start": 123192769, "end": 123234781}, {"filename": "/Data/Object4/Object42.bmd", "start": 123234781, "end": 123251077}, {"filename": "/Data/Object4/Object43.bmd", "start": 123251077, "end": 123256037}, {"filename": "/Data/Object4/filling_up02.OZJ", "start": 123256037, "end": 123260828}, {"filename": "/Data/Object4/filling_up03.OZJ", "start": 123260828, "end": 123266911}, {"filename": "/Data/Object4/filling_up04.OZT", "start": 123266911, "end": 123271055}, {"filename": "/Data/Object4/filling_up05.OZT", "start": 123271055, "end": 123279295}, {"filename": "/Data/Object4/flower.OZT", "start": 123279295, "end": 123295727}, {"filename": "/Data/Object4/flower02.OZT", "start": 123295727, "end": 123312159}, {"filename": "/Data/Object4/flower03.OZT", "start": 123312159, "end": 123328591}, {"filename": "/Data/Object4/flower05.OZT", "start": 123328591, "end": 123332735}, {"filename": "/Data/Object4/flower10.OZJ", "start": 123332735, "end": 123338916}, {"filename": "/Data/Object4/flower2.OZJ", "start": 123338916, "end": 123368696}, {"filename": "/Data/Object4/flower3.OZJ", "start": 123368696, "end": 123376330}, {"filename": "/Data/Object4/flower4.OZJ", "start": 123376330, "end": 123385560}, {"filename": "/Data/Object4/flower5.OZJ", "start": 123385560, "end": 123394682}, {"filename": "/Data/Object4/flower6.OZJ", "start": 123394682, "end": 123418238}, {"filename": "/Data/Object4/flower7.OZJ", "start": 123418238, "end": 123448367}, {"filename": "/Data/Object4/flower9.OZJ", "start": 123448367, "end": 123482942}, {"filename": "/Data/Object4/htht01.OZJ", "start": 123482942, "end": 123550940}, {"filename": "/Data/Object4/itp01.OZT", "start": 123550940, "end": 123553036}, {"filename": "/Data/Object4/itp02.OZT", "start": 123553036, "end": 123555132}, {"filename": "/Data/Object4/light01.OZJ", "start": 123555132, "end": 123561069}, {"filename": "/Data/Object4/metal01.OZJ", "start": 123561069, "end": 123567370}, {"filename": "/Data/Object4/ob3.OZJ", "start": 123567370, "end": 123595482}, {"filename": "/Data/Object4/ston001.OZJ", "start": 123595482, "end": 123630335}, {"filename": "/Data/Object4/treea00.OZJ", "start": 123630335, "end": 123666698}, {"filename": "/Data/Object4/treea01.OZT", "start": 123666698, "end": 123674938}, {"filename": "/Data/Object4/treea02.OZJ", "start": 123674938, "end": 123691306}, {"filename": "/Data/Object4/treea03.OZJ", "start": 123691306, "end": 123734923}, {"filename": "/Data/Object4/u2u3.OZJ", "start": 123734923, "end": 123740036}, {"filename": "/Data/Object4/wd.OZJ", "start": 123740036, "end": 123751074}, {"filename": "/Data/Object4/wood001.OZJ", "start": 123751074, "end": 123785978}, {"filename": "/Data/Object4/wood002.OZJ", "start": 123785978, "end": 123821753}, {"filename": "/Data/Object4/wood01.OZJ", "start": 123821753, "end": 123839014}, {"filename": "/Data/Object4/wood02.OZJ", "start": 123839014, "end": 123844954}, {"filename": "/Data/Object4/wood03.OZJ", "start": 123844954, "end": 123862498}, {"filename": "/Data/Object4/yellow_jewel.OZJ", "start": 123862498, "end": 123867439}, {"filename": "/Data/Object5/Bug01.bmd", "start": 123867439, "end": 123882882}, {"filename": "/Data/Object5/Object01.bmd", "start": 123882882, "end": 123914496}, {"filename": "/Data/Object5/Object02.bmd", "start": 123914496, "end": 123933542}, {"filename": "/Data/Object5/Object03.bmd", "start": 123933542, "end": 123970360}, {"filename": "/Data/Object5/Object04.bmd", "start": 123970360, "end": 123984126}, {"filename": "/Data/Object5/Object05.bmd", "start": 123984126, "end": 123989362}, {"filename": "/Data/Object5/Object06.bmd", "start": 123989362, "end": 124002324}, {"filename": "/Data/Object5/Object07.bmd", "start": 124002324, "end": 124007994}, {"filename": "/Data/Object5/Object08.bmd", "start": 124007994, "end": 124016163}, {"filename": "/Data/Object5/Object09.bmd", "start": 124016163, "end": 124019716}, {"filename": "/Data/Object5/Object10.bmd", "start": 124019716, "end": 124021974}, {"filename": "/Data/Object5/Object11.bmd", "start": 124021974, "end": 124089193}, {"filename": "/Data/Object5/Object12.bmd", "start": 124089193, "end": 124160839}, {"filename": "/Data/Object5/Object13.bmd", "start": 124160839, "end": 124220714}, {"filename": "/Data/Object5/Object14.bmd", "start": 124220714, "end": 124226160}, {"filename": "/Data/Object5/Object15.bmd", "start": 124226160, "end": 124230490}, {"filename": "/Data/Object5/Object16.bmd", "start": 124230490, "end": 124235004}, {"filename": "/Data/Object5/Object17.bmd", "start": 124235004, "end": 124274558}, {"filename": "/Data/Object5/Object18.bmd", "start": 124274558, "end": 124299176}, {"filename": "/Data/Object5/Object19.bmd", "start": 124299176, "end": 124320286}, {"filename": "/Data/Object5/Object20.bmd", "start": 124320286, "end": 124361123}, {"filename": "/Data/Object5/Object21.bmd", "start": 124361123, "end": 124401960}, {"filename": "/Data/Object5/Object22.bmd", "start": 124401960, "end": 124408506}, {"filename": "/Data/Object5/Object23.bmd", "start": 124408506, "end": 124415052}, {"filename": "/Data/Object5/Object24.bmd", "start": 124415052, "end": 124425885}, {"filename": "/Data/Object5/Object25.bmd", "start": 124425885, "end": 124427079}, {"filename": "/Data/Object5/Object26.bmd", "start": 124427079, "end": 124427689}, {"filename": "/Data/Object5/Object27.bmd", "start": 124427689, "end": 124491819}, {"filename": "/Data/Object5/Object28.bmd", "start": 124491819, "end": 124626781}, {"filename": "/Data/Object5/Object29.bmd", "start": 124626781, "end": 124685263}, {"filename": "/Data/Object5/Object30.bmd", "start": 124685263, "end": 124766849}, {"filename": "/Data/Object5/Object31.bmd", "start": 124766849, "end": 124776371}, {"filename": "/Data/Object5/Object32.bmd", "start": 124776371, "end": 124785893}, {"filename": "/Data/Object5/Object33.bmd", "start": 124785893, "end": 124798903}, {"filename": "/Data/Object5/Object34.bmd", "start": 124798903, "end": 124808425}, {"filename": "/Data/Object5/Object35.bmd", "start": 124808425, "end": 124859200}, {"filename": "/Data/Object5/Object36.bmd", "start": 124859200, "end": 124909975}, {"filename": "/Data/Object5/Object37.bmd", "start": 124909975, "end": 124960750}, {"filename": "/Data/Object5/Object38.bmd", "start": 124960750, "end": 125011525}, {"filename": "/Data/Object5/Object39.bmd", "start": 125011525, "end": 125018719}, {"filename": "/Data/Object5/Object40.bmd", "start": 125018719, "end": 125019977}, {"filename": "/Data/Object5/bons.OZJ", "start": 125019977, "end": 125047776}, {"filename": "/Data/Object5/d_003.OZJ", "start": 125047776, "end": 125127187}, {"filename": "/Data/Object5/guard_gold2.OZJ", "start": 125127187, "end": 125196619}, {"filename": "/Data/Object5/light01.OZJ", "start": 125196619, "end": 125204199}, {"filename": "/Data/Object5/re02.OZT", "start": 125204199, "end": 125237015}, {"filename": "/Data/Object5/re_008.OZJ", "start": 125237015, "end": 125246200}, {"filename": "/Data/Object5/re_02.OZJ", "start": 125246200, "end": 125292346}, {"filename": "/Data/Object5/re_04.OZJ", "start": 125292346, "end": 125308811}, {"filename": "/Data/Object5/re_05.OZJ", "start": 125308811, "end": 125331824}, {"filename": "/Data/Object5/re_06_2.OZJ", "start": 125331824, "end": 125337790}, {"filename": "/Data/Object5/re_06_3.OZJ", "start": 125337790, "end": 125342582}, {"filename": "/Data/Object5/re_07.OZJ", "start": 125342582, "end": 125377732}, {"filename": "/Data/Object5/re_08.OZJ", "start": 125377732, "end": 125388051}, {"filename": "/Data/Object5/t17.OZJ", "start": 125388051, "end": 125397811}, {"filename": "/Data/Object5/t18.OZJ", "start": 125397811, "end": 125405358}, {"filename": "/Data/Object5/t19.OZJ", "start": 125405358, "end": 125411555}, {"filename": "/Data/Object5/t20.OZJ", "start": 125411555, "end": 125417935}, {"filename": "/Data/Object5/taa01.OZT", "start": 125417935, "end": 125483519}, {"filename": "/Data/Object5/taa02.OZT", "start": 125483519, "end": 125549103}, {"filename": "/Data/Object5/taa03.OZT", "start": 125549103, "end": 125553247}, {"filename": "/Data/Object5/worm.OZT", "start": 125553247, "end": 125557391}, {"filename": "/Data/Object6/Object04.bmd", "start": 125557391, "end": 125561797}, {"filename": "/Data/Object6/Object05.bmd", "start": 125561797, "end": 125572863}, {"filename": "/Data/Object6/Object07.bmd", "start": 125572863, "end": 125636235}, {"filename": "/Data/Object6/Object10.bmd", "start": 125636235, "end": 125641513}, {"filename": "/Data/Object6/Object17.bmd", "start": 125641513, "end": 125649203}, {"filename": "/Data/Object6/Object19.bmd", "start": 125649203, "end": 125669334}, {"filename": "/Data/Object6/Object20.bmd", "start": 125669334, "end": 125683308}, {"filename": "/Data/Object6/Object21.bmd", "start": 125683308, "end": 125717074}, {"filename": "/Data/Object6/Object25.bmd", "start": 125717074, "end": 125755552}, {"filename": "/Data/Object6/Object26.bmd", "start": 125755552, "end": 125768818}, {"filename": "/Data/Object6/Object28.bmd", "start": 125768818, "end": 125777956}, {"filename": "/Data/Object6/Object29.bmd", "start": 125777956, "end": 125786304}, {"filename": "/Data/Object6/Object30.bmd", "start": 125786304, "end": 125795442}, {"filename": "/Data/Object6/Object31.bmd", "start": 125795442, "end": 125882873}, {"filename": "/Data/Object6/Object32.bmd", "start": 125882873, "end": 125890299}, {"filename": "/Data/Object6/Object33.bmd", "start": 125890299, "end": 125897733}, {"filename": "/Data/Object6/Object34.bmd", "start": 125897733, "end": 125899831}, {"filename": "/Data/Object6/Object40.bmd", "start": 125899831, "end": 125994494}, {"filename": "/Data/Object6/Object41.bmd", "start": 125994494, "end": 126074483}, {"filename": "/Data/Object6/TileGround03.OZJ", "start": 126074483, "end": 126099817}, {"filename": "/Data/Object6/bfish07.OZJ", "start": 126099817, "end": 126170488}, {"filename": "/Data/Object6/bfish072.OZJ", "start": 126170488, "end": 126253449}, {"filename": "/Data/Object6/bfish073.OZJ", "start": 126253449, "end": 126330717}, {"filename": "/Data/Object6/hh.OZJ", "start": 126330717, "end": 126343326}, {"filename": "/Data/Object6/ship01.OZJ", "start": 126343326, "end": 126376434}, {"filename": "/Data/Object6/ship03.OZJ", "start": 126376434, "end": 126386221}, {"filename": "/Data/Object6/ship04.OZJ", "start": 126386221, "end": 126402235}, {"filename": "/Data/Object6/ship05.OZJ", "start": 126402235, "end": 126408289}, {"filename": "/Data/Object6/ship05.OZT", "start": 126408289, "end": 126416529}, {"filename": "/Data/Object6/ship06.OZJ", "start": 126416529, "end": 126421816}, {"filename": "/Data/Object6/ship06.OZT", "start": 126421816, "end": 126422120}, {"filename": "/Data/Object6/ship07.OZJ", "start": 126422120, "end": 126462145}, {"filename": "/Data/Object6/ship07.OZT", "start": 126462145, "end": 126463217}, {"filename": "/Data/Object6/sou01.OZJ", "start": 126463217, "end": 126477185}, {"filename": "/Data/Object6/sou02.OZJ", "start": 126477185, "end": 126488267}, {"filename": "/Data/Object6/squid01.OZJ", "start": 126488267, "end": 126522167}, {"filename": "/Data/Object6/squid02.OZJ", "start": 126522167, "end": 126528881}, {"filename": "/Data/Object6/star01.OZJ", "start": 126528881, "end": 126540775}, {"filename": "/Data/Object6/ston00.OZJ", "start": 126540775, "end": 126611280}, {"filename": "/Data/Object6/ston03.OZJ", "start": 126611280, "end": 126707945}, {"filename": "/Data/Object6/ston033.OZJ", "start": 126707945, "end": 126804610}, {"filename": "/Data/Object6/wood00.OZJ", "start": 126804610, "end": 126811889}, {"filename": "/Data/Object6/wood01.OZJ", "start": 126811889, "end": 126824284}, {"filename": "/Data/Object6/wood02.OZJ", "start": 126824284, "end": 126852456}, {"filename": "/Data/Object6/wood03.OZJ", "start": 126852456, "end": 126873949}, {"filename": "/Data/Object6/wood04.OZJ", "start": 126873949, "end": 126910934}, {"filename": "/Data/Object6/wood05.OZJ", "start": 126910934, "end": 127002193}, {"filename": "/Data/Object6/wood052.OZJ", "start": 127002193, "end": 127024117}, {"filename": "/Data/Object6/wooda.OZJ", "start": 127024117, "end": 127049471}, {"filename": "/Data/Object7/Bug01.bmd", "start": 127049471, "end": 127057672}, {"filename": "/Data/Object7/Object01.bmd", "start": 127057672, "end": 127126129}, {"filename": "/Data/Object7/Object02.bmd", "start": 127126129, "end": 127194586}, {"filename": "/Data/Object7/Object03.bmd", "start": 127194586, "end": 127223976}, {"filename": "/Data/Object7/Object04.bmd", "start": 127223976, "end": 127230289}, {"filename": "/Data/Object7/Object05.bmd", "start": 127230289, "end": 127259679}, {"filename": "/Data/Object7/Object06.bmd", "start": 127259679, "end": 127290764}, {"filename": "/Data/Object7/Object07.bmd", "start": 127290764, "end": 127321849}, {"filename": "/Data/Object7/Object08.bmd", "start": 127321849, "end": 127352934}, {"filename": "/Data/Object7/Object09.bmd", "start": 127352934, "end": 127360235}, {"filename": "/Data/Object7/Object10.bmd", "start": 127360235, "end": 127366250}, {"filename": "/Data/Object7/Object11.bmd", "start": 127366250, "end": 127368588}, {"filename": "/Data/Object7/Object12.bmd", "start": 127368588, "end": 127378061}, {"filename": "/Data/Object7/Object13.bmd", "start": 127378061, "end": 127400945}, {"filename": "/Data/Object7/Object14.bmd", "start": 127400945, "end": 127423829}, {"filename": "/Data/Object7/Object15.bmd", "start": 127423829, "end": 127432192}, {"filename": "/Data/Object7/Object16.bmd", "start": 127432192, "end": 127436986}, {"filename": "/Data/Object7/Object17.bmd", "start": 127436986, "end": 127453310}, {"filename": "/Data/Object7/Object18.bmd", "start": 127453310, "end": 127467469}, {"filename": "/Data/Object7/Object19.bmd", "start": 127467469, "end": 127493121}, {"filename": "/Data/Object7/Object20.bmd", "start": 127493121, "end": 127518733}, {"filename": "/Data/Object7/Object21.bmd", "start": 127518733, "end": 127521297}, {"filename": "/Data/Object7/Object22.bmd", "start": 127521297, "end": 127545554}, {"filename": "/Data/Object7/Object23.bmd", "start": 127545554, "end": 127550982}, {"filename": "/Data/Object7/Object24.bmd", "start": 127550982, "end": 127557886}, {"filename": "/Data/Object7/Object25.bmd", "start": 127557886, "end": 127628716}, {"filename": "/Data/Object7/Object26.bmd", "start": 127628716, "end": 127712019}, {"filename": "/Data/Object7/Object27.bmd", "start": 127712019, "end": 127720753}, {"filename": "/Data/Object7/Object28.bmd", "start": 127720753, "end": 127734954}, {"filename": "/Data/Object7/Object29.bmd", "start": 127734954, "end": 127749155}, {"filename": "/Data/Object7/Object30.bmd", "start": 127749155, "end": 127763356}, {"filename": "/Data/Object7/Object31.bmd", "start": 127763356, "end": 127777557}, {"filename": "/Data/Object7/Object32.bmd", "start": 127777557, "end": 127790771}, {"filename": "/Data/Object7/Object33.bmd", "start": 127790771, "end": 127803985}, {"filename": "/Data/Object7/Object34.bmd", "start": 127803985, "end": 127818646}, {"filename": "/Data/Object7/Object35.bmd", "start": 127818646, "end": 127833307}, {"filename": "/Data/Object7/Object36.bmd", "start": 127833307, "end": 127846026}, {"filename": "/Data/Object7/Object37.bmd", "start": 127846026, "end": 127858745}, {"filename": "/Data/Object7/Object38.bmd", "start": 127858745, "end": 127861571}, {"filename": "/Data/Object7/Object39.bmd", "start": 127861571, "end": 127862373}, {"filename": "/Data/Object7/Object40.bmd", "start": 127862373, "end": 127876875}, {"filename": "/Data/Object7/Object41.bmd", "start": 127876875, "end": 127891377}, {"filename": "/Data/Object7/au_01.OZJ", "start": 127891377, "end": 127956213}, {"filename": "/Data/Object7/au_02.OZJ", "start": 127956213, "end": 128020299}, {"filename": "/Data/Object7/au_02.OZT", "start": 128020299, "end": 128021371}, {"filename": "/Data/Object7/au_03.OZJ", "start": 128021371, "end": 128107856}, {"filename": "/Data/Object7/au_03.OZT", "start": 128107856, "end": 128109952}, {"filename": "/Data/Object7/au_04.OZJ", "start": 128109952, "end": 128212857}, {"filename": "/Data/Object7/au_04.OZT", "start": 128212857, "end": 128213417}, {"filename": "/Data/Object7/au_05.OZJ", "start": 128213417, "end": 128310732}, {"filename": "/Data/Object7/au_07.OZJ", "start": 128310732, "end": 128390924}, {"filename": "/Data/Object7/au_09.OZJ", "start": 128390924, "end": 128431713}, {"filename": "/Data/Object7/au_10.OZJ", "start": 128431713, "end": 128534657}, {"filename": "/Data/Object7/au_11.OZJ", "start": 128534657, "end": 128628644}, {"filename": "/Data/Object7/au_12.OZJ", "start": 128628644, "end": 128653605}, {"filename": "/Data/Object7/au_5.OZT", "start": 128653605, "end": 128657749}, {"filename": "/Data/Object7/au_6.OZT", "start": 128657749, "end": 128661893}, {"filename": "/Data/Object7/gggd01.OZT", "start": 128661893, "end": 128666037}, {"filename": "/Data/Object7/gggi01.OZJ", "start": 128666037, "end": 128682678}, {"filename": "/Data/Object7/gggi02.OZJ", "start": 128682678, "end": 128726242}, {"filename": "/Data/Object7/gggi04.OZJ", "start": 128726242, "end": 128766365}, {"filename": "/Data/Object7/gggi05.OZJ", "start": 128766365, "end": 128772303}, {"filename": "/Data/Object7/notice.OZJ", "start": 128772303, "end": 128784175}, {"filename": "/Data/Object7/tree_01.OZT", "start": 128784175, "end": 128788319}, {"filename": "/Data/Object7/tree_02.OZT", "start": 128788319, "end": 128792463}, {"filename": "/Data/Object7/tree_08.OZT", "start": 128792463, "end": 128796607}, {"filename": "/Data/Object7/tree_09.OZT", "start": 128796607, "end": 128804847}, {"filename": "/Data/Object7/water.OZJ", "start": 128804847, "end": 128835419}, {"filename": "/Data/Object8/Fish02.bmd", "start": 128835419, "end": 128839713}, {"filename": "/Data/Object8/Fish03.bmd", "start": 128839713, "end": 128844007}, {"filename": "/Data/Object8/Fish04.bmd", "start": 128844007, "end": 128848909}, {"filename": "/Data/Object8/Fish05.bmd", "start": 128848909, "end": 128853811}, {"filename": "/Data/Object8/Fish06.bmd", "start": 128853811, "end": 128861714}, {"filename": "/Data/Object8/Fish07.bmd", "start": 128861714, "end": 128869617}, {"filename": "/Data/Object8/Fish08.bmd", "start": 128869617, "end": 128887540}, {"filename": "/Data/Object8/Fish09.bmd", "start": 128887540, "end": 128906819}, {"filename": "/Data/Object8/Object01.bmd", "start": 128906819, "end": 129008541}, {"filename": "/Data/Object8/Object02.bmd", "start": 129008541, "end": 129043119}, {"filename": "/Data/Object8/Object03.bmd", "start": 129043119, "end": 129074661}, {"filename": "/Data/Object8/Object04.bmd", "start": 129074661, "end": 129079067}, {"filename": "/Data/Object8/Object05.bmd", "start": 129079067, "end": 129090133}, {"filename": "/Data/Object8/Object06.bmd", "start": 129090133, "end": 129093455}, {"filename": "/Data/Object8/Object07.bmd", "start": 129093455, "end": 129095741}, {"filename": "/Data/Object8/Object08.bmd", "start": 129095741, "end": 129175730}, {"filename": "/Data/Object8/Object09.bmd", "start": 129175730, "end": 129261816}, {"filename": "/Data/Object8/Object10.bmd", "start": 129261816, "end": 129356479}, {"filename": "/Data/Object8/Object11.bmd", "start": 129356479, "end": 129451289}, {"filename": "/Data/Object8/Object12.bmd", "start": 129451289, "end": 129489767}, {"filename": "/Data/Object8/Object13.bmd", "start": 129489767, "end": 129515349}, {"filename": "/Data/Object8/Object14.bmd", "start": 129515349, "end": 129528615}, {"filename": "/Data/Object8/Object15.bmd", "start": 129528615, "end": 129562381}, {"filename": "/Data/Object8/Object16.bmd", "start": 129562381, "end": 129576355}, {"filename": "/Data/Object8/Object17.bmd", "start": 129576355, "end": 129584045}, {"filename": "/Data/Object8/Object18.bmd", "start": 129584045, "end": 129590011}, {"filename": "/Data/Object8/Object19.bmd", "start": 129590011, "end": 129599077}, {"filename": "/Data/Object8/Object20.bmd", "start": 129599077, "end": 129604355}, {"filename": "/Data/Object8/Object21.bmd", "start": 129604355, "end": 129627861}, {"filename": "/Data/Object8/Object22.bmd", "start": 129627861, "end": 129628251}, {"filename": "/Data/Object8/Object23.bmd", "start": 129628251, "end": 129629445}, {"filename": "/Data/Object8/Object24.bmd", "start": 129629445, "end": 129630539}, {"filename": "/Data/Object8/Object25.bmd", "start": 129630539, "end": 129655526}, {"filename": "/Data/Object8/Object26.bmd", "start": 129655526, "end": 129730153}, {"filename": "/Data/Object8/Object27.bmd", "start": 129730153, "end": 129737955}, {"filename": "/Data/Object8/Object28.bmd", "start": 129737955, "end": 129844913}, {"filename": "/Data/Object8/Object29.bmd", "start": 129844913, "end": 129958965}, {"filename": "/Data/Object8/Object30.bmd", "start": 129958965, "end": 129968103}, {"filename": "/Data/Object8/Object31.bmd", "start": 129968103, "end": 129977241}, {"filename": "/Data/Object8/Object32.bmd", "start": 129977241, "end": 129980607}, {"filename": "/Data/Object8/Object33.bmd", "start": 129980607, "end": 129988955}, {"filename": "/Data/Object8/Object34.bmd", "start": 129988955, "end": 129992561}, {"filename": "/Data/Object8/Object35.bmd", "start": 129992561, "end": 130138845}, {"filename": "/Data/Object8/Object36.bmd", "start": 130138845, "end": 130163463}, {"filename": "/Data/Object8/Object37.bmd", "start": 130163463, "end": 130183121}, {"filename": "/Data/Object8/Object38.bmd", "start": 130183121, "end": 130238927}, {"filename": "/Data/Object8/Object39.bmd", "start": 130238927, "end": 130239859}, {"filename": "/Data/Object8/Object40.bmd", "start": 130239859, "end": 130240661}, {"filename": "/Data/Object8/Object41.bmd", "start": 130240661, "end": 130242114}, {"filename": "/Data/Object8/bfish01.OZJ", "start": 130242114, "end": 130254007}, {"filename": "/Data/Object8/bfish02.OZJ", "start": 130254007, "end": 130265748}, {"filename": "/Data/Object8/bfish04.OZJ", "start": 130265748, "end": 130277984}, {"filename": "/Data/Object8/bfish05.OZJ", "start": 130277984, "end": 130290876}, {"filename": "/Data/Object8/bfish06.OZJ", "start": 130290876, "end": 130299577}, {"filename": "/Data/Object8/bfish07.OZJ", "start": 130299577, "end": 130370248}, {"filename": "/Data/Object8/bfish072.OZJ", "start": 130370248, "end": 130453209}, {"filename": "/Data/Object8/bfish073.OZJ", "start": 130453209, "end": 130530477}, {"filename": "/Data/Object8/bfish08.OZJ", "start": 130530477, "end": 130551576}, {"filename": "/Data/Object8/bfish09.OZJ", "start": 130551576, "end": 130571983}, {"filename": "/Data/Object8/bfish10.OZJ", "start": 130571983, "end": 130580192}, {"filename": "/Data/Object8/bons.OZJ", "start": 130580192, "end": 130607991}, {"filename": "/Data/Object8/bu0.OZT", "start": 130607991, "end": 130673575}, {"filename": "/Data/Object8/bu01.OZT", "start": 130673575, "end": 130690007}, {"filename": "/Data/Object8/bu02.OZT", "start": 130690007, "end": 130755591}, {"filename": "/Data/Object8/bu03.OZT", "start": 130755591, "end": 130772023}, {"filename": "/Data/Object8/bu04.OZT", "start": 130772023, "end": 130776167}, {"filename": "/Data/Object8/drop01.OZJ", "start": 130776167, "end": 130783446}, {"filename": "/Data/Object8/ioi01.OZJ", "start": 130783446, "end": 130818575}, {"filename": "/Data/Object8/light01.OZJ", "start": 130818575, "end": 130824512}, {"filename": "/Data/Object8/sea01.OZJ", "start": 130824512, "end": 130895671}, {"filename": "/Data/Object8/star01.OZJ", "start": 130895671, "end": 130907565}, {"filename": "/Data/Object8/ston00.OZJ", "start": 130907565, "end": 130978070}, {"filename": "/Data/Object8/ston033.OZJ", "start": 130978070, "end": 131074735}, {"filename": "/Data/Object8/wood00.OZJ", "start": 131074735, "end": 131082014}, {"filename": "/Data/Object8/wood01.OZJ", "start": 131082014, "end": 131094409}, {"filename": "/Data/Object8/wood02.OZJ", "start": 131094409, "end": 131122581}, {"filename": "/Data/Object8/wood03.OZJ", "start": 131122581, "end": 131144074}, {"filename": "/Data/Object8/wood04.OZJ", "start": 131144074, "end": 131181059}, {"filename": "/Data/Object8/wood05.OZJ", "start": 131181059, "end": 131272318}, {"filename": "/Data/Object8/wood052.OZJ", "start": 131272318, "end": 131294242}, {"filename": "/Data/Object8/wooda.OZJ", "start": 131294242, "end": 131319596}, {"filename": "/Data/Object8/wt00.OZJ", "start": 131319596, "end": 131327216}, {"filename": "/Data/Object8/wt01.OZJ", "start": 131327216, "end": 131335287}, {"filename": "/Data/Object8/wt02.OZJ", "start": 131335287, "end": 131343385}, {"filename": "/Data/Object8/wt03.OZJ", "start": 131343385, "end": 131351538}, {"filename": "/Data/Object8/wt04.OZJ", "start": 131351538, "end": 131359651}, {"filename": "/Data/Object8/wt05.OZJ", "start": 131359651, "end": 131367730}, {"filename": "/Data/Object8/wt06.OZJ", "start": 131367730, "end": 131375824}, {"filename": "/Data/Object8/wt07.OZJ", "start": 131375824, "end": 131383941}, {"filename": "/Data/Object8/wt08.OZJ", "start": 131383941, "end": 131392064}, {"filename": "/Data/Object8/wt09.OZJ", "start": 131392064, "end": 131400198}, {"filename": "/Data/Object8/wt10.OZJ", "start": 131400198, "end": 131408301}, {"filename": "/Data/Object8/wt11.OZJ", "start": 131408301, "end": 131416362}, {"filename": "/Data/Object8/wt12.OZJ", "start": 131416362, "end": 131424455}, {"filename": "/Data/Object8/wt13.OZJ", "start": 131424455, "end": 131432483}, {"filename": "/Data/Object8/wt14.OZJ", "start": 131432483, "end": 131440545}, {"filename": "/Data/Object8/wt15.OZJ", "start": 131440545, "end": 131448589}, {"filename": "/Data/Object8/wt16.OZJ", "start": 131448589, "end": 131456633}, {"filename": "/Data/Object8/wt17.OZJ", "start": 131456633, "end": 131464656}, {"filename": "/Data/Object8/wt18.OZJ", "start": 131464656, "end": 131472711}, {"filename": "/Data/Object8/wt19.OZJ", "start": 131472711, "end": 131480755}, {"filename": "/Data/Object8/wt20.OZJ", "start": 131480755, "end": 131488792}, {"filename": "/Data/Object8/wt21.OZJ", "start": 131488792, "end": 131496870}, {"filename": "/Data/Object8/wt22.OZJ", "start": 131496870, "end": 131504929}, {"filename": "/Data/Object8/wt23.OZJ", "start": 131504929, "end": 131512956}, {"filename": "/Data/Object8/wt24.OZJ", "start": 131512956, "end": 131520978}, {"filename": "/Data/Object8/wt25.OZJ", "start": 131520978, "end": 131529000}, {"filename": "/Data/Object8/wt26.OZJ", "start": 131529000, "end": 131537046}, {"filename": "/Data/Object8/wt27.OZJ", "start": 131537046, "end": 131545098}, {"filename": "/Data/Object8/wt28.OZJ", "start": 131545098, "end": 131553133}, {"filename": "/Data/Object8/wt29.OZJ", "start": 131553133, "end": 131561181}, {"filename": "/Data/Object8/wt30.OZJ", "start": 131561181, "end": 131569252}, {"filename": "/Data/Object8/wt31.OZJ", "start": 131569252, "end": 131577339}, {"filename": "/Data/Object9/Bug02.bmd", "start": 131577339, "end": 131580152}, {"filename": "/Data/Object9/DDD.OZJ", "start": 131580152, "end": 131584161}, {"filename": "/Data/Object9/Df.OZT", "start": 131584161, "end": 131616977}, {"filename": "/Data/Object9/Dr.OZT", "start": 131616977, "end": 131621121}, {"filename": "/Data/Object9/Impack03.OZJ", "start": 131621121, "end": 131632411}, {"filename": "/Data/Object9/Object02.bmd", "start": 131632411, "end": 131675897}, {"filename": "/Data/Object9/Object03.bmd", "start": 131675897, "end": 131683451}, {"filename": "/Data/Object9/Object06.bmd", "start": 131683451, "end": 131726917}, {"filename": "/Data/Object9/Object07.bmd", "start": 131726917, "end": 131730601}, {"filename": "/Data/Object9/Object08.bmd", "start": 131730601, "end": 131730991}, {"filename": "/Data/Object9/Object09.bmd", "start": 131730991, "end": 131736395}, {"filename": "/Data/Object9/Object10.bmd", "start": 131736395, "end": 131758377}, {"filename": "/Data/Object9/Object11.bmd", "start": 131758377, "end": 131768635}, {"filename": "/Data/Object9/Object12.bmd", "start": 131768635, "end": 131778837}, {"filename": "/Data/Object9/Object13.bmd", "start": 131778837, "end": 131786753}, {"filename": "/Data/Object9/Object14.bmd", "start": 131786753, "end": 131796955}, {"filename": "/Data/Object9/Object15.bmd", "start": 131796955, "end": 131812371}, {"filename": "/Data/Object9/Object16.bmd", "start": 131812371, "end": 131825585}, {"filename": "/Data/Object9/Object17.bmd", "start": 131825585, "end": 131838799}, {"filename": "/Data/Object9/Object18.bmd", "start": 131838799, "end": 131853460}, {"filename": "/Data/Object9/Object19.bmd", "start": 131853460, "end": 131868121}, {"filename": "/Data/Object9/Object20.bmd", "start": 131868121, "end": 131880840}, {"filename": "/Data/Object9/Object21.bmd", "start": 131880840, "end": 131891378}, {"filename": "/Data/Object9/Object22.bmd", "start": 131891378, "end": 131903008}, {"filename": "/Data/Object9/Object23.bmd", "start": 131903008, "end": 131908242}, {"filename": "/Data/Object9/Object24.bmd", "start": 131908242, "end": 131912852}, {"filename": "/Data/Object9/Object25.bmd", "start": 131912852, "end": 131926362}, {"filename": "/Data/Object9/Object26.bmd", "start": 131926362, "end": 131936096}, {"filename": "/Data/Object9/Object27.bmd", "start": 131936096, "end": 131940118}, {"filename": "/Data/Object9/Object28.bmd", "start": 131940118, "end": 131944680}, {"filename": "/Data/Object9/Object29.bmd", "start": 131944680, "end": 131948646}, {"filename": "/Data/Object9/Object30.bmd", "start": 131948646, "end": 132001072}, {"filename": "/Data/Object9/Object31.bmd", "start": 132001072, "end": 132004655}, {"filename": "/Data/Object9/Object32.bmd", "start": 132004655, "end": 132021893}, {"filename": "/Data/Object9/Object33.bmd", "start": 132021893, "end": 132039131}, {"filename": "/Data/Object9/Object34.bmd", "start": 132039131, "end": 132075367}, {"filename": "/Data/Object9/Object37.bmd", "start": 132075367, "end": 132096605}, {"filename": "/Data/Object9/Object38.bmd", "start": 132096605, "end": 132106971}, {"filename": "/Data/Object9/Object40.bmd", "start": 132106971, "end": 132111285}, {"filename": "/Data/Object9/Object41.bmd", "start": 132111285, "end": 132123195}, {"filename": "/Data/Object9/Object42.bmd", "start": 132123195, "end": 132129685}, {"filename": "/Data/Object9/Object43.bmd", "start": 132129685, "end": 132137747}, {"filename": "/Data/Object9/Object44.bmd", "start": 132137747, "end": 132142913}, {"filename": "/Data/Object9/Object45.bmd", "start": 132142913, "end": 132156915}, {"filename": "/Data/Object9/Object46.bmd", "start": 132156915, "end": 132164745}, {"filename": "/Data/Object9/Object47.bmd", "start": 132164745, "end": 132180511}, {"filename": "/Data/Object9/Object48.bmd", "start": 132180511, "end": 132188373}, {"filename": "/Data/Object9/Object49.bmd", "start": 132188373, "end": 132231663}, {"filename": "/Data/Object9/Object50.bmd", "start": 132231663, "end": 132262693}, {"filename": "/Data/Object9/Object51.bmd", "start": 132262693, "end": 132384552}, {"filename": "/Data/Object9/Object52.bmd", "start": 132384552, "end": 132404366}, {"filename": "/Data/Object9/Object53.bmd", "start": 132404366, "end": 132411604}, {"filename": "/Data/Object9/Object54.bmd", "start": 132411604, "end": 132413054}, {"filename": "/Data/Object9/Object55.bmd", "start": 132413054, "end": 132428466}, {"filename": "/Data/Object9/Object56.bmd", "start": 132428466, "end": 132432696}, {"filename": "/Data/Object9/Object57.bmd", "start": 132432696, "end": 132443950}, {"filename": "/Data/Object9/Object58.bmd", "start": 132443950, "end": 132623442}, {"filename": "/Data/Object9/Object59.bmd", "start": 132623442, "end": 132629940}, {"filename": "/Data/Object9/Object60.bmd", "start": 132629940, "end": 132638055}, {"filename": "/Data/Object9/Object61.bmd", "start": 132638055, "end": 132639249}, {"filename": "/Data/Object9/Object62.bmd", "start": 132639249, "end": 132651525}, {"filename": "/Data/Object9/Object63.bmd", "start": 132651525, "end": 132661963}, {"filename": "/Data/Object9/Object64.bmd", "start": 132661963, "end": 132663275}, {"filename": "/Data/Object9/Object66.bmd", "start": 132663275, "end": 132677057}, {"filename": "/Data/Object9/Object67.bmd", "start": 132677057, "end": 132690839}, {"filename": "/Data/Object9/Object68.bmd", "start": 132690839, "end": 132704621}, {"filename": "/Data/Object9/Object69.bmd", "start": 132704621, "end": 132772475}, {"filename": "/Data/Object9/Object70.bmd", "start": 132772475, "end": 132836161}, {"filename": "/Data/Object9/Object71.bmd", "start": 132836161, "end": 132837355}, {"filename": "/Data/Object9/Object72.bmd", "start": 132837355, "end": 132928073}, {"filename": "/Data/Object9/Object73.bmd", "start": 132928073, "end": 132938275}, {"filename": "/Data/Object9/Object74.bmd", "start": 132938275, "end": 132948477}, {"filename": "/Data/Object9/Object75.bmd", "start": 132948477, "end": 133016331}, {"filename": "/Data/Object9/Object76.bmd", "start": 133016331, "end": 133026533}, {"filename": "/Data/Object9/Object77.bmd", "start": 133026533, "end": 133027727}, {"filename": "/Data/Object9/Object78.bmd", "start": 133027727, "end": 133028921}, {"filename": "/Data/Object9/Object79.bmd", "start": 133028921, "end": 133050159}, {"filename": "/Data/Object9/Object80.bmd", "start": 133050159, "end": 133060361}, {"filename": "/Data/Object9/Object81.bmd", "start": 133060361, "end": 133065027}, {"filename": "/Data/Object9/Object82.bmd", "start": 133065027, "end": 133067761}, {"filename": "/Data/Object9/Object83.bmd", "start": 133067761, "end": 133068693}, {"filename": "/Data/Object9/Object84.bmd", "start": 133068693, "end": 133069887}, {"filename": "/Data/Object9/R.OZJ", "start": 133069887, "end": 133072478}, {"filename": "/Data/Object9/arrow.OZT", "start": 133072478, "end": 133072782}, {"filename": "/Data/Object9/bug.OZJ", "start": 133072782, "end": 133074873}, {"filename": "/Data/Object9/casket.OZJ", "start": 133074873, "end": 133088156}, {"filename": "/Data/Object9/cl.OZT", "start": 133088156, "end": 133092300}, {"filename": "/Data/Object9/col.OZJ", "start": 133092300, "end": 133130415}, {"filename": "/Data/Object9/col2.OZJ", "start": 133130415, "end": 133138061}, {"filename": "/Data/Object9/face.OZJ", "start": 133138061, "end": 133205951}, {"filename": "/Data/Object9/face2.OZJ", "start": 133205951, "end": 133264753}, {"filename": "/Data/Object9/finger.OZJ", "start": 133264753, "end": 133275435}, {"filename": "/Data/Object9/finger1.OZJ", "start": 133275435, "end": 133286090}, {"filename": "/Data/Object9/flag.OZJ", "start": 133286090, "end": 133291191}, {"filename": "/Data/Object9/flag.OZT", "start": 133291191, "end": 133324007}, {"filename": "/Data/Object9/gaer.OZJ", "start": 133324007, "end": 133351389}, {"filename": "/Data/Object9/gear.OZT", "start": 133351389, "end": 133613581}, {"filename": "/Data/Object9/gearB.OZJ", "start": 133613581, "end": 133616430}, {"filename": "/Data/Object9/hand1.OZJ", "start": 133616430, "end": 133648842}, {"filename": "/Data/Object9/light01.OZJ", "start": 133648842, "end": 133654779}, {"filename": "/Data/Object9/p.OZT", "start": 133654779, "end": 133658923}, {"filename": "/Data/Object9/redB.OZJ", "start": 133658923, "end": 133686337}, {"filename": "/Data/Object9/sand01.OZJ", "start": 133686337, "end": 133707689}, {"filename": "/Data/Object9/sand02.OZJ", "start": 133707689, "end": 133757707}, {"filename": "/Data/Object9/sf.OZJ", "start": 133757707, "end": 133789112}, {"filename": "/Data/Object9/sf2.OZJ", "start": 133789112, "end": 133848449}, {"filename": "/Data/Object9/sf3.OZJ", "start": 133848449, "end": 133872174}, {"filename": "/Data/Object9/sf4.OZJ", "start": 133872174, "end": 133890528}, {"filename": "/Data/Object9/statue.OZJ", "start": 133890528, "end": 133910784}, {"filename": "/Data/Object9/statue2.OZJ", "start": 133910784, "end": 133930685}, {"filename": "/Data/Object9/ston.OZJ", "start": 133930685, "end": 133994250}, {"filename": "/Data/Object9/ston2.OZJ", "start": 133994250, "end": 134027720}, {"filename": "/Data/Object9/stonD.OZJ", "start": 134027720, "end": 134043354}, {"filename": "/Data/Object9/test1.OZT", "start": 134043354, "end": 134051594}, {"filename": "/Data/Object9/test12.OZJ", "start": 134051594, "end": 134077857}, {"filename": "/Data/Object9/test15.OZT", "start": 134077857, "end": 134086097}, {"filename": "/Data/Object9/test16.OZJ", "start": 134086097, "end": 134119744}, {"filename": "/Data/Object9/test17.OZJ", "start": 134119744, "end": 134155469}, {"filename": "/Data/Object9/test18.OZJ", "start": 134155469, "end": 134206473}, {"filename": "/Data/Object9/test2.OZJ", "start": 134206473, "end": 134222624}, {"filename": "/Data/Object9/test2.OZT", "start": 134222624, "end": 134288208}, {"filename": "/Data/Object9/test20.OZJ", "start": 134288208, "end": 134311094}, {"filename": "/Data/Object9/test22.OZJ", "start": 134311094, "end": 134418783}, {"filename": "/Data/Object9/test23.OZJ", "start": 134418783, "end": 134522081}, {"filename": "/Data/Object9/test24.OZJ", "start": 134522081, "end": 134624429}, {"filename": "/Data/Object9/test3.OZJ", "start": 134624429, "end": 134639983}, {"filename": "/Data/Object9/test37.OZJ", "start": 134639983, "end": 134648967}, {"filename": "/Data/Object9/test4.OZJ", "start": 134648967, "end": 134666130}, {"filename": "/Data/Object9/tree_01.OZT", "start": 134666130, "end": 134670274}, {"filename": "/Data/Object9/tree_02.OZT", "start": 134670274, "end": 134674418}, {"filename": "/Data/Object9/tree_08.OZT", "start": 134674418, "end": 134678562}, {"filename": "/Data/Object9/tree_09.OZT", "start": 134678562, "end": 134686802}, {"filename": "/Data/Player/Angel.bmd", "start": 134686802, "end": 134754048}, {"filename": "/Data/Player/ArmorClass01.bmd", "start": 134754048, "end": 134770811}, {"filename": "/Data/Player/ArmorClass02.bmd", "start": 134770811, "end": 134784574}, {"filename": "/Data/Player/ArmorClass03.bmd", "start": 134784574, "end": 134798337}, {"filename": "/Data/Player/ArmorClass04.bmd", "start": 134798337, "end": 134815100}, {"filename": "/Data/Player/ArmorClass05.bmd", "start": 134815100, "end": 134843640}, {"filename": "/Data/Player/ArmorClass201.bmd", "start": 134843640, "end": 134860340}, {"filename": "/Data/Player/ArmorClass202.bmd", "start": 134860340, "end": 134874040}, {"filename": "/Data/Player/ArmorClass203.bmd", "start": 134874040, "end": 134887412}, {"filename": "/Data/Player/ArmorElf01.bmd", "start": 134887412, "end": 134905891}, {"filename": "/Data/Player/ArmorElf02.bmd", "start": 134905891, "end": 134923938}, {"filename": "/Data/Player/ArmorElf03.bmd", "start": 134923938, "end": 134949057}, {"filename": "/Data/Player/ArmorElf04.bmd", "start": 134949057, "end": 134969994}, {"filename": "/Data/Player/ArmorElf05.bmd", "start": 134969994, "end": 134995649}, {"filename": "/Data/Player/ArmorMale01.bmd", "start": 134995649, "end": 135014374}, {"filename": "/Data/Player/ArmorMale02.bmd", "start": 135014374, "end": 135041989}, {"filename": "/Data/Player/ArmorMale03.bmd", "start": 135041989, "end": 135059708}, {"filename": "/Data/Player/ArmorMale04.bmd", "start": 135059708, "end": 135078621}, {"filename": "/Data/Player/ArmorMale05.bmd", "start": 135078621, "end": 135098494}, {"filename": "/Data/Player/ArmorMale06.bmd", "start": 135098494, "end": 135119115}, {"filename": "/Data/Player/ArmorMale07.bmd", "start": 135119115, "end": 135139208}, {"filename": "/Data/Player/ArmorMale08.bmd", "start": 135139208, "end": 135165343}, {"filename": "/Data/Player/ArmorMale09.bmd", "start": 135165343, "end": 135185294}, {"filename": "/Data/Player/ArmorMale10.bmd", "start": 135185294, "end": 135207707}, {"filename": "/Data/Player/ArmorMale16.bmd", "start": 135207707, "end": 135232752}, {"filename": "/Data/Player/ArmorMale17.bmd", "start": 135232752, "end": 135260027}, {"filename": "/Data/Player/ArmorMale18.bmd", "start": 135260027, "end": 135300350}, {"filename": "/Data/Player/ArmorMale19.bmd", "start": 135300350, "end": 135321151}, {"filename": "/Data/Player/ArmorMale20.bmd", "start": 135321151, "end": 135359206}, {"filename": "/Data/Player/ArmorMale21.bmd", "start": 135359206, "end": 135397212}, {"filename": "/Data/Player/ArmorMale22.bmd", "start": 135397212, "end": 135436586}, {"filename": "/Data/Player/ArmorMale23.bmd", "start": 135436586, "end": 135464570}, {"filename": "/Data/Player/ArmorMale24.bmd", "start": 135464570, "end": 135508040}, {"filename": "/Data/Player/ArmorMale25.bmd", "start": 135508040, "end": 135552530}, {"filename": "/Data/Player/ArmorMale26.bmd", "start": 135552530, "end": 135583188}, {"filename": "/Data/Player/ArmorMale27.bmd", "start": 135583188, "end": 135629468}, {"filename": "/Data/Player/ArmorMale28.bmd", "start": 135629468, "end": 135665964}, {"filename": "/Data/Player/ArmorMale29.bmd", "start": 135665964, "end": 135720004}, {"filename": "/Data/Player/BootClass01.bmd", "start": 135720004, "end": 135733807}, {"filename": "/Data/Player/BootClass02.bmd", "start": 135733807, "end": 135747610}, {"filename": "/Data/Player/BootClass03.bmd", "start": 135747610, "end": 135759765}, {"filename": "/Data/Player/BootClass04.bmd", "start": 135759765, "end": 135774480}, {"filename": "/Data/Player/BootClass05.bmd", "start": 135774480, "end": 135792132}, {"filename": "/Data/Player/BootClass201.bmd", "start": 135792132, "end": 135812304}, {"filename": "/Data/Player/BootClass202.bmd", "start": 135812304, "end": 135825276}, {"filename": "/Data/Player/BootClass203.bmd", "start": 135825276, "end": 135839480}, {"filename": "/Data/Player/BootElf01.bmd", "start": 135839480, "end": 135854095}, {"filename": "/Data/Player/BootElf02.bmd", "start": 135854095, "end": 135868132}, {"filename": "/Data/Player/BootElf03.bmd", "start": 135868132, "end": 135881817}, {"filename": "/Data/Player/BootElf04.bmd", "start": 135881817, "end": 135897992}, {"filename": "/Data/Player/BootElf05.bmd", "start": 135897992, "end": 135913907}, {"filename": "/Data/Player/BootMale01.bmd", "start": 135913907, "end": 135931654}, {"filename": "/Data/Player/BootMale02.bmd", "start": 135931654, "end": 135947537}, {"filename": "/Data/Player/BootMale03.bmd", "start": 135947537, "end": 135962544}, {"filename": "/Data/Player/BootMale04.bmd", "start": 135962544, "end": 135977369}, {"filename": "/Data/Player/BootMale05.bmd", "start": 135977369, "end": 135991358}, {"filename": "/Data/Player/BootMale06.bmd", "start": 135991358, "end": 136005379}, {"filename": "/Data/Player/BootMale07.bmd", "start": 136005379, "end": 136021592}, {"filename": "/Data/Player/BootMale08.bmd", "start": 136021592, "end": 136035221}, {"filename": "/Data/Player/BootMale09.bmd", "start": 136035221, "end": 136051034}, {"filename": "/Data/Player/BootMale10.bmd", "start": 136051034, "end": 136070405}, {"filename": "/Data/Player/BootMale16.bmd", "start": 136070405, "end": 136088188}, {"filename": "/Data/Player/BootMale17.bmd", "start": 136088188, "end": 136106603}, {"filename": "/Data/Player/BootMale18.bmd", "start": 136106603, "end": 136127744}, {"filename": "/Data/Player/BootMale19.bmd", "start": 136127744, "end": 136144169}, {"filename": "/Data/Player/BootMale20.bmd", "start": 136144169, "end": 136171040}, {"filename": "/Data/Player/BootMale21.bmd", "start": 136171040, "end": 136191906}, {"filename": "/Data/Player/BootMale22.bmd", "start": 136191906, "end": 136220218}, {"filename": "/Data/Player/BootMale23.bmd", "start": 136220218, "end": 136238010}, {"filename": "/Data/Player/BootMale24.bmd", "start": 136238010, "end": 136260058}, {"filename": "/Data/Player/BootMale25.bmd", "start": 136260058, "end": 136281524}, {"filename": "/Data/Player/BootMale26.bmd", "start": 136281524, "end": 136297196}, {"filename": "/Data/Player/BootMale27.bmd", "start": 136297196, "end": 136325116}, {"filename": "/Data/Player/BootMale28.bmd", "start": 136325116, "end": 136348474}, {"filename": "/Data/Player/BootMale29.bmd", "start": 136348474, "end": 136373306}, {"filename": "/Data/Player/Custom/21/ArmorMale22.bmd", "start": 136373306, "end": 136412680}, {"filename": "/Data/Player/Custom/21/BootMale22.bmd", "start": 136412680, "end": 136440992}, {"filename": "/Data/Player/Custom/21/GloveMale22.bmd", "start": 136440992, "end": 136461418}, {"filename": "/Data/Player/Custom/21/HelmMale22.bmd", "start": 136461418, "end": 136485930}, {"filename": "/Data/Player/Custom/21/PantMale22.bmd", "start": 136485930, "end": 136500992}, {"filename": "/Data/Player/Custom/21/boots22.OZJ", "start": 136500992, "end": 136520078}, {"filename": "/Data/Player/Custom/21/glove22.OZJ", "start": 136520078, "end": 136536923}, {"filename": "/Data/Player/Custom/21/head22.OZJ", "start": 136536923, "end": 136554510}, {"filename": "/Data/Player/Custom/21/hide.OZJ", "start": 136554510, "end": 136559066}, {"filename": "/Data/Player/Custom/21/level_man01.OZJ", "start": 136559066, "end": 136635880}, {"filename": "/Data/Player/Custom/21/pants22.OZJ", "start": 136635880, "end": 136670325}, {"filename": "/Data/Player/Custom/21/pants22.OZT", "start": 136670325, "end": 136686757}, {"filename": "/Data/Player/Custom/21/upper22.OZJ", "start": 136686757, "end": 136731374}, {"filename": "/Data/Player/DarklordRobe.OZT", "start": 136731374, "end": 136862494}, {"filename": "/Data/Player/E_head.OZT", "start": 136862494, "end": 136870734}, {"filename": "/Data/Player/FArmor.OZJ", "start": 136870734, "end": 136913072}, {"filename": "/Data/Player/FBoots.OZJ", "start": 136913072, "end": 136929876}, {"filename": "/Data/Player/FGlove.OZJ", "start": 136929876, "end": 136947056}, {"filename": "/Data/Player/FHelm.OZJ", "start": 136947056, "end": 136965850}, {"filename": "/Data/Player/FPants01.OZJ", "start": 136965850, "end": 136989834}, {"filename": "/Data/Player/FPants02.OZJ", "start": 136989834, "end": 137014222}, {"filename": "/Data/Player/FShoots.OZT", "start": 137014222, "end": 137022462}, {"filename": "/Data/Player/FShoots02.OZT", "start": 137022462, "end": 137030702}, {"filename": "/Data/Player/FShoots_R.OZJ", "start": 137030702, "end": 137041263}, {"filename": "/Data/Player/GloveClass01.bmd", "start": 137041263, "end": 137055442}, {"filename": "/Data/Player/GloveClass02.bmd", "start": 137055442, "end": 137069621}, {"filename": "/Data/Player/GloveClass03.bmd", "start": 137069621, "end": 137083768}, {"filename": "/Data/Player/GloveClass04.bmd", "start": 137083768, "end": 137097947}, {"filename": "/Data/Player/GloveClass05.bmd", "start": 137097947, "end": 137117003}, {"filename": "/Data/Player/GloveClass201.bmd", "start": 137117003, "end": 137131119}, {"filename": "/Data/Player/GloveClass202.bmd", "start": 137131119, "end": 137145235}, {"filename": "/Data/Player/GloveClass203.bmd", "start": 137145235, "end": 137159319}, {"filename": "/Data/Player/GloveElf01.bmd", "start": 137159319, "end": 137175788}, {"filename": "/Data/Player/GloveElf02.bmd", "start": 137175788, "end": 137191677}, {"filename": "/Data/Player/GloveElf03.bmd", "start": 137191677, "end": 137207722}, {"filename": "/Data/Player/GloveElf04.bmd", "start": 137207722, "end": 137224917}, {"filename": "/Data/Player/GloveElf05.bmd", "start": 137224917, "end": 137241488}, {"filename": "/Data/Player/GloveMale01.bmd", "start": 137241488, "end": 137261379}, {"filename": "/Data/Player/GloveMale02.bmd", "start": 137261379, "end": 137277918}, {"filename": "/Data/Player/GloveMale03.bmd", "start": 137277918, "end": 137294411}, {"filename": "/Data/Player/GloveMale04.bmd", "start": 137294411, "end": 137312520}, {"filename": "/Data/Player/GloveMale05.bmd", "start": 137312520, "end": 137329253}, {"filename": "/Data/Player/GloveMale06.bmd", "start": 137329253, "end": 137345306}, {"filename": "/Data/Player/GloveMale07.bmd", "start": 137345306, "end": 137363583}, {"filename": "/Data/Player/GloveMale08.bmd", "start": 137363583, "end": 137379628}, {"filename": "/Data/Player/GloveMale09.bmd", "start": 137379628, "end": 137396075}, {"filename": "/Data/Player/GloveMale10.bmd", "start": 137396075, "end": 137414518}, {"filename": "/Data/Player/GloveMale16.bmd", "start": 137414518, "end": 137431353}, {"filename": "/Data/Player/GloveMale17.bmd", "start": 137431353, "end": 137448862}, {"filename": "/Data/Player/GloveMale18.bmd", "start": 137448862, "end": 137476683}, {"filename": "/Data/Player/GloveMale19.bmd", "start": 137476683, "end": 137496080}, {"filename": "/Data/Player/GloveMale20.bmd", "start": 137496080, "end": 137517023}, {"filename": "/Data/Player/GloveMale21.bmd", "start": 137517023, "end": 137535965}, {"filename": "/Data/Player/GloveMale22.bmd", "start": 137535965, "end": 137556391}, {"filename": "/Data/Player/GloveMale23.bmd", "start": 137556391, "end": 137581359}, {"filename": "/Data/Player/GloveMale24.bmd", "start": 137581359, "end": 137600167}, {"filename": "/Data/Player/GloveMale25.bmd", "start": 137600167, "end": 137620569}, {"filename": "/Data/Player/GloveMale26.bmd", "start": 137620569, "end": 137637225}, {"filename": "/Data/Player/GloveMale27.bmd", "start": 137637225, "end": 137658289}, {"filename": "/Data/Player/GloveMale28.bmd", "start": 137658289, "end": 137676515}, {"filename": "/Data/Player/GloveMale29.bmd", "start": 137676515, "end": 137692915}, {"filename": "/Data/Player/HelmClass01.bmd", "start": 137692915, "end": 137706046}, {"filename": "/Data/Player/HelmClass02.bmd", "start": 137706046, "end": 137720077}, {"filename": "/Data/Player/HelmClass03.bmd", "start": 137720077, "end": 137734652}, {"filename": "/Data/Player/HelmClass04.bmd", "start": 137734652, "end": 137752055}, {"filename": "/Data/Player/HelmClass05.bmd", "start": 137752055, "end": 137771197}, {"filename": "/Data/Player/HelmClass201.bmd", "start": 137771197, "end": 137784305}, {"filename": "/Data/Player/HelmClass202.bmd", "start": 137784305, "end": 137798165}, {"filename": "/Data/Player/HelmClass203.bmd", "start": 137798165, "end": 137814597}, {"filename": "/Data/Player/HelmElf01.bmd", "start": 137814597, "end": 137823452}, {"filename": "/Data/Player/HelmElf02.bmd", "start": 137823452, "end": 137830375}, {"filename": "/Data/Player/HelmElf03.bmd", "start": 137830375, "end": 137837090}, {"filename": "/Data/Player/HelmElf04.bmd", "start": 137837090, "end": 137846529}, {"filename": "/Data/Player/HelmElf05.bmd", "start": 137846529, "end": 137864758}, {"filename": "/Data/Player/HelmMale01.bmd", "start": 137864758, "end": 137874323}, {"filename": "/Data/Player/HelmMale02.bmd", "start": 137874323, "end": 137894656}, {"filename": "/Data/Player/HelmMale03.bmd", "start": 137894656, "end": 137906517}, {"filename": "/Data/Player/HelmMale04.bmd", "start": 137906517, "end": 137919562}, {"filename": "/Data/Player/HelmMale05.bmd", "start": 137919562, "end": 137933383}, {"filename": "/Data/Player/HelmMale06.bmd", "start": 137933383, "end": 137947026}, {"filename": "/Data/Player/HelmMale07.bmd", "start": 137947026, "end": 137963441}, {"filename": "/Data/Player/HelmMale08.bmd", "start": 137963441, "end": 137980762}, {"filename": "/Data/Player/HelmMale09.bmd", "start": 137980762, "end": 137990401}, {"filename": "/Data/Player/HelmMale10.bmd", "start": 137990401, "end": 137997324}, {"filename": "/Data/Player/HelmMale17.bmd", "start": 137997324, "end": 138017785}, {"filename": "/Data/Player/HelmMale18.bmd", "start": 138017785, "end": 138043390}, {"filename": "/Data/Player/HelmMale19.bmd", "start": 138043390, "end": 138057819}, {"filename": "/Data/Player/HelmMale20.bmd", "start": 138057819, "end": 138090162}, {"filename": "/Data/Player/HelmMale22.bmd", "start": 138090162, "end": 138114674}, {"filename": "/Data/Player/HelmMale23.bmd", "start": 138114674, "end": 138129538}, {"filename": "/Data/Player/HelmMale25.bmd", "start": 138129538, "end": 138177432}, {"filename": "/Data/Player/HelmMale26.bmd", "start": 138177432, "end": 138201380}, {"filename": "/Data/Player/HelmMale27.bmd", "start": 138201380, "end": 138232444}, {"filename": "/Data/Player/HelmMale28.bmd", "start": 138232444, "end": 138256024}, {"filename": "/Data/Player/HelmMale29.bmd", "start": 138256024, "end": 138281980}, {"filename": "/Data/Player/Helper01.bmd", "start": 138281980, "end": 138288233}, {"filename": "/Data/Player/Helper02.bmd", "start": 138288233, "end": 138295130}, {"filename": "/Data/Player/Helper03.bmd", "start": 138295130, "end": 138300037}, {"filename": "/Data/Player/Helper04.bmd", "start": 138300037, "end": 138304106}, {"filename": "/Data/Player/KSbp.OZJ", "start": 138304106, "end": 138318407}, {"filename": "/Data/Player/KSgp.OZJ", "start": 138318407, "end": 138326032}, {"filename": "/Data/Player/KShp.OZJ", "start": 138326032, "end": 138334378}, {"filename": "/Data/Player/KSlp.OZJ", "start": 138334378, "end": 138360306}, {"filename": "/Data/Player/KSup.OZJ", "start": 138360306, "end": 138390154}, {"filename": "/Data/Player/KSup2.OZT", "start": 138390154, "end": 138406586}, {"filename": "/Data/Player/Kbpp.OZJ", "start": 138406586, "end": 138420081}, {"filename": "/Data/Player/Kgpp.OZJ", "start": 138420081, "end": 138428134}, {"filename": "/Data/Player/Klpp.OZJ", "start": 138428134, "end": 138453892}, {"filename": "/Data/Player/Kmpp.OZJ", "start": 138453892, "end": 138462042}, {"filename": "/Data/Player/Kupp.OZJ", "start": 138462042, "end": 138490160}, {"filename": "/Data/Player/MaskHelmMale01.bmd", "start": 138490160, "end": 138516161}, {"filename": "/Data/Player/MaskHelmMale06.bmd", "start": 138516161, "end": 138538832}, {"filename": "/Data/Player/MaskHelmMale07.bmd", "start": 138538832, "end": 138566073}, {"filename": "/Data/Player/MaskHelmMale09.bmd", "start": 138566073, "end": 138580668}, {"filename": "/Data/Player/MaskHelmMale10.bmd", "start": 138580668, "end": 138603145}, {"filename": "/Data/Player/PantClass01.bmd", "start": 138603145, "end": 138617100}, {"filename": "/Data/Player/PantClass02.bmd", "start": 138617100, "end": 138629331}, {"filename": "/Data/Player/PantClass03.bmd", "start": 138629331, "end": 138642338}, {"filename": "/Data/Player/PantClass04.bmd", "start": 138642338, "end": 138653689}, {"filename": "/Data/Player/PantClass05.bmd", "start": 138653689, "end": 138666677}, {"filename": "/Data/Player/PantClass201.bmd", "start": 138666677, "end": 138680569}, {"filename": "/Data/Player/PantClass202.bmd", "start": 138680569, "end": 138692737}, {"filename": "/Data/Player/PantClass203.bmd", "start": 138692737, "end": 138705681}, {"filename": "/Data/Player/PantElf01.bmd", "start": 138705681, "end": 138721650}, {"filename": "/Data/Player/PantElf02.bmd", "start": 138721650, "end": 138737031}, {"filename": "/Data/Player/PantElf03.bmd", "start": 138737031, "end": 138755520}, {"filename": "/Data/Player/PantElf04.bmd", "start": 138755520, "end": 138768617}, {"filename": "/Data/Player/PantElf05.bmd", "start": 138768617, "end": 138784564}, {"filename": "/Data/Player/PantMale01.bmd", "start": 138784564, "end": 138798773}, {"filename": "/Data/Player/PantMale02.bmd", "start": 138798773, "end": 138812846}, {"filename": "/Data/Player/PantMale03.bmd", "start": 138812846, "end": 138828835}, {"filename": "/Data/Player/PantMale04.bmd", "start": 138828835, "end": 138843582}, {"filename": "/Data/Player/PantMale05.bmd", "start": 138843582, "end": 138858213}, {"filename": "/Data/Player/PantMale06.bmd", "start": 138858213, "end": 138872598}, {"filename": "/Data/Player/PantMale07.bmd", "start": 138872598, "end": 138886115}, {"filename": "/Data/Player/PantMale08.bmd", "start": 138886115, "end": 138902486}, {"filename": "/Data/Player/PantMale09.bmd", "start": 138902486, "end": 138916993}, {"filename": "/Data/Player/PantMale10.bmd", "start": 138916993, "end": 138928970}, {"filename": "/Data/Player/PantMale16.bmd", "start": 138928970, "end": 138940947}, {"filename": "/Data/Player/PantMale17.bmd", "start": 138940947, "end": 138955428}, {"filename": "/Data/Player/PantMale18.bmd", "start": 138955428, "end": 138976893}, {"filename": "/Data/Player/PantMale19.bmd", "start": 138976893, "end": 138990350}, {"filename": "/Data/Player/PantMale20.bmd", "start": 138990350, "end": 139034115}, {"filename": "/Data/Player/PantMale21.bmd", "start": 139034115, "end": 139054935}, {"filename": "/Data/Player/PantMale22.bmd", "start": 139054935, "end": 139069997}, {"filename": "/Data/Player/PantMale23.bmd", "start": 139069997, "end": 139090324}, {"filename": "/Data/Player/PantMale24.bmd", "start": 139090324, "end": 139112886}, {"filename": "/Data/Player/PantMale25.bmd", "start": 139112886, "end": 139137036}, {"filename": "/Data/Player/PantMale26.bmd", "start": 139137036, "end": 139148604}, {"filename": "/Data/Player/PantMale27.bmd", "start": 139148604, "end": 139158844}, {"filename": "/Data/Player/PantMale28.bmd", "start": 139158844, "end": 139169726}, {"filename": "/Data/Player/PantMale29.bmd", "start": 139169726, "end": 139180014}, {"filename": "/Data/Player/Robe01.OZJ", "start": 139180014, "end": 139192083}, {"filename": "/Data/Player/Robe02.OZJ", "start": 139192083, "end": 139199328}, {"filename": "/Data/Player/Robe03.OZT", "start": 139199328, "end": 139264912}, {"filename": "/Data/Player/Shadow01.bmd", "start": 139264912, "end": 139276583}, {"filename": "/Data/Player/Wing02.bmd", "start": 139276583, "end": 139283090}, {"filename": "/Data/Player/Wing03.bmd", "start": 139283090, "end": 139288461}, {"filename": "/Data/Player/Wing04.bmd", "start": 139288461, "end": 139292505}, {"filename": "/Data/Player/boot_10c.OZJ", "start": 139292505, "end": 139306008}, {"filename": "/Data/Player/boots.OZJ", "start": 139306008, "end": 139325094}, {"filename": "/Data/Player/boots22.OZJ", "start": 139325094, "end": 139344180}, {"filename": "/Data/Player/boots_02.OZJ", "start": 139344180, "end": 139356222}, {"filename": "/Data/Player/boots_03.OZJ", "start": 139356222, "end": 139370240}, {"filename": "/Data/Player/boots_03b.OZJ", "start": 139370240, "end": 139385077}, {"filename": "/Data/Player/boots_04.OZJ", "start": 139385077, "end": 139396503}, {"filename": "/Data/Player/boots_04b.OZT", "start": 139396503, "end": 139400647}, {"filename": "/Data/Player/boots_04c.OZJ", "start": 139400647, "end": 139411412}, {"filename": "/Data/Player/boots_06.OZJ", "start": 139411412, "end": 139420887}, {"filename": "/Data/Player/boots_07.OZJ", "start": 139420887, "end": 139430378}, {"filename": "/Data/Player/boots_08.OZJ", "start": 139430378, "end": 139442212}, {"filename": "/Data/Player/boots_09.OZJ", "start": 139442212, "end": 139452469}, {"filename": "/Data/Player/boots_09c.OZJ", "start": 139452469, "end": 139464578}, {"filename": "/Data/Player/boots_10.OZJ", "start": 139464578, "end": 139477416}, {"filename": "/Data/Player/boots_10b.OZT", "start": 139477416, "end": 139481560}, {"filename": "/Data/Player/boots_11.OZJ", "start": 139481560, "end": 139494704}, {"filename": "/Data/Player/boots_13m.OZJ", "start": 139494704, "end": 139506677}, {"filename": "/Data/Player/boots_14.OZT", "start": 139506677, "end": 139523109}, {"filename": "/Data/Player/boots_14m.OZJ", "start": 139523109, "end": 139533744}, {"filename": "/Data/Player/boots_15.OZT", "start": 139533744, "end": 139550176}, {"filename": "/Data/Player/boots_15m.OZJ", "start": 139550176, "end": 139564156}, {"filename": "/Data/Player/boots_17.OZJ", "start": 139564156, "end": 139575402}, {"filename": "/Data/Player/boots_18.OZJ", "start": 139575402, "end": 139583932}, {"filename": "/Data/Player/boots_E1.OZJ", "start": 139583932, "end": 139594226}, {"filename": "/Data/Player/boots_E1Test.OZJ", "start": 139594226, "end": 139611007}, {"filename": "/Data/Player/boots_bd.OZJ", "start": 139611007, "end": 139622928}, {"filename": "/Data/Player/boots_bld.OZJ", "start": 139622928, "end": 139632126}, {"filename": "/Data/Player/boots_c07.OZJ", "start": 139632126, "end": 139643363}, {"filename": "/Data/Player/devil_wing.OZT", "start": 139643363, "end": 139708947}, {"filename": "/Data/Player/elfin_wing.OZJ", "start": 139708947, "end": 139718629}, {"filename": "/Data/Player/glove.OZJ", "start": 139718629, "end": 139735474}, {"filename": "/Data/Player/glove22.OZJ", "start": 139735474, "end": 139752319}, {"filename": "/Data/Player/gloves_02.OZJ", "start": 139752319, "end": 139765183}, {"filename": "/Data/Player/gloves_03.OZJ", "start": 139765183, "end": 139778359}, {"filename": "/Data/Player/gloves_03b.OZJ", "start": 139778359, "end": 139792394}, {"filename": "/Data/Player/gloves_04.OZJ", "start": 139792394, "end": 139806085}, {"filename": "/Data/Player/gloves_04c.OZJ", "start": 139806085, "end": 139818524}, {"filename": "/Data/Player/gloves_06.OZJ", "start": 139818524, "end": 139830133}, {"filename": "/Data/Player/gloves_07.OZJ", "start": 139830133, "end": 139840284}, {"filename": "/Data/Player/gloves_08.OZJ", "start": 139840284, "end": 139851654}, {"filename": "/Data/Player/gloves_09.OZJ", "start": 139851654, "end": 139863218}, {"filename": "/Data/Player/gloves_09c.OZJ", "start": 139863218, "end": 139875841}, {"filename": "/Data/Player/gloves_10.OZJ", "start": 139875841, "end": 139889473}, {"filename": "/Data/Player/gloves_10c.OZJ", "start": 139889473, "end": 139903612}, {"filename": "/Data/Player/gloves_11.OZJ", "start": 139903612, "end": 139917580}, {"filename": "/Data/Player/gloves_13m.OZJ", "start": 139917580, "end": 139928398}, {"filename": "/Data/Player/gloves_14.OZT", "start": 139928398, "end": 139944830}, {"filename": "/Data/Player/gloves_14m.OZJ", "start": 139944830, "end": 139955086}, {"filename": "/Data/Player/gloves_15.OZT", "start": 139955086, "end": 139971518}, {"filename": "/Data/Player/gloves_15m.OZJ", "start": 139971518, "end": 139979976}, {"filename": "/Data/Player/gloves_17.OZJ", "start": 139979976, "end": 139990513}, {"filename": "/Data/Player/gloves_18.OZJ", "start": 139990513, "end": 139998258}, {"filename": "/Data/Player/gloves_E1.OZJ", "start": 139998258, "end": 140008614}, {"filename": "/Data/Player/gloves_E1Test.OZJ", "start": 140008614, "end": 140019297}, {"filename": "/Data/Player/gloves_bd.OZJ", "start": 140019297, "end": 140033148}, {"filename": "/Data/Player/gloves_bld.OZJ", "start": 140033148, "end": 140041887}, {"filename": "/Data/Player/gloves_c07.OZJ", "start": 140041887, "end": 140053601}, {"filename": "/Data/Player/guard_hair.OZT", "start": 140053601, "end": 140057745}, {"filename": "/Data/Player/hair_R.OZJ", "start": 140057745, "end": 140061324}, {"filename": "/Data/Player/head.OZJ", "start": 140061324, "end": 140078911}, {"filename": "/Data/Player/head22.OZJ", "start": 140078911, "end": 140096498}, {"filename": "/Data/Player/head_02.OZJ", "start": 140096498, "end": 140108782}, {"filename": "/Data/Player/head_03.OZJ", "start": 140108782, "end": 140122509}, {"filename": "/Data/Player/head_04.OZJ", "start": 140122509, "end": 140134392}, {"filename": "/Data/Player/head_06.OZJ", "start": 140134392, "end": 140143951}, {"filename": "/Data/Player/head_07.OZJ", "start": 140143951, "end": 140152902}, {"filename": "/Data/Player/head_08.OZJ", "start": 140152902, "end": 140163654}, {"filename": "/Data/Player/head_09.OZJ", "start": 140163654, "end": 140174099}, {"filename": "/Data/Player/head_09b.OZT", "start": 140174099, "end": 140190531}, {"filename": "/Data/Player/head_10.OZJ", "start": 140190531, "end": 140202987}, {"filename": "/Data/Player/head_11.OZJ", "start": 140202987, "end": 140214069}, {"filename": "/Data/Player/head_13m.OZJ", "start": 140214069, "end": 140226351}, {"filename": "/Data/Player/head_13m.OZT", "start": 140226351, "end": 140228447}, {"filename": "/Data/Player/head_14m.OZJ", "start": 140228447, "end": 140235745}, {"filename": "/Data/Player/head_15m.OZJ", "start": 140235745, "end": 140244377}, {"filename": "/Data/Player/head_17.OZJ", "start": 140244377, "end": 140256070}, {"filename": "/Data/Player/head_18.OZJ", "start": 140256070, "end": 140264910}, {"filename": "/Data/Player/head_E1.OZJ", "start": 140264910, "end": 140273418}, {"filename": "/Data/Player/head_E1Test.OZJ", "start": 140273418, "end": 140283086}, {"filename": "/Data/Player/head_a01.OZJ", "start": 140283086, "end": 140291361}, {"filename": "/Data/Player/head_a02.OZJ", "start": 140291361, "end": 140302866}, {"filename": "/Data/Player/head_a03.OZJ", "start": 140302866, "end": 140315336}, {"filename": "/Data/Player/head_a04.OZJ", "start": 140315336, "end": 140329164}, {"filename": "/Data/Player/head_a05.OZJ", "start": 140329164, "end": 140341686}, {"filename": "/Data/Player/head_a06.OZT", "start": 140341686, "end": 140345830}, {"filename": "/Data/Player/head_bd.OZJ", "start": 140345830, "end": 140356879}, {"filename": "/Data/Player/head_bld.OZJ", "start": 140356879, "end": 140364607}, {"filename": "/Data/Player/hide.OZJ", "start": 140364607, "end": 140369163}, {"filename": "/Data/Player/hide22.OZJ", "start": 140369163, "end": 140373719}, {"filename": "/Data/Player/hide_m.OZJ", "start": 140373719, "end": 140378259}, {"filename": "/Data/Player/kaa.OZT", "start": 140378259, "end": 140394691}, {"filename": "/Data/Player/khair.OZT", "start": 140394691, "end": 140460275}, {"filename": "/Data/Player/level_man01.OZJ", "start": 140460275, "end": 140537089}, {"filename": "/Data/Player/level_man02.OZJ", "start": 140537089, "end": 140593707}, {"filename": "/Data/Player/level_man022.OZJ", "start": 140593707, "end": 140659487}, {"filename": "/Data/Player/level_man033.OZJ", "start": 140659487, "end": 140759823}, {"filename": "/Data/Player/lower2_15m.OZT", "start": 140759823, "end": 140776255}, {"filename": "/Data/Player/lowerTest2_R.OZJ", "start": 140776255, "end": 140781495}, {"filename": "/Data/Player/lowerTest_R.OZJ", "start": 140781495, "end": 140788043}, {"filename": "/Data/Player/lower_02_m.OZJ", "start": 140788043, "end": 140823547}, {"filename": "/Data/Player/lower_03.OZJ", "start": 140823547, "end": 140860366}, {"filename": "/Data/Player/lower_03_m.OZJ", "start": 140860366, "end": 140900202}, {"filename": "/Data/Player/lower_03b.OZT", "start": 140900202, "end": 140916634}, {"filename": "/Data/Player/lower_03b_m.OZT", "start": 140916634, "end": 140933066}, {"filename": "/Data/Player/lower_04.OZJ", "start": 140933066, "end": 140943626}, {"filename": "/Data/Player/lower_04_m.OZJ", "start": 140943626, "end": 140979525}, {"filename": "/Data/Player/lower_04b.OZT", "start": 140979525, "end": 140983669}, {"filename": "/Data/Player/lower_04b_m.OZT", "start": 140983669, "end": 140987813}, {"filename": "/Data/Player/lower_04c.OZT", "start": 140987813, "end": 140991957}, {"filename": "/Data/Player/lower_06.OZJ", "start": 140991957, "end": 141021950}, {"filename": "/Data/Player/lower_07.OZJ", "start": 141021950, "end": 141050363}, {"filename": "/Data/Player/lower_07.OZT", "start": 141050363, "end": 141066795}, {"filename": "/Data/Player/lower_07_m.OZJ", "start": 141066795, "end": 141088634}, {"filename": "/Data/Player/lower_07c.OZT", "start": 141088634, "end": 141105066}, {"filename": "/Data/Player/lower_08_m.OZJ", "start": 141105066, "end": 141138601}, {"filename": "/Data/Player/lower_09.OZJ", "start": 141138601, "end": 141164064}, {"filename": "/Data/Player/lower_09_m.OZJ", "start": 141164064, "end": 141199743}, {"filename": "/Data/Player/lower_09b.OZT", "start": 141199743, "end": 141216175}, {"filename": "/Data/Player/lower_09c.OZT", "start": 141216175, "end": 141220319}, {"filename": "/Data/Player/lower_10_m.OZJ", "start": 141220319, "end": 141249182}, {"filename": "/Data/Player/lower_10b.OZT", "start": 141249182, "end": 141253326}, {"filename": "/Data/Player/lower_10c.OZJ", "start": 141253326, "end": 141292003}, {"filename": "/Data/Player/lower_11.OZJ", "start": 141292003, "end": 141326850}, {"filename": "/Data/Player/lower_13m.OZJ", "start": 141326850, "end": 141347397}, {"filename": "/Data/Player/lower_13m.OZT", "start": 141347397, "end": 141355637}, {"filename": "/Data/Player/lower_14.OZT", "start": 141355637, "end": 141388453}, {"filename": "/Data/Player/lower_14m.OZJ", "start": 141388453, "end": 141405361}, {"filename": "/Data/Player/lower_15.OZT", "start": 141405361, "end": 141438177}, {"filename": "/Data/Player/lower_15m.OZJ", "start": 141438177, "end": 141464364}, {"filename": "/Data/Player/lower_17.OZJ", "start": 141464364, "end": 141484070}, {"filename": "/Data/Player/lower_18.OZJ", "start": 141484070, "end": 141495068}, {"filename": "/Data/Player/lower_E1.OZJ", "start": 141495068, "end": 141522992}, {"filename": "/Data/Player/lower_E1.OZT", "start": 141522992, "end": 141588576}, {"filename": "/Data/Player/lower_E1Test.OZJ", "start": 141588576, "end": 141605478}, {"filename": "/Data/Player/lower_a06.OZT", "start": 141605478, "end": 141609622}, {"filename": "/Data/Player/lower_bd.OZJ", "start": 141609622, "end": 141632903}, {"filename": "/Data/Player/lower_bd.OZT", "start": 141632903, "end": 141649335}, {"filename": "/Data/Player/lower_bld.OZJ", "start": 141649335, "end": 141670453}, {"filename": "/Data/Player/lower_bld.OZT", "start": 141670453, "end": 141686885}, {"filename": "/Data/Player/mg_arm.OZT", "start": 141686885, "end": 141703317}, {"filename": "/Data/Player/mg_boots.OZT", "start": 141703317, "end": 141768901}, {"filename": "/Data/Player/mg_jacket.OZT", "start": 141768901, "end": 141834485}, {"filename": "/Data/Player/mg_under.OZT", "start": 141834485, "end": 141867301}, {"filename": "/Data/Player/pants.OZJ", "start": 141867301, "end": 141901746}, {"filename": "/Data/Player/pants02.OZT", "start": 141901746, "end": 141918178}, {"filename": "/Data/Player/pants22.OZJ", "start": 141918178, "end": 141952623}, {"filename": "/Data/Player/pants22.OZT", "start": 141952623, "end": 141969055}, {"filename": "/Data/Player/player.bmd", "start": 141969055, "end": 143443168}, {"filename": "/Data/Player/skin_E1.OZJ", "start": 143443168, "end": 143447694}, {"filename": "/Data/Player/skin_archer_01.OZJ", "start": 143447694, "end": 143520326}, {"filename": "/Data/Player/skin_barbarian_01.OZJ", "start": 143520326, "end": 143578616}, {"filename": "/Data/Player/skin_ff.OZJ", "start": 143578616, "end": 143590450}, {"filename": "/Data/Player/skin_special_01.OZJ", "start": 143590450, "end": 143664629}, {"filename": "/Data/Player/skin_warrior_01.OZJ", "start": 143664629, "end": 143734650}, {"filename": "/Data/Player/skin_wizard_01.OZJ", "start": 143734650, "end": 143803502}, {"filename": "/Data/Player/upper.OZJ", "start": 143803502, "end": 143848119}, {"filename": "/Data/Player/upper22.OZJ", "start": 143848119, "end": 143892736}, {"filename": "/Data/Player/upper_02_m.OZJ", "start": 143892736, "end": 143915143}, {"filename": "/Data/Player/upper_02b_m.OZT", "start": 143915143, "end": 143919287}, {"filename": "/Data/Player/upper_03.OZJ", "start": 143919287, "end": 143955810}, {"filename": "/Data/Player/upper_03_m.OZJ", "start": 143955810, "end": 143999481}, {"filename": "/Data/Player/upper_04.OZJ", "start": 143999481, "end": 144022050}, {"filename": "/Data/Player/upper_04_m.OZJ", "start": 144022050, "end": 144051284}, {"filename": "/Data/Player/upper_06.OZJ", "start": 144051284, "end": 144075557}, {"filename": "/Data/Player/upper_07.OZJ", "start": 144075557, "end": 144106788}, {"filename": "/Data/Player/upper_07_m.OZJ", "start": 144106788, "end": 144126521}, {"filename": "/Data/Player/upper_07b_m.OZT", "start": 144126521, "end": 144130665}, {"filename": "/Data/Player/upper_08_m.OZJ", "start": 144130665, "end": 144165164}, {"filename": "/Data/Player/upper_09.OZJ", "start": 144165164, "end": 144198211}, {"filename": "/Data/Player/upper_09_m.OZJ", "start": 144198211, "end": 144225946}, {"filename": "/Data/Player/upper_09b_m.OZT", "start": 144225946, "end": 144230090}, {"filename": "/Data/Player/upper_09c.OZT", "start": 144230090, "end": 144234234}, {"filename": "/Data/Player/upper_10_m.OZJ", "start": 144234234, "end": 144269368}, {"filename": "/Data/Player/upper_10c.OZJ", "start": 144269368, "end": 144307381}, {"filename": "/Data/Player/upper_11.OZJ", "start": 144307381, "end": 144344288}, {"filename": "/Data/Player/upper_13m.OZJ", "start": 144344288, "end": 144375756}, {"filename": "/Data/Player/upper_14.OZT", "start": 144375756, "end": 144441340}, {"filename": "/Data/Player/upper_14m.OZJ", "start": 144441340, "end": 144473447}, {"filename": "/Data/Player/upper_15.OZT", "start": 144473447, "end": 144539031}, {"filename": "/Data/Player/upper_15m.OZJ", "start": 144539031, "end": 144567346}, {"filename": "/Data/Player/upper_17.OZJ", "start": 144567346, "end": 144591942}, {"filename": "/Data/Player/upper_18.OZJ", "start": 144591942, "end": 144619197}, {"filename": "/Data/Player/upper_E1.OZJ", "start": 144619197, "end": 144654754}, {"filename": "/Data/Player/upper_E1.OZT", "start": 144654754, "end": 144720338}, {"filename": "/Data/Player/upper_E1Test.OZJ", "start": 144720338, "end": 144747748}, {"filename": "/Data/Player/upper_bd.OZJ", "start": 144747748, "end": 144777071}, {"filename": "/Data/Player/upper_bld.OZJ", "start": 144777071, "end": 144801952}, {"filename": "/Data/Skill/Airforce.bmd", "start": 144801952, "end": 144807570}, {"filename": "/Data/Skill/Arrow.OZJ", "start": 144807570, "end": 144812526}, {"filename": "/Data/Skill/Arrow01.bmd", "start": 144812526, "end": 144817376}, {"filename": "/Data/Skill/Arrowbomb01.bmd", "start": 144817376, "end": 144820520}, {"filename": "/Data/Skill/Arrowdouble01.bmd", "start": 144820520, "end": 144830836}, {"filename": "/Data/Skill/Arrowlaser01.bmd", "start": 144830836, "end": 144831438}, {"filename": "/Data/Skill/Arrownature01.bmd", "start": 144831438, "end": 144857018}, {"filename": "/Data/Skill/Arrowsaw01.bmd", "start": 144857018, "end": 144867196}, {"filename": "/Data/Skill/Arrowsteel01.bmd", "start": 144867196, "end": 144869706}, {"filename": "/Data/Skill/Arrowthunder01.bmd", "start": 144869706, "end": 144872584}, {"filename": "/Data/Skill/Arrowv01.bmd", "start": 144872584, "end": 144873670}, {"filename": "/Data/Skill/Arrowwing01.bmd", "start": 144873670, "end": 144878352}, {"filename": "/Data/Skill/Ball01.bmd", "start": 144878352, "end": 144895551}, {"filename": "/Data/Skill/Bigstone01.bmd", "start": 144895551, "end": 144897657}, {"filename": "/Data/Skill/Bigstone02.bmd", "start": 144897657, "end": 144899763}, {"filename": "/Data/Skill/Blast01.bmd", "start": 144899763, "end": 144900789}, {"filename": "/Data/Skill/Blizzard.bmd", "start": 144900789, "end": 144902511}, {"filename": "/Data/Skill/Bone01.bmd", "start": 144902511, "end": 144909705}, {"filename": "/Data/Skill/Bone02.bmd", "start": 144909705, "end": 144912691}, {"filename": "/Data/Skill/Bons.OZJ", "start": 144912691, "end": 144940490}, {"filename": "/Data/Skill/Bons_a.OZJ", "start": 144940490, "end": 144975494}, {"filename": "/Data/Skill/Bons_a2.OZT", "start": 144975494, "end": 144977590}, {"filename": "/Data/Skill/Bons_b.OZJ", "start": 144977590, "end": 145005148}, {"filename": "/Data/Skill/Bons_particle.OZJ", "start": 145005148, "end": 145015631}, {"filename": "/Data/Skill/Bow_b.OZJ", "start": 145015631, "end": 145027090}, {"filename": "/Data/Skill/Bow_c.OZJ", "start": 145027090, "end": 145032578}, {"filename": "/Data/Skill/Bow_d.OZJ", "start": 145032578, "end": 145038207}, {"filename": "/Data/Skill/Bowtt.OZJ", "start": 145038207, "end": 145041072}, {"filename": "/Data/Skill/Bowtt2.OZJ", "start": 145041072, "end": 145044258}, {"filename": "/Data/Skill/Bu009.OZJ", "start": 145044258, "end": 145050584}, {"filename": "/Data/Skill/Carow.OZJ", "start": 145050584, "end": 145062393}, {"filename": "/Data/Skill/Carow.bmd", "start": 145062393, "end": 145067594}, {"filename": "/Data/Skill/Circle01.bmd", "start": 145067594, "end": 145068448}, {"filename": "/Data/Skill/Circle02.bmd", "start": 145068448, "end": 145078562}, {"filename": "/Data/Skill/Crossb.OZJ", "start": 145078562, "end": 145080738}, {"filename": "/Data/Skill/Ct10.OZJ", "start": 145080738, "end": 145128375}, {"filename": "/Data/Skill/Curer.OZJ", "start": 145128375, "end": 145136143}, {"filename": "/Data/Skill/Dhorss.OZJ", "start": 145136143, "end": 145158274}, {"filename": "/Data/Skill/Dhorss_r.OZJ", "start": 145158274, "end": 145161510}, {"filename": "/Data/Skill/Dragon02.OZJ", "start": 145161510, "end": 145179757}, {"filename": "/Data/Skill/Earow.OZJ", "start": 145179757, "end": 145192950}, {"filename": "/Data/Skill/Earthquake01.bmd", "start": 145192950, "end": 145193340}, {"filename": "/Data/Skill/Earthquake02.bmd", "start": 145193340, "end": 145195278}, {"filename": "/Data/Skill/Earthquake03.bmd", "start": 145195278, "end": 145195668}, {"filename": "/Data/Skill/Earthquake04.bmd", "start": 145195668, "end": 145196058}, {"filename": "/Data/Skill/Earthquake05.bmd", "start": 145196058, "end": 145197980}, {"filename": "/Data/Skill/Earthquake06.bmd", "start": 145197980, "end": 145198370}, {"filename": "/Data/Skill/Earthquake07.bmd", "start": 145198370, "end": 145198760}, {"filename": "/Data/Skill/Earthquake08.bmd", "start": 145198760, "end": 145200698}, {"filename": "/Data/Skill/Ffa1.OZJ", "start": 145200698, "end": 145206480}, {"filename": "/Data/Skill/Ffa2.OZJ", "start": 145206480, "end": 145211766}, {"filename": "/Data/Skill/Fire01.OZJ", "start": 145211766, "end": 145222277}, {"filename": "/Data/Skill/Fire01.bmd", "start": 145222277, "end": 145231372}, {"filename": "/Data/Skill/Fire02.OZJ", "start": 145231372, "end": 145244151}, {"filename": "/Data/Skill/Flashing.bmd", "start": 145244151, "end": 145245641}, {"filename": "/Data/Skill/Flower1.OZT", "start": 145245641, "end": 145249785}, {"filename": "/Data/Skill/Flower2.OZT", "start": 145249785, "end": 145253929}, {"filename": "/Data/Skill/Flower3.OZT", "start": 145253929, "end": 145258073}, {"filename": "/Data/Skill/Foot.OZJ", "start": 145258073, "end": 145268251}, {"filename": "/Data/Skill/Fury.OZJ", "start": 145268251, "end": 145279963}, {"filename": "/Data/Skill/Fury.OZT", "start": 145279963, "end": 145312779}, {"filename": "/Data/Skill/Ground.OZJ", "start": 145312779, "end": 145336456}, {"filename": "/Data/Skill/Groundeff.OZJ", "start": 145336456, "end": 145379576}, {"filename": "/Data/Skill/Groundstone.bmd", "start": 145379576, "end": 145386626}, {"filename": "/Data/Skill/Groundstone2.bmd", "start": 145386626, "end": 145396692}, {"filename": "/Data/Skill/Ice.OZJ", "start": 145396692, "end": 145425574}, {"filename": "/Data/Skill/Ice01.bmd", "start": 145425574, "end": 145455540}, {"filename": "/Data/Skill/Ice02.bmd", "start": 145455540, "end": 145456326}, {"filename": "/Data/Skill/Inferno01.bmd", "start": 145456326, "end": 145515814}, {"filename": "/Data/Skill/Kcross.bmd", "start": 145515814, "end": 145521576}, {"filename": "/Data/Skill/Kcrossb.OZJ", "start": 145521576, "end": 145523554}, {"filename": "/Data/Skill/Kcteil.OZJ", "start": 145523554, "end": 145534283}, {"filename": "/Data/Skill/Kings_r.OZJ", "start": 145534283, "end": 145555513}, {"filename": "/Data/Skill/Laser01.bmd", "start": 145555513, "end": 145562591}, {"filename": "/Data/Skill/M_piercing.OZJ", "start": 145562591, "end": 145574558}, {"filename": "/Data/Skill/M_piercing.OZT", "start": 145574558, "end": 145590990}, {"filename": "/Data/Skill/M_piercing.bmd", "start": 145590990, "end": 145594558}, {"filename": "/Data/Skill/M_piercing02.OZJ", "start": 145594558, "end": 145603296}, {"filename": "/Data/Skill/M_piercing02.OZT", "start": 145603296, "end": 145607440}, {"filename": "/Data/Skill/M_waves.bmd", "start": 145607440, "end": 145610470}, {"filename": "/Data/Skill/Magic01.bmd", "start": 145610470, "end": 145614156}, {"filename": "/Data/Skill/Magic02.bmd", "start": 145614156, "end": 145616110}, {"filename": "/Data/Skill/Magic2.OZJ", "start": 145616110, "end": 145619581}, {"filename": "/Data/Skill/Magic_a01.OZJ", "start": 145619581, "end": 145637504}, {"filename": "/Data/Skill/Magic_a02.OZJ", "start": 145637504, "end": 145649759}, {"filename": "/Data/Skill/Magic_b.OZJ", "start": 145649759, "end": 145663323}, {"filename": "/Data/Skill/Magic_g.OZJ", "start": 145663323, "end": 145678556}, {"filename": "/Data/Skill/Magiccircle01.bmd", "start": 145678556, "end": 145684915}, {"filename": "/Data/Skill/Mmn2.OZJ", "start": 145684915, "end": 145688791}, {"filename": "/Data/Skill/Part.OZT", "start": 145688791, "end": 145705223}, {"filename": "/Data/Skill/Part2.OZT", "start": 145705223, "end": 145721655}, {"filename": "/Data/Skill/Phoenixshield01.bmd", "start": 145721655, "end": 145756255}, {"filename": "/Data/Skill/Piercing.OZJ", "start": 145756255, "end": 145770459}, {"filename": "/Data/Skill/Piercing.bmd", "start": 145770459, "end": 145772889}, {"filename": "/Data/Skill/Pierpart.bmd", "start": 145772889, "end": 145785268}, {"filename": "/Data/Skill/Poison01.bmd", "start": 145785268, "end": 145825628}, {"filename": "/Data/Skill/Protect01.bmd", "start": 145825628, "end": 145829814}, {"filename": "/Data/Skill/Protect02.bmd", "start": 145829814, "end": 145838184}, {"filename": "/Data/Skill/Rdgon.OZJ", "start": 145838184, "end": 145927127}, {"filename": "/Data/Skill/Rdgonw.OZT", "start": 145927127, "end": 145959943}, {"filename": "/Data/Skill/Reddragon_n.OZJ", "start": 145959943, "end": 146043158}, {"filename": "/Data/Skill/Reddragon_n.OZT", "start": 146043158, "end": 146305350}, {"filename": "/Data/Skill/Reddragont.OZJ", "start": 146305350, "end": 146315726}, {"filename": "/Data/Skill/Rider01.bmd", "start": 146315726, "end": 146372266}, {"filename": "/Data/Skill/Rider02.bmd", "start": 146372266, "end": 146562279}, {"filename": "/Data/Skill/Ridingspear01.bmd", "start": 146562279, "end": 146563465}, {"filename": "/Data/Skill/Ring2.OZJ", "start": 146563465, "end": 146573409}, {"filename": "/Data/Skill/Ring3.OZJ", "start": 146573409, "end": 146582886}, {"filename": "/Data/Skill/Ring4.OZJ", "start": 146582886, "end": 146602585}, {"filename": "/Data/Skill/Saw01.bmd", "start": 146602585, "end": 146612763}, {"filename": "/Data/Skill/Skeleton01.bmd", "start": 146612763, "end": 146658018}, {"filename": "/Data/Skill/Skeleton02.bmd", "start": 146658018, "end": 146731851}, {"filename": "/Data/Skill/Skeleton03.bmd", "start": 146731851, "end": 146794719}, {"filename": "/Data/Skill/Skull.OZJ", "start": 146794719, "end": 146796995}, {"filename": "/Data/Skill/Snow01.bmd", "start": 146796995, "end": 146801493}, {"filename": "/Data/Skill/Snow02.bmd", "start": 146801493, "end": 146805147}, {"filename": "/Data/Skill/Snow03.bmd", "start": 146805147, "end": 146806329}, {"filename": "/Data/Skill/Snow_p.OZJ", "start": 146806329, "end": 146812000}, {"filename": "/Data/Skill/Sou01.OZJ", "start": 146812000, "end": 146823138}, {"filename": "/Data/Skill/Sou02.OZJ", "start": 146823138, "end": 146830413}, {"filename": "/Data/Skill/Soul_ba.OZJ", "start": 146830413, "end": 146837774}, {"filename": "/Data/Skill/Spie_r.OZJ", "start": 146837774, "end": 146844013}, {"filename": "/Data/Skill/Ston1.OZJ", "start": 146844013, "end": 146856557}, {"filename": "/Data/Skill/Stone01.bmd", "start": 146856557, "end": 146857739}, {"filename": "/Data/Skill/Stone02.bmd", "start": 146857739, "end": 146861393}, {"filename": "/Data/Skill/Storm01.bmd", "start": 146861393, "end": 146900053}, {"filename": "/Data/Skill/Tail.bmd", "start": 146900053, "end": 146900443}, {"filename": "/Data/Skill/Tama01.bmd", "start": 146900443, "end": 146934607}, {"filename": "/Data/Skill/Test2.OZJ", "start": 146934607, "end": 146942794}, {"filename": "/Data/Skill/Test2.OZT", "start": 146942794, "end": 146959226}, {"filename": "/Data/Skill/Test_2.OZJ", "start": 146959226, "end": 146967413}, {"filename": "/Data/Skill/Test_2.OZT", "start": 146967413, "end": 146983845}, {"filename": "/Data/Skill/Toothed_whee.OZJ", "start": 146983845, "end": 146989726}, {"filename": "/Data/Skill/Typhoon.OZJ", "start": 146989726, "end": 147000828}, {"filename": "/Data/Skill/V.OZJ", "start": 147000828, "end": 147005501}, {"filename": "/Data/Skill/Wall01.OZJ", "start": 147005501, "end": 147017837}, {"filename": "/Data/Skill/Wall02.OZJ", "start": 147017837, "end": 147025105}, {"filename": "/Data/Skill/Waveforce.bmd", "start": 147025105, "end": 147026730}, {"filename": "/Data/Skill/tama00.OZJ", "start": 147026730, "end": 147049776}, {"filename": "/Data/Skill/tama01.OZT", "start": 147049776, "end": 147058016}, {"filename": "/Data/Sound/Berserker.wav", "start": 147058016, "end": 147242628}, {"filename": "/Data/Sound/aBat.wav", "start": 147242628, "end": 147351758}, {"filename": "/Data/Sound/aBird1.WAV", "start": 147351758, "end": 147416856}, {"filename": "/Data/Sound/aBird2.WAV", "start": 147416856, "end": 147436702}, {"filename": "/Data/Sound/aCastleDoor.wav", "start": 147436702, "end": 147547482}, {"filename": "/Data/Sound/aDoor.wav", "start": 147547482, "end": 147663692}, {"filename": "/Data/Sound/aDungeon.wav", "start": 147663692, "end": 148397370}, {"filename": "/Data/Sound/aForest.wav", "start": 148397370, "end": 149333142}, {"filename": "/Data/Sound/aGrate.wav", "start": 149333142, "end": 149386396}, {"filename": "/Data/Sound/aHeaven.wav", "start": 149386396, "end": 150574704}, {"filename": "/Data/Sound/aMouse.WAV", "start": 150574704, "end": 150690422}, {"filename": "/Data/Sound/aRain.wav", "start": 150690422, "end": 152428680}, {"filename": "/Data/Sound/aTamajjang1.wav", "start": 152428680, "end": 152433114}, {"filename": "/Data/Sound/aTamajjang2.wav", "start": 152433114, "end": 152437592}, {"filename": "/Data/Sound/aThunder01.wav", "start": 152437592, "end": 152502422}, {"filename": "/Data/Sound/aThunder02.wav", "start": 152502422, "end": 152567252}, {"filename": "/Data/Sound/aThunder03.wav", "start": 152567252, "end": 152632082}, {"filename": "/Data/Sound/aTower.wav", "start": 152632082, "end": 153469420}, {"filename": "/Data/Sound/aWater.wav", "start": 153469420, "end": 154638450}, {"filename": "/Data/Sound/aWind.wav", "start": 154638450, "end": 155755838}, {"filename": "/Data/Sound/beep.wav", "start": 155755838, "end": 155759806}, {"filename": "/Data/Sound/blood1.wav", "start": 155759806, "end": 156008020}, {"filename": "/Data/Sound/blood_attack1.wav", "start": 156008020, "end": 156115818}, {"filename": "/Data/Sound/blood_attack2.wav", "start": 156115818, "end": 156250008}, {"filename": "/Data/Sound/blood_die.wav", "start": 156250008, "end": 156541810}, {"filename": "/Data/Sound/death1.wav", "start": 156541810, "end": 156801032}, {"filename": "/Data/Sound/death_attack1.wav", "start": 156801032, "end": 157056054}, {"filename": "/Data/Sound/death_die.wav", "start": 157056054, "end": 157617736}, {"filename": "/Data/Sound/desert.wav", "start": 157617736, "end": 159051406}, {"filename": "/Data/Sound/eBloodAttack.wav", "start": 159051406, "end": 159069288}, {"filename": "/Data/Sound/eBlow.wav", "start": 159069288, "end": 159095980}, {"filename": "/Data/Sound/eBlow1.wav", "start": 159095980, "end": 159110622}, {"filename": "/Data/Sound/eBlow2.wav", "start": 159110622, "end": 159132844}, {"filename": "/Data/Sound/eBlow3.wav", "start": 159132844, "end": 159150584}, {"filename": "/Data/Sound/eBlow4.wav", "start": 159150584, "end": 159171956}, {"filename": "/Data/Sound/eBow.wav", "start": 159171956, "end": 159213758}, {"filename": "/Data/Sound/eBreak.wav", "start": 159213758, "end": 159240048}, {"filename": "/Data/Sound/eCrossbow.wav", "start": 159240048, "end": 159269602}, {"filename": "/Data/Sound/eCrow.wav", "start": 159269602, "end": 159277460}, {"filename": "/Data/Sound/eDownGate.wav", "start": 159277460, "end": 159444568}, {"filename": "/Data/Sound/eExplosion.wav", "start": 159444568, "end": 159490228}, {"filename": "/Data/Sound/eFirecracker1.wav", "start": 159490228, "end": 159619386}, {"filename": "/Data/Sound/eFirecracker2.wav", "start": 159619386, "end": 159751788}, {"filename": "/Data/Sound/eGem.wav", "start": 159751788, "end": 159780570}, {"filename": "/Data/Sound/eHitCristal.wav", "start": 159780570, "end": 159798394}, {"filename": "/Data/Sound/eHitGate.wav", "start": 159798394, "end": 159833486}, {"filename": "/Data/Sound/eHitGate2.wav", "start": 159833486, "end": 159883830}, {"filename": "/Data/Sound/eIceArrow.wav", "start": 159883830, "end": 160029576}, {"filename": "/Data/Sound/eMedal.wav", "start": 160029576, "end": 160050462}, {"filename": "/Data/Sound/eMeteorite.wav", "start": 160050462, "end": 160121210}, {"filename": "/Data/Sound/eMix.wav", "start": 160121210, "end": 160676608}, {"filename": "/Data/Sound/ePhoenixExp.wav", "start": 160676608, "end": 160702878}, {"filename": "/Data/Sound/ePiercing.wav", "start": 160702878, "end": 160743658}, {"filename": "/Data/Sound/eRaidShoot.wav", "start": 160743658, "end": 160863136}, {"filename": "/Data/Sound/eRidingSpear.wav", "start": 160863136, "end": 160928160}, {"filename": "/Data/Sound/eShortBlow1.wav", "start": 160928160, "end": 160950578}, {"filename": "/Data/Sound/eShortBlow2.wav", "start": 160950578, "end": 160959400}, {"filename": "/Data/Sound/eShortBlow3.wav", "start": 160959400, "end": 160972930}, {"filename": "/Data/Sound/eSoulBarrier.wav", "start": 160972930, "end": 161044104}, {"filename": "/Data/Sound/eSwellLife.wav", "start": 161044104, "end": 161258258}, {"filename": "/Data/Sound/eSwingLightSword.wav", "start": 161258258, "end": 161311254}, {"filename": "/Data/Sound/eSwingWeapon1.wav", "start": 161311254, "end": 161332930}, {"filename": "/Data/Sound/eSwingWeapon2.wav", "start": 161332930, "end": 161353232}, {"filename": "/Data/Sound/eTelekinesis.wav", "start": 161353232, "end": 161491278}, {"filename": "/Data/Sound/eThunder.wav", "start": 161491278, "end": 161556130}, {"filename": "/Data/Sound/iAlert.wav", "start": 161556130, "end": 161685988}, {"filename": "/Data/Sound/iBloodCastle.wav", "start": 161685988, "end": 166410602}, {"filename": "/Data/Sound/iButtonClick.wav", "start": 166410602, "end": 166426662}, {"filename": "/Data/Sound/iButtonError.wav", "start": 166426662, "end": 166444006}, {"filename": "/Data/Sound/iButtonMove.wav", "start": 166444006, "end": 166490882}, {"filename": "/Data/Sound/iCreateWindow.wav", "start": 166490882, "end": 166579668}, {"filename": "/Data/Sound/iRepair.wav", "start": 166579668, "end": 166587450}, {"filename": "/Data/Sound/iTitle.wav", "start": 166587450, "end": 166947576}, {"filename": "/Data/Sound/iWhisper.wav", "start": 166947576, "end": 166973788}, {"filename": "/Data/Sound/iron1.wav", "start": 166973788, "end": 167153854}, {"filename": "/Data/Sound/iron_attack1.wav", "start": 167153854, "end": 167324536}, {"filename": "/Data/Sound/jaikan1.wav", "start": 167324536, "end": 167653194}, {"filename": "/Data/Sound/jaikan2.wav", "start": 167653194, "end": 167763632}, {"filename": "/Data/Sound/jaikan_attack1.wav", "start": 167763632, "end": 167996334}, {"filename": "/Data/Sound/jaikan_attack2.wav", "start": 167996334, "end": 168085432}, {"filename": "/Data/Sound/jaikan_die.wav", "start": 168085432, "end": 168413310}, {"filename": "/Data/Sound/mAlquamos1.wav", "start": 168413310, "end": 168614646}, {"filename": "/Data/Sound/mAlquamosAttack1.wav", "start": 168614646, "end": 168762726}, {"filename": "/Data/Sound/mAlquamosDie.wav", "start": 168762726, "end": 168900342}, {"filename": "/Data/Sound/mArgon1.wav", "start": 168900342, "end": 169012796}, {"filename": "/Data/Sound/mArgon2.wav", "start": 169012796, "end": 169111658}, {"filename": "/Data/Sound/mArgonAttack1.wav", "start": 169111658, "end": 169216868}, {"filename": "/Data/Sound/mArgonAttack2.wav", "start": 169216868, "end": 169369734}, {"filename": "/Data/Sound/mArgonDie.wav", "start": 169369734, "end": 169489740}, {"filename": "/Data/Sound/mAssassin1.wav", "start": 169489740, "end": 169609922}, {"filename": "/Data/Sound/mAssassinAttack1.wav", "start": 169609922, "end": 169658890}, {"filename": "/Data/Sound/mAssassinAttack2.wav", "start": 169658890, "end": 169706848}, {"filename": "/Data/Sound/mAssassinDie.wav", "start": 169706848, "end": 169775080}, {"filename": "/Data/Sound/mBahamut1.wav", "start": 169775080, "end": 170201658}, {"filename": "/Data/Sound/mBali1.wav", "start": 170201658, "end": 170499088}, {"filename": "/Data/Sound/mBali2.wav", "start": 170499088, "end": 170841834}, {"filename": "/Data/Sound/mBaliAttack1.wav", "start": 170841834, "end": 170901168}, {"filename": "/Data/Sound/mBaliAttack2.wav", "start": 170901168, "end": 170960346}, {"filename": "/Data/Sound/mBalrog1.wav", "start": 170960346, "end": 171167688}, {"filename": "/Data/Sound/mBalrog2.wav", "start": 171167688, "end": 171401160}, {"filename": "/Data/Sound/mBalrogDie.wav", "start": 171401160, "end": 171545516}, {"filename": "/Data/Sound/mBeetle1.wav", "start": 171545516, "end": 171592566}, {"filename": "/Data/Sound/mBeetleAttack1.wav", "start": 171592566, "end": 171693268}, {"filename": "/Data/Sound/mBeetleDie.wav", "start": 171693268, "end": 171801890}, {"filename": "/Data/Sound/mBepar1.wav", "start": 171801890, "end": 171963572}, {"filename": "/Data/Sound/mBepar2.wav", "start": 171963572, "end": 172075522}, {"filename": "/Data/Sound/mBlackSkullAttack.wav", "start": 172075522, "end": 172133880}, {"filename": "/Data/Sound/mBlackSkullDie.wav", "start": 172133880, "end": 172791518}, {"filename": "/Data/Sound/mBone1.WAV", "start": 172791518, "end": 172805463}, {"filename": "/Data/Sound/mBone2.wav", "start": 172805463, "end": 172957701}, {"filename": "/Data/Sound/mBudge1.wav", "start": 172957701, "end": 172994681}, {"filename": "/Data/Sound/mBudgeAttack1.wav", "start": 172994681, "end": 173000435}, {"filename": "/Data/Sound/mBudgeDie.wav", "start": 173000435, "end": 173035631}, {"filename": "/Data/Sound/mBull1.wav", "start": 173035631, "end": 173072103}, {"filename": "/Data/Sound/mBull2.wav", "start": 173072103, "end": 173114387}, {"filename": "/Data/Sound/mBullAttack1.wav", "start": 173114387, "end": 173183687}, {"filename": "/Data/Sound/mBullAttack2.wav", "start": 173183687, "end": 173196819}, {"filename": "/Data/Sound/mBullDie.wav", "start": 173196819, "end": 173250077}, {"filename": "/Data/Sound/mChangeup.wav", "start": 173250077, "end": 173415583}, {"filename": "/Data/Sound/mCursedKing1.wav", "start": 173415583, "end": 174134671}, {"filename": "/Data/Sound/mCursedKing2.wav", "start": 174134671, "end": 174743575}, {"filename": "/Data/Sound/mCursedKingDie1.wav", "start": 174743575, "end": 174990833}, {"filename": "/Data/Sound/mDarkKnight1.wav", "start": 174990833, "end": 175113729}, {"filename": "/Data/Sound/mDarkKnight2.wav", "start": 175113729, "end": 175300517}, {"filename": "/Data/Sound/mDarkKnightAttack1.wav", "start": 175300517, "end": 175377893}, {"filename": "/Data/Sound/mDarkKnightAttack2.wav", "start": 175377893, "end": 175448841}, {"filename": "/Data/Sound/mDarkKnightDie.wav", "start": 175448841, "end": 175499347}, {"filename": "/Data/Sound/mDrakan1.wav", "start": 175499347, "end": 175561775}, {"filename": "/Data/Sound/mDrakanAttack1.wav", "start": 175561775, "end": 175575867}, {"filename": "/Data/Sound/mDrakanDie.wav", "start": 175575867, "end": 175804849}, {"filename": "/Data/Sound/mGhaintOrgerDie.wav", "start": 175804849, "end": 175912963}, {"filename": "/Data/Sound/mGhost1.wav", "start": 175912963, "end": 176084649}, {"filename": "/Data/Sound/mGhost2.wav", "start": 176084649, "end": 176296635}, {"filename": "/Data/Sound/mGhostAttack1.wav", "start": 176296635, "end": 176341857}, {"filename": "/Data/Sound/mGhostAttack2.wav", "start": 176341857, "end": 176381773}, {"filename": "/Data/Sound/mGhostDie.wav", "start": 176381773, "end": 176540789}, {"filename": "/Data/Sound/mGiant1.wav", "start": 176540789, "end": 176649759}, {"filename": "/Data/Sound/mGiant2.wav", "start": 176649759, "end": 176767021}, {"filename": "/Data/Sound/mGiantAttack1.wav", "start": 176767021, "end": 176771031}, {"filename": "/Data/Sound/mGiantAttack2.wav", "start": 176771031, "end": 176827271}, {"filename": "/Data/Sound/mGiantDie.wav", "start": 176827271, "end": 176904273}, {"filename": "/Data/Sound/mGiantWalk.wav", "start": 176904273, "end": 176915693}, {"filename": "/Data/Sound/mGoblin1.wav", "start": 176915693, "end": 177029511}, {"filename": "/Data/Sound/mGoblin2.wav", "start": 177029511, "end": 177204169}, {"filename": "/Data/Sound/mGoblinAttack1.wav", "start": 177204169, "end": 177340499}, {"filename": "/Data/Sound/mGoblinAttack2.wav", "start": 177340499, "end": 177458449}, {"filename": "/Data/Sound/mGoblinDie.wav", "start": 177458449, "end": 177644187}, {"filename": "/Data/Sound/mGolem1.wav", "start": 177644187, "end": 177841237}, {"filename": "/Data/Sound/mGolem2.wav", "start": 177841237, "end": 178033531}, {"filename": "/Data/Sound/mGolemAttack1.wav", "start": 178033531, "end": 178188073}, {"filename": "/Data/Sound/mGolemAttack2.wav", "start": 178188073, "end": 178384335}, {"filename": "/Data/Sound/mGolemDie.wav", "start": 178384335, "end": 178584801}, {"filename": "/Data/Sound/mGorgon1.wav", "start": 178584801, "end": 179083451}, {"filename": "/Data/Sound/mGorgon2.wav", "start": 179083451, "end": 179250225}, {"filename": "/Data/Sound/mGorgonAttack1.wav", "start": 179250225, "end": 179354103}, {"filename": "/Data/Sound/mGorgonAttack2.wav", "start": 179354103, "end": 179409801}, {"filename": "/Data/Sound/mGorgonDie.wav", "start": 179409801, "end": 179498967}, {"filename": "/Data/Sound/mHellSpider1.wav", "start": 179498967, "end": 179543309}, {"filename": "/Data/Sound/mHellSpiderAttack1.wav", "start": 179543309, "end": 179581473}, {"filename": "/Data/Sound/mHellSpiderDie.wav", "start": 179581473, "end": 179671001}, {"filename": "/Data/Sound/mHomord1.wav", "start": 179671001, "end": 179854883}, {"filename": "/Data/Sound/mHomord2.wav", "start": 179854883, "end": 180210281}, {"filename": "/Data/Sound/mHomordAttack1.wav", "start": 180210281, "end": 180254679}, {"filename": "/Data/Sound/mHomordDie.wav", "start": 180254679, "end": 180290379}, {"filename": "/Data/Sound/mHound1.wav", "start": 180290379, "end": 180350161}, {"filename": "/Data/Sound/mHound2.wav", "start": 180350161, "end": 180459043}, {"filename": "/Data/Sound/mHoundAttack1.wav", "start": 180459043, "end": 180508195}, {"filename": "/Data/Sound/mHoundAttack2.wav", "start": 180508195, "end": 180538147}, {"filename": "/Data/Sound/mHoundDie.wav", "start": 180538147, "end": 180594719}, {"filename": "/Data/Sound/mHunter1.wav", "start": 180594719, "end": 180772201}, {"filename": "/Data/Sound/mHunter2.wav", "start": 180772201, "end": 180946743}, {"filename": "/Data/Sound/mHunterAttack1.wav", "start": 180946743, "end": 181102709}, {"filename": "/Data/Sound/mHunterAttack2.wav", "start": 181102709, "end": 181260079}, {"filename": "/Data/Sound/mHunterDie.wav", "start": 181260079, "end": 181333681}, {"filename": "/Data/Sound/mHydra1.wav", "start": 181333681, "end": 181692215}, {"filename": "/Data/Sound/mHydraAttack1.wav", "start": 181692215, "end": 181844981}, {"filename": "/Data/Sound/mIceMonster1.wav", "start": 181844981, "end": 182010473}, {"filename": "/Data/Sound/mIceMonster2.wav", "start": 182010473, "end": 182114179}, {"filename": "/Data/Sound/mIceMonsterDie.wav", "start": 182114179, "end": 182233909}, {"filename": "/Data/Sound/mIceQueen1.wav", "start": 182233909, "end": 182419385}, {"filename": "/Data/Sound/mIceQueen2.wav", "start": 182419385, "end": 182862123}, {"filename": "/Data/Sound/mIceQueenAttack1.wav", "start": 182862123, "end": 183104549}, {"filename": "/Data/Sound/mIceQueenAttack2.wav", "start": 183104549, "end": 183179175}, {"filename": "/Data/Sound/mIceQueenDie.wav", "start": 183179175, "end": 183340073}, {"filename": "/Data/Sound/mLarva1.wav", "start": 183340073, "end": 183359027}, {"filename": "/Data/Sound/mLarva2.wav", "start": 183359027, "end": 183379649}, {"filename": "/Data/Sound/mLizardKing1.wav", "start": 183379649, "end": 183550951}, {"filename": "/Data/Sound/mLizardKing2.wav", "start": 183550951, "end": 183705729}, {"filename": "/Data/Sound/mMagicSkull.wav", "start": 183705729, "end": 183886731}, {"filename": "/Data/Sound/mMegaCrust1.wav", "start": 183886731, "end": 183908793}, {"filename": "/Data/Sound/mMegaCrustAttack1.wav", "start": 183908793, "end": 183978781}, {"filename": "/Data/Sound/mMegaCrustDie.wav", "start": 183978781, "end": 184026743}, {"filename": "/Data/Sound/mMolt1.wav", "start": 184026743, "end": 184045797}, {"filename": "/Data/Sound/mMoltAttack1.wav", "start": 184045797, "end": 184064851}, {"filename": "/Data/Sound/mMoltDie.wav", "start": 184064851, "end": 184123897}, {"filename": "/Data/Sound/mOgre1.wav", "start": 184123897, "end": 184216281}, {"filename": "/Data/Sound/mOgre2.wav", "start": 184216281, "end": 184261515}, {"filename": "/Data/Sound/mOgreAttack1.wav", "start": 184261515, "end": 184383305}, {"filename": "/Data/Sound/mOgreAttack2.wav", "start": 184383305, "end": 184446855}, {"filename": "/Data/Sound/mOgreDie.wav", "start": 184446855, "end": 184535173}, {"filename": "/Data/Sound/mOrcArcherAttack1.wav", "start": 184535173, "end": 184558173}, {"filename": "/Data/Sound/mOrcCapAttack1.wav", "start": 184558173, "end": 184675701}, {"filename": "/Data/Sound/mPhantom1.wav", "start": 184675701, "end": 184681447}, {"filename": "/Data/Sound/mPhantomAttack1.wav", "start": 184681447, "end": 184806985}, {"filename": "/Data/Sound/mPhantomDie.wav", "start": 184806985, "end": 185118325}, {"filename": "/Data/Sound/mPhoenix1.wav", "start": 185118325, "end": 185333639}, {"filename": "/Data/Sound/mPhoenix2.wav", "start": 185333639, "end": 185430379}, {"filename": "/Data/Sound/mPhoenixAttack1.wav", "start": 185430379, "end": 185562613}, {"filename": "/Data/Sound/mQuest.wav", "start": 185562613, "end": 185739803}, {"filename": "/Data/Sound/mRainner1.wav", "start": 185739803, "end": 186075639}, {"filename": "/Data/Sound/mRainnerAttack1.wav", "start": 186075639, "end": 186095821}, {"filename": "/Data/Sound/mRainnerDie.wav", "start": 186095821, "end": 186158891}, {"filename": "/Data/Sound/mRedSkull.wav", "start": 186158891, "end": 186229839}, {"filename": "/Data/Sound/mRedSkullAttack.wav", "start": 186229839, "end": 186335945}, {"filename": "/Data/Sound/mRedSkullDie.wav", "start": 186335945, "end": 186444219}, {"filename": "/Data/Sound/mSatanAttack1.wav", "start": 186444219, "end": 186505453}, {"filename": "/Data/Sound/mScorpion1.wav", "start": 186505453, "end": 186578499}, {"filename": "/Data/Sound/mScorpion2.wav", "start": 186578499, "end": 186699421}, {"filename": "/Data/Sound/mScorpionAttack1.wav", "start": 186699421, "end": 186852987}, {"filename": "/Data/Sound/mScorpionAttack2.wav", "start": 186852987, "end": 186971541}, {"filename": "/Data/Sound/mScorpionDie.wav", "start": 186971541, "end": 187124875}, {"filename": "/Data/Sound/mShadow1.wav", "start": 187124875, "end": 187243983}, {"filename": "/Data/Sound/mShadow2.wav", "start": 187243983, "end": 187326855}, {"filename": "/Data/Sound/mShadowAttack1.wav", "start": 187326855, "end": 187389395}, {"filename": "/Data/Sound/mShadowAttack2.wav", "start": 187389395, "end": 187445979}, {"filename": "/Data/Sound/mShadowDie.wav", "start": 187445979, "end": 187487285}, {"filename": "/Data/Sound/mSpider1.wav", "start": 187487285, "end": 187492317}, {"filename": "/Data/Sound/mValkyrie1.wav", "start": 187492317, "end": 187823443}, {"filename": "/Data/Sound/mValkyrieDie.wav", "start": 187823443, "end": 188017653}, {"filename": "/Data/Sound/mWizard1.wav", "start": 188017653, "end": 188166183}, {"filename": "/Data/Sound/mWizard2.wav", "start": 188166183, "end": 188483529}, {"filename": "/Data/Sound/mWizardAttack1.wav", "start": 188483529, "end": 188536397}, {"filename": "/Data/Sound/mWizardAttack2.wav", "start": 188536397, "end": 188636947}, {"filename": "/Data/Sound/mWizardDie.wav", "start": 188636947, "end": 188674343}, {"filename": "/Data/Sound/mWoodMon1.wav", "start": 188674343, "end": 188779421}, {"filename": "/Data/Sound/mWoodMon2.wav", "start": 188779421, "end": 188942435}, {"filename": "/Data/Sound/mWoodMonAttack1.wav", "start": 188942435, "end": 189093501}, {"filename": "/Data/Sound/mWoodMonAttack2.wav", "start": 189093501, "end": 189185479}, {"filename": "/Data/Sound/mWoodMonDie.wav", "start": 189185479, "end": 189322881}, {"filename": "/Data/Sound/mWorm1.wav", "start": 189322881, "end": 189444019}, {"filename": "/Data/Sound/mWorm2.wav", "start": 189444019, "end": 189576745}, {"filename": "/Data/Sound/mWormDie.wav", "start": 189576745, "end": 189633805}, {"filename": "/Data/Sound/mYeti1.wav", "start": 189633805, "end": 189954979}, {"filename": "/Data/Sound/mYeti2.wav", "start": 189954979, "end": 190293117}, {"filename": "/Data/Sound/mYetiAttack1.wav", "start": 190293117, "end": 190430029}, {"filename": "/Data/Sound/mYetiDie.wav", "start": 190430029, "end": 190521639}, {"filename": "/Data/Sound/mutant1.wav", "start": 190521639, "end": 190841645}, {"filename": "/Data/Sound/mutant2.wav", "start": 190841645, "end": 191187135}, {"filename": "/Data/Sound/mutant_attack1.wav", "start": 191187135, "end": 191324333}, {"filename": "/Data/Sound/nBlackSmith.wav", "start": 191324333, "end": 191354569}, {"filename": "/Data/Sound/nHarp.wav", "start": 191354569, "end": 192164103}, {"filename": "/Data/Sound/nMix.wav", "start": 192164103, "end": 192915545}, {"filename": "/Data/Sound/pDrink.wav", "start": 192915545, "end": 192996183}, {"filename": "/Data/Sound/pDropItem.wav", "start": 192996183, "end": 193018841}, {"filename": "/Data/Sound/pDropMoney.wav", "start": 193018841, "end": 193188543}, {"filename": "/Data/Sound/pEatApple.wav", "start": 193188543, "end": 193255477}, {"filename": "/Data/Sound/pEnergy.wav", "start": 193255477, "end": 193316113}, {"filename": "/Data/Sound/pFemaleScream1.wav", "start": 193316113, "end": 193405579}, {"filename": "/Data/Sound/pFemaleScream2.wav", "start": 193405579, "end": 193515785}, {"filename": "/Data/Sound/pGetItem.wav", "start": 193515785, "end": 193528753}, {"filename": "/Data/Sound/pHeartBeat.wav", "start": 193528753, "end": 193859603}, {"filename": "/Data/Sound/pLevelUp.wav", "start": 193859603, "end": 194122351}, {"filename": "/Data/Sound/pMaleDie.wav", "start": 194122351, "end": 194200481}, {"filename": "/Data/Sound/pMaleScream1.wav", "start": 194200481, "end": 194244123}, {"filename": "/Data/Sound/pMaleScream2.wav", "start": 194244123, "end": 194297101}, {"filename": "/Data/Sound/pMaleScream3.wav", "start": 194297101, "end": 194367199}, {"filename": "/Data/Sound/pSwim.wav", "start": 194367199, "end": 194511925}, {"filename": "/Data/Sound/pWalk(Grass).wav", "start": 194511925, "end": 194537925}, {"filename": "/Data/Sound/pWalk(Snow).wav", "start": 194537925, "end": 194553585}, {"filename": "/Data/Sound/pWalk(Soil).wav", "start": 194553585, "end": 194566459}, {"filename": "/Data/Sound/sAquaFlash.wav", "start": 194566459, "end": 194739953}, {"filename": "/Data/Sound/sEvil.wav", "start": 194739953, "end": 195034611}, {"filename": "/Data/Sound/sFlame.wav", "start": 195034611, "end": 195157641}, {"filename": "/Data/Sound/sHellFire.wav", "start": 195157641, "end": 195363923}, {"filename": "/Data/Sound/sIce.wav", "start": 195363923, "end": 195493545}, {"filename": "/Data/Sound/sKnightDefense.wav", "start": 195493545, "end": 195686331}, {"filename": "/Data/Sound/sKnightSkill1.wav", "start": 195686331, "end": 195781899}, {"filename": "/Data/Sound/sKnightSkill2.wav", "start": 195781899, "end": 195818343}, {"filename": "/Data/Sound/sKnightSkill3.wav", "start": 195818343, "end": 195856067}, {"filename": "/Data/Sound/sKnightSkill4.wav", "start": 195856067, "end": 195907007}, {"filename": "/Data/Sound/sMagic.wav", "start": 195907007, "end": 195981193}, {"filename": "/Data/Sound/sTornado.wav", "start": 195981193, "end": 196376911}, {"filename": "/Data/World1/EncTerrain1.att", "start": 196376911, "end": 196507987}, {"filename": "/Data/World1/EncTerrain1.map", "start": 196507987, "end": 196704597}, {"filename": "/Data/World1/EncTerrain1.obj", "start": 196704597, "end": 196790701}, {"filename": "/Data/World1/Sky.bmp", "start": 196790701, "end": 197053925}, {"filename": "/Data/World1/Terrain1.att", "start": 197053925, "end": 197119464}, {"filename": "/Data/World1/TerrainHeight.OZB", "start": 197119464, "end": 197186084}, {"filename": "/Data/World1/TerrainLight.OZJ", "start": 197186084, "end": 197256927}, {"filename": "/Data/World1/TileGrass01.OZJ", "start": 197256927, "end": 197327359}, {"filename": "/Data/World1/TileGrass01.OZT", "start": 197327359, "end": 197392943}, {"filename": "/Data/World1/TileGrass02.OZJ", "start": 197392943, "end": 197424178}, {"filename": "/Data/World1/TileGround01.OZJ", "start": 197424178, "end": 197520460}, {"filename": "/Data/World1/TileGround02.OZJ", "start": 197520460, "end": 197544514}, {"filename": "/Data/World1/TileGround03.OZJ", "start": 197544514, "end": 197579076}, {"filename": "/Data/World1/TileRock01.OZJ", "start": 197579076, "end": 197679520}, {"filename": "/Data/World1/TileRock02.OZJ", "start": 197679520, "end": 197711093}, {"filename": "/Data/World1/TileWater01.OZJ", "start": 197711093, "end": 197774093}, {"filename": "/Data/World1/TileWood01.OZJ", "start": 197774093, "end": 197808486}, {"filename": "/Data/World1/leaf01.OZT", "start": 197808486, "end": 197809558}, {"filename": "/Data/World1/rain01.OZT", "start": 197809558, "end": 197810118}, {"filename": "/Data/World1/rain02.OZT", "start": 197810118, "end": 197812214}, {"filename": "/Data/World10/EncTerrain10.att", "start": 197812214, "end": 197877754}, {"filename": "/Data/World10/EncTerrain10.map", "start": 197877754, "end": 198074364}, {"filename": "/Data/World10/EncTerrain10.obj", "start": 198074364, "end": 198091288}, {"filename": "/Data/World10/Terrain10.att", "start": 198091288, "end": 198156827}, {"filename": "/Data/World10/TerrainHeight.OZB", "start": 198156827, "end": 198223447}, {"filename": "/Data/World10/TerrainLight.OZJ", "start": 198223447, "end": 198227600}, {"filename": "/Data/World10/TileGrass01.OZJ", "start": 198227600, "end": 198286259}, {"filename": "/Data/World10/TileGrass02.OZJ", "start": 198286259, "end": 198382735}, {"filename": "/Data/World10/TileGround01.OZJ", "start": 198382735, "end": 198417902}, {"filename": "/Data/World10/TileGround03.OZJ", "start": 198417902, "end": 198438722}, {"filename": "/Data/World10/TileRock01.OZJ", "start": 198438722, "end": 198463042}, {"filename": "/Data/World10/TileRock02.OZJ", "start": 198463042, "end": 198521216}, {"filename": "/Data/World10/TileRock03.OZJ", "start": 198521216, "end": 198590369}, {"filename": "/Data/World10/TileRock04.OZJ", "start": 198590369, "end": 198678384}, {"filename": "/Data/World10/TileWood01.OZJ", "start": 198678384, "end": 198719127}, {"filename": "/Data/World10/leaf02.OZJ", "start": 198719127, "end": 198723628}, {"filename": "/Data/World10/rain03.OZT", "start": 198723628, "end": 198727772}, {"filename": "/Data/World11/EncTerrain11.att", "start": 198727772, "end": 198793312}, {"filename": "/Data/World11/EncTerrain11.map", "start": 198793312, "end": 198989922}, {"filename": "/Data/World11/EncTerrain11.obj", "start": 198989922, "end": 199010026}, {"filename": "/Data/World11/Terrain11.att", "start": 199010026, "end": 199075565}, {"filename": "/Data/World11/TerrainHeight.OZB", "start": 199075565, "end": 199142185}, {"filename": "/Data/World11/TerrainLight.OZJ", "start": 199142185, "end": 199164884}, {"filename": "/Data/World11/TileGrass01.OZJ", "start": 199164884, "end": 199276282}, {"filename": "/Data/World11/leaf01.OZT", "start": 199276282, "end": 199277354}, {"filename": "/Data/World11/leaf02.OZJ", "start": 199277354, "end": 199281799}, {"filename": "/Data/World11/rain01.OZT", "start": 199281799, "end": 199282359}, {"filename": "/Data/World12/EncTerrain12.att", "start": 199282359, "end": 199347899}, {"filename": "/Data/World12/EncTerrain12.map", "start": 199347899, "end": 199544509}, {"filename": "/Data/World12/EncTerrain12.obj", "start": 199544509, "end": 199550813}, {"filename": "/Data/World12/Terrain12.att", "start": 199550813, "end": 199616352}, {"filename": "/Data/World12/TerrainHeight.OZB", "start": 199616352, "end": 199682972}, {"filename": "/Data/World12/TerrainLight.OZJ", "start": 199682972, "end": 199688960}, {"filename": "/Data/World12/TileGrass01.OZJ", "start": 199688960, "end": 199768586}, {"filename": "/Data/World12/TileGrass01.OZT", "start": 199768586, "end": 199834170}, {"filename": "/Data/World12/TileGrass02.OZJ", "start": 199834170, "end": 199914675}, {"filename": "/Data/World12/TileGrass03.OZT", "start": 199914675, "end": 200045795}, {"filename": "/Data/World12/TileGround02.OZJ", "start": 200045795, "end": 200115530}, {"filename": "/Data/World12/TileGround03.OZJ", "start": 200115530, "end": 200188475}, {"filename": "/Data/World12/TileRock01.OZJ", "start": 200188475, "end": 200300674}, {"filename": "/Data/World12/TileRock02.OZJ", "start": 200300674, "end": 200350483}, {"filename": "/Data/World12/TileRock03.OZJ", "start": 200350483, "end": 200383759}, {"filename": "/Data/World12/TileRock04.OZJ", "start": 200383759, "end": 200500291}, {"filename": "/Data/World12/TileWater01.OZJ", "start": 200500291, "end": 200560570}, {"filename": "/Data/World12/TileWood01.OZJ", "start": 200560570, "end": 200597458}, {"filename": "/Data/World12/leaf01.OZT", "start": 200597458, "end": 200598530}, {"filename": "/Data/World12/leaf02.OZJ", "start": 200598530, "end": 200602975}, {"filename": "/Data/World12/rain01.OZT", "start": 200602975, "end": 200603535}, {"filename": "/Data/World2/EncTerrain2.att", "start": 200603535, "end": 200669075}, {"filename": "/Data/World2/EncTerrain2.map", "start": 200669075, "end": 200865685}, {"filename": "/Data/World2/EncTerrain2.obj", "start": 200865685, "end": 201000329}, {"filename": "/Data/World2/Sky.bmp", "start": 201000329, "end": 202048961}, {"filename": "/Data/World2/Terrain2.att", "start": 202048961, "end": 202114500}, {"filename": "/Data/World2/TerrainHeight.OZB", "start": 202114500, "end": 202181120}, {"filename": "/Data/World2/TerrainLight.OZJ", "start": 202181120, "end": 202244546}, {"filename": "/Data/World2/TileGrass01.OZJ", "start": 202244546, "end": 202278943}, {"filename": "/Data/World2/TileGrass02.OZJ", "start": 202278943, "end": 202310178}, {"filename": "/Data/World2/TileGround01.OZJ", "start": 202310178, "end": 202420087}, {"filename": "/Data/World2/TileGround02.OZJ", "start": 202420087, "end": 202442516}, {"filename": "/Data/World2/TileGround03.OZJ", "start": 202442516, "end": 202478829}, {"filename": "/Data/World2/TileRock01.OZJ", "start": 202478829, "end": 202550784}, {"filename": "/Data/World2/TileRock02.OZJ", "start": 202550784, "end": 202583516}, {"filename": "/Data/World2/TileWater01.OZJ", "start": 202583516, "end": 202658401}, {"filename": "/Data/World2/TileWood01.OZJ", "start": 202658401, "end": 202691627}, {"filename": "/Data/World3/EncTerrain3.att", "start": 202691627, "end": 202757167}, {"filename": "/Data/World3/EncTerrain3.map", "start": 202757167, "end": 202953777}, {"filename": "/Data/World3/EncTerrain3.obj", "start": 202953777, "end": 203018101}, {"filename": "/Data/World3/Sky.bmp", "start": 203018101, "end": 204066733}, {"filename": "/Data/World3/Terrain3.att", "start": 204066733, "end": 204132272}, {"filename": "/Data/World3/TerrainHeight.OZB", "start": 204132272, "end": 204198892}, {"filename": "/Data/World3/TerrainLight.OZJ", "start": 204198892, "end": 204263074}, {"filename": "/Data/World3/TileGrass01.OZJ", "start": 204263074, "end": 204326023}, {"filename": "/Data/World3/TileGrass02.OZJ", "start": 204326023, "end": 204345734}, {"filename": "/Data/World3/TileGrass02.OZT", "start": 204345734, "end": 204411318}, {"filename": "/Data/World3/TileGround01.OZJ", "start": 204411318, "end": 204496712}, {"filename": "/Data/World3/TileGround02.OZJ", "start": 204496712, "end": 204519760}, {"filename": "/Data/World3/TileGround03.OZJ", "start": 204519760, "end": 204550859}, {"filename": "/Data/World3/TileRock01.OZJ", "start": 204550859, "end": 204608076}, {"filename": "/Data/World3/TileRock02.OZJ", "start": 204608076, "end": 204628812}, {"filename": "/Data/World3/TileRock03.OZJ", "start": 204628812, "end": 204651131}, {"filename": "/Data/World3/TileRock04.OZJ", "start": 204651131, "end": 204672379}, {"filename": "/Data/World3/TileRock05.OZJ", "start": 204672379, "end": 204761584}, {"filename": "/Data/World3/TileRock06.OZJ", "start": 204761584, "end": 204773931}, {"filename": "/Data/World3/TileRock07.OZJ", "start": 204773931, "end": 204866543}, {"filename": "/Data/World3/TileWater01.OZJ", "start": 204866543, "end": 204934990}, {"filename": "/Data/World3/TileWood01.OZJ", "start": 204934990, "end": 204964620}, {"filename": "/Data/World3/leaf01.OZJ", "start": 204964620, "end": 204966791}, {"filename": "/Data/World3/leaf01.OZT", "start": 204966791, "end": 204970935}, {"filename": "/Data/World3/leaf02.OZJ", "start": 204970935, "end": 204973175}, {"filename": "/Data/World4/EncTerrain4.att", "start": 204973175, "end": 205038715}, {"filename": "/Data/World4/EncTerrain4.map", "start": 205038715, "end": 205235325}, {"filename": "/Data/World4/EncTerrain4.obj", "start": 205235325, "end": 205517299}, {"filename": "/Data/World4/Sky.bmp", "start": 205517299, "end": 206565929}, {"filename": "/Data/World4/Terrain4.att", "start": 206565929, "end": 206631468}, {"filename": "/Data/World4/TerrainHeight.OZB", "start": 206631468, "end": 206698088}, {"filename": "/Data/World4/TerrainLight.OZJ", "start": 206698088, "end": 206734989}, {"filename": "/Data/World4/TileGrass01.OZJ", "start": 206734989, "end": 206842033}, {"filename": "/Data/World4/TileGrass01.OZT", "start": 206842033, "end": 206907617}, {"filename": "/Data/World4/TileGrass03.OZT", "start": 206907617, "end": 207038737}, {"filename": "/Data/World4/TileGround01.OZJ", "start": 207038737, "end": 207070036}, {"filename": "/Data/World4/TileGround03.OZJ", "start": 207070036, "end": 207101602}, {"filename": "/Data/World4/TileRock01.OZJ", "start": 207101602, "end": 207136099}, {"filename": "/Data/World4/TileRock02.OZJ", "start": 207136099, "end": 207204903}, {"filename": "/Data/World4/TileRock03.OZJ", "start": 207204903, "end": 207303045}, {"filename": "/Data/World4/TileRock04.OZJ", "start": 207303045, "end": 207393829}, {"filename": "/Data/World4/TileWater01.OZJ", "start": 207393829, "end": 207496354}, {"filename": "/Data/World4/TileWood01.OZJ", "start": 207496354, "end": 207529580}, {"filename": "/Data/World4/leaf01.OZT", "start": 207529580, "end": 207530652}, {"filename": "/Data/World5/EncTerrain5.att", "start": 207530652, "end": 207596192}, {"filename": "/Data/World5/EncTerrain5.map", "start": 207596192, "end": 207792802}, {"filename": "/Data/World5/EncTerrain5.obj", "start": 207792802, "end": 207954206}, {"filename": "/Data/World5/Sky.bmp", "start": 207954206, "end": 209002838}, {"filename": "/Data/World5/Terrain5.att", "start": 209002838, "end": 209068377}, {"filename": "/Data/World5/TerrainHeight.OZB", "start": 209068377, "end": 209134997}, {"filename": "/Data/World5/TerrainLight.OZJ", "start": 209134997, "end": 209202215}, {"filename": "/Data/World5/TileGrass01.OZJ", "start": 209202215, "end": 209275702}, {"filename": "/Data/World5/TileGrass02.OZJ", "start": 209275702, "end": 209346396}, {"filename": "/Data/World5/TileGround01.OZJ", "start": 209346396, "end": 209363580}, {"filename": "/Data/World5/TileGround02.OZJ", "start": 209363580, "end": 209484393}, {"filename": "/Data/World5/TileGround03.OZJ", "start": 209484393, "end": 209511776}, {"filename": "/Data/World5/TileRock01.OZJ", "start": 209511776, "end": 209539976}, {"filename": "/Data/World5/TileRock02.OZJ", "start": 209539976, "end": 209610801}, {"filename": "/Data/World5/TileRock03.OZJ", "start": 209610801, "end": 209676537}, {"filename": "/Data/World5/TileRock04.OZJ", "start": 209676537, "end": 209759931}, {"filename": "/Data/World5/TileWater01.OZJ", "start": 209759931, "end": 209878987}, {"filename": "/Data/World5/TileWood01.OZJ", "start": 209878987, "end": 209913620}, {"filename": "/Data/World5/leaf02.OZJ", "start": 209913620, "end": 209918065}, {"filename": "/Data/World6/EncTerrain6.att", "start": 209918065, "end": 209983605}, {"filename": "/Data/World6/EncTerrain6.map", "start": 209983605, "end": 210180215}, {"filename": "/Data/World6/EncTerrain6.obj", "start": 210180215, "end": 210180219}, {"filename": "/Data/World6/Terrain6.att", "start": 210180219, "end": 210245758}, {"filename": "/Data/World6/TerrainHeight.OZB", "start": 210245758, "end": 210312376}, {"filename": "/Data/World6/TerrainHeight0.OZB", "start": 210312376, "end": 210378996}, {"filename": "/Data/World6/TerrainLight.OZJ", "start": 210378996, "end": 210443178}, {"filename": "/Data/World6/TerrainLight0.OZJ", "start": 210443178, "end": 210480079}, {"filename": "/Data/World6/Terrainmap.OZB", "start": 210480079, "end": 210546699}, {"filename": "/Data/World6/TileGrass01.OZJ", "start": 210546699, "end": 210646569}, {"filename": "/Data/World6/TileGrass01.OZT", "start": 210646569, "end": 210712153}, {"filename": "/Data/World6/TileGrass012.OZJ", "start": 210712153, "end": 210820630}, {"filename": "/Data/World6/TileGrass013.OZJ", "start": 210820630, "end": 210923155}, {"filename": "/Data/World6/TileGrass02.OZJ", "start": 210923155, "end": 210968197}, {"filename": "/Data/World6/TileGrass021.OZJ", "start": 210968197, "end": 211055570}, {"filename": "/Data/World6/TileGrass023.OZJ", "start": 211055570, "end": 211178257}, {"filename": "/Data/World6/TileGround01.OZJ", "start": 211178257, "end": 211253394}, {"filename": "/Data/World6/TileGround011.OZJ", "start": 211253394, "end": 211288826}, {"filename": "/Data/World6/TileGround012.OZJ", "start": 211288826, "end": 211396192}, {"filename": "/Data/World6/TileGround02.OZJ", "start": 211396192, "end": 211517005}, {"filename": "/Data/World6/TileGround03.OZJ", "start": 211517005, "end": 211649253}, {"filename": "/Data/World6/TileRock01.OZJ", "start": 211649253, "end": 211750206}, {"filename": "/Data/World6/TileRock012.OZJ", "start": 211750206, "end": 211784703}, {"filename": "/Data/World6/TileRock02.OZJ", "start": 211784703, "end": 211895070}, {"filename": "/Data/World6/TileRock021.OZJ", "start": 211895070, "end": 211982443}, {"filename": "/Data/World6/TileRock022.OZJ", "start": 211982443, "end": 212089809}, {"filename": "/Data/World6/TileRock03.OZJ", "start": 212089809, "end": 212160545}, {"filename": "/Data/World6/TileRock04.OZJ", "start": 212160545, "end": 212235852}, {"filename": "/Data/World6/TileWater01.OZJ", "start": 212235852, "end": 212332025}, {"filename": "/Data/World6/TileWood01.OZJ", "start": 212332025, "end": 212440184}, {"filename": "/Data/World6/leaf01.OZT", "start": 212440184, "end": 212441256}, {"filename": "/Data/World6/leaf02.OZJ", "start": 212441256, "end": 212445701}, {"filename": "/Data/World7/EncTerrain7.att", "start": 212445701, "end": 212511241}, {"filename": "/Data/World7/EncTerrain7.map", "start": 212511241, "end": 212707851}, {"filename": "/Data/World7/EncTerrain7.obj", "start": 212707851, "end": 212766115}, {"filename": "/Data/World7/Sky.bmp", "start": 212766115, "end": 213814747}, {"filename": "/Data/World7/Terrain7.att", "start": 213814747, "end": 213880286}, {"filename": "/Data/World7/TerrainHeight.OZB", "start": 213880286, "end": 213946906}, {"filename": "/Data/World7/TerrainLight.OZJ", "start": 213946906, "end": 213969621}, {"filename": "/Data/World7/TileGrass01.OZJ", "start": 213969621, "end": 214080249}, {"filename": "/Data/World7/TileGrass01.OZT", "start": 214080249, "end": 214145833}, {"filename": "/Data/World7/TileGrass02.OZJ", "start": 214145833, "end": 214263855}, {"filename": "/Data/World7/TileGround02.OZJ", "start": 214263855, "end": 214384668}, {"filename": "/Data/World7/TileGround03.OZJ", "start": 214384668, "end": 214421650}, {"filename": "/Data/World7/TileRock01.OZJ", "start": 214421650, "end": 214453870}, {"filename": "/Data/World7/TileRock02.OZJ", "start": 214453870, "end": 214541109}, {"filename": "/Data/World7/TileRock03.OZJ", "start": 214541109, "end": 214623095}, {"filename": "/Data/World7/TileRock04.OZJ", "start": 214623095, "end": 214719809}, {"filename": "/Data/World7/TileWater01.OZJ", "start": 214719809, "end": 214807182}, {"filename": "/Data/World7/TileWood01.OZJ", "start": 214807182, "end": 214847925}, {"filename": "/Data/World7/leaf01.OZT", "start": 214847925, "end": 214848997}, {"filename": "/Data/World7/leaf02.OZJ", "start": 214848997, "end": 214853442}, {"filename": "/Data/World8/EncTerrain8.att", "start": 214853442, "end": 214918982}, {"filename": "/Data/World8/EncTerrain8.map", "start": 214918982, "end": 215115592}, {"filename": "/Data/World8/EncTerrain8.obj", "start": 215115592, "end": 215271746}, {"filename": "/Data/World8/Sky.bmp", "start": 215271746, "end": 216320378}, {"filename": "/Data/World8/Terrain8.att", "start": 216320378, "end": 216385917}, {"filename": "/Data/World8/TerrainHeight.OZB", "start": 216385917, "end": 216452537}, {"filename": "/Data/World8/TerrainLight.OZJ", "start": 216452537, "end": 216518008}, {"filename": "/Data/World8/TileGrass01.OZJ", "start": 216518008, "end": 216626485}, {"filename": "/Data/World8/TileGrass02.OZJ", "start": 216626485, "end": 216749172}, {"filename": "/Data/World8/TileGround01.OZJ", "start": 216749172, "end": 216784339}, {"filename": "/Data/World8/TileGround03.OZJ", "start": 216784339, "end": 216819771}, {"filename": "/Data/World8/TileRock01.OZJ", "start": 216819771, "end": 216850014}, {"filename": "/Data/World8/TileRock02.OZJ", "start": 216850014, "end": 216957380}, {"filename": "/Data/World8/TileRock03.OZJ", "start": 216957380, "end": 217026533}, {"filename": "/Data/World8/TileRock04.OZJ", "start": 217026533, "end": 217119417}, {"filename": "/Data/World8/TileWood01.OZJ", "start": 217119417, "end": 217160160}, {"filename": "/Data/World8/leaf01.OZJ", "start": 217160160, "end": 217164661}, {"filename": "/Data/World8/leaf02.OZJ", "start": 217164661, "end": 217169162}, {"filename": "/Data/World9/EncTerrain9.att", "start": 217169162, "end": 217234702}, {"filename": "/Data/World9/EncTerrain9.map", "start": 217234702, "end": 217431312}, {"filename": "/Data/World9/EncTerrain9.obj", "start": 217431312, "end": 217531126}, {"filename": "/Data/World9/Sky.bmp", "start": 217531126, "end": 218579758}, {"filename": "/Data/World9/Terrain9.att", "start": 218579758, "end": 218645297}, {"filename": "/Data/World9/TerrainHeight.OZB", "start": 218645297, "end": 218711917}, {"filename": "/Data/World9/TerrainLight.OZJ", "start": 218711917, "end": 218790936}, {"filename": "/Data/World9/TileGrass01.OZJ", "start": 218790936, "end": 218902334}, {"filename": "/Data/World9/TileGrass01.OZT", "start": 218902334, "end": 218967918}, {"filename": "/Data/World9/TileGrass02.OZJ", "start": 218967918, "end": 219085940}, {"filename": "/Data/World9/TileGrass03.OZT", "start": 219085940, "end": 219217060}, {"filename": "/Data/World9/TileGround01.OZJ", "start": 219217060, "end": 219252227}, {"filename": "/Data/World9/TileGround02.OZJ", "start": 219252227, "end": 219322352}, {"filename": "/Data/World9/TileGround03.OZJ", "start": 219322352, "end": 219354718}, {"filename": "/Data/World9/TileRock01.OZJ", "start": 219354718, "end": 219466619}, {"filename": "/Data/World9/TileRock02.OZJ", "start": 219466619, "end": 219550368}, {"filename": "/Data/World9/TileRock03.OZJ", "start": 219550368, "end": 219583644}, {"filename": "/Data/World9/TileRock04.OZJ", "start": 219583644, "end": 219699921}, {"filename": "/Data/World9/TileWater01.OZJ", "start": 219699921, "end": 219760200}, {"filename": "/Data/World9/TileWood01.OZJ", "start": 219760200, "end": 219797088}, {"filename": "/config.ini", "start": 219797088, "end": 219798004}], "remote_package_size": 219798004});

  })();

    // All the pre-js content up to here must remain later on, we need to run
    // it.
    if ((typeof ENVIRONMENT_IS_WASM_WORKER != 'undefined' && ENVIRONMENT_IS_WASM_WORKER) || (typeof ENVIRONMENT_IS_PTHREAD != 'undefined' && ENVIRONMENT_IS_PTHREAD) || (typeof ENVIRONMENT_IS_AUDIO_WORKLET != 'undefined' && ENVIRONMENT_IS_AUDIO_WORKLET)) Module['preRun'] = [];
    var necessaryPreJSTasks = Module['preRun'].slice();

    if (!Module['preRun']) throw 'Module.preRun should exist because file support used it; did a pre-js delete it?';
    necessaryPreJSTasks.forEach((task) => {
      if (Module['preRun'].indexOf(task) < 0) throw 'All preRun tasks that exist before user pre-js code should remain after; did you replace Module or modify Module.preRun?';
    });


var programArgs = [];
var thisProgram = './this.program';
var quit_ = (status, toThrow) => {
  throw toThrow;
};

// In MODULARIZE mode _scriptName needs to be captured already at the very top of the page immediately when the page is parsed, so it is generated there
// before the page load. In non-MODULARIZE modes generate it here.
var _scriptName = globalThis.document?.currentScript?.src;

if (typeof __filename != 'undefined') { // Node
  _scriptName = __filename;
} else
if (ENVIRONMENT_IS_WORKER) {
  _scriptName = self.location.href;
}

// `/` should be present at the end if `scriptDirectory` is not empty
var scriptDirectory = '';
function locateFile(path) {
  if (Module['locateFile']) {
    return Module['locateFile'](path, scriptDirectory);
  }
  return scriptDirectory + path;
}

// Hooks that are implemented differently in different runtime environments.
var readAsync, readBinary;

if (ENVIRONMENT_IS_NODE) {
  const isNode = globalThis.process?.versions?.node && globalThis.process?.type != 'renderer';
  if (!isNode) throw new Error('not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)');

  // These modules will usually be used on Node.js. Load them eagerly to avoid
  // the complexity of lazy-loading.
  var fs = require('node:fs');

  scriptDirectory = __dirname + '/';

// include: node_shell_read.js
readBinary = (filename) => {
  // We need to re-wrap `file://` strings to URLs.
  filename = isFileURI(filename) ? new URL(filename) : filename;
  var ret = fs.readFileSync(filename);
  assert(Buffer.isBuffer(ret));
  return ret;
};

readAsync = async (filename, binary = true) => {
  // See the comment in the `readBinary` function.
  filename = isFileURI(filename) ? new URL(filename) : filename;
  var ret = fs.readFileSync(filename, binary ? undefined : 'utf8');
  assert(binary ? Buffer.isBuffer(ret) : typeof ret == 'string');
  return ret;
};
// end include: node_shell_read.js
  if (process.argv.length > 1) {
    thisProgram = process.argv[1].replace(/\\/g, '/');
  }

  programArgs = process.argv.slice(2);

  // MODULARIZE will export the module in the proper place outside, we don't need to export here
  if (typeof module != 'undefined') {
    module['exports'] = Module;
  }

  quit_ = (status, toThrow) => {
    process.exitCode = status;
    throw toThrow;
  };

} else
if (ENVIRONMENT_IS_SHELL) {

} else

// Note that this includes Node.js workers when relevant (pthreads is enabled).
// Node.js workers are detected as a combination of ENVIRONMENT_IS_WORKER and
// ENVIRONMENT_IS_NODE.
if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  try {
    scriptDirectory = new URL('.', _scriptName).href; // includes trailing slash
  } catch {
    // Must be a `blob:` or `data:` URL (e.g. `blob:http://site.com/etc/etc`), we cannot
    // infer anything from them.
  }

  if (!(globalThis.window || globalThis.WorkerGlobalScope)) throw new Error('not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)');

  {
// include: web_or_worker_shell_read.js
if (ENVIRONMENT_IS_WORKER) {
    readBinary = (url) => {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, false);
      xhr.responseType = 'arraybuffer';
      xhr.send(null);
      return new Uint8Array(/** @type{!ArrayBuffer} */(xhr.response));
    };
  }

  readAsync = async (url) => {
    // Fetch has some additional restrictions over XHR, like it can't be used on a file:// url.
    // See https://github.com/github/fetch/pull/92#issuecomment-140665932
    // Cordova or Electron apps are typically loaded from a file:// url.
    // So use XHR on webview if URL is a file URL.
    if (isFileURI(url)) {
      return new Promise((resolve, reject) => {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = () => {
          if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
            resolve(xhr.response);
            return;
          }
          reject(xhr.status);
        };
        xhr.onerror = reject;
        xhr.send(null);
      });
    }
    var response = await fetch(url, { credentials: 'same-origin' });
    if (response.ok) {
      return response.arrayBuffer();
    }
    throw new Error(response.status + ' : ' + response.url);
  };
// end include: web_or_worker_shell_read.js
  }
} else
{
  throw new Error('environment detection error');
}

var out = console.log.bind(console);
var err = console.error.bind(console);

var IDBFS = 'IDBFS is no longer included by default; build with -lidbfs.js';
var PROXYFS = 'PROXYFS is no longer included by default; build with -lproxyfs.js';
var WORKERFS = 'WORKERFS is no longer included by default; build with -lworkerfs.js';
var FETCHFS = 'FETCHFS is no longer included by default; build with -lfetchfs.js';
var ICASEFS = 'ICASEFS is no longer included by default; build with -licasefs.js';
var JSFILEFS = 'JSFILEFS is no longer included by default; build with -ljsfilefs.js';
var OPFS = 'OPFS is no longer included by default; build with -lopfs.js';

var NODEFS = 'NODEFS is no longer included by default; build with -lnodefs.js';

// perform assertions in shell.js after we set up out() and err(), as otherwise
// if an assertion fails it cannot print the message

assert(!ENVIRONMENT_IS_SHELL, 'shell environment detected but not enabled at build time (add `shell` to `-sENVIRONMENT` to enable)');

// end include: shell.js

// include: preamble.js
// === Preamble library stuff ===

// Documentation for the public APIs defined in this file must be updated in:
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at:
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html

var wasmBinary;

if (!globalThis.WebAssembly) {
  err('no native wasm support detected');
}

// Wasm globals

//========================================
// Runtime essentials
//========================================

// whether we are quitting the application. no code should run after this.
// set in exit() and abort()
var ABORT = false;

// set by exit() and abort().  Passed to 'onExit' handler.
// NOTE: This is also used as the process return code in shell environments
// but only when noExitRuntime is false.
var EXITSTATUS;

// In STRICT mode, we only define assert() when ASSERTIONS is set.  i.e. we
// don't define it at all in release modes.  This matches the behaviour of
// MINIMAL_RUNTIME.
// TODO(sbc): Make this the default even without STRICT enabled.
/** @type {function(*, string=)} */
function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed' + (text ? ': ' + text : ''));
  }
}

// We used to include malloc/free by default in the past. Show a helpful error in
// builds with assertions.
function _free() {
  // Show a helpful error since we used to include free by default in the past.
  abort('free() called but not included in the build - add `_free` to EXPORTED_FUNCTIONS');
}

/**
 * Indicates whether filename is delivered via file protocol (as opposed to http/https)
 * @noinline
 */
var isFileURI = (filename) => filename.startsWith('file://');

// include: runtime_common.js
// include: runtime_exceptions.js
// Base Emscripten EH error class
class EmscriptenEH {}

class EmscriptenSjLj extends EmscriptenEH {}

// end include: runtime_exceptions.js
// include: runtime_debug.js
var runtimeDebug = true; // Switch to false at runtime to disable logging at the right times

// Used by XXXXX_DEBUG settings to output debug messages.
function dbg(...args) {
  if (!runtimeDebug && typeof runtimeDebug != 'undefined') return;
  // TODO(sbc): Make this configurable somehow.  Its not always convenient for
  // logging to show up as warnings.
  console.warn(...args);
}

// Endianness check
(() => {
  var h16 = new Int16Array(1);
  var h8 = new Int8Array(h16.buffer);
  h16[0] = 0x6373;
  if (h8[0] !== 0x73 || h8[1] !== 0x63) abort('Runtime error: expected the system to be little-endian! (Run with -sSUPPORT_BIG_ENDIAN to bypass)');
})();

function consumedModuleProp(prop) {
  var value = Module[prop];
  var msg = `Attempt to modify \`Module.${prop}\` after it has already been processed.  This can happen, for example, when code is injected via '--post-js' rather than '--pre-js'`;
  if (Array.isArray(value)) {
    value = new Proxy(value, {
      set(target, key, val) {
        abort(msg);
        return false;
      },
      defineProperty(target, key, descriptor) {
        abort(msg);
        return false;
      },
      deleteProperty(target, key) {
        abort(msg);
        return false;
      }
    });
  }
  Object.defineProperty(Module, prop, {
    configurable: true,
    get() { return value; },
    set() {
      abort(msg);
    }
  });
}

function makeInvalidEarlyAccess(name) {
  return () => assert(false, `call to '${name}' via reference taken before Wasm module initialization`);

}

function ignoredModuleProp(prop) {
  if (Object.getOwnPropertyDescriptor(Module, prop)) {
    abort(`\`Module.${prop}\` was supplied but \`${prop}\` not included in INCOMING_MODULE_JS_API`);
  }
}

// forcing the filesystem exports a few things by default
function isExportedByForceFilesystem(name) {
  return name === 'FS_createPath' ||
         name === 'FS_createDataFile' ||
         name === 'FS_createPreloadedFile' ||
         name === 'FS_preloadFile' ||
         name === 'FS_unlink' ||
         name === 'addRunDependency' ||
         // The old FS has some functionality that WasmFS lacks.
         name === 'FS_createLazyFile' ||
         name === 'FS_createDevice' ||
         name === 'removeRunDependency';
}

/**
 * Intercept access to a symbols in the global symbol.  This enables us to give
 * informative warnings/errors when folks attempt to use symbols they did not
 * include in their build, or no symbols that no longer exist.
 *
 * We don't define this in MODULARIZE mode since in that mode emscripten symbols
 * are never placed in the global scope.
 */
function hookGlobalSymbolAccess(sym, func) {
  if (!Object.getOwnPropertyDescriptor(globalThis, sym)) {
    Object.defineProperty(globalThis, sym, {
      configurable: true,
      get() {
        func();
        return undefined;
      }
    });
  }
}

function missingGlobal(sym, msg) {
  hookGlobalSymbolAccess(sym, () => {
    warnOnce(`\`${sym}\` is no longer defined by emscripten. ${msg}`);
  });
}

missingGlobal('buffer', 'Please use HEAP8.buffer or wasmMemory.buffer');
missingGlobal('asm', 'Please use wasmExports instead');

function missingLibrarySymbol(sym) {
  hookGlobalSymbolAccess(sym, () => {
    // Can't `abort()` here because it would break code that does runtime
    // checks.  e.g. `if (typeof SDL === 'undefined')`.
    var msg = `\`${sym}\` is a library symbol and not included by default; add it to your library.js __deps or to DEFAULT_LIBRARY_FUNCS_TO_INCLUDE on the command line`;
    // DEFAULT_LIBRARY_FUNCS_TO_INCLUDE requires the name as it appears in
    // library.js, which means $name for a JS name with no prefix, or name
    // for a JS name like _name.
    var librarySymbol = sym;
    if (!librarySymbol.startsWith('_')) {
      librarySymbol = '$' + sym;
    }
    msg += ` (e.g. -sDEFAULT_LIBRARY_FUNCS_TO_INCLUDE='${librarySymbol}')`;
    if (isExportedByForceFilesystem(sym)) {
      msg += '. Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you';
    }
    warnOnce(msg);
  });

  // Any symbol that is not included from the JS library is also (by definition)
  // not exported on the Module object.
  unexportedRuntimeSymbol(sym);
}

function unexportedRuntimeSymbol(sym) {
  if (!Object.getOwnPropertyDescriptor(Module, sym)) {
    Object.defineProperty(Module, sym, {
      configurable: true,
      get() {
        var msg = `'${sym}' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the Emscripten FAQ)`;
        if (isExportedByForceFilesystem(sym)) {
          msg += '. Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you';
        }
        abort(msg);
      },
    });
  }
}

// end include: runtime_debug.js
// include: runtime_stack_check.js
const stackCookie1 = 0x02135467;
const stackCookie2 = 0x89BACDFE;

// Initializes the stack cookie. Called at the startup of main and at the startup of each thread in pthreads mode.
function writeStackCookie() {
  var max = _emscripten_stack_get_end();
  assert((max & 3) == 0);
  // If the stack ends at address zero we write our cookies 4 bytes into the
  // stack.  This prevents interference with SAFE_HEAP and ASAN which also
  // monitor writes to address zero.
  if (max == 0) {
    max += 4;
  }
  // The stack grow downwards towards _emscripten_stack_get_end.
  // We write cookies to the final two words in the stack and detect if they are
  // ever overwritten.
  HEAPU32[((max)>>2)] = stackCookie1;
  HEAPU32[(((max)+(4))>>2)] = stackCookie2;
  // Also test the global address 0 for integrity.
  HEAPU32[((0)>>2)] = 1668509029;
}

function u32ToHexString(num) {
  return '0x' + (num >>> 0).toString(16).padStart(8, '0');
}

function checkStackCookie() {
  if (ABORT) return;
  var max = _emscripten_stack_get_end();
  // See writeStackCookie().
  if (max == 0) {
    max += 4;
  }
  var val1 = HEAPU32[((max)>>2)];
  var val2 = HEAPU32[(((max)+(4))>>2)];
  if (val1 != stackCookie1 || val2 != stackCookie2) {
    abort(`Stack overflow! Stack cookie has been overwritten at ${ptrToString(max)}, expected hex dwords ${u32ToHexString(stackCookie2)} and ${u32ToHexString(stackCookie1)}, but received ${u32ToHexString(val2)} ${u32ToHexString(val1)}`);
  }
  // Also test the global address 0 for integrity.
  if (HEAPU32[((0)>>2)] != 0x63736d65 /* 'emsc' */) {
    abort('Runtime error: The application has corrupted its heap memory area (address zero)!');
  }
}
// end include: runtime_stack_check.js
// Memory management

var runtimeInitialized = false;



function updateMemoryViews() {
  // When memory growth is disabled this function should be called exactly once.
  assert(!HEAP8, 'updateMemoryViews should only be called once when ALLOW_MEMORY_GROWTH=0');
  var b = wasmMemory.buffer;
  HEAP8 = new Int8Array(b);
  HEAP16 = new Int16Array(b);
  Module['HEAPU8'] = HEAPU8 = new Uint8Array(b);
  HEAPU16 = new Uint16Array(b);
  HEAP32 = new Int32Array(b);
  HEAPU32 = new Uint32Array(b);
  HEAPF32 = new Float32Array(b);
  HEAPF64 = new Float64Array(b);
  HEAP64 = new BigInt64Array(b);
  
}

// include: memoryprofiler.js
// end include: memoryprofiler.js
// end include: runtime_common.js
assert(globalThis.Int32Array && globalThis.Float64Array && Int32Array.prototype.subarray && Int32Array.prototype.set,
       'JS engine does not provide full typed array support');

function preRun() {
  var preRun = Module['preRun'];
  if (preRun) {
    if (typeof preRun == 'function') preRun = [preRun];
    onPreRuns.push(...preRun);
  }
  consumedModuleProp('preRun');
  // Begin ATPRERUNS hooks
  callRuntimeCallbacks(onPreRuns);
  // End ATPRERUNS hooks
}

function initRuntime() {
  assert(!runtimeInitialized);
  runtimeInitialized = true;

  checkStackCookie();

  // Begin ATINITS hooks
  if (!Module['noFSInit'] && !FS.initialized) FS.init();
TTY.init();
  // End ATINITS hooks

  wasmExports['__wasm_call_ctors']();

  // Begin ATPOSTCTORS hooks
  FS.ignorePermissions = false;
  // End ATPOSTCTORS hooks

  checkStackCookie();
}

function postRun() {
  checkStackCookie();

  var postRun = Module['postRun'];
  if (postRun) {
    if (typeof postRun == 'function') postRun = [postRun];
    onPostRuns.push(...postRun);
  }
  consumedModuleProp('postRun');

  // Begin ATPOSTRUNS hooks
  callRuntimeCallbacks(onPostRuns);
  // End ATPOSTRUNS hooks
}

/**
 * @param {string|number=} what
 */
function abort(what) {
  Module['onAbort']?.(what);

  what = `Aborted(${what})`;
  // TODO(sbc): Should we remove printing and leave it up to whoever
  // catches the exception?
  err(what);

  ABORT = true;

  // Use a wasm runtime error, because a JS error might be seen as a foreign
  // exception, which means we'd run destructors on it. We need the error to
  // simply make the program stop.
  // FIXME This approach does not work in Wasm EH because it currently does not assume
  // all RuntimeErrors are from traps; it decides whether a RuntimeError is from
  // a trap or not based on a hidden field within the object. So at the moment
  // we don't have a way of throwing a wasm trap from JS. TODO Make a JS API that
  // allows this in the wasm spec.

  // Suppress closure compiler warning here. Closure compiler's builtin extern
  // definition for WebAssembly.RuntimeError claims it takes no arguments even
  // though it can.
  // TODO(https://github.com/google/closure-compiler/pull/3913): Remove if/when upstream closure gets fixed.
  /** @suppress {checkTypes} */
  var e = new WebAssembly.RuntimeError(what);

  // Throw the error whether or not MODULARIZE is set because abort is used
  // in code paths apart from instantiation where an exception is expected
  // to be thrown when abort is called.
  throw e;
}

function createExportWrapper(name, func, nargs) {
  assert(func);
  return (...args) => {
    assert(runtimeInitialized, `native function \`${name}\` called before runtime initialization`);
    // Only assert for too many arguments. Too few can be valid since the missing arguments will be zero filled.
    assert(args.length <= nargs, `native function \`${name}\` called with ${args.length} args but expects ${nargs}`);
    return func(...args);
  };
}

var wasmBinaryFile;

function findWasmBinary() {
  return locateFile('shell_login.wasm');
}

function getBinarySync(file) {
  if (readBinary) {
    return readBinary(file);
  }
  // Throwing a plain string here, even though it not normally advisable since
  // this gets turning into an `abort` in instantiateArrayBuffer.
  throw 'both async and sync fetching of the wasm failed';
}

async function getWasmBinary(binaryFile) {
  // If we don't have the binary yet, load it asynchronously using readAsync.
  if (!wasmBinary) {
    // Fetch the binary using readAsync
    try {
      var response = await readAsync(binaryFile);
      return new Uint8Array(response);
    } catch {
      // Fall back to getBinarySync below;
    }
  }

  // Otherwise, getBinarySync should be able to get it synchronously
  return getBinarySync(binaryFile);
}

async function instantiateArrayBuffer(binaryFile, imports) {
  try {
    var binary = await getWasmBinary(binaryFile);
    var instance = await WebAssembly.instantiate(binary, imports);
    return instance;
  } catch (reason) {
    err(`failed to asynchronously prepare wasm: ${reason}`);

    // Warn on some common problems.
    if (isFileURI(binaryFile)) {
      err(`warning: Loading from a file URI (${binaryFile}) is not supported in most browsers. See https://emscripten.org/docs/getting_started/FAQ.html#how-do-i-run-a-local-webserver-for-testing-why-does-my-program-stall-in-downloading-or-preparing`);
    }
    abort(reason);
  }
}

async function instantiateAsync(binary, binaryFile, imports) {
  if (!binary
      // Don't use streaming for file:// delivered objects in a webview, fetch them synchronously.
      && !isFileURI(binaryFile)
      // Avoid using instantiateStreaming() on Node.js since the `fetch()` API
      // does not support `file://` URLs.
      // See: https://github.com/emscripten-core/emscripten/pull/16917
      && !ENVIRONMENT_IS_NODE
     ) {
    try {
      var response = fetch(binaryFile, { credentials: 'same-origin' });
      var instantiationResult = await WebAssembly.instantiateStreaming(response, imports);
      return instantiationResult;
    } catch (reason) {
      // We expect the most common failure cause to be a bad MIME type for the binary,
      // in which case falling back to ArrayBuffer instantiation should work.
      err(`wasm streaming compile failed: ${reason}`);
      err('falling back to ArrayBuffer instantiation');
      // fall back of instantiateArrayBuffer below
    };
  }
  return instantiateArrayBuffer(binaryFile, imports);
}

function getWasmImports() {
  // prepare imports
  var imports = {
    'env': wasmImports,
    'wasi_snapshot_preview1': wasmImports,
  };
  return imports;
}

// Create the wasm instance.
// Receives the wasm imports, returns the exports.
async function createWasm() {
  // Load the wasm module and create an instance of using native support in the JS engine.
  // handle a generated wasm instance, receiving its exports and
  // performing other necessary setup
  function receiveInstance(instance) {
    wasmExports = instance.exports;

    assignWasmExports(wasmExports);

    updateMemoryViews();

    return wasmExports;
  }

  // Prefer streaming instantiation if available.
  // Async compilation can be confusing when an error on the page overwrites Module
  // (for example, if the order of elements is wrong, and the one defining Module is
  // later), so we save Module and check it later.
  var trueModule = Module;
  function receiveInstantiationResult(result) {
    // 'result' is a ResultObject object which has both the module and instance.
    // receiveInstance() will swap in the exports (to Module.asm) so they can be called
    assert(Module === trueModule, 'the Module object should not be replaced during async compilation - perhaps the order of HTML elements is wrong?');
    trueModule = null;
    // TODO: Due to Closure regression https://github.com/google/closure-compiler/issues/3193, the above line no longer optimizes out down to the following line.
    // When the regression is fixed, can restore the above PTHREADS-enabled path.
    return receiveInstance(result['instance']);
  }

  var info = getWasmImports();

  // User shell pages can write their own Module.instantiateWasm = function(imports, successCallback) callback
  // to manually instantiate the Wasm module themselves. This allows pages to
  // run the instantiation parallel to any other async startup actions they are
  // performing.
  // Also pthreads and wasm workers initialize the wasm instance through this
  // path.
  var instantiateWasm = Module['instantiateWasm'];
  if (instantiateWasm) {
    return new Promise((resolve) => {
      try {
        instantiateWasm(info, (inst) => resolve(receiveInstance(inst)));
      } catch(e) {
        err(`Module.instantiateWasm callback failed with error: ${e}`);
        throw e;
      }
    });
  }

  wasmBinaryFile ??= findWasmBinary();
  var result = await instantiateAsync(wasmBinary, wasmBinaryFile, info);
  var exports = receiveInstantiationResult(result);
  return exports;
}

// end include: preamble.js

// Begin JS library code


  class ExitStatus {
      name = 'ExitStatus';
      constructor(status) {
        this.message = `Program terminated with exit(${status})`;
        this.status = status;
      }
    }

  /** @type {!Int32Array} */
  var HEAP32;

  /** @type {!Int8Array} */
  var HEAP8;

  /** @type {!Uint32Array} */
  var HEAPU32;

  var callRuntimeCallbacks = (callbacks) => {
      while (callbacks.length > 0) {
        // Pass the module as the first argument.
        callbacks.shift()(Module);
      }
    };
  var onPostRuns = [];
  var addOnPostRun = (cb) => onPostRuns.push(cb);

  var onPreRuns = [];
  var addOnPreRun = (cb) => onPreRuns.push(cb);


  var noExitRuntime = true;

  function ptrToString(ptr) {
      assert(typeof ptr === 'number', `ptrToString expects a number, got ${typeof ptr}`);
      // Convert to 32-bit unsigned value
      ptr >>>= 0;
      return '0x' + ptr.toString(16).padStart(8, '0');
    }

  var stackRestore = (val) => __emscripten_stack_restore(val);

  var stackSave = () => _emscripten_stack_get_current();

  var warnOnce = (text) => {
      warnOnce.shown ||= {};
      if (!warnOnce.shown[text]) {
        warnOnce.shown[text] = 1;
        if (ENVIRONMENT_IS_NODE) text = 'warning: ' + text;
        err(text);
      }
    };

  

  var UTF8Decoder = globalThis.TextDecoder && new TextDecoder();
  
  
    /**
   * heapOrArray is either a regular array, or a JavaScript typed array view.
   * @param {number} idx
   * @param {number=} maxBytesToRead
   * @param {boolean=} ignoreNul
   * @return {number}
   */
  var findStringEnd = (heapOrArray, idx, maxBytesToRead, ignoreNul) => {
      var maxIdx = idx + maxBytesToRead;
      if (ignoreNul) return maxIdx;
      // TextDecoder needs to know the byte length in advance, it doesn't stop on
      // null terminator by itself.
      // As a tiny code save trick, compare idx against maxIdx using a negation,
      // so that maxBytesToRead=undefined/NaN means Infinity.
      while (heapOrArray[idx] && !(idx >= maxIdx)) ++idx;
      return idx;
    };
  
  
    /**
   * Given a pointer 'idx' to a null-terminated UTF8-encoded string in the given
   * array that contains uint8 values, returns a copy of that string as a
   * Javascript String object.
   * heapOrArray is either a regular array, or a JavaScript typed array view.
   * @param {number=} idx
   * @param {number=} maxBytesToRead
   * @param {boolean=} ignoreNul - If true, the function will not stop on a NUL character.
   * @return {string}
   */
  var UTF8ArrayToString = (heapOrArray, idx = 0, maxBytesToRead, ignoreNul) => {
  
      var endPtr = findStringEnd(heapOrArray, idx, maxBytesToRead, ignoreNul);
  
      // When using conditional TextDecoder, skip it for short strings as the overhead of the native call is not worth it.
      if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
        return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
      }
      var str = '';
      while (idx < endPtr) {
        // For UTF8 byte structure, see:
        // http://en.wikipedia.org/wiki/UTF-8#Description
        // https://www.ietf.org/rfc/rfc2279.txt
        // https://tools.ietf.org/html/rfc3629
        var u0 = heapOrArray[idx++];
        if (!(u0 & 0x80)) { str += String.fromCharCode(u0); continue; }
        var u1 = heapOrArray[idx++] & 63;
        if ((u0 & 0xE0) == 0xC0) { str += String.fromCharCode(((u0 & 31) << 6) | u1); continue; }
        var u2 = heapOrArray[idx++] & 63;
        if ((u0 & 0xF0) == 0xE0) {
          u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
        } else {
          if ((u0 & 0xF8) != 0xF0) warnOnce(`Invalid UTF-8 leading byte ${ptrToString(u0)} encountered when deserializing a UTF-8 string in wasm memory to a JS string!`);
          u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | (heapOrArray[idx++] & 63);
        }
  
        if (u0 < 0x10000) {
          str += String.fromCharCode(u0);
        } else {
          var ch = u0 - 0x10000;
          str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
        }
      }
      return str;
    };
  
  /** @type {!Uint8Array} */
  var HEAPU8;
  
    /**
   * Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the
   * emscripten HEAP, returns a copy of that string as a Javascript String object.
   *
   * @param {number} ptr
   * @param {number=} maxBytesToRead - An optional length that specifies the
   *   maximum number of bytes to read. You can omit this parameter to scan the
   *   string until the first 0 byte. If maxBytesToRead is passed, and the string
   *   at [ptr, ptr+maxBytesToReadr[ contains a null byte in the middle, then the
   *   string will cut short at that byte index.
   * @param {boolean=} ignoreNul - If true, the function will not stop on a NUL character.
   * @return {string}
   */
  var UTF8ToString = (ptr, maxBytesToRead, ignoreNul) => {
      assert(typeof ptr == 'number', `UTF8ToString expects a number (got ${typeof ptr})`);
      return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead, ignoreNul) : '';
    };
  var ___assert_fail = (condition, filename, line, func) =>
      abort(`Assertion failed: ${UTF8ToString(condition)}, at: ` + [filename ? UTF8ToString(filename) : 'unknown filename', line, func ? UTF8ToString(func) : 'unknown function']);

  
  class ExceptionInfo {
      // excPtr - Thrown object pointer to wrap. Metadata pointer is calculated from it.
      constructor(excPtr) {
        this.excPtr = excPtr;
        this.ptr = excPtr - 24;
      }
  
      set_type(type) {
        HEAPU32[(((this.ptr)+(4))>>2)] = type;
      }
  
      get_type() {
        return HEAPU32[(((this.ptr)+(4))>>2)];
      }
  
      set_destructor(destructor) {
        HEAPU32[(((this.ptr)+(8))>>2)] = destructor;
      }
  
      get_destructor() {
        return HEAPU32[(((this.ptr)+(8))>>2)];
      }
  
      set_caught(caught) {
        caught = caught ? 1 : 0;
        HEAP8[(this.ptr)+(12)] = caught;
      }
  
      get_caught() {
        return HEAP8[(this.ptr)+(12)] != 0;
      }
  
      set_rethrown(rethrown) {
        rethrown = rethrown ? 1 : 0;
        HEAP8[(this.ptr)+(13)] = rethrown;
      }
  
      get_rethrown() {
        return HEAP8[(this.ptr)+(13)] != 0;
      }
  
      // Initialize native structure fields. Should be called once after allocated.
      init(type, destructor) {
        this.set_adjusted_ptr(0);
        this.set_type(type);
        this.set_destructor(destructor);
      }
  
      set_adjusted_ptr(adjustedPtr) {
        HEAPU32[(((this.ptr)+(16))>>2)] = adjustedPtr;
      }
  
      get_adjusted_ptr() {
        return HEAPU32[(((this.ptr)+(16))>>2)];
      }
    }
  
  var uncaughtExceptionCount = 0;
  
  var __Unwind_RaiseException = (ex) => {
      assert(false, 'Exception thrown, but exception catching is not enabled. Compile with -sNO_DISABLE_EXCEPTION_CATCHING or -sEXCEPTION_CATCHING_ALLOWED=[..] to catch.');
    };
  var ___cxa_throw = (ptr, type, destructor) => {
      var info = new ExceptionInfo(ptr);
      // Initialize ExceptionInfo content after it was allocated in __cxa_allocate_exception.
      info.init(type, destructor);
      uncaughtExceptionCount++;
      __Unwind_RaiseException(ptr);
    };

  var syscallGetVarargI = () => {
      assert(SYSCALLS.varargs != undefined);
      // the `+` prepended here is necessary to convince the JSCompiler that varargs is indeed a number.
      var ret = HEAP32[((+SYSCALLS.varargs)>>2)];
      SYSCALLS.varargs += 4;
      return ret;
    };
  var syscallGetVarargP = syscallGetVarargI;
  
  
  var PATH = {
  isAbs:(path) => path.charAt(0) === '/',
  splitPath:(filename) => {
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        return splitPathRe.exec(filename).slice(1);
      },
  normalizeArray:(parts, allowAboveRoot) => {
        // if the path tries to go above the root, `up` ends up > 0
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
          var last = parts[i];
          if (last === '.') {
            parts.splice(i, 1);
          } else if (last === '..') {
            parts.splice(i, 1);
            up++;
          } else if (up) {
            parts.splice(i, 1);
            up--;
          }
        }
        // if the path is allowed to go above the root, restore leading ..s
        if (allowAboveRoot) {
          for (; up; up--) {
            parts.unshift('..');
          }
        }
        return parts;
      },
  normalize:(path) => {
        var isAbsolute = PATH.isAbs(path),
            trailingSlash = path.slice(-1) === '/';
        // Normalize the path
        path = PATH.normalizeArray(path.split('/').filter((p) => !!p), !isAbsolute).join('/');
        if (!path && !isAbsolute) {
          path = '.';
        }
        if (path && trailingSlash) {
          path += '/';
        }
        return (isAbsolute ? '/' : '') + path;
      },
  dirname:(path) => {
        var result = PATH.splitPath(path),
            root = result[0],
            dir = result[1];
        if (!root && !dir) {
          // No dirname whatsoever
          return '.';
        }
        if (dir) {
          // It has a dirname, strip trailing slash
          dir = dir.slice(0, -1);
        }
        return root + dir;
      },
  basename:(path) => path && path.match(/([^\/]+|\/)\/*$/)[1],
join:(...paths) => PATH.normalize(paths.join('/')),
join2:(l, r) => PATH.normalize(l + '/' + r),
};

var initRandomFill = () => {
    // This block is not needed on v19+ since crypto.getRandomValues is builtin
    if (ENVIRONMENT_IS_NODE) {
      var nodeCrypto = require('node:crypto');
      return (view) => (nodeCrypto.randomFillSync(view), 0);
    }

    return (view) => (crypto.getRandomValues(view), 0);
  };
var randomFill = (view) => (randomFill = initRandomFill())(view);



var PATH_FS = {
resolve:(...args) => {
      var resolvedPath = '',
        resolvedAbsolute = false;
      for (var i = args.length - 1; i >= -1 && !resolvedAbsolute; i--) {
        var path = (i >= 0) ? args[i] : FS.cwd();
        // Skip empty and invalid entries
        if (typeof path != 'string') {
          throw new TypeError('Arguments to path.resolve must be strings');
        } else if (!path) {
          return ''; // an invalid portion invalidates the whole thing
        }
        resolvedPath = path + '/' + resolvedPath;
        resolvedAbsolute = PATH.isAbs(path);
      }
      // At this point the path should be resolved to a full absolute path, but
      // handle relative paths to be safe (might happen when process.cwd() fails)
      resolvedPath = PATH.normalizeArray(resolvedPath.split('/').filter((p) => !!p), !resolvedAbsolute).join('/');
      return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
    },
relative:(from, to) => {
      from = PATH_FS.resolve(from).slice(1);
      to = PATH_FS.resolve(to).slice(1);
      function trim(arr) {
        var start = 0;
        for (; start < arr.length; start++) {
          if (arr[start] !== '') break;
        }
        var end = arr.length - 1;
        for (; end >= 0; end--) {
          if (arr[end] !== '') break;
        }
        if (start > end) return [];
        return arr.slice(start, end - start + 1);
      }
      var fromParts = trim(from.split('/'));
      var toParts = trim(to.split('/'));
      var length = Math.min(fromParts.length, toParts.length);
      var samePartsLength = length;
      for (var i = 0; i < length; i++) {
        if (fromParts[i] !== toParts[i]) {
          samePartsLength = i;
          break;
        }
      }
      var outputParts = [];
      for (var i = samePartsLength; i < fromParts.length; i++) {
        outputParts.push('..');
      }
      outputParts = outputParts.concat(toParts.slice(samePartsLength));
      return outputParts.join('/');
    },
};



var FS_stdin_getChar_buffer = [];

var lengthBytesUTF8 = (str) => {
    var len = 0;
    for (var i = 0; i < str.length; ++i) {
      // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code
      // unit, not a Unicode code point of the character! So decode
      // UTF16->UTF32->UTF8.
      // See http://unicode.org/faq/utf_bom.html#utf16-3
      var c = str.charCodeAt(i); // possibly a lead surrogate
      if (c <= 0x7F) {
        len++;
      } else if (c <= 0x7FF) {
        len += 2;
      } else if (c >= 0xD800 && c <= 0xDFFF) {
        len += 4; ++i;
      } else {
        len += 3;
      }
    }
    return len;
  };

var stringToUTF8Array = (str, heap, outIdx, maxBytesToWrite) => {
    assert(typeof str === 'string', `stringToUTF8Array expects a string (got ${typeof str})`);
    // Parameter maxBytesToWrite is not optional. Negative values, 0, null,
    // undefined and false each don't write out any bytes.
    if (!(maxBytesToWrite > 0))
      return 0;

    var startIdx = outIdx;
    var endIdx = outIdx + maxBytesToWrite - 1; // -1 for string null terminator.
    for (var i = 0; i < str.length; ++i) {
      // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description
      // and https://www.ietf.org/rfc/rfc2279.txt
      // and https://tools.ietf.org/html/rfc3629
      var u = str.codePointAt(i);
      if (u <= 0x7F) {
        if (outIdx >= endIdx) break;
        heap[outIdx++] = u;
      } else if (u <= 0x7FF) {
        if (outIdx + 1 >= endIdx) break;
        heap[outIdx++] = 0xC0 | (u >> 6);
        heap[outIdx++] = 0x80 | (u & 63);
      } else if (u <= 0xFFFF) {
        if (outIdx + 2 >= endIdx) break;
        heap[outIdx++] = 0xE0 | (u >> 12);
        heap[outIdx++] = 0x80 | ((u >> 6) & 63);
        heap[outIdx++] = 0x80 | (u & 63);
      } else {
        if (outIdx + 3 >= endIdx) break;
        if (u > 0x10FFFF) warnOnce(`Invalid Unicode code point ${ptrToString(u)} encountered when serializing a JS string to a UTF-8 string in wasm memory! (Valid unicode code points should be in range 0-0x10FFFF).`);
        heap[outIdx++] = 0xF0 | (u >> 18);
        heap[outIdx++] = 0x80 | ((u >> 12) & 63);
        heap[outIdx++] = 0x80 | ((u >> 6) & 63);
        heap[outIdx++] = 0x80 | (u & 63);
        // Gotcha: if codePoint is over 0xFFFF, it is represented as a surrogate pair in UTF-16.
        // We need to manually skip over the second code unit for correct iteration.
        i++;
      }
    }
    // Null-terminate the pointer to the buffer.
    heap[outIdx] = 0;
    return outIdx - startIdx;
  };
/** @type {function(string, boolean=, number=)} */
  var intArrayFromString = (stringy, dontAddNull, length) => {
      var len = length > 0 ? length : lengthBytesUTF8(stringy)+1;
      var u8array = new Array(len);
      var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
      if (dontAddNull) u8array.length = numBytesWritten;
      return u8array;
    };
  var FS_stdin_getChar = () => {
      if (!FS_stdin_getChar_buffer.length) {
        var result = null;
        if (ENVIRONMENT_IS_NODE) {
          // we will read data by chunks of BUFSIZE
          var BUFSIZE = 256;
          var buf = Buffer.alloc(BUFSIZE);
          var bytesRead = 0;
  
          try {
            bytesRead = fs.readSync(process.stdin.fd, buf, 0, BUFSIZE);
          } catch(e) {
            // Cross-platform differences: on Windows, reading EOF throws an
            // exception, but on other OSes, reading EOF returns 0. Uniformize
            // behavior by treating the EOF exception to return 0.
            if (e.toString().includes('EOF')) bytesRead = 0;
            else throw e;
          }
  
          if (bytesRead > 0) {
            result = buf.toString('utf-8', 0, bytesRead);
          }
        } else
        if (globalThis.window?.prompt) {
          // Browser.
          result = window.prompt('Input: ');  // returns null on cancel
          if (result !== null) {
            result += '\n';
          }
        } else
        {}
        if (!result) {
          return null;
        }
        FS_stdin_getChar_buffer = intArrayFromString(result, true);
      }
      return FS_stdin_getChar_buffer.shift();
    };
  var TTY = {
  ttys:[],
  init() {
        // https://github.com/emscripten-core/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // currently, FS.init does not distinguish if process.stdin is a file or TTY
        //   // device, it always assumes it's a TTY device. because of this, we're forcing
        //   // process.stdin to UTF8 encoding to at least make stdin reading compatible
        //   // with text files until FS.init can be refactored.
        //   process.stdin.setEncoding('utf8');
        // }
      },
  shutdown() {
        // https://github.com/emscripten-core/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // inolen: any idea as to why node -e 'process.stdin.read()' wouldn't exit immediately (with process.stdin being a tty)?
        //   // isaacs: because now it's reading from the stream, you've expressed interest in it, so that read() kicks off a _read() which creates a ReadReq operation
        //   // inolen: I thought read() in that case was a synchronous operation that just grabbed some amount of buffered data if it exists?
        //   // isaacs: it is. but it also triggers a _read() call, which calls readStart() on the handle
        //   // isaacs: do process.stdin.pause() and i'd think it'd probably close the pending call
        //   process.stdin.pause();
        // }
      },
  register(dev, ops) {
        TTY.ttys[dev] = { input: [], output: [], ops: ops };
        FS.registerDevice(dev, TTY.stream_ops);
      },
  stream_ops:{
  open(stream) {
          var tty = TTY.ttys[stream.node.rdev];
          if (!tty) {
            throw new FS.ErrnoError(43);
          }
          stream.tty = tty;
          stream.seekable = false;
        },
  close(stream) {
          // flush any pending line data
          stream.tty.ops.fsync(stream.tty);
        },
  fsync(stream) {
          stream.tty.ops.fsync(stream.tty);
        },
  read(stream, buffer, offset, length, pos /* ignored */) {
          if (!stream.tty || !stream.tty.ops.get_char) {
            throw new FS.ErrnoError(60);
          }
          var bytesRead = 0;
          for (var i = 0; i < length; i++) {
            var result;
            try {
              result = stream.tty.ops.get_char(stream.tty);
            } catch (e) {
              throw new FS.ErrnoError(29);
            }
            if (result === undefined && !bytesRead) {
              throw new FS.ErrnoError(6);
            }
            if (result === null || result === undefined) break;
            bytesRead++;
            buffer[offset+i] = result;
            // We currently only support canonical mode (ICANON), where
            // read(2) returns as soon as a line delimiter is read.
            if (result === 10) break;
          }
          if (bytesRead) {
            stream.node.atime = Date.now();
          }
          return bytesRead;
        },
  write(stream, buffer, offset, length, pos) {
          if (!stream.tty || !stream.tty.ops.put_char) {
            throw new FS.ErrnoError(60);
          }
          try {
            for (var i = 0; i < length; i++) {
              stream.tty.ops.put_char(stream.tty, buffer[offset+i]);
            }
          } catch (e) {
            throw new FS.ErrnoError(29);
          }
          if (length) {
            stream.node.mtime = stream.node.ctime = Date.now();
          }
          return i;
        },
  },
  default_tty_ops:{
  get_char(tty) {
          return FS_stdin_getChar();
        },
  put_char(tty, val) {
          if (val === null || val === 10) {
            out(UTF8ArrayToString(tty.output));
            tty.output = [];
          } else {
            if (val != 0) tty.output.push(val); // val == 0 would cut text output off in the middle.
          }
        },
  fsync(tty) {
          if (tty.output?.length > 0) {
            out(UTF8ArrayToString(tty.output));
            tty.output = [];
          }
        },
  ioctl_tcgets(tty) {
          // typical setting
          return {
            c_iflag: 25856,
            c_oflag: 5,
            c_cflag: 191,
            c_lflag: 35387,
            c_cc: [
              0x03, 0x1c, 0x7f, 0x15, 0x04, 0x00, 0x01, 0x00, 0x11, 0x13, 0x1a, 0x00,
              0x12, 0x0f, 0x17, 0x16, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
              0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            ]
          };
        },
  ioctl_tcsets(tty, optional_actions, data) {
          // currently just ignore
          return 0;
        },
  ioctl_tiocgwinsz(tty) {
          return [24, 80];
        },
  },
  default_tty1_ops:{
  put_char(tty, val) {
          if (val === null || val === 10) {
            err(UTF8ArrayToString(tty.output));
            tty.output = [];
          } else {
            if (val != 0) tty.output.push(val);
          }
        },
  fsync(tty) {
          if (tty.output?.length > 0) {
            err(UTF8ArrayToString(tty.output));
            tty.output = [];
          }
        },
  },
  };
  
  
  var mmapAlloc = (size) => {
      abort('internal error: mmapAlloc called but `emscripten_builtin_memalign` native symbol not exported');
    };
  
  var MEMFS = {
  ops_table:null,
  mount(mount) {
        return MEMFS.createNode(null, '/', 16895, 0);
      },
  createNode(parent, name, mode, dev = undefined) {
        if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
          // not supported
          throw new FS.ErrnoError(63);
        }
        MEMFS.ops_table ||= {
          dir: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr,
              lookup: MEMFS.node_ops.lookup,
              mknod: MEMFS.node_ops.mknod,
              rename: MEMFS.node_ops.rename,
              unlink: MEMFS.node_ops.unlink,
              rmdir: MEMFS.node_ops.rmdir,
              readdir: MEMFS.node_ops.readdir,
              symlink: MEMFS.node_ops.symlink
            },
            stream: {
              llseek: MEMFS.stream_ops.llseek
            }
          },
          file: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr
            },
            stream: {
              llseek: MEMFS.stream_ops.llseek,
              read: MEMFS.stream_ops.read,
              write: MEMFS.stream_ops.write,
              mmap: MEMFS.stream_ops.mmap,
              msync: MEMFS.stream_ops.msync
            }
          },
          link: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr,
              readlink: MEMFS.node_ops.readlink
            },
            stream: {}
          },
          chrdev: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr
            },
            stream: FS.chrdev_stream_ops
          }
        };
        var node = FS.createNode(parent, name, mode, dev);
        if (FS.isDir(node.mode)) {
          node.node_ops = MEMFS.ops_table.dir.node;
          node.stream_ops = MEMFS.ops_table.dir.stream;
          node.contents = {};
        } else if (FS.isFile(node.mode)) {
          node.node_ops = MEMFS.ops_table.file.node;
          node.stream_ops = MEMFS.ops_table.file.stream;
          // The actual number of bytes used in the typed array, as opposed to
          // contents.length which gives the whole capacity.
          node.usedBytes = 0;
          // The byte data of the file is stored in a typed array.
          // Note: typed arrays are not resizable like normal JS arrays are, so
          // there is a small penalty involved for appending file writes that
          // continuously grow a file similar to std::vector capacity vs used.
          node.contents = MEMFS.emptyFileContents ??= new Uint8Array(0);
        } else if (FS.isLink(node.mode)) {
          node.node_ops = MEMFS.ops_table.link.node;
          node.stream_ops = MEMFS.ops_table.link.stream;
        } else if (FS.isChrdev(node.mode)) {
          node.node_ops = MEMFS.ops_table.chrdev.node;
          node.stream_ops = MEMFS.ops_table.chrdev.stream;
        }
        node.atime = node.mtime = node.ctime = Date.now();
        // add the new node to the parent
        if (parent) {
          parent.contents[name] = node;
          parent.atime = parent.mtime = parent.ctime = node.atime;
        }
        return node;
      },
  getFileDataAsTypedArray(node) {
        assert(FS.isFile(node.mode), 'getFileDataAsTypedArray called on non-file');
        return node.contents.subarray(0, node.usedBytes); // Make sure to not return excess unused bytes.
      },
  expandFileStorage(node, newCapacity) {
        var prevCapacity = node.contents.length;
        if (prevCapacity >= newCapacity) return; // No need to expand, the storage was already large enough.
        // Don't expand strictly to the given requested limit if it's only a very
        // small increase, but instead geometrically grow capacity.
        // For small filesizes (<1MB), perform size*2 geometric increase, but for
        // large sizes, do a much more conservative size*1.125 increase to avoid
        // overshooting the allocation cap by a very large margin.
        var CAPACITY_DOUBLING_MAX = 1024 * 1024;
        newCapacity = Math.max(newCapacity, (prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2.0 : 1.125)) >>> 0);
        if (prevCapacity) newCapacity = Math.max(newCapacity, 256); // At minimum allocate 256b for each file when expanding.
        var oldContents = MEMFS.getFileDataAsTypedArray(node);
        node.contents = new Uint8Array(newCapacity); // Allocate new storage.
        node.contents.set(oldContents);
      },
  resizeFileStorage(node, newSize) {
        if (node.usedBytes == newSize) return;
        var oldContents = node.contents;
        node.contents = new Uint8Array(newSize); // Allocate new storage.
        node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes))); // Copy old data over to the new storage.
        node.usedBytes = newSize;
      },
  node_ops:{
  getattr(node) {
          var attr = {};
          // device numbers reuse inode numbers.
          attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
          attr.ino = node.id;
          attr.mode = node.mode;
          attr.nlink = 1;
          attr.uid = 0;
          attr.gid = 0;
          attr.rdev = node.rdev;
          if (FS.isDir(node.mode)) {
            attr.size = 4096;
          } else if (FS.isFile(node.mode)) {
            attr.size = node.usedBytes;
          } else if (FS.isLink(node.mode)) {
            attr.size = node.link.length;
          } else {
            attr.size = 0;
          }
          attr.atime = new Date(node.atime);
          attr.mtime = new Date(node.mtime);
          attr.ctime = new Date(node.ctime);
          // A Date only holds whole milliseconds: also return the exact times
          // (e.g. as set by utimensat), which SYSCALLS.writeStat prefers.
          attr.atimeMs = node.atime;
          attr.mtimeMs = node.mtime;
          attr.ctimeMs = node.ctime;
          // NOTE: In our implementation, st_blocks = Math.ceil(st_size/st_blksize),
          //       but this is not required by the standard.
          attr.blksize = 4096;
          attr.blocks = Math.ceil(attr.size / attr.blksize);
          return attr;
        },
  setattr(node, attr) {
          for (const key of ['mode', 'atime', 'mtime', 'ctime']) {
            if (attr[key] != null) {
              node[key] = attr[key];
            }
          }
          if (attr.size !== undefined) {
            MEMFS.resizeFileStorage(node, attr.size);
          }
        },
  lookup(parent, name) {
          throw new FS.ErrnoError(44);
        },
  mknod(parent, name, mode, dev = undefined) {
          return MEMFS.createNode(parent, name, mode, dev);
        },
  rename(old_node, new_dir, new_name) {
          var new_node;
          try {
            new_node = FS.lookupNode(new_dir, new_name);
          } catch (e) {}
          if (new_node && FS.isDir(old_node.mode)) {
            // if we're overwriting a directory at new_name, make sure it's empty.
            for (var i in new_node.contents) {
              throw new FS.ErrnoError(55);
            }
          }
          // do the internal rewiring
          delete old_node.parent.contents[old_node.name];
          new_dir.contents[new_name] = old_node;
          old_node.name = new_name;
          new_dir.ctime = new_dir.mtime = old_node.parent.ctime = old_node.parent.mtime = Date.now();
        },
  unlink(parent, name) {
          delete parent.contents[name];
          parent.ctime = parent.mtime = Date.now();
        },
  rmdir(parent, name) {
          var node = FS.lookupNode(parent, name);
          for (var i in node.contents) {
            throw new FS.ErrnoError(55);
          }
          delete parent.contents[name];
          parent.ctime = parent.mtime = Date.now();
        },
  readdir(node) {
          return ['.', '..', ...Object.keys(node.contents)];
        },
  symlink(parent, newname, oldpath) {
          var node = MEMFS.createNode(parent, newname, 0o777 | 40960, 0);
          node.link = oldpath;
          return node;
        },
  readlink(node) {
          if (!FS.isLink(node.mode)) {
            throw new FS.ErrnoError(28);
          }
          return node.link;
        },
  },
  stream_ops:{
  read(stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= stream.node.usedBytes) return 0;
          var size = Math.min(stream.node.usedBytes - position, length);
          assert(size >= 0);
          buffer.set(contents.subarray(position, position + size), offset);
          return size;
        },
  write(stream, buffer, offset, length, position, canOwn) {
          assert(buffer.subarray, 'FS.write expects a TypedArray');
  
          if (!length) return 0;
          var node = stream.node;
          node.mtime = node.ctime = Date.now();
  
          if (canOwn) {
            assert(!position, 'canOwn must imply no weird position inside the file');
            node.contents = buffer.subarray(offset, offset + length);
            node.usedBytes = length;
          } else if (!node.usedBytes && !position) { // If this is a simple first write to an empty file, do a fast set since we don't need to care about old data.
            node.contents = buffer.slice(offset, offset + length);
            node.usedBytes = length;
          } else {
            MEMFS.expandFileStorage(node, position+length);
            // Use typed array write which is available.
            node.contents.set(buffer.subarray(offset, offset + length), position);
            node.usedBytes = Math.max(node.usedBytes, position + length);
          }
          return length;
        },
  llseek(stream, offset, whence) {
          var position = offset;
          if (whence === 1) {
            position += stream.position;
          } else if (whence === 2) {
            if (FS.isFile(stream.node.mode)) {
              position += stream.node.usedBytes;
            }
          }
          if (position < 0) {
            throw new FS.ErrnoError(28);
          }
          return position;
        },
  mmap(stream, length, position, prot, flags) {
          if (!FS.isFile(stream.node.mode)) {
            throw new FS.ErrnoError(43);
          }
          var ptr;
          var allocated;
          var contents = stream.node.contents;
          // Only make a new copy when MAP_PRIVATE is specified.
          if (!(flags & 2) && contents.buffer === HEAP8.buffer) {
            // We can't emulate MAP_SHARED when the file is not backed by the
            // buffer we're mapping to (e.g. the HEAP buffer).
            allocated = false;
            ptr = contents.byteOffset;
          } else {
            allocated = true;
            ptr = mmapAlloc(length);
            if (!ptr) {
              throw new FS.ErrnoError(48);
            }
            if (contents) {
              // Try to avoid unnecessary slices.
              if (position > 0 || position + length < contents.length) {
                if (contents.subarray) {
                  contents = contents.subarray(position, position + length);
                } else {
                  contents = Array.prototype.slice.call(contents, position, position + length);
                }
              }
              HEAP8.set(contents, ptr);
            }
          }
          return { ptr, allocated };
        },
  msync(stream, buffer, offset, length, mmapFlags) {
          MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
          // should we check if bytesWritten and length are the same?
          return 0;
        },
  },
  };
  
  var FS_modeStringToFlags = (str) => {
      if (typeof str != 'string') return str;
      var flagModes = {
        'r': 0,
        'r+': 2,
        'w': 512 | 64 | 1,
        'w+': 512 | 64 | 2,
        'a': 1024 | 64 | 1,
        'a+': 1024 | 64 | 2,
      };
      var flags = flagModes[str];
      if (typeof flags == 'undefined') {
        throw new Error(`Unknown file open mode: ${str}`);
      }
      return flags;
    };
  
  var FS_fileDataToTypedArray = (data) => {
      if (typeof data == 'string') {
        data = intArrayFromString(data, true);
      }
      if (!data.subarray) {
        data = new Uint8Array(data);
      }
      return data;
    };
  
  var FS_getMode = (canRead, canWrite) => {
      var mode = 0;
      if (canRead) mode |= 292 | 73;
      if (canWrite) mode |= 146;
      return mode;
    };
  
  
  
  
  var strError = (errno) => UTF8ToString(_strerror(errno));
  
  var ERRNO_CODES = {
      'EPERM': 63,
      'ENOENT': 44,
      'ESRCH': 71,
      'EINTR': 27,
      'EIO': 29,
      'ENXIO': 60,
      'E2BIG': 1,
      'ENOEXEC': 45,
      'EBADF': 8,
      'ECHILD': 12,
      'EAGAIN': 6,
      'EWOULDBLOCK': 6,
      'ENOMEM': 48,
      'EACCES': 2,
      'EFAULT': 21,
      'ENOTBLK': 105,
      'EBUSY': 10,
      'EEXIST': 20,
      'EXDEV': 75,
      'ENODEV': 43,
      'ENOTDIR': 54,
      'EISDIR': 31,
      'EINVAL': 28,
      'ENFILE': 41,
      'EMFILE': 33,
      'ENOTTY': 59,
      'ETXTBSY': 74,
      'EFBIG': 22,
      'ENOSPC': 51,
      'ESPIPE': 70,
      'EROFS': 69,
      'EMLINK': 34,
      'EPIPE': 64,
      'EDOM': 18,
      'ERANGE': 68,
      'ENOMSG': 49,
      'EIDRM': 24,
      'ECHRNG': 106,
      'EL2NSYNC': 156,
      'EL3HLT': 107,
      'EL3RST': 108,
      'ELNRNG': 109,
      'EUNATCH': 110,
      'ENOCSI': 111,
      'EL2HLT': 112,
      'EDEADLK': 16,
      'ENOLCK': 46,
      'EBADE': 113,
      'EBADR': 114,
      'EXFULL': 115,
      'ENOANO': 104,
      'EBADRQC': 103,
      'EBADSLT': 102,
      'EDEADLOCK': 16,
      'EBFONT': 101,
      'ENOSTR': 100,
      'ENODATA': 116,
      'ETIME': 117,
      'ENOSR': 118,
      'ENONET': 119,
      'ENOPKG': 120,
      'EREMOTE': 121,
      'ENOLINK': 47,
      'EADV': 122,
      'ESRMNT': 123,
      'ECOMM': 124,
      'EPROTO': 65,
      'EMULTIHOP': 36,
      'EDOTDOT': 125,
      'EBADMSG': 9,
      'ENOTUNIQ': 126,
      'EBADFD': 127,
      'EREMCHG': 128,
      'ELIBACC': 129,
      'ELIBBAD': 130,
      'ELIBSCN': 131,
      'ELIBMAX': 132,
      'ELIBEXEC': 133,
      'ENOSYS': 52,
      'ENOTEMPTY': 55,
      'ENAMETOOLONG': 37,
      'ELOOP': 32,
      'EOPNOTSUPP': 138,
      'EPFNOSUPPORT': 139,
      'ECONNRESET': 15,
      'ENOBUFS': 42,
      'EAFNOSUPPORT': 5,
      'EPROTOTYPE': 67,
      'ENOTSOCK': 57,
      'ENOPROTOOPT': 50,
      'ESHUTDOWN': 140,
      'ECONNREFUSED': 14,
      'EADDRINUSE': 3,
      'ECONNABORTED': 13,
      'ENETUNREACH': 40,
      'ENETDOWN': 38,
      'ETIMEDOUT': 73,
      'EHOSTDOWN': 142,
      'EHOSTUNREACH': 23,
      'EINPROGRESS': 26,
      'EALREADY': 7,
      'EDESTADDRREQ': 17,
      'EMSGSIZE': 35,
      'EPROTONOSUPPORT': 66,
      'ESOCKTNOSUPPORT': 137,
      'EADDRNOTAVAIL': 4,
      'ENETRESET': 39,
      'EISCONN': 30,
      'ENOTCONN': 53,
      'ETOOMANYREFS': 141,
      'EUSERS': 136,
      'EDQUOT': 19,
      'ESTALE': 72,
      'ENOTSUP': 138,
      'ENOMEDIUM': 148,
      'EILSEQ': 25,
      'EOVERFLOW': 61,
      'ECANCELED': 11,
      'ENOTRECOVERABLE': 56,
      'EOWNERDEAD': 62,
      'ESTRPIPE': 135,
    };
  
  
  var asyncLoad = async (url) => {
      var arrayBuffer = await readAsync(url);
      assert(arrayBuffer, `Loading data file "${url}" failed (no arrayBuffer).`);
      return new Uint8Array(arrayBuffer);
    };
  
  
  var FS_createDataFile = (...args) => FS.createDataFile(...args);
  
  var getUniqueRunDependency = (id) => {
      var orig = id;
      while (1) {
        if (!runDependencyTracking[id]) return id;
        id = orig + Math.random();
      }
    };
  
  var dependenciesPromise = null;
  var resolveRunDependencies = async () => dependenciesPromise;
  var runDependencies = 0;
  
  
  var dependenciesPromiseResolve = null;
  
  var runDependencyTracking = {
  };
  
  var runDependencyWatcher = null;
  var removeRunDependency = (id) => {
      runDependencies--;
  
      Module['monitorRunDependencies']?.(runDependencies);
  
      assert(id, 'removeRunDependency requires an ID');
      assert(runDependencyTracking[id]);
      delete runDependencyTracking[id];
      if (!runDependencies) {
        if (runDependencyWatcher !== null) {
          clearInterval(runDependencyWatcher);
          runDependencyWatcher = null;
        }
        dependenciesPromiseResolve();
      }
    };
  
  
  
  
  var addRunDependency = (id) => {
      if (!runDependencies) {
        dependenciesPromise = new Promise((resolve) => dependenciesPromiseResolve = resolve);
      }
      runDependencies++;
  
      Module['monitorRunDependencies']?.(runDependencies);
  
      assert(id, 'addRunDependency requires an ID')
      assert(!runDependencyTracking[id]);
      runDependencyTracking[id] = 1;
      if (!runDependencyWatcher && globalThis.setInterval) {
        // Check for missing dependencies every few seconds
        runDependencyWatcher = setInterval(() => {
          if (ABORT) {
            clearInterval(runDependencyWatcher);
            runDependencyWatcher = null;
            return;
          }
          var shown = false;
          for (var dep in runDependencyTracking) {
            if (!shown) {
              shown = true;
              err('still waiting on run dependencies:');
            }
            err(`dependency: ${dep}`);
          }
          if (shown) {
            err('(end of list)');
          }
        }, 10_000);
        // Prevent this timer from keeping the runtime alive if nothing
        // else is.
        runDependencyWatcher.unref?.()
      }
    };
  
  
  var preloadPlugins = [];
  var FS_handledByPreloadPlugin = async (byteArray, fullname) => {
      // Ensure plugins are ready.
      if (typeof Browser != 'undefined') Browser.init();
  
      for (var plugin of preloadPlugins) {
        if (plugin['canHandle'](fullname)) {
          assert(plugin['handle'].constructor.name === 'AsyncFunction', 'Filesystem plugin handlers must be async functions (See #24914)')
          return plugin['handle'](byteArray, fullname);
        }
      }
      // If no plugin handled this file then return the original/unmodified
      // byteArray.
      return byteArray;
    };
  var FS_preloadFile = async (parent, name, url, canRead, canWrite, dontCreateFile, canOwn, preFinish) => {
      // TODO we should allow people to just pass in a complete filename instead
      // of parent and name being that we just join them anyways
      var fullname = name ? PATH_FS.resolve(PATH.join2(parent, name)) : parent;
      var dep = getUniqueRunDependency(`cp ${fullname}`); // might have several active requests for the same fullname
      addRunDependency(dep);
  
      try {
        var byteArray = url;
        if (typeof url == 'string') {
          byteArray = await asyncLoad(url);
        }
  
        byteArray = await FS_handledByPreloadPlugin(byteArray, fullname);
        preFinish?.();
        if (!dontCreateFile) {
          FS_createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
        }
      } finally {
        removeRunDependency(dep);
      }
    };
  var FS_createPreloadedFile = (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) => {
      FS_preloadFile(parent, name, url, canRead, canWrite, dontCreateFile, canOwn, preFinish).then(onload).catch(onerror);
    };
  
  var FS = {
  root:null,
  mounts:[],
  devices:{
  },
  streams:[],
  nextInode:1,
  nameTable:[],
  currentPath:"/",
  initialized:false,
  ignorePermissions:true,
  filesystems:null,
  syncFSRequests:0,
  ErrnoError:class extends Error {
        name = 'ErrnoError';
        // We set the `name` property to be able to identify `FS.ErrnoError`
        // - the `name` is a standard ECMA-262 property of error objects. Kind of good to have it anyway.
        // - when using PROXYFS, an error can come from an underlying FS
        // as different FS objects have their own FS.ErrnoError each,
        // the test `err instanceof FS.ErrnoError` won't detect an error coming from another filesystem, causing bugs.
        // we'll use the reliable test `err.name == "ErrnoError"` instead
        constructor(errno) {
          super(runtimeInitialized ? strError(errno) : '');
          this.errno = errno;
          for (var key in ERRNO_CODES) {
            if (ERRNO_CODES[key] === errno) {
              this.code = key;
              break;
            }
          }
        }
      },
  FSStream:class {
        shared = {};
        get object() {
          return this.node;
        }
        set object(val) {
          this.node = val;
        }
        get isRead() {
          return (this.flags & 2097155) !== 1;
        }
        get isWrite() {
          return (this.flags & 2097155) !== 0;
        }
        get isAppend() {
          return (this.flags & 1024);
        }
        get flags() {
          return this.shared.flags;
        }
        set flags(val) {
          this.shared.flags = val;
        }
        get position() {
          return this.shared.position;
        }
        set position(val) {
          this.shared.position = val;
        }
      },
  FSNode:class {
        node_ops = {};
        stream_ops = {};
        readMode = 292 | 73;
        writeMode = 146;
        mounted = null;
        constructor(parent, name, mode, rdev) {
          if (!parent) {
            parent = this;  // root node sets parent to itself
          }
          this.parent = parent;
          this.mount = parent.mount;
          this.id = FS.nextInode++;
          this.name = name;
          this.mode = mode;
          this.rdev = rdev;
          this.atime = this.mtime = this.ctime = Date.now();
        }
        get read() {
          return (this.mode & this.readMode) === this.readMode;
        }
        set read(val) {
          val ? this.mode |= this.readMode : this.mode &= ~this.readMode;
        }
        get write() {
          return (this.mode & this.writeMode) === this.writeMode;
        }
        set write(val) {
          val ? this.mode |= this.writeMode : this.mode &= ~this.writeMode;
        }
        get isFolder() {
          return FS.isDir(this.mode);
        }
        get isDevice() {
          return FS.isChrdev(this.mode);
        }
        // The per-inode readiness wait-queue. The node carries a Set of listener
        // entries {cb}; producers (SOCKFS, PIPEFS) call notifyListeners on a
        // readiness transition, and poll()/epoll consume it. It lives on the node
        // (not the fd) so dup'd fds share one queue. Only nodes that derive real
        // readiness (sockets, pipes, and an epoll's own node) ever use this -
        // always-ready types (regular files, ttys) never register or notify.
        addListener(cb, exclusive = false) {
          var entry = {cb, exclusive};
          var listeners = (this.listeners ??= new Set());
          listeners.add(entry);
          return {listeners, entry};
        }
        notifyListeners(flags) {
          // Iterates the set without copying, which is safe ONLY under a
          // load-bearing contract that every internal listener must honour:
          //   1. A listener must not run user code synchronously (a poll waiter only
          //      resolves a Promise; an epoll registration only re-lists +
          //      re-notifies; the epoll callback only schedules a tick). User code
          //      runs on a later tick, never inside this loop.
          //   2. A listener may delete entries only from ITS OWN waiter, never from
          //      a sibling node's set that may be mid-iteration. (Deleting an entry
          //      of the set being iterated here is fine - a Set tolerates removal of
          //      a not-yet-visited entry mid-iteration; mutating a *different* node's
          //      set is fine because that set is not being iterated.)
          // Violating either gives silently skipped wakeups that are near-impossible
          // to reproduce. Any new producer/listener must preserve it.
          if (!this.listeners) return;
          // Fire every non-exclusive listener. Among EPOLLEXCLUSIVE registrations
          // (one fd watched by several epolls) wake only one, rotating round-robin
          // per node, to avoid a thundering herd. (Only epoll registrations are ever
          // exclusive; poll waiters and a node's own consumers are not.)
          var excl;
          for (var entry of this.listeners) {
            if (entry.exclusive) (excl ||= []).push(entry);
            else entry.cb(flags);
          }
          if (excl) {
            var i = (this.exclTurn || 0) % excl.length;
            this.exclTurn = i + 1;
            excl[i].cb(flags);
          }
        }
      },
  lookupPath(path, opts = {}) {
        if (!path) {
          throw new FS.ErrnoError(44);
        }
        opts.follow_mount ??= true
  
        if (!PATH.isAbs(path)) {
          path = FS.cwd() + '/' + path;
        }
  
        // limit max consecutive symlinks to SYMLOOP_MAX.
        linkloop: for (var nlinks = 0; nlinks < 40; nlinks++) {
          // split the absolute path
          var parts = path.split('/').filter((p) => !!p);
  
          // start at the root
          var current = FS.root;
          var current_path = '/';
  
          for (var i = 0; i < parts.length; i++) {
            var islast = (i === parts.length-1);
            if (islast && opts.parent) {
              // stop resolving
              break;
            }
  
            if (parts[i] === '.') {
              continue;
            }
  
            if (parts[i] === '..') {
              current_path = PATH.dirname(current_path);
              if (FS.isRoot(current)) {
                path = current_path + '/' + parts.slice(i + 1).join('/');
                // We're making progress here, don't let many consecutive ..'s
                // lead to ELOOP
                nlinks--;
                continue linkloop;
              } else {
                current = current.parent;
              }
              continue;
            }
  
            current_path = PATH.join2(current_path, parts[i]);
            try {
              current = FS.lookupNode(current, parts[i]);
            } catch (e) {
              // if noent_okay is true, suppress a ENOENT in the last component
              // and return an object with an undefined node. This is needed for
              // resolving symlinks in the path when creating a file.
              if ((e?.errno === 44) && islast && opts.noent_okay) {
                return { path: current_path };
              }
              throw e;
            }
  
            // jump to the mount's root node if this is a mountpoint
            if (FS.isMountpoint(current) && (!islast || opts.follow_mount)) {
              current = current.mounted.root;
            }
  
            // by default, lookupPath will not follow a symlink if it is the final path component.
            // setting opts.follow = true will override this behavior.
            if (FS.isLink(current.mode) && (!islast || opts.follow)) {
              if (!current.node_ops.readlink) {
                throw new FS.ErrnoError(52);
              }
              var link = current.node_ops.readlink(current);
              if (!PATH.isAbs(link)) {
                link = PATH.dirname(current_path) + '/' + link;
              }
              path = link + '/' + parts.slice(i + 1).join('/');
              continue linkloop;
            }
          }
          return { path: current_path, node: current };
        }
        throw new FS.ErrnoError(32);
      },
  getPath(node) {
        var path;
        while (true) {
          if (FS.isRoot(node)) {
            var mount = node.mount.mountpoint;
            if (!path) return mount;
            return mount[mount.length-1] !== '/' ? `${mount}/${path}` : mount + path;
          }
          path = path ? `${node.name}/${path}` : node.name;
          node = node.parent;
        }
      },
  hashName(parentid, name) {
        var hash = 0;
  
        for (var i = 0; i < name.length; i++) {
          hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
        }
        return ((parentid + hash) >>> 0) % FS.nameTable.length;
      },
  hashAddNode(node) {
        var hash = FS.hashName(node.parent.id, node.name);
        node.name_next = FS.nameTable[hash];
        FS.nameTable[hash] = node;
      },
  hashRemoveNode(node) {
        var hash = FS.hashName(node.parent.id, node.name);
        if (FS.nameTable[hash] === node) {
          FS.nameTable[hash] = node.name_next;
        } else {
          var current = FS.nameTable[hash];
          while (current) {
            if (current.name_next === node) {
              current.name_next = node.name_next;
              break;
            }
            current = current.name_next;
          }
        }
      },
  lookupNode(parent, name) {
        var errCode = FS.mayLookup(parent);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        var hash = FS.hashName(parent.id, name);
        for (var node = FS.nameTable[hash]; node; node = node.name_next) {
          var nodeName = node.name;
          if (node.parent.id === parent.id && nodeName === name) {
            return node;
          }
        }
        // if we failed to find it in the cache, call into the VFS
        return FS.lookup(parent, name);
      },
  createNode(parent, name, mode, rdev = undefined) {
        assert(typeof parent == 'object')
        var node = new FS.FSNode(parent, name, mode, rdev);
  
        FS.hashAddNode(node);
  
        return node;
      },
  destroyNode(node) {
        FS.hashRemoveNode(node);
      },
  isRoot(node) {
        return node === node.parent;
      },
  isMountpoint(node) {
        return !!node.mounted;
      },
  isFile(mode) {
        return (mode & 61440) === 32768;
      },
  isDir(mode) {
        return (mode & 61440) === 16384;
      },
  isLink(mode) {
        return (mode & 61440) === 40960;
      },
  isChrdev(mode) {
        return (mode & 61440) === 8192;
      },
  isBlkdev(mode) {
        return (mode & 61440) === 24576;
      },
  isFIFO(mode) {
        return (mode & 61440) === 4096;
      },
  isSocket(mode) {
        return (mode & 49152) === 49152;
      },
  flagsToPermissionString(flag) {
        var perms = ['r', 'w', 'rw'][flag & 3];
        if ((flag & 512)) {
          perms += 'w';
        }
        return perms;
      },
  nodePermissions(node, perms) {
        if (FS.ignorePermissions) {
          return 0;
        }
        // return 0 if any user, group or owner bits are set.
        if (perms.includes('r') && !(node.mode & 292)) {
          return 2;
        }
        if (perms.includes('w') && !(node.mode & 146)) {
          return 2;
        }
        if (perms.includes('x') && !(node.mode & 73)) {
          return 2;
        }
        return 0;
      },
  mayLookup(dir) {
        if (!FS.isDir(dir.mode)) return 54;
        var errCode = FS.nodePermissions(dir, 'x');
        if (errCode) return errCode;
        if (!dir.node_ops.lookup) return 2;
        return 0;
      },
  mayCreate(dir, name) {
        if (!FS.isDir(dir.mode)) {
          return 54;
        }
        try {
          var node = FS.lookupNode(dir, name);
          return 20;
        } catch (e) {
        }
        return FS.nodePermissions(dir, 'wx');
      },
  mayDelete(dir, name, isdir) {
        var node;
        try {
          node = FS.lookupNode(dir, name);
        } catch (e) {
          return e.errno;
        }
        var errCode = FS.nodePermissions(dir, 'wx');
        if (errCode) {
          return errCode;
        }
        if (isdir) {
          if (!FS.isDir(node.mode)) {
            return 54;
          }
          if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
            return 10;
          }
        } else if (FS.isDir(node.mode)) {
          return 31;
        }
        return 0;
      },
  mayOpen(node, flags) {
        if (!node) {
          return 44;
        }
        if (FS.isLink(node.mode)) {
          return 32;
        }
        var mode = FS.flagsToPermissionString(flags);
        if (FS.isDir(node.mode)) {
          // opening for write
          // TODO: check for O_SEARCH? (== search for dir only)
          if (mode !== 'r' || (flags & (512 | 64))) {
            return 31;
          }
        }
        return FS.nodePermissions(node, mode);
      },
  checkOpExists(op, err) {
        if (!op) {
          throw new FS.ErrnoError(err);
        }
        return op;
      },
  MAX_OPEN_FDS:4096,
  nextfd() {
        for (var fd = 0; fd <= FS.MAX_OPEN_FDS; fd++) {
          if (!FS.streams[fd]) {
            return fd;
          }
        }
        throw new FS.ErrnoError(33);
      },
  getStreamChecked(fd) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(8);
        }
        return stream;
      },
  getStream:(fd) => FS.streams[fd],
  createStream(stream, fd = -1) {
        assert(fd >= -1);
  
        // clone it, so we can return an instance of FSStream
        stream = Object.assign(new FS.FSStream(), stream);
        if (fd == -1) {
          fd = FS.nextfd();
        }
        stream.fd = fd;
        FS.streams[fd] = stream;
        return stream;
      },
  closeStream(fd) {
        FS.streams[fd] = null;
      },
  dupStream(origStream, fd = -1) {
        var stream = FS.createStream(origStream, fd);
        stream.stream_ops?.dup?.(stream);
        return stream;
      },
  doSetAttr(stream, node, attr) {
        var setattr = stream?.stream_ops.setattr;
        var arg = setattr ? stream : node;
        setattr ??= node.node_ops.setattr;
        FS.checkOpExists(setattr, 63)
        try {
          setattr(arg, attr);
        } catch (e) {
          if (e instanceof RangeError) {
            throw new FS.ErrnoError(22);
          }
          throw e;
        }
      },
  chrdev_stream_ops:{
  open(stream) {
          var device = FS.getDevice(stream.node.rdev);
          // override node's stream ops with the device's
          stream.stream_ops = device.stream_ops;
          // forward the open call
          stream.stream_ops.open?.(stream);
        },
  llseek() {
          throw new FS.ErrnoError(70);
        },
  },
  major:(dev) => ((dev) >> 8),
  minor:(dev) => ((dev) & 0xff),
  makedev:(ma, mi) => ((ma) << 8 | (mi)),
  registerDevice(dev, ops) {
        FS.devices[dev] = { stream_ops: ops };
      },
  getDevice:(dev) => FS.devices[dev],
  getMounts(mount) {
        var mounts = [];
        var check = [mount];
  
        while (check.length) {
          var m = check.pop();
  
          mounts.push(m);
  
          check.push(...m.mounts);
        }
  
        return mounts;
      },
  syncfs(populate, callback) {
        if (typeof populate == 'function') {
          callback = populate;
          populate = false;
        }
  
        FS.syncFSRequests++;
  
        if (FS.syncFSRequests > 1) {
          err(`warning: ${FS.syncFSRequests} FS.syncfs operations in flight at once, probably just doing extra work`);
        }
  
        var mounts = FS.getMounts(FS.root.mount);
        var completed = 0;
  
        function doCallback(errCode) {
          assert(FS.syncFSRequests > 0);
          FS.syncFSRequests--;
          return callback(errCode);
        }
  
        function done(errCode) {
          if (errCode) {
            if (!done.errored) {
              done.errored = true;
              return doCallback(errCode);
            }
            return;
          }
          if (++completed >= mounts.length) {
            doCallback(null);
          }
        };
  
        // sync all mounts
        for (var mount of mounts) {
          if (mount.type.syncfs) {
            mount.type.syncfs(mount, populate, done);
          } else {
            done(null);
          }
        }
      },
  mount(type, opts, mountpoint) {
        if (typeof type == 'string') {
          // The filesystem was not included, and instead we have an error
          // message stored in the variable.
          throw type;
        }
        var root = mountpoint === '/';
        var pseudo = !mountpoint;
        var node;
  
        if (root && FS.root) {
          throw new FS.ErrnoError(10);
        } else if (!root && !pseudo) {
          var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
          mountpoint = lookup.path;  // use the absolute path
          node = lookup.node;
  
          if (FS.isMountpoint(node)) {
            throw new FS.ErrnoError(10);
          }
  
          if (!FS.isDir(node.mode)) {
            throw new FS.ErrnoError(54);
          }
        }
  
        var mount = {
          type,
          opts,
          mountpoint,
          mounts: []
        };
  
        // create a root node for the fs
        var mountRoot = type.mount(mount);
        mountRoot.mount = mount;
        mount.root = mountRoot;
  
        if (root) {
          FS.root = mountRoot;
        } else if (node) {
          // set as a mountpoint
          node.mounted = mount;
  
          // add the new mount to the current mount's children
          if (node.mount) {
            node.mount.mounts.push(mount);
          }
        }
  
        return mountRoot;
      },
  unmount(mountpoint) {
        var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
        if (!FS.isMountpoint(lookup.node)) {
          throw new FS.ErrnoError(28);
        }
  
        // destroy the nodes for this mount, and all its child mounts
        var node = lookup.node;
        var mount = node.mounted;
        var mounts = FS.getMounts(mount);
  
        for (var [hash, current] of Object.entries(FS.nameTable)) {
          while (current) {
            var next = current.name_next;
  
            if (mounts.includes(current.mount)) {
              FS.destroyNode(current);
            }
  
            current = next;
          }
        }
  
        // no longer a mountpoint
        node.mounted = null;
  
        // remove this mount from the child mounts
        var idx = node.mount.mounts.indexOf(mount);
        assert(idx !== -1);
        node.mount.mounts.splice(idx, 1);
      },
  lookup(parent, name) {
        return parent.node_ops.lookup(parent, name);
      },
  mknod(path, mode, dev) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        if (!name) {
          throw new FS.ErrnoError(28);
        }
        if (name === '.' || name === '..') {
          throw new FS.ErrnoError(20);
        }
        var errCode = FS.mayCreate(parent, name);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.mknod) {
          throw new FS.ErrnoError(63);
        }
        return parent.node_ops.mknod(parent, name, mode, dev);
      },
  statfs(path) {
        return FS.statfsNode(FS.lookupPath(path, {follow: true}).node);
      },
  statfsStream(stream) {
        // We keep a separate statfsStream function because noderawfs overrides
        // it. In noderawfs, stream.node is sometimes null. Instead, we need to
        // look at stream.path.
        return FS.statfsNode(stream.node);
      },
  statfsNode(node) {
        // NOTE: None of the defaults here are true. We're just returning safe and
        //       sane values. Currently nodefs and rawfs replace these defaults,
        //       other file systems leave them alone.
        var rtn = {
          bsize: 4096,
          frsize: 4096,
          blocks: 1_000_000,
          bfree: 500_000,
          bavail: 500_000,
          files: FS.nextInode,
          ffree: FS.nextInode - 1,
          fsid: 42,
          flags: 2,
          namelen: 255,
        };
  
        if (node.node_ops.statfs) {
          Object.assign(rtn, node.node_ops.statfs(node.mount.opts.root));
        }
        return rtn;
      },
  create(path, mode = 0o666) {
        mode &= 4095;
        mode |= 32768;
        return FS.mknod(path, mode, 0);
      },
  mkdir(path, mode = 0o777) {
        mode &= 511 | 512;
        mode |= 16384;
        return FS.mknod(path, mode, 0);
      },
  mkdirTree(path, mode = 0o777) {
        var dirs = path.split('/');
        var d = '';
        for (var dir of dirs) {
          if (!dir) continue;
          if (d || PATH.isAbs(path)) d += '/';
          d += dir;
          try {
            FS.mkdir(d, mode);
          } catch(e) {
            if (e.errno != 20) throw e;
          }
        }
      },
  mkdev(path, mode, dev = undefined) {
        if (typeof dev == 'undefined') {
          dev = mode;
          mode = 0o666;
        }
        mode |= 8192;
        return FS.mknod(path, mode, dev);
      },
  symlink(oldpath, newpath) {
        if (!PATH_FS.resolve(oldpath)) {
          throw new FS.ErrnoError(44);
        }
        var lookup = FS.lookupPath(newpath, { parent: true });
        var parent = lookup.node;
        if (!parent) {
          throw new FS.ErrnoError(44);
        }
        var newname = PATH.basename(newpath);
        var errCode = FS.mayCreate(parent, newname);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.symlink) {
          throw new FS.ErrnoError(63);
        }
        return parent.node_ops.symlink(parent, newname, oldpath);
      },
  link(oldpath, newpath, flags) {
        var lookup = FS.lookupPath(newpath, { parent: true });
        var parent = lookup.node;
        if (!parent) {
          throw new FS.ErrnoError(44);
        }
        var newname = PATH.basename(newpath);
        var errCode = FS.mayCreate(parent, newname);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        // Hardlinks are only supported by filesystem backends that provide a
        // `link` node op (e.g. NODERAWFS backed by the host). NODEFS omits it:
        // a host hardlink cannot be confined to the mount root.
        if (!parent.node_ops.link) {
          throw new FS.ErrnoError(34);
        }
        return parent.node_ops.link(parent, newname, oldpath, flags);
      },
  rename(old_path, new_path) {
        var old_dirname = PATH.dirname(old_path);
        var new_dirname = PATH.dirname(new_path);
        var old_name = PATH.basename(old_path);
        var new_name = PATH.basename(new_path);
        // parents must exist
        var lookup, old_dir, new_dir;
  
        // let the errors from non existent directories percolate up
        lookup = FS.lookupPath(old_path, { parent: true });
        old_dir = lookup.node;
        lookup = FS.lookupPath(new_path, { parent: true });
        new_dir = lookup.node;
  
        if (!old_dir || !new_dir) throw new FS.ErrnoError(44);
        // need to be part of the same mount
        if (old_dir.mount !== new_dir.mount) {
          throw new FS.ErrnoError(75);
        }
        // source must exist
        var old_node = FS.lookupNode(old_dir, old_name);
        // old path should not be an ancestor of the new path
        var relative = PATH_FS.relative(old_path, new_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(28);
        }
        // new path should not be an ancestor of the old path
        relative = PATH_FS.relative(new_path, old_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(55);
        }
        // see if the new path already exists
        var new_node;
        try {
          new_node = FS.lookupNode(new_dir, new_name);
        } catch (e) {
          // not fatal
        }
        // early out if nothing needs to change
        if (old_node === new_node) {
          return;
        }
        // we'll need to delete the old entry
        var isdir = FS.isDir(old_node.mode);
        var errCode = FS.mayDelete(old_dir, old_name, isdir);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        // need delete permissions if we'll be overwriting.
        // need create permissions if new doesn't already exist.
        errCode = new_node ?
          FS.mayDelete(new_dir, new_name, isdir) :
          FS.mayCreate(new_dir, new_name);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!old_dir.node_ops.rename) {
          throw new FS.ErrnoError(63);
        }
        if (FS.isMountpoint(old_node) || (new_node && FS.isMountpoint(new_node))) {
          throw new FS.ErrnoError(10);
        }
        // if we are going to change the parent, check write permissions
        if (new_dir !== old_dir) {
          errCode = FS.nodePermissions(old_dir, 'w');
          if (errCode) {
            throw new FS.ErrnoError(errCode);
          }
        }
        // remove the node from the lookup hash
        FS.hashRemoveNode(old_node);
        // do the underlying fs rename
        try {
          old_dir.node_ops.rename(old_node, new_dir, new_name);
          // The replaced node is stale now. Evict it only after the rename
          // succeeded: backends like NODEFS report node.id as st_ino.
          if (new_node) {
            FS.hashRemoveNode(new_node);
          }
          // update old node (we do this here to avoid each backend
          // needing to)
          old_node.parent = new_dir;
        } catch (e) {
          throw e;
        } finally {
          // add the node back to the hash (in case node_ops.rename
          // changed its name)
          FS.hashAddNode(old_node);
        }
      },
  rmdir(path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var errCode = FS.mayDelete(parent, name, true);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.rmdir) {
          throw new FS.ErrnoError(63);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(10);
        }
        parent.node_ops.rmdir(parent, name);
        FS.destroyNode(node);
      },
  readdir(path) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        var readdir = FS.checkOpExists(node.node_ops.readdir, 54);
        return readdir(node);
      },
  unlink(path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        if (!parent) {
          throw new FS.ErrnoError(44);
        }
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var errCode = FS.mayDelete(parent, name, false);
        if (errCode) {
          // According to POSIX, we should map EISDIR to EPERM, but
          // we instead do what Linux does (and we must, as we use
          // the musl linux libc).
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.unlink) {
          throw new FS.ErrnoError(63);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(10);
        }
        parent.node_ops.unlink(parent, name);
        FS.destroyNode(node);
      },
  readlink(path) {
        var lookup = FS.lookupPath(path);
        var link = lookup.node;
        if (!link) {
          throw new FS.ErrnoError(44);
        }
        if (!link.node_ops.readlink) {
          throw new FS.ErrnoError(28);
        }
        return link.node_ops.readlink(link);
      },
  stat(path, dontFollow = false) {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        var node = lookup.node;
        var getattr = FS.checkOpExists(node.node_ops.getattr, 63);
        return getattr(node);
      },
  fstat(fd) {
        var stream = FS.getStreamChecked(fd);
        var node = stream.node;
        var getattr = stream.stream_ops.getattr;
        var arg = getattr ? stream : node;
        getattr ??= node.node_ops.getattr;
        FS.checkOpExists(getattr, 63)
        return getattr(arg);
      },
  lstat(path) {
        return FS.stat(path, true);
      },
  doChmod(stream, node, mode, dontFollow = false) {
        FS.doSetAttr(stream, node, {
          mode: (mode & 4095) | (node.mode & ~4095),
          ctime: Date.now(),
          dontFollow
        });
      },
  chmod(path, mode, dontFollow = false) {
        var node;
        if (typeof path == 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        FS.doChmod(null, node, mode, dontFollow);
      },
  lchmod(path, mode) {
        FS.chmod(path, mode, true);
      },
  fchmod(fd, mode) {
        var stream = FS.getStreamChecked(fd);
        FS.doChmod(stream, stream.node, mode, false);
      },
  doChown(stream, node, dontFollow = false) {
        FS.doSetAttr(stream, node, {
          timestamp: Date.now(),
          dontFollow
          // we ignore the uid / gid for now
        });
      },
  chown(path, uid, gid, dontFollow = false) {
        var node;
        if (typeof path == 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        FS.doChown(null, node, dontFollow);
      },
  lchown(path, uid, gid) {
        FS.chown(path, uid, gid, true);
      },
  fchown(fd, uid, gid) {
        var stream = FS.getStreamChecked(fd);
        FS.doChown(stream, stream.node, false);
      },
  doTruncate(stream, node, len) {
        if (FS.isDir(node.mode)) {
          throw new FS.ErrnoError(31);
        }
        if (!FS.isFile(node.mode)) {
          throw new FS.ErrnoError(28);
        }
        var errCode = FS.nodePermissions(node, 'w');
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        FS.doSetAttr(stream, node, {
          size: len,
          timestamp: Date.now()
        });
      },
  truncate(path, len) {
        if (len < 0) {
          throw new FS.ErrnoError(28);
        }
        var node;
        if (typeof path == 'string') {
          var lookup = FS.lookupPath(path, { follow: true });
          node = lookup.node;
        } else {
          node = path;
        }
        FS.doTruncate(null, node, len);
      },
  ftruncate(fd, len) {
        var stream = FS.getStreamChecked(fd);
        if (len < 0 || (stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(28);
        }
        FS.doTruncate(stream, stream.node, len);
      },
  utime(path, atime, mtime, dontFollow = false) {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        FS.doSetAttr(null, lookup.node, {
          atime: atime,
          mtime: mtime,
          dontFollow
        });
      },
  open(path, flags, mode = 0o666) {
        if (path === '') {
          throw new FS.ErrnoError(44);
        }
        flags = FS_modeStringToFlags(flags);
        if ((flags & 64)) {
          mode = (mode & 4095) | 32768;
        } else {
          mode = 0;
        }
        var node;
        var isDirPath;
        if (typeof path == 'object') {
          node = path;
        } else {
          isDirPath = path.endsWith('/');
          // noent_okay makes it so that if the final component of the path
          // doesn't exist, lookupPath returns `node: undefined`. `path` will be
          // updated to point to the target of all symlinks.
          var lookup = FS.lookupPath(path, {
            follow: !(flags & 131072),
            noent_okay: true
          });
          node = lookup.node;
          path = lookup.path;
        }
        // perhaps we need to create the node
        var created = false;
        if ((flags & 64)) {
          if (node) {
            // if O_CREAT and O_EXCL are set, error out if the node already exists
            if ((flags & 128)) {
              throw new FS.ErrnoError(20);
            }
          } else if (isDirPath) {
            throw new FS.ErrnoError(31);
          } else {
            // node doesn't exist, try to create it
            // Ignore the permission bits here to ensure we can `open` this new
            // file below. We use chmod below to apply the permissions once the
            // file is open.
            node = FS.mknod(path, mode | 0o777, 0);
            created = true;
          }
        }
        if (!node) {
          throw new FS.ErrnoError(44);
        }
        // can't truncate a device
        if (FS.isChrdev(node.mode)) {
          flags &= ~512;
        }
        // if asked only for a directory, then this must be one
        if ((flags & 65536) && !FS.isDir(node.mode)) {
          throw new FS.ErrnoError(54);
        }
        // check permissions, if this is not a file we just created now (it is ok to
        // create and write to a file with read-only permissions; it is read-only
        // for later use)
        if (!created) {
          var errCode = FS.mayOpen(node, flags);
          if (errCode) {
            throw new FS.ErrnoError(errCode);
          }
        }
        // do truncation if necessary
        if ((flags & 512) && !created) {
          FS.truncate(node, 0);
        }
        // we've already handled these, don't pass down to the underlying vfs
        flags &= ~(128 | 512 | 131072);
  
        // register the stream with the filesystem
        var stream = FS.createStream({
          node,
          path: FS.getPath(node),  // we want the absolute path to the node
          flags,
          seekable: true,
          position: 0,
          stream_ops: node.stream_ops,
          // used by the file family libc calls (fopen, fwrite, ferror, etc.)
          ungotten: [],
          error: false
        });
        // call the new stream's open function
        if (stream.stream_ops.open) {
          stream.stream_ops.open(stream);
        }
        if (created) {
          FS.chmod(node, mode & 0o777);
        }
        return stream;
      },
  close(stream) {
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if (stream.getdents) stream.getdents = null; // free readdir state
        // The fd is going away: wake anything waiting on it (poll/epoll) with
        // POLLNVAL so a blocking wait unblocks and an epoll registration is evicted
        // on its next derive. Only sockets/pipes/epoll ever carry a wait-queue, so
        // for every other stream (incl. nodeless noderawfs stdio) this is a no-op.
        stream.node?.notifyListeners(32);
        try {
          if (stream.stream_ops.close) {
            stream.stream_ops.close(stream);
          }
        } catch (e) {
          throw e;
        } finally {
          FS.closeStream(stream.fd);
        }
        stream.fd = null;
      },
  isClosed(stream) {
        return stream.fd === null;
      },
  llseek(stream, offset, whence) {
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if (!stream.seekable || !stream.stream_ops.llseek) {
          throw new FS.ErrnoError(70);
        }
        if (whence != 0 && whence != 1 && whence != 2) {
          throw new FS.ErrnoError(28);
        }
        stream.position = stream.stream_ops.llseek(stream, offset, whence);
        stream.ungotten = [];
        return stream.position;
      },
  read(stream, buffer, offset, length, position = undefined) {
        assert(offset >= 0);
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(28);
        }
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(8);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(31);
        }
        if (!stream.stream_ops.read) {
          throw new FS.ErrnoError(28);
        }
        var seeking = typeof position != 'undefined';
        if (!seeking) {
          position = stream.position;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(70);
        }
        var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
        if (!seeking) stream.position += bytesRead;
        return bytesRead;
      },
  write(stream, buffer, offset, length, position = undefined, canOwn = undefined) {
        assert(offset >= 0);
        assert(buffer.subarray, 'FS.write expects a TypedArray');
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(28);
        }
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(8);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(31);
        }
        if (!stream.stream_ops.write) {
          throw new FS.ErrnoError(28);
        }
        if (stream.seekable && stream.flags & 1024) {
          // seek to the end before writing in append mode
          FS.llseek(stream, 0, 2);
        }
        var seeking = typeof position != 'undefined';
        if (!seeking) {
          position = stream.position;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(70);
        }
        var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
        if (!seeking) stream.position += bytesWritten;
        return bytesWritten;
      },
  mmap(stream, length, position, prot, flags) {
        // User requests writing to file (prot & PROT_WRITE != 0).
        // Checking if we have permissions to write to the file unless
        // MAP_PRIVATE flag is set. According to POSIX spec it is possible
        // to write to file opened in read-only mode with MAP_PRIVATE flag,
        // as all modifications will be visible only in the memory of
        // the current process.
        if ((prot & 2)
            && !(flags & 2)
            && (stream.flags & 2097155) !== 2) {
          throw new FS.ErrnoError(2);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(2);
        }
        if (!stream.stream_ops.mmap) {
          throw new FS.ErrnoError(43);
        }
        if (!length) {
          throw new FS.ErrnoError(28);
        }
        return stream.stream_ops.mmap(stream, length, position, prot, flags);
      },
  msync(stream, buffer, offset, length, mmapFlags) {
        assert(offset >= 0);
        if (!stream.stream_ops.msync) {
          return 0;
        }
        return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags);
      },
  ioctl(stream, cmd, arg) {
        if (!stream.stream_ops.ioctl) {
          throw new FS.ErrnoError(59);
        }
        return stream.stream_ops.ioctl(stream, cmd, arg);
      },
  readFile(path, opts = {}) {
        opts.flags ??= 0;
        opts.encoding ??= 'binary';
        if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
          abort(`Invalid encoding type "${opts.encoding}"`);
        }
        var stream = FS.open(path, opts.flags);
        var stat = FS.stat(path);
        var length = stat.size;
        var buf = new Uint8Array(length);
        FS.read(stream, buf, 0, length, 0);
        if (opts.encoding === 'utf8') {
          buf = UTF8ArrayToString(buf);
        }
        FS.close(stream);
        return buf;
      },
  writeFile(path, data, opts = {}) {
        opts.flags ??= 577;
        var stream = FS.open(path, opts.flags, opts.mode);
        data = FS_fileDataToTypedArray(data);
        FS.write(stream, data, 0, data.byteLength, undefined, opts.canOwn);
        FS.close(stream);
      },
  cwd:() => FS.currentPath,
  chdir(path) {
        var lookup = FS.lookupPath(path, { follow: true });
        if (lookup.node === null) {
          throw new FS.ErrnoError(44);
        }
        if (!FS.isDir(lookup.node.mode)) {
          throw new FS.ErrnoError(54);
        }
        var errCode = FS.nodePermissions(lookup.node, 'x');
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        FS.currentPath = lookup.path;
      },
  createDefaultDirectories() {
        FS.mkdir('/tmp');
        FS.mkdir('/home');
        FS.mkdir('/home/web_user');
      },
  createDefaultDevices() {
        // create /dev
        FS.mkdir('/dev');
        // setup /dev/null
        FS.registerDevice(FS.makedev(1, 3), {
          read: () => 0,
          write: (stream, buffer, offset, length, pos) => length,
          llseek: () => 0,
        });
        FS.mkdev('/dev/null', FS.makedev(1, 3));
        // setup /dev/tty and /dev/tty1
        // stderr needs to print output using err() rather than out()
        // so we register a second tty just for it.
        TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
        TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
        FS.mkdev('/dev/tty', FS.makedev(5, 0));
        FS.mkdev('/dev/tty1', FS.makedev(6, 0));
        // setup /dev/[u]random
        // use a buffer to avoid overhead of individual crypto calls per byte
        var randomBuffer = new Uint8Array(1024), randomLeft = 0;
        var randomByte = () => {
          if (!randomLeft) {
            randomFill(randomBuffer);
            randomLeft = randomBuffer.byteLength;
          }
          return randomBuffer[--randomLeft];
        };
        FS.createDevice('/dev', 'random', randomByte);
        FS.createDevice('/dev', 'urandom', randomByte);
        // we're not going to emulate the actual shm device,
        // just create the tmp dirs that reside in it commonly
        FS.mkdir('/dev/shm');
        FS.mkdir('/dev/shm/tmp');
      },
  createSpecialDirectories() {
        // create /proc/self/fd which allows /proc/self/fd/6 => readlink gives the
        // name of the stream for fd 6 (see test_unistd_ttyname)
        FS.mkdir('/proc');
        var proc_self = FS.mkdir('/proc/self');
        FS.mkdir('/proc/self/fd');
        FS.mount({
          mount() {
            var node = FS.createNode(proc_self, 'fd', 16895, 73);
            node.stream_ops = {
              llseek: MEMFS.stream_ops.llseek,
            };
            node.node_ops = {
              lookup(parent, name) {
                var fd = +name;
                var stream = FS.getStreamChecked(fd);
                var ret = {
                  parent: null,
                  mount: { mountpoint: 'fake' },
                  node_ops: { readlink: () => stream.path },
                  id: fd + 1,
                };
                ret.parent = ret; // make it look like a simple root node
                return ret;
              },
              readdir() {
                return Array.from(FS.streams.entries())
                  .filter(([k, v]) => v)
                  .map(([k, v]) => k.toString());
              }
            };
            return node;
          }
        }, {}, '/proc/self/fd');
      },
  createStandardStreams(input, output, error) {
        // TODO deprecate the old functionality of a single
        // input / output callback and that utilizes FS.createDevice
        // and instead require a unique set of stream ops
  
        // by default, we symlink the standard streams to the
        // default tty devices. however, if the standard streams
        // have been overwritten we create a unique device for
        // them instead.
        if (input) {
          FS.createDevice('/dev', 'stdin', input);
        } else {
          FS.symlink('/dev/tty', '/dev/stdin');
        }
        if (output) {
          FS.createDevice('/dev', 'stdout', null, output);
        } else {
          FS.symlink('/dev/tty', '/dev/stdout');
        }
        if (error) {
          FS.createDevice('/dev', 'stderr', null, error);
        } else {
          FS.symlink('/dev/tty1', '/dev/stderr');
        }
  
        // open default streams for the stdin, stdout and stderr devices
        var stdin = FS.open('/dev/stdin', 0);
        var stdout = FS.open('/dev/stdout', 1);
        var stderr = FS.open('/dev/stderr', 1);
        assert(stdin.fd === 0, `invalid handle for stdin (${stdin.fd})`);
        assert(stdout.fd === 1, `invalid handle for stdout (${stdout.fd})`);
        assert(stderr.fd === 2, `invalid handle for stderr (${stderr.fd})`);
      },
  staticInit() {
        FS.nameTable.length = 4096;
  
        FS.mount(MEMFS, {}, '/');
  
        FS.createDefaultDirectories();
        FS.createDefaultDevices();
        FS.createSpecialDirectories();
  
        FS.filesystems = {
          'MEMFS': MEMFS,
        };
      },
  init(input = undefined, output = undefined, error = undefined) {
        assert(!FS.initialized, 'FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)');
        FS.initialized = true;
  
        // Allow Module.stdin etc. to provide defaults, if none explicitly passed to us here
        input ??= Module['stdin'];
        output ??= Module['stdout'];
        error ??= Module['stderr'];
  
        FS.createStandardStreams(input, output, error);
      },
  quit() {
        FS.initialized = false;
        // force-flush all streams, so we get musl std streams printed out
        _fflush(0);
        // close all of our streams
        for (var stream of FS.streams) {
          if (stream) {
            FS.close(stream);
          }
        }
      },
  analyzePath(path, dontResolveLastLink = false) {
        warnOnce('FS.analyzePath is deprecated; use FS.lookupPath or FS.stat instead');
        // operate from within the context of the symlink's target
        try {
          var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          path = lookup.path;
        } catch (e) {
        }
        var ret = {
          isRoot: false, exists: false, error: 0, name: null, path: null, object: null,
          parentExists: false, parentPath: null, parentObject: null
        };
        try {
          var lookup = FS.lookupPath(path, { parent: true });
          ret.parentExists = true;
          ret.parentPath = lookup.path;
          ret.parentObject = lookup.node;
          ret.name = PATH.basename(path);
          lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          ret.exists = true;
          ret.path = lookup.path;
          ret.object = lookup.node;
          ret.name = lookup.node.name;
          ret.isRoot = lookup.path === '/';
        } catch (e) {
          ret.error = e.errno;
        };
        return ret;
      },
  createPath(parent, path, canRead = undefined, canWrite = undefined) {
        parent = typeof parent == 'string' ? parent : FS.getPath(parent);
        var parts = path.split('/').reverse();
        while (parts.length) {
          var part = parts.pop();
          if (!part) continue;
          var current = PATH.join2(parent, part);
          try {
            FS.mkdir(current);
          } catch (e) {
            if (e.errno != 20) throw e;
          }
          parent = current;
        }
        return current;
      },
  createFile(parent, name, properties, canRead = undefined, canWrite = undefined) {
        var path = PATH.join2(typeof parent == 'string' ? parent : FS.getPath(parent), name);
        var mode = FS_getMode(canRead, canWrite);
        return FS.create(path, mode);
      },
  createDataFile(parent, name, data = undefined, canRead = undefined, canWrite = undefined, canOwn = undefined) {
        var path = name;
        if (parent) {
          parent = typeof parent == 'string' ? parent : FS.getPath(parent);
          path = name ? PATH.join2(parent, name) : parent;
        }
        var mode = FS_getMode(canRead, canWrite);
        var node = FS.create(path, mode);
        if (data) {
          data = FS_fileDataToTypedArray(data);
          // make sure we can write to the file
          FS.chmod(node, mode | 146);
          var stream = FS.open(node, 577);
          FS.write(stream, data, 0, data.length, 0, canOwn);
          FS.close(stream);
          FS.chmod(node, mode);
        }
      },
  createDevice(parent, name, input = undefined, output = undefined) {
        var path = PATH.join2(typeof parent == 'string' ? parent : FS.getPath(parent), name);
        var mode = FS_getMode(!!input, !!output);
        FS.createDevice.major ??= 64;
        var dev = FS.makedev(FS.createDevice.major++, 0);
        // Create a fake device that a set of stream ops to emulate
        // the old behavior.
        FS.registerDevice(dev, {
          open(stream) {
            stream.seekable = false;
          },
          close(stream) {
            // flush any pending line data
            if (output?.buffer?.length) {
              output(10);
            }
          },
          read(stream, buffer, offset, length, pos /* ignored */) {
            var bytesRead = 0;
            for (var i = 0; i < length; i++) {
              var result;
              try {
                result = input();
              } catch (e) {
                throw new FS.ErrnoError(29);
              }
              if (result === undefined && !bytesRead) {
                throw new FS.ErrnoError(6);
              }
              if (result === null || result === undefined) break;
              bytesRead++;
              buffer[offset+i] = result;
            }
            if (bytesRead) {
              stream.node.atime = Date.now();
            }
            return bytesRead;
          },
          write(stream, buffer, offset, length, pos) {
            for (var i = 0; i < length; i++) {
              try {
                output(buffer[offset+i]);
              } catch (e) {
                throw new FS.ErrnoError(29);
              }
            }
            if (length) {
              stream.node.mtime = stream.node.ctime = Date.now();
            }
            return i;
          }
        });
        return FS.mkdev(path, mode, dev);
      },
  forceLoadFile(obj) {
        if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
        if (globalThis.XMLHttpRequest) {
          abort('Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.');
        } else { // Command-line.
          try {
            obj.contents = readBinary(obj.url);
          } catch (e) {
            throw new FS.ErrnoError(29);
          }
        }
      },
  createLazyFile(parent, name, url, canRead = undefined, canWrite = undefined) {
        // Lazy chunked Uint8Array (implements get and length from Uint8Array).
        // Actual getting is abstracted away for eventual reuse.
        class LazyUint8Array {
          lengthKnown = false;
          chunks = []; // Loaded chunks. Index is the chunk number
          get(idx) {
            if (idx > this.length-1 || idx < 0) {
              return undefined;
            }
            var chunkOffset = idx % this.chunkSize;
            var chunkNum = (idx / this.chunkSize)|0;
            return this.getter(chunkNum)[chunkOffset];
          }
          setDataGetter(getter) {
            this.getter = getter;
          }
          cacheLength() {
            // Find length
            var xhr = new XMLHttpRequest();
            xhr.open('HEAD', url, false);
            xhr.send(null);
            if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) abort(`Couldn't load ${url}. Status: ${xhr.status}`);
            var datalength = Number(xhr.getResponseHeader('Content-length'));
            var header;
            var hasByteServing = (header = xhr.getResponseHeader('Accept-Ranges')) && header === 'bytes';
            var usesGzip = (header = xhr.getResponseHeader('Content-Encoding')) && header === 'gzip';
  
            var chunkSize = 1024*1024; // Chunk size in bytes
  
            if (!hasByteServing) chunkSize = datalength;
  
            // Function to get a range from the remote URL.
            var doXHR = (from, to) => {
              if (from > to) abort(`invalid range (${from}, ${to}) or no bytes requested!`);
              if (to > datalength-1) abort(`only ${datalength} bytes available! programmer error!`);
  
              // TODO: Use mozResponseArrayBuffer, responseStream, etc. if available.
              var xhr = new XMLHttpRequest();
              xhr.open('GET', url, false);
              if (datalength !== chunkSize) xhr.setRequestHeader('Range', `bytes=${from}-${to}`);
  
              // Some hints to the browser that we want binary data.
              xhr.responseType = 'arraybuffer';
              if (xhr.overrideMimeType) {
                xhr.overrideMimeType('text/plain; charset=x-user-defined');
              }
  
              xhr.send(null);
              if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) abort(`Couldn't load ${url}. Status: ${xhr.status}`);
              if (xhr.response !== undefined) {
                return new Uint8Array(/** @type{Array<number>} */(xhr.response || []));
              }
              return intArrayFromString(xhr.responseText ?? '', true);
            };
            var lazyArray = this;
            lazyArray.setDataGetter((chunkNum) => {
              var start = chunkNum * chunkSize;
              var end = (chunkNum+1) * chunkSize - 1; // including this byte
              end = Math.min(end, datalength-1); // if datalength-1 is selected, this is the last block
              if (typeof lazyArray.chunks[chunkNum] == 'undefined') {
                lazyArray.chunks[chunkNum] = doXHR(start, end);
              }
              if (typeof lazyArray.chunks[chunkNum] == 'undefined') abort('doXHR failed!');
              return lazyArray.chunks[chunkNum];
            });
  
            if (usesGzip || !datalength) {
              // if the server uses gzip or doesn't supply the length, we have to download the whole file to get the (uncompressed) length
              chunkSize = datalength = 1; // this will force getter(0)/doXHR do download the whole file
              datalength = this.getter(0).length;
              chunkSize = datalength;
              out('LazyFiles on gzip forces download of the whole file when length is accessed');
            }
  
            this._length = datalength;
            this._chunkSize = chunkSize;
            this.lengthKnown = true;
          }
          get length() {
            if (!this.lengthKnown) {
              this.cacheLength();
            }
            return this._length;
          }
          get chunkSize() {
            if (!this.lengthKnown) {
              this.cacheLength();
            }
            return this._chunkSize;
          }
        }
  
        if (globalThis.XMLHttpRequest) {
          if (!ENVIRONMENT_IS_WORKER) abort('Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc');
          var lazyArray = new LazyUint8Array();
          var properties = { isDevice: false, contents: lazyArray };
        } else {
          var properties = { isDevice: false, url: url };
        }
  
        var node = FS.createFile(parent, name, properties, canRead, canWrite);
        // This is a total hack, but I want to get this lazy file code out of the
        // core of MEMFS. If we want to keep this lazy file concept I feel it should
        // be its own thin LAZYFS proxying calls to MEMFS.
        if (properties.contents) {
          node.contents = properties.contents;
        } else if (properties.url) {
          node.contents = null;
          node.url = properties.url;
        }
        // Add a function that defers querying the file size until it is asked the first time.
        Object.defineProperties(node, {
          usedBytes: {
            get: function() { return this.contents.length; }
          }
        });
        // override each stream op with one that tries to force load the lazy file first
        var stream_ops = {};
        for (const [key, fn] of Object.entries(node.stream_ops)) {
          stream_ops[key] = (...args) => {
            FS.forceLoadFile(node);
            return fn(...args);
          };
        }
        function writeChunks(stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= contents.length)
            return 0;
          var size = Math.min(contents.length - position, length);
          assert(size >= 0);
          if (contents.slice) { // normal array
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents[position + i];
            }
          } else {
            for (var i = 0; i < size; i++) { // LazyUint8Array from sync binary XHR
              buffer[offset + i] = contents.get(position + i);
            }
          }
          return size;
        }
        // use a custom read function
        stream_ops.read = (stream, buffer, offset, length, position) => {
          FS.forceLoadFile(node);
          return writeChunks(stream, buffer, offset, length, position)
        };
        // use a custom mmap function
        stream_ops.mmap = (stream, length, position, prot, flags) => {
          FS.forceLoadFile(node);
          var ptr = mmapAlloc(length);
          if (!ptr) {
            throw new FS.ErrnoError(48);
          }
          writeChunks(stream, HEAP8, ptr, length, position);
          return { ptr, allocated: true };
        };
        node.stream_ops = stream_ops;
        return node;
      },
  };
  
  
  
  
  
  /** not-@type {!BigInt64Array} */
  var HEAP64;
  var SYSCALLS = {
  currentUmask:18,
  calculateAt(dirfd, path, allowEmpty = false) {
        if (PATH.isAbs(path)) {
          return path;
        }
        // relative path
        var dir;
        if (dirfd === -100) {
          dir = FS.cwd();
        } else {
          var dirstream = SYSCALLS.getStreamFromFD(dirfd);
          dir = dirstream.path;
        }
        if (path.length == 0) {
          if (!allowEmpty) {
            throw new FS.ErrnoError(44);;
          }
          return dir;
        }
        return dir + '/' + path;
      },
  writeStat(buf, stat) {
        HEAPU32[((buf)>>2)] = stat.dev;
        HEAPU32[(((buf)+(4))>>2)] = stat.mode;
        HEAPU32[(((buf)+(8))>>2)] = stat.nlink;
        HEAPU32[(((buf)+(12))>>2)] = stat.uid;
        HEAPU32[(((buf)+(16))>>2)] = stat.gid;
        HEAPU32[(((buf)+(20))>>2)] = stat.rdev;
        HEAP64[(((buf)+(24))>>3)] = BigInt(stat.size);
        HEAP32[(((buf)+(32))>>2)] = 4096;
        HEAP32[(((buf)+(36))>>2)] = stat.blocks;
        // Prefer `*Ms` properties if available (e.g. from MEMFS, or NODEFS / host
        // `fs.Stats`) for sub-millisecond precision; fall back to Date#getTime for
        // other filesystems.
        var atime = stat.atimeMs ?? stat.atime.getTime();
        var mtime = stat.mtimeMs ?? stat.mtime.getTime();
        var ctime = stat.ctimeMs ?? stat.ctime.getTime();
        HEAP64[(((buf)+(40))>>3)] = BigInt(Math.floor(atime / 1000));
        HEAPU32[(((buf)+(48))>>2)] = Math.floor((atime % 1000) * 1_000_000);
        HEAP64[(((buf)+(56))>>3)] = BigInt(Math.floor(mtime / 1000));
        HEAPU32[(((buf)+(64))>>2)] = Math.floor((mtime % 1000) * 1_000_000);
        HEAP64[(((buf)+(72))>>3)] = BigInt(Math.floor(ctime / 1000));
        HEAPU32[(((buf)+(80))>>2)] = Math.floor((ctime % 1000) * 1_000_000);
        HEAP64[(((buf)+(88))>>3)] = BigInt(stat.ino);
        return 0;
      },
  writeStatFs(buf, stats) {
        HEAPU32[(((buf)+(4))>>2)] = stats.bsize;
        HEAPU32[(((buf)+(60))>>2)] = stats.bsize;
        HEAP64[(((buf)+(8))>>3)] = BigInt(stats.blocks);
        HEAP64[(((buf)+(16))>>3)] = BigInt(stats.bfree);
        HEAP64[(((buf)+(24))>>3)] = BigInt(stats.bavail);
        HEAP64[(((buf)+(32))>>3)] = BigInt(stats.files);
        HEAP64[(((buf)+(40))>>3)] = BigInt(stats.ffree);
        HEAPU32[(((buf)+(48))>>2)] = stats.fsid;
        HEAPU32[(((buf)+(64))>>2)] = stats.flags;  // ST_NOSUID
        HEAPU32[(((buf)+(56))>>2)] = stats.namelen;
      },
  doMsync(addr, stream, len, flags, offset) {
        if (!FS.isFile(stream.node.mode)) {
          throw new FS.ErrnoError(43);
        }
        if (flags & 2) {
          // MAP_PRIVATE calls need not to be synced back to underlying fs
          return 0;
        }
        var buffer = HEAPU8.subarray(addr, addr + len);
        FS.msync(stream, buffer, offset, len, flags);
      },
  getStreamFromFD(fd) {
        var stream = FS.getStreamChecked(fd);
        return stream;
      },
  varargs:undefined,
  getStr(ptr) {
        var ret = UTF8ToString(ptr);
        return ret;
      },
  };
  
  /** @type {!Int16Array} */
  var HEAP16;
  function ___syscall_fcntl64(fd, cmd, varargs) {
  SYSCALLS.varargs = varargs;
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      switch (cmd) {
        case 0: {
          var arg = syscallGetVarargI();
          if (arg < 0) {
            return -28;
          }
          while (FS.streams[arg]) {
            arg++;
          }
          var newStream;
          newStream = FS.dupStream(stream, arg);
          return newStream.fd;
        }
        case 1:
        case 2:
          return 0;  // FD_CLOEXEC makes no sense for a single process.
        case 3:
          return stream.flags;
        case 4: {
          var arg = syscallGetVarargI();
          var mask = 289792;
          stream.flags = (stream.flags & ~mask) | (arg & mask);
          return 0;
        }
        case 12: {
          var arg = syscallGetVarargP();
          var offset = 0;
          // We're always unlocked.
          HEAP16[(((arg)+(offset))>>1)] = 2;
          return 0;
        }
        case 13:
        case 14:
          // Pretend that the locking is successful. These are process-level locks,
          // and Emscripten programs are a single process. If we supported linking a
          // filesystem between programs, we'd need to do more here.
          // See https://github.com/emscripten-core/emscripten/issues/23697
          return 0;
      }
      return -28;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }
  

  function ___syscall_fstat64(fd, buf) {
  try {
  
      return SYSCALLS.writeStat(buf, FS.fstat(fd));
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }
  

  
  
  
  
  function ___syscall_ioctl(fd, op, varargs) {
  SYSCALLS.varargs = varargs;
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      switch (op) {
        case 21509: {
          if (!stream.tty) return -59;
          return 0;
        }
        case 21505: {
          if (!stream.tty) return -59;
          if (stream.tty.ops.ioctl_tcgets) {
            var termios = stream.tty.ops.ioctl_tcgets(stream);
            var argp = syscallGetVarargP();
            HEAP32[((argp)>>2)] = termios.c_iflag || 0;
            HEAP32[(((argp)+(4))>>2)] = termios.c_oflag || 0;
            HEAP32[(((argp)+(8))>>2)] = termios.c_cflag || 0;
            HEAP32[(((argp)+(12))>>2)] = termios.c_lflag || 0;
            for (var i = 0; i < 32; i++) {
              HEAP8[(argp + i)+(17)] = termios.c_cc[i] || 0;
            }
            return 0;
          }
          return 0;
        }
        case 21510:
        case 21511:
        case 21512: {
          if (!stream.tty) return -59;
          return 0; // no-op, not actually adjusting terminal settings
        }
        case 21506:
        case 21507:
        case 21508: {
          if (!stream.tty) return -59;
          if (stream.tty.ops.ioctl_tcsets) {
            var argp = syscallGetVarargP();
            var c_iflag = HEAP32[((argp)>>2)];
            var c_oflag = HEAP32[(((argp)+(4))>>2)];
            var c_cflag = HEAP32[(((argp)+(8))>>2)];
            var c_lflag = HEAP32[(((argp)+(12))>>2)];
            var c_cc = []
            for (var i = 0; i < 32; i++) {
              c_cc.push(HEAP8[(argp + i)+(17)]);
            }
            return stream.tty.ops.ioctl_tcsets(stream.tty, op, { c_iflag, c_oflag, c_cflag, c_lflag, c_cc });
          }
          return 0; // no-op, not actually adjusting terminal settings
        }
        case 21519: {
          if (!stream.tty) return -59;
          var argp = syscallGetVarargP();
          HEAP32[((argp)>>2)] = 0;
          return 0;
        }
        case 21520: {
          if (!stream.tty) return -59;
          return -28; // not supported
        }
        case 21537:
        case 21531: {
          var argp = syscallGetVarargP();
          return FS.ioctl(stream, op, argp);
        }
        case 21523: {
          // TODO: in theory we should write to the winsize struct that gets
          // passed in, but for now musl doesn't read anything on it
          if (!stream.tty) return -59;
          if (stream.tty.ops.ioctl_tiocgwinsz) {
            var winsize = stream.tty.ops.ioctl_tiocgwinsz(stream.tty);
            var argp = syscallGetVarargP();
            HEAP16[((argp)>>1)] = winsize[0];
            HEAP16[(((argp)+(2))>>1)] = winsize[1];
          }
          return 0;
        }
        case 21524: {
          // TODO: technically, this ioctl call should change the window size.
          // but, since emscripten doesn't have any concept of a terminal window
          // yet, we'll just silently throw it away as we do TIOCGWINSZ
          if (!stream.tty) return -59;
          return 0;
        }
        case 21515: {
          if (!stream.tty) return -59;
          return 0;
        }
        default: return -28; // not supported
      }
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }
  

  function ___syscall_lstat64(path, buf) {
  try {
  
      path = SYSCALLS.getStr(path);
      return SYSCALLS.writeStat(buf, FS.lstat(path));
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }
  

  function ___syscall_newfstatat(dirfd, path, buf, flags) {
  try {
  
      path = SYSCALLS.getStr(path);
      var nofollow = flags & 256;
      var allowEmpty = flags & 4096;
      flags = flags & (~6400);
      assert(!flags, `unknown flags in __syscall_newfstatat: ${flags}`);
      path = SYSCALLS.calculateAt(dirfd, path, allowEmpty);
      return SYSCALLS.writeStat(buf, nofollow ? FS.lstat(path) : FS.stat(path));
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }
  

  
  function ___syscall_openat(dirfd, path, flags, varargs) {
  SYSCALLS.varargs = varargs;
  try {
  
      path = SYSCALLS.getStr(path);
      path = SYSCALLS.calculateAt(dirfd, path);
      var mode = varargs ? syscallGetVarargI() : 0;
      if (flags & 64) {
        mode &= ~SYSCALLS.currentUmask;
      }
      return FS.open(path, flags, mode).fd;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }
  

  function ___syscall_stat64(path, buf) {
  try {
  
      path = SYSCALLS.getStr(path);
      return SYSCALLS.writeStat(buf, FS.stat(path));
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }
  

  function ___syscall_unlinkat(dirfd, path, flags) {
  try {
  
      path = SYSCALLS.getStr(path);
      path = SYSCALLS.calculateAt(dirfd, path);
      if (!flags) {
        FS.unlink(path);
      } else if (flags === 512) {
        FS.rmdir(path);
      } else {
        return -28;
      }
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }
  

  var __abort_js = () =>
      abort('native code called abort()');

  var __emscripten_throw_longjmp = () => {
      throw new EmscriptenSjLj;
    };

  var _emscripten_get_now = () => performance.now();
  
  var _emscripten_date_now = () => Date.now();
  
  var nowIsMonotonic = 1;
  
  var checkWasiClock = (clock_id) => clock_id >= 0 && clock_id <= 3;
  
  var INT53_MAX = 9007199254740992;
  
  var INT53_MIN = -9007199254740992;
  var bigintToI53Checked = (num) => (num < INT53_MIN || num > INT53_MAX) ? NaN : Number(num);
  
  function _clock_time_get(clk_id, ignored_precision, ptime) {
    ignored_precision = bigintToI53Checked(ignored_precision);
  
  
      if (!checkWasiClock(clk_id)) {
        return 28;
      }
      var now;
      // all wasi clocks but realtime are monotonic
      if (clk_id === 0) {
        now = _emscripten_date_now();
      } else if (nowIsMonotonic) {
        now = _emscripten_get_now();
      } else {
        return 52;
      }
      // "now" is in ms, and wasi times are in ns.
      var nsec = Math.round(now * 1_000_000);
      HEAP64[((ptime)>>3)] = BigInt(nsec);
      return 0;
    ;
  }

  var readEmAsmArgsArray = [];
  
  
  
  
  /** @type {!Float64Array} */
  var HEAPF64;
  
  var readEmAsmArgs = (sigPtr, buf) => {
      // Nobody should have mutated _readEmAsmArgsArray underneath us to be something else than an array.
      assert(Array.isArray(readEmAsmArgsArray));
      // The input buffer is allocated on the stack, so it must be stack-aligned.
      assert(buf % 16 == 0);
      readEmAsmArgsArray.length = 0;
      var ch;
      // Most arguments are i32s, so shift the buffer pointer so it is a plain
      // index into HEAP32.
      while (ch = HEAPU8[sigPtr++]) {
        var chr = String.fromCharCode(ch);
        var validChars = ['d', 'f', 'i', 'p'];
        // In WASM_BIGINT mode we support passing i64 values as bigint.
        validChars.push('j');
        assert(validChars.includes(chr), `Invalid character ${ch}("${chr}") in readEmAsmArgs! Use only [${validChars}], and do not specify "v" for void return argument.`);
        // Floats are always passed as doubles, so all types except for 'i'
        // are 8 bytes and require alignment.
        var wide = (ch != 105);
        wide &= (ch != 112);
        buf += wide && (buf % 8) ? 4 : 0;
        readEmAsmArgsArray.push(
          // Special case for pointers under wasm64 or CAN_ADDRESS_2GB mode.
          ch == 112 ? HEAPU32[((buf)>>2)] :
          ch == 106 ? HEAP64[((buf)>>3)] :
          ch == 105 ?
            HEAP32[((buf)>>2)] :
            HEAPF64[((buf)>>3)]
        );
        buf += wide ? 8 : 4;
      }
      return readEmAsmArgsArray;
    };
  var runEmAsmFunction = (code, sigPtr, argbuf) => {
      var args = readEmAsmArgs(sigPtr, argbuf);
      assert(ASM_CONSTS.hasOwnProperty(code), `No EM_ASM constant found at address ${code}.  The loaded WebAssembly file is likely out of sync with the generated JavaScript.`);
      return ASM_CONSTS[code](...args);
    };
  var _emscripten_asm_const_int = (code, sigPtr, argbuf) => {
      return runEmAsmFunction(code, sigPtr, argbuf);
    };

  
  var _emscripten_set_main_loop_timing = (mode, value) => {
      MainLoop.timingMode = mode;
      MainLoop.timingValue = value;
  
      if (!MainLoop.func) {
        err('emscripten_set_main_loop_timing: Cannot set timing mode for main loop since a main loop does not exist! Call emscripten_set_main_loop first to set one up.');
        return 1; // Return non-zero on failure, can't set timing mode when there is no main loop.
      }
  
      if (mode == 0) {
        MainLoop.scheduler = function MainLoop_scheduler_setTimeout() {
          var timeUntilNextTick = Math.max(0, MainLoop.tickStartTime + value - _emscripten_get_now())|0;
          setTimeout(MainLoop.runner, timeUntilNextTick); // doing this each time means that on exception, we stop
        };
      } else if (mode == 1) {
        MainLoop.scheduler = function MainLoop_scheduler_rAF() {
          MainLoop.requestAnimationFrame(MainLoop.runner);
        };
      } else {
        assert(mode == 2);
        if (!MainLoop.setImmediate) {
          if (globalThis.scheduler) {
            // Some modern browsers implement scheduler.postTask, but not all.
            MainLoop.setImmediate = scheduler.postTask.bind(scheduler);
          } else if (globalThis.setImmediate) {
            MainLoop.setImmediate = setImmediate;
          } else {
            // Emulate setImmediate. (note: not a complete polyfill, we don't emulate clearImmediate() to keep code size to minimum, since not needed)
            var setImmediates = [];
            var emscriptenMainLoopMessageId = 'setimmediate';
            /** @param {Event} event */
            var MainLoop_setImmediate_messageHandler = (event) => {
              if (event.data === emscriptenMainLoopMessageId) {
                event.stopPropagation();
                setImmediates.shift()();
              }
            };
            addEventListener('message', MainLoop_setImmediate_messageHandler, true);
            MainLoop.setImmediate = /** @type{function(function(): ?, ...?): number} */((func) => {
              setImmediates.push(func);
              if (ENVIRONMENT_IS_WORKER) {
                // The postMessge API in a Worker, sends message to the main
                // thread and does not support the `targetOrigin` (*) argument.
                postMessage(emscriptenMainLoopMessageId);
              } else {
                postMessage(emscriptenMainLoopMessageId, '*');
              }
            });
          }
        }
        MainLoop.scheduler = function MainLoop_scheduler_setImmediate() {
          MainLoop.setImmediate(MainLoop.runner);
        };
      }
      return 0;
    };
  
  
  
  var runtimeKeepaliveCounter = 0;
  var keepRuntimeAlive = () => noExitRuntime || runtimeKeepaliveCounter > 0;
  var _proc_exit = (code) => {
      EXITSTATUS = code;
      if (!keepRuntimeAlive()) {
        Module['onExit']?.(code);
        ABORT = true;
      }
      quit_(code, new ExitStatus(code));
    };
  
  
  /** @param {boolean|number=} implicit */
  var exitJS = (status, implicit) => {
      EXITSTATUS = status;
  
      checkUnflushedContent();
  
      // if exit() was called explicitly, warn the user if the runtime isn't actually being shut down
      if (keepRuntimeAlive() && !implicit) {
        var msg = `program exited (with status: ${status}), but keepRuntimeAlive() is set (counter=${runtimeKeepaliveCounter}) due to an async operation, so halting execution but not exiting the runtime or preventing further async execution (you can use emscripten_force_exit, if you want to force a true shutdown)`;
        err(msg);
      }
  
      _proc_exit(status);
    };
  var _exit = exitJS;
  
  var handleException = (e) => {
      // Certain exception types we do not treat as errors since they are used for
      // internal control flow.
      // 1. ExitStatus, which is thrown by exit()
      // 2. "unwind", which is thrown by emscripten_unwind_to_js_event_loop() and others
      //    that wish to return to JS event loop.
      if (e instanceof ExitStatus || e == 'unwind') {
        return EXITSTATUS;
      }
      checkStackCookie();
      if (e instanceof WebAssembly.RuntimeError) {
        if (_emscripten_stack_get_current() <= 0) {
          err('Stack overflow detected.  You can try increasing -sSTACK_SIZE (currently set to 8388608)');
        }
      }
      quit_(1, e);
    };
  
  var maybeExit = () => {
      if (!keepRuntimeAlive()) {
        try {
          _exit(EXITSTATUS);
        } catch (e) {
          handleException(e);
        }
      }
    };
  
    /**
   * @param {number=} arg
   * @param {boolean=} noSetTiming
   */
  var setMainLoop = (iterFunc, fps, simulateInfiniteLoop, arg, noSetTiming) => {
      assert(!MainLoop.func, 'emscripten_set_main_loop: there can only be one main loop function at once')
      MainLoop.func = iterFunc;
      MainLoop.arg = arg;
  
      var thisMainLoopId = MainLoop.currentlyRunningMainloop;
      function checkIsRunning() {
        if (thisMainLoopId < MainLoop.currentlyRunningMainloop) {
          maybeExit();
          return false;
        }
        return true;
      }
  
      // We create the loop runner here but it is not actually running until
      // _emscripten_set_main_loop_timing is called (which might happen at a
      // later time).
      MainLoop.runner = function MainLoop_runner() {
        if (ABORT) return;
        if (MainLoop.queue.length > 0) {
          var start = Date.now();
          var blocker = MainLoop.queue.shift();
          blocker.func(blocker.arg);
          if (MainLoop.remainingBlockers) {
            var remaining = MainLoop.remainingBlockers;
            var next = remaining%1 == 0 ? remaining-1 : Math.floor(remaining);
            if (blocker.counted) {
              MainLoop.remainingBlockers = next;
            } else {
              // not counted, but move the progress along a tiny bit
              next = next + 0.5; // do not steal all the next one's progress
              MainLoop.remainingBlockers = (8*remaining + next)/9;
            }
          }
          MainLoop.updateStatus();
  
          // catches pause/resume main loop from blocker execution
          if (!checkIsRunning()) return;
  
          setTimeout(MainLoop.runner, 0);
          return;
        }
  
        // catch pauses from non-main loop sources
        if (!checkIsRunning()) return;
  
        // Implement very basic swap interval control
        MainLoop.currentFrameNumber = MainLoop.currentFrameNumber + 1 | 0;
        if (MainLoop.timingMode == 1 && MainLoop.timingValue > 1 && MainLoop.currentFrameNumber % MainLoop.timingValue != 0) {
          // Not the scheduled time to render this frame - skip.
          MainLoop.scheduler();
          return;
        } else if (MainLoop.timingMode == 0) {
          MainLoop.tickStartTime = _emscripten_get_now();
          if (Module['ctx']) {
            warnOnce('Looks like you are rendering without using requestAnimationFrame for the main loop. You should use 0 for the frame rate in emscripten_set_main_loop in order to use requestAnimationFrame, as that can greatly improve your frame rates!');
          }
        }
  
        MainLoop.runIter(iterFunc);
  
        // catch pauses from the main loop itself
        if (!checkIsRunning()) return;
  
        MainLoop.scheduler();
      }
  
      if (!noSetTiming) {
        if (fps > 0) {
          _emscripten_set_main_loop_timing(0, 1000.0 / fps);
        } else {
          // Do rAF by rendering each frame (no decimating)
          _emscripten_set_main_loop_timing(1, 1);
        }
  
        MainLoop.scheduler();
      }
  
      if (simulateInfiniteLoop) {
        throw 'unwind';
      }
    };
  
  
  var callUserCallback = (func, ...args) => {
      if (ABORT) {
        err('user callback triggered after runtime exited or application aborted.  Ignoring.');
        return;
      }
      try {
        return func(...args);
      } catch (e) {
        handleException(e);
      } finally {
        maybeExit();
      }
    };
  
  var MainLoop = {
  func:null,
  scheduler:null,
  currentlyRunningMainloop:0,
  arg:0,
  timingMode:0,
  timingValue:0,
  currentFrameNumber:0,
  queue:[],
  preMainLoop:[],
  postMainLoop:[],
  pause() {
        if (MainLoop.scheduler) {
          MainLoop.scheduler = null;
          // Incrementing this signals the previous main loop that it's now become old, and it must return.
          MainLoop.currentlyRunningMainloop++;
          
        }
      },
  resume() {
        MainLoop.currentlyRunningMainloop++;
        var timingMode = MainLoop.timingMode;
        var timingValue = MainLoop.timingValue;
        var func = MainLoop.func;
        MainLoop.func = null;
        // do not set timing and call scheduler, we will do it on the next lines
        setMainLoop(func, 0, false, MainLoop.arg, true);
        _emscripten_set_main_loop_timing(timingMode, timingValue);
        MainLoop.scheduler();
      },
  updateStatus() {
        if (Module['setStatus']) {
          var message = Module['statusMessage'] || 'Please wait...';
          var remaining = MainLoop.remainingBlockers ?? 0;
          var expected = MainLoop.expectedBlockers ?? 0;
          if (remaining) {
            if (remaining < expected) {
              Module['setStatus'](`{message} ({expected - remaining}/{expected})`);
            } else {
              Module['setStatus'](message);
            }
          } else {
            Module['setStatus']('');
          }
        }
      },
  init() {
      },
  runIter(func) {
        if (ABORT) return;
        for (var pre of MainLoop.preMainLoop) {
          if (pre() === false) {
            return; // |return false| skips a frame
          }
        }
        callUserCallback(func);
        for (var post of MainLoop.postMainLoop) {
          post();
        }
        checkStackCookie();
      },
  nextRAF:0,
  fakeRequestAnimationFrame(func) {
        // try to keep 60fps between calls to here
        var now = Date.now();
        if (!MainLoop.nextRAF) {
          MainLoop.nextRAF = now + 1000/60;
        } else {
          while (now + 2 >= MainLoop.nextRAF) { // fudge a little, to avoid timer jitter causing us to do lots of delay:0
            MainLoop.nextRAF += 1000/60;
          }
        }
        var delay = Math.max(MainLoop.nextRAF - now, 0);
        setTimeout(func, delay);
      },
  requestAnimationFrame(func) {
        if (globalThis.requestAnimationFrame) {
          requestAnimationFrame(func);
        } else {
          MainLoop.fakeRequestAnimationFrame(func);
        }
      },
  };
  var _emscripten_cancel_main_loop = () => {
      MainLoop.pause();
      MainLoop.func = null;
    };



  var abortOnCannotGrowMemory = (requestedSize) => {
      abort(`Cannot enlarge memory arrays to size ${requestedSize} bytes (OOM). Either (1) compile with -sINITIAL_MEMORY=X with X higher than the current value ${HEAP8.length}, (2) compile with -sALLOW_MEMORY_GROWTH which allows increasing the size at runtime, or (3) if you want malloc to return NULL (0) instead of this abort, compile with -sABORTING_MALLOC=0`);
    };
  
  var _emscripten_resize_heap = (requestedSize) => {
      var oldSize = HEAPU8.length;
      // With CAN_ADDRESS_2GB or MEMORY64, pointers are already unsigned.
      requestedSize >>>= 0;
      abortOnCannotGrowMemory(requestedSize);
    };

  var onExits = [];
  var addOnExit = (cb) => onExits.push(cb);
  var JSEvents = {
  removeAllEventListeners() {
        while (JSEvents.eventHandlers.length) {
          JSEvents._removeHandler(JSEvents.eventHandlers.length - 1);
        }
        JSEvents.deferredCalls = [];
      },
  inEventHandler:0,
  deferredCalls:[],
  deferCall(targetFunction, precedence, argsList) {
        function arraysHaveEqualContent(arrA, arrB) {
          if (arrA.length != arrB.length) return false;
  
          for (var i = 0; i < arrA.length; i++) {
            if (arrA[i] != arrB[i]) return false;
          }
          return true;
        }
        // Test if the given call was already queued, and if so, don't add it again.
        for (var call of JSEvents.deferredCalls) {
          if (call.targetFunction == targetFunction && arraysHaveEqualContent(call.argsList, argsList)) {
            return;
          }
        }
        JSEvents.deferredCalls.push({
          targetFunction,
          precedence,
          argsList
        });
  
        JSEvents.deferredCalls.sort((x,y) => x.precedence - y.precedence);
      },
  removeDeferredCalls(targetFunction) {
        JSEvents.deferredCalls = JSEvents.deferredCalls.filter((call) => call.targetFunction != targetFunction);
      },
  canPerformEventHandlerRequests() {
        // Browsers that support navigator.userActivation.isActive: https://developer.mozilla.org/en-US/docs/Web/API/UserActivation/isActive
        if (navigator.userActivation) {
          // Verify against transient activation status from UserActivation API
          // whether it is possible to perform a request here without needing to defer. See
          // https://developer.mozilla.org/en-US/docs/Web/Security/User_activation#transient_activation
          // and https://caniuse.com/mdn-api_useractivation
          return navigator.userActivation.isActive;
        }
  
        return JSEvents.inEventHandler && JSEvents.currentEventHandler.allowsDeferredCalls;
      },
  runDeferredCalls() {
        if (!JSEvents.canPerformEventHandlerRequests()) {
          return;
        }
        var deferredCalls = JSEvents.deferredCalls;
        JSEvents.deferredCalls = [];
        for (var call of deferredCalls) {
          call.targetFunction(...call.argsList);
        }
      },
  eventHandlers:[],
  removeAllHandlersOnTarget:(target, eventTypeString) => {
        for (var i = 0; i < JSEvents.eventHandlers.length; ++i) {
          if (JSEvents.eventHandlers[i].target == target &&
            (!eventTypeString || eventTypeString == JSEvents.eventHandlers[i].eventTypeString)) {
             JSEvents._removeHandler(i--);
           }
        }
      },
  _removeHandler(i) {
        var h = JSEvents.eventHandlers[i];
        h.target.removeEventListener(h.eventTypeString, h.eventListenerFunc, h.useCapture);
        JSEvents.eventHandlers.splice(i, 1);
      },
  registerOrRemoveHandler(eventHandler) {
        if (!eventHandler.target) {
          err('registerOrRemoveHandler: the target element for event handler registration does not exist, when processing the following event handler registration:');
          console.dir(eventHandler);
          return -4;
        }
        if (eventHandler.callbackfunc) {
          eventHandler.eventListenerFunc = function(event) {
            // Increment nesting count for the event handler.
            ++JSEvents.inEventHandler;
            JSEvents.currentEventHandler = eventHandler;
            // Process any old deferred calls the user has placed.
            JSEvents.runDeferredCalls();
            // Process the actual event, calls back to user C code handler.
            eventHandler.handlerFunc(event);
            // Process any new deferred calls that were placed right now from this event handler.
            JSEvents.runDeferredCalls();
            // Out of event handler - restore nesting count.
            --JSEvents.inEventHandler;
          };
  
          eventHandler.target.addEventListener(eventHandler.eventTypeString,
                                               eventHandler.eventListenerFunc,
                                               eventHandler.useCapture);
          JSEvents.eventHandlers.push(eventHandler);
        } else {
          for (var i = 0; i < JSEvents.eventHandlers.length; ++i) {
            if (JSEvents.eventHandlers[i].target == eventHandler.target
             && JSEvents.eventHandlers[i].eventTypeString == eventHandler.eventTypeString) {
               JSEvents._removeHandler(i--);
             }
          }
        }
        return 0;
      },
  removeSingleHandler(eventHandler) {
        let success = false;
        for (let i = 0; i < JSEvents.eventHandlers.length; ++i) {
          const handler = JSEvents.eventHandlers[i];
          if (handler.target === eventHandler.target
            && handler.eventTypeId === eventHandler.eventTypeId
            && handler.callbackfunc === eventHandler.callbackfunc
            && handler.userData === eventHandler.userData) {
            // in some very rare cases (ex: Safari / fullscreen events), there is more than 1 handler (eventTypeString is different)
            JSEvents._removeHandler(i--);
            success = true;
          }
        }
        return success ? 0 : -5;
      },
  getNodeNameForTarget(target) {
        if (target == window) return '#window';
        if (target == screen) return '#screen';
        return target?.nodeName ?? '';
      },
  fullscreenEnabled() {
        return document.fullscreenEnabled
        // Safari 13.0.3 on macOS Catalina 10.15.1 still ships with prefixed webkitFullscreenEnabled.
        // TODO: If Safari at some point ships with unprefixed version, update the version check above.
        ?? document.webkitFullscreenEnabled
         ;
      },
  };
  
  /** @type {Object} */
  var specialHTMLTargets = [0, globalThis.document ?? 0, globalThis.window ?? 0];
  var getBoundingClientRect = (e) => specialHTMLTargets.indexOf(e) < 0 ? e.getBoundingClientRect() : {'left':0,'top':0};
  
  
  
  
  var fillMouseEventData = (eventStruct, e, target) => {
      assert(eventStruct % 4 == 0);
      HEAPF64[((eventStruct)>>3)] = e.timeStamp;
      var idx = ((eventStruct)>>2);
      HEAP32[idx + 2] = e.screenX;
      HEAP32[idx + 3] = e.screenY;
      HEAP32[idx + 4] = e.clientX;
      HEAP32[idx + 5] = e.clientY;
      HEAP8[eventStruct + 24] = e.ctrlKey;
      HEAP8[eventStruct + 25] = e.shiftKey;
      HEAP8[eventStruct + 26] = e.altKey;
      HEAP8[eventStruct + 27] = e.metaKey;
      HEAP16[idx*2 + 14] = e.button;
      HEAP16[idx*2 + 15] = e.buttons;
      HEAP32[idx + 8] = e.movementX;
      HEAP32[idx + 9] = e.movementY;
  
      // Note: rect contains doubles (truncated to placate SAFE_HEAP, which is the same behaviour when writing to HEAP32 anyway)
      var rect = getBoundingClientRect(target);
      HEAP32[idx + 10] = e.clientX - (rect.left | 0);
      HEAP32[idx + 11] = e.clientY - (rect.top  | 0);
    };
  
  var maybeCStringToJsString = (cString) => {
      // 'cString > 2' checks if the input is a number, and isn't of the special
      // values we accept here, EMSCRIPTEN_EVENT_TARGET_* (which map to 0, 1, 2).
      // In other words, if cString > 2 then it's a pointer to a valid place in
      // memory, and points to a C string.
      return cString > 2 ? UTF8ToString(cString) : cString;
    };
  
  var findEventTarget = (target) => {
      target = maybeCStringToJsString(target);
      var domElement = specialHTMLTargets[target] || globalThis.document?.querySelector(target);
      return domElement;
    };
  
  var registerMouseEventCallback = (target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) => {
      var eventSize = 64;
      JSEvents.mouseEvent ||= _malloc(eventSize);
      target = findEventTarget(target);
  
      var mouseEventHandlerFunc = (e) => {
        // TODO: Make this access thread safe, or this could update live while app is reading it.
        fillMouseEventData(JSEvents.mouseEvent, e, target);
  
        if (((a1, a2, a3) => dynCall_iiii(callbackfunc, a1, a2, a3))(eventTypeId, JSEvents.mouseEvent, userData)) e.preventDefault();
      };
  
      var eventHandler = {
        target,
        allowsDeferredCalls: eventTypeString != 'mousemove' && eventTypeString != 'mouseenter' && eventTypeString != 'mouseleave', // Mouse move events do not allow fullscreen/pointer lock requests to be handled in them!
        eventTypeString,
        eventTypeId,
        userData,
        callbackfunc,
        handlerFunc: mouseEventHandlerFunc,
        useCapture
      };
      return JSEvents.registerOrRemoveHandler(eventHandler);
    };
  var _emscripten_set_click_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) =>
      registerMouseEventCallback(target, userData, useCapture, callbackfunc, 4, 'click', targetThread);

  
  
  
  var stringToUTF8 = (str, outPtr, maxBytesToWrite) => {
      assert(typeof maxBytesToWrite == 'number', 'stringToUTF8 requires a third parameter that specifies the length of the output buffer');
      return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
    };
  
  
  
  
  var registerKeyEventCallback = (target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) => {
      var eventSize = 160;
      JSEvents.keyEvent ||= _malloc(eventSize);
  
      var keyEventHandlerFunc = (e) => {
        assert(e);
  
        var keyEventData = JSEvents.keyEvent;
        HEAPF64[((keyEventData)>>3)] = e.timeStamp;
  
        var idx = ((keyEventData)>>2);
  
        HEAP32[idx + 2] = e.location;
        HEAP8[keyEventData + 12] = e.ctrlKey;
        HEAP8[keyEventData + 13] = e.shiftKey;
        HEAP8[keyEventData + 14] = e.altKey;
        HEAP8[keyEventData + 15] = e.metaKey;
        HEAP8[keyEventData + 16] = e.repeat;
        HEAP32[idx + 5] = e.charCode;
        HEAP32[idx + 6] = e.keyCode;
        HEAP32[idx + 7] = e.which;
        stringToUTF8(e.key ?? '', keyEventData + 32, 32);
        stringToUTF8(e.code ?? '', keyEventData + 64, 32);
        stringToUTF8(e.char ?? '', keyEventData + 96, 32);
        stringToUTF8(e.locale ?? '', keyEventData + 128, 32);
  
        if (((a1, a2, a3) => dynCall_iiii(callbackfunc, a1, a2, a3))(eventTypeId, keyEventData, userData)) e.preventDefault();
      };
  
      var eventHandler = {
        target: findEventTarget(target),
        eventTypeString,
        eventTypeId,
        userData,
        callbackfunc,
        handlerFunc: keyEventHandlerFunc,
        useCapture
      };
      return JSEvents.registerOrRemoveHandler(eventHandler);
    };
  var _emscripten_set_keydown_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) =>
      registerKeyEventCallback(target, userData, useCapture, callbackfunc, 2, 'keydown', targetThread);

  var _emscripten_set_keyup_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) =>
      registerKeyEventCallback(target, userData, useCapture, callbackfunc, 3, 'keyup', targetThread);

  var _emscripten_set_main_loop = (func, fps, simulateInfiniteLoop) => {
      var iterFunc = (() => dynCall_v(func));
      setMainLoop(iterFunc, fps, simulateInfiniteLoop);
    };

  var _emscripten_set_mousedown_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) =>
      registerMouseEventCallback(target, userData, useCapture, callbackfunc, 5, 'mousedown', targetThread);

  var _emscripten_set_mousemove_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) =>
      registerMouseEventCallback(target, userData, useCapture, callbackfunc, 8, 'mousemove', targetThread);

  var _emscripten_set_mouseup_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) =>
      registerMouseEventCallback(target, userData, useCapture, callbackfunc, 6, 'mouseup', targetThread);

  var GLctx;
  
  var webgl_enable_WEBGL_draw_instanced_base_vertex_base_instance = (ctx) =>
      // Closure is expected to be allowed to minify the '.dibvbi' property, so not accessing it quoted.
      !!(ctx.dibvbi = ctx.getExtension('WEBGL_draw_instanced_base_vertex_base_instance'));
  
  var webgl_enable_WEBGL_multi_draw_instanced_base_vertex_base_instance = (ctx) => {
      // Closure is expected to be allowed to minify the '.mdibvbi' property, so not accessing it quoted.
      return !!(ctx.mdibvbi = ctx.getExtension('WEBGL_multi_draw_instanced_base_vertex_base_instance'));
    };
  
  var webgl_enable_EXT_polygon_offset_clamp = (ctx) =>
      !!(ctx.extPolygonOffsetClamp = ctx.getExtension('EXT_polygon_offset_clamp'));
  
  var webgl_enable_EXT_clip_control = (ctx) =>
      !!(ctx.extClipControl = ctx.getExtension('EXT_clip_control'));
  
  var webgl_enable_WEBGL_polygon_mode = (ctx) =>
      !!(ctx.webglPolygonMode = ctx.getExtension('WEBGL_polygon_mode'));
  
  var webgl_enable_WEBGL_multi_draw = (ctx) =>
      // Closure is expected to be allowed to minify the '.multiDrawWebgl' property, so not accessing it quoted.
      !!(ctx.multiDrawWebgl = ctx.getExtension('WEBGL_multi_draw'));
  
  var getEmscriptenSupportedExtensions = (ctx) => {
      // Restrict the list of advertised extensions to those that we actually
      // support.
      var supportedExtensions = [
        // WebGL 2 extensions
        'EXT_color_buffer_float',
        'EXT_conservative_depth',
        'EXT_disjoint_timer_query_webgl2',
        'EXT_texture_norm16',
        'NV_shader_noperspective_interpolation',
        'WEBGL_clip_cull_distance',
        // WebGL 1 and WebGL 2 extensions
        'EXT_clip_control',
        'EXT_color_buffer_half_float',
        'EXT_depth_clamp',
        'EXT_float_blend',
        'EXT_polygon_offset_clamp',
        'EXT_texture_compression_bptc',
        'EXT_texture_compression_rgtc',
        'EXT_texture_filter_anisotropic',
        'KHR_parallel_shader_compile',
        'OES_texture_float_linear',
        'WEBGL_blend_func_extended',
        'WEBGL_compressed_texture_astc',
        'WEBGL_compressed_texture_etc',
        'WEBGL_compressed_texture_etc1',
        'WEBGL_compressed_texture_s3tc',
        'WEBGL_compressed_texture_s3tc_srgb',
        'WEBGL_debug_renderer_info',
        'WEBGL_debug_shaders',
        'WEBGL_lose_context',
        'WEBGL_multi_draw',
        'WEBGL_polygon_mode'
      ];
      // .getSupportedExtensions() can return null if context is lost, so coerce to empty array.
      return ctx.getSupportedExtensions()?.filter(ext => supportedExtensions.includes(ext)) ?? [];
    };
  
  var registerPreMainLoop = (f) => {
      // Does nothing unless $MainLoop is included/used.
      typeof MainLoop != 'undefined' && MainLoop.preMainLoop.push(f);
    };
  
  
  var webglBufferSubData = (target, offset, size, data, src = HEAPU8) => {
      if (true) {
        size && GLctx.bufferSubData(target, offset, src, data, size);
        return;
      }
    };
  
  
  
  
  var GL = {
  counter:1,
  buffers:[],
  programs:[],
  framebuffers:[],
  renderbuffers:[],
  textures:[],
  shaders:[],
  vaos:[],
  contexts:[],
  offscreenCanvases:{
  },
  queries:[],
  samplers:[],
  transformFeedbacks:[],
  syncs:[],
  byteSizeByTypeRoot:5120,
  byteSizeByType:[1,1,2,2,4,4,4,2,3,4,8],
  stringCache:{
  },
  stringiCache:{
  },
  unpackAlignment:4,
  unpackRowLength:0,
  recordError:(errorCode) => {
        if (!GL.lastError) {
          GL.lastError = errorCode;
        }
      },
  getNewId:(table) => {
        var ret = GL.counter++;
        for (var i = table.length; i < ret; i++) {
          table[i] = null;
        }
        return ret;
      },
  genObject:(n, buffers, createFunction, objectTable
        ) => {
        for (var i = 0; i < n; i++) {
          var buffer = GLctx[createFunction]();
          var id = buffer && GL.getNewId(objectTable);
          if (buffer) {
            buffer.name = id;
            objectTable[id] = buffer;
          } else {
            GL.recordError(0x502 /* GL_INVALID_OPERATION */);
          }
          HEAP32[(((buffers)+(i*4))>>2)] = id;
        }
      },
  MAX_TEMP_BUFFER_SIZE:2097152,
  numTempVertexBuffersPerSize:64,
  log2ceilLookup:(i) => 32 - Math.clz32(i ? i - 1 : 0),
  generateTempBuffers:(quads, context) => {
        var largestIndex = GL.log2ceilLookup(GL.MAX_TEMP_BUFFER_SIZE);
        context.tempVertexBufferCounters1 = [];
        context.tempVertexBufferCounters2 = [];
        context.tempVertexBufferCounters1.length = context.tempVertexBufferCounters2.length = largestIndex+1;
        context.tempVertexBuffers1 = [];
        context.tempVertexBuffers2 = [];
        context.tempVertexBuffers1.length = context.tempVertexBuffers2.length = largestIndex+1;
        context.tempIndexBuffers = [];
        context.tempIndexBuffers.length = largestIndex+1;
        for (var i = 0; i <= largestIndex; ++i) {
          context.tempIndexBuffers[i] = null; // Created on-demand
          context.tempVertexBufferCounters1[i] = context.tempVertexBufferCounters2[i] = 0;
          var ringbufferLength = GL.numTempVertexBuffersPerSize;
          context.tempVertexBuffers1[i] = [];
          context.tempVertexBuffers2[i] = [];
          var ringbuffer1 = context.tempVertexBuffers1[i];
          var ringbuffer2 = context.tempVertexBuffers2[i];
          ringbuffer1.length = ringbuffer2.length = ringbufferLength;
          for (var j = 0; j < ringbufferLength; ++j) {
            ringbuffer1[j] = ringbuffer2[j] = null; // Created on-demand
          }
        }
  
        if (quads) {
          // GL_QUAD indexes can be precalculated
          context.tempQuadIndexBuffer = GLctx.createBuffer();
          context.GLctx.bindBuffer(0x8893 /*GL_ELEMENT_ARRAY_BUFFER*/, context.tempQuadIndexBuffer);
          var numIndexes = GL.MAX_TEMP_BUFFER_SIZE >> 1;
          var quadIndexes = new Uint16Array(numIndexes);
          var i = 0, v = 0;
          while (1) {
            quadIndexes[i++] = v;
            if (i >= numIndexes) break;
            quadIndexes[i++] = v+1;
            if (i >= numIndexes) break;
            quadIndexes[i++] = v+2;
            if (i >= numIndexes) break;
            quadIndexes[i++] = v;
            if (i >= numIndexes) break;
            quadIndexes[i++] = v+2;
            if (i >= numIndexes) break;
            quadIndexes[i++] = v+3;
            if (i >= numIndexes) break;
            v += 4;
          }
          context.GLctx.bufferData(0x8893 /*GL_ELEMENT_ARRAY_BUFFER*/, quadIndexes, 0x88E4 /*GL_STATIC_DRAW*/);
          context.GLctx.bindBuffer(0x8893 /*GL_ELEMENT_ARRAY_BUFFER*/, null);
        }
      },
  getTempVertexBuffer:(sizeBytes) => {
        var idx = GL.log2ceilLookup(sizeBytes);
        var ringbuffer = GL.currentContext.tempVertexBuffers1[idx];
        var nextFreeBufferIndex = GL.currentContext.tempVertexBufferCounters1[idx];
        GL.currentContext.tempVertexBufferCounters1[idx] = (GL.currentContext.tempVertexBufferCounters1[idx]+1) & (GL.numTempVertexBuffersPerSize-1);
        var vbo = ringbuffer[nextFreeBufferIndex];
        if (vbo) {
          return vbo;
        }
        var prevVBO = GLctx.getParameter(0x8894 /*GL_ARRAY_BUFFER_BINDING*/);
        ringbuffer[nextFreeBufferIndex] = GLctx.createBuffer();
        GLctx.bindBuffer(0x8892 /*GL_ARRAY_BUFFER*/, ringbuffer[nextFreeBufferIndex]);
        GLctx.bufferData(0x8892 /*GL_ARRAY_BUFFER*/, 1 << idx, 0x88E8 /*GL_DYNAMIC_DRAW*/);
        GLctx.bindBuffer(0x8892 /*GL_ARRAY_BUFFER*/, prevVBO);
        return ringbuffer[nextFreeBufferIndex];
      },
  getTempIndexBuffer:(sizeBytes) => {
        var idx = GL.log2ceilLookup(sizeBytes);
        var ibo = GL.currentContext.tempIndexBuffers[idx];
        if (ibo) {
          return ibo;
        }
        var prevIBO = GLctx.getParameter(0x8895 /*ELEMENT_ARRAY_BUFFER_BINDING*/);
        GL.currentContext.tempIndexBuffers[idx] = GLctx.createBuffer();
        GLctx.bindBuffer(0x8893 /*GL_ELEMENT_ARRAY_BUFFER*/, GL.currentContext.tempIndexBuffers[idx]);
        GLctx.bufferData(0x8893 /*GL_ELEMENT_ARRAY_BUFFER*/, 1 << idx, 0x88E8 /*GL_DYNAMIC_DRAW*/);
        GLctx.bindBuffer(0x8893 /*GL_ELEMENT_ARRAY_BUFFER*/, prevIBO);
        return GL.currentContext.tempIndexBuffers[idx];
      },
  newRenderingFrameStarted:() => {
        if (!GL.currentContext) {
          return;
        }
        var vb = GL.currentContext.tempVertexBuffers1;
        GL.currentContext.tempVertexBuffers1 = GL.currentContext.tempVertexBuffers2;
        GL.currentContext.tempVertexBuffers2 = vb;
        vb = GL.currentContext.tempVertexBufferCounters1;
        GL.currentContext.tempVertexBufferCounters1 = GL.currentContext.tempVertexBufferCounters2;
        GL.currentContext.tempVertexBufferCounters2 = vb;
        var largestIndex = GL.log2ceilLookup(GL.MAX_TEMP_BUFFER_SIZE);
        for (var i = 0; i <= largestIndex; ++i) {
          GL.currentContext.tempVertexBufferCounters1[i] = 0;
        }
      },
  getSource:(shader, count, string, length) => {
        var source = '';
        for (var i = 0; i < count; ++i) {
          var len = length ? HEAPU32[(((length)+(i*4))>>2)] : undefined;
          source += UTF8ToString(HEAPU32[(((string)+(i*4))>>2)], len);
        }
        // Let's see if we need to enable the standard derivatives extension
        var type = GLctx.getShaderParameter(GL.shaders[shader], 0x8B4F /* GL_SHADER_TYPE */);
        if (type == 0x8B30 /* GL_FRAGMENT_SHADER */) {
          if (GLEmulation.findToken(source, 'dFdx') ||
              GLEmulation.findToken(source, 'dFdy') ||
              GLEmulation.findToken(source, 'fwidth')) {
            source = '#extension GL_OES_standard_derivatives : enable\n' + source;
            var extension = GLctx.getExtension('OES_standard_derivatives');
          }
        }
        return source;
      },
  enabledClientAttribIndices:[],
  enableVertexAttribArray:(index) => {
        if (!GL.enabledClientAttribIndices[index]) {
          GL.enabledClientAttribIndices[index] = true;
          GLctx.enableVertexAttribArray(index);
        }
      },
  disableVertexAttribArray:(index) => {
        if (GL.enabledClientAttribIndices[index]) {
          GL.enabledClientAttribIndices[index] = false;
          GLctx.disableVertexAttribArray(index);
        }
      },
  createContext:(/** @type {HTMLCanvasElement} */ canvas, webGLContextAttributes) => {
  
        // BUG: Workaround Safari WebGL issue: After successfully acquiring WebGL
        // context on a canvas, calling .getContext() will always return that
        // context independent of which 'webgl' or 'webgl2'
        // context version was passed. See:
        //   https://webkit.org/b/222758
        // and:
        //   https://github.com/emscripten-core/emscripten/issues/13295.
        // TODO: Once the bug is fixed and shipped in Safari, adjust the Safari
        // version field in above check.
        if (!canvas.getContextSafariWebGL2Fixed) {
          canvas.getContextSafariWebGL2Fixed = canvas.getContext;
          /** @type {function(this:HTMLCanvasElement, string, (Object|null)=): (RenderingContext|null)} */
          function fixedGetContext(ver, attrs) {
            var gl = canvas.getContextSafariWebGL2Fixed(ver, attrs);
            return ((ver == 'webgl') == (gl instanceof WebGLRenderingContext)) ? gl : null;
          }
          canvas.getContext = fixedGetContext;
        }
  
        var ctx = canvas.getContext('webgl2', webGLContextAttributes);
  
        if (!ctx) return 0;
  
        var handle = GL.registerContext(ctx, webGLContextAttributes);
  
        return handle;
      },
  registerContext:(ctx, webGLContextAttributes) => {
        // without pthreads a context is just an integer ID
        var handle = GL.getNewId(GL.contexts);
  
        var context = {
          handle,
          attributes: webGLContextAttributes,
          version: webGLContextAttributes.majorVersion,
          GLctx: ctx
        };
  
        // Store the created context object so that we can access the context
        // given a canvas without having to pass the parameters again.
        if (ctx.canvas) ctx.canvas.GLctxObject = context;
        GL.contexts[handle] = context;
        if (typeof webGLContextAttributes.enableExtensionsByDefault == 'undefined' || webGLContextAttributes.enableExtensionsByDefault) {
          GL.initExtensions(context);
        }
  
        return handle;
      },
  makeContextCurrent:(contextHandle) => {
  
        // Active Emscripten GL layer context object.
        GL.currentContext = GL.contexts[contextHandle];
        // Active WebGL context object.
        Module['ctx'] = GLctx = GL.currentContext?.GLctx;
        return !(contextHandle && !GLctx);
      },
  getContext:(contextHandle) => {
        return GL.contexts[contextHandle];
      },
  deleteContext:(contextHandle) => {
        if (GL.currentContext === GL.contexts[contextHandle]) {
          GL.currentContext = null;
        }
        if (typeof JSEvents == 'object') {
          // Release all JS event handlers on the DOM element that the GL context is
          // associated with since the context is now deleted.
          JSEvents.removeAllHandlersOnTarget(GL.contexts[contextHandle].GLctx.canvas);
        }
        // Make sure the canvas object no longer refers to the context object so
        // there are no GC surprises.
        if (GL.contexts[contextHandle]?.GLctx.canvas) {
          GL.contexts[contextHandle].GLctx.canvas.GLctxObject = undefined;
        }
        GL.contexts[contextHandle] = null;
      },
  initExtensions:(context) => {
        // If this function is called without a specific context object, init the
        // extensions of the currently active context.
        context ||= GL.currentContext;
  
        if (context.initExtensionsDone) return;
        context.initExtensionsDone = true;
  
        var GLctx = context.GLctx;
  
        // Detect the presence of a few extensions manually, since the GL interop
        // layer itself will need to know if they exist.
        context.compressionExt = GLctx.getExtension('WEBGL_compressed_texture_s3tc');
        context.anisotropicExt = GLctx.getExtension('EXT_texture_filter_anisotropic');
  
        // Extensions that are available in both WebGL 1 and WebGL 2
        webgl_enable_WEBGL_multi_draw(GLctx);
        webgl_enable_EXT_polygon_offset_clamp(GLctx);
        webgl_enable_EXT_clip_control(GLctx);
        webgl_enable_WEBGL_polygon_mode(GLctx);
        // Extensions that are available from WebGL >= 2 (no-op if called on a WebGL 1 context active)
        webgl_enable_WEBGL_draw_instanced_base_vertex_base_instance(GLctx);
        webgl_enable_WEBGL_multi_draw_instanced_base_vertex_base_instance(GLctx);
  
        // On WebGL 2, EXT_disjoint_timer_query is replaced with an alternative
        // that's based on core APIs, and exposes only the queryCounterEXT()
        // entrypoint.
        if (context.version >= 2) {
          GLctx.disjointTimerQueryExt = GLctx.getExtension('EXT_disjoint_timer_query_webgl2');
        }
  
        // However, Firefox exposes the WebGL 1 version on WebGL 2 as well and
        // thus we look for the WebGL 1 version again if the WebGL 2 version
        // isn't present. https://bugzil.la/1328882
        if (context.version < 2 || !GLctx.disjointTimerQueryExt)
        {
          GLctx.disjointTimerQueryExt = GLctx.getExtension('EXT_disjoint_timer_query');
        }
  
        for (var ext of getEmscriptenSupportedExtensions(GLctx)) {
          // WEBGL_lose_context, WEBGL_debug_renderer_info and WEBGL_debug_shaders
          // are not enabled by default.
          if (!ext.includes('lose_context') && !ext.includes('debug')) {
            // Call .getExtension() to enable that extension permanently.
            GLctx.getExtension(ext);
          }
        }
      },
  };
  
  var webglPowerPreferences = ["default","low-power","high-performance"];
  
  var findCanvasEventTarget = findEventTarget;
  
  
  
  var _emscripten_webgl_do_create_context = (target, attributes) => {
      assert(attributes);
      var attr32 = ((attributes)>>2);
      var powerPreference = HEAP32[attr32 + (8>>2)];
      var contextAttributes = {
        'alpha': !!HEAP8[attributes + 0],
        'depth': !!HEAP8[attributes + 1],
        'stencil': !!HEAP8[attributes + 2],
        'antialias': !!HEAP8[attributes + 3],
        'premultipliedAlpha': !!HEAP8[attributes + 4],
        'preserveDrawingBuffer': !!HEAP8[attributes + 5],
        'powerPreference': webglPowerPreferences[powerPreference],
        'failIfMajorPerformanceCaveat': !!HEAP8[attributes + 12],
        'desynchronized': !!HEAP8[attributes + 33],
        // The following are not predefined WebGL context attributes in the WebGL specification, so the property names can be minified by Closure.
        majorVersion: HEAP32[attr32 + (16>>2)],
        minorVersion: HEAP32[attr32 + (20>>2)],
        enableExtensionsByDefault: HEAP8[attributes + 24],
        explicitSwapControl: HEAP8[attributes + 25],
        proxyContextToMainThread: HEAP32[attr32 + (28>>2)],
        renderViaOffscreenBackBuffer: HEAP8[attributes + 32]
      };
  
      //  TODO: Make these into hard errors at some point in the future
      if (contextAttributes.majorVersion !== 1 && contextAttributes.majorVersion !== 2) {
        err(`Invalid WebGL version requested: ${contextAttributes.majorVersion}`);
      }
      if (contextAttributes.majorVersion !== 2) {
        err('WebGL 1 requested but only WebGL 2 is supported (MIN_WEBGL_VERSION is 2)');
      }
  
      var canvas = findCanvasEventTarget(target);
  
      if (!canvas) {
        return 0;
      }
  
      if (contextAttributes.explicitSwapControl) {
        return 0;
      }
  
      var contextHandle = GL.createContext(canvas, contextAttributes);
      return contextHandle;
    };
  var _emscripten_webgl_create_context = _emscripten_webgl_do_create_context;

  var _emscripten_webgl_destroy_context = (contextHandle) => {
      if (GL.currentContext == contextHandle) GL.currentContext = 0;
      GL.deleteContext(contextHandle);
    };

  var _emscripten_webgl_make_context_current = (contextHandle) => {
      var success = GL.makeContextCurrent(contextHandle);
      return success ? 0 : -5;
    };

  var ENV = {
  };
  
  var getExecutableName = () => thisProgram;
  var getEnvStrings = () => {
      if (!getEnvStrings.strings) {
        // Default values.
        var lang = (globalThis.navigator?.language ?? 'C').replace('-', '_') + '.UTF-8';
        var env = {
          'USER': 'web_user',
          'LOGNAME': 'web_user',
          'PATH': '/',
          'PWD': '/',
          'HOME': '/home/web_user',
          'LANG': lang,
          '_': getExecutableName()
        };
        // Apply the user-provided values, if any.
        for (var x in ENV) {
          // x is a key in ENV; if ENV[x] is undefined, that means it was
          // explicitly set to be so. We allow user code to do that to
          // force variables with default values to remain unset.
          if (ENV[x] === undefined) delete env[x];
          else env[x] = ENV[x];
        }
        var strings = [];
        for (var x in env) {
          strings.push(`${x}=${env[x]}`);
        }
        getEnvStrings.strings = strings;
      }
      return getEnvStrings.strings;
    };
  
  
  var _environ_get = (__environ, environ_buf) => {
      var bufSize = 0;
      var envp = 0;
      for (var string of getEnvStrings()) {
        var ptr = environ_buf + bufSize;
        HEAPU32[(((__environ)+(envp))>>2)] = ptr;
        bufSize += stringToUTF8(string, ptr, Infinity) + 1;
        envp += 4;
      }
      return 0;
    };

  
  
  var _environ_sizes_get = (penviron_count, penviron_buf_size) => {
      var strings = getEnvStrings();
      HEAPU32[((penviron_count)>>2)] = strings.length;
      var bufSize = 0;
      for (var string of strings) {
        bufSize += lengthBytesUTF8(string) + 1;
      }
      HEAPU32[((penviron_buf_size)>>2)] = bufSize;
      return 0;
    };


  function _fd_close(fd) {
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      FS.close(stream);
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return e.errno;
  }
  }
  

  
  /** @param {number=} offset */
  var doReadv = (stream, iov, iovcnt, offset) => {
      var ret = 0;
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAPU32[((iov)>>2)];
        var len = HEAPU32[(((iov)+(4))>>2)];
        iov += 8;
        try {
          var curr = FS.read(stream, HEAP8, ptr, len, offset);
        } catch (e) {
          // On a non-blocking stream a subsequent read may would-block after we
          // already gathered data. POSIX readv is a single gather-read: return
          // what we have rather than failing the whole call.
          if (ret > 0 && e instanceof FS.ErrnoError &&
              (e.errno == 6 || e.errno == 6)) {
            break;
          }
          throw e;
        }
        if (curr < 0) return -1;
        ret += curr;
        if (curr < len) break; // nothing more to read
        if (typeof offset != 'undefined') {
          offset += curr;
        }
      }
      return ret;
    };
  
  
  function _fd_read(fd, iov, iovcnt, pnum) {
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      var num = doReadv(stream, iov, iovcnt);
      HEAPU32[((pnum)>>2)] = num;
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return e.errno;
  }
  }
  

  
  
  function _fd_seek(fd, offset, whence, newOffset) {
    offset = bigintToI53Checked(offset);
  
  
  try {
  
      if (isNaN(offset)) return 22;
      var stream = SYSCALLS.getStreamFromFD(fd);
      FS.llseek(stream, offset, whence);
      HEAP64[((newOffset)>>3)] = BigInt(stream.position);
      if (stream.getdents && !offset && whence === 0) stream.getdents = null; // reset readdir state
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return e.errno;
  }
  ;
  }

  
  
  /** @param {number=} offset */
  var doWritev = (stream, iov, iovcnt, offset) => {
      // Gather all iovecs into one contiguous buffer and issue a single
      // FS.write, matching POSIX writev's single gather-write semantics (as
      // __syscall_sendmsg already does). Per-iovec writes fragment a stream
      // socket send into multiple segments, breaking stream byte semantics.
      if (iovcnt == 1) {
        // Single iovec: write directly from HEAP8, no gather buffer needed.
        return FS.write(stream, HEAP8, HEAPU32[((iov)>>2)], HEAPU32[(((iov)+(4))>>2)], offset);
      }
      var total = 0;
      for (var i = 0, p = iov; i < iovcnt; i++, p += 8) {
        total += HEAPU32[(((p)+(4))>>2)];
      }
      var view = new Uint8Array(total);
      var voff = 0;
      for (var i = 0; i < iovcnt; i++, iov += 8) {
        var ptr = HEAPU32[((iov)>>2)];
        var len = HEAPU32[(((iov)+(4))>>2)];
        view.set(HEAPU8.subarray(ptr, ptr + len), voff);
        voff += len;
      }
      return FS.write(stream, view, 0, total, offset);
    };
  
  
  function _fd_write(fd, iov, iovcnt, pnum) {
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      var num = doWritev(stream, iov, iovcnt);
      HEAPU32[((pnum)>>2)] = num;
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return e.errno;
  }
  }
  

  var _emscripten_glAlphaFunc = (func, ref) => {
      switch(func) {
        case 0x200: // GL_NEVER
        case 0x201: // GL_LESS
        case 0x202: // GL_EQUAL
        case 0x203: // GL_LEQUAL
        case 0x204: // GL_GREATER
        case 0x205: // GL_NOTEQUAL
        case 0x206: // GL_GEQUAL
        case 0x207: // GL_ALWAYS
          GLEmulation.alphaTestRef = ref;
          if (GLEmulation.alphaTestFunc != func) {
            GLEmulation.alphaTestFunc = func;
            GLImmediate.currentRenderer = null; // alpha test mode is part of the FFP shader state, we must re-lookup the renderer to use.
          }
          break;
        default: // invalid value provided
          break;
      }
    };
  var _glAlphaFunc = _emscripten_glAlphaFunc;

  function getFullscreenElement() {
      return document.fullscreenElement
             ?? document.webkitFullscreenElement
             ;
    }
  
  
  /** @param {number=} timeout */
  var safeSetTimeout = (func, timeout) => {
      
      var id = safeSetTimeout.nextId++;
      safeSetTimeout.pending.set(id, setTimeout(() => {
        safeSetTimeout.pending.delete(id);
        
        callUserCallback(func);
      }, timeout));
      return id;
    };
  
  
  
  var Browser = {
  useWebGL:false,
  isFullscreen:false,
  pointerLock:false,
  moduleContextCreatedCallbacks:[],
  preloadedImages:{
  },
  preloadedAudios:{
  },
  getCanvas:() => Module['canvas'],
  init() {
        if (Browser.initted) return;
        Browser.initted = true;
  
        // Support for plugins that can process preloaded files. You can add more of these to
        // your app by creating and appending to preloadPlugins.
        //
        // Each plugin is asked if it can handle a file based on the file's name. If it can,
        // it is given the file's raw data. When it is done, it calls a callback with the file's
        // (possibly modified) data. For example, a plugin might decompress a file, or it
        // might create some side data structure for use later (like an Image element, etc.).
  
        var imagePlugin = {};
        imagePlugin['canHandle'] = (name) => {
          return !Module['noImageDecoding'] && /\.(jpg|jpeg|png|bmp|webp)$/i.test(name);
        };
        imagePlugin['handle'] = async (byteArray, name) => {
          var b = new Blob([byteArray], { type: Browser.getMimetype(name) });
          if (b.size !== byteArray.length) { // Safari bug #118630
            // Safari's Blob can only take an ArrayBuffer
            b = new Blob([(new Uint8Array(byteArray)).buffer], { type: Browser.getMimetype(name) });
          }
          var url = URL.createObjectURL(b);
          return new Promise((resolve, reject) => {
            var img = new Image();
            img.onload = () => {
              assert(img.complete, `Image ${name} could not be decoded`);
              var canvas = /** @type {!HTMLCanvasElement} */ (document.createElement('canvas'));
              canvas.width = img.width;
              canvas.height = img.height;
              var ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0);
              Browser.preloadedImages[name] = canvas;
              URL.revokeObjectURL(url);
              resolve(byteArray);
            };
            img.onerror = (event) => {
              err(`Image ${url} could not be decoded`);
              reject();
            };
            img.src = url;
          });
        };
        preloadPlugins.push(imagePlugin);
  
        var audioPlugin = {};
        audioPlugin['canHandle'] = (name) => {
          return !Module['noAudioDecoding'] && name.slice(-4) in { '.ogg': 1, '.wav': 1, '.mp3': 1 };
        };
        audioPlugin['handle'] = async (byteArray, name) => {
          return new Promise((resolve, reject) => {
            var done = false;
            function finish(audio) {
              if (done) return;
              done = true;
              Browser.preloadedAudios[name] = audio;
              resolve(byteArray);
            }
            var b = new Blob([byteArray], { type: Browser.getMimetype(name) });
            var url = URL.createObjectURL(b); // XXX we never revoke this!
            var audio = new Audio();
            audio.addEventListener('canplaythrough', () => finish(audio)); // use addEventListener due to chromium bug 124926
            audio.onerror = (event) => {
              if (done) return;
              err(`warning: browser could not fully decode audio ${name}, trying slower base64 approach`);
              function encode64(data) {
                var BASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
                var PAD = '=';
                var ret = '';
                var leftchar = 0;
                var leftbits = 0;
                for (var byte of data) {
                  leftchar = (leftchar << 8) | byte;
                  leftbits += 8;
                  while (leftbits >= 6) {
                    var curr = (leftchar >> (leftbits-6)) & 0x3f;
                    leftbits -= 6;
                    ret += BASE[curr];
                  }
                }
                if (leftbits == 2) {
                  ret += BASE[(leftchar&3) << 4];
                  ret += PAD + PAD;
                } else if (leftbits == 4) {
                  ret += BASE[(leftchar&0xf) << 2];
                  ret += PAD;
                }
                return ret;
              }
              audio.src = 'data:audio/x-' + name.slice(-3) + ';base64,' + encode64(byteArray);
              finish(audio); // we don't wait for confirmation this worked - but it's worth trying
            };
            audio.src = url;
            // workaround for chrome bug 124926 - we do not always get oncanplaythrough or onerror
            safeSetTimeout(() => {
              finish(audio); // try to use it even though it is not necessarily ready to play
            }, 10_000);
          });
        };
        preloadPlugins.push(audioPlugin);
  
        // Canvas event setup
  
        function pointerLockChange() {
          var canvas = Browser.getCanvas();
          Browser.pointerLock = document.pointerLockElement === canvas;
        }
        var canvas = Browser.getCanvas();
        if (canvas) {
          // forced aspect ratio can be enabled by defining 'forcedAspectRatio' on Module
          // Module['forcedAspectRatio'] = 4 / 3;
  
          document.addEventListener('pointerlockchange', pointerLockChange);
  
          if (Module['elementPointerLock']) {
            canvas.addEventListener('click', (ev) => {
              if (!Browser.pointerLock && Browser.getCanvas().requestPointerLock) {
                Browser.getCanvas().requestPointerLock();
                ev.preventDefault();
              }
            });
          }
        }
      },
  createContext(/** @type {HTMLCanvasElement} */ canvas, useWebGL, setInModule, webGLContextAttributes) {
        if (useWebGL && Module['ctx'] && canvas == Browser.getCanvas()) return Module['ctx']; // no need to recreate GL context if it's already been created for this canvas.
  
        var ctx;
        var contextHandle;
        if (useWebGL) {
          // For GLES2/desktop GL compatibility, adjust a few defaults to be different to WebGL defaults, so that they align better with the desktop defaults.
          var contextAttributes = {
            antialias: false,
            alpha: false,
            majorVersion: 2,
          };
  
          if (webGLContextAttributes) {
            for (var attribute in webGLContextAttributes) {
              contextAttributes[attribute] = webGLContextAttributes[attribute];
            }
          }
  
          // This check of existence of GL is here to satisfy Closure compiler, which yells if variable GL is referenced below but GL object is not
          // actually compiled in because application is not doing any GL operations. TODO: Ideally if GL is not being used, this function
          // Browser.createContext() should not even be emitted.
          if (typeof GL != 'undefined') {
            contextHandle = GL.createContext(canvas, contextAttributes);
            if (contextHandle) {
              ctx = GL.getContext(contextHandle).GLctx;
            }
          }
        } else {
          ctx = canvas.getContext('2d');
        }
  
        if (!ctx) return null;
  
        if (setInModule) {
          if (!useWebGL) assert(typeof GLctx == 'undefined', 'cannot set in module if GLctx is used, but we are a non-GL context that would replace it');
          Module['ctx'] = ctx;
          if (useWebGL) GL.makeContextCurrent(contextHandle);
          Browser.useWebGL = useWebGL;
          Browser.moduleContextCreatedCallbacks.forEach((callback) => callback());
          Browser.init();
        }
        return ctx;
      },
  fullscreenHandlersInstalled:false,
  lockPointer:undefined,
  resizeCanvas:undefined,
  requestFullscreen(lockPointer, resizeCanvas) {
        Browser.lockPointer = lockPointer;
        Browser.resizeCanvas = resizeCanvas;
        if (typeof Browser.lockPointer == 'undefined') Browser.lockPointer = true;
        if (typeof Browser.resizeCanvas == 'undefined') Browser.resizeCanvas = false;
  
        var canvas = Browser.getCanvas();
        function fullscreenChange() {
          Browser.isFullscreen = false;
          var canvasContainer = canvas.parentNode;
          if (getFullscreenElement() === canvasContainer) {
            canvas.exitFullscreen = Browser.exitFullscreen;
            if (Browser.lockPointer) canvas.requestPointerLock();
            Browser.isFullscreen = true;
            if (Browser.resizeCanvas) {
              Browser.setFullscreenCanvasSize();
            } else {
              Browser.updateCanvasDimensions(canvas);
            }
          } else {
            // remove the full screen specific parent of the canvas again to restore the HTML structure from before going full screen
            canvasContainer.parentNode.insertBefore(canvas, canvasContainer);
            canvasContainer.parentNode.removeChild(canvasContainer);
  
            if (Browser.resizeCanvas) {
              Browser.setWindowedCanvasSize();
            } else {
              Browser.updateCanvasDimensions(canvas);
            }
          }
        }
  
        if (!Browser.fullscreenHandlersInstalled) {
          Browser.fullscreenHandlersInstalled = true;
          document.addEventListener('fullscreenchange', fullscreenChange);
          document.addEventListener('webkitfullscreenchange', fullscreenChange);
        }
  
        // create a new parent to ensure the canvas has no siblings. this allows browsers to optimize full screen performance when its parent is the full screen root
        var canvasContainer = document.createElement('div');
        canvas.parentNode.insertBefore(canvasContainer, canvas);
        canvasContainer.appendChild(canvas);
  
        // use parent of canvas as full screen root to allow aspect ratio correction (Firefox stretches the root to screen size)
        // Safari didn't support Element.requestFullscreen until 16.4
        // See: https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen
        /** @suppress {checkTypes} */
        canvasContainer.requestFullscreen ??= (canvasContainer['webkitRequestFullscreen'] ? () => canvasContainer['webkitRequestFullscreen'](Element.ALLOW_KEYBOARD_INPUT) : null) ??
                                              (canvasContainer['webkitRequestFullScreen'] ? () => canvasContainer['webkitRequestFullScreen'](Element.ALLOW_KEYBOARD_INPUT) : null);
  
        canvasContainer.requestFullscreen();
      },
  exitFullscreen() {
        // This is workaround for chrome. Trying to exit from fullscreen
        // not in fullscreen state will cause 'TypeError: Document not active'
        // in chrome. See https://github.com/emscripten-core/emscripten/pull/8236
        if (!Browser.isFullscreen) {
          return false;
        }
  
        var CFS = document.exitFullscreen ?? document['webkitCancelFullScreen'];
        CFS.apply(document, []);
        return true;
      },
  getMimetype(name) {
        return {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'bmp': 'image/bmp',
          'ogg': 'audio/ogg',
          'wav': 'audio/wav',
          'mp3': 'audio/mpeg'
        }[name.slice(name.lastIndexOf('.')+1)];
      },
  getMouseWheelDelta(event) {
        var delta = 0;
        switch (event.type) {
          case 'DOMMouseScroll':
            // 3 lines make up a step
            delta = event.detail / 3;
            break;
          case 'mousewheel':
            // 120 units make up a step
            delta = event.wheelDelta / 120;
            break;
          case 'wheel':
            delta = event.deltaY
            switch (event.deltaMode) {
              case 0:
                // DOM_DELTA_PIXEL: 100 pixels make up a step
                delta /= 100;
                break;
              case 1:
                // DOM_DELTA_LINE: 3 lines make up a step
                delta /= 3;
                break;
              case 2:
                // DOM_DELTA_PAGE: A page makes up 80 steps
                delta *= 80;
                break;
              default:
                abort('unrecognized mouse wheel delta mode: ' + event.deltaMode);
            }
            break;
          default:
            abort('unrecognized mouse wheel event: ' + event.type);
        }
        return delta;
      },
  mouseX:0,
  mouseY:0,
  mouseMovementX:0,
  mouseMovementY:0,
  touches:{
  },
  lastTouches:{
  },
  calculateMouseCoords(pageX, pageY) {
        // Calculate the movement based on the changes
        // in the coordinates.
        var canvas = Browser.getCanvas();
        var rect = canvas.getBoundingClientRect();
  
        var adjustedX = pageX - (window.scrollX + rect.left);
        var adjustedY = pageY - (window.scrollY + rect.top);
  
        // the canvas might be CSS-scaled compared to its backbuffer;
        // SDL-using content will want mouse coordinates in terms
        // of backbuffer units.
        adjustedX = adjustedX * (canvas.width / rect.width);
        adjustedY = adjustedY * (canvas.height / rect.height);
  
        return { x: adjustedX, y: adjustedY };
      },
  setMouseCoords(pageX, pageY) {
        const {x, y} = Browser.calculateMouseCoords(pageX, pageY);
        Browser.mouseMovementX = x - Browser.mouseX;
        Browser.mouseMovementY = y - Browser.mouseY;
        Browser.mouseX = x;
        Browser.mouseY = y;
      },
  calculateMouseEvent(event) { // event should be mousemove, mousedown or mouseup
        if (Browser.pointerLock) {
          // When the pointer is locked, calculate the coordinates
          // based on the movement of the mouse.
          Browser.mouseMovementX = event.movementX;
          Browser.mouseMovementY = event.movementY;
  
          // add the mouse delta to the current absolute mouse position
          Browser.mouseX += Browser.mouseMovementX;
          Browser.mouseY += Browser.mouseMovementY;
        } else {
          if (event.type === 'touchstart' || event.type === 'touchend' || event.type === 'touchmove') {
            var touch = event.touch;
            if (touch === undefined) {
              return; // the 'touch' property is only defined in SDL
  
            }
            var coords = Browser.calculateMouseCoords(touch.pageX, touch.pageY);
  
            if (event.type === 'touchstart') {
              Browser.lastTouches[touch.identifier] = coords;
              Browser.touches[touch.identifier] = coords;
            } else if (event.type === 'touchend' || event.type === 'touchmove') {
              var last = Browser.touches[touch.identifier];
              last ||= coords;
              Browser.lastTouches[touch.identifier] = last;
              Browser.touches[touch.identifier] = coords;
            }
            return;
          }
  
          Browser.setMouseCoords(event.pageX, event.pageY);
        }
      },
  resizeListeners:[],
  updateResizeListeners() {
        var canvas = Browser.getCanvas();
        Browser.resizeListeners.forEach((listener) => listener(canvas.width, canvas.height));
      },
  setCanvasSize(width, height, noUpdates) {
        var canvas = Browser.getCanvas();
        Browser.updateCanvasDimensions(canvas, width, height);
        if (!noUpdates) Browser.updateResizeListeners();
      },
  setFullscreenCanvasSize() {
        // check if SDL is available
        if (typeof SDL != 'undefined') {
          var flags = HEAPU32[((SDL.screen)>>2)];
          flags = flags | 8388608;
          HEAP32[((SDL.screen)>>2)] = flags;
        }
        Browser.updateCanvasDimensions(Browser.getCanvas());
        Browser.updateResizeListeners();
      },
  setWindowedCanvasSize() {
        // check if SDL is available
        if (typeof SDL != 'undefined') {
          var flags = HEAPU32[((SDL.screen)>>2)];
          flags = flags & ~8388608;
          HEAP32[((SDL.screen)>>2)] = flags;
        }
        Browser.updateCanvasDimensions(Browser.getCanvas());
        Browser.updateResizeListeners();
      },
  updateCanvasDimensions(canvas, wNative, hNative) {
        if (wNative && hNative) {
          canvas.widthNative = wNative;
          canvas.heightNative = hNative;
        } else {
          wNative = canvas.widthNative;
          hNative = canvas.heightNative;
        }
        var w = wNative;
        var h = hNative;
        if ((getFullscreenElement() === canvas.parentNode) && (typeof screen != 'undefined')) {
           var factor = Math.min(screen.width / w, screen.height / h);
           w = Math.round(w * factor);
           h = Math.round(h * factor);
        }
        if (Browser.resizeCanvas) {
          if (canvas.width  != w) canvas.width  = w;
          if (canvas.height != h) canvas.height = h;
          if (typeof canvas.style != 'undefined') {
            canvas.style.removeProperty( 'width');
            canvas.style.removeProperty('height');
          }
        } else {
          if (canvas.width  != wNative) canvas.width  = wNative;
          if (canvas.height != hNative) canvas.height = hNative;
          if (typeof canvas.style != 'undefined') {
            if (w != wNative || h != hNative) {
              canvas.style.setProperty( 'width', w + 'px', 'important');
              canvas.style.setProperty('height', h + 'px', 'important');
            } else {
              canvas.style.removeProperty( 'width');
              canvas.style.removeProperty('height');
            }
          }
        }
      },
  };
  
  
  
  var _emscripten_glEnable = (x0) => GLctx.enable(x0);
  var _glEnable = _emscripten_glEnable;
  
  var _emscripten_glDisable = (x0) => GLctx.disable(x0);
  var _glDisable = _emscripten_glDisable;
  
  var _emscripten_glIsEnabled = (x0) => GLctx.isEnabled(x0);
  var _glIsEnabled = _emscripten_glIsEnabled;
  
  
  var readI53FromI64 = (ptr) => {
      return HEAPU32[((ptr)>>2)] + HEAP32[(((ptr)+(4))>>2)] * 4294967296;
    };
  
  var readI53FromU64 = (ptr) => {
      return HEAPU32[((ptr)>>2)] + HEAPU32[(((ptr)+(4))>>2)] * 4294967296;
    };
  
  var writeI53ToI64 = (ptr, num) => {
      HEAPU32[((ptr)>>2)] = num;
      var lower = HEAPU32[((ptr)>>2)];
      HEAPU32[(((ptr)+(4))>>2)] = (num - lower)/4294967296;
      var deserialized = (num >= 0) ? readI53FromU64(ptr) : readI53FromI64(ptr);
      var offset = ((ptr)>>2);
      if (deserialized != num) warnOnce(`writeI53ToI64() out of range: serialized JS Number ${num} to Wasm heap as bytes lo=${ptrToString(HEAPU32[offset])}, hi=${ptrToString(HEAPU32[offset+1])}, which deserializes back to ${deserialized} instead!`);
    };
  
  
  var webglGetExtensions = () => {
      var exts = getEmscriptenSupportedExtensions(GLctx);
      exts = exts.concat(exts.map((e) => 'GL_' + e));
      return exts;
    };
  
  
  
  
  /** @type {!Float32Array} */
  var HEAPF32;
  var emscriptenWebGLGet = (name_, p, type) => {
      // Guard against user passing a null pointer.
      // Note that GLES2 spec does not say anything about how passing a null
      // pointer should be treated.  Testing on desktop core GL 3, the application
      // crashes on glGetIntegerv to a null pointer, but better to report an error
      // instead of doing anything random.
      if (!p) {
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
        return;
      }
      var ret = undefined;
      switch (name_) { // Handle a few trivial GLES values
        case 0x8DFA: // GL_SHADER_COMPILER
          ret = 1;
          break;
        case 0x8DF8: // GL_SHADER_BINARY_FORMATS
          if (type != 0 && type != 1) {
            GL.recordError(0x500); // GL_INVALID_ENUM
          }
          // Do not write anything to the out pointer, since no binary formats are
          // supported.
          return;
        case 0x87FE: // GL_NUM_PROGRAM_BINARY_FORMATS
        case 0x8DF9: // GL_NUM_SHADER_BINARY_FORMATS
          ret = 0;
          break;
        case 0x86A2: // GL_NUM_COMPRESSED_TEXTURE_FORMATS
          // WebGL doesn't have GL_NUM_COMPRESSED_TEXTURE_FORMATS (it's obsolete
          // since GL_COMPRESSED_TEXTURE_FORMATS returns a JS array that can be
          // queried for length), so implement it ourselves to allow C++ GLES2
          // code to get the length.
          var formats = GLctx.getParameter(0x86A3 /*GL_COMPRESSED_TEXTURE_FORMATS*/);
          ret = formats ? formats.length : 0;
          break;
  
        case 0x821D: // GL_NUM_EXTENSIONS
          if (GL.currentContext.version < 2) {
            // Calling GLES3/WebGL2 function with a GLES2/WebGL1 context
            GL.recordError(0x502 /* GL_INVALID_OPERATION */);
            return;
          }
          ret = webglGetExtensions().length;
          break;
        case 0x821B: // GL_MAJOR_VERSION
        case 0x821C: // GL_MINOR_VERSION
          if (GL.currentContext.version < 2) {
            GL.recordError(0x500); // GL_INVALID_ENUM
            return;
          }
          ret = name_ == 0x821B ? 3 : 0; // return version 3.0
          break;
      }
  
      if (ret === undefined) {
        var result = GLctx.getParameter(name_);
        switch (typeof result) {
          case 'number':
            ret = result;
            break;
          case 'boolean':
            ret = result ? 1 : 0;
            break;
          case 'string':
            GL.recordError(0x500); // GL_INVALID_ENUM
            return;
          case 'object':
            if (result === null) {
              // null is a valid result for some (e.g., which buffer is bound -
              // perhaps nothing is bound), but otherwise can mean an invalid
              // name_, which we need to report as an error
              switch (name_) {
                case 0x8894: // ARRAY_BUFFER_BINDING
                case 0x8B8D: // CURRENT_PROGRAM
                case 0x8895: // ELEMENT_ARRAY_BUFFER_BINDING
                case 0x8CA6: // FRAMEBUFFER_BINDING or DRAW_FRAMEBUFFER_BINDING
                case 0x8CA7: // RENDERBUFFER_BINDING
                case 0x8069: // TEXTURE_BINDING_2D
                case 0x85B5: // WebGL 2 GL_VERTEX_ARRAY_BINDING, or WebGL 1 extension OES_vertex_array_object GL_VERTEX_ARRAY_BINDING_OES
                case 0x8F36: // COPY_READ_BUFFER_BINDING or COPY_READ_BUFFER
                case 0x8F37: // COPY_WRITE_BUFFER_BINDING or COPY_WRITE_BUFFER
                case 0x88ED: // PIXEL_PACK_BUFFER_BINDING
                case 0x88EF: // PIXEL_UNPACK_BUFFER_BINDING
                case 0x8CAA: // READ_FRAMEBUFFER_BINDING
                case 0x8919: // SAMPLER_BINDING
                case 0x8C1D: // TEXTURE_BINDING_2D_ARRAY
                case 0x806A: // TEXTURE_BINDING_3D
                case 0x8E25: // TRANSFORM_FEEDBACK_BINDING
                case 0x8C8F: // TRANSFORM_FEEDBACK_BUFFER_BINDING
                case 0x8A28: // UNIFORM_BUFFER_BINDING
                case 0x8514: { // TEXTURE_BINDING_CUBE_MAP
                  ret = 0;
                  break;
                }
                default: {
                  GL.recordError(0x500); // GL_INVALID_ENUM
                  return;
                }
              }
            } else if (result instanceof Float32Array ||
                       result instanceof Uint32Array ||
                       result instanceof Int32Array ||
                       result instanceof Array) {
              for (var i = 0; i < result.length; ++i) {
                switch (type) {
                  case 0: HEAP32[(((p)+(i*4))>>2)] = result[i]; break;
                  case 2: HEAPF32[(((p)+(i*4))>>2)] = result[i]; break;
                  case 4: HEAP8[(p)+(i)] = result[i] ? 1 : 0; break;
                }
              }
              return;
            } else {
              try {
                ret = result.name | 0;
              } catch(e) {
                GL.recordError(0x500); // GL_INVALID_ENUM
                err(`GL_INVALID_ENUM in glGet${type}v: Unknown object returned from WebGL getParameter(${name_})! (error: ${e})`);
                return;
              }
            }
            break;
          default:
            GL.recordError(0x500); // GL_INVALID_ENUM
            err(`GL_INVALID_ENUM in glGet${type}v: Native code calling glGet${type}v(${name_}) and it returns ${result} of type ${typeof(result)}!`);
            return;
        }
      }
  
      switch (type) {
        case 1: writeI53ToI64(p, ret); break;
        case 0: HEAP32[((p)>>2)] = ret; break;
        case 2:   HEAPF32[((p)>>2)] = ret; break;
        case 4: HEAP8[p] = ret ? 1 : 0; break;
      }
    };
  
  var _emscripten_glGetBooleanv = (name_, p) => emscriptenWebGLGet(name_, p, 4);
  var _glGetBooleanv = _emscripten_glGetBooleanv;
  
  
  var _emscripten_glGetIntegerv = (name_, p) => emscriptenWebGLGet(name_, p, 0);
  var _glGetIntegerv = _emscripten_glGetIntegerv;
  
  
  
  var stringToNewUTF8 = (str) => {
      var size = lengthBytesUTF8(str) + 1;
      var ret = _malloc(size);
      if (ret) stringToUTF8(str, ret, size);
      return ret;
    };
  
  
  var _emscripten_glGetString = (name_) => {
      var ret = GL.stringCache[name_];
      if (!ret) {
        switch (name_) {
          case 0x1F03 /* GL_EXTENSIONS */:
            ret = stringToNewUTF8(webglGetExtensions().join(' '));
            break;
          case 0x1F00 /* GL_VENDOR */:
          case 0x1F01 /* GL_RENDERER */:
          case 0x9245 /* UNMASKED_VENDOR_WEBGL */:
          case 0x9246 /* UNMASKED_RENDERER_WEBGL */:
            var s = GLctx.getParameter(name_);
            if (!s) {
              GL.recordError(0x500/*GL_INVALID_ENUM*/);
            }
            ret = s ? stringToNewUTF8(s) : 0;
            break;
  
          case 0x1F02 /* GL_VERSION */:
            var webGLVersion = GLctx.getParameter(0x1F02 /*GL_VERSION*/);
            // return GLES version string corresponding to the version of the WebGL context
            var glVersion = `OpenGL ES 2.0 (${webGLVersion})`;
            if (true) glVersion = `OpenGL ES 3.0 (${webGLVersion})`;
            ret = stringToNewUTF8(glVersion);
            break;
          case 0x8B8C /* GL_SHADING_LANGUAGE_VERSION */:
            var glslVersion = GLctx.getParameter(0x8B8C /*GL_SHADING_LANGUAGE_VERSION*/);
            // extract the version number 'N.M' from the string 'WebGL GLSL ES N.M ...'
            var ver_re = /^WebGL GLSL ES ([0-9]\.[0-9][0-9]?)(?:$| .*)/;
            var ver_num = glslVersion.match(ver_re);
            if (ver_num !== null) {
              if (ver_num[1].length == 3) ver_num[1] = ver_num[1] + '0'; // ensure minor version has 2 digits
              glslVersion = `OpenGL ES GLSL ES ${ver_num[1]} (${glslVersion})`;
            }
            ret = stringToNewUTF8(glslVersion);
            break;
          default:
            GL.recordError(0x500/*GL_INVALID_ENUM*/);
            // fall through
        }
        GL.stringCache[name_] = ret;
      }
      return ret;
    };
  var _glGetString = _emscripten_glGetString;
  
  var _emscripten_glCreateShader = (shaderType) => {
      var id = GL.getNewId(GL.shaders);
      GL.shaders[id] = GLctx.createShader(shaderType);
  
      return id;
    };
  var _glCreateShader = _emscripten_glCreateShader;
  
  var _emscripten_glShaderSource = (shader, count, string, length) => {
      var source = GL.getSource(shader, count, string, length);
  
      GLctx.shaderSource(GL.shaders[shader], source);
    };
  var _glShaderSource = _emscripten_glShaderSource;
  
  var _emscripten_glCompileShader = (shader) => {
      GLctx.compileShader(GL.shaders[shader]);
    };
  var _glCompileShader = _emscripten_glCompileShader;
  
  var _emscripten_glAttachShader = (program, shader) => {
      GLctx.attachShader(GL.programs[program], GL.shaders[shader]);
    };
  var _glAttachShader = _emscripten_glAttachShader;
  
  var _emscripten_glDetachShader = (program, shader) => {
      GLctx.detachShader(GL.programs[program], GL.shaders[shader]);
    };
  var _glDetachShader = _emscripten_glDetachShader;
  
  var _emscripten_glUseProgram = (program) => {
      program = GL.programs[program];
      GLctx.useProgram(program);
      // Record the currently active program so that we can access the uniform
      // mapping table of that program.
      GLctx.currentProgram = program;
    };
  var _glUseProgram = _emscripten_glUseProgram;
  
  var _emscripten_glDeleteProgram = (id) => {
      if (!id) return;
      var program = GL.programs[id];
      if (!program) {
        // glDeleteProgram actually signals an error when deleting a nonexisting
        // object, unlike some other GL delete functions.
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
        return;
      }
      GLctx.deleteProgram(program);
      program.name = 0;
      GL.programs[id] = null;
    };
  var _glDeleteProgram = _emscripten_glDeleteProgram;
  
  
  var _emscripten_glBindAttribLocation = (program, index, name) => {
      GLctx.bindAttribLocation(GL.programs[program], index, UTF8ToString(name));
    };
  var _glBindAttribLocation = _emscripten_glBindAttribLocation;
  
  var _emscripten_glLinkProgram = (program) => {
      program = GL.programs[program];
      GLctx.linkProgram(program);
      // Invalidate earlier computed uniform->ID mappings, those have now become stale
      program.uniformLocsById = 0; // Mark as null-like so that glGetUniformLocation() knows to populate this again.
      program.uniformSizeAndIdsByName = {};
  
    };
  var _glLinkProgram = _emscripten_glLinkProgram;
  
  var _emscripten_glBindBuffer = (target, buffer) => {
      if (target == 0x8892 /*GL_ARRAY_BUFFER*/) {
        GLctx.currentArrayBufferBinding = buffer;
        GLImmediate.lastArrayBuffer = buffer;
      } else if (target == 0x8893 /*GL_ELEMENT_ARRAY_BUFFER*/) {
        GLctx.currentElementArrayBufferBinding = buffer;
      }
  
      if (target == 0x88EB /*GL_PIXEL_PACK_BUFFER*/) {
        // In WebGL 2 glReadPixels entry point, we need to use a different WebGL 2
        // API function call when a buffer is bound to
        // GL_PIXEL_PACK_BUFFER_BINDING point, so must keep track whether that
        // binding point is non-null to know what is the proper API function to
        // call.
        GLctx.currentPixelPackBufferBinding = buffer;
      } else if (target == 0x88EC /*GL_PIXEL_UNPACK_BUFFER*/) {
        // In WebGL 2 gl(Compressed)Tex(Sub)Image[23]D entry points, we need to
        // use a different WebGL 2 API function call when a buffer is bound to
        // GL_PIXEL_UNPACK_BUFFER_BINDING point, so must keep track whether that
        // binding point is non-null to know what is the proper API function to
        // call.
        GLctx.currentPixelUnpackBufferBinding = buffer;
      }
      GLctx.bindBuffer(target, GL.buffers[buffer]);
    };
  var _glBindBuffer = _emscripten_glBindBuffer;
  
  
  var _emscripten_glGetFloatv = (name_, p) => emscriptenWebGLGet(name_, p, 2);
  var _glGetFloatv = _emscripten_glGetFloatv;
  
  var _emscripten_glHint = (x0, x1) => GLctx.hint(x0, x1);
  var _glHint = _emscripten_glHint;
  
  var _emscripten_glEnableVertexAttribArray = (index) => {
      GLctx.enableVertexAttribArray(index);
    };
  var _glEnableVertexAttribArray = _emscripten_glEnableVertexAttribArray;
  
  var _emscripten_glDisableVertexAttribArray = (index) => {
      GLctx.disableVertexAttribArray(index);
    };
  var _glDisableVertexAttribArray = _emscripten_glDisableVertexAttribArray;
  
  var _emscripten_glVertexAttribPointer = (index, size, type, normalized, stride, ptr) => {
      GLctx.vertexAttribPointer(index, size, type, !!normalized, stride, ptr);
    };
  var _glVertexAttribPointer = _emscripten_glVertexAttribPointer;
  
  var _emscripten_glActiveTexture = (x0) => GLctx.activeTexture(x0);
  var _glActiveTexture = _emscripten_glActiveTexture;
  
  
  
  
  
  
  var GLEmulation = {
  fogStart:0,
  fogEnd:1,
  fogDensity:1,
  fogColor:null,
  fogMode:2048,
  fogEnabled:false,
  MAX_CLIP_PLANES:6,
  clipPlaneEnabled:[false,false,false,false,false,false],
  clipPlaneEquation:[],
  lightingEnabled:false,
  lightModelAmbient:null,
  lightModelTwoSide:false,
  materialAmbient:null,
  materialDiffuse:null,
  materialSpecular:null,
  materialShininess:null,
  materialEmission:null,
  MAX_LIGHTS:8,
  lightEnabled:[false,false,false,false,false,false,false,false],
  lightAmbient:[],
  lightDiffuse:[],
  lightSpecular:[],
  lightPosition:[],
  alphaTestEnabled:false,
  alphaTestFunc:519,
  alphaTestRef:0,
  pointSize:1,
  vaos:[],
  currentVao:null,
  enabledVertexAttribArrays:{
  },
  hasRunInit:false,
  findToken(source, token) {
        function isIdentChar(ch) {
          if (ch >= 48 && ch <= 57) // 0-9
            return true;
          if (ch >= 65 && ch <= 90) // A-Z
            return true;
          if (ch >= 97 && ch <= 122) // a-z
            return true;
          return false;
        }
        var i = -1;
        do {
          i = source.indexOf(token, i + 1);
          if (i < 0) {
            break;
          }
          if (i > 0 && isIdentChar(source[i - 1])) {
            continue;
          }
          i += token.length;
          if (i < source.length - 1 && isIdentChar(source[i + 1])) {
            continue;
          }
          return true;
        } while (true);
        return false;
      },
  init() {
        // Do not activate immediate/emulation code (e.g. replace glDrawElements)
        // when in FULL_ES2 mode.  We do not need full emulation, we instead
        // emulate client-side arrays etc. in FULL_ES2 code in a straightforward
        // manner, and avoid not having a bound buffer be ambiguous between es2
        // emulation code and legacy gl emulation code.
  
        if (GLEmulation.hasRunInit) {
          return;
        }
        GLEmulation.hasRunInit = true;
  
        GLEmulation.fogColor = new Float32Array(4);
  
        for (var clipPlaneId = 0; clipPlaneId < GLEmulation.MAX_CLIP_PLANES; clipPlaneId++) {
          GLEmulation.clipPlaneEquation[clipPlaneId] = new Float32Array(4);
        }
  
        // set defaults for GL_LIGHTING
        GLEmulation.lightModelAmbient = new Float32Array([0.2, 0.2, 0.2, 1.0]);
        GLEmulation.materialAmbient = new Float32Array([0.2, 0.2, 0.2, 1.0]);
        GLEmulation.materialDiffuse = new Float32Array([0.8, 0.8, 0.8, 1.0]);
        GLEmulation.materialSpecular = new Float32Array([0.0, 0.0, 0.0, 1.0]);
        GLEmulation.materialShininess = new Float32Array([0.0]);
        GLEmulation.materialEmission = new Float32Array([0.0, 0.0, 0.0, 1.0]);
  
        for (var lightId = 0; lightId < GLEmulation.MAX_LIGHTS; lightId++) {
          GLEmulation.lightAmbient[lightId] = new Float32Array([0.0, 0.0, 0.0, 1.0]);
          GLEmulation.lightDiffuse[lightId] = lightId ? new Float32Array([0.0, 0.0, 0.0, 1.0]) : new Float32Array([1.0, 1.0, 1.0, 1.0]);
          GLEmulation.lightSpecular[lightId] = lightId ? new Float32Array([0.0, 0.0, 0.0, 1.0]) : new Float32Array([1.0, 1.0, 1.0, 1.0]);
          GLEmulation.lightPosition[lightId] = new Float32Array([0.0, 0.0, 1.0, 0.0]);
        }
  
        // Add some emulation workarounds
        err('WARNING: using emscripten GL emulation. This is a collection of limited workarounds, do not expect it to work.');
        err('WARNING: using emscripten GL emulation unsafe opts. If weirdness happens, try -sGL_UNSAFE_OPTS=0');
  
        // XXX some of the capabilities we don't support may lead to incorrect rendering, if we do not emulate them in shaders
        var validCapabilities = {
          0xB44: 1, // GL_CULL_FACE
          0xBE2: 1, // GL_BLEND
          0xBD0: 1, // GL_DITHER,
          0xB90: 1, // GL_STENCIL_TEST
          0xB71: 1, // GL_DEPTH_TEST
          0xC11: 1, // GL_SCISSOR_TEST
          0x8037: 1, // GL_POLYGON_OFFSET_FILL
          0x809E: 1, // GL_SAMPLE_ALPHA_TO_COVERAGE
          0x80A0: 1  // GL_SAMPLE_COVERAGE
        };
  
        var orig_glEnable = _glEnable;
        _glEnable = _emscripten_glEnable = (cap) => {
          // Clean up the renderer on any change to the rendering state. The optimization of
          // skipping renderer setup is aimed at the case of multiple glDraw* right after each other
          GLImmediate.lastRenderer?.cleanup();
          if (cap == 0xB60 /* GL_FOG */) {
            if (GLEmulation.fogEnabled != true) {
              GLImmediate.currentRenderer = null; // Fog parameter is part of the FFP shader state, we must re-lookup the renderer to use.
              GLEmulation.fogEnabled = true;
            }
            return;
          } else if ((cap >= 0x3000) && (cap < 0x3006)  /* GL_CLIP_PLANE0 to GL_CLIP_PLANE5 */) {
            var clipPlaneId = cap - 0x3000;
            if (GLEmulation.clipPlaneEnabled[clipPlaneId] != true) {
              GLImmediate.currentRenderer = null; // clip plane parameter is part of the FFP shader state, we must re-lookup the renderer to use.
              GLEmulation.clipPlaneEnabled[clipPlaneId] = true;
            }
            return;
          } else if ((cap >= 0x4000) && (cap < 0x4008)  /* GL_LIGHT0 to GL_LIGHT7 */) {
            var lightId = cap - 0x4000;
            if (GLEmulation.lightEnabled[lightId] != true) {
              GLImmediate.currentRenderer = null; // light parameter is part of the FFP shader state, we must re-lookup the renderer to use.
              GLEmulation.lightEnabled[lightId] = true;
            }
            return;
          } else if (cap == 0xB50 /* GL_LIGHTING */) {
            if (GLEmulation.lightingEnabled != true) {
              GLImmediate.currentRenderer = null; // light parameter is part of the FFP shader state, we must re-lookup the renderer to use.
              GLEmulation.lightingEnabled = true;
            }
            return;
          } else if (cap == 0xBC0 /* GL_ALPHA_TEST */) {
            if (GLEmulation.alphaTestEnabled != true) {
              GLImmediate.currentRenderer = null; // alpha testing is part of the FFP shader state, we must re-lookup the renderer to use.
              GLEmulation.alphaTestEnabled = true;
            }
            return;
          } else if (cap == 0xDE1 /* GL_TEXTURE_2D */) {
            // XXX not according to spec, and not in desktop GL, but works in some GLES1.x apparently, so support
            // it by forwarding to glEnableClientState
            /* Actually, let's not, for now. (This sounds exceedingly broken)
           * This is in gl_ps_workaround2.c.
          _glEnableClientState(cap);
          */
            return;
          } else if (!(cap in validCapabilities)) {
            return;
          }
          orig_glEnable(cap);
        };
        
  
        var orig_glDisable = _glDisable;
        _glDisable = _emscripten_glDisable = (cap) => {
          GLImmediate.lastRenderer?.cleanup();
          if (cap == 0xB60 /* GL_FOG */) {
            if (GLEmulation.fogEnabled != false) {
              GLImmediate.currentRenderer = null; // Fog parameter is part of the FFP shader state, we must re-lookup the renderer to use.
              GLEmulation.fogEnabled = false;
            }
            return;
          } else if ((cap >= 0x3000) && (cap < 0x3006)  /* GL_CLIP_PLANE0 to GL_CLIP_PLANE5 */) {
            var clipPlaneId = cap - 0x3000;
            if (GLEmulation.clipPlaneEnabled[clipPlaneId] != false) {
              GLImmediate.currentRenderer = null; // clip plane parameter is part of the FFP shader state, we must re-lookup the renderer to use.
              GLEmulation.clipPlaneEnabled[clipPlaneId] = false;
            }
            return;
          } else if ((cap >= 0x4000) && (cap < 0x4008)  /* GL_LIGHT0 to GL_LIGHT7 */) {
            var lightId = cap - 0x4000;
            if (GLEmulation.lightEnabled[lightId] != false) {
              GLImmediate.currentRenderer = null; // light parameter is part of the FFP shader state, we must re-lookup the renderer to use.
              GLEmulation.lightEnabled[lightId] = false;
            }
            return;
          } else if (cap == 0xB50 /* GL_LIGHTING */) {
            if (GLEmulation.lightingEnabled != false) {
              GLImmediate.currentRenderer = null; // light parameter is part of the FFP shader state, we must re-lookup the renderer to use.
              GLEmulation.lightingEnabled = false;
            }
            return;
          } else if (cap == 0xBC0 /* GL_ALPHA_TEST */) {
            if (GLEmulation.alphaTestEnabled != false) {
              GLImmediate.currentRenderer = null; // alpha testing is part of the FFP shader state, we must re-lookup the renderer to use.
              GLEmulation.alphaTestEnabled = false;
            }
            return;
          } else if (cap == 0xDE1 /* GL_TEXTURE_2D */) {
            // XXX not according to spec, and not in desktop GL, but works in some GLES1.x apparently, so support
            // it by forwarding to glDisableClientState
            /* Actually, let's not, for now. (This sounds exceedingly broken)
           * This is in gl_ps_workaround2.c.
          _glDisableClientState(cap);
          */
            return;
          } else if (!(cap in validCapabilities)) {
            return;
          }
          orig_glDisable(cap);
        };
        
  
        var orig_glIsEnabled = _glIsEnabled;
        _glIsEnabled = _emscripten_glIsEnabled = (cap) => {
          if (cap == 0xB60 /* GL_FOG */) {
            return GLEmulation.fogEnabled ? 1 : 0;
          } else if ((cap >= 0x3000) && (cap < 0x3006)  /* GL_CLIP_PLANE0 to GL_CLIP_PLANE5 */) {
            var clipPlaneId = cap - 0x3000;
            return GLEmulation.clipPlaneEnabled[clipPlaneId] ? 1 : 0;
          } else if ((cap >= 0x4000) && (cap < 0x4008)  /* GL_LIGHT0 to GL_LIGHT7 */) {
            var lightId = cap - 0x4000;
            return GLEmulation.lightEnabled[lightId] ? 1 : 0;
          } else if (cap == 0xB50 /* GL_LIGHTING */) {
            return GLEmulation.lightingEnabled ? 1 : 0;
          } else if (cap == 0xBC0 /* GL_ALPHA_TEST */) {
            return GLEmulation.alphaTestEnabled ? 1 : 0;
          } else if (!(cap in validCapabilities)) {
            return 0;
          }
          return GLctx.isEnabled(cap);
        };
        
  
        var orig_glGetBooleanv = _glGetBooleanv;
        _glGetBooleanv = _emscripten_glGetBooleanv = (pname, p) => {
          var attrib = GLEmulation.getAttributeFromCapability(pname);
          if (attrib !== null) {
            
            var result = GLImmediate.enabledClientAttributes[attrib];
            HEAP8[p] = result === true ? 1 : 0;
            return;
          }
          orig_glGetBooleanv(pname, p);
        };
        
  
        var orig_glGetIntegerv = _glGetIntegerv;
        _glGetIntegerv = _emscripten_glGetIntegerv = (pname, params) => {
          
          switch (pname) {
            case 0x84E2: pname = GLctx.MAX_TEXTURE_IMAGE_UNITS /* fake it */; break; // GL_MAX_TEXTURE_UNITS
            case 0x8B4A: { // GL_MAX_VERTEX_UNIFORM_COMPONENTS_ARB
              var result = GLctx.getParameter(GLctx.MAX_VERTEX_UNIFORM_VECTORS);
              HEAP32[((params)>>2)] = result*4; // GLES gives num of 4-element vectors, GL wants individual components, so multiply
              return;
            }
            case 0x8B49: { // GL_MAX_FRAGMENT_UNIFORM_COMPONENTS_ARB
              var result = GLctx.getParameter(GLctx.MAX_FRAGMENT_UNIFORM_VECTORS);
              HEAP32[((params)>>2)] = result*4; // GLES gives num of 4-element vectors, GL wants individual components, so multiply
              return;
            }
            case 0x8B4B: { // GL_MAX_VARYING_FLOATS_ARB
              var result = GLctx.getParameter(GLctx.MAX_VARYING_VECTORS);
              HEAP32[((params)>>2)] = result*4; // GLES gives num of 4-element vectors, GL wants individual components, so multiply
              return;
            }
            case 0x8871: pname = GLctx.MAX_COMBINED_TEXTURE_IMAGE_UNITS /* close enough */; break; // GL_MAX_TEXTURE_COORDS
            case 0x807A: { // GL_VERTEX_ARRAY_SIZE
              var attribute = GLImmediate.clientAttributes[GLImmediate.VERTEX];
              HEAP32[((params)>>2)] = attribute ? attribute.size : 0;
              return;
            }
            case 0x807B: { // GL_VERTEX_ARRAY_TYPE
              var attribute = GLImmediate.clientAttributes[GLImmediate.VERTEX];
              HEAP32[((params)>>2)] = attribute ? attribute.type : 0;
              return;
            }
            case 0x807C: { // GL_VERTEX_ARRAY_STRIDE
              var attribute = GLImmediate.clientAttributes[GLImmediate.VERTEX];
              HEAP32[((params)>>2)] = attribute ? attribute.stride : 0;
              return;
            }
            case 0x8081: { // GL_COLOR_ARRAY_SIZE
              var attribute = GLImmediate.clientAttributes[GLImmediate.COLOR];
              HEAP32[((params)>>2)] = attribute ? attribute.size : 0;
              return;
            }
            case 0x8082: { // GL_COLOR_ARRAY_TYPE
              var attribute = GLImmediate.clientAttributes[GLImmediate.COLOR];
              HEAP32[((params)>>2)] = attribute ? attribute.type : 0;
              return;
            }
            case 0x8083: { // GL_COLOR_ARRAY_STRIDE
              var attribute = GLImmediate.clientAttributes[GLImmediate.COLOR];
              HEAP32[((params)>>2)] = attribute ? attribute.stride : 0;
              return;
            }
            case 0x8088: { // GL_TEXTURE_COORD_ARRAY_SIZE
              var attribute = GLImmediate.clientAttributes[GLImmediate.TEXTURE0 + GLImmediate.clientActiveTexture];
              HEAP32[((params)>>2)] = attribute ? attribute.size : 0;
              return;
            }
            case 0x8089: { // GL_TEXTURE_COORD_ARRAY_TYPE
              var attribute = GLImmediate.clientAttributes[GLImmediate.TEXTURE0 + GLImmediate.clientActiveTexture];
              HEAP32[((params)>>2)] = attribute ? attribute.type : 0;
              return;
            }
            case 0x808A: { // GL_TEXTURE_COORD_ARRAY_STRIDE
              var attribute = GLImmediate.clientAttributes[GLImmediate.TEXTURE0 + GLImmediate.clientActiveTexture];
              HEAP32[((params)>>2)] = attribute ? attribute.stride : 0;
              return;
            }
            case 0x0D32: { // GL_MAX_CLIP_PLANES
              HEAP32[((params)>>2)] = GLEmulation.MAX_CLIP_PLANES; // all implementations need to support at least 6
              return;
            }
            case 0x0BA0: { // GL_MATRIX_MODE
              HEAP32[((params)>>2)] = GLImmediate.currentMatrix + 0x1700;
              return;
            }
            case 0x0BC1: { // GL_ALPHA_TEST_FUNC
              HEAP32[((params)>>2)] = GLEmulation.alphaTestFunc;
              return;
            }
          }
          orig_glGetIntegerv(pname, params);
        };
        
  
        var orig_glGetString = _glGetString;
        _glGetString = _emscripten_glGetString = (name_) => {
          if (GL.stringCache[name_]) return GL.stringCache[name_];
          switch (name_) {
            case 0x1F03 /* GL_EXTENSIONS */: // Add various extensions that we can support
              var ret = stringToNewUTF8(getEmscriptenSupportedExtensions(GLctx).join(' ') +
                     ' GL_EXT_texture_env_combine GL_ARB_texture_env_crossbar GL_ATI_texture_env_combine3 GL_NV_texture_env_combine4 GL_EXT_texture_env_dot3 GL_ARB_multitexture GL_ARB_vertex_buffer_object GL_EXT_framebuffer_object GL_ARB_vertex_program GL_ARB_fragment_program GL_ARB_shading_language_100 GL_ARB_shader_objects GL_ARB_vertex_shader GL_ARB_fragment_shader GL_ARB_texture_cube_map GL_EXT_draw_range_elements' +
                     (GL.currentContext.compressionExt ? ' GL_ARB_texture_compression GL_EXT_texture_compression_s3tc' : '') +
                     (GL.currentContext.anisotropicExt ? ' GL_EXT_texture_filter_anisotropic' : '')
              );
              return GL.stringCache[name_] = ret;
          }
          return orig_glGetString(name_);
        };
        
  
        // Do some automatic rewriting to work around GLSL differences. Note that this must be done in
        // tandem with the rest of the program, by itself it cannot suffice.
        // Note that we need to remember shader types for this rewriting, saving sources makes it easier to debug.
        GL.shaderInfos = {};
        var orig_glCreateShader = _glCreateShader;
        _glCreateShader = _emscripten_glCreateShader = (shaderType) => {
          var id = orig_glCreateShader(shaderType);
          GL.shaderInfos[id] = {
            type: shaderType,
            ftransform: false
          };
          return id;
        };
        
  
        function ensurePrecision(source) {
          if (!/precision +(low|medium|high)p +float *;/.test(source)) {
            source = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n' + source;
          }
          return source;
        }
  
        var orig_glShaderSource = _glShaderSource;
        _glShaderSource = _emscripten_glShaderSource = (shader, count, string, length) => {
          
          
          var source = GL.getSource(shader, count, string, length);
          // XXX We add attributes and uniforms to shaders. The program can ask for the # of them, and see the
          // ones we generated, potentially confusing it? Perhaps we should hide them.
          if (GL.shaderInfos[shader].type == GLctx.VERTEX_SHADER) {
            // Replace ftransform() with explicit project/modelview transforms, and add position and matrix info.
            var has_pm = source.search(/u_projection/) >= 0;
            var has_mm = source.search(/u_modelView/) >= 0;
            var has_pv = source.search(/a_position/) >= 0;
            var need_pm = 0, need_mm = 0, need_pv = 0;
            var old = source;
            source = source.replace(/ftransform\(\)/g, '(u_projection * u_modelView * a_position)');
            if (old != source) need_pm = need_mm = need_pv = 1;
            old = source;
            source = source.replace(/gl_ProjectionMatrix/g, 'u_projection');
            if (old != source) need_pm = 1;
            old = source;
            source = source.replace(/gl_ModelViewMatrixTranspose\[2\]/g, 'vec4(u_modelView[0][2], u_modelView[1][2], u_modelView[2][2], u_modelView[3][2])'); // XXX extremely inefficient
            if (old != source) need_mm = 1;
            old = source;
            source = source.replace(/gl_ModelViewMatrix/g, 'u_modelView');
            if (old != source) need_mm = 1;
            old = source;
            source = source.replace(/gl_Vertex/g, 'a_position');
            if (old != source) need_pv = 1;
            old = source;
            source = source.replace(/gl_ModelViewProjectionMatrix/g, '(u_projection * u_modelView)');
            if (old != source) need_pm = need_mm = 1;
            if (need_pv && !has_pv) source = 'attribute vec4 a_position; \n' + source;
            if (need_mm && !has_mm) source = 'uniform mat4 u_modelView; \n' + source;
            if (need_pm && !has_pm) source = 'uniform mat4 u_projection; \n' + source;
            GL.shaderInfos[shader].ftransform = need_pm || need_mm || need_pv; // we will need to provide the fixed function stuff as attributes and uniforms
            for (var i = 0; i < GLImmediate.MAX_TEXTURES; i++) {
              // XXX To handle both regular texture mapping and cube mapping, we use vec4 for tex coordinates.
              old = source;
              var need_vtc = source.search(`v_texCoord${i}`) == -1;
              source = source.replace(new RegExp(`gl_TexCoord\\[${i}\\]`, 'g'), `v_texCoord${i}`)
                             .replace(new RegExp(`gl_MultiTexCoord${i}`, 'g'), `a_texCoord${i}`);
              if (source != old) {
                source = `attribute vec4 a_texCoord${i}; \n${source}`;
                if (need_vtc) {
                  source = `varying vec4 v_texCoord${i};   \n${source}`;
                }
              }
  
              old = source;
              source = source.replace(new RegExp(`gl_TextureMatrix\\[${i}\\]`, 'g'), `u_textureMatrix${i}`);
              if (source != old) {
                source = `uniform mat4 u_textureMatrix${i}; \n${source}`;
              }
            }
            if (source.includes('gl_FrontColor')) {
              source = 'varying vec4 v_color; \n' +
                       source.replace(/gl_FrontColor/g, 'v_color');
            }
            if (source.includes('gl_Color')) {
              source = 'attribute vec4 a_color; \n' +
                       source.replace(/gl_Color/g, 'a_color');
            }
            if (source.includes('gl_Normal')) {
              source = 'attribute vec3 a_normal; \n' +
                       source.replace(/gl_Normal/g, 'a_normal');
            }
            // fog
            if (source.includes('gl_FogFragCoord')) {
              source = 'varying float v_fogFragCoord;   \n' +
                       source.replace(/gl_FogFragCoord/g, 'v_fogFragCoord');
            }
          } else { // Fragment shader
            for (i = 0; i < GLImmediate.MAX_TEXTURES; i++) {
              old = source;
              source = source.replace(new RegExp(`gl_TexCoord\\[${i}\\]`, 'g'), `v_texCoord${i}`);
              if (source != old) {
                source = 'varying vec4 v_texCoord' + i + ';   \n' + source;
              }
            }
            if (source.includes('gl_Color')) {
              source = 'varying vec4 v_color; \n' + source.replace(/gl_Color/g, 'v_color');
            }
            if (source.includes('gl_Fog.color')) {
              source = 'uniform vec4 u_fogColor;   \n' +
                       source.replace(/gl_Fog.color/g, 'u_fogColor');
            }
            if (source.includes('gl_Fog.end')) {
              source = 'uniform float u_fogEnd;   \n' +
                       source.replace(/gl_Fog.end/g, 'u_fogEnd');
            }
            if (source.includes('gl_Fog.scale')) {
              source = 'uniform float u_fogScale;   \n' +
                       source.replace(/gl_Fog.scale/g, 'u_fogScale');
            }
            if (source.includes('gl_Fog.density')) {
              source = 'uniform float u_fogDensity;   \n' +
                       source.replace(/gl_Fog.density/g, 'u_fogDensity');
            }
            if (source.includes('gl_FogFragCoord')) {
              source = 'varying float v_fogFragCoord;   \n' +
                       source.replace(/gl_FogFragCoord/g, 'v_fogFragCoord');
            }
            source = ensurePrecision(source);
          }
          GLctx.shaderSource(GL.shaders[shader], source);
        };
        
  
        var orig_glCompileShader = _glCompileShader;
        _glCompileShader = _emscripten_glCompileShader = (shader) => {
          GLctx.compileShader(GL.shaders[shader]);
        };
        
  
        GL.programShaders = {};
        var orig_glAttachShader = _glAttachShader;
        _glAttachShader = _emscripten_glAttachShader = (program, shader) => {
          GL.programShaders[program] ||= [];
          GL.programShaders[program].push(shader);
          orig_glAttachShader(program, shader);
        };
        
  
        var orig_glDetachShader = _glDetachShader;
        _glDetachShader = _emscripten_glDetachShader = (program, shader) => {
          var programShader = GL.programShaders[program];
          if (!programShader) {
            err(`WARNING: _glDetachShader received invalid program: ${program}`);
            return;
          }
          var index = programShader.indexOf(shader);
          programShader.splice(index, 1);
          orig_glDetachShader(program, shader);
        };
        
  
        var orig_glUseProgram = _glUseProgram;
        _glUseProgram = _emscripten_glUseProgram = (program) => {
          if (GL.currProgram != program) {
            GLImmediate.currentRenderer = null; // This changes the FFP emulation shader program, need to recompute that.
            GL.currProgram = program;
            GLImmediate.fixedFunctionProgram = 0;
            orig_glUseProgram(program);
          }
        }
        
  
        var orig_glDeleteProgram = _glDeleteProgram;
        _glDeleteProgram = _emscripten_glDeleteProgram = (program) => {
          orig_glDeleteProgram(program);
          if (program == GL.currProgram) {
            GLImmediate.currentRenderer = null; // This changes the FFP emulation shader program, need to recompute that.
            GL.currProgram = 0;
          }
        };
        
  
        // If attribute 0 was not bound, bind it to 0 for WebGL performance reasons. Track if 0 is free for that.
        var zeroUsedPrograms = {};
        var orig_glBindAttribLocation = _glBindAttribLocation;
        _glBindAttribLocation = _emscripten_glBindAttribLocation = (program, index, name) => {
          if (index == 0) zeroUsedPrograms[program] = true;
          orig_glBindAttribLocation(program, index, name);
        };
        
  
        var orig_glLinkProgram = _glLinkProgram;
        _glLinkProgram = _emscripten_glLinkProgram = (program) => {
          if (!(program in zeroUsedPrograms)) {
            GLctx.bindAttribLocation(GL.programs[program], 0, 'a_position');
          }
          orig_glLinkProgram(program);
        };
        
  
        var orig_glBindBuffer = _glBindBuffer;
        _glBindBuffer = _emscripten_glBindBuffer = (target, buffer) => {
          orig_glBindBuffer(target, buffer);
          if (target == GLctx.ARRAY_BUFFER) {
            if (GLEmulation.currentVao) {
              assert(GLEmulation.currentVao.arrayBuffer == buffer || GLEmulation.currentVao.arrayBuffer == 0 || buffer == 0, 'TODO: support for multiple array buffers in vao');
              GLEmulation.currentVao.arrayBuffer = buffer;
            }
          } else if (target == GLctx.ELEMENT_ARRAY_BUFFER) {
            if (GLEmulation.currentVao) GLEmulation.currentVao.elementArrayBuffer = buffer;
          }
        };
        
  
        var orig_glGetFloatv = _glGetFloatv;
        _glGetFloatv = _emscripten_glGetFloatv = (pname, params) => {
          
          if (pname == 0xBA6) { // GL_MODELVIEW_MATRIX
            HEAPF32.set(GLImmediate.matrix[0/*m*/], ((params)>>2));
          } else if (pname == 0xBA7) { // GL_PROJECTION_MATRIX
            HEAPF32.set(GLImmediate.matrix[1/*p*/], ((params)>>2));
          } else if (pname == 0xBA8) { // GL_TEXTURE_MATRIX
            HEAPF32.set(GLImmediate.matrix[2/*t*/ + GLImmediate.clientActiveTexture], ((params)>>2));
          } else if (pname == 0xB66) { // GL_FOG_COLOR
            HEAPF32.set(GLEmulation.fogColor, ((params)>>2));
          } else if (pname == 0xB63) { // GL_FOG_START
            HEAPF32[((params)>>2)] = GLEmulation.fogStart;
          } else if (pname == 0xB64) { // GL_FOG_END
            HEAPF32[((params)>>2)] = GLEmulation.fogEnd;
          } else if (pname == 0xB62) { // GL_FOG_DENSITY
            HEAPF32[((params)>>2)] = GLEmulation.fogDensity;
          } else if (pname == 0xB65) { // GL_FOG_MODE
            HEAPF32[((params)>>2)] = GLEmulation.fogMode;
          } else if (pname == 0xB53) { // GL_LIGHT_MODEL_AMBIENT
            HEAPF32[((params)>>2)] = GLEmulation.lightModelAmbient[0];
            HEAPF32[(((params)+(4))>>2)] = GLEmulation.lightModelAmbient[1];
            HEAPF32[(((params)+(8))>>2)] = GLEmulation.lightModelAmbient[2];
            HEAPF32[(((params)+(12))>>2)] = GLEmulation.lightModelAmbient[3];
          } else if (pname == 0xBC2) { // GL_ALPHA_TEST_REF
            HEAPF32[((params)>>2)] = GLEmulation.alphaTestRef;
          } else if (pname == 0xB00) { // GL_CURRENT_COLOR
            var c = GLImmediate.clientColor;
            HEAPF32[((params)>>2)] = c[0];
            HEAPF32[(((params)+(4))>>2)] = c[1];
            HEAPF32[(((params)+(8))>>2)] = c[2];
            HEAPF32[(((params)+(12))>>2)] = c[3];
          } else {
            orig_glGetFloatv(pname, params);
          }
        };
        
  
        var orig_glHint = _glHint;
        _glHint = _emscripten_glHint = (target, mode) => {
          if (target == 0x84EF) { // GL_TEXTURE_COMPRESSION_HINT
            return;
          }
          orig_glHint(target, mode);
        };
        
  
        var orig_glEnableVertexAttribArray = _glEnableVertexAttribArray;
        _glEnableVertexAttribArray = _emscripten_glEnableVertexAttribArray = (index) => {
          orig_glEnableVertexAttribArray(index);
          GLEmulation.enabledVertexAttribArrays[index] = 1;
          if (GLEmulation.currentVao) GLEmulation.currentVao.enabledVertexAttribArrays[index] = 1;
        };
        
  
        var orig_glDisableVertexAttribArray = _glDisableVertexAttribArray;
        _glDisableVertexAttribArray = _emscripten_glDisableVertexAttribArray = (index) => {
          orig_glDisableVertexAttribArray(index);
          delete GLEmulation.enabledVertexAttribArrays[index];
          if (GLEmulation.currentVao) delete GLEmulation.currentVao.enabledVertexAttribArrays[index];
        };
        
  
        var orig_glVertexAttribPointer = _glVertexAttribPointer;
        _glVertexAttribPointer = _emscripten_glVertexAttribPointer = (index, size, type, normalized, stride, pointer) => {
          orig_glVertexAttribPointer(index, size, type, normalized, stride, pointer);
          if (GLEmulation.currentVao) { // TODO: avoid object creation here? likely not hot though
            GLEmulation.currentVao.vertexAttribPointers[index] = [index, size, type, normalized, stride, pointer];
          }
        };
        
      },
  getAttributeFromCapability(cap) {
        var attrib = null;
        switch (cap) {
          case 0xDE1: // GL_TEXTURE_2D - XXX not according to spec, and not in desktop GL, but works in some GLES1.x apparently, so support it
            abort('GL_TEXTURE_2D is not a spec-defined capability for gl{Enable,Disable}ClientState.');
            // Fall through:
          case 0x8078: // GL_TEXTURE_COORD_ARRAY
            attrib = GLImmediate.TEXTURE0 + GLImmediate.clientActiveTexture; break;
          case 0x8074: // GL_VERTEX_ARRAY
            attrib = GLImmediate.VERTEX; break;
          case 0x8075: // GL_NORMAL_ARRAY
            attrib = GLImmediate.NORMAL; break;
          case 0x8076: // GL_COLOR_ARRAY
            attrib = GLImmediate.COLOR; break;
        }
        return attrib;
      },
  };
  
  
  
  /** @type {!Uint16Array} */
  var HEAPU16;
  
  
  var GLImmediate = {
  MapTreeLib:null,
  spawnMapTreeLib:() => {
        /**
       * A naive implementation of a map backed by an array, and accessed by
       * naive iteration along the array. (hashmap with only one bucket)
       * @constructor
       */
        function CNaiveListMap() {
          var list = [];
  
          this.insert = function CNaiveListMap_insert(key, val) {
            if (this.contains(key|0)) return false;
            list.push([key, val]);
            return true;
          };
  
          var __contains_i;
          this.contains = function CNaiveListMap_contains(key) {
            for (__contains_i = 0; __contains_i < list.length; ++__contains_i) {
              if (list[__contains_i][0] === key) return true;
            }
            return false;
          };
  
          var __get_i;
          this.get = function CNaiveListMap_get(key) {
            for (__get_i = 0; __get_i < list.length; ++__get_i) {
              if (list[__get_i][0] === key) return list[__get_i][1];
            }
            return undefined;
          };
        };
  
        /**
       * A tree of map nodes.
       * Uses `KeyView`s to allow descending the tree without garbage.
       * Example: {
       *   // Create our map object.
       *   var map = new ObjTreeMap();
       *
       *   // Grab the static keyView for the map.
       *   var keyView = map.GetStaticKeyView();
       *
       *   // Let's make a map for:
       *   // root: <undefined>
       *   //   1: <undefined>
       *   //     2: <undefined>
       *   //       5: "Three, sir!"
       *   //       3: "Three!"
       *
       *   // Note how we can chain together `Reset` and `Next` to
       *   // easily descend based on multiple key fragments.
       *   keyView.Reset().Next(1).Next(2).Next(5).Set("Three, sir!");
       *   keyView.Reset().Next(1).Next(2).Next(3).Set("Three!");
       * }
       * @constructor
       */
        function CMapTree() {
          /** @constructor */
          function CNLNode() {
            var map = new CNaiveListMap();
  
            this.child = function CNLNode_child(keyFrag) {
              if (!map.contains(keyFrag|0)) {
                map.insert(keyFrag|0, new CNLNode());
              }
              return map.get(keyFrag|0);
            };
  
            this.value = undefined;
            this.get = function CNLNode_get() {
              return this.value;
            };
  
            this.set = function CNLNode_set(val) {
              this.value = val;
            };
          }
  
          /** @constructor */
          function CKeyView(root) {
            var cur;
  
            this.reset = function CKeyView_reset() {
              cur = root;
              return this;
            };
            this.reset();
  
            this.next = function CKeyView_next(keyFrag) {
              cur = cur.child(keyFrag);
              return this;
            };
  
            this.get = function CKeyView_get() {
              return cur.get();
            };
  
            this.set = function CKeyView_set(val) {
              cur.set(val);
            };
          };
  
          var root;
          var staticKeyView;
  
          this.createKeyView = function CNLNode_createKeyView() {
            return new CKeyView(root);
          }
  
          this.clear = function CNLNode_clear() {
            root = new CNLNode();
            staticKeyView = this.createKeyView();
          };
          this.clear();
  
          this.getStaticKeyView = function CNLNode_getStaticKeyView() {
            staticKeyView.reset();
            return staticKeyView;
          };
        };
  
        // Exports:
        return {
          create: () => new CMapTree(),
        };
      },
  TexEnvJIT:null,
  spawnTexEnvJIT:() => {
        // GL defs:
        var GL_TEXTURE0 = 0x84C0;
        var GL_TEXTURE_1D = 0xDE0;
        var GL_TEXTURE_2D = 0xDE1;
        var GL_TEXTURE_3D = 0x806f;
        var GL_TEXTURE_CUBE_MAP = 0x8513;
        var GL_TEXTURE_ENV = 0x2300;
        var GL_TEXTURE_ENV_MODE = 0x2200;
        var GL_TEXTURE_ENV_COLOR = 0x2201;
        var GL_TEXTURE_CUBE_MAP_POSITIVE_X = 0x8515;
        var GL_TEXTURE_CUBE_MAP_NEGATIVE_X = 0x8516;
        var GL_TEXTURE_CUBE_MAP_POSITIVE_Y = 0x8517;
        var GL_TEXTURE_CUBE_MAP_NEGATIVE_Y = 0x8518;
        var GL_TEXTURE_CUBE_MAP_POSITIVE_Z = 0x8519;
        var GL_TEXTURE_CUBE_MAP_NEGATIVE_Z = 0x851A;
  
        var GL_SRC0_RGB = 0x8580;
        var GL_SRC1_RGB = 0x8581;
        var GL_SRC2_RGB = 0x8582;
  
        var GL_SRC0_ALPHA = 0x8588;
        var GL_SRC1_ALPHA = 0x8589;
        var GL_SRC2_ALPHA = 0x858A;
  
        var GL_OPERAND0_RGB = 0x8590;
        var GL_OPERAND1_RGB = 0x8591;
        var GL_OPERAND2_RGB = 0x8592;
  
        var GL_OPERAND0_ALPHA = 0x8598;
        var GL_OPERAND1_ALPHA = 0x8599;
        var GL_OPERAND2_ALPHA = 0x859A;
  
        var GL_COMBINE_RGB = 0x8571;
        var GL_COMBINE_ALPHA = 0x8572;
  
        var GL_RGB_SCALE = 0x8573;
        var GL_ALPHA_SCALE = 0xD1C;
  
        // env.mode
        var GL_ADD      = 0x104;
        var GL_BLEND    = 0xBE2;
        var GL_REPLACE  = 0x1E01;
        var GL_MODULATE = 0x2100;
        var GL_DECAL    = 0x2101;
        var GL_COMBINE  = 0x8570;
  
        // env.color/alphaCombiner
        //var GL_ADD         = 0x104;
        //var GL_REPLACE     = 0x1E01;
        //var GL_MODULATE    = 0x2100;
        var GL_SUBTRACT    = 0x84E7;
        var GL_INTERPOLATE = 0x8575;
  
        // env.color/alphaSrc
        var GL_TEXTURE       = 0x1702;
        var GL_CONSTANT      = 0x8576;
        var GL_PRIMARY_COLOR = 0x8577;
        var GL_PREVIOUS      = 0x8578;
  
        // env.color/alphaOp
        var GL_SRC_COLOR           = 0x300;
        var GL_ONE_MINUS_SRC_COLOR = 0x301;
        var GL_SRC_ALPHA           = 0x302;
        var GL_ONE_MINUS_SRC_ALPHA = 0x303;
  
        var GL_RGB  = 0x1907;
        var GL_RGBA = 0x1908;
  
        // Our defs:
        var TEXENVJIT_NAMESPACE_PREFIX = 'tej_';
        // Not actually constant, as they can be changed between JIT passes:
        var TEX_UNIT_UNIFORM_PREFIX = 'uTexUnit';
        var TEX_COORD_VARYING_PREFIX = 'vTexCoord';
        var PRIM_COLOR_VARYING = 'vPrimColor';
        var TEX_MATRIX_UNIFORM_PREFIX = 'uTexMatrix';
  
        // Static vars:
        var s_texUnits = null; //[];
        var s_activeTexture = 0;
  
        var s_requiredTexUnitsForPass = [];
  
        // Static funcs:
        function abort_noSupport(info) {
          abort('[TexEnvJIT] ABORT: No support: ' + info);
        }
  
        function abort_sanity(info) {
          abort('[TexEnvJIT] ABORT: Sanity failure: ' + info);
        }
  
        function genTexUnitSampleExpr(texUnitID) {
          var texUnit = s_texUnits[texUnitID];
          var texType = texUnit.getTexType();
  
          var func = null;
          switch (texType) {
            case GL_TEXTURE_1D:
              func = 'texture2D';
              break;
            case GL_TEXTURE_2D:
              func = 'texture2D';
              break;
            case GL_TEXTURE_3D:
              return abort_noSupport('No support for 3D textures.');
            case GL_TEXTURE_CUBE_MAP:
              func = 'textureCube';
              break;
            default:
              return abort_sanity(`Unknown texType: ${ptrToString(texType)}`);
          }
  
          var texCoordExpr = TEX_COORD_VARYING_PREFIX + texUnitID;
          if (TEX_MATRIX_UNIFORM_PREFIX != null) {
            texCoordExpr = `(${TEX_MATRIX_UNIFORM_PREFIX}${texUnitID} * ${texCoordExpr})`;
          }
          return `${func}(${TEX_UNIT_UNIFORM_PREFIX}${texUnitID}, ${texCoordExpr}.xy)`;
        }
  
        function getTypeFromCombineOp(op) {
          switch (op) {
            case GL_SRC_COLOR:
            case GL_ONE_MINUS_SRC_COLOR:
              return 'vec3';
            case GL_SRC_ALPHA:
            case GL_ONE_MINUS_SRC_ALPHA:
              return 'float';
          }
  
          return abort_noSupport('Unsupported combiner op: ' + ptrToString(op));
        }
  
        function getCurTexUnit() {
          return s_texUnits[s_activeTexture];
        }
  
        function genCombinerSourceExpr(texUnitID, constantExpr, previousVar,
                                       src, op)
        {
          var srcExpr = null;
          switch (src) {
            case GL_TEXTURE:
              srcExpr = genTexUnitSampleExpr(texUnitID);
              break;
            case GL_CONSTANT:
              srcExpr = constantExpr;
              break;
            case GL_PRIMARY_COLOR:
              srcExpr = PRIM_COLOR_VARYING;
              break;
            case GL_PREVIOUS:
              srcExpr = previousVar;
              break;
            default:
                return abort_noSupport('Unsupported combiner src: ' + ptrToString(src));
          }
  
          var expr = null;
          switch (op) {
            case GL_SRC_COLOR:
              expr = srcExpr + '.rgb';
              break;
            case GL_ONE_MINUS_SRC_COLOR:
              expr = `(vec3(1.0) - ${srcExpr}.rgb)`;
              break;
            case GL_SRC_ALPHA:
              expr = srcExpr + '.a';
              break;
            case GL_ONE_MINUS_SRC_ALPHA:
              expr = `(1.0 - ${srcExpr}.a)`;
              break;
            default:
              return abort_noSupport('Unsupported combiner op: ' + ptrToString(op));
          }
  
          return expr;
        }
  
        function valToFloatLiteral(val) {
          if (val == Math.round(val)) return val + '.0';
          return val;
        }
  
        // Classes:
        /** @constructor */
        function CTexEnv() {
          this.mode = GL_MODULATE;
          this.colorCombiner = GL_MODULATE;
          this.alphaCombiner = GL_MODULATE;
          this.colorScale = 1;
          this.alphaScale = 1;
          this.envColor = [0, 0, 0, 0];
  
          this.colorSrc = [
            GL_TEXTURE,
            GL_PREVIOUS,
            GL_CONSTANT
          ];
          this.alphaSrc = [
            GL_TEXTURE,
            GL_PREVIOUS,
            GL_CONSTANT
          ];
          this.colorOp = [
            GL_SRC_COLOR,
            GL_SRC_COLOR,
            GL_SRC_ALPHA
          ];
          this.alphaOp = [
            GL_SRC_ALPHA,
            GL_SRC_ALPHA,
            GL_SRC_ALPHA
          ];
  
          // Map GLenums to small values to efficiently pack the enums to bits for tighter access.
          this.traverseKey = {
            // mode
            0x1E01 /* GL_REPLACE */: 0,
            0x2100 /* GL_MODULATE */: 1,
            0x104 /* GL_ADD */: 2,
            0xBE2 /* GL_BLEND */: 3,
            0x2101 /* GL_DECAL */: 4,
            0x8570 /* GL_COMBINE */: 5,
  
            // additional color and alpha combiners
            0x84E7 /* GL_SUBTRACT */: 3,
            0x8575 /* GL_INTERPOLATE */: 4,
  
            // color and alpha src
            0x1702 /* GL_TEXTURE */: 0,
            0x8576 /* GL_CONSTANT */: 1,
            0x8577 /* GL_PRIMARY_COLOR */: 2,
            0x8578 /* GL_PREVIOUS */: 3,
  
            // color and alpha op
            0x300 /* GL_SRC_COLOR */: 0,
            0x301 /* GL_ONE_MINUS_SRC_COLOR */: 1,
            0x302 /* GL_SRC_ALPHA */: 2,
            0x303 /* GL_ONE_MINUS_SRC_ALPHA */: 3
          };
  
          // The tuple (key0,key1,key2) uniquely identifies the state of the variables in CTexEnv.
          // -1 on key0 denotes 'the whole cached key is dirty'
          this.key0 = -1;
          this.key1 = 0;
          this.key2 = 0;
  
          this.computeKey0 = function() {
            var k = this.traverseKey;
            var key = k[this.mode] * 1638400; // 6 distinct values.
            key += k[this.colorCombiner] * 327680; // 5 distinct values.
            key += k[this.alphaCombiner] * 65536; // 5 distinct values.
            // The above three fields have 6*5*5=150 distinct values -> 8 bits.
            key += (this.colorScale-1) * 16384; // 10 bits used.
            key += (this.alphaScale-1) * 4096; // 12 bits used.
            key += k[this.colorSrc[0]] * 1024; // 14
            key += k[this.colorSrc[1]] * 256; // 16
            key += k[this.colorSrc[2]] * 64; // 18
            key += k[this.alphaSrc[0]] * 16; // 20
            key += k[this.alphaSrc[1]] * 4; // 22
            key += k[this.alphaSrc[2]]; // 24 bits used total.
            return key;
          }
          this.computeKey1 = function() {
            var k = this.traverseKey;
            var key = k[this.colorOp[0]] * 4096;
            key += k[this.colorOp[1]] * 1024;
            key += k[this.colorOp[2]] * 256;
            key += k[this.alphaOp[0]] * 16;
            key += k[this.alphaOp[1]] * 4;
            key += k[this.alphaOp[2]];
            return key;
          }
          // TODO: remove this. The color should not be part of the key!
          this.computeKey2 = function() {
            return this.envColor[0] * 16777216 + this.envColor[1] * 65536 + this.envColor[2] * 256 + 1 + this.envColor[3];
          }
          this.recomputeKey = function() {
            this.key0 = this.computeKey0();
            this.key1 = this.computeKey1();
            this.key2 = this.computeKey2();
          }
          this.invalidateKey = function() {
            this.key0 = -1; // The key of this texture unit must be recomputed when rendering the next time.
            GLImmediate.currentRenderer = null; // The currently used renderer must be re-evaluated at next render.
          }
        }
  
        /** @constructor */
        function CTexUnit() {
          this.env = new CTexEnv();
          this.enabled_tex1D   = false;
          this.enabled_tex2D   = false;
          this.enabled_tex3D   = false;
          this.enabled_texCube = false;
          this.texTypesEnabled = 0; // A bitfield combination of the four flags above, used for fast access to operations.
  
          this.traverseState = function CTexUnit_traverseState(keyView) {
            if (this.texTypesEnabled) {
              if (this.env.key0 == -1) {
                this.env.recomputeKey();
              }
              keyView.next(this.texTypesEnabled | (this.env.key0 << 4));
              keyView.next(this.env.key1);
              keyView.next(this.env.key2);
            } else {
              // For correctness, must traverse a zero value, theoretically a subsequent integer key could collide with this value otherwise.
              keyView.next(0);
            }
          };
        };
  
        // Class impls:
        CTexUnit.prototype.enabled = function CTexUnit_enabled() {
          return this.texTypesEnabled;
        }
  
        CTexUnit.prototype.genPassLines = function CTexUnit_genPassLines(passOutputVar, passInputVar, texUnitID) {
          if (!this.enabled()) {
            return [`vec4 ${passOutputVar} = ${passInputVar};`];
          }
          var lines = this.env.genPassLines(passOutputVar, passInputVar, texUnitID).join('\n');
  
          var texLoadLines = '';
          var texLoadRegex = /(texture.*?\(.*?\))/g;
          var loadCounter = 0;
          var load;
  
          // As an optimization, merge duplicate identical texture loads to one var.
          while (load = texLoadRegex.exec(lines)) {
            var texLoadExpr = load[1];
            var secondOccurrence = lines.slice(load.index+1).indexOf(texLoadExpr);
            if (secondOccurrence != -1) { // And also has a second occurrence of same load expression..
              // Create new var to store the common load.
              var prefix = `${TEXENVJIT_NAMESPACE_PREFIX}env${texUnitID}_`;
              var texLoadVar = `${prefix}texload${loadCounter++}`;
              var texLoadLine = `vec4 ${texLoadVar} = ${texLoadExpr};\n`;
              texLoadLines += texLoadLine + '\n'; // Store the generated texture load statements in a temp string to not confuse regex search in progress.
              lines = lines.split(texLoadExpr).join(texLoadVar);
              // Reset regex search, since we modified the string.
              texLoadRegex = /(texture.*\(.*\))/g;
            }
          }
          return [texLoadLines + lines];
        }
  
        CTexUnit.prototype.getTexType = function CTexUnit_getTexType() {
          if (this.enabled_texCube) {
            return GL_TEXTURE_CUBE_MAP;
          } else if (this.enabled_tex3D) {
            return GL_TEXTURE_3D;
          } else if (this.enabled_tex2D) {
            return GL_TEXTURE_2D;
          } else if (this.enabled_tex1D) {
            return GL_TEXTURE_1D;
          }
          return 0;
        }
  
        CTexEnv.prototype.genPassLines = function CTexEnv_genPassLines(passOutputVar, passInputVar, texUnitID) {
          switch (this.mode) {
            case GL_REPLACE: {
              /* RGB:
             * Cv = Cs
             * Av = Ap // Note how this is different, and that we'll
             *            need to track the bound texture internalFormat
             *            to get this right.
             *
             * RGBA:
             * Cv = Cs
             * Av = As
             */
              return [
                `vec4 ${passOutputVar} = ${genTexUnitSampleExpr(texUnitID)};`,
              ];
            }
            case GL_ADD: {
              /* RGBA:
             * Cv = Cp + Cs
             * Av = ApAs
             */
              var prefix = TEXENVJIT_NAMESPACE_PREFIX + 'env' + texUnitID + '_';
              var texVar = prefix + 'tex';
              var colorVar = prefix + 'color';
              var alphaVar = prefix + 'alpha';
  
              return [
                'vec4 ' + texVar + ' = ' + genTexUnitSampleExpr(texUnitID) + ';',
                'vec3 ' + colorVar + ' = ' + passInputVar + '.rgb + ' + texVar + '.rgb;',
                'float ' + alphaVar + ' = ' + passInputVar + '.a * ' + texVar + '.a;',
                'vec4 ' + passOutputVar + ' = vec4(' + colorVar + ', ' + alphaVar + ');',
              ];
            }
            case GL_MODULATE: {
              /* RGBA:
             * Cv = CpCs
             * Av = ApAs
             */
              var line = [
                'vec4 ' + passOutputVar,
                ' = ',
                  passInputVar,
                  ' * ',
                  genTexUnitSampleExpr(texUnitID),
                ';',
              ];
              return [line.join('')];
            }
            case GL_DECAL: {
              /* RGBA:
             * Cv = Cp(1 - As) + CsAs
             * Av = Ap
             */
              var prefix = TEXENVJIT_NAMESPACE_PREFIX + 'env' + texUnitID + '_';
              var texVar = prefix + 'tex';
              var colorVar = prefix + 'color';
              var alphaVar = prefix + 'alpha';
  
              return [
                'vec4 ' + texVar + ' = ' + genTexUnitSampleExpr(texUnitID) + ';',
                [
                  'vec3 ' + colorVar + ' = ',
                    passInputVar + '.rgb * (1.0 - ' + texVar + '.a)',
                      ' + ',
                    texVar + '.rgb * ' + texVar + '.a',
                  ';'
                ].join(''),
                'float ' + alphaVar + ' = ' + passInputVar + '.a;',
                'vec4 ' + passOutputVar + ' = vec4(' + colorVar + ', ' + alphaVar + ');',
              ];
            }
            case GL_BLEND: {
              /* RGBA:
             * Cv = Cp(1 - Cs) + CcCs
             * Av = As
             */
              var prefix = TEXENVJIT_NAMESPACE_PREFIX + 'env' + texUnitID + '_';
              var texVar = prefix + 'tex';
              var colorVar = prefix + 'color';
              var alphaVar = prefix + 'alpha';
  
              return [
                'vec4 ' + texVar + ' = ' + genTexUnitSampleExpr(texUnitID) + ';',
                [
                  'vec3 ' + colorVar + ' = ',
                    passInputVar + '.rgb * (1.0 - ' + texVar + '.rgb)',
                      ' + ',
                    PRIM_COLOR_VARYING + '.rgb * ' + texVar + '.rgb',
                  ';'
                ].join(''),
                'float ' + alphaVar + ' = ' + texVar + '.a;',
                'vec4 ' + passOutputVar + ' = vec4(' + colorVar + ', ' + alphaVar + ');',
              ];
            }
            case GL_COMBINE: {
              var prefix = TEXENVJIT_NAMESPACE_PREFIX + 'env' + texUnitID + '_';
              var colorVar = prefix + 'color';
              var alphaVar = prefix + 'alpha';
              var colorLines = this.genCombinerLines(true, colorVar,
                                                     passInputVar, texUnitID,
                                                     this.colorCombiner, this.colorSrc, this.colorOp);
              var alphaLines = this.genCombinerLines(false, alphaVar,
                                                     passInputVar, texUnitID,
                                                     this.alphaCombiner, this.alphaSrc, this.alphaOp);
  
              // Generate scale, but avoid generating an identity op that multiplies by one.
              var scaledColor = (this.colorScale == 1) ? colorVar : (colorVar + ' * ' + valToFloatLiteral(this.colorScale));
              var scaledAlpha = (this.alphaScale == 1) ? alphaVar : (alphaVar + ' * ' + valToFloatLiteral(this.alphaScale));
  
              var line = [
                'vec4 ' + passOutputVar,
                ' = ',
                  'vec4(',
                      scaledColor,
                      ', ',
                      scaledAlpha,
                  ')',
                ';',
              ].join('');
              return [].concat(colorLines, alphaLines, [line]);
            }
          }
  
          return abort_noSupport('Unsupported TexEnv mode: ' + ptrToString(this.mode));
        }
  
        CTexEnv.prototype.genCombinerLines = function CTexEnv_getCombinerLines(isColor, outputVar,
                                                                               passInputVar, texUnitID,
                                                                               combiner, srcArr, opArr)
        {
          var argsNeeded = null;
          switch (combiner) {
            case GL_REPLACE:
              argsNeeded = 1;
              break;
  
            case GL_MODULATE:
            case GL_ADD:
            case GL_SUBTRACT:
              argsNeeded = 2;
              break;
  
            case GL_INTERPOLATE:
              argsNeeded = 3;
              break;
  
            default:
              return abort_noSupport('Unsupported combiner: ' + ptrToString(combiner));
          }
  
          var constantExpr = [
            'vec4(',
              valToFloatLiteral(this.envColor[0]),
              ', ',
              valToFloatLiteral(this.envColor[1]),
              ', ',
              valToFloatLiteral(this.envColor[2]),
              ', ',
              valToFloatLiteral(this.envColor[3]),
            ')',
          ].join('');
          var src0Expr = (argsNeeded >= 1) ? genCombinerSourceExpr(texUnitID, constantExpr, passInputVar, srcArr[0], opArr[0])
                                           : null;
          var src1Expr = (argsNeeded >= 2) ? genCombinerSourceExpr(texUnitID, constantExpr, passInputVar, srcArr[1], opArr[1])
                                           : null;
          var src2Expr = (argsNeeded >= 3) ? genCombinerSourceExpr(texUnitID, constantExpr, passInputVar, srcArr[2], opArr[2])
                                           : null;
  
          var outputType = isColor ? 'vec3' : 'float';
          var lines = null;
          switch (combiner) {
            case GL_REPLACE: {
              lines = [`${outputType} ${outputVar} = ${src0Expr};`]
              break;
            }
            case GL_MODULATE: {
              lines = [`${outputType} ${outputVar} = ${src0Expr} * ${src1Expr};`];
              break;
            }
            case GL_ADD: {
              lines = [`${outputType} ${outputVar} = ${src0Expr} + ${src1Expr};`]
              break;
            }
            case GL_SUBTRACT: {
              lines = [`${outputType} ${outputVar} = ${src0Expr} - ${src1Expr};`]
              break;
            }
            case GL_INTERPOLATE: {
              var prefix = `${TEXENVJIT_NAMESPACE_PREFIX}env${texUnitID}_`;
              var arg2Var = `${prefix}colorSrc2`;
              var arg2Type = getTypeFromCombineOp(this.colorOp[2]);
  
              lines = [
                `${arg2Type} ${arg2Var} = ${src2Expr};`,
                `${outputType} ${outputVar} = ${src0Expr} * ${arg2Var} + ${src1Expr} * (1.0 - ${arg2Var});`,
              ];
              break;
            }
  
            default:
              return abort_sanity('Unmatched TexEnv.colorCombiner?');
          }
  
          return lines;
        }
  
        return {
          // Exports:
          init: (gl, specifiedMaxTextureImageUnits) => {
            var maxTexUnits = 0;
            if (specifiedMaxTextureImageUnits) {
              maxTexUnits = specifiedMaxTextureImageUnits;
            } else if (gl) {
              maxTexUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
            }
            assert(maxTexUnits > 0);
            s_texUnits = [];
            for (var i = 0; i < maxTexUnits; i++) {
              s_texUnits.push(new CTexUnit());
            }
          },
  
          setGLSLVars: (uTexUnitPrefix, vTexCoordPrefix, vPrimColor, uTexMatrixPrefix) => {
            TEX_UNIT_UNIFORM_PREFIX   = uTexUnitPrefix;
            TEX_COORD_VARYING_PREFIX  = vTexCoordPrefix;
            PRIM_COLOR_VARYING        = vPrimColor;
            TEX_MATRIX_UNIFORM_PREFIX = uTexMatrixPrefix;
          },
  
          genAllPassLines: (resultDest, indentSize = 0) => {
            s_requiredTexUnitsForPass.length = 0; // Clear the list.
            var lines = [];
            var lastPassVar = PRIM_COLOR_VARYING;
            for (var i = 0; i < s_texUnits.length; i++) {
              if (!s_texUnits[i].enabled()) continue;
  
              s_requiredTexUnitsForPass.push(i);
  
              var prefix = TEXENVJIT_NAMESPACE_PREFIX + 'env' + i + '_';
              var passOutputVar = prefix + 'result';
  
              var newLines = s_texUnits[i].genPassLines(passOutputVar, lastPassVar, i);
              lines = lines.concat(newLines, ['']);
  
              lastPassVar = passOutputVar;
            }
            lines.push(resultDest + ' = ' + lastPassVar + ';');
  
            var indent = '';
            for (var i = 0; i < indentSize; i++) indent += ' ';
  
            var output = indent + lines.join('\n' + indent);
  
            return output;
          },
  
          getUsedTexUnitList: () => s_requiredTexUnitsForPass,
  
          getActiveTexture: () => s_activeTexture,
  
          traverseState: (keyView) => {
            for (var texUnit of s_texUnits) {
              texUnit.traverseState(keyView);
            }
          },
  
          getTexUnitType: (texUnitID) => {
            assert(texUnitID >= 0 &&
                   texUnitID < s_texUnits.length);
            return s_texUnits[texUnitID].getTexType();
          },
  
          // Hooks:
          hook_activeTexture: (texture) => {
            s_activeTexture = texture - GL_TEXTURE0;
            // Check if the current matrix mode is GL_TEXTURE.
            if (GLImmediate.currentMatrix >= 2) {
              // Switch to the corresponding texture matrix stack.
              GLImmediate.currentMatrix = 2 + s_activeTexture;
            }
          },
  
          hook_enable: (cap) => {
            var cur = getCurTexUnit();
            switch (cap) {
              case GL_TEXTURE_1D:
                if (!cur.enabled_tex1D) {
                  GLImmediate.currentRenderer = null; // Renderer state changed, and must be recreated or looked up again.
                  cur.enabled_tex1D = true;
                  cur.texTypesEnabled |= 1;
                }
                break;
              case GL_TEXTURE_2D:
                if (!cur.enabled_tex2D) {
                  GLImmediate.currentRenderer = null;
                  cur.enabled_tex2D = true;
                  cur.texTypesEnabled |= 2;
                }
                break;
              case GL_TEXTURE_3D:
                if (!cur.enabled_tex3D) {
                  GLImmediate.currentRenderer = null;
                  cur.enabled_tex3D = true;
                  cur.texTypesEnabled |= 4;
                }
                break;
              case GL_TEXTURE_CUBE_MAP:
                if (!cur.enabled_texCube) {
                  GLImmediate.currentRenderer = null;
                  cur.enabled_texCube = true;
                  cur.texTypesEnabled |= 8;
                }
                break;
            }
          },
  
          hook_disable: (cap) => {
            var cur = getCurTexUnit();
            switch (cap) {
              case GL_TEXTURE_1D:
                if (cur.enabled_tex1D) {
                  GLImmediate.currentRenderer = null; // Renderer state changed, and must be recreated or looked up again.
                  cur.enabled_tex1D = false;
                  cur.texTypesEnabled &= ~1;
                }
                break;
              case GL_TEXTURE_2D:
                if (cur.enabled_tex2D) {
                  GLImmediate.currentRenderer = null;
                  cur.enabled_tex2D = false;
                  cur.texTypesEnabled &= ~2;
                }
                break;
              case GL_TEXTURE_3D:
                if (cur.enabled_tex3D) {
                  GLImmediate.currentRenderer = null;
                  cur.enabled_tex3D = false;
                  cur.texTypesEnabled &= ~4;
                }
                break;
              case GL_TEXTURE_CUBE_MAP:
                if (cur.enabled_texCube) {
                  GLImmediate.currentRenderer = null;
                  cur.enabled_texCube = false;
                  cur.texTypesEnabled &= ~8;
                }
                break;
            }
          },
  
          hook_texEnvf(target, pname, param) {
            if (target != GL_TEXTURE_ENV)
              return;
  
            var env = getCurTexUnit().env;
            switch (pname) {
              case GL_RGB_SCALE:
                if (env.colorScale != param) {
                  env.invalidateKey(); // We changed FFP emulation renderer state.
                  env.colorScale = param;
                }
                break;
              case GL_ALPHA_SCALE:
                if (env.alphaScale != param) {
                  env.invalidateKey();
                  env.alphaScale = param;
                }
                break;
              case GL_TEXTURE_ENV_MODE:
                if (env.mode != param) {
                  env.invalidateKey();
                  env.mode = param;
                }
                break;
  
              default:
                err('WARNING: Unhandled `pname` in call to `glTexEnvf`.');
            }
          },
  
          hook_texEnvi(target, pname, param) {
            if (target != GL_TEXTURE_ENV)
              return;
  
            var env = getCurTexUnit().env;
            switch (pname) {
              case GL_TEXTURE_ENV_MODE:
                if (env.mode != param) {
                  env.invalidateKey(); // We changed FFP emulation renderer state.
                  env.mode = param;
                }
                break;
  
              case GL_COMBINE_RGB:
                if (env.colorCombiner != param) {
                  env.invalidateKey();
                  env.colorCombiner = param;
                }
                break;
              case GL_COMBINE_ALPHA:
                if (env.alphaCombiner != param) {
                  env.invalidateKey();
                  env.alphaCombiner = param;
                }
                break;
  
              case GL_SRC0_RGB:
                if (env.colorSrc[0] != param) {
                  env.invalidateKey();
                  env.colorSrc[0] = param;
                }
                break;
              case GL_SRC1_RGB:
                if (env.colorSrc[1] != param) {
                  env.invalidateKey();
                  env.colorSrc[1] = param;
                }
                break;
              case GL_SRC2_RGB:
                if (env.colorSrc[2] != param) {
                  env.invalidateKey();
                  env.colorSrc[2] = param;
                }
                break;
  
              case GL_SRC0_ALPHA:
                if (env.alphaSrc[0] != param) {
                  env.invalidateKey();
                  env.alphaSrc[0] = param;
                }
                break;
              case GL_SRC1_ALPHA:
                if (env.alphaSrc[1] != param) {
                  env.invalidateKey();
                  env.alphaSrc[1] = param;
                }
                break;
              case GL_SRC2_ALPHA:
                if (env.alphaSrc[2] != param) {
                  env.invalidateKey();
                  env.alphaSrc[2] = param;
                }
                break;
  
              case GL_OPERAND0_RGB:
                if (env.colorOp[0] != param) {
                  env.invalidateKey();
                  env.colorOp[0] = param;
                }
                break;
              case GL_OPERAND1_RGB:
                if (env.colorOp[1] != param) {
                  env.invalidateKey();
                  env.colorOp[1] = param;
                }
                break;
              case GL_OPERAND2_RGB:
                if (env.colorOp[2] != param) {
                  env.invalidateKey();
                  env.colorOp[2] = param;
                }
                break;
  
              case GL_OPERAND0_ALPHA:
                if (env.alphaOp[0] != param) {
                  env.invalidateKey();
                  env.alphaOp[0] = param;
                }
                break;
              case GL_OPERAND1_ALPHA:
                if (env.alphaOp[1] != param) {
                  env.invalidateKey();
                  env.alphaOp[1] = param;
                }
                break;
              case GL_OPERAND2_ALPHA:
                if (env.alphaOp[2] != param) {
                  env.invalidateKey();
                  env.alphaOp[2] = param;
                }
                break;
  
              case GL_RGB_SCALE:
                if (env.colorScale != param) {
                  env.invalidateKey();
                  env.colorScale = param;
                }
                break;
              case GL_ALPHA_SCALE:
                if (env.alphaScale != param) {
                  env.invalidateKey();
                  env.alphaScale = param;
                }
                break;
  
              default:
                err('WARNING: Unhandled `pname` in call to `glTexEnvi`.');
            }
          },
  
          hook_texEnvfv(target, pname, params) {
            if (target != GL_TEXTURE_ENV) return;
  
            var env = getCurTexUnit().env;
            switch (pname) {
              case GL_TEXTURE_ENV_COLOR: {
                for (var i = 0; i < 4; i++) {
                  var param = HEAPF32[(((params)+(i*4))>>2)];
                  if (env.envColor[i] != param) {
                    env.invalidateKey(); // We changed FFP emulation renderer state.
                    env.envColor[i] = param;
                  }
                }
                break
              }
              default:
                err('WARNING: Unhandled `pname` in call to `glTexEnvfv`.');
            }
          },
  
          hook_getTexEnviv(target, pname, param) {
            if (target != GL_TEXTURE_ENV)
              return;
  
            var env = getCurTexUnit().env;
            switch (pname) {
              case GL_TEXTURE_ENV_MODE:
                HEAP32[((param)>>2)] = env.mode;
                return;
  
              case GL_TEXTURE_ENV_COLOR:
                HEAP32[((param)>>2)] = Math.max(Math.min(env.envColor[0]*255, 255, -255));
                HEAP32[(((param)+(1))>>2)] = Math.max(Math.min(env.envColor[1]*255, 255, -255));
                HEAP32[(((param)+(2))>>2)] = Math.max(Math.min(env.envColor[2]*255, 255, -255));
                HEAP32[(((param)+(3))>>2)] = Math.max(Math.min(env.envColor[3]*255, 255, -255));
                return;
  
              case GL_COMBINE_RGB:
                HEAP32[((param)>>2)] = env.colorCombiner;
                return;
  
              case GL_COMBINE_ALPHA:
                HEAP32[((param)>>2)] = env.alphaCombiner;
                return;
  
              case GL_SRC0_RGB:
                HEAP32[((param)>>2)] = env.colorSrc[0];
                return;
  
              case GL_SRC1_RGB:
                HEAP32[((param)>>2)] = env.colorSrc[1];
                return;
  
              case GL_SRC2_RGB:
                HEAP32[((param)>>2)] = env.colorSrc[2];
                return;
  
              case GL_SRC0_ALPHA:
                HEAP32[((param)>>2)] = env.alphaSrc[0];
                return;
  
              case GL_SRC1_ALPHA:
                HEAP32[((param)>>2)] = env.alphaSrc[1];
                return;
  
              case GL_SRC2_ALPHA:
                HEAP32[((param)>>2)] = env.alphaSrc[2];
                return;
  
              case GL_OPERAND0_RGB:
                HEAP32[((param)>>2)] = env.colorOp[0];
                return;
  
              case GL_OPERAND1_RGB:
                HEAP32[((param)>>2)] = env.colorOp[1];
                return;
  
              case GL_OPERAND2_RGB:
                HEAP32[((param)>>2)] = env.colorOp[2];
                return;
  
              case GL_OPERAND0_ALPHA:
                HEAP32[((param)>>2)] = env.alphaOp[0];
                return;
  
              case GL_OPERAND1_ALPHA:
                HEAP32[((param)>>2)] = env.alphaOp[1];
                return;
  
              case GL_OPERAND2_ALPHA:
                HEAP32[((param)>>2)] = env.alphaOp[2];
                return;
  
              case GL_RGB_SCALE:
                HEAP32[((param)>>2)] = env.colorScale;
                return;
  
              case GL_ALPHA_SCALE:
                HEAP32[((param)>>2)] = env.alphaScale;
                return;
  
              default:
                err('WARNING: Unhandled `pname` in call to `glGetTexEnvi`.');
            }
          },
  
          hook_getTexEnvfv: (target, pname, param) => {
            if (target != GL_TEXTURE_ENV)
              return;
  
            var env = getCurTexUnit().env;
            switch (pname) {
              case GL_TEXTURE_ENV_COLOR:
                HEAPF32[((param)>>2)] = env.envColor[0];
                HEAPF32[(((param)+(4))>>2)] = env.envColor[1];
                HEAPF32[(((param)+(8))>>2)] = env.envColor[2];
                HEAPF32[(((param)+(12))>>2)] = env.envColor[3];
                return;
            }
          }
        };
      },
  vertexData:null,
  vertexDataU8:null,
  tempData:null,
  vertexCounter:0,
  mode:-1,
  rendererCache:null,
  rendererComponents:[],
  rendererComponentPointer:0,
  lastRenderer:null,
  lastArrayBuffer:null,
  lastProgram:null,
  lastStride:-1,
  matrix:[],
  matrixStack:[],
  currentMatrix:0,
  matricesModified:false,
  useTextureMatrix:false,
  VERTEX:0,
  NORMAL:1,
  COLOR:2,
  TEXTURE0:3,
  NUM_ATTRIBUTES:-1,
  MAX_TEXTURES:-1,
  totalEnabledClientAttributes:0,
  enabledClientAttributes:[0,0],
  clientAttributes:[],
  liveClientAttributes:[],
  currentRenderer:null,
  modifiedClientAttributes:false,
  clientActiveTexture:0,
  clientColor:null,
  usedTexUnitList:[],
  fixedFunctionProgram:null,
  setClientAttribute(name, size, type, stride, pointer) {
        var attrib = GLImmediate.clientAttributes[name];
        if (!attrib) {
          for (var i = 0; i <= name; i++) { // keep flat
            GLImmediate.clientAttributes[i] ||= {
              name,
              size,
              type,
              stride,
              pointer,
              offset: 0
            };
          }
        } else {
          attrib.name = name;
          attrib.size = size;
          attrib.type = type;
          attrib.stride = stride;
          attrib.pointer = pointer;
          attrib.offset = 0;
        }
        GLImmediate.modifiedClientAttributes = true;
      },
  addRendererComponent(name, size, type) {
        if (!GLImmediate.rendererComponents[name]) {
          GLImmediate.rendererComponents[name] = 1;
          if (GLImmediate.enabledClientAttributes[name]) {
            warnOnce('Warning: glTexCoord used after EnableClientState for TEXTURE_COORD_ARRAY for TEXTURE0. Disabling TEXTURE_COORD_ARRAY...');
          }
          GLImmediate.enabledClientAttributes[name] = true;
          GLImmediate.setClientAttribute(name, size, type, 0, GLImmediate.rendererComponentPointer);
          GLImmediate.rendererComponentPointer += size * GL.byteSizeByType[type - GL.byteSizeByTypeRoot];
          // We can enable the correct attribute stream index immediately here, since the same attribute in each shader
          // will be bound to this same index.
          GL.enableVertexAttribArray(name);
        } else {
          GLImmediate.rendererComponents[name]++;
        }
      },
  disableBeginEndClientAttributes() {
        for (var i = 0; i < GLImmediate.NUM_ATTRIBUTES; i++) {
          if (GLImmediate.rendererComponents[i]) GLImmediate.enabledClientAttributes[i] = false;
        }
      },
  getRenderer() {
        // If no FFP state has changed that would have forced to re-evaluate which FFP emulation shader to use,
        // we have the currently used renderer in cache, and can immediately return that.
        if (GLImmediate.currentRenderer) {
          return GLImmediate.currentRenderer;
        }
        // return a renderer object given the liveClientAttributes
        // we maintain a cache of renderers, optimized to not generate garbage
        var attributes = GLImmediate.liveClientAttributes;
        var cacheMap = GLImmediate.rendererCache;
        var keyView = cacheMap.getStaticKeyView().reset();
  
        // By attrib state:
        var enabledAttributesKey = 0;
        for (var attr of attributes) {
          enabledAttributesKey |= 1 << attr.name;
        }
  
        // To prevent using more than 31 bits add another level to the maptree
        // and reset the enabledAttributesKey for the next glemulation state bits
        keyView.next(enabledAttributesKey);
        enabledAttributesKey = 0;
  
        // By fog state:
        var fogParam = 0;
        if (GLEmulation.fogEnabled) {
          switch (GLEmulation.fogMode) {
            case 0x801: // GL_EXP2
              fogParam = 1;
              break;
            case 0x2601: // GL_LINEAR
              fogParam = 2;
              break;
            default: // default to GL_EXP
              fogParam = 3;
              break;
          }
        }
        enabledAttributesKey = (enabledAttributesKey << 2) | fogParam;
  
        // By clip plane mode
        for (var clipPlaneId = 0; clipPlaneId < GLEmulation.MAX_CLIP_PLANES; clipPlaneId++) {
          enabledAttributesKey = (enabledAttributesKey << 1) | GLEmulation.clipPlaneEnabled[clipPlaneId];
        }
  
        // By lighting mode and enabled lights
        enabledAttributesKey = (enabledAttributesKey << 1) | GLEmulation.lightingEnabled;
        for (var lightId = 0; lightId < GLEmulation.MAX_LIGHTS; lightId++) {
          enabledAttributesKey = (enabledAttributesKey << 1) | (GLEmulation.lightingEnabled ? GLEmulation.lightEnabled[lightId] : 0);
        }
  
        // By alpha testing mode
        enabledAttributesKey = (enabledAttributesKey << 3) | (GLEmulation.alphaTestEnabled ? (GLEmulation.alphaTestFunc - 0x200) : 0x7);
  
        // By drawing mode:
        enabledAttributesKey = (enabledAttributesKey << 1) | (GLImmediate.mode == GLctx.POINTS ? 1 : 0);
  
        keyView.next(enabledAttributesKey);
  
          GLImmediate.TexEnvJIT.traverseState(keyView);
  
        // If we don't already have it, create it.
        var renderer = keyView.get();
        if (!renderer) {
          renderer = GLImmediate.createRenderer();
          GLImmediate.currentRenderer = renderer;
          keyView.set(renderer);
          return renderer;
        }
        GLImmediate.currentRenderer = renderer; // Cache the currently used renderer, so later lookups without state changes can get this fast.
        return renderer;
      },
  createRenderer(renderer) {
        var useCurrProgram = !!GL.currProgram;
        var hasTextures = false;
        for (var i = 0; i < GLImmediate.MAX_TEXTURES; i++) {
          var texAttribName = GLImmediate.TEXTURE0 + i;
          if (!GLImmediate.enabledClientAttributes[texAttribName])
            continue;
  
          if (!useCurrProgram) {
            if (GLImmediate.TexEnvJIT.getTexUnitType(i) == 0) {
               warnOnce('GL_TEXTURE' + i + ' coords are supplied, but that texture unit is disabled in the fixed-function pipeline.');
            }
          }
  
          hasTextures = true;
        }
  
        /** @constructor */
        function Renderer() {
          this.init = function() {
            // For fixed-function shader generation.
            var uTexUnitPrefix = 'u_texUnit';
            var aTexCoordPrefix = 'a_texCoord';
            var vTexCoordPrefix = 'v_texCoord';
            var vPrimColor = 'v_color';
            var uTexMatrixPrefix = GLImmediate.useTextureMatrix ? 'u_textureMatrix' : null;
  
            if (useCurrProgram) {
              if (GL.shaderInfos[GL.programShaders[GL.currProgram][0]].type == GLctx.VERTEX_SHADER) {
                this.vertexShader = GL.shaders[GL.programShaders[GL.currProgram][0]];
                this.fragmentShader = GL.shaders[GL.programShaders[GL.currProgram][1]];
              } else {
                this.vertexShader = GL.shaders[GL.programShaders[GL.currProgram][1]];
                this.fragmentShader = GL.shaders[GL.programShaders[GL.currProgram][0]];
              }
              this.program = GL.programs[GL.currProgram];
              this.usedTexUnitList = [];
            } else {
              // IMPORTANT NOTE: If you parameterize the shader source based on any runtime values
              // in order to create the least expensive shader possible based on the features being
              // used, you should also update the code in the beginning of getRenderer to make sure
              // that you cache the renderer based on the said parameters.
              if (GLEmulation.fogEnabled) {
                switch (GLEmulation.fogMode) {
                  case 0x801: // GL_EXP2
                    // fog = exp(-(gl_Fog.density * gl_FogFragCoord)^2)
                    var fogFormula = '  float fog = exp(-u_fogDensity * u_fogDensity * ecDistance * ecDistance); \n';
                    break;
                  case 0x2601: // GL_LINEAR
                    // fog = (gl_Fog.end - gl_FogFragCoord) * gl_fog.scale
                    var fogFormula = '  float fog = (u_fogEnd - ecDistance) * u_fogScale; \n';
                    break;
                  default: // default to GL_EXP
                    // fog = exp(-gl_Fog.density * gl_FogFragCoord)
                    var fogFormula = '  float fog = exp(-u_fogDensity * ecDistance); \n';
                    break;
                }
              }
  
              GLImmediate.TexEnvJIT.setGLSLVars(uTexUnitPrefix, vTexCoordPrefix, vPrimColor, uTexMatrixPrefix);
              var fsTexEnvPass = GLImmediate.TexEnvJIT.genAllPassLines('gl_FragColor', 2);
  
              var texUnitAttribList = '';
              var texUnitVaryingList = '';
              var texUnitUniformList = '';
              var vsTexCoordInits = '';
              this.usedTexUnitList = GLImmediate.TexEnvJIT.getUsedTexUnitList();
              for (var texUnit of this.usedTexUnitList) {
                texUnitAttribList += 'attribute vec4 ' + aTexCoordPrefix + texUnit + ';\n';
                texUnitVaryingList += 'varying vec4 ' + vTexCoordPrefix + texUnit + ';\n';
                texUnitUniformList += 'uniform sampler2D ' + uTexUnitPrefix + texUnit + ';\n';
                vsTexCoordInits += '  ' + vTexCoordPrefix + texUnit + ' = ' + aTexCoordPrefix + texUnit + ';\n';
  
                if (GLImmediate.useTextureMatrix) {
                  texUnitUniformList += 'uniform mat4 ' + uTexMatrixPrefix + texUnit + ';\n';
                }
              }
  
              var vsFogVaryingInit = null;
              if (GLEmulation.fogEnabled) {
                vsFogVaryingInit = '  v_fogFragCoord = abs(ecPosition.z);\n';
              }
  
              var vsPointSizeDefs = null;
              var vsPointSizeInit = null;
              if (GLImmediate.mode == GLctx.POINTS) {
                vsPointSizeDefs = 'uniform float u_pointSize;\n';
                vsPointSizeInit = '  gl_PointSize = u_pointSize;\n';
              }
  
              var vsClipPlaneDefs = '';
              var vsClipPlaneInit = '';
              var fsClipPlaneDefs = '';
              var fsClipPlanePass = '';
              for (var clipPlaneId = 0; clipPlaneId < GLEmulation.MAX_CLIP_PLANES; clipPlaneId++) {
                if (GLEmulation.clipPlaneEnabled[clipPlaneId]) {
                  vsClipPlaneDefs += 'uniform vec4 u_clipPlaneEquation' + clipPlaneId + ';';
                  vsClipPlaneDefs += 'varying float v_clipDistance' + clipPlaneId + ';';
                  vsClipPlaneInit += '  v_clipDistance' + clipPlaneId + ' = dot(ecPosition, u_clipPlaneEquation' + clipPlaneId + ');';
                  fsClipPlaneDefs += 'varying float v_clipDistance' + clipPlaneId + ';';
                  fsClipPlanePass += '  if (v_clipDistance' + clipPlaneId + ' < 0.0) discard;';
                }
              }
  
              var vsLightingDefs = '';
              var vsLightingPass = '';
              if (GLEmulation.lightingEnabled) {
                vsLightingDefs += 'attribute vec3 a_normal;';
                vsLightingDefs += 'uniform mat3 u_normalMatrix;';
                vsLightingDefs += 'uniform vec4 u_lightModelAmbient;';
                vsLightingDefs += 'uniform vec4 u_materialAmbient;';
                vsLightingDefs += 'uniform vec4 u_materialDiffuse;';
                vsLightingDefs += 'uniform vec4 u_materialSpecular;';
                vsLightingDefs += 'uniform float u_materialShininess;';
                vsLightingDefs += 'uniform vec4 u_materialEmission;';
  
                vsLightingPass += '  vec3 ecNormal = normalize(u_normalMatrix * a_normal);';
                vsLightingPass += '  v_color.w = u_materialDiffuse.w;';
                vsLightingPass += '  v_color.xyz = u_materialEmission.xyz;';
                vsLightingPass += '  v_color.xyz += u_lightModelAmbient.xyz * u_materialAmbient.xyz;';
  
                for (var lightId = 0; lightId < GLEmulation.MAX_LIGHTS; lightId++) {
                  if (GLEmulation.lightEnabled[lightId]) {
                    vsLightingDefs += 'uniform vec4 u_lightAmbient' + lightId + ';';
                    vsLightingDefs += 'uniform vec4 u_lightDiffuse' + lightId + ';';
                    vsLightingDefs += 'uniform vec4 u_lightSpecular' + lightId + ';';
                    vsLightingDefs += 'uniform vec4 u_lightPosition' + lightId + ';';
  
                    vsLightingPass += '  {';
                    vsLightingPass += '    vec3 lightDirection = normalize(u_lightPosition' + lightId + ').xyz;';
                    vsLightingPass += '    vec3 halfVector = normalize(lightDirection + vec3(0,0,1));';
                    vsLightingPass += '    vec3 ambient = u_lightAmbient' + lightId + '.xyz * u_materialAmbient.xyz;';
                    vsLightingPass += '    float diffuseI = max(dot(ecNormal, lightDirection), 0.0);';
                    vsLightingPass += '    float specularI = max(dot(ecNormal, halfVector), 0.0);';
                    vsLightingPass += '    vec3 diffuse = diffuseI * u_lightDiffuse' + lightId + '.xyz * u_materialDiffuse.xyz;';
                    vsLightingPass += '    specularI = (diffuseI > 0.0 && specularI > 0.0) ? exp(u_materialShininess * log(specularI)) : 0.0;';
                    vsLightingPass += '    vec3 specular = specularI * u_lightSpecular' + lightId + '.xyz * u_materialSpecular.xyz;';
                    vsLightingPass += '    v_color.xyz += ambient + diffuse + specular;';
                    vsLightingPass += '  }';
                  }
                }
                vsLightingPass += '  v_color = clamp(v_color, 0.0, 1.0);';
              }
  
              var vsSource = [
                'attribute vec4 a_position;',
                'attribute vec4 a_color;',
                'varying vec4 v_color;',
                texUnitAttribList,
                texUnitVaryingList,
                (GLEmulation.fogEnabled ? 'varying float v_fogFragCoord;' : null),
                'uniform mat4 u_modelView;',
                'uniform mat4 u_projection;',
                vsPointSizeDefs,
                vsClipPlaneDefs,
                vsLightingDefs,
                'void main()',
                '{',
                '  vec4 ecPosition = u_modelView * a_position;', // eye-coordinate position
                '  gl_Position = u_projection * ecPosition;',
                '  v_color = a_color;',
                vsTexCoordInits,
                vsFogVaryingInit,
                vsPointSizeInit,
                vsClipPlaneInit,
                vsLightingPass,
                '}',
                ''
              ].join('\n').replace(/\n\n+/g, '\n');
  
              this.vertexShader = GLctx.createShader(GLctx.VERTEX_SHADER);
              GLctx.shaderSource(this.vertexShader, vsSource);
              GLctx.compileShader(this.vertexShader);
  
              var fogHeaderIfNeeded = null;
              if (GLEmulation.fogEnabled) {
                fogHeaderIfNeeded = [
                  '',
                  'varying float v_fogFragCoord; ',
                  'uniform vec4 u_fogColor;      ',
                  'uniform float u_fogEnd;       ',
                  'uniform float u_fogScale;     ',
                  'uniform float u_fogDensity;   ',
                  'float ffog(in float ecDistance) { ',
                  fogFormula,
                  '  fog = clamp(fog, 0.0, 1.0); ',
                  '  return fog;                 ',
                  '}',
                  '',
                ].join('\n');
              }
  
              var fogPass = null;
              if (GLEmulation.fogEnabled) {
                fogPass = 'gl_FragColor = vec4(mix(u_fogColor.rgb, gl_FragColor.rgb, ffog(v_fogFragCoord)), gl_FragColor.a);\n';
              }
  
              var fsAlphaTestDefs = '';
              var fsAlphaTestPass = '';
              if (GLEmulation.alphaTestEnabled) {
                fsAlphaTestDefs = 'uniform float u_alphaTestRef;';
                switch (GLEmulation.alphaTestFunc) {
                  case 0x200: // GL_NEVER
                    fsAlphaTestPass = 'discard;';
                    break;
                  case 0x201: // GL_LESS
                    fsAlphaTestPass = 'if (!(gl_FragColor.a < u_alphaTestRef)) { discard; }';
                    break;
                  case 0x202: // GL_EQUAL
                    fsAlphaTestPass = 'if (!(gl_FragColor.a == u_alphaTestRef)) { discard; }';
                    break;
                  case 0x203: // GL_LEQUAL
                    fsAlphaTestPass = 'if (!(gl_FragColor.a <= u_alphaTestRef)) { discard; }';
                    break;
                  case 0x204: // GL_GREATER
                    fsAlphaTestPass = 'if (!(gl_FragColor.a > u_alphaTestRef)) { discard; }';
                    break;
                  case 0x205: // GL_NOTEQUAL
                    fsAlphaTestPass = 'if (!(gl_FragColor.a != u_alphaTestRef)) { discard; }';
                    break;
                  case 0x206: // GL_GEQUAL
                    fsAlphaTestPass = 'if (!(gl_FragColor.a >= u_alphaTestRef)) { discard; }';
                    break;
                  case 0x207: // GL_ALWAYS
                    fsAlphaTestPass = '';
                    break;
                }
              }
  
              var fsSource = [
                'precision mediump float;',
                texUnitVaryingList,
                texUnitUniformList,
                'varying vec4 v_color;',
                fogHeaderIfNeeded,
                fsClipPlaneDefs,
                fsAlphaTestDefs,
                'void main()',
                '{',
                fsClipPlanePass,
                fsTexEnvPass,
                fogPass,
                fsAlphaTestPass,
                '}',
                ''
              ].join('\n').replace(/\n\n+/g, '\n');
  
              this.fragmentShader = GLctx.createShader(GLctx.FRAGMENT_SHADER);
              GLctx.shaderSource(this.fragmentShader, fsSource);
              GLctx.compileShader(this.fragmentShader);
  
              this.program = GLctx.createProgram();
              GLctx.attachShader(this.program, this.vertexShader);
              GLctx.attachShader(this.program, this.fragmentShader);
  
              // As optimization, bind all attributes to prespecified locations, so that the FFP emulation
              // code can submit attributes to any generated FFP shader without having to examine each shader in turn.
              // These prespecified locations are only assumed if GL_FFP_ONLY is specified, since user could also create their
              // own shaders that didn't have attributes in the same locations.
              GLctx.bindAttribLocation(this.program, GLImmediate.VERTEX, 'a_position');
              GLctx.bindAttribLocation(this.program, GLImmediate.COLOR, 'a_color');
              GLctx.bindAttribLocation(this.program, GLImmediate.NORMAL, 'a_normal');
              var maxVertexAttribs = GLctx.getParameter(GLctx.MAX_VERTEX_ATTRIBS);
              for (var i = 0; i < GLImmediate.MAX_TEXTURES && GLImmediate.TEXTURE0 + i < maxVertexAttribs; i++) {
                GLctx.bindAttribLocation(this.program, GLImmediate.TEXTURE0 + i, 'a_texCoord'+i);
                GLctx.bindAttribLocation(this.program, GLImmediate.TEXTURE0 + i, aTexCoordPrefix+i);
              }
              GLctx.linkProgram(this.program);
            }
  
            // Stores an array that remembers which matrix uniforms are up-to-date in this FFP renderer, so they don't need to be resubmitted
            // each time we render with this program.
            this.textureMatrixVersion = [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ];
  
            this.positionLocation = GLctx.getAttribLocation(this.program, 'a_position');
  
            this.texCoordLocations = [];
  
            for (var i = 0; i < GLImmediate.MAX_TEXTURES; i++) {
              if (!GLImmediate.enabledClientAttributes[GLImmediate.TEXTURE0 + i]) {
                this.texCoordLocations[i] = -1;
                continue;
              }
  
              if (useCurrProgram) {
                this.texCoordLocations[i] = GLctx.getAttribLocation(this.program, `a_texCoord${i}`);
              } else {
                this.texCoordLocations[i] = GLctx.getAttribLocation(this.program, aTexCoordPrefix + i);
              }
            }
            this.colorLocation = GLctx.getAttribLocation(this.program, 'a_color');
            if (!useCurrProgram) {
              // Temporarily switch to the program so we can set our sampler uniforms early.
              var prevBoundProg = GLctx.getParameter(GLctx.CURRENT_PROGRAM);
              GLctx.useProgram(this.program);
              {
                for (var i = 0; i < this.usedTexUnitList.length; i++) {
                  var texUnitID = this.usedTexUnitList[i];
                  var texSamplerLoc = GLctx.getUniformLocation(this.program, uTexUnitPrefix + texUnitID);
                  GLctx.uniform1i(texSamplerLoc, texUnitID);
                }
              }
              // The default color attribute value is not the same as the default for all other attribute streams (0,0,0,1) but (1,1,1,1),
              // so explicitly set it right at start.
              GLctx.vertexAttrib4fv(this.colorLocation, [1,1,1,1]);
              GLctx.useProgram(prevBoundProg);
            }
  
            this.textureMatrixLocations = [];
            for (var i = 0; i < GLImmediate.MAX_TEXTURES; i++) {
              this.textureMatrixLocations[i] = GLctx.getUniformLocation(this.program, `u_textureMatrix${i}`);
            }
            this.normalLocation = GLctx.getAttribLocation(this.program, 'a_normal');
  
            this.modelViewLocation = GLctx.getUniformLocation(this.program, 'u_modelView');
            this.projectionLocation = GLctx.getUniformLocation(this.program, 'u_projection');
            this.normalMatrixLocation = GLctx.getUniformLocation(this.program, 'u_normalMatrix');
  
            this.hasTextures = hasTextures;
            this.hasNormal = GLImmediate.enabledClientAttributes[GLImmediate.NORMAL] &&
                             GLImmediate.clientAttributes[GLImmediate.NORMAL].size > 0 &&
                             this.normalLocation >= 0;
            this.hasColor = this.colorLocation >= 0;
  
            this.floatType = GLctx.FLOAT; // minor optimization
  
            this.fogColorLocation = GLctx.getUniformLocation(this.program, 'u_fogColor');
            this.fogEndLocation = GLctx.getUniformLocation(this.program, 'u_fogEnd');
            this.fogScaleLocation = GLctx.getUniformLocation(this.program, 'u_fogScale');
            this.fogDensityLocation = GLctx.getUniformLocation(this.program, 'u_fogDensity');
            this.hasFog = !!(this.fogColorLocation || this.fogEndLocation ||
                             this.fogScaleLocation || this.fogDensityLocation);
  
            this.pointSizeLocation = GLctx.getUniformLocation(this.program, 'u_pointSize');
  
            this.hasClipPlane = false;
            this.clipPlaneEquationLocation = [];
            for (var clipPlaneId = 0; clipPlaneId < GLEmulation.MAX_CLIP_PLANES; clipPlaneId++) {
              this.clipPlaneEquationLocation[clipPlaneId] = GLctx.getUniformLocation(this.program, `u_clipPlaneEquation${clipPlaneId}`);
              this.hasClipPlane = (this.hasClipPlane || this.clipPlaneEquationLocation[clipPlaneId]);
            }
  
            this.hasLighting = GLEmulation.lightingEnabled;
            this.lightModelAmbientLocation = GLctx.getUniformLocation(this.program, 'u_lightModelAmbient');
            this.materialAmbientLocation = GLctx.getUniformLocation(this.program, 'u_materialAmbient');
            this.materialDiffuseLocation = GLctx.getUniformLocation(this.program, 'u_materialDiffuse');
            this.materialSpecularLocation = GLctx.getUniformLocation(this.program, 'u_materialSpecular');
            this.materialShininessLocation = GLctx.getUniformLocation(this.program, 'u_materialShininess');
            this.materialEmissionLocation = GLctx.getUniformLocation(this.program, 'u_materialEmission');
            this.lightAmbientLocation = []
            this.lightDiffuseLocation = []
            this.lightSpecularLocation = []
            this.lightPositionLocation = []
            for (var lightId = 0; lightId < GLEmulation.MAX_LIGHTS; lightId++) {
              this.lightAmbientLocation[lightId] = GLctx.getUniformLocation(this.program, `u_lightAmbient${lightId}`);
              this.lightDiffuseLocation[lightId] = GLctx.getUniformLocation(this.program, `u_lightDiffuse${lightId}`);
              this.lightSpecularLocation[lightId] = GLctx.getUniformLocation(this.program, `u_lightSpecular${lightId}`);
              this.lightPositionLocation[lightId] = GLctx.getUniformLocation(this.program, `u_lightPosition${lightId}`);
            }
  
            this.hasAlphaTest = GLEmulation.alphaTestEnabled;
            this.alphaTestRefLocation = GLctx.getUniformLocation(this.program, 'u_alphaTestRef');
  
          };
  
          this.prepare = function() {
            // Calculate the array buffer
            var arrayBuffer;
            if (!GLctx.currentArrayBufferBinding) {
              var start = GLImmediate.firstVertex*GLImmediate.stride;
              var end = GLImmediate.lastVertex*GLImmediate.stride;
              assert(end <= GL.MAX_TEMP_BUFFER_SIZE, 'too much vertex data');
              arrayBuffer = GL.getTempVertexBuffer(end);
              // TODO: consider using the last buffer we bound, if it was larger. downside is larger buffer, but we might avoid rebinding and preparing
            } else {
              arrayBuffer = GLctx.currentArrayBufferBinding;
            }
  
            // If the array buffer is unchanged and the renderer as well, then we can avoid all the work here
            // XXX We use some heuristics here, and this may not work in all cases. Try disabling GL_UNSAFE_OPTS if you
            // have odd glitches
            var lastRenderer = GLImmediate.lastRenderer;
            var canSkip = this == lastRenderer &&
                          arrayBuffer == GLImmediate.lastArrayBuffer &&
                          (GL.currProgram || this.program) == GLImmediate.lastProgram &&
                          GLImmediate.stride == GLImmediate.lastStride &&
                          !GLImmediate.matricesModified;
            if (!canSkip && lastRenderer) lastRenderer.cleanup();
            if (!GLctx.currentArrayBufferBinding) {
              // Bind the array buffer and upload data after cleaning up the previous renderer
  
              if (arrayBuffer != GLImmediate.lastArrayBuffer) {
                GLctx.bindBuffer(GLctx.ARRAY_BUFFER, arrayBuffer);
                GLImmediate.lastArrayBuffer = arrayBuffer;
              }
  
              webglBufferSubData(GLctx.ARRAY_BUFFER, start, (end - start) >> 2, start >> 2, GLImmediate.vertexData);
            }
            if (canSkip) return;
            GLImmediate.lastRenderer = this;
            GLImmediate.lastProgram = GL.currProgram || this.program;
            GLImmediate.lastStride = GLImmediate.stride;
            GLImmediate.matricesModified = false;
  
            if (!GL.currProgram) {
              if (GLImmediate.fixedFunctionProgram != this.program) {
                GLctx.useProgram(this.program);
                GLImmediate.fixedFunctionProgram = this.program;
              }
            }
  
            if (this.modelViewLocation && this.modelViewMatrixVersion != GLImmediate.matrixVersion[0/*m*/]) {
              this.modelViewMatrixVersion = GLImmediate.matrixVersion[0/*m*/];
              GLctx.uniformMatrix4fv(this.modelViewLocation, false, GLImmediate.matrix[0/*m*/]);
  
              // set normal matrix to the upper 3x3 of the inverse transposed current modelview matrix
              if (GLEmulation.lightEnabled) {
                var tmpMVinv = GLImmediate.matrixLib.mat4.create(GLImmediate.matrix[0]);
                GLImmediate.matrixLib.mat4.inverse(tmpMVinv);
                GLImmediate.matrixLib.mat4.transpose(tmpMVinv);
                GLctx.uniformMatrix3fv(this.normalMatrixLocation, false, GLImmediate.matrixLib.mat4.toMat3(tmpMVinv));
              }
            }
            if (this.projectionLocation && this.projectionMatrixVersion != GLImmediate.matrixVersion[1/*p*/]) {
              this.projectionMatrixVersion = GLImmediate.matrixVersion[1/*p*/];
              GLctx.uniformMatrix4fv(this.projectionLocation, false, GLImmediate.matrix[1/*p*/]);
            }
  
            var clientAttributes = GLImmediate.clientAttributes;
            var posAttr = clientAttributes[GLImmediate.VERTEX];
  
            if (!GLctx.currentArrayBufferBinding) {
              GLctx.vertexAttribPointer(GLImmediate.VERTEX, posAttr.size, posAttr.type, false, GLImmediate.stride, posAttr.offset);
              if (this.hasNormal) {
                var normalAttr = clientAttributes[GLImmediate.NORMAL];
                GLctx.vertexAttribPointer(GLImmediate.NORMAL, normalAttr.size, normalAttr.type, true, GLImmediate.stride, normalAttr.offset);
              }
            }
            if (this.hasTextures) {
              for (var i = 0; i < GLImmediate.MAX_TEXTURES; i++) {
                if (!GLctx.currentArrayBufferBinding) {
                  var attribLoc = GLImmediate.TEXTURE0+i;
                  if (!GLImmediate._muMaxAttrib) GLImmediate._muMaxAttrib = GLctx.getParameter(GLctx.MAX_VERTEX_ATTRIBS);
                  if (attribLoc < GLImmediate._muMaxAttrib) {
                  var texAttr = clientAttributes[attribLoc];
                  if (texAttr.size) {
                    GLctx.vertexAttribPointer(attribLoc, texAttr.size, texAttr.type, false, GLImmediate.stride, texAttr.offset);
                  } else {
                    // These two might be dangerous, but let's try them.
                    GLctx.vertexAttrib4f(attribLoc, 0, 0, 0, 1);
                  }
                  }
                }
                var t = 2/*t*/+i;
                if (this.textureMatrixLocations[i] && this.textureMatrixVersion[t] != GLImmediate.matrixVersion[t]) { // XXX might we need this even without the condition we are currently in?
                  this.textureMatrixVersion[t] = GLImmediate.matrixVersion[t];
                  GLctx.uniformMatrix4fv(this.textureMatrixLocations[i], false, GLImmediate.matrix[t]);
                }
              }
            }
            if (GLImmediate.enabledClientAttributes[GLImmediate.COLOR]) {
              var colorAttr = clientAttributes[GLImmediate.COLOR];
              if (!GLctx.currentArrayBufferBinding) {
                GLctx.vertexAttribPointer(GLImmediate.COLOR, colorAttr.size, colorAttr.type, true, GLImmediate.stride, colorAttr.offset);
              }
            } else if (GLImmediate.clientColor) {
              GLctx.disableVertexAttribArray(GLImmediate.COLOR);
              GLctx.vertexAttrib4fv(GLImmediate.COLOR, GLImmediate.clientColor);
            }
            if (this.hasFog) {
              if (this.fogColorLocation) GLctx.uniform4fv(this.fogColorLocation, GLEmulation.fogColor);
              if (this.fogEndLocation) GLctx.uniform1f(this.fogEndLocation, GLEmulation.fogEnd);
              if (this.fogScaleLocation) GLctx.uniform1f(this.fogScaleLocation, 1/(GLEmulation.fogEnd - GLEmulation.fogStart));
              if (this.fogDensityLocation) GLctx.uniform1f(this.fogDensityLocation, GLEmulation.fogDensity);
            }
  
            if (this.hasClipPlane) {
              for (var clipPlaneId = 0; clipPlaneId < GLEmulation.MAX_CLIP_PLANES; clipPlaneId++) {
                if (this.clipPlaneEquationLocation[clipPlaneId]) GLctx.uniform4fv(this.clipPlaneEquationLocation[clipPlaneId], GLEmulation.clipPlaneEquation[clipPlaneId]);
              }
            }
  
            if (this.hasLighting) {
              if (this.lightModelAmbientLocation) GLctx.uniform4fv(this.lightModelAmbientLocation, GLEmulation.lightModelAmbient);
              if (this.materialAmbientLocation) GLctx.uniform4fv(this.materialAmbientLocation, GLEmulation.materialAmbient);
              if (this.materialDiffuseLocation) GLctx.uniform4fv(this.materialDiffuseLocation, GLEmulation.materialDiffuse);
              if (this.materialSpecularLocation) GLctx.uniform4fv(this.materialSpecularLocation, GLEmulation.materialSpecular);
              if (this.materialShininessLocation) GLctx.uniform1f(this.materialShininessLocation, GLEmulation.materialShininess[0]);
              if (this.materialEmissionLocation) GLctx.uniform4fv(this.materialEmissionLocation, GLEmulation.materialEmission);
              for (var lightId = 0; lightId < GLEmulation.MAX_LIGHTS; lightId++) {
                if (this.lightAmbientLocation[lightId]) GLctx.uniform4fv(this.lightAmbientLocation[lightId], GLEmulation.lightAmbient[lightId]);
                if (this.lightDiffuseLocation[lightId]) GLctx.uniform4fv(this.lightDiffuseLocation[lightId], GLEmulation.lightDiffuse[lightId]);
                if (this.lightSpecularLocation[lightId]) GLctx.uniform4fv(this.lightSpecularLocation[lightId], GLEmulation.lightSpecular[lightId]);
                if (this.lightPositionLocation[lightId]) GLctx.uniform4fv(this.lightPositionLocation[lightId], GLEmulation.lightPosition[lightId]);
              }
            }
  
            if (this.hasAlphaTest) {
              if (this.alphaTestRefLocation) GLctx.uniform1f(this.alphaTestRefLocation, GLEmulation.alphaTestRef);
            }
  
            if (GLImmediate.mode == GLctx.POINTS) {
              if (this.pointSizeLocation) {
                GLctx.uniform1f(this.pointSizeLocation, GLEmulation.pointSize);
              }
            }
          };
  
          this.cleanup = function() {
          }
  
          this.init();
        }
        return new Renderer();
      },
  setupFuncs() {
        // TexEnv stuff needs to be prepared early, so do it here.
        // init() is too late for -O2, since it freezes the GL functions
        // by that point.
        GLImmediate.MapTreeLib = GLImmediate.spawnMapTreeLib();
        GLImmediate.spawnMapTreeLib = null;
  
        GLImmediate.TexEnvJIT = GLImmediate.spawnTexEnvJIT();
        GLImmediate.spawnTexEnvJIT = null;
  
        GLImmediate.setupHooks();
      },
  setupHooks() {
        if (!GLEmulation.hasRunInit) {
          GLEmulation.init();
        }
  
        var glActiveTexture = _glActiveTexture;
        _glActiveTexture = _emscripten_glActiveTexture = (texture) => {
          GLImmediate.TexEnvJIT.hook_activeTexture(texture);
          glActiveTexture(texture);
        };
  
        var glEnable = _glEnable;
        _glEnable = _emscripten_glEnable = (cap) => {
          GLImmediate.TexEnvJIT.hook_enable(cap);
          glEnable(cap);
        };
  
        var glDisable = _glDisable;
        _glDisable = _emscripten_glDisable = (cap) => {
          GLImmediate.TexEnvJIT.hook_disable(cap);
          glDisable(cap);
        };
  
        var glTexEnvf = (typeof _glTexEnvf != 'undefined') ? _glTexEnvf : () => {};
        /** @suppress {checkTypes} */
        _glTexEnvf = _emscripten_glTexEnvf = (target, pname, param) => {
          GLImmediate.TexEnvJIT.hook_texEnvf(target, pname, param);
          // Don't call old func, since we are the implementor.
          //glTexEnvf(target, pname, param);
        };
  
        var glTexEnvi = (typeof _glTexEnvi != 'undefined') ? _glTexEnvi : () => {};
        /** @suppress {checkTypes} */
        _glTexEnvi = _emscripten_glTexEnvi = (target, pname, param) => {
          
          GLImmediate.TexEnvJIT.hook_texEnvi(target, pname, param);
          // Don't call old func, since we are the implementor.
          //glTexEnvi(target, pname, param);
        };
  
        var glTexEnvfv = (typeof _glTexEnvfv != 'undefined') ? _glTexEnvfv : () => {};
        /** @suppress {checkTypes} */
        _glTexEnvfv = _emscripten_glTexEnvfv = (target, pname, param) => {
          
          GLImmediate.TexEnvJIT.hook_texEnvfv(target, pname, param);
          // Don't call old func, since we are the implementor.
          //glTexEnvfv(target, pname, param);
        };
  
        _glGetTexEnviv = (target, pname, param) => {
          
          GLImmediate.TexEnvJIT.hook_getTexEnviv(target, pname, param);
        };
  
        _glGetTexEnvfv = (target, pname, param) => {
          
          GLImmediate.TexEnvJIT.hook_getTexEnvfv(target, pname, param);
        };
  
        var glGetIntegerv = _glGetIntegerv;
        _glGetIntegerv = _emscripten_glGetIntegerv = (pname, params) => {
          switch (pname) {
            case 0x8B8D: { // GL_CURRENT_PROGRAM
              // Just query directly so we're working with WebGL objects.
              var cur = GLctx.getParameter(GLctx.CURRENT_PROGRAM);
              if (cur == GLImmediate.fixedFunctionProgram) {
                // Pretend we're not using a program.
                HEAP32[((params)>>2)] = 0;
                return;
              }
              break;
            }
          }
          glGetIntegerv(pname, params);
        };
      },
  init() {
        err('WARNING: using emscripten GL immediate mode emulation. This is very limited in what it supports');
  
        if (!Browser.useWebGL) return; // a 2D canvas may be currently used TODO: make sure we are actually called in that case
  
        // User can override the maximum number of texture units that we emulate. Using fewer texture units increases runtime performance
        // slightly, so it is advantageous to choose as small value as needed.
        // Limit to a maximum of 28 to not overflow the state bits used for renderer caching (31 bits = 3 attributes + 28 texture units).
        var maxTextureUnits = GLctx.getParameter(GLctx.MAX_TEXTURE_IMAGE_UNITS);
        GLImmediate.MAX_TEXTURES = Math.min(maxTextureUnits, 4);
  
        GLImmediate.TexEnvJIT.init(GLctx, GLImmediate.MAX_TEXTURES);
  
        GLImmediate.NUM_ATTRIBUTES = 3 /*pos+normal+color attributes*/ + GLImmediate.MAX_TEXTURES;
        GLImmediate.clientAttributes = [];
        GLEmulation.enabledClientAttribIndices = [];
        for (var i = 0; i < GLImmediate.NUM_ATTRIBUTES; i++) {
          GLImmediate.clientAttributes.push({});
          GLEmulation.enabledClientAttribIndices.push(false);
        }
  
        // Initialize matrix library
        // When user sets a matrix, increment a 'version number' on the new data, and when rendering, submit
        // the matrices to the shader program only if they have an old version of the data.
        GLImmediate.matrix = [];
        GLImmediate.matrixStack = [];
        GLImmediate.matrixVersion = [];
        for (var i = 0; i < 2 + GLImmediate.MAX_TEXTURES; i++) { // Modelview, Projection, plus one matrix for each texture coordinate.
          GLImmediate.matrixStack.push([]);
          GLImmediate.matrixVersion.push(0);
          GLImmediate.matrix.push(GLImmediate.matrixLib.mat4.create());
          GLImmediate.matrixLib.mat4.identity(GLImmediate.matrix[i]);
        }
  
        // Renderer cache
        GLImmediate.rendererCache = GLImmediate.MapTreeLib.create();
  
        // Buffers for data
        GLImmediate.tempData = new Float32Array(GL.MAX_TEMP_BUFFER_SIZE >> 2);
  
        GLImmediate.vertexDataU8 = new Uint8Array(GLImmediate.tempData.buffer);
  
        GL.generateTempBuffers(true, GL.currentContext);
  
        GLImmediate.clientColor = new Float32Array([1, 1, 1, 1]);
      },
  prepareClientAttributes(count, beginEnd) {
        // If no client attributes were modified since we were last called, do
        // nothing. Note that this does not work for glBegin/End, where we
        // generate renderer components dynamically and then disable them
        // ourselves, but it does help with glDrawElements/Arrays.
        if (!GLImmediate.modifiedClientAttributes) {
          GLImmediate.vertexCounter = (GLImmediate.stride * count) / 4; // XXX assuming float
          return;
        }
        GLImmediate.modifiedClientAttributes = false;
  
        // The role of prepareClientAttributes is to examine the set of
        // client-side vertex attribute buffers that user code has submitted, and
        // to prepare them to be uploaded to a VBO in GPU memory (since WebGL does
        // not support client-side rendering, i.e. rendering from vertex data in
        // CPU memory). User can submit vertex data generally in three different
        // configurations:
        // 1. Fully planar: all attributes are in their own separate
        //                  tightly-packed arrays in CPU memory.
        // 2. Fully interleaved: all attributes share a single array where data is
        //                       interleaved something like (pos,uv,normal),
        //                       (pos,uv,normal), ...
        // 3. Complex hybrid: Multiple separate arrays that either are sparsely
        //                    strided, and/or partially interleaves vertex
        //                    attributes.
  
        // For simplicity, we support the case (2) as the fast case. For (1) and
        // (3), we do a memory copy of the vertex data here to prepare a
        // relayouted buffer that is of the structure in case (2). The reason
        // for this is that it allows the emulation code to get away with using
        // just one VBO buffer for rendering, and not have to maintain multiple
        // ones. Therefore cases (1) and (3) will be very slow, and case (2) is
        // fast.
  
        // Detect which case we are in by using a quick heuristic by examining the
        // strides of the buffers. If all the buffers have identical stride, we
        // assume we have case (2), otherwise we have something more complex.
        var clientStartPointer = 0xFFFFFFFF;
        var bytes = 0; // Total number of bytes taken up by a single vertex.
        var minStride = 0xFFFFFFFF;
        var maxStride = 0;
        var attributes = GLImmediate.liveClientAttributes;
        attributes.length = 0;
        for (var i = 0; i < 3+GLImmediate.MAX_TEXTURES; i++) {
          if (GLImmediate.enabledClientAttributes[i]) {
            var attr = GLImmediate.clientAttributes[i];
            attributes.push(attr);
            clientStartPointer = Math.min(clientStartPointer, attr.pointer);
            attr.sizeBytes = attr.size * GL.byteSizeByType[attr.type - GL.byteSizeByTypeRoot];
            bytes += attr.sizeBytes;
            minStride = Math.min(minStride, attr.stride);
            maxStride = Math.max(maxStride, attr.stride);
          }
        }
  
        if ((minStride != maxStride || maxStride < bytes) && !beginEnd) {
          // We are in cases (1) or (3): slow path, shuffle the data around into a
          // single interleaved vertex buffer.
          // The immediate-mode glBegin()/glEnd() vertex submission gets
          // automatically generated in appropriate layout, so never need to come
          // down this path if that was used.
          GLImmediate.restrideBuffer ||= _malloc(GL.MAX_TEMP_BUFFER_SIZE);
          var start = GLImmediate.restrideBuffer;
          bytes = 0;
          // calculate restrided offsets and total size
          for (var attr of attributes) {
            var size = attr.sizeBytes;
            if (size % 4 != 0) size += 4 - (size % 4); // align everything
            attr.offset = bytes;
            bytes += size;
          }
          // copy out the data (we need to know the stride for that, and define attr.pointer)
          for (var attr of attributes) {
            var srcStride = Math.max(attr.sizeBytes, attr.stride);
            if ((srcStride & 3) == 0 && (attr.sizeBytes & 3) == 0) {
              for (var j = 0; j < count; j++) {
                for (var k = 0; k < attr.sizeBytes; k+=4) { // copy in chunks of 4 bytes, our alignment makes this possible
                  var val = HEAP32[(((attr.pointer)+(j*srcStride + k))>>2)];
                  HEAP32[(((start + attr.offset)+(bytes*j + k))>>2)] = val;
                }
              }
            } else {
              for (var j = 0; j < count; j++) {
                for (var k = 0; k < attr.sizeBytes; k++) { // source data was not aligned to multiples of 4, must copy byte by byte.
                  HEAP8[start + attr.offset + bytes*j + k] = HEAP8[attr.pointer + j*srcStride + k];
                }
              }
            }
            attr.pointer = start + attr.offset;
          }
          GLImmediate.stride = bytes;
          GLImmediate.vertexPointer = start;
        } else {
          // case (2): fast path, all data is interleaved to a single vertex array so we can get away with a single VBO upload.
          if (GLctx.currentArrayBufferBinding) {
            GLImmediate.vertexPointer = 0;
          } else {
            GLImmediate.vertexPointer = clientStartPointer;
          }
          for (var attr of attributes) {
            attr.offset = attr.pointer - GLImmediate.vertexPointer; // Compute what will be the offset of this attribute in the VBO after we upload.
          }
          GLImmediate.stride = Math.max(maxStride, bytes);
        }
        if (!beginEnd) {
          GLImmediate.vertexCounter = (GLImmediate.stride * count) / 4; // XXX assuming float
        }
      },
  flush(numProvidedIndexes, startIndex = 0, ptr = 0) {
        assert(numProvidedIndexes >= 0 || !numProvidedIndexes);
        var renderer = GLImmediate.getRenderer();
  
        // Generate index data in a format suitable for GLES 2.0/WebGL
        var numVertices = 4 * GLImmediate.vertexCounter / GLImmediate.stride;
        if (!numVertices) return;
        assert(numVertices % 1 == 0, '`numVertices` must be an integer.');
        var emulatedElementArrayBuffer = false;
        var numIndexes = 0;
        if (numProvidedIndexes) {
          numIndexes = numProvidedIndexes;
          if (!GLctx.currentArrayBufferBinding && GLImmediate.firstVertex > GLImmediate.lastVertex) {
            // Figure out the first and last vertex from the index data
            // If we are going to upload array buffer data, we need to find which range to
            // upload based on the indices. If they are in a buffer on the GPU, that is very
            // inconvenient! So if you do not have an array buffer, you should also not have
            // an element array buffer. But best is to use both buffers!
            assert(!GLctx.currentElementArrayBufferBinding, 'must use array buffers when using element buffer');
            for (var i = 0; i < numProvidedIndexes; i++) {
              var currIndex = HEAPU16[(((ptr)+(i*2))>>1)];
              GLImmediate.firstVertex = Math.min(GLImmediate.firstVertex, currIndex);
              GLImmediate.lastVertex = Math.max(GLImmediate.lastVertex, currIndex+1);
            }
          }
          if (!GLctx.currentElementArrayBufferBinding) {
            // If no element array buffer is bound, then indices is a literal pointer to clientside data
            var byteSize = numProvidedIndexes << 1;
            assert(byteSize <= GL.MAX_TEMP_BUFFER_SIZE, 'too many immediate mode indexes (a)');
            var indexBuffer = GL.getTempIndexBuffer(byteSize);
            GLctx.bindBuffer(GLctx.ELEMENT_ARRAY_BUFFER, indexBuffer);
            webglBufferSubData(GLctx.ELEMENT_ARRAY_BUFFER, 0, byteSize, ptr);
            ptr = 0;
            emulatedElementArrayBuffer = true;
          }
        } else if (GLImmediate.mode > 6) { // above GL_TRIANGLE_FAN are the non-GL ES modes
          if (GLImmediate.mode != 7) abort('unsupported immediate mode ' + GLImmediate.mode); // GL_QUADS
          // GLImmediate.firstVertex is the first vertex we want. Quad indexes are
          // in the pattern 0 1 2, 0 2 3, 4 5 6, 4 6 7, so we need to look at
          // index firstVertex * 1.5 to see it.  Then since indexes are 2 bytes
          // each, that means 3
          assert(GLImmediate.firstVertex % 4 == 0);
          ptr = GLImmediate.firstVertex * 3;
          var numQuads = numVertices / 4;
          numIndexes = numQuads * 6; // 0 1 2, 0 2 3 pattern
          assert(ptr + (numIndexes << 1) <= GL.MAX_TEMP_BUFFER_SIZE, 'too many immediate mode indexes (b)');
          GLctx.bindBuffer(GLctx.ELEMENT_ARRAY_BUFFER, GL.currentContext.tempQuadIndexBuffer);
          emulatedElementArrayBuffer = true;
          GLImmediate.mode = GLctx.TRIANGLES;
        }
  
        renderer.prepare();
  
        if (numIndexes) {
          GLctx.drawElements(GLImmediate.mode, numIndexes, GLctx.UNSIGNED_SHORT, ptr);
        } else {
          GLctx.drawArrays(GLImmediate.mode, startIndex, numVertices);
        }
  
        if (emulatedElementArrayBuffer) {
          GLctx.bindBuffer(GLctx.ELEMENT_ARRAY_BUFFER, GL.buffers[GLctx.currentElementArrayBufferBinding] || null);
        }
  
      },
  };
  GLImmediate.matrixLib = (() => {
  
  /**
 * @fileoverview gl-matrix - High performance matrix and vector operations for WebGL
 * @author Brandon Jones
 * @version 1.2.4
 */
  
  // Modified for emscripten:
  // - Global scoping etc.
  // - Disabled some non-closure-compatible javadoc comments.
  
  /*
 * Copyright (c) 2011 Brandon Jones
 *
 * This software is provided 'as-is', without any express or implied
 * warranty. In no event will the authors be held liable for any damages
 * arising from the use of this software.
 *
 * Permission is granted to anyone to use this software for any purpose,
 * including commercial applications, and to alter it and redistribute it
 * freely, subject to the following restrictions:
 *
 *    1. The origin of this software must not be misrepresented; you must not
 *    claim that you wrote the original software. If you use this software
 *    in a product, an acknowledgment in the product documentation would be
 *    appreciated but is not required.
 *
 *    2. Altered source versions must be plainly marked as such, and must not
 *    be misrepresented as being the original software.
 *
 *    3. This notice may not be removed or altered from any source
 *    distribution.
 */
  
  
  /**
 * @class 3 Dimensional Vector
 * @name vec3
 */
  var vec3 = {};
  
  /**
 * @class 3x3 Matrix
 * @name mat3
 */
  var mat3 = {};
  
  /**
 * @class 4x4 Matrix
 * @name mat4
 */
  var mat4 = {};
  
  /**
 * @class Quaternion
 * @name quat4
 */
  var quat4 = {};
  
  var MatrixArray = Float32Array;
  
  /*
 * vec3
 */
  
  /**
 * Creates a new instance of a vec3 using the default array type
 * Any javascript array-like objects containing at least 3 numeric elements can serve as a vec3
 *
 * _param {vec3} [vec] vec3 containing values to initialize with
 *
 * _returns {vec3} New vec3
 */
  vec3.create = function (vec) {
      var dest = new MatrixArray(3);
  
      if (vec) {
          dest[0] = vec[0];
          dest[1] = vec[1];
          dest[2] = vec[2];
      } else {
          dest[0] = dest[1] = dest[2] = 0;
      }
  
      return dest;
  };
  
  /**
 * Copies the values of one vec3 to another
 *
 * _param {vec3} vec vec3 containing values to copy
 * _param {vec3} dest vec3 receiving copied values
 *
 * _returns {vec3} dest
 */
  vec3.set = function (vec, dest) {
      dest[0] = vec[0];
      dest[1] = vec[1];
      dest[2] = vec[2];
  
      return dest;
  };
  
  /**
 * Performs a vector addition
 *
 * _param {vec3} vec First operand
 * _param {vec3} vec2 Second operand
 * _param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
 *
 * _returns {vec3} dest if specified, vec otherwise
 */
  vec3.add = function (vec, vec2, dest) {
      if (!dest || vec === dest) {
          vec[0] += vec2[0];
          vec[1] += vec2[1];
          vec[2] += vec2[2];
          return vec;
      }
  
      dest[0] = vec[0] + vec2[0];
      dest[1] = vec[1] + vec2[1];
      dest[2] = vec[2] + vec2[2];
      return dest;
  };
  
  /**
 * Performs a vector subtraction
 *
 * _param {vec3} vec First operand
 * _param {vec3} vec2 Second operand
 * _param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
 *
 * _returns {vec3} dest if specified, vec otherwise
 */
  vec3.subtract = function (vec, vec2, dest) {
      if (!dest || vec === dest) {
          vec[0] -= vec2[0];
          vec[1] -= vec2[1];
          vec[2] -= vec2[2];
          return vec;
      }
  
      dest[0] = vec[0] - vec2[0];
      dest[1] = vec[1] - vec2[1];
      dest[2] = vec[2] - vec2[2];
      return dest;
  };
  
  /**
 * Performs a vector multiplication
 *
 * _param {vec3} vec First operand
 * _param {vec3} vec2 Second operand
 * _param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
 *
 * _returns {vec3} dest if specified, vec otherwise
 */
  vec3.multiply = function (vec, vec2, dest) {
      if (!dest || vec === dest) {
          vec[0] *= vec2[0];
          vec[1] *= vec2[1];
          vec[2] *= vec2[2];
          return vec;
      }
  
      dest[0] = vec[0] * vec2[0];
      dest[1] = vec[1] * vec2[1];
      dest[2] = vec[2] * vec2[2];
      return dest;
  };
  
  /**
 * Negates the components of a vec3
 *
 * _param {vec3} vec vec3 to negate
 * _param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
 *
 * _returns {vec3} dest if specified, vec otherwise
 */
  vec3.negate = function (vec, dest) {
      if (!dest) { dest = vec; }
  
      dest[0] = -vec[0];
      dest[1] = -vec[1];
      dest[2] = -vec[2];
      return dest;
  };
  
  /**
 * Multiplies the components of a vec3 by a scalar value
 *
 * _param {vec3} vec vec3 to scale
 * _param {number} val Value to scale by
 * _param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
 *
 * _returns {vec3} dest if specified, vec otherwise
 */
  vec3.scale = function (vec, val, dest) {
      if (!dest || vec === dest) {
          vec[0] *= val;
          vec[1] *= val;
          vec[2] *= val;
          return vec;
      }
  
      dest[0] = vec[0] * val;
      dest[1] = vec[1] * val;
      dest[2] = vec[2] * val;
      return dest;
  };
  
  /**
 * Generates a unit vector of the same direction as the provided vec3
 * If vector length is 0, returns [0, 0, 0]
 *
 * _param {vec3} vec vec3 to normalize
 * _param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
 *
 * _returns {vec3} dest if specified, vec otherwise
 */
  vec3.normalize = function (vec, dest) {
      if (!dest) { dest = vec; }
  
      var x = vec[0], y = vec[1], z = vec[2],
          len = Math.sqrt(x * x + y * y + z * z);
  
      if (!len) {
          dest[0] = 0;
          dest[1] = 0;
          dest[2] = 0;
          return dest;
      } else if (len === 1) {
          dest[0] = x;
          dest[1] = y;
          dest[2] = z;
          return dest;
      }
  
      len = 1 / len;
      dest[0] = x * len;
      dest[1] = y * len;
      dest[2] = z * len;
      return dest;
  };
  
  /**
 * Generates the cross product of two vec3s
 *
 * _param {vec3} vec First operand
 * _param {vec3} vec2 Second operand
 * _param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
 *
 * _returns {vec3} dest if specified, vec otherwise
 */
  vec3.cross = function (vec, vec2, dest) {
      if (!dest) { dest = vec; }
  
      var x = vec[0], y = vec[1], z = vec[2],
          x2 = vec2[0], y2 = vec2[1], z2 = vec2[2];
  
      dest[0] = y * z2 - z * y2;
      dest[1] = z * x2 - x * z2;
      dest[2] = x * y2 - y * x2;
      return dest;
  };
  
  /**
 * Calculates the length of a vec3
 *
 * _param {vec3} vec vec3 to calculate length of
 *
 * _returns {number} Length of vec
 */
  vec3.length = function (vec) {
      var x = vec[0], y = vec[1], z = vec[2];
      return Math.sqrt(x * x + y * y + z * z);
  };
  
  /**
 * Calculates the dot product of two vec3s
 *
 * _param {vec3} vec First operand
 * _param {vec3} vec2 Second operand
 *
 * _returns {number} Dot product of vec and vec2
 */
  vec3.dot = function (vec, vec2) {
      return vec[0] * vec2[0] + vec[1] * vec2[1] + vec[2] * vec2[2];
  };
  
  /**
 * Generates a unit vector pointing from one vector to another
 *
 * _param {vec3} vec Origin vec3
 * _param {vec3} vec2 vec3 to point to
 * _param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
 *
 * _returns {vec3} dest if specified, vec otherwise
 */
  vec3.direction = function (vec, vec2, dest) {
      if (!dest) { dest = vec; }
  
      var x = vec[0] - vec2[0],
          y = vec[1] - vec2[1],
          z = vec[2] - vec2[2],
          len = Math.sqrt(x * x + y * y + z * z);
  
      if (!len) {
          dest[0] = 0;
          dest[1] = 0;
          dest[2] = 0;
          return dest;
      }
  
      len = 1 / len;
      dest[0] = x * len;
      dest[1] = y * len;
      dest[2] = z * len;
      return dest;
  };
  
  /**
 * Performs a linear interpolation between two vec3
 *
 * _param {vec3} vec First vector
 * _param {vec3} vec2 Second vector
 * _param {number} lerp Interpolation amount between the two inputs
 * _param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
 *
 * _returns {vec3} dest if specified, vec otherwise
 */
  vec3.lerp = function (vec, vec2, lerp, dest) {
      if (!dest) { dest = vec; }
  
      dest[0] = vec[0] + lerp * (vec2[0] - vec[0]);
      dest[1] = vec[1] + lerp * (vec2[1] - vec[1]);
      dest[2] = vec[2] + lerp * (vec2[2] - vec[2]);
  
      return dest;
  };
  
  /**
 * Calculates the euclidean distance between two vec3
 *
 * Params:
 * _param {vec3} vec First vector
 * _param {vec3} vec2 Second vector
 *
 * _returns {number} Distance between vec and vec2
 */
  vec3.dist = function (vec, vec2) {
      var x = vec2[0] - vec[0],
          y = vec2[1] - vec[1],
          z = vec2[2] - vec[2];
  
      return Math.sqrt(x*x + y*y + z*z);
  };
  
  /**
 * Projects the specified vec3 from screen space into object space
 * Based on the <a href="http://webcvs.freedesktop.org/mesa/Mesa/src/glu/mesa/project.c?revision=1.4&view=markup">Mesa gluUnProject implementation</a>
 *
 * _param {vec3} vec Screen-space vector to project
 * _param {mat4} view View matrix
 * _param {mat4} proj Projection matrix
 * _param {vec4} viewport Viewport as given to gl.viewport [x, y, width, height]
 * _param {vec3} [dest] vec3 receiving unprojected result. If not specified result is written to vec
 *
 * _returns {vec3} dest if specified, vec otherwise
 */
  vec3.unproject = function (vec, view, proj, viewport, dest) {
      if (!dest) { dest = vec; }
  
      var m = mat4.create();
      var v = new MatrixArray(4);
  
      v[0] = (vec[0] - viewport[0]) * 2.0 / viewport[2] - 1.0;
      v[1] = (vec[1] - viewport[1]) * 2.0 / viewport[3] - 1.0;
      v[2] = 2.0 * vec[2] - 1.0;
      v[3] = 1.0;
  
      mat4.multiply(proj, view, m);
      if(!mat4.inverse(m)) { return null; }
  
      mat4.multiplyVec4(m, v);
      if(v[3] === 0.0) { return null; }
  
      dest[0] = v[0] / v[3];
      dest[1] = v[1] / v[3];
      dest[2] = v[2] / v[3];
  
      return dest;
  };
  
  /**
 * Returns a string representation of a vector
 *
 * _param {vec3} vec Vector to represent as a string
 *
 * _returns {string} String representation of vec
 */
  vec3.str = function (vec) {
      return '[' + vec[0] + ', ' + vec[1] + ', ' + vec[2] + ']';
  };
  
  /*
 * mat3
 */
  
  /**
 * Creates a new instance of a mat3 using the default array type
 * Any javascript array-like object containing at least 9 numeric elements can serve as a mat3
 *
 * _param {mat3} [mat] mat3 containing values to initialize with
 *
 * _returns {mat3} New mat3
 *
 * @param {Object=} mat
 */
  mat3.create = function (mat) {
      var dest = new MatrixArray(9);
  
      if (mat) {
          dest[0] = mat[0];
          dest[1] = mat[1];
          dest[2] = mat[2];
          dest[3] = mat[3];
          dest[4] = mat[4];
          dest[5] = mat[5];
          dest[6] = mat[6];
          dest[7] = mat[7];
          dest[8] = mat[8];
      }
  
      return dest;
  };
  
  /**
 * Copies the values of one mat3 to another
 *
 * _param {mat3} mat mat3 containing values to copy
 * _param {mat3} dest mat3 receiving copied values
 *
 * _returns {mat3} dest
 */
  mat3.set = function (mat, dest) {
      dest[0] = mat[0];
      dest[1] = mat[1];
      dest[2] = mat[2];
      dest[3] = mat[3];
      dest[4] = mat[4];
      dest[5] = mat[5];
      dest[6] = mat[6];
      dest[7] = mat[7];
      dest[8] = mat[8];
      return dest;
  };
  
  /**
 * Sets a mat3 to an identity matrix
 *
 * _param {mat3} dest mat3 to set
 *
 * _returns dest if specified, otherwise a new mat3
 */
  mat3.identity = function (dest) {
      if (!dest) { dest = mat3.create(); }
      dest[0] = 1;
      dest[1] = 0;
      dest[2] = 0;
      dest[3] = 0;
      dest[4] = 1;
      dest[5] = 0;
      dest[6] = 0;
      dest[7] = 0;
      dest[8] = 1;
      return dest;
  };
  
  /**
 * Transposes a mat3 (flips the values over the diagonal)
 *
 * Params:
 * _param {mat3} mat mat3 to transpose
 * _param {mat3} [dest] mat3 receiving transposed values. If not specified result is written to mat
 */
  mat3.transpose = function (mat, dest) {
      // If we are transposing ourselves we can skip a few steps but have to cache some values
      if (!dest || mat === dest) {
          var a01 = mat[1], a02 = mat[2],
              a12 = mat[5];
  
          mat[1] = mat[3];
          mat[2] = mat[6];
          mat[3] = a01;
          mat[5] = mat[7];
          mat[6] = a02;
          mat[7] = a12;
          return mat;
      }
  
      dest[0] = mat[0];
      dest[1] = mat[3];
      dest[2] = mat[6];
      dest[3] = mat[1];
      dest[4] = mat[4];
      dest[5] = mat[7];
      dest[6] = mat[2];
      dest[7] = mat[5];
      dest[8] = mat[8];
      return dest;
  };
  
  /**
 * Copies the elements of a mat3 into the upper 3x3 elements of a mat4
 *
 * _param {mat3} mat mat3 containing values to copy
 * _param {mat4} [dest] mat4 receiving copied values
 *
 * _returns {mat4} dest if specified, a new mat4 otherwise
 */
  mat3.toMat4 = function (mat, dest) {
      if (!dest) { dest = mat4.create(); }
  
      dest[15] = 1;
      dest[14] = 0;
      dest[13] = 0;
      dest[12] = 0;
  
      dest[11] = 0;
      dest[10] = mat[8];
      dest[9] = mat[7];
      dest[8] = mat[6];
  
      dest[7] = 0;
      dest[6] = mat[5];
      dest[5] = mat[4];
      dest[4] = mat[3];
  
      dest[3] = 0;
      dest[2] = mat[2];
      dest[1] = mat[1];
      dest[0] = mat[0];
  
      return dest;
  };
  
  /**
 * Returns a string representation of a mat3
 *
 * _param {mat3} mat mat3 to represent as a string
 *
 * _param {string} String representation of mat
 */
  mat3.str = function (mat) {
      return '[' + mat[0] + ', ' + mat[1] + ', ' + mat[2] +
          ', ' + mat[3] + ', ' + mat[4] + ', ' + mat[5] +
          ', ' + mat[6] + ', ' + mat[7] + ', ' + mat[8] + ']';
  };
  
  /*
 * mat4
 */
  
  /**
 * Creates a new instance of a mat4 using the default array type
 * Any javascript array-like object containing at least 16 numeric elements can serve as a mat4
 *
 * _param {mat4} [mat] mat4 containing values to initialize with
 *
 * _returns {mat4} New mat4
 *
 * @param {Object=} mat
 */
  mat4.create = function (mat) {
      var dest = new MatrixArray(16);
  
      if (mat) {
          dest[0] = mat[0];
          dest[1] = mat[1];
          dest[2] = mat[2];
          dest[3] = mat[3];
          dest[4] = mat[4];
          dest[5] = mat[5];
          dest[6] = mat[6];
          dest[7] = mat[7];
          dest[8] = mat[8];
          dest[9] = mat[9];
          dest[10] = mat[10];
          dest[11] = mat[11];
          dest[12] = mat[12];
          dest[13] = mat[13];
          dest[14] = mat[14];
          dest[15] = mat[15];
      }
  
      return dest;
  };
  
  /**
 * Copies the values of one mat4 to another
 *
 * _param {mat4} mat mat4 containing values to copy
 * _param {mat4} dest mat4 receiving copied values
 *
 * _returns {mat4} dest
 */
  mat4.set = function (mat, dest) {
      dest[0] = mat[0];
      dest[1] = mat[1];
      dest[2] = mat[2];
      dest[3] = mat[3];
      dest[4] = mat[4];
      dest[5] = mat[5];
      dest[6] = mat[6];
      dest[7] = mat[7];
      dest[8] = mat[8];
      dest[9] = mat[9];
      dest[10] = mat[10];
      dest[11] = mat[11];
      dest[12] = mat[12];
      dest[13] = mat[13];
      dest[14] = mat[14];
      dest[15] = mat[15];
      return dest;
  };
  
  /**
 * Sets a mat4 to an identity matrix
 *
 * _param {mat4} dest mat4 to set
 *
 * _returns {mat4} dest
 */
  mat4.identity = function (dest) {
      if (!dest) { dest = mat4.create(); }
      dest[0] = 1;
      dest[1] = 0;
      dest[2] = 0;
      dest[3] = 0;
      dest[4] = 0;
      dest[5] = 1;
      dest[6] = 0;
      dest[7] = 0;
      dest[8] = 0;
      dest[9] = 0;
      dest[10] = 1;
      dest[11] = 0;
      dest[12] = 0;
      dest[13] = 0;
      dest[14] = 0;
      dest[15] = 1;
      return dest;
  };
  
  /**
 * Transposes a mat4 (flips the values over the diagonal)
 *
 * _param {mat4} mat mat4 to transpose
 * _param {mat4} [dest] mat4 receiving transposed values. If not specified result is written to mat
 */
  mat4.transpose = function (mat, dest) {
      // If we are transposing ourselves we can skip a few steps but have to cache some values
      if (!dest || mat === dest) {
          var a01 = mat[1], a02 = mat[2], a03 = mat[3],
              a12 = mat[6], a13 = mat[7],
              a23 = mat[11];
  
          mat[1] = mat[4];
          mat[2] = mat[8];
          mat[3] = mat[12];
          mat[4] = a01;
          mat[6] = mat[9];
          mat[7] = mat[13];
          mat[8] = a02;
          mat[9] = a12;
          mat[11] = mat[14];
          mat[12] = a03;
          mat[13] = a13;
          mat[14] = a23;
          return mat;
      }
  
      dest[0] = mat[0];
      dest[1] = mat[4];
      dest[2] = mat[8];
      dest[3] = mat[12];
      dest[4] = mat[1];
      dest[5] = mat[5];
      dest[6] = mat[9];
      dest[7] = mat[13];
      dest[8] = mat[2];
      dest[9] = mat[6];
      dest[10] = mat[10];
      dest[11] = mat[14];
      dest[12] = mat[3];
      dest[13] = mat[7];
      dest[14] = mat[11];
      dest[15] = mat[15];
      return dest;
  };
  
  /**
 * Calculates the determinant of a mat4
 *
 * _param {mat4} mat mat4 to calculate determinant of
 *
 * _returns {number} determinant of mat
 */
  mat4.determinant = function (mat) {
      // Cache the matrix values (makes for huge speed increases!)
      var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3],
          a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7],
          a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11],
          a30 = mat[12], a31 = mat[13], a32 = mat[14], a33 = mat[15];
  
      return (a30 * a21 * a12 * a03 - a20 * a31 * a12 * a03 - a30 * a11 * a22 * a03 + a10 * a31 * a22 * a03 +
              a20 * a11 * a32 * a03 - a10 * a21 * a32 * a03 - a30 * a21 * a02 * a13 + a20 * a31 * a02 * a13 +
              a30 * a01 * a22 * a13 - a00 * a31 * a22 * a13 - a20 * a01 * a32 * a13 + a00 * a21 * a32 * a13 +
              a30 * a11 * a02 * a23 - a10 * a31 * a02 * a23 - a30 * a01 * a12 * a23 + a00 * a31 * a12 * a23 +
              a10 * a01 * a32 * a23 - a00 * a11 * a32 * a23 - a20 * a11 * a02 * a33 + a10 * a21 * a02 * a33 +
              a20 * a01 * a12 * a33 - a00 * a21 * a12 * a33 - a10 * a01 * a22 * a33 + a00 * a11 * a22 * a33);
  };
  
  /**
 * Calculates the inverse matrix of a mat4
 *
 * _param {mat4} mat mat4 to calculate inverse of
 * _param {mat4} [dest] mat4 receiving inverse matrix. If not specified result is written to mat, null if matrix cannot be inverted
 *
 * @param {Object=} dest
 */
  mat4.inverse = function (mat, dest) {
      if (!dest) { dest = mat; }
  
      // Cache the matrix values (makes for huge speed increases!)
      var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3],
          a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7],
          a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11],
          a30 = mat[12], a31 = mat[13], a32 = mat[14], a33 = mat[15],
  
          b00 = a00 * a11 - a01 * a10,
          b01 = a00 * a12 - a02 * a10,
          b02 = a00 * a13 - a03 * a10,
          b03 = a01 * a12 - a02 * a11,
          b04 = a01 * a13 - a03 * a11,
          b05 = a02 * a13 - a03 * a12,
          b06 = a20 * a31 - a21 * a30,
          b07 = a20 * a32 - a22 * a30,
          b08 = a20 * a33 - a23 * a30,
          b09 = a21 * a32 - a22 * a31,
          b10 = a21 * a33 - a23 * a31,
          b11 = a22 * a33 - a23 * a32,
  
          d = (b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06),
          invDet;
  
          // Calculate the determinant
          if (!d) { return null; }
          invDet = 1 / d;
  
      dest[0] = (a11 * b11 - a12 * b10 + a13 * b09) * invDet;
      dest[1] = (-a01 * b11 + a02 * b10 - a03 * b09) * invDet;
      dest[2] = (a31 * b05 - a32 * b04 + a33 * b03) * invDet;
      dest[3] = (-a21 * b05 + a22 * b04 - a23 * b03) * invDet;
      dest[4] = (-a10 * b11 + a12 * b08 - a13 * b07) * invDet;
      dest[5] = (a00 * b11 - a02 * b08 + a03 * b07) * invDet;
      dest[6] = (-a30 * b05 + a32 * b02 - a33 * b01) * invDet;
      dest[7] = (a20 * b05 - a22 * b02 + a23 * b01) * invDet;
      dest[8] = (a10 * b10 - a11 * b08 + a13 * b06) * invDet;
      dest[9] = (-a00 * b10 + a01 * b08 - a03 * b06) * invDet;
      dest[10] = (a30 * b04 - a31 * b02 + a33 * b00) * invDet;
      dest[11] = (-a20 * b04 + a21 * b02 - a23 * b00) * invDet;
      dest[12] = (-a10 * b09 + a11 * b07 - a12 * b06) * invDet;
      dest[13] = (a00 * b09 - a01 * b07 + a02 * b06) * invDet;
      dest[14] = (-a30 * b03 + a31 * b01 - a32 * b00) * invDet;
      dest[15] = (a20 * b03 - a21 * b01 + a22 * b00) * invDet;
  
      return dest;
  };
  
  /**
 * Copies the upper 3x3 elements of a mat4 into another mat4
 *
 * _param {mat4} mat mat4 containing values to copy
 * _param {mat4} [dest] mat4 receiving copied values
 *
 * _returns {mat4} dest is specified, a new mat4 otherwise
 */
  mat4.toRotationMat = function (mat, dest) {
      if (!dest) { dest = mat4.create(); }
  
      dest[0] = mat[0];
      dest[1] = mat[1];
      dest[2] = mat[2];
      dest[3] = mat[3];
      dest[4] = mat[4];
      dest[5] = mat[5];
      dest[6] = mat[6];
      dest[7] = mat[7];
      dest[8] = mat[8];
      dest[9] = mat[9];
      dest[10] = mat[10];
      dest[11] = mat[11];
      dest[12] = 0;
      dest[13] = 0;
      dest[14] = 0;
      dest[15] = 1;
  
      return dest;
  };
  
  /**
 * Copies the upper 3x3 elements of a mat4 into a mat3
 *
 * _param {mat4} mat mat4 containing values to copy
 * _param {mat3} [dest] mat3 receiving copied values
 *
 * _returns {mat3} dest is specified, a new mat3 otherwise
 */
  mat4.toMat3 = function (mat, dest) {
      if (!dest) { dest = mat3.create(); }
  
      dest[0] = mat[0];
      dest[1] = mat[1];
      dest[2] = mat[2];
      dest[3] = mat[4];
      dest[4] = mat[5];
      dest[5] = mat[6];
      dest[6] = mat[8];
      dest[7] = mat[9];
      dest[8] = mat[10];
  
      return dest;
  };
  
  /**
 * Calculates the inverse of the upper 3x3 elements of a mat4 and copies the result into a mat3
 * The resulting matrix is useful for calculating transformed normals
 *
 * Params:
 * _param {mat4} mat mat4 containing values to invert and copy
 * _param {mat3} [dest] mat3 receiving values
 *
 * _returns {mat3} dest is specified, a new mat3 otherwise, null if the matrix cannot be inverted
 */
  mat4.toInverseMat3 = function (mat, dest) {
      // Cache the matrix values (makes for huge speed increases!)
      var a00 = mat[0], a01 = mat[1], a02 = mat[2],
          a10 = mat[4], a11 = mat[5], a12 = mat[6],
          a20 = mat[8], a21 = mat[9], a22 = mat[10],
  
          b01 = a22 * a11 - a12 * a21,
          b11 = -a22 * a10 + a12 * a20,
          b21 = a21 * a10 - a11 * a20,
  
          d = a00 * b01 + a01 * b11 + a02 * b21,
          id;
  
      if (!d) { return null; }
      id = 1 / d;
  
      if (!dest) { dest = mat3.create(); }
  
      dest[0] = b01 * id;
      dest[1] = (-a22 * a01 + a02 * a21) * id;
      dest[2] = (a12 * a01 - a02 * a11) * id;
      dest[3] = b11 * id;
      dest[4] = (a22 * a00 - a02 * a20) * id;
      dest[5] = (-a12 * a00 + a02 * a10) * id;
      dest[6] = b21 * id;
      dest[7] = (-a21 * a00 + a01 * a20) * id;
      dest[8] = (a11 * a00 - a01 * a10) * id;
  
      return dest;
  };
  
  /**
 * Performs a matrix multiplication
 *
 * _param {mat4} mat First operand
 * _param {mat4} mat2 Second operand
 * _param {mat4} [dest] mat4 receiving operation result. If not specified result is written to mat
 */
  mat4.multiply = function (mat, mat2, dest) {
      if (!dest) { dest = mat; }
  
      // Cache the matrix values (makes for huge speed increases!)
      var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3],
          a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7],
          a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11],
          a30 = mat[12], a31 = mat[13], a32 = mat[14], a33 = mat[15],
  
          b00 = mat2[0], b01 = mat2[1], b02 = mat2[2], b03 = mat2[3],
          b10 = mat2[4], b11 = mat2[5], b12 = mat2[6], b13 = mat2[7],
          b20 = mat2[8], b21 = mat2[9], b22 = mat2[10], b23 = mat2[11],
          b30 = mat2[12], b31 = mat2[13], b32 = mat2[14], b33 = mat2[15];
  
      dest[0] = b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30;
      dest[1] = b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31;
      dest[2] = b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32;
      dest[3] = b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33;
      dest[4] = b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30;
      dest[5] = b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31;
      dest[6] = b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32;
      dest[7] = b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33;
      dest[8] = b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30;
      dest[9] = b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31;
      dest[10] = b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32;
      dest[11] = b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33;
      dest[12] = b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30;
      dest[13] = b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31;
      dest[14] = b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32;
      dest[15] = b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33;
  
      return dest;
  };
  
  /**
 * Transforms a vec3 with the given matrix
 * 4th vector component is implicitly '1'
 *
 * _param {mat4} mat mat4 to transform the vector with
 * _param {vec3} vec vec3 to transform
 * _param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
 *
 * _returns {vec3} dest if specified, vec otherwise
 */
  mat4.multiplyVec3 = function (mat, vec, dest) {
      if (!dest) { dest = vec; }
  
      var x = vec[0], y = vec[1], z = vec[2];
  
      dest[0] = mat[0] * x + mat[4] * y + mat[8] * z + mat[12];
      dest[1] = mat[1] * x + mat[5] * y + mat[9] * z + mat[13];
      dest[2] = mat[2] * x + mat[6] * y + mat[10] * z + mat[14];
  
      return dest;
  };
  
  /**
 * Transforms a vec4 with the given matrix
 *
 * _param {mat4} mat mat4 to transform the vector with
 * _param {vec4} vec vec4 to transform
 * _param {vec4} [dest] vec4 receiving operation result. If not specified result is written to vec
 *
 * _returns {vec4} dest if specified, vec otherwise
 *
 * @param {Object=} dest
 */
  mat4.multiplyVec4 = function (mat, vec, dest) {
      if (!dest) { dest = vec; }
  
      var x = vec[0], y = vec[1], z = vec[2], w = vec[3];
  
      dest[0] = mat[0] * x + mat[4] * y + mat[8] * z + mat[12] * w;
      dest[1] = mat[1] * x + mat[5] * y + mat[9] * z + mat[13] * w;
      dest[2] = mat[2] * x + mat[6] * y + mat[10] * z + mat[14] * w;
      dest[3] = mat[3] * x + mat[7] * y + mat[11] * z + mat[15] * w;
  
      return dest;
  };
  
  /**
 * Translates a matrix by the given vector
 *
 * _param {mat4} mat mat4 to translate
 * _param {vec3} vec vec3 specifying the translation
 * _param {mat4} [dest] mat4 receiving operation result. If not specified result is written to mat
 */
  mat4.translate = function (mat, vec, dest) {
      var x = vec[0], y = vec[1], z = vec[2],
          a00, a01, a02, a03,
          a10, a11, a12, a13,
          a20, a21, a22, a23;
  
      if (!dest || mat === dest) {
          mat[12] = mat[0] * x + mat[4] * y + mat[8] * z + mat[12];
          mat[13] = mat[1] * x + mat[5] * y + mat[9] * z + mat[13];
          mat[14] = mat[2] * x + mat[6] * y + mat[10] * z + mat[14];
          mat[15] = mat[3] * x + mat[7] * y + mat[11] * z + mat[15];
          return mat;
      }
  
      a00 = mat[0]; a01 = mat[1]; a02 = mat[2]; a03 = mat[3];
      a10 = mat[4]; a11 = mat[5]; a12 = mat[6]; a13 = mat[7];
      a20 = mat[8]; a21 = mat[9]; a22 = mat[10]; a23 = mat[11];
  
      dest[0] = a00; dest[1] = a01; dest[2] = a02; dest[3] = a03;
      dest[4] = a10; dest[5] = a11; dest[6] = a12; dest[7] = a13;
      dest[8] = a20; dest[9] = a21; dest[10] = a22; dest[11] = a23;
  
      dest[12] = a00 * x + a10 * y + a20 * z + mat[12];
      dest[13] = a01 * x + a11 * y + a21 * z + mat[13];
      dest[14] = a02 * x + a12 * y + a22 * z + mat[14];
      dest[15] = a03 * x + a13 * y + a23 * z + mat[15];
      return dest;
  };
  
  /**
 * Scales a matrix by the given vector
 *
 * _param {mat4} mat mat4 to scale
 * _param {vec3} vec vec3 specifying the scale for each axis
 * _param {mat4} [dest] mat4 receiving operation result. If not specified result is written to mat
 */
  mat4.scale = function (mat, vec, dest) {
      var x = vec[0], y = vec[1], z = vec[2];
  
      if (!dest || mat === dest) {
          mat[0] *= x;
          mat[1] *= x;
          mat[2] *= x;
          mat[3] *= x;
          mat[4] *= y;
          mat[5] *= y;
          mat[6] *= y;
          mat[7] *= y;
          mat[8] *= z;
          mat[9] *= z;
          mat[10] *= z;
          mat[11] *= z;
          return mat;
      }
  
      dest[0] = mat[0] * x;
      dest[1] = mat[1] * x;
      dest[2] = mat[2] * x;
      dest[3] = mat[3] * x;
      dest[4] = mat[4] * y;
      dest[5] = mat[5] * y;
      dest[6] = mat[6] * y;
      dest[7] = mat[7] * y;
      dest[8] = mat[8] * z;
      dest[9] = mat[9] * z;
      dest[10] = mat[10] * z;
      dest[11] = mat[11] * z;
      dest[12] = mat[12];
      dest[13] = mat[13];
      dest[14] = mat[14];
      dest[15] = mat[15];
      return dest;
  };
  
  /**
 * Rotates a matrix by the given angle around the specified axis
 * If rotating around a primary axis (X,Y,Z) one of the specialized rotation functions should be used instead for performance
 *
 * _param {mat4} mat mat4 to rotate
 * _param {number} angle Angle (in radians) to rotate
 * _param {vec3} axis vec3 representing the axis to rotate around
 * _param {mat4} [dest] mat4 receiving operation result. If not specified result is written to mat
 */
  mat4.rotate = function (mat, angle, axis, dest) {
      var x = axis[0], y = axis[1], z = axis[2],
          len = Math.sqrt(x * x + y * y + z * z),
          s, c, t,
          a00, a01, a02, a03,
          a10, a11, a12, a13,
          a20, a21, a22, a23,
          b00, b01, b02,
          b10, b11, b12,
          b20, b21, b22;
  
      if (!len) { return null; }
      if (len !== 1) {
          len = 1 / len;
          x *= len;
          y *= len;
          z *= len;
      }
  
      s = Math.sin(angle);
      c = Math.cos(angle);
      t = 1 - c;
  
      a00 = mat[0]; a01 = mat[1]; a02 = mat[2]; a03 = mat[3];
      a10 = mat[4]; a11 = mat[5]; a12 = mat[6]; a13 = mat[7];
      a20 = mat[8]; a21 = mat[9]; a22 = mat[10]; a23 = mat[11];
  
      // Construct the elements of the rotation matrix
      b00 = x * x * t + c; b01 = y * x * t + z * s; b02 = z * x * t - y * s;
      b10 = x * y * t - z * s; b11 = y * y * t + c; b12 = z * y * t + x * s;
      b20 = x * z * t + y * s; b21 = y * z * t - x * s; b22 = z * z * t + c;
  
      if (!dest) {
          dest = mat;
      } else if (mat !== dest) { // If the source and destination differ, copy the unchanged last row
          dest[12] = mat[12];
          dest[13] = mat[13];
          dest[14] = mat[14];
          dest[15] = mat[15];
      }
  
      // Perform rotation-specific matrix multiplication
      dest[0] = a00 * b00 + a10 * b01 + a20 * b02;
      dest[1] = a01 * b00 + a11 * b01 + a21 * b02;
      dest[2] = a02 * b00 + a12 * b01 + a22 * b02;
      dest[3] = a03 * b00 + a13 * b01 + a23 * b02;
  
      dest[4] = a00 * b10 + a10 * b11 + a20 * b12;
      dest[5] = a01 * b10 + a11 * b11 + a21 * b12;
      dest[6] = a02 * b10 + a12 * b11 + a22 * b12;
      dest[7] = a03 * b10 + a13 * b11 + a23 * b12;
  
      dest[8] = a00 * b20 + a10 * b21 + a20 * b22;
      dest[9] = a01 * b20 + a11 * b21 + a21 * b22;
      dest[10] = a02 * b20 + a12 * b21 + a22 * b22;
      dest[11] = a03 * b20 + a13 * b21 + a23 * b22;
      return dest;
  };
  
  /**
 * Rotates a matrix by the given angle around the X axis
 *
 * _param {mat4} mat mat4 to rotate
 * _param {number} angle Angle (in radians) to rotate
 * _param {mat4} [dest] mat4 receiving operation result. If not specified result is written to mat
 */
  mat4.rotateX = function (mat, angle, dest) {
      var s = Math.sin(angle),
          c = Math.cos(angle),
          a10 = mat[4],
          a11 = mat[5],
          a12 = mat[6],
          a13 = mat[7],
          a20 = mat[8],
          a21 = mat[9],
          a22 = mat[10],
          a23 = mat[11];
  
      if (!dest) {
          dest = mat;
      } else if (mat !== dest) { // If the source and destination differ, copy the unchanged rows
          dest[0] = mat[0];
          dest[1] = mat[1];
          dest[2] = mat[2];
          dest[3] = mat[3];
  
          dest[12] = mat[12];
          dest[13] = mat[13];
          dest[14] = mat[14];
          dest[15] = mat[15];
      }
  
      // Perform axis-specific matrix multiplication
      dest[4] = a10 * c + a20 * s;
      dest[5] = a11 * c + a21 * s;
      dest[6] = a12 * c + a22 * s;
      dest[7] = a13 * c + a23 * s;
  
      dest[8] = a10 * -s + a20 * c;
      dest[9] = a11 * -s + a21 * c;
      dest[10] = a12 * -s + a22 * c;
      dest[11] = a13 * -s + a23 * c;
      return dest;
  };
  
  /**
 * Rotates a matrix by the given angle around the Y axis
 *
 * _param {mat4} mat mat4 to rotate
 * _param {number} angle Angle (in radians) to rotate
 * _param {mat4} [dest] mat4 receiving operation result. If not specified result is written to mat
 */
  mat4.rotateY = function (mat, angle, dest) {
      var s = Math.sin(angle),
          c = Math.cos(angle),
          a00 = mat[0],
          a01 = mat[1],
          a02 = mat[2],
          a03 = mat[3],
          a20 = mat[8],
          a21 = mat[9],
          a22 = mat[10],
          a23 = mat[11];
  
      if (!dest) {
          dest = mat;
      } else if (mat !== dest) { // If the source and destination differ, copy the unchanged rows
          dest[4] = mat[4];
          dest[5] = mat[5];
          dest[6] = mat[6];
          dest[7] = mat[7];
  
          dest[12] = mat[12];
          dest[13] = mat[13];
          dest[14] = mat[14];
          dest[15] = mat[15];
      }
  
      // Perform axis-specific matrix multiplication
      dest[0] = a00 * c + a20 * -s;
      dest[1] = a01 * c + a21 * -s;
      dest[2] = a02 * c + a22 * -s;
      dest[3] = a03 * c + a23 * -s;
  
      dest[8] = a00 * s + a20 * c;
      dest[9] = a01 * s + a21 * c;
      dest[10] = a02 * s + a22 * c;
      dest[11] = a03 * s + a23 * c;
      return dest;
  };
  
  /**
 * Rotates a matrix by the given angle around the Z axis
 *
 * _param {mat4} mat mat4 to rotate
 * _param {number} angle Angle (in radians) to rotate
 * _param {mat4} [dest] mat4 receiving operation result. If not specified result is written to mat
 */
  mat4.rotateZ = function (mat, angle, dest) {
      var s = Math.sin(angle),
          c = Math.cos(angle),
          a00 = mat[0],
          a01 = mat[1],
          a02 = mat[2],
          a03 = mat[3],
          a10 = mat[4],
          a11 = mat[5],
          a12 = mat[6],
          a13 = mat[7];
  
      if (!dest) {
          dest = mat;
      } else if (mat !== dest) { // If the source and destination differ, copy the unchanged last row
          dest[8] = mat[8];
          dest[9] = mat[9];
          dest[10] = mat[10];
          dest[11] = mat[11];
  
          dest[12] = mat[12];
          dest[13] = mat[13];
          dest[14] = mat[14];
          dest[15] = mat[15];
      }
  
      // Perform axis-specific matrix multiplication
      dest[0] = a00 * c + a10 * s;
      dest[1] = a01 * c + a11 * s;
      dest[2] = a02 * c + a12 * s;
      dest[3] = a03 * c + a13 * s;
  
      dest[4] = a00 * -s + a10 * c;
      dest[5] = a01 * -s + a11 * c;
      dest[6] = a02 * -s + a12 * c;
      dest[7] = a03 * -s + a13 * c;
  
      return dest;
  };
  
  /**
 * Generates a frustum matrix with the given bounds
 *
 * _param {number} left Left bound of the frustum
 * _param {number} right Right bound of the frustum
 * _param {number} bottom Bottom bound of the frustum
 * _param {number} top Top bound of the frustum
 * _param {number} near Near bound of the frustum
 * _param {number} far Far bound of the frustum
 * _param {mat4} [dest] mat4 frustum matrix will be written into
 *
 * _returns {mat4} dest if specified, a new mat4 otherwise
 */
  mat4.frustum = function (left, right, bottom, top, near, far, dest) {
      if (!dest) { dest = mat4.create(); }
      var rl = (right - left),
          tb = (top - bottom),
          fn = (far - near);
      dest[0] = (near * 2) / rl;
      dest[1] = 0;
      dest[2] = 0;
      dest[3] = 0;
      dest[4] = 0;
      dest[5] = (near * 2) / tb;
      dest[6] = 0;
      dest[7] = 0;
      dest[8] = (right + left) / rl;
      dest[9] = (top + bottom) / tb;
      dest[10] = -(far + near) / fn;
      dest[11] = -1;
      dest[12] = 0;
      dest[13] = 0;
      dest[14] = -(far * near * 2) / fn;
      dest[15] = 0;
      return dest;
  };
  
  /**
 * Generates a perspective projection matrix with the given bounds
 *
 * _param {number} fovy Vertical field of view
 * _param {number} aspect Aspect ratio. typically viewport width/height
 * _param {number} near Near bound of the frustum
 * _param {number} far Far bound of the frustum
 * _param {mat4} [dest] mat4 frustum matrix will be written into
 *
 * _returns {mat4} dest if specified, a new mat4 otherwise
 */
  mat4.perspective = function (fovy, aspect, near, far, dest) {
      var top = near * Math.tan(fovy * Math.PI / 360.0),
          right = top * aspect;
      return mat4.frustum(-right, right, -top, top, near, far, dest);
  };
  
  /**
 * Generates a orthogonal projection matrix with the given bounds
 *
 * _param {number} left Left bound of the frustum
 * _param {number} right Right bound of the frustum
 * _param {number} bottom Bottom bound of the frustum
 * _param {number} top Top bound of the frustum
 * _param {number} near Near bound of the frustum
 * _param {number} far Far bound of the frustum
 * _param {mat4} [dest] mat4 frustum matrix will be written into
 *
 * _returns {mat4} dest if specified, a new mat4 otherwise
 */
  mat4.ortho = function (left, right, bottom, top, near, far, dest) {
      if (!dest) { dest = mat4.create(); }
      var rl = (right - left),
          tb = (top - bottom),
          fn = (far - near);
      dest[0] = 2 / rl;
      dest[1] = 0;
      dest[2] = 0;
      dest[3] = 0;
      dest[4] = 0;
      dest[5] = 2 / tb;
      dest[6] = 0;
      dest[7] = 0;
      dest[8] = 0;
      dest[9] = 0;
      dest[10] = -2 / fn;
      dest[11] = 0;
      dest[12] = -(left + right) / rl;
      dest[13] = -(top + bottom) / tb;
      dest[14] = -(far + near) / fn;
      dest[15] = 1;
      return dest;
  };
  
  /**
 * Generates a look-at matrix with the given eye position, focal point, and up axis
 *
 * _param {vec3} eye Position of the viewer
 * _param {vec3} center Point the viewer is looking at
 * _param {vec3} up vec3 pointing "up"
 * _param {mat4} [dest] mat4 frustum matrix will be written into
 *
 * _returns {mat4} dest if specified, a new mat4 otherwise
 */
  mat4.lookAt = function (eye, center, up, dest) {
      if (!dest) { dest = mat4.create(); }
  
      var x0, x1, x2, y0, y1, y2, z0, z1, z2, len,
          eyex = eye[0],
          eyey = eye[1],
          eyez = eye[2],
          upx = up[0],
          upy = up[1],
          upz = up[2],
          centerx = center[0],
          centery = center[1],
          centerz = center[2];
  
      if (eyex === centerx && eyey === centery && eyez === centerz) {
          return mat4.identity(dest);
      }
  
      //vec3.direction(eye, center, z);
      z0 = eyex - centerx;
      z1 = eyey - centery;
      z2 = eyez - centerz;
  
      // normalize (no check needed for 0 because of early return)
      len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
      z0 *= len;
      z1 *= len;
      z2 *= len;
  
      //vec3.normalize(vec3.cross(up, z, x));
      x0 = upy * z2 - upz * z1;
      x1 = upz * z0 - upx * z2;
      x2 = upx * z1 - upy * z0;
      len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
      if (!len) {
          x0 = 0;
          x1 = 0;
          x2 = 0;
      } else {
          len = 1 / len;
          x0 *= len;
          x1 *= len;
          x2 *= len;
      }
  
      //vec3.normalize(vec3.cross(z, x, y));
      y0 = z1 * x2 - z2 * x1;
      y1 = z2 * x0 - z0 * x2;
      y2 = z0 * x1 - z1 * x0;
  
      len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
      if (!len) {
          y0 = 0;
          y1 = 0;
          y2 = 0;
      } else {
          len = 1 / len;
          y0 *= len;
          y1 *= len;
          y2 *= len;
      }
  
      dest[0] = x0;
      dest[1] = y0;
      dest[2] = z0;
      dest[3] = 0;
      dest[4] = x1;
      dest[5] = y1;
      dest[6] = z1;
      dest[7] = 0;
      dest[8] = x2;
      dest[9] = y2;
      dest[10] = z2;
      dest[11] = 0;
      dest[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
      dest[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
      dest[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
      dest[15] = 1;
  
      return dest;
  };
  
  /**
 * Creates a matrix from a quaternion rotation and vector translation
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.translate(dest, vec);
 *     var quatMat = mat4.create();
 *     quat4.toMat4(quat, quatMat);
 *     mat4.multiply(dest, quatMat);
 *
 * _param {quat4} quat Rotation quaternion
 * _param {vec3} vec Translation vector
 * _param {mat4} [dest] mat4 receiving operation result. If not specified result is written to a new mat4
 *
 * _returns {mat4} dest if specified, a new mat4 otherwise
 */
  mat4.fromRotationTranslation = function (quat, vec, dest) {
      if (!dest) { dest = mat4.create(); }
  
      // Quaternion math
      var x = quat[0], y = quat[1], z = quat[2], w = quat[3],
          x2 = x + x,
          y2 = y + y,
          z2 = z + z,
  
          xx = x * x2,
          xy = x * y2,
          xz = x * z2,
          yy = y * y2,
          yz = y * z2,
          zz = z * z2,
          wx = w * x2,
          wy = w * y2,
          wz = w * z2;
  
      dest[0] = 1 - (yy + zz);
      dest[1] = xy + wz;
      dest[2] = xz - wy;
      dest[3] = 0;
      dest[4] = xy - wz;
      dest[5] = 1 - (xx + zz);
      dest[6] = yz + wx;
      dest[7] = 0;
      dest[8] = xz + wy;
      dest[9] = yz - wx;
      dest[10] = 1 - (xx + yy);
      dest[11] = 0;
      dest[12] = vec[0];
      dest[13] = vec[1];
      dest[14] = vec[2];
      dest[15] = 1;
  
      return dest;
  };
  
  /**
 * Returns a string representation of a mat4
 *
 * _param {mat4} mat mat4 to represent as a string
 *
 * _returns {string} String representation of mat
 */
  mat4.str = function (mat) {
      return '[' + mat[0] + ', ' + mat[1] + ', ' + mat[2] + ', ' + mat[3] +
          ', ' + mat[4] + ', ' + mat[5] + ', ' + mat[6] + ', ' + mat[7] +
          ', ' + mat[8] + ', ' + mat[9] + ', ' + mat[10] + ', ' + mat[11] +
          ', ' + mat[12] + ', ' + mat[13] + ', ' + mat[14] + ', ' + mat[15] + ']';
  };
  
  /*
 * quat4
 */
  
  /**
 * Creates a new instance of a quat4 using the default array type
 * Any javascript array containing at least 4 numeric elements can serve as a quat4
 *
 * _param {quat4} [quat] quat4 containing values to initialize with
 *
 * _returns {quat4} New quat4
 */
  quat4.create = function (quat) {
      var dest = new MatrixArray(4);
  
      if (quat) {
          dest[0] = quat[0];
          dest[1] = quat[1];
          dest[2] = quat[2];
          dest[3] = quat[3];
      }
  
      return dest;
  };
  
  /**
 * Copies the values of one quat4 to another
 *
 * _param {quat4} quat quat4 containing values to copy
 * _param {quat4} dest quat4 receiving copied values
 *
 * _returns {quat4} dest
 */
  quat4.set = function (quat, dest) {
      dest[0] = quat[0];
      dest[1] = quat[1];
      dest[2] = quat[2];
      dest[3] = quat[3];
  
      return dest;
  };
  
  /**
 * Calculates the W component of a quat4 from the X, Y, and Z components.
 * Assumes that quaternion is 1 unit in length.
 * Any existing W component will be ignored.
 *
 * _param {quat4} quat quat4 to calculate W component of
 * _param {quat4} [dest] quat4 receiving calculated values. If not specified result is written to quat
 *
 * _returns {quat4} dest if specified, quat otherwise
 */
  quat4.calculateW = function (quat, dest) {
      var x = quat[0], y = quat[1], z = quat[2];
  
      if (!dest || quat === dest) {
          quat[3] = -Math.sqrt(Math.abs(1.0 - x * x - y * y - z * z));
          return quat;
      }
      dest[0] = x;
      dest[1] = y;
      dest[2] = z;
      dest[3] = -Math.sqrt(Math.abs(1.0 - x * x - y * y - z * z));
      return dest;
  };
  
  /**
 * Calculates the dot product of two quaternions
 *
 * _param {quat4} quat First operand
 * _param {quat4} quat2 Second operand
 *
 * @return {number} Dot product of quat and quat2
 */
  quat4.dot = function(quat, quat2){
      return quat[0]*quat2[0] + quat[1]*quat2[1] + quat[2]*quat2[2] + quat[3]*quat2[3];
  };
  
  /**
 * Calculates the inverse of a quat4
 *
 * _param {quat4} quat quat4 to calculate inverse of
 * _param {quat4} [dest] quat4 receiving inverse values. If not specified result is written to quat
 *
 * _returns {quat4} dest if specified, quat otherwise
 */
  quat4.inverse = function(quat, dest) {
      var q0 = quat[0], q1 = quat[1], q2 = quat[2], q3 = quat[3],
          dot = q0*q0 + q1*q1 + q2*q2 + q3*q3,
          invDot = dot ? 1.0/dot : 0;
  
      // TODO: Would be faster to return [0,0,0,0] immediately if dot == 0
  
      if(!dest || quat === dest) {
          quat[0] *= -invDot;
          quat[1] *= -invDot;
          quat[2] *= -invDot;
          quat[3] *= invDot;
          return quat;
      }
      dest[0] = -quat[0]*invDot;
      dest[1] = -quat[1]*invDot;
      dest[2] = -quat[2]*invDot;
      dest[3] = quat[3]*invDot;
      return dest;
  };
  
  
  /**
 * Calculates the conjugate of a quat4
 * If the quaternion is normalized, this function is faster than quat4.inverse and produces the same result.
 *
 * _param {quat4} quat quat4 to calculate conjugate of
 * _param {quat4} [dest] quat4 receiving conjugate values. If not specified result is written to quat
 *
 * _returns {quat4} dest if specified, quat otherwise
 */
  quat4.conjugate = function (quat, dest) {
      if (!dest || quat === dest) {
          quat[0] *= -1;
          quat[1] *= -1;
          quat[2] *= -1;
          return quat;
      }
      dest[0] = -quat[0];
      dest[1] = -quat[1];
      dest[2] = -quat[2];
      dest[3] = quat[3];
      return dest;
  };
  
  /**
 * Calculates the length of a quat4
 *
 * Params:
 * _param {quat4} quat quat4 to calculate length of
 *
 * _returns Length of quat
 */
  quat4.length = function (quat) {
      var x = quat[0], y = quat[1], z = quat[2], w = quat[3];
      return Math.sqrt(x * x + y * y + z * z + w * w);
  };
  
  /**
 * Generates a unit quaternion of the same direction as the provided quat4
 * If quaternion length is 0, returns [0, 0, 0, 0]
 *
 * _param {quat4} quat quat4 to normalize
 * _param {quat4} [dest] quat4 receiving operation result. If not specified result is written to quat
 *
 * _returns {quat4} dest if specified, quat otherwise
 */
  quat4.normalize = function (quat, dest) {
      if (!dest) { dest = quat; }
  
      var x = quat[0], y = quat[1], z = quat[2], w = quat[3],
          len = Math.sqrt(x * x + y * y + z * z + w * w);
      if (len === 0) {
          dest[0] = 0;
          dest[1] = 0;
          dest[2] = 0;
          dest[3] = 0;
          return dest;
      }
      len = 1 / len;
      dest[0] = x * len;
      dest[1] = y * len;
      dest[2] = z * len;
      dest[3] = w * len;
  
      return dest;
  };
  
  /**
 * Performs quaternion addition
 *
 * _param {quat4} quat First operand
 * _param {quat4} quat2 Second operand
 * _param {quat4} [dest] quat4 receiving operation result. If not specified result is written to quat
 *
 * _returns {quat4} dest if specified, quat otherwise
 */
  quat4.add = function (quat, quat2, dest) {
      if(!dest || quat === dest) {
          quat[0] += quat2[0];
          quat[1] += quat2[1];
          quat[2] += quat2[2];
          quat[3] += quat2[3];
          return quat;
      }
      dest[0] = quat[0]+quat2[0];
      dest[1] = quat[1]+quat2[1];
      dest[2] = quat[2]+quat2[2];
      dest[3] = quat[3]+quat2[3];
      return dest;
  };
  
  /**
 * Performs a quaternion multiplication
 *
 * _param {quat4} quat First operand
 * _param {quat4} quat2 Second operand
 * _param {quat4} [dest] quat4 receiving operation result. If not specified result is written to quat
 *
 * _returns {quat4} dest if specified, quat otherwise
 */
  quat4.multiply = function (quat, quat2, dest) {
      if (!dest) { dest = quat; }
  
      var qax = quat[0], qay = quat[1], qaz = quat[2], qaw = quat[3],
          qbx = quat2[0], qby = quat2[1], qbz = quat2[2], qbw = quat2[3];
  
      dest[0] = qax * qbw + qaw * qbx + qay * qbz - qaz * qby;
      dest[1] = qay * qbw + qaw * qby + qaz * qbx - qax * qbz;
      dest[2] = qaz * qbw + qaw * qbz + qax * qby - qay * qbx;
      dest[3] = qaw * qbw - qax * qbx - qay * qby - qaz * qbz;
  
      return dest;
  };
  
  /**
 * Transforms a vec3 with the given quaternion
 *
 * _param {quat4} quat quat4 to transform the vector with
 * _param {vec3} vec vec3 to transform
 * _param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
 *
 * _returns dest if specified, vec otherwise
 */
  quat4.multiplyVec3 = function (quat, vec, dest) {
      if (!dest) { dest = vec; }
  
      var x = vec[0], y = vec[1], z = vec[2],
          qx = quat[0], qy = quat[1], qz = quat[2], qw = quat[3],
  
          // calculate quat * vec
          ix = qw * x + qy * z - qz * y,
          iy = qw * y + qz * x - qx * z,
          iz = qw * z + qx * y - qy * x,
          iw = -qx * x - qy * y - qz * z;
  
      // calculate result * inverse quat
      dest[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
      dest[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
      dest[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;
  
      return dest;
  };
  
  /**
 * Multiplies the components of a quaternion by a scalar value
 *
 * _param {quat4} quat to scale
 * _param {number} val Value to scale by
 * _param {quat4} [dest] quat4 receiving operation result. If not specified result is written to quat
 *
 * _returns {quat4} dest if specified, quat otherwise
 */
  quat4.scale = function (quat, val, dest) {
      if(!dest || quat === dest) {
          quat[0] *= val;
          quat[1] *= val;
          quat[2] *= val;
          quat[3] *= val;
          return quat;
      }
      dest[0] = quat[0]*val;
      dest[1] = quat[1]*val;
      dest[2] = quat[2]*val;
      dest[3] = quat[3]*val;
      return dest;
  };
  
  /**
 * Calculates a 3x3 matrix from the given quat4
 *
 * _param {quat4} quat quat4 to create matrix from
 * _param {mat3} [dest] mat3 receiving operation result
 *
 * _returns {mat3} dest if specified, a new mat3 otherwise
 */
  quat4.toMat3 = function (quat, dest) {
      if (!dest) { dest = mat3.create(); }
  
      var x = quat[0], y = quat[1], z = quat[2], w = quat[3],
          x2 = x + x,
          y2 = y + y,
          z2 = z + z,
  
          xx = x * x2,
          xy = x * y2,
          xz = x * z2,
          yy = y * y2,
          yz = y * z2,
          zz = z * z2,
          wx = w * x2,
          wy = w * y2,
          wz = w * z2;
  
      dest[0] = 1 - (yy + zz);
      dest[1] = xy + wz;
      dest[2] = xz - wy;
  
      dest[3] = xy - wz;
      dest[4] = 1 - (xx + zz);
      dest[5] = yz + wx;
  
      dest[6] = xz + wy;
      dest[7] = yz - wx;
      dest[8] = 1 - (xx + yy);
  
      return dest;
  };
  
  /**
 * Calculates a 4x4 matrix from the given quat4
 *
 * _param {quat4} quat quat4 to create matrix from
 * _param {mat4} [dest] mat4 receiving operation result
 *
 * _returns {mat4} dest if specified, a new mat4 otherwise
 */
  quat4.toMat4 = function (quat, dest) {
      if (!dest) { dest = mat4.create(); }
  
      var x = quat[0], y = quat[1], z = quat[2], w = quat[3],
          x2 = x + x,
          y2 = y + y,
          z2 = z + z,
  
          xx = x * x2,
          xy = x * y2,
          xz = x * z2,
          yy = y * y2,
          yz = y * z2,
          zz = z * z2,
          wx = w * x2,
          wy = w * y2,
          wz = w * z2;
  
      dest[0] = 1 - (yy + zz);
      dest[1] = xy + wz;
      dest[2] = xz - wy;
      dest[3] = 0;
  
      dest[4] = xy - wz;
      dest[5] = 1 - (xx + zz);
      dest[6] = yz + wx;
      dest[7] = 0;
  
      dest[8] = xz + wy;
      dest[9] = yz - wx;
      dest[10] = 1 - (xx + yy);
      dest[11] = 0;
  
      dest[12] = 0;
      dest[13] = 0;
      dest[14] = 0;
      dest[15] = 1;
  
      return dest;
  };
  
  /**
 * Performs a spherical linear interpolation between two quat4
 *
 * _param {quat4} quat First quaternion
 * _param {quat4} quat2 Second quaternion
 * _param {number} slerp Interpolation amount between the two inputs
 * _param {quat4} [dest] quat4 receiving operation result. If not specified result is written to quat
 *
 * _returns {quat4} dest if specified, quat otherwise
 */
  quat4.slerp = function (quat, quat2, slerp, dest) {
      if (!dest) { dest = quat; }
  
      var cosHalfTheta = quat[0] * quat2[0] + quat[1] * quat2[1] + quat[2] * quat2[2] + quat[3] * quat2[3],
          halfTheta,
          sinHalfTheta,
          ratioA,
          ratioB;
  
      if (Math.abs(cosHalfTheta) >= 1.0) {
          if (dest !== quat) {
              dest[0] = quat[0];
              dest[1] = quat[1];
              dest[2] = quat[2];
              dest[3] = quat[3];
          }
          return dest;
      }
  
      halfTheta = Math.acos(cosHalfTheta);
      sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta * cosHalfTheta);
  
      if (Math.abs(sinHalfTheta) < 0.001) {
          dest[0] = (quat[0] * 0.5 + quat2[0] * 0.5);
          dest[1] = (quat[1] * 0.5 + quat2[1] * 0.5);
          dest[2] = (quat[2] * 0.5 + quat2[2] * 0.5);
          dest[3] = (quat[3] * 0.5 + quat2[3] * 0.5);
          return dest;
      }
  
      ratioA = Math.sin((1 - slerp) * halfTheta) / sinHalfTheta;
      ratioB = Math.sin(slerp * halfTheta) / sinHalfTheta;
  
      dest[0] = (quat[0] * ratioA + quat2[0] * ratioB);
      dest[1] = (quat[1] * ratioA + quat2[1] * ratioB);
      dest[2] = (quat[2] * ratioA + quat2[2] * ratioB);
      dest[3] = (quat[3] * ratioA + quat2[3] * ratioB);
  
      return dest;
  };
  
  /**
 * Returns a string representation of a quaternion
 *
 * _param {quat4} quat quat4 to represent as a string
 *
 * _returns {string} String representation of quat
 */
  quat4.str = function (quat) {
      return '[' + quat[0] + ', ' + quat[1] + ', ' + quat[2] + ', ' + quat[3] + ']';
  };
  
  
  return {
    vec3: vec3,
    mat3: mat3,
    mat4: mat4,
    quat4: quat4
  };
  
  })();
  
  ;
  
  var GLImmediateSetup = {
  };
  var _emscripten_glBegin = (mode) => {
      // Push the old state:
      GLImmediate.enabledClientAttributes_preBegin = GLImmediate.enabledClientAttributes;
      GLImmediate.enabledClientAttributes = [];
  
      GLImmediate.clientAttributes_preBegin = GLImmediate.clientAttributes;
      GLImmediate.clientAttributes = []
      for (var i = 0; i < GLImmediate.clientAttributes_preBegin.length; i++) {
        GLImmediate.clientAttributes.push({});
      }
  
      if (Module._muBatchOpen && !Module._muBatchDrawing && Module._mu_mesh_flush) {
        Module._muBatchDrawing = 1;
        Module._mu_mesh_flush();
        Module._muBatchDrawing = 0;
      }
      GLImmediate.mode = mode;
      GLImmediate.vertexCounter = 0;
      GLImmediate.muColorArmed = false;
      GLImmediate.muColorFirst = false;
      GLImmediate.muColorThisVertex = false;
      var components = GLImmediate.rendererComponents = [];
      for (var i = 0; i < GLImmediate.NUM_ATTRIBUTES; i++) {
        components[i] = 0;
      }
      GLImmediate.rendererComponentPointer = 0;
      GLImmediate.vertexData = GLImmediate.tempData;
    };
  var _glBegin = _emscripten_glBegin;

  var _emscripten_glBindTexture = (target, texture) => {
      GLctx.bindTexture(target, GL.textures[texture]);
    };
  var _glBindTexture = _emscripten_glBindTexture;

  var _emscripten_glBlendFunc = (x0, x1) => GLctx.blendFunc(x0, x1);
  var _glBlendFunc = _emscripten_glBlendFunc;

  var _emscripten_glClear = (x0) => GLctx.clear(x0);
  var _glClear = _emscripten_glClear;

  var _emscripten_glClearColor = (x0, x1, x2, x3) => GLctx.clearColor(x0, x1, x2, x3);
  var _glClearColor = _emscripten_glClearColor;

  var _emscripten_glColor4f = (r, g, b, a) => {
      r = Math.max(Math.min(r, 1), 0);
      g = Math.max(Math.min(g, 1), 0);
      b = Math.max(Math.min(b, 1), 0);
      a = Math.max(Math.min(a, 1), 0);
  
      // TODO: make ub the default, not f, save a few mathops
      if (GLImmediate.mode >= 0) {
        var start = GLImmediate.vertexCounter << 2;
        GLImmediate.vertexDataU8[start + 0] = r * 255;
        GLImmediate.vertexDataU8[start + 1] = g * 255;
        GLImmediate.vertexDataU8[start + 2] = b * 255;
        GLImmediate.vertexDataU8[start + 3] = a * 255;
        GLImmediate.vertexCounter++;
        if (!GLImmediate.rendererComponents[GLImmediate.COLOR]) {
          GLImmediate.muColorFirst = GLImmediate.rendererComponentPointer === 0;
        }
        GLImmediate.clientColor[0] = r;
        GLImmediate.clientColor[1] = g;
        GLImmediate.clientColor[2] = b;
        GLImmediate.clientColor[3] = a;
        GLImmediate.muColorArmed = true;
        GLImmediate.muColorThisVertex = true;
        GLImmediate.addRendererComponent(GLImmediate.COLOR, 4, GLctx.UNSIGNED_BYTE);
      } else {
        GLImmediate.clientColor[0] = r;
        GLImmediate.clientColor[1] = g;
        GLImmediate.clientColor[2] = b;
        GLImmediate.clientColor[3] = a;
        GLctx.vertexAttrib4fv(GLImmediate.COLOR, GLImmediate.clientColor);
      }
    };
  var _glColor4f = _emscripten_glColor4f;
  var _emscripten_glColor3f = (r, g, b) => _glColor4f(r, g, b, 1);
  var _glColor3f = _emscripten_glColor3f;

  
  var _emscripten_glColor3fv = (p) => _glColor3f(HEAPF32[((p)>>2)],
                                  HEAPF32[(((p)+(4))>>2)],
                                  HEAPF32[(((p)+(8))>>2)]);
  var _glColor3fv = _emscripten_glColor3fv;


  
  var _emscripten_glColor4fv = (p) => _glColor4f(HEAPF32[((p)>>2)],
                                  HEAPF32[(((p)+(4))>>2)],
                                  HEAPF32[(((p)+(8))>>2)],
                                  HEAPF32[(((p)+(12))>>2)]);
  var _glColor4fv = _emscripten_glColor4fv;

  var _emscripten_glColor4ub = (r, g, b, a) => _glColor4f((r&255)/255, (g&255)/255, (b&255)/255, (a&255)/255);
  var _glColor4ub = _emscripten_glColor4ub;

  
  var _emscripten_glDeleteTextures = (n, textures) => {
      for (var i = 0; i < n; i++) {
        var id = HEAP32[(((textures)+(i*4))>>2)];
        var texture = GL.textures[id];
        // GL spec: "glDeleteTextures silently ignores 0s and names that do not
        // correspond to existing textures".
        if (!texture) continue;
        GLctx.deleteTexture(texture);
        texture.name = 0;
        GL.textures[id] = null;
      }
    };
  var _glDeleteTextures = _emscripten_glDeleteTextures;

  var _emscripten_glDepthFunc = (x0) => GLctx.depthFunc(x0);
  var _glDepthFunc = _emscripten_glDepthFunc;

  var _emscripten_glDepthMask = (flag) => {
      GLctx.depthMask(!!flag);
    };
  var _glDepthMask = _emscripten_glDepthMask;



  var _emscripten_glEnd = () => {
      GLImmediate.prepareClientAttributes(GLImmediate.rendererComponents[GLImmediate.VERTEX], true);
      GLImmediate.firstVertex = 0;
      GLImmediate.lastVertex = GLImmediate.vertexCounter / (GLImmediate.stride >> 2);
      GLImmediate.flush();
      GLImmediate.disableBeginEndClientAttributes();
      GLImmediate.mode = -1;
  
      // Pop the old state:
      GLImmediate.enabledClientAttributes = GLImmediate.enabledClientAttributes_preBegin;
      GLImmediate.clientAttributes = GLImmediate.clientAttributes_preBegin;
      GLImmediate.currentRenderer = null; // The set of active client attributes changed, we must re-lookup the renderer to use.
      GLImmediate.modifiedClientAttributes = true;
    };
  var _glEnd = _emscripten_glEnd;

  var _emscripten_glFlush = () => GLctx.flush();
  var _glFlush = _emscripten_glFlush;

  var _emscripten_glFogf = (pname, param) => { // partial support, TODO
      switch (pname) {
        case 0xB63: // GL_FOG_START
          GLEmulation.fogStart = param; break;
        case 0xB64: // GL_FOG_END
          GLEmulation.fogEnd = param; break;
        case 0xB62: // GL_FOG_DENSITY
          GLEmulation.fogDensity = param; break;
        case 0xB65: // GL_FOG_MODE
          switch (param) {
            case 0x801: // GL_EXP2
            case 0x2601: // GL_LINEAR
              if (GLEmulation.fogMode != param) {
                GLImmediate.currentRenderer = null; // Fog mode is part of the FFP shader state, we must re-lookup the renderer to use.
                GLEmulation.fogMode = param;
              }
              break;
            default: // default to GL_EXP
              if (GLEmulation.fogMode != 0x800 /* GL_EXP */) {
                GLImmediate.currentRenderer = null; // Fog mode is part of the FFP shader state, we must re-lookup the renderer to use.
                GLEmulation.fogMode = 0x800 /* GL_EXP */;
              }
              break;
          }
          break;
      }
    };
  var _glFogf = _emscripten_glFogf;

  
  var _emscripten_glFogfv = (pname, param) => { // partial support, TODO
      switch (pname) {
        case 0xB66: // GL_FOG_COLOR
          GLEmulation.fogColor[0] = HEAPF32[((param)>>2)];
          GLEmulation.fogColor[1] = HEAPF32[(((param)+(4))>>2)];
          GLEmulation.fogColor[2] = HEAPF32[(((param)+(8))>>2)];
          GLEmulation.fogColor[3] = HEAPF32[(((param)+(12))>>2)];
          break;
        case 0xB63: // GL_FOG_START
        case 0xB64: // GL_FOG_END
          _glFogf(pname, HEAPF32[((param)>>2)]); break;
      }
    };
  var _glFogfv = _emscripten_glFogfv;

  var _emscripten_glFogi = (pname, param) => {
      return _glFogf(pname, param);
    };
  var _glFogi = _emscripten_glFogi;

  var _emscripten_glGenTextures = (n, textures) => {
      GL.genObject(n, textures, 'createTexture', GL.textures
        );
    };
  var _glGenTextures = _emscripten_glGenTextures;

  var _emscripten_glGetError = () => {
      var error = GLctx.getError() || GL.lastError;
      GL.lastError = 0/*GL_NO_ERROR*/;
      return error;
    };
  var _glGetError = _emscripten_glGetError;




  
  var _emscripten_glLoadIdentity = () => {
      if (Module._muBatchOpen && !Module._muBatchDrawing && Module._mu_mesh_flush) {
        Module._muBatchDrawing = 1;
        Module._mu_mesh_flush();
        Module._muBatchDrawing = 0;
      }
      GLImmediate.matricesModified = true;
      GLImmediate.matrixVersion[GLImmediate.currentMatrix] = (GLImmediate.matrixVersion[GLImmediate.currentMatrix] + 1)|0;
      GLImmediate.matrixLib.mat4.identity(GLImmediate.matrix[GLImmediate.currentMatrix]);
    };
  var _glLoadIdentity = _emscripten_glLoadIdentity;

  
  var _emscripten_glMatrixMode = (mode) => {
      if (mode == 0x1700 /* GL_MODELVIEW */) {
        GLImmediate.currentMatrix = 0/*m*/;
      } else if (mode == 0x1701 /* GL_PROJECTION */) {
        GLImmediate.currentMatrix = 1/*p*/;
      } else if (mode == 0x1702) { // GL_TEXTURE
        GLImmediate.useTextureMatrix = true;
        GLImmediate.currentMatrix = 2/*t*/ + GLImmediate.TexEnvJIT.getActiveTexture();
      } else {
        throw `Wrong mode ${mode} passed to glMatrixMode`;
      }
    };
  var _glMatrixMode = _emscripten_glMatrixMode;

  var _emscripten_glPixelStorei = (pname, param) => {
      if (pname == 3317) {
        GL.unpackAlignment = param;
      } else if (pname == 3314) {
        GL.unpackRowLength = param;
      }
      GLctx.pixelStorei(pname, param);
    };
  var _glPixelStorei = _emscripten_glPixelStorei;

  var _emscripten_glPopMatrix = () => {
      if (GLImmediate.matrixStack[GLImmediate.currentMatrix].length == 0) {
        GL.recordError(0x504/*GL_STACK_UNDERFLOW*/);
        return;
      }
      if (Module._muBatchOpen && !Module._muBatchDrawing && Module._mu_mesh_flush) {
        Module._muBatchDrawing = 1;
        Module._mu_mesh_flush();
        Module._muBatchDrawing = 0;
      }
      GLImmediate.matricesModified = true;
      GLImmediate.matrixVersion[GLImmediate.currentMatrix] = (GLImmediate.matrixVersion[GLImmediate.currentMatrix] + 1)|0;
      GLImmediate.matrix[GLImmediate.currentMatrix] = GLImmediate.matrixStack[GLImmediate.currentMatrix].pop();
    };
  var _glPopMatrix = _emscripten_glPopMatrix;

  var _emscripten_glPushMatrix = () => {
      if (Module._muBatchOpen && !Module._muBatchDrawing && Module._mu_mesh_flush) {
        Module._muBatchDrawing = 1;
        Module._mu_mesh_flush();
        Module._muBatchDrawing = 0;
      }
      GLImmediate.matricesModified = true;
      GLImmediate.matrixVersion[GLImmediate.currentMatrix] = (GLImmediate.matrixVersion[GLImmediate.currentMatrix] + 1)|0;
      GLImmediate.matrixStack[GLImmediate.currentMatrix].push(
          Array.prototype.slice.call(GLImmediate.matrix[GLImmediate.currentMatrix]));
    };
  var _glPushMatrix = _emscripten_glPushMatrix;

  
  
  
  
  
  
  
  var heapObjectForWebGLType = (type) => {
      // Micro-optimization for size: Subtract lowest GL enum number (0x1400/* GL_BYTE */) from type to compare
      // smaller values for the heap, for shorter generated code size.
      // Also the type HEAPU16 is not tested for explicitly, but any unrecognized type will return out HEAPU16.
      // (since most types are HEAPU16)
      type -= 0x1400;
      if (type == 0) return HEAP8;
  
      if (type == 1) return HEAPU8;
  
      if (type == 2) return HEAP16;
  
      if (type == 4) return HEAP32;
  
      if (type == 6) return HEAPF32;
  
      if (type == 5
        || type == 28922
        || type == 28520
        || type == 30779
        || type == 30782
        )
        return HEAPU32;
  
      return HEAPU16;
    };
  
  var toTypedArrayIndex = (pointer, heap) =>
      pointer >>> (31 - Math.clz32(heap.BYTES_PER_ELEMENT));
  
  var _emscripten_glReadPixels = (x, y, width, height, format, type, pixels) => {
      if (true) {
        if (GLctx.currentPixelPackBufferBinding) {
          GLctx.readPixels(x, y, width, height, format, type, pixels);
          return;
        }
        var heap = heapObjectForWebGLType(type);
        var target = toTypedArrayIndex(pixels, heap);
        GLctx.readPixels(x, y, width, height, format, type, heap, target);
        return;
      }
    };
  var _glReadPixels = _emscripten_glReadPixels;

  var _emscripten_glRotated = (angle, x, y, z) => {
      if (Module._muBatchOpen && !Module._muBatchDrawing && Module._mu_mesh_flush) {
        Module._muBatchDrawing = 1;
        Module._mu_mesh_flush();
        Module._muBatchDrawing = 0;
      }
      GLImmediate.matricesModified = true;
      GLImmediate.matrixVersion[GLImmediate.currentMatrix] = (GLImmediate.matrixVersion[GLImmediate.currentMatrix] + 1)|0;
      GLImmediate.matrixLib.mat4.rotate(GLImmediate.matrix[GLImmediate.currentMatrix], angle*Math.PI/180, [x, y, z]);
    };
  var _emscripten_glRotatef = _emscripten_glRotated;
  var _glRotatef = _emscripten_glRotatef;

  var _emscripten_glScissor = (x0, x1, x2, x3) => GLctx.scissor(x0, x1, x2, x3);
  var _glScissor = _emscripten_glScissor;

  var muEmitRepeatColor = () => {
      if (!GLImmediate.muColorArmed || !GLImmediate.muColorFirst || GLImmediate.muColorThisVertex) return;
      var start = GLImmediate.vertexCounter << 2;
      var c = GLImmediate.clientColor;
      GLImmediate.vertexDataU8[start + 0] = c[0] * 255;
      GLImmediate.vertexDataU8[start + 1] = c[1] * 255;
      GLImmediate.vertexDataU8[start + 2] = c[2] * 255;
      GLImmediate.vertexDataU8[start + 3] = c[3] * 255;
      GLImmediate.vertexCounter++;
      GLImmediate.muColorThisVertex = true;
    };
  var _emscripten_glTexCoord2i = (u, v) => {
      assert(GLImmediate.mode >= 0); // must be in begin/end
      muEmitRepeatColor();
      GLImmediate.vertexData[GLImmediate.vertexCounter++] = u;
      GLImmediate.vertexData[GLImmediate.vertexCounter++] = v;
      GLImmediate.addRendererComponent(GLImmediate.TEXTURE0, 2, GLctx.FLOAT);
    };
  var _emscripten_glTexCoord2f = _emscripten_glTexCoord2i;
  var _glTexCoord2f = _emscripten_glTexCoord2f;

  var _emscripten_glTexEnvf = (target, pname, params) => warnOnce('glTexEnvf: TODO');
  var _glTexEnvf = _emscripten_glTexEnvf;

  var computeUnpackAlignedImageSize = (width, height, sizePerPixel) => {
      function roundedToNextMultipleOf(x, y) {
        return (x + y - 1) & -y;
      }
      var plainRowSize = (GL.unpackRowLength || width) * sizePerPixel;
      var alignedRowSize = roundedToNextMultipleOf(plainRowSize, GL.unpackAlignment);
      return height * alignedRowSize;
    };
  
  var colorChannelsInGlTextureFormat = (format) => {
      // Micro-optimizations for size: map format to size by subtracting smallest
      // enum value (0x1902) from all values first.  Also omit the most common
      // size value (1) from the list, which is assumed by formats not on the
      // list.
      var colorChannels = {
        // 0x1902 /* GL_DEPTH_COMPONENT */ - 0x1902: 1,
        // 0x1906 /* GL_ALPHA */ - 0x1902: 1,
        5: 3,
        6: 4,
        // 0x1909 /* GL_LUMINANCE */ - 0x1902: 1,
        8: 2,
        29502: 3,
        29504: 4,
        // 0x1903 /* GL_RED */ - 0x1902: 1,
        26917: 2,
        26918: 2,
        // 0x8D94 /* GL_RED_INTEGER */ - 0x1902: 1,
        29846: 3,
        29847: 4
      };
      return colorChannels[format - 0x1902]||1;
    };
  
  
  
  var emscriptenWebGLGetTexPixelData = (type, format, width, height, pixels) => {
      var heap = heapObjectForWebGLType(type);
      var sizePerPixel = colorChannelsInGlTextureFormat(format) * heap.BYTES_PER_ELEMENT;
      var bytes = computeUnpackAlignedImageSize(width, height, sizePerPixel);
      return heap.subarray(toTypedArrayIndex(pixels, heap), toTypedArrayIndex(pixels + bytes, heap));
    };
  
  
  
  var muGlFormat = (fmt) => {
      if (fmt == 4) return 0x1908;
      return fmt;
    };
  var _emscripten_glTexImage2D = (target, level, internalFormat, width, height, border, format, type, pixels) => {
      internalFormat = muGlFormat(internalFormat);
      format = muGlFormat(format);
      if (true) {
        if (GLctx.currentPixelUnpackBufferBinding) {
          GLctx.texImage2D(target, level, internalFormat, width, height, border, format, type, pixels);
          return;
        }
        if (pixels) {
          var heap = heapObjectForWebGLType(type);
          var index = toTypedArrayIndex(pixels, heap);
          GLctx.texImage2D(target, level, internalFormat, width, height, border, format, type, heap, index);
          return;
        }
      }
      var pixelData = pixels ? emscriptenWebGLGetTexPixelData(type, format, width, height, pixels) : null;
      GLctx.texImage2D(target, level, internalFormat, width, height, border, format, type, pixelData);
    };
  var _glTexImage2D = _emscripten_glTexImage2D;

  
  var _emscripten_glTexParameterfv = (target, pname, params) => {
      if (pname == 0x1004) return;
      var param = HEAPF32[((params)>>2)];
      if (param == 0x2900 || param == 0x812D) param = 0x812F;
      GLctx.texParameterf(target, pname, param);
    };
  var _glTexParameterfv = _emscripten_glTexParameterfv;

  var _emscripten_glTexParameteri = (x0, x1, x2) => {
      if (x1 == 0x1004) return;
      if (x2 == 0x2900 || x2 == 0x812D) x2 = 0x812F;
      GLctx.texParameteri(x0, x1, x2);
    };
  var _glTexParameteri = _emscripten_glTexParameteri;

  var _emscripten_glTranslated = (x, y, z) => {
      if (Module._muBatchOpen && !Module._muBatchDrawing && Module._mu_mesh_flush) {
        Module._muBatchDrawing = 1;
        Module._mu_mesh_flush();
        Module._muBatchDrawing = 0;
      }
      GLImmediate.matricesModified = true;
      GLImmediate.matrixVersion[GLImmediate.currentMatrix] = (GLImmediate.matrixVersion[GLImmediate.currentMatrix] + 1)|0;
      GLImmediate.matrixLib.mat4.translate(GLImmediate.matrix[GLImmediate.currentMatrix], [x, y, z]);
    };
  var _emscripten_glTranslatef = _emscripten_glTranslated;
  var _glTranslatef = _emscripten_glTranslatef;

  var _emscripten_glVertex2f = (x, y) => {
      assert(GLImmediate.mode >= 0); // must be in begin/end
      muEmitRepeatColor();
      GLImmediate.vertexData[GLImmediate.vertexCounter++] = x;
      GLImmediate.vertexData[GLImmediate.vertexCounter++] = y;
      GLImmediate.vertexData[GLImmediate.vertexCounter++] = 0;
      GLImmediate.vertexData[GLImmediate.vertexCounter++] = 1;
      assert(GLImmediate.vertexCounter << 2 < GL.MAX_TEMP_BUFFER_SIZE);
      GLImmediate.addRendererComponent(GLImmediate.VERTEX, 4, GLctx.FLOAT);
      GLImmediate.muColorThisVertex = false;
    };
  var _glVertex2f = _emscripten_glVertex2f;

  var _emscripten_glVertex3f = (x, y, z) => {
      assert(GLImmediate.mode >= 0); // must be in begin/end
      muEmitRepeatColor();
      GLImmediate.vertexData[GLImmediate.vertexCounter++] = x;
      GLImmediate.vertexData[GLImmediate.vertexCounter++] = y;
      GLImmediate.vertexData[GLImmediate.vertexCounter++] = z;
      GLImmediate.vertexData[GLImmediate.vertexCounter++] = 1;
      assert(GLImmediate.vertexCounter << 2 < GL.MAX_TEMP_BUFFER_SIZE);
      GLImmediate.addRendererComponent(GLImmediate.VERTEX, 4, GLctx.FLOAT);
      GLImmediate.muColorThisVertex = false;
    };
  var _glVertex3f = _emscripten_glVertex3f;

  
  var _emscripten_glVertex3fv = (p) => _glVertex3f(HEAPF32[((p)>>2)],
                                    HEAPF32[(((p)+(4))>>2)],
                                    HEAPF32[(((p)+(8))>>2)]);
  var _glVertex3fv = _emscripten_glVertex3fv;

  var _emscripten_glViewport = (x0, x1, x2, x3) => GLctx.viewport(x0, x1, x2, x3);
  var _glViewport = _emscripten_glViewport;

  var _emscripten_glOrtho = (left, right, bottom, top_, nearVal, farVal) => {
      if (Module._muBatchOpen && !Module._muBatchDrawing && Module._mu_mesh_flush) {
        Module._muBatchDrawing = 1;
        Module._mu_mesh_flush();
        Module._muBatchDrawing = 0;
      }
      GLImmediate.matricesModified = true;
      GLImmediate.matrixVersion[GLImmediate.currentMatrix] = (GLImmediate.matrixVersion[GLImmediate.currentMatrix] + 1)|0;
      GLImmediate.matrixLib.mat4.multiply(GLImmediate.matrix[GLImmediate.currentMatrix],
          GLImmediate.matrixLib.mat4.ortho(left, right, bottom, top_, nearVal, farVal));
    };
  var _glOrtho = _emscripten_glOrtho;
  var _emscripten_gluOrtho2D = (left, right, bottom, top) => _glOrtho(left, right, bottom, top, -1, 1);
  var _gluOrtho2D = _emscripten_gluOrtho2D;

  var _emscripten_gluPerspective = (fov, aspect, near, far) => {
      if (Module._muBatchOpen && !Module._muBatchDrawing && Module._mu_mesh_flush) {
        Module._muBatchDrawing = 1;
        Module._mu_mesh_flush();
        Module._muBatchDrawing = 0;
      }
      GLImmediate.matricesModified = true;
      GLImmediate.matrixVersion[GLImmediate.currentMatrix] = (GLImmediate.matrixVersion[GLImmediate.currentMatrix] + 1)|0;
      GLImmediate.matrix[GLImmediate.currentMatrix] =
        GLImmediate.matrixLib.mat4.perspective(fov, aspect, near, far,
                                                 GLImmediate.matrix[GLImmediate.currentMatrix]);
    };
  var _gluPerspective = _emscripten_gluPerspective;



  var wasmTableMirror = [];
  
  
  var getWasmTableEntry = (funcPtr) => {
      var func = wasmTableMirror[funcPtr];
      if (!func) {
        /** @suppress {checkTypes} */
        wasmTableMirror[funcPtr] = func = wasmTable.get(funcPtr);
      }
      /** @suppress {checkTypes} */
      assert(wasmTable.get(funcPtr) == func, 'table mirror is out of date');
      return func;
    };












  
  
  
  
  
  
  
    /**
   * @param {number} ptr
   * @param {number} value
   * @param {string} type
   */
  function setValue(ptr, value, type = 'i8') {
    if (type.endsWith('*')) type = '*';
    switch (type) {
      case 'i1': HEAP8[ptr] = value; break;
      case 'i8': HEAP8[ptr] = value; break;
      case 'i16': HEAP16[((ptr)>>1)] = value; break;
      case 'i32': HEAP32[((ptr)>>2)] = value; break;
      case 'i64': HEAP64[((ptr)>>3)] = BigInt(value); break;
      case 'float': HEAPF32[((ptr)>>2)] = value; break;
      case 'double': HEAPF64[((ptr)>>3)] = value; break;
      case '*': HEAPU32[((ptr)>>2)] = value; break;
      default: abort(`invalid type for setValue: ${type}`);
    }
  }





  var FS_createPath = (...args) => FS.createPath(...args);



  var FS_unlink = (...args) => FS.unlink(...args);

  var FS_createLazyFile = (...args) => FS.createLazyFile(...args);

  var FS_createDevice = (...args) => FS.createDevice(...args);



  FS.createPreloadedFile = FS_createPreloadedFile;
  FS.preloadFile = FS_preloadFile;
  FS.staticInit();;

      Module['requestAnimationFrame'] = MainLoop.requestAnimationFrame;
      Module['pauseMainLoop'] = MainLoop.pause;
      Module['resumeMainLoop'] = MainLoop.resume;
      MainLoop.init();;

      // Signal GL rendering layer that processing of a new frame is about to
      // start. This helps it optimize VBO double-buffering and reduce GPU stalls.
      registerPreMainLoop(() => GL.newRenderingFrameStarted());
    ;
GLImmediate.setupFuncs(); Browser.moduleContextCreatedCallbacks.push(() => GLImmediate.init());;
safeSetTimeout.pending = new Map(); safeSetTimeout.nextId = 1;;

      // Forward declare GL functions that are overridden by GLEmulation.
      /**@suppress {duplicate, undefinedVars}*/var _emscripten_glDrawArrays;
      /**@suppress {duplicate, undefinedVars}*/var _emscripten_glDrawElements;
      /**@suppress {duplicate, undefinedVars}*/var _emscripten_glActiveTexture;
      /**@suppress {duplicate, undefinedVars}*/var _emscripten_glEnable;
      /**@suppress {duplicate, undefinedVars}*/var _emscripten_glDisable;
      /**@suppress {duplicate, undefinedVars}*/var _emscripten_glTexEnvf;
      /**@suppress {duplicate, undefinedVars}*/var _emscripten_glTexEnvi;
      /**@suppress {duplicate, undefinedVars}*/var _emscripten_glTexEnvfv;
      /**@suppress {duplicate, undefinedVars}*/var _emscripten_glGetIntegerv;
      /**@suppress {duplicate, undefinedVars}*/var _emscripten_glIsEnabled;
      /**@suppress {duplicate, undefinedVars}*/var _emscripten_glGetBooleanv;
      /**@suppress {duplicate, undefinedVars}*/var _emscripten_glGetString;
      /**@suppress {duplicate, undefinedVars}*/var _emscripten_glCreateShader;
      /**@suppress {duplicate, undefinedVars}*/var _emscripten_glShaderSource;
      /**@suppress {duplicate, undefinedVars}*/var _emscripten_glCompileShader;
      /**@suppress {duplicate, undefinedVars}*/var _emscripten_glAttachShader;
      /**@suppress {duplicate, undefinedVars}*/var _emscripten_glDetachShader;
      /**@suppress {duplicate, undefinedVars}*/var _emscripten_glUseProgram;
      /**@suppress {duplicate, undefinedVars}*/var _emscripten_glDeleteProgram;
      /**@suppress {duplicate, undefinedVars}*/var _emscripten_glBindAttribLocation;
      /**@suppress {duplicate, undefinedVars}*/var _emscripten_glLinkProgram;
      /**@suppress {duplicate, undefinedVars}*/var _emscripten_glBindBuffer;
      /**@suppress {duplicate, undefinedVars}*/var _emscripten_glGetFloatv;
      /**@suppress {duplicate, undefinedVars}*/var _emscripten_glHint;
      /**@suppress {duplicate, undefinedVars}*/var _emscripten_glEnableVertexAttribArray;
      /**@suppress {duplicate, undefinedVars}*/var _emscripten_glDisableVertexAttribArray;
      /**@suppress {duplicate, undefinedVars}*/var _emscripten_glVertexAttribPointer;
      /**@suppress {duplicate, undefinedVars}*/var _glTexEnvf;
      /**@suppress {duplicate, undefinedVars}*/var _glTexEnvi;
      /**@suppress {duplicate, undefinedVars}*/var _glTexEnvfv;
      /**@suppress {duplicate, undefinedVars}*/var _glGetTexEnviv;
      /**@suppress {duplicate, undefinedVars}*/var _glGetTexEnvfv;
      GLEmulation.init();;
// End JS library code

// include: postlibrary.js
// This file is included after the automatically-generated JS library code
// but before the wasm module is created.

{

  // Begin ATMODULES hooks
  if (Module['noExitRuntime']) noExitRuntime = Module['noExitRuntime'];

if (Module['print']) out = Module['print'];
if (Module['printErr']) err = Module['printErr'];
  // End ATMODULES hooks

  checkIncomingModuleAPI();

  if (Module['arguments']) programArgs = Module['arguments'];
  if (Module['thisProgram']) thisProgram = Module['thisProgram'];

  // Assertions on removed incoming Module JS APIs.
  assert(typeof Module['memoryInitializerPrefixURL'] == 'undefined', 'Module.memoryInitializerPrefixURL option was removed, use Module.locateFile instead');
  assert(typeof Module['pthreadMainPrefixURL'] == 'undefined', 'Module.pthreadMainPrefixURL option was removed, use Module.locateFile instead');
  assert(typeof Module['cdInitializerPrefixURL'] == 'undefined', 'Module.cdInitializerPrefixURL option was removed, use Module.locateFile instead');
  assert(typeof Module['filePackagePrefixURL'] == 'undefined', 'Module.filePackagePrefixURL option was removed, use Module.locateFile instead');
  assert(typeof Module['read'] == 'undefined', 'Module.read option was removed');
  assert(typeof Module['readAsync'] == 'undefined', 'Module.readAsync option was removed (modify readAsync in JS)');
  assert(typeof Module['readBinary'] == 'undefined', 'Module.readBinary option was removed (modify readBinary in JS)');
  assert(typeof Module['setWindowTitle'] == 'undefined', 'Module.setWindowTitle option was removed (modify emscripten_set_window_title in JS)');
  assert(typeof Module['TOTAL_MEMORY'] == 'undefined', 'Module.TOTAL_MEMORY has been renamed Module.INITIAL_MEMORY');
  assert(typeof Module['ENVIRONMENT'] == 'undefined', 'Module.ENVIRONMENT has been deprecated. To force the environment, use the ENVIRONMENT compile-time option (for example, -sENVIRONMENT=web or -sENVIRONMENT=node)');
  assert(typeof Module['STACK_SIZE'] == 'undefined', 'STACK_SIZE can no longer be set at runtime.  Use -sSTACK_SIZE at link time')
  // If memory is defined in wasm, the user can't provide it, or set INITIAL_MEMORY
  assert(typeof Module['wasmMemory'] == 'undefined', 'Use of `wasmMemory` detected.  Use -sIMPORTED_MEMORY to define wasmMemory externally');
  assert(typeof Module['INITIAL_MEMORY'] == 'undefined', 'Detected runtime INITIAL_MEMORY setting.  Use -sIMPORTED_MEMORY to define wasmMemory dynamically');

  var preInit = Module['preInit'];
  if (preInit) {
    if (typeof preInit == 'function') Module['preInit'] = preInit = [preInit];
    // Written as a loop so that preInit functions that themselves add more
    // preInit functions.  Is this actually needed?
    while (preInit.length > 0) {
      preInit.shift()();
    }
  }
  consumedModuleProp('preInit');
}

// Begin runtime exports
  Module['addRunDependency'] = addRunDependency;
  Module['removeRunDependency'] = removeRunDependency;
  Module['FS_preloadFile'] = FS_preloadFile;
  Module['FS_unlink'] = FS_unlink;
  Module['FS_createPath'] = FS_createPath;
  Module['FS_createDevice'] = FS_createDevice;
  Module['FS_createDataFile'] = FS_createDataFile;
  Module['FS_createLazyFile'] = FS_createLazyFile;
  var missingLibrarySymbols = [
  'writeI53ToI64Clamped',
  'writeI53ToI64Signaling',
  'writeI53ToU64Clamped',
  'writeI53ToU64Signaling',
  'convertI32PairToI53',
  'convertI32PairToI53Checked',
  'convertU32PairToI53',
  'stackAlloc',
  'getTempRet0',
  'setTempRet0',
  'createNamedFunction',
  'zeroMemory',
  'getHeapMax',
  'growMemory',
  'withStackSave',
  'inetPton4',
  'inetNtop4',
  'inetPton6',
  'inetNtop6',
  'readSockaddr',
  'writeSockaddr',
  'runMainThreadEmAsm',
  'jstoi_q',
  'autoResumeAudioContext',
  'dynCallLegacy',
  'getDynCaller',
  'dynCall',
  'runtimeKeepalivePush',
  'runtimeKeepalivePop',
  'asmjsMangle',
  'alignMemory',
  'HandleAllocator',
  'addOnInit',
  'addOnPostCtor',
  'addOnPreMain',
  'STACK_SIZE',
  'STACK_ALIGN',
  'POINTER_SIZE',
  'ASSERTIONS',
  'ccall',
  'cwrap',
  'convertJsFunctionToWasm',
  'getEmptyTableSlot',
  'updateTableMap',
  'getFunctionAddress',
  'addFunction',
  'removeFunction',
  'getValue',
  'intArrayToString',
  'AsciiToString',
  'stringToAscii',
  'UTF16ToString',
  'stringToUTF16',
  'lengthBytesUTF16',
  'UTF32ToString',
  'stringToUTF32',
  'lengthBytesUTF32',
  'stringToUTF8OnStack',
  'writeArrayToMemory',
  'registerWheelEventCallback',
  'registerUiEventCallback',
  'registerFocusEventCallback',
  'fillDeviceOrientationEventData',
  'registerDeviceOrientationEventCallback',
  'fillDeviceMotionEventData',
  'registerDeviceMotionEventCallback',
  'screenOrientation',
  'fillOrientationChangeEventData',
  'registerOrientationChangeEventCallback',
  'fillFullscreenChangeEventData',
  'registerFullscreenChangeEventCallback',
  'callCanvasResizedCallback',
  'JSEvents_requestFullscreen',
  'JSEvents_resizeCanvasForFullscreen',
  'registerRestoreOldStyle',
  'hideEverythingExceptGivenElement',
  'restoreHiddenElements',
  'setLetterbox',
  'currentFullscreenStrategy',
  'softFullscreenResizeWebGLRenderTarget',
  'doRequestFullscreen',
  'fillPointerlockChangeEventData',
  'registerPointerlockChangeEventCallback',
  'registerPointerlockErrorEventCallback',
  'requestPointerLock',
  'fillVisibilityChangeEventData',
  'registerVisibilityChangeEventCallback',
  'registerTouchEventCallback',
  'fillGamepadEventData',
  'registerGamepadEventCallback',
  'registerBeforeUnloadEventCallback',
  'fillBatteryEventData',
  'registerBatteryEventCallback',
  'setCanvasElementSize',
  'getCanvasElementSize',
  'jsStackTrace',
  'getCallstack',
  'convertPCtoSourceLocation',
  'wasiRightsToMuslOFlags',
  'wasiOFlagsToMuslOFlags',
  'safeClearTimeout',
  'setImmediateWrapped',
  'safeRequestAnimationFrame',
  'clearImmediateWrapped',
  'registerPostMainLoop',
  'getPromise',
  'makePromise',
  'addPromise',
  'idsToPromises',
  'makePromiseCallback',
  'findMatchingCatch',
  'incrementUncaughtExceptionCount',
  'decrementUncaughtExceptionCount',
  'Browser_asyncPrepareDataCounter',
  'isLeapYear',
  'ydayFromDate',
  'arraySum',
  'addDays',
  'getSocketFromFD',
  'getSocketAddress',
  'FS_mkdirTree',
  '_setNetworkCallback',
  'emscriptenWebGLGetUniform',
  'webglGetProgramUniformLocation',
  'webglGetUniformLocation',
  'webglPrepareUniformLocationsBeforeFirstUse',
  'webglGetLeftBracePos',
  'emscriptenWebGLGetVertexAttrib',
  '__glGetActiveAttribOrUniform',
  'writeGLArray',
  'registerWebGlEventCallback',
  'runAndAbortIfError',
  'emscriptenWebGLGetIndexed',
  'emulGlGenVertexArrays',
  'emulGlDeleteVertexArrays',
  'emulGlIsVertexArray',
  'emulGlBindVertexArray',
  'writeStringToMemory',
  'writeAsciiToMemory',
  'allocateUTF8',
  'allocateUTF8OnStack',
  'demangle',
  'stackTrace',
  'getNativeTypeSize',
];
missingLibrarySymbols.forEach(missingLibrarySymbol)

  var unexportedSymbols = [
  'run',
  'out',
  'err',
  'callMain',
  'abort',
  'wasmExports',
  'writeStackCookie',
  'checkStackCookie',
  'writeI53ToI64',
  'readI53FromI64',
  'readI53FromU64',
  'INT53_MAX',
  'INT53_MIN',
  'bigintToI53Checked',
  'HEAP8',
  'HEAP16',
  'HEAPU16',
  'HEAP32',
  'HEAPU32',
  'HEAPF32',
  'HEAPF64',
  'HEAP64',
  'HEAPU64',
  'stackSave',
  'stackRestore',
  'ptrToString',
  'exitJS',
  'abortOnCannotGrowMemory',
  'ENV',
  'ERRNO_CODES',
  'strError',
  'DNS',
  'Protocols',
  'timers',
  'warnOnce',
  'readEmAsmArgsArray',
  'readEmAsmArgs',
  'runEmAsmFunction',
  'getExecutableName',
  'handleException',
  'keepRuntimeAlive',
  'callUserCallback',
  'maybeExit',
  'asyncLoad',
  'mmapAlloc',
  'wasmTable',
  'wasmMemory',
  'getUniqueRunDependency',
  'noExitRuntime',
  'addOnPreRun',
  'addOnExit',
  'addOnPostRun',
  'freeTableIndexes',
  'functionsInTableMap',
  'setValue',
  'PATH',
  'PATH_FS',
  'UTF8Decoder',
  'UTF8ArrayToString',
  'UTF8ToString',
  'stringToUTF8Array',
  'stringToUTF8',
  'lengthBytesUTF8',
  'intArrayFromString',
  'UTF16Decoder',
  'stringToNewUTF8',
  'JSEvents',
  'registerKeyEventCallback',
  'specialHTMLTargets',
  'maybeCStringToJsString',
  'findEventTarget',
  'findCanvasEventTarget',
  'getBoundingClientRect',
  'fillMouseEventData',
  'registerMouseEventCallback',
  'restoreOldWindowedStyle',
  'UNWIND_CACHE',
  'ExitStatus',
  'getEnvStrings',
  'checkWasiClock',
  'doReadv',
  'doWritev',
  'initRandomFill',
  'randomFill',
  'safeSetTimeout',
  'emSetImmediate',
  'emClearImmediate',
  'registerPreMainLoop',
  'promiseMap',
  'uncaughtExceptionCount',
  'exceptionCaught',
  'ExceptionInfo',
  'Browser',
  'requestFullscreen',
  'setCanvasSize',
  'createContext',
  'wget',
  'MONTH_DAYS_REGULAR',
  'MONTH_DAYS_LEAP',
  'MONTH_DAYS_REGULAR_CUMULATIVE',
  'MONTH_DAYS_LEAP_CUMULATIVE',
  'SYSCALLS',
  'preloadPlugins',
  'FS_createPreloadedFile',
  'FS_modeStringToFlags',
  'FS_getMode',
  'FS_fileDataToTypedArray',
  'FS_stdin_getChar_buffer',
  'FS_stdin_getChar',
  'FS_readFile',
  'FS',
  'FS_root',
  'FS_mounts',
  'FS_devices',
  'FS_streams',
  'FS_nextInode',
  'FS_nameTable',
  'FS_currentPath',
  'FS_initialized',
  'FS_ignorePermissions',
  'FS_filesystems',
  'FS_syncFSRequests',
  'FS_lookupPath',
  'FS_getPath',
  'FS_hashName',
  'FS_hashAddNode',
  'FS_hashRemoveNode',
  'FS_lookupNode',
  'FS_createNode',
  'FS_destroyNode',
  'FS_isRoot',
  'FS_isMountpoint',
  'FS_isFile',
  'FS_isDir',
  'FS_isLink',
  'FS_isChrdev',
  'FS_isBlkdev',
  'FS_isFIFO',
  'FS_isSocket',
  'FS_flagsToPermissionString',
  'FS_nodePermissions',
  'FS_mayLookup',
  'FS_mayCreate',
  'FS_mayDelete',
  'FS_mayOpen',
  'FS_checkOpExists',
  'FS_nextfd',
  'FS_getStreamChecked',
  'FS_getStream',
  'FS_createStream',
  'FS_closeStream',
  'FS_dupStream',
  'FS_doSetAttr',
  'FS_chrdev_stream_ops',
  'FS_major',
  'FS_minor',
  'FS_makedev',
  'FS_registerDevice',
  'FS_getDevice',
  'FS_getMounts',
  'FS_syncfs',
  'FS_mount',
  'FS_unmount',
  'FS_lookup',
  'FS_mknod',
  'FS_statfs',
  'FS_statfsStream',
  'FS_statfsNode',
  'FS_create',
  'FS_mkdir',
  'FS_mkdev',
  'FS_symlink',
  'FS_link',
  'FS_rename',
  'FS_rmdir',
  'FS_readdir',
  'FS_readlink',
  'FS_stat',
  'FS_fstat',
  'FS_lstat',
  'FS_doChmod',
  'FS_chmod',
  'FS_lchmod',
  'FS_fchmod',
  'FS_doChown',
  'FS_chown',
  'FS_lchown',
  'FS_fchown',
  'FS_doTruncate',
  'FS_truncate',
  'FS_ftruncate',
  'FS_utime',
  'FS_open',
  'FS_close',
  'FS_isClosed',
  'FS_llseek',
  'FS_read',
  'FS_write',
  'FS_mmap',
  'FS_msync',
  'FS_ioctl',
  'FS_writeFile',
  'FS_cwd',
  'FS_chdir',
  'FS_createDefaultDirectories',
  'FS_createDefaultDevices',
  'FS_createSpecialDirectories',
  'FS_createStandardStreams',
  'FS_staticInit',
  'FS_init',
  'FS_quit',
  'FS_analyzePath',
  'FS_createFile',
  'FS_forceLoadFile',
  'MEMFS',
  'TTY',
  'PIPEFS',
  'SOCKFS',
  'tempFixedLengthArray',
  'miniTempWebGLFloatBuffers',
  'miniTempWebGLIntBuffers',
  'heapObjectForWebGLType',
  'toTypedArrayIndex',
  'webgl_enable_WEBGL_multi_draw',
  'webgl_enable_EXT_polygon_offset_clamp',
  'webgl_enable_EXT_clip_control',
  'webgl_enable_WEBGL_polygon_mode',
  'GL',
  'emscriptenWebGLGet',
  'computeUnpackAlignedImageSize',
  'colorChannelsInGlTextureFormat',
  'emscriptenWebGLGetTexPixelData',
  'AL',
  'GLUT',
  'EGL',
  'GLEW',
  'IDBStore',
  'SDL',
  'SDL_gfx',
  'webgl_enable_WEBGL_draw_instanced_base_vertex_base_instance',
  'webgl_enable_WEBGL_multi_draw_instanced_base_vertex_base_instance',
  'GLEmulation',
  'GLImmediate',
  'GLImmediateSetup',
  'print',
  'printErr',
  'jstoi_s',
];
unexportedSymbols.forEach(unexportedRuntimeSymbol);

  // End runtime exports
  // Begin JS library exports
  // End JS library exports

// end include: postlibrary.js

function checkIncomingModuleAPI() {
  ignoredModuleProp('fetchSettings');
  ignoredModuleProp('logReadFiles');
  ignoredModuleProp('loadSplitModule');
  ignoredModuleProp('onMalloc');
  ignoredModuleProp('onRealloc');
  ignoredModuleProp('onFree');
  ignoredModuleProp('onSbrkGrow');
  ignoredModuleProp('onCOSCacheHit');
  ignoredModuleProp('onCOSCacheMiss');
  ignoredModuleProp('onCOSStore');
  ignoredModuleProp('GL_MAX_TEXTURE_IMAGE_UNITS');
  ignoredModuleProp('SDL_canPlayWithWebAudio');
  ignoredModuleProp('SDL_numSimultaneouslyQueuedBuffers');
  ignoredModuleProp('freePreloadedMediaOnUse');
  ignoredModuleProp('preinitializedWebGLContext');
  ignoredModuleProp('keyboardListeningElement');
  ignoredModuleProp('doNotCaptureKeyboard');
  ignoredModuleProp('extraStackTrace');
  ignoredModuleProp('preloadPlugins');
  ignoredModuleProp('preMainLoop');
  ignoredModuleProp('postMainLoop');
  ignoredModuleProp('forcedAspectRatio');
  ignoredModuleProp('mainScriptUrlOrBlob');
  ignoredModuleProp('onFullScreen');
  ignoredModuleProp('INITIAL_MEMORY');
  ignoredModuleProp('wasmMemory');
  ignoredModuleProp('wasmBinary');
}
var ASM_CONSTS = {
  8541612: ($0, $1, $2) => { var m = (typeof GLImmediate !== "undefined" && GLImmediate.matrix) ? GLImmediate.matrix[0] : null; if (!m) return; if (!Module._muMatSaved) Module._muMatSaved = new Float32Array(16); for (var s = 0; s < 16; s++) Module._muMatSaved[s] = m[s]; var p = $0 >> 2; for (var i = 0; i < 16; i++) m[i] = HEAPF32[p + i]; GLImmediate.matrixVersion[0] = (GLImmediate.matrixVersion[0] | 0) + 1; if ($1) { var c = GLImmediate.clientColor; if (!Module._muColSaved) Module._muColSaved = new Float32Array(4); Module._muColSaved[0] = c[0]; Module._muColSaved[1] = c[1]; Module._muColSaved[2] = c[2]; Module._muColSaved[3] = c[3]; var q = $2 >> 2; c[0] = HEAPF32[q]; c[1] = HEAPF32[q + 1]; c[2] = HEAPF32[q + 2]; c[3] = HEAPF32[q + 3]; } },  
 8542335: ($0, $1, $2) => { var n = $1 | 0; var layout = $2 | 0; var stride = layout === 0 ? 24 : (layout === 3 ? 16 : 28); var bytes = (n * stride) | 0; if (typeof GLImmediate === "undefined" || GLImmediate.mode < 0) return 0; if (bytes <= 0 || bytes >= GL.MAX_TEMP_BUFFER_SIZE) return 0; var dst = GLImmediate.vertexDataU8; if (!dst || dst.length < bytes) return 0; dst.set(HEAPU8.subarray($0, ($0 + bytes) | 0)); var F = GLctx.FLOAT; var U = GLctx.UNSIGNED_BYTE; if (layout === 0) { GLImmediate.addRendererComponent(GLImmediate.TEXTURE0, 2, F); GLImmediate.addRendererComponent(GLImmediate.VERTEX, 4, F); } else if (layout === 1) { GLImmediate.addRendererComponent(GLImmediate.TEXTURE0, 2, F); GLImmediate.addRendererComponent(GLImmediate.COLOR, 4, U); GLImmediate.addRendererComponent(GLImmediate.VERTEX, 4, F); } else if (layout === 2) { GLImmediate.addRendererComponent(GLImmediate.COLOR, 4, U); GLImmediate.addRendererComponent(GLImmediate.TEXTURE0, 2, F); GLImmediate.addRendererComponent(GLImmediate.VERTEX, 4, F); } else if (layout === 3) { GLImmediate.addRendererComponent(GLImmediate.VERTEX, 4, F); } else { return 0; } GLImmediate.vertexCounter = bytes >> 2; return 1; },  
 8543493: ($0, $1) => { var m = (typeof GLImmediate !== "undefined" && GLImmediate.matrix) ? GLImmediate.matrix[0] : null; if (m && Module._muMatSaved) { for (var s = 0; s < 16; s++) m[s] = Module._muMatSaved[s]; GLImmediate.matrixVersion[0] = (GLImmediate.matrixVersion[0] | 0) + 1; } if ($0 && GLImmediate.clientColor && Module._muColSaved) { var c = GLImmediate.clientColor; c[0] = Module._muColSaved[0]; c[1] = Module._muColSaved[1]; c[2] = Module._muColSaved[2]; c[3] = Module._muColSaved[3]; } if ($1 && GLImmediate.clientColor) { GLctx.disableVertexAttribArray(GLImmediate.COLOR); GLctx.vertexAttrib4fv(GLImmediate.COLOR, GLImmediate.clientColor); } },  
 8544130: ($0) => { var c = (typeof GLImmediate !== "undefined") ? GLImmediate.clientColor : null; if (!c) return 1; var p = $0 >> 2; for (var i = 0; i < 4; i++) if (c[i] !== HEAPF32[p + i]) return 0; return 1; },  
 8544325: ($0) => { var m = (typeof GLImmediate !== "undefined" && GLImmediate.matrix) ? GLImmediate.matrix[0] : null; if (!m) return 1; var p = $0 >> 2; for (var i = 0; i < 16; i++) if (m[i] !== HEAPF32[p + i]) return 0; return 1; },  
 8544541: ($0) => { var m = (typeof GLImmediate !== "undefined" && GLImmediate.matrix) ? GLImmediate.matrix[0] : null; var p = $0 >> 2; if (!m) { for (var i = 0; i < 16; i++) HEAPF32[p + i] = (i % 5 == 0) ? 1 : 0; return; } for (var i = 0; i < 16; i++) HEAPF32[p + i] = m[i]; },  
 8544801: ($0) => { var c = (typeof GLImmediate !== "undefined") ? GLImmediate.clientColor : null; var p = $0 >> 2; if (!c) { HEAPF32[p] = 1; HEAPF32[p+1] = 1; HEAPF32[p+2] = 1; HEAPF32[p+3] = 1; return; } HEAPF32[p] = c[0]; HEAPF32[p+1] = c[1]; HEAPF32[p+2] = c[2]; HEAPF32[p+3] = c[3]; },  
 8545073: ($0, $1) => { Module._muBatchOpen = $0 ? 1 : 0; Module._muBatchDrawing = $1 ? 1 : 0; },  
 8545148: ($0) => { Module['HEAPU8'] = HEAPU8; if (typeof window !== 'undefined') { window['HEAPU8'] = HEAPU8; } if (typeof window !== 'undefined' && window.soloBridge && window.soloBridge.connect) { window.soloBridge.connect($0); } },  
 8545365: () => { if (typeof window !== 'undefined' && window.soloBridge && window.soloBridge.disconnect) { window.soloBridge.disconnect(); } },  
 8545493: ($0, $1) => { if (typeof window !== 'undefined' && window.soloBridge && window.soloBridge.send) { var data = new Uint8Array(HEAPU8.subarray($0, $0 + $1)); window.soloBridge.send(data); } },  
 8545670: ($0) => { var dpr = window.devicePixelRatio || 1; if (!(dpr > 0)) dpr = 1; var bar = document.getElementById('muTopBar'); var topH = (bar && bar.offsetHeight) ? bar.offsetHeight : 40; var css = $0 ? Math.max(100, window.innerHeight - topH) : window.innerWidth; var n = Math.round(css * dpr); var floor = $0 ? 480 : 640; if (n < floor) n = floor; if (n & 1) n = n - 1; return n; },  
 8546042: ($0, $1) => { try { function param(name) { var q = location.search.length > 1 ? location.search.substring(1) : ""; var parts = q.split("&"); for (var i = 0; i < parts.length; i++) { var cut = parts[i].indexOf("="); var key = decodeURIComponent(cut < 0 ? parts[i] : parts[i].substring(0, cut)); if (key !== name) continue; var val = cut < 0 ? "" : parts[i].substring(cut + 1); try { return decodeURIComponent(val.split("+").join(" ")); } catch (e) { return ""; } } return ""; } function put(text, ptr) { var n = 0; for (var i = 0; i < text.length && n < 10; i++) { var c = text.charCodeAt(i); if (c < 33 || c > 126) continue; HEAPU8[ptr + n] = c; n++; } HEAPU8[ptr + n] = 0; } put(param("u") || param("user"), $0); put(param("p") || param("pass"), $1); } catch (e) {} },  
 8546799: ($0, $1) => { var c = Module.canvas; var bar = document.getElementById('muTopBar'); var topH = (bar && bar.offsetHeight) ? bar.offsetHeight : 40; var availH = Math.max(100, window.innerHeight - topH); c.width = $0; c.height = $1; c.style.position = 'fixed'; c.style.width = window.innerWidth + 'px'; c.style.height = availH + 'px'; c.style.left = '0px'; c.style.top = topH + 'px'; c.style.imageRendering = 'pixelated'; c.style.outline = 'none'; c.style.border = '0'; Module._viewW = window.innerWidth; Module._viewH = availH; if (!Module._pageResizeHook) { Module._pageResizeHook = 1; window.addEventListener('resize', function () { Module._pageDirty = 1; }); } },  
 8547451: () => { return Module._viewW | 0; },  
 8547481: () => { return Module._viewH | 0; },  
 8547511: () => { if (typeof GLImmediate !== 'undefined' && !GLImmediate.matrixVersion) { Browser.useWebGL = true; GLImmediate.init(); } },  
 8547634: () => { return Module._pageDirty ? 1 : 0; },  
 8547672: () => { Module._pageDirty = 0; },  
 8547699: function() { if (Module._wrapDraws) return; Module._wrapDraws = 1; var maxAttribs = GLctx.getParameter(GLctx.MAX_VERTEX_ATTRIBS) | 0; var lastArrayBuffer = null; var bufSizes = new WeakMap(); var bindBuffer = GLctx.bindBuffer; GLctx.bindBuffer = function(target, buffer) { if (target === GLctx.ARRAY_BUFFER) lastArrayBuffer = buffer; return bindBuffer.apply(this, arguments); }; function bufferBytes(buf) { var hit = bufSizes.get(buf); if (hit !== undefined) return hit; var sz = GLctx.getBufferParameter(GLctx.ARRAY_BUFFER, GLctx.BUFFER_SIZE) | 0; bufSizes.set(buf, sz); return sz; } var bufferData = GLctx.bufferData; GLctx.bufferData = function(target, data, usage) { var r = bufferData.apply(this, arguments); if (target === GLctx.ARRAY_BUFFER && lastArrayBuffer) bufSizes.delete(lastArrayBuffer); return r; }; var a = GLctx.drawArrays; var muAttribIds = new Int32Array(4); GLctx.drawArrays = function(mode, first, count) { var prev = lastArrayBuffer; var imm = (typeof GLImmediate !== 'undefined') ? GLImmediate : null; if (imm && imm.clientAttributes && imm.enabledClientAttributes && prev) { var strideNow = imm.stride | 0; muAttribIds[0] = imm.VERTEX; muAttribIds[1] = imm.NORMAL; muAttribIds[2] = imm.COLOR; muAttribIds[3] = imm.TEXTURE0; var bsizeNow = bufferBytes(prev); for (var k = 0; k < 4; k++) { var idx = muAttribIds[k]; if (idx < 0 || idx >= maxAttribs) continue; var attr = imm.clientAttributes[idx]; if (!imm.enabledClientAttributes[idx]) { GLctx.disableVertexAttribArray(idx); continue; } if (!attr || !attr.size || strideNow <= 0) continue; var bytes = attr.sizeBytes | 0; if (!bytes) bytes = 4; var needNow = (attr.offset | 0) + (count > 0 ? (count - 1) * strideNow : 0) + bytes; if (needNow > bsizeNow) { GLctx.disableVertexAttribArray(idx); continue; } GLctx.enableVertexAttribArray(idx); GLctx.vertexAttribPointer(idx, attr.size, attr.type, idx === imm.COLOR || idx === imm.NORMAL, strideNow, attr.offset); } } return a.apply(this, arguments); }; if (typeof GLImmediate !== 'undefined' && GLImmediate.flush && !GLImmediate._muTexFlush) { GLImmediate._muTexFlush = GLImmediate.flush; GLImmediate.flush = function() { var texAttr = GLImmediate.TEXTURE0; var on = GLImmediate.enabledClientAttributes && GLImmediate.enabledClientAttributes[texAttr]; if (on && GLImmediate.TexEnvJIT && GLImmediate.TexEnvJIT.getTexUnitType(0) == 0) GLImmediate.TexEnvJIT.hook_enable(0x0DE1); return GLImmediate._muTexFlush.apply(this, arguments); }; } },  
 8550146: () => { if (typeof GLImmediate !== 'undefined' && !GLImmediate.matrixVersion) { Browser.useWebGL = true; GLImmediate.init(); } },  
 8550269: () => { if (typeof window !== 'undefined' && window.soloExitGame) { window.soloExitGame(); } else if (typeof window !== 'undefined') { window.location.reload(); } },  
 8550428: ($0) => { var key = "mu97k-hwid"; var v = ""; try { v = localStorage.getItem(key) || ""; } catch (e) { v = ""; } if (v.length != 35) { var hex = "0123456789ABCDEF"; var a = ""; var b = ""; var c = ""; var d = ""; var p = 0; while (p < 4) { var s = ""; var buf = new Uint8Array(4); crypto.getRandomValues(buf); var i = 0; while (i < 4) { s = s + hex[buf[i] >> 4] + hex[buf[i] & 15]; i = i + 1; } if (p == 0) a = s; if (p == 1) b = s; if (p == 2) c = s; if (p == 3) d = s; p = p + 1; } v = a + "-" + b + "-" + c + "-" + d; try { localStorage.setItem(key, v); } catch (e2) {} } var n = v.length; if (n > 35) n = 35; var j = 0; while (j < n) { setValue($0 + j, v.charCodeAt(j), "i8"); j = j + 1; } setValue($0 + n, 0, "i8"); },  
 8551143: () => { if (typeof window !== 'undefined' && window.soloExitGame) { window.soloExitGame(); } else if (typeof window !== 'undefined') { window.location.reload(); } },  
 8551302: ($0, $1, $2, $3, $4) => { if (typeof window === 'undefined' || (window.AudioContext || window.webkitAudioContext) === undefined) { return 0; } if (typeof(window.miniaudio) === 'undefined') { window.miniaudio = { referenceCount: 0 }; window.miniaudio.device_type = {}; window.miniaudio.device_type.playback = $0; window.miniaudio.device_type.capture = $1; window.miniaudio.device_type.duplex = $2; window.miniaudio.device_state = {}; window.miniaudio.device_state.stopped = $3; window.miniaudio.device_state.started = $4; let miniaudio = window.miniaudio; miniaudio.devices = []; miniaudio.track_device = function(device) { for (var iDevice = 0; iDevice < miniaudio.devices.length; ++iDevice) { if (miniaudio.devices[iDevice] == null) { miniaudio.devices[iDevice] = device; return iDevice; } } miniaudio.devices.push(device); return miniaudio.devices.length - 1; }; miniaudio.untrack_device_by_index = function(deviceIndex) { miniaudio.devices[deviceIndex] = null; while (miniaudio.devices.length > 0) { if (miniaudio.devices[miniaudio.devices.length-1] == null) { miniaudio.devices.pop(); } else { break; } } }; miniaudio.untrack_device = function(device) { for (var iDevice = 0; iDevice < miniaudio.devices.length; ++iDevice) { if (miniaudio.devices[iDevice] == device) { return miniaudio.untrack_device_by_index(iDevice); } } }; miniaudio.get_device_by_index = function(deviceIndex) { return miniaudio.devices[deviceIndex]; }; miniaudio.unlock_event_types = (function(){ return ['touchend', 'click']; })(); miniaudio.unlock = function() { for(var i = 0; i < miniaudio.devices.length; ++i) { var device = miniaudio.devices[i]; if (device != null && device.webaudio != null && device.state === miniaudio.device_state.started) { device.webaudio.resume().then(() => { _ma_device__on_notification_unlocked(device.pDevice); }, (error) => {console.error("Failed to resume audiocontext", error); }); } } miniaudio.unlock_event_types.map(function(event_type) { document.removeEventListener(event_type, miniaudio.unlock, true); }); }; miniaudio.unlock_event_types.map(function(event_type) { document.addEventListener(event_type, miniaudio.unlock, true); }); } window.miniaudio.referenceCount += 1; return 1; },  
 8553480: () => { if (typeof(window.miniaudio) !== 'undefined') { window.miniaudio.unlock_event_types.map(function(event_type) { document.removeEventListener(event_type, window.miniaudio.unlock, true); }); window.miniaudio.referenceCount -= 1; if (window.miniaudio.referenceCount === 0) { delete window.miniaudio; } } },  
 8553784: () => { return (navigator.mediaDevices !== undefined && navigator.mediaDevices.getUserMedia !== undefined); },  
 8553888: () => { try { var temp = new (window.AudioContext || window.webkitAudioContext)(); var sampleRate = temp.sampleRate; temp.close(); return sampleRate; } catch(e) { return 0; } },  
 8554059: ($0, $1, $2, $3, $4, $5) => { var deviceType = $0; var channels = $1; var sampleRate = $2; var bufferSize = $3; var pIntermediaryBuffer = $4; var pDevice = $5; if (typeof(window.miniaudio) === 'undefined') { return -1; } var device = {}; var audioContextOptions = {}; if (deviceType == window.miniaudio.device_type.playback && sampleRate != 0) { audioContextOptions.sampleRate = sampleRate; } device.webaudio = new (window.AudioContext || window.webkitAudioContext)(audioContextOptions); device.webaudio.suspend(); device.state = window.miniaudio.device_state.stopped; var channelCountIn = 0; var channelCountOut = channels; if (deviceType != window.miniaudio.device_type.playback) { channelCountIn = channels; } device.scriptNode = device.webaudio.createScriptProcessor(bufferSize, channelCountIn, channelCountOut); device.scriptNode.onaudioprocess = function(e) { if (device.intermediaryBufferView == null || device.intermediaryBufferView.length == 0) { device.intermediaryBufferView = new Float32Array(HEAPF32.buffer, pIntermediaryBuffer, bufferSize * channels); } if (deviceType == window.miniaudio.device_type.capture || deviceType == window.miniaudio.device_type.duplex) { for (var iChannel = 0; iChannel < channels; iChannel += 1) { var inputBuffer = e.inputBuffer.getChannelData(iChannel); var intermediaryBuffer = device.intermediaryBufferView; for (var iFrame = 0; iFrame < bufferSize; iFrame += 1) { intermediaryBuffer[iFrame*channels + iChannel] = inputBuffer[iFrame]; } } _ma_device_process_pcm_frames_capture__webaudio(pDevice, bufferSize, pIntermediaryBuffer); } if (deviceType == window.miniaudio.device_type.playback || deviceType == window.miniaudio.device_type.duplex) { _ma_device_process_pcm_frames_playback__webaudio(pDevice, bufferSize, pIntermediaryBuffer); for (var iChannel = 0; iChannel < e.outputBuffer.numberOfChannels; ++iChannel) { var outputBuffer = e.outputBuffer.getChannelData(iChannel); var intermediaryBuffer = device.intermediaryBufferView; for (var iFrame = 0; iFrame < bufferSize; iFrame += 1) { outputBuffer[iFrame] = intermediaryBuffer[iFrame*channels + iChannel]; } } } else { for (var iChannel = 0; iChannel < e.outputBuffer.numberOfChannels; ++iChannel) { e.outputBuffer.getChannelData(iChannel).fill(0.0); } } }; if (deviceType == window.miniaudio.device_type.capture || deviceType == window.miniaudio.device_type.duplex) { navigator.mediaDevices.getUserMedia({audio:true, video:false}) .then(function(stream) { device.streamNode = device.webaudio.createMediaStreamSource(stream); device.streamNode.connect(device.scriptNode); device.scriptNode.connect(device.webaudio.destination); }) .catch(function(error) { console.log("Failed to get user media: " + error); }); } if (deviceType == window.miniaudio.device_type.playback) { device.scriptNode.connect(device.webaudio.destination); } device.pDevice = pDevice; return window.miniaudio.track_device(device); },  
 8556936: ($0) => { return window.miniaudio.get_device_by_index($0).webaudio.sampleRate; },  
 8557009: ($0) => { var device = window.miniaudio.get_device_by_index($0); if (device.scriptNode !== undefined) { device.scriptNode.onaudioprocess = function(e) {}; device.scriptNode.disconnect(); device.scriptNode = undefined; } if (device.streamNode !== undefined) { device.streamNode.disconnect(); device.streamNode = undefined; } device.webaudio.close(); device.webaudio = undefined; device.pDevice = undefined; },  
 8557409: ($0) => { window.miniaudio.untrack_device_by_index($0); },  
 8557459: ($0) => { var device = window.miniaudio.get_device_by_index($0); device.webaudio.resume(); device.state = window.miniaudio.device_state.started; },  
 8557598: ($0) => { var device = window.miniaudio.get_device_by_index($0); device.webaudio.suspend(); device.state = window.miniaudio.device_state.stopped; },  
 8557738: ($0, $1, $2, $3, $4, $5, $6, $7, $8, $9) => { var w = $1; var cell = $2; var fontPx = $3; var c = document.createElement('canvas'); c.width = w; c.height = w; var g = c.getContext('2d'); g.clearRect(0, 0, w, w); g.fillStyle = '#ffffff'; var face = UTF8ToString($6); if (!face) face = 'Arial'; g.font = ($9 ? 'italic ' : 'normal ') + ($8 ? 'bold ' : '400 ') + fontPx + 'px "' + face + '"'; g.textBaseline = 'alphabetic'; var adv = $4; var base = $5; for (var ch = 32; ch < 256; ch++) { var col = ch % 16; var row = (ch / 16) | 0; g.fillText(String.fromCharCode(ch), col * cell, row * cell + base); var measured = g.measureText(String.fromCharCode(ch)).width; var iw = (measured + 0.5) | 0; if (iw < 1) iw = 1; if (iw > cell - 1) iw = cell - 1; HEAPU8[adv + ch] = iw; } var img = g.getImageData(0, 0, w, w); if ($7) { var d = img.data; var cut = $8 ? 150 : 200; for (var i = 3; i < d.length; i += 4) { var on = d[i] >= cut ? 255 : 0; d[i - 3] = on; d[i - 2] = on; d[i - 1] = on; d[i] = on; } } HEAPU8.set(img.data, $0); }
};

// Imports from the Wasm binary.
var _mu_mesh_flush = Module['_mu_mesh_flush'] = makeInvalidEarlyAccess('_mu_mesh_flush');
var _malloc = makeInvalidEarlyAccess('_malloc');
var _mu_net_get_push_buffer = Module['_mu_net_get_push_buffer'] = makeInvalidEarlyAccess('_mu_net_get_push_buffer');
var _mu_net_push_packet = Module['_mu_net_push_packet'] = makeInvalidEarlyAccess('_mu_net_push_packet');
var _fflush = makeInvalidEarlyAccess('_fflush');
var _mu_net_push_bytes = Module['_mu_net_push_bytes'] = makeInvalidEarlyAccess('_mu_net_push_bytes');
var _mu_net_push_disconnect = Module['_mu_net_push_disconnect'] = makeInvalidEarlyAccess('_mu_net_push_disconnect');
var _mu_key = Module['_mu_key'] = makeInvalidEarlyAccess('_mu_key');
var _mu_stick = Module['_mu_stick'] = makeInvalidEarlyAccess('_mu_stick');
var _mu_rbutton = Module['_mu_rbutton'] = makeInvalidEarlyAccess('_mu_rbutton');
var _mu_auto_attack = Module['_mu_auto_attack'] = makeInvalidEarlyAccess('_mu_auto_attack');
var _mu_get_auto_attack = Module['_mu_get_auto_attack'] = makeInvalidEarlyAccess('_mu_get_auto_attack');
var _mu_cursor = Module['_mu_cursor'] = makeInvalidEarlyAccess('_mu_cursor');
var _mu_audible = Module['_mu_audible'] = makeInvalidEarlyAccess('_mu_audible');
var _mu_lbutton = Module['_mu_lbutton'] = makeInvalidEarlyAccess('_mu_lbutton');
var _main = Module['_main'] = makeInvalidEarlyAccess('_main');
var _ma_device__on_notification_unlocked = Module['_ma_device__on_notification_unlocked'] = makeInvalidEarlyAccess('_ma_device__on_notification_unlocked');
var _ma_malloc_emscripten = Module['_ma_malloc_emscripten'] = makeInvalidEarlyAccess('_ma_malloc_emscripten');
var _ma_free_emscripten = Module['_ma_free_emscripten'] = makeInvalidEarlyAccess('_ma_free_emscripten');
var _ma_device_process_pcm_frames_capture__webaudio = Module['_ma_device_process_pcm_frames_capture__webaudio'] = makeInvalidEarlyAccess('_ma_device_process_pcm_frames_capture__webaudio');
var _ma_device_process_pcm_frames_playback__webaudio = Module['_ma_device_process_pcm_frames_playback__webaudio'] = makeInvalidEarlyAccess('_ma_device_process_pcm_frames_playback__webaudio');
var _emscripten_stack_get_end = makeInvalidEarlyAccess('_emscripten_stack_get_end');
var _emscripten_stack_get_base = makeInvalidEarlyAccess('_emscripten_stack_get_base');
var _strerror = makeInvalidEarlyAccess('_strerror');
var _setThrew = makeInvalidEarlyAccess('_setThrew');
var _emscripten_stack_init = makeInvalidEarlyAccess('_emscripten_stack_init');
var _emscripten_stack_get_free = makeInvalidEarlyAccess('_emscripten_stack_get_free');
var __emscripten_stack_restore = makeInvalidEarlyAccess('__emscripten_stack_restore');
var __emscripten_stack_alloc = makeInvalidEarlyAccess('__emscripten_stack_alloc');
var _emscripten_stack_get_current = makeInvalidEarlyAccess('_emscripten_stack_get_current');
var dynCall_iii = makeInvalidEarlyAccess('dynCall_iii');
var dynCall_ii = makeInvalidEarlyAccess('dynCall_ii');
var dynCall_iiii = makeInvalidEarlyAccess('dynCall_iiii');
var dynCall_v = makeInvalidEarlyAccess('dynCall_v');
var dynCall_vii = makeInvalidEarlyAccess('dynCall_vii');
var dynCall_vi = makeInvalidEarlyAccess('dynCall_vi');
var dynCall_viiiii = makeInvalidEarlyAccess('dynCall_viiiii');
var dynCall_viiiiiii = makeInvalidEarlyAccess('dynCall_viiiiiii');
var dynCall_viiii = makeInvalidEarlyAccess('dynCall_viiii');
var dynCall_viii = makeInvalidEarlyAccess('dynCall_viii');
var dynCall_iiiiii = makeInvalidEarlyAccess('dynCall_iiiiii');
var dynCall_iiiiiii = makeInvalidEarlyAccess('dynCall_iiiiiii');
var dynCall_iiiii = makeInvalidEarlyAccess('dynCall_iiiii');
var dynCall_viiiiiiiii = makeInvalidEarlyAccess('dynCall_viiiiiiiii');
var dynCall_iiji = makeInvalidEarlyAccess('dynCall_iiji');
var dynCall_iiiji = makeInvalidEarlyAccess('dynCall_iiiji');
var dynCall_iij = makeInvalidEarlyAccess('dynCall_iij');
var dynCall_jii = makeInvalidEarlyAccess('dynCall_jii');
var dynCall_iiiiiiiii = makeInvalidEarlyAccess('dynCall_iiiiiiiii');
var dynCall_viiiiii = makeInvalidEarlyAccess('dynCall_viiiiii');
var dynCall_jiji = makeInvalidEarlyAccess('dynCall_jiji');
var dynCall_iidiiiii = makeInvalidEarlyAccess('dynCall_iidiiiii');
var memory = makeInvalidEarlyAccess('memory');
var __indirect_function_table = makeInvalidEarlyAccess('__indirect_function_table');
var wasmMemory = makeInvalidEarlyAccess('wasmMemory');
var wasmTable = makeInvalidEarlyAccess('wasmTable');

function assignWasmExports(wasmExports) {
  assert(typeof wasmExports['mu_mesh_flush'] != 'undefined', 'missing Wasm export: mu_mesh_flush');
  assert(typeof wasmExports['malloc'] != 'undefined', 'missing Wasm export: malloc');
  assert(typeof wasmExports['mu_net_get_push_buffer'] != 'undefined', 'missing Wasm export: mu_net_get_push_buffer');
  assert(typeof wasmExports['mu_net_push_packet'] != 'undefined', 'missing Wasm export: mu_net_push_packet');
  assert(typeof wasmExports['fflush'] != 'undefined', 'missing Wasm export: fflush');
  assert(typeof wasmExports['mu_net_push_bytes'] != 'undefined', 'missing Wasm export: mu_net_push_bytes');
  assert(typeof wasmExports['mu_net_push_disconnect'] != 'undefined', 'missing Wasm export: mu_net_push_disconnect');
  assert(typeof wasmExports['mu_key'] != 'undefined', 'missing Wasm export: mu_key');
  assert(typeof wasmExports['mu_stick'] != 'undefined', 'missing Wasm export: mu_stick');
  assert(typeof wasmExports['mu_rbutton'] != 'undefined', 'missing Wasm export: mu_rbutton');
  assert(typeof wasmExports['mu_auto_attack'] != 'undefined', 'missing Wasm export: mu_auto_attack');
  assert(typeof wasmExports['mu_get_auto_attack'] != 'undefined', 'missing Wasm export: mu_get_auto_attack');
  assert(typeof wasmExports['mu_cursor'] != 'undefined', 'missing Wasm export: mu_cursor');
  assert(typeof wasmExports['mu_audible'] != 'undefined', 'missing Wasm export: mu_audible');
  assert(typeof wasmExports['mu_lbutton'] != 'undefined', 'missing Wasm export: mu_lbutton');
  assert(typeof wasmExports['main'] != 'undefined', 'missing Wasm export: main');
  assert(typeof wasmExports['ma_device__on_notification_unlocked'] != 'undefined', 'missing Wasm export: ma_device__on_notification_unlocked');
  assert(typeof wasmExports['ma_malloc_emscripten'] != 'undefined', 'missing Wasm export: ma_malloc_emscripten');
  assert(typeof wasmExports['ma_free_emscripten'] != 'undefined', 'missing Wasm export: ma_free_emscripten');
  assert(typeof wasmExports['ma_device_process_pcm_frames_capture__webaudio'] != 'undefined', 'missing Wasm export: ma_device_process_pcm_frames_capture__webaudio');
  assert(typeof wasmExports['ma_device_process_pcm_frames_playback__webaudio'] != 'undefined', 'missing Wasm export: ma_device_process_pcm_frames_playback__webaudio');
  assert(typeof wasmExports['emscripten_stack_get_end'] != 'undefined', 'missing Wasm export: emscripten_stack_get_end');
  assert(typeof wasmExports['emscripten_stack_get_base'] != 'undefined', 'missing Wasm export: emscripten_stack_get_base');
  assert(typeof wasmExports['strerror'] != 'undefined', 'missing Wasm export: strerror');
  assert(typeof wasmExports['setThrew'] != 'undefined', 'missing Wasm export: setThrew');
  assert(typeof wasmExports['emscripten_stack_init'] != 'undefined', 'missing Wasm export: emscripten_stack_init');
  assert(typeof wasmExports['emscripten_stack_get_free'] != 'undefined', 'missing Wasm export: emscripten_stack_get_free');
  assert(typeof wasmExports['_emscripten_stack_restore'] != 'undefined', 'missing Wasm export: _emscripten_stack_restore');
  assert(typeof wasmExports['_emscripten_stack_alloc'] != 'undefined', 'missing Wasm export: _emscripten_stack_alloc');
  assert(typeof wasmExports['emscripten_stack_get_current'] != 'undefined', 'missing Wasm export: emscripten_stack_get_current');
  assert(typeof wasmExports['dynCall_iii'] != 'undefined', 'missing Wasm export: dynCall_iii');
  assert(typeof wasmExports['dynCall_ii'] != 'undefined', 'missing Wasm export: dynCall_ii');
  assert(typeof wasmExports['dynCall_iiii'] != 'undefined', 'missing Wasm export: dynCall_iiii');
  assert(typeof wasmExports['dynCall_v'] != 'undefined', 'missing Wasm export: dynCall_v');
  assert(typeof wasmExports['dynCall_vii'] != 'undefined', 'missing Wasm export: dynCall_vii');
  assert(typeof wasmExports['dynCall_vi'] != 'undefined', 'missing Wasm export: dynCall_vi');
  assert(typeof wasmExports['dynCall_viiiii'] != 'undefined', 'missing Wasm export: dynCall_viiiii');
  assert(typeof wasmExports['dynCall_viiiiiii'] != 'undefined', 'missing Wasm export: dynCall_viiiiiii');
  assert(typeof wasmExports['dynCall_viiii'] != 'undefined', 'missing Wasm export: dynCall_viiii');
  assert(typeof wasmExports['dynCall_viii'] != 'undefined', 'missing Wasm export: dynCall_viii');
  assert(typeof wasmExports['dynCall_iiiiii'] != 'undefined', 'missing Wasm export: dynCall_iiiiii');
  assert(typeof wasmExports['dynCall_iiiiiii'] != 'undefined', 'missing Wasm export: dynCall_iiiiiii');
  assert(typeof wasmExports['dynCall_iiiii'] != 'undefined', 'missing Wasm export: dynCall_iiiii');
  assert(typeof wasmExports['dynCall_viiiiiiiii'] != 'undefined', 'missing Wasm export: dynCall_viiiiiiiii');
  assert(typeof wasmExports['dynCall_iiji'] != 'undefined', 'missing Wasm export: dynCall_iiji');
  assert(typeof wasmExports['dynCall_iiiji'] != 'undefined', 'missing Wasm export: dynCall_iiiji');
  assert(typeof wasmExports['dynCall_iij'] != 'undefined', 'missing Wasm export: dynCall_iij');
  assert(typeof wasmExports['dynCall_jii'] != 'undefined', 'missing Wasm export: dynCall_jii');
  assert(typeof wasmExports['dynCall_iiiiiiiii'] != 'undefined', 'missing Wasm export: dynCall_iiiiiiiii');
  assert(typeof wasmExports['dynCall_viiiiii'] != 'undefined', 'missing Wasm export: dynCall_viiiiii');
  assert(typeof wasmExports['dynCall_jiji'] != 'undefined', 'missing Wasm export: dynCall_jiji');
  assert(typeof wasmExports['dynCall_iidiiiii'] != 'undefined', 'missing Wasm export: dynCall_iidiiiii');
  assert(typeof wasmExports['memory'] != 'undefined', 'missing Wasm export: memory');
  assert(typeof wasmExports['__indirect_function_table'] != 'undefined', 'missing Wasm export: __indirect_function_table');
  _mu_mesh_flush = Module['_mu_mesh_flush'] = createExportWrapper('mu_mesh_flush', wasmExports['mu_mesh_flush'], 0);
  _malloc = createExportWrapper('malloc', wasmExports['malloc'], 1);
  _mu_net_get_push_buffer = Module['_mu_net_get_push_buffer'] = createExportWrapper('mu_net_get_push_buffer', wasmExports['mu_net_get_push_buffer'], 0);
  _mu_net_push_packet = Module['_mu_net_push_packet'] = createExportWrapper('mu_net_push_packet', wasmExports['mu_net_push_packet'], 1);
  _fflush = createExportWrapper('fflush', wasmExports['fflush'], 1);
  _mu_net_push_bytes = Module['_mu_net_push_bytes'] = createExportWrapper('mu_net_push_bytes', wasmExports['mu_net_push_bytes'], 2);
  _mu_net_push_disconnect = Module['_mu_net_push_disconnect'] = createExportWrapper('mu_net_push_disconnect', wasmExports['mu_net_push_disconnect'], 0);
  _mu_key = Module['_mu_key'] = createExportWrapper('mu_key', wasmExports['mu_key'], 3);
  _mu_stick = Module['_mu_stick'] = createExportWrapper('mu_stick', wasmExports['mu_stick'], 2);
  _mu_rbutton = Module['_mu_rbutton'] = createExportWrapper('mu_rbutton', wasmExports['mu_rbutton'], 1);
  _mu_auto_attack = Module['_mu_auto_attack'] = createExportWrapper('mu_auto_attack', wasmExports['mu_auto_attack'], 1);
  _mu_get_auto_attack = Module['_mu_get_auto_attack'] = createExportWrapper('mu_get_auto_attack', wasmExports['mu_get_auto_attack'], 0);
  _mu_cursor = Module['_mu_cursor'] = createExportWrapper('mu_cursor', wasmExports['mu_cursor'], 2);
  _mu_audible = Module['_mu_audible'] = createExportWrapper('mu_audible', wasmExports['mu_audible'], 1);
  _mu_lbutton = Module['_mu_lbutton'] = createExportWrapper('mu_lbutton', wasmExports['mu_lbutton'], 1);
  _main = Module['_main'] = createExportWrapper('main', wasmExports['main'], 2);
  _ma_device__on_notification_unlocked = Module['_ma_device__on_notification_unlocked'] = createExportWrapper('ma_device__on_notification_unlocked', wasmExports['ma_device__on_notification_unlocked'], 1);
  _ma_malloc_emscripten = Module['_ma_malloc_emscripten'] = createExportWrapper('ma_malloc_emscripten', wasmExports['ma_malloc_emscripten'], 2);
  _ma_free_emscripten = Module['_ma_free_emscripten'] = createExportWrapper('ma_free_emscripten', wasmExports['ma_free_emscripten'], 2);
  _ma_device_process_pcm_frames_capture__webaudio = Module['_ma_device_process_pcm_frames_capture__webaudio'] = createExportWrapper('ma_device_process_pcm_frames_capture__webaudio', wasmExports['ma_device_process_pcm_frames_capture__webaudio'], 3);
  _ma_device_process_pcm_frames_playback__webaudio = Module['_ma_device_process_pcm_frames_playback__webaudio'] = createExportWrapper('ma_device_process_pcm_frames_playback__webaudio', wasmExports['ma_device_process_pcm_frames_playback__webaudio'], 3);
  _emscripten_stack_get_end = wasmExports['emscripten_stack_get_end'];
  _emscripten_stack_get_base = wasmExports['emscripten_stack_get_base'];
  _strerror = createExportWrapper('strerror', wasmExports['strerror'], 1);
  _setThrew = createExportWrapper('setThrew', wasmExports['setThrew'], 2);
  _emscripten_stack_init = wasmExports['emscripten_stack_init'];
  _emscripten_stack_get_free = wasmExports['emscripten_stack_get_free'];
  __emscripten_stack_restore = wasmExports['_emscripten_stack_restore'];
  __emscripten_stack_alloc = wasmExports['_emscripten_stack_alloc'];
  _emscripten_stack_get_current = wasmExports['emscripten_stack_get_current'];
  dynCall_iii = createExportWrapper('dynCall_iii', wasmExports['dynCall_iii'], 3);
  dynCall_ii = createExportWrapper('dynCall_ii', wasmExports['dynCall_ii'], 2);
  dynCall_iiii = createExportWrapper('dynCall_iiii', wasmExports['dynCall_iiii'], 4);
  dynCall_v = createExportWrapper('dynCall_v', wasmExports['dynCall_v'], 1);
  dynCall_vii = createExportWrapper('dynCall_vii', wasmExports['dynCall_vii'], 3);
  dynCall_vi = createExportWrapper('dynCall_vi', wasmExports['dynCall_vi'], 2);
  dynCall_viiiii = createExportWrapper('dynCall_viiiii', wasmExports['dynCall_viiiii'], 6);
  dynCall_viiiiiii = createExportWrapper('dynCall_viiiiiii', wasmExports['dynCall_viiiiiii'], 8);
  dynCall_viiii = createExportWrapper('dynCall_viiii', wasmExports['dynCall_viiii'], 5);
  dynCall_viii = createExportWrapper('dynCall_viii', wasmExports['dynCall_viii'], 4);
  dynCall_iiiiii = createExportWrapper('dynCall_iiiiii', wasmExports['dynCall_iiiiii'], 6);
  dynCall_iiiiiii = createExportWrapper('dynCall_iiiiiii', wasmExports['dynCall_iiiiiii'], 7);
  dynCall_iiiii = createExportWrapper('dynCall_iiiii', wasmExports['dynCall_iiiii'], 5);
  dynCall_viiiiiiiii = createExportWrapper('dynCall_viiiiiiiii', wasmExports['dynCall_viiiiiiiii'], 10);
  dynCall_iiji = createExportWrapper('dynCall_iiji', wasmExports['dynCall_iiji'], 4);
  dynCall_iiiji = createExportWrapper('dynCall_iiiji', wasmExports['dynCall_iiiji'], 5);
  dynCall_iij = createExportWrapper('dynCall_iij', wasmExports['dynCall_iij'], 3);
  dynCall_jii = createExportWrapper('dynCall_jii', wasmExports['dynCall_jii'], 3);
  dynCall_iiiiiiiii = createExportWrapper('dynCall_iiiiiiiii', wasmExports['dynCall_iiiiiiiii'], 9);
  dynCall_viiiiii = createExportWrapper('dynCall_viiiiii', wasmExports['dynCall_viiiiii'], 7);
  dynCall_jiji = createExportWrapper('dynCall_jiji', wasmExports['dynCall_jiji'], 4);
  dynCall_iidiiiii = createExportWrapper('dynCall_iidiiiii', wasmExports['dynCall_iidiiiii'], 8);
  memory = wasmMemory = wasmExports['memory'];
  __indirect_function_table = wasmTable = wasmExports['__indirect_function_table'];
}

var wasmImports = {
  /** @export */
  __assert_fail: ___assert_fail,
  /** @export */
  __cxa_throw: ___cxa_throw,
  /** @export */
  __syscall_fcntl64: ___syscall_fcntl64,
  /** @export */
  __syscall_fstat64: ___syscall_fstat64,
  /** @export */
  __syscall_ioctl: ___syscall_ioctl,
  /** @export */
  __syscall_lstat64: ___syscall_lstat64,
  /** @export */
  __syscall_newfstatat: ___syscall_newfstatat,
  /** @export */
  __syscall_openat: ___syscall_openat,
  /** @export */
  __syscall_stat64: ___syscall_stat64,
  /** @export */
  __syscall_unlinkat: ___syscall_unlinkat,
  /** @export */
  _abort_js: __abort_js,
  /** @export */
  _emscripten_throw_longjmp: __emscripten_throw_longjmp,
  /** @export */
  clock_time_get: _clock_time_get,
  /** @export */
  emscripten_asm_const_int: _emscripten_asm_const_int,
  /** @export */
  emscripten_cancel_main_loop: _emscripten_cancel_main_loop,
  /** @export */
  emscripten_date_now: _emscripten_date_now,
  /** @export */
  emscripten_get_now: _emscripten_get_now,
  /** @export */
  emscripten_resize_heap: _emscripten_resize_heap,
  /** @export */
  emscripten_set_click_callback_on_thread: _emscripten_set_click_callback_on_thread,
  /** @export */
  emscripten_set_keydown_callback_on_thread: _emscripten_set_keydown_callback_on_thread,
  /** @export */
  emscripten_set_keyup_callback_on_thread: _emscripten_set_keyup_callback_on_thread,
  /** @export */
  emscripten_set_main_loop: _emscripten_set_main_loop,
  /** @export */
  emscripten_set_mousedown_callback_on_thread: _emscripten_set_mousedown_callback_on_thread,
  /** @export */
  emscripten_set_mousemove_callback_on_thread: _emscripten_set_mousemove_callback_on_thread,
  /** @export */
  emscripten_set_mouseup_callback_on_thread: _emscripten_set_mouseup_callback_on_thread,
  /** @export */
  emscripten_webgl_create_context: _emscripten_webgl_create_context,
  /** @export */
  emscripten_webgl_destroy_context: _emscripten_webgl_destroy_context,
  /** @export */
  emscripten_webgl_make_context_current: _emscripten_webgl_make_context_current,
  /** @export */
  environ_get: _environ_get,
  /** @export */
  environ_sizes_get: _environ_sizes_get,
  /** @export */
  exit: _exit,
  /** @export */
  fd_close: _fd_close,
  /** @export */
  fd_read: _fd_read,
  /** @export */
  fd_seek: _fd_seek,
  /** @export */
  fd_write: _fd_write,
  /** @export */
  glAlphaFunc: _glAlphaFunc,
  /** @export */
  glBegin: _glBegin,
  /** @export */
  glBindTexture: _glBindTexture,
  /** @export */
  glBlendFunc: _glBlendFunc,
  /** @export */
  glClear: _glClear,
  /** @export */
  glClearColor: _glClearColor,
  /** @export */
  glColor3f: _glColor3f,
  /** @export */
  glColor3fv: _glColor3fv,
  /** @export */
  glColor4f: _glColor4f,
  /** @export */
  glColor4fv: _glColor4fv,
  /** @export */
  glColor4ub: _glColor4ub,
  /** @export */
  glDeleteTextures: _glDeleteTextures,
  /** @export */
  glDepthFunc: _glDepthFunc,
  /** @export */
  glDepthMask: _glDepthMask,
  /** @export */
  glDisable: _glDisable,
  /** @export */
  glEnable: _glEnable,
  /** @export */
  glEnd: _glEnd,
  /** @export */
  glFlush: _glFlush,
  /** @export */
  glFogf: _glFogf,
  /** @export */
  glFogfv: _glFogfv,
  /** @export */
  glFogi: _glFogi,
  /** @export */
  glGenTextures: _glGenTextures,
  /** @export */
  glGetError: _glGetError,
  /** @export */
  glGetFloatv: _glGetFloatv,
  /** @export */
  glGetIntegerv: _glGetIntegerv,
  /** @export */
  glIsEnabled: _glIsEnabled,
  /** @export */
  glLoadIdentity: _glLoadIdentity,
  /** @export */
  glMatrixMode: _glMatrixMode,
  /** @export */
  glPixelStorei: _glPixelStorei,
  /** @export */
  glPopMatrix: _glPopMatrix,
  /** @export */
  glPushMatrix: _glPushMatrix,
  /** @export */
  glReadPixels: _glReadPixels,
  /** @export */
  glRotatef: _glRotatef,
  /** @export */
  glScissor: _glScissor,
  /** @export */
  glTexCoord2f: _glTexCoord2f,
  /** @export */
  glTexEnvf: _glTexEnvf,
  /** @export */
  glTexImage2D: _glTexImage2D,
  /** @export */
  glTexParameterfv: _glTexParameterfv,
  /** @export */
  glTexParameteri: _glTexParameteri,
  /** @export */
  glTranslatef: _glTranslatef,
  /** @export */
  glVertex2f: _glVertex2f,
  /** @export */
  glVertex3f: _glVertex3f,
  /** @export */
  glVertex3fv: _glVertex3fv,
  /** @export */
  glViewport: _glViewport,
  /** @export */
  gluOrtho2D: _gluOrtho2D,
  /** @export */
  gluPerspective: _gluPerspective,
  /** @export */
  invoke_ii,
  /** @export */
  invoke_iii,
  /** @export */
  invoke_iiii,
  /** @export */
  invoke_iiiii,
  /** @export */
  invoke_vi,
  /** @export */
  invoke_vii,
  /** @export */
  invoke_viii,
  /** @export */
  invoke_viiiiiiiii
};

function invoke_iii(index,a1,a2) {
  var sp = stackSave();
  try {
    return dynCall_iii(index,a1,a2);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_ii(index,a1) {
  var sp = stackSave();
  try {
    return dynCall_ii(index,a1);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_viii(index,a1,a2,a3) {
  var sp = stackSave();
  try {
    dynCall_viii(index,a1,a2,a3);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_vii(index,a1,a2) {
  var sp = stackSave();
  try {
    dynCall_vii(index,a1,a2);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_vi(index,a1) {
  var sp = stackSave();
  try {
    dynCall_vi(index,a1);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_iiiii(index,a1,a2,a3,a4) {
  var sp = stackSave();
  try {
    return dynCall_iiiii(index,a1,a2,a3,a4);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_iiii(index,a1,a2,a3) {
  var sp = stackSave();
  try {
    return dynCall_iiii(index,a1,a2,a3);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_viiiiiiiii(index,a1,a2,a3,a4,a5,a6,a7,a8,a9) {
  var sp = stackSave();
  try {
    dynCall_viiiiiiiii(index,a1,a2,a3,a4,a5,a6,a7,a8,a9);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}


// include: postamble.js
// === Auto-generated postamble setup entry stuff ===

var calledRun;

function callMain() {
  assert(runDependencies == 0, 'cannot call main when async dependencies remain! (listen on Module["onRuntimeInitialized"])');
  assert(typeof onPreRuns === 'undefined' || onPreRuns.length == 0, 'cannot call main when preRun functions remain to be called');

  var entryFunction = _main;

  var argc = 0;
  var argv = 0;

  try {

    var ret = entryFunction(argc, argv);

    // if we're not running an evented main loop, it's time to exit
    exitJS(ret, /* implicit = */ true);
    return ret;
  } catch (e) {
    return handleException(e);
  }
}

function stackCheckInit() {
  // This is normally called automatically during __wasm_call_ctors but need to
  // get these values before even running any of the ctors so we call it redundantly
  // here.
  _emscripten_stack_init();
  // TODO(sbc): Move writeStackCookie to native to to avoid this.
  writeStackCookie();
}

async function run() {
  assert(!calledRun);
  calledRun = true;

  stackCheckInit();

  preRun();

  if (runDependencies) {
    await resolveRunDependencies();
  }

  var setStatus = Module['setStatus'];
  if (setStatus) {
    setStatus('Running...');
    // Yield to the event loop to allow the browser to paint "Running..."
    await new Promise((resolve) => setTimeout(resolve, 1));
    // Then we want to clear the status text, but only after the rest of this function runs.
    setTimeout(setStatus, 1, '');
  }

  if (ABORT) return;

  initRuntime();

  // No ATMAINS hooks

  Module['onRuntimeInitialized']?.();
  consumedModuleProp('onRuntimeInitialized');

  var noInitialRun = Module['noInitialRun'] || false;
  if (!noInitialRun) callMain();

  postRun();
}

function checkUnflushedContent() {
  // Compiler settings do not allow exiting the runtime, so flushing
  // the streams is not possible. but in ASSERTIONS mode we check
  // if there was something to flush, and if so tell the user they
  // should request that the runtime be exitable.
  // Normally we would not even include flush() at all, but in ASSERTIONS
  // builds we do so just for this check, and here we see if there is any
  // content to flush, that is, we check if there would have been
  // something a non-ASSERTIONS build would have not seen.
  // How we flush the streams depends on whether we are in SYSCALLS_REQUIRE_FILESYSTEM=0
  // mode (which has its own special function for this; otherwise, all
  // the code is inside libc)
  var oldOut = out;
  var oldErr = err;
  var has = false;
  out = err = (x) => {
    has = true;
  }
  try { // it doesn't matter if it fails
    _fflush(0);
    // also flush in the JS FS layer
    for (var tty of Object.values(TTY.ttys)) {
      if (tty.output.length) {
        has = true;
      }
    }
  } catch(e) {}
  out = oldOut;
  err = oldErr;
  if (has) {
    warnOnce('stdio streams had content in them that was not flushed. you should set EXIT_RUNTIME to 1 (see the Emscripten FAQ), or make sure to emit a newline when you printf etc.');
  }
}

var wasmExports;

// With async instantation wasmExports is assigned asynchronously when the
// instance is received.
createWasm().then(() => run());

// end include: postamble.js

