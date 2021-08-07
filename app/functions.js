const fs = require('fs');
const Axios = require('axios');
const path = require('path');
const Canvas = require('canvas');
const Banner = require('../src/index');
const DatabaseDriver = require('./dbdriver');

const dataFolder = path.resolve(__dirname, '..', 'data');

const db = new DatabaseDriver(path.join(__dirname, '..', 'users.db'));
const gamesDb = new DatabaseDriver(path.join(__dirname, '..', 'games.db'));
const coinsDb = new DatabaseDriver(path.join(__dirname, '..', 'coins.db'));

let wiiTDB;
let wiiuTDB;
let tdsTDB;

function loadConfig() {
  const configFile = 'config.json';
  if (!fs.existsSync(configFile)) {
    fs.copyFileSync('config.json.example', configFile);
    throw new Error(
      "'config.json' has been created. Please edit the values in 'config.json' and restart the server."
    );
  }
  return JSON.parse(fs.readFileSync(configFile));
}

const config = loadConfig();

const guestList = Object.keys({
  a: 'Guest A',
  b: 'Guest B',
  c: 'Guest C',
  d: 'Guest D',
  e: 'Guest E',
  f: 'Guest F',
  undefined,
});

async function createDatabases() {
  await db.create('users', [
    'id INTEGER PRIMARY KEY',
    'snowflake TEXT',
    'key TEXT',
  ]);
  await gamesDb.create('games', [
    'id INTEGER PRIMARY KEY',
    'console INTEGER',
    'gameID TEXT',
    'count INTEGER',
  ]);
  await coinsDb.create('coins', [
    'id INTEGER PRIMARY KEY',
    'snowflake TEXT',
    'count INTEGER',
  ]);
}

/**
 * Generates a random key.
 *
 * @param {number} keyLength - Length of the key
 *
 * @returns string - Randomly generated key
 */
function generateRandomKey(keyLength) {
  const chars =
    'QWERTYUIOPASDFGHJKLZXCVBNMqwertyuiopasdfghjklzxcvbnm1234567890';
  let key = '';
  let lastChar = '';

  for (let i = 0; i < keyLength; i += 1) {
    let char = chars.charAt(Math.floor(Math.random() * chars.length));
    while (char === lastChar) {
      char = chars.charAt(Math.floor(Math.random() * chars.length));
    }
    key += char;
    lastChar = char;
  }

  return key;
}

function getHomeTags() {
  // TODO **URGENT**: Calculate tags to show on front page
}

async function cacheGameTDB(txtname) {
  const url = `https://www.gametdb.com/${txtname}.txt?LANG=ORIG`;
  const response = await Axios({
    url,
    method: 'GET',
    responseType: 'text',
  }).catch((error) => {
    throw new Error(error);
  });

  const gameTDB = {};
  response.data.split('\r\n').forEach((line) => {
    try {
      const split = line.split(' = ');
      // eslint-disable-next-line prefer-destructuring
      gameTDB[split[0]] = split[1];
    } catch {
      throw new Error(`GameTDB Cache: Failed on ${line} for ${txtname}.txt`);
    }
  });

  return gameTDB;
}

async function populateGameTDBCache() {
  const [wiitdbRes, wiiutdbRes, tdstdbRes] = await Promise.all([
    cacheGameTDB('wiitdb'),
    cacheGameTDB('wiiutdb'),
    cacheGameTDB('3dstdb'),
  ]);
  wiiTDB = wiitdbRes;
  wiiuTDB = wiiutdbRes;
  tdsTDB = tdstdbRes;
}

async function getTag(id, res) {
  return new Promise((resolve, reject) => {
    try {
      const jstring = fs.readFileSync(
        path.resolve(dataFolder, 'users', `${id}.json`)
      );
      const banner = new Banner(jstring);
      banner.once('done', () => {
        try {
          res.redirect(`/${id}`);
        } catch {
          reject('Redirect');
        }
        resolve(banner);
      });
    } catch (error) {
      console.log(error);
      reject(error);
    }
  });
}

async function getUserKey(id) {
  const dbres = await db.get('users', 'snowflake', id);
  if (dbres === undefined) {
    return null;
  }
  return dbres.key;
}

function getBackgroundList() {
  return fs.readdirSync(path.resolve(dataFolder, 'img', '1200x450'));
}

function getOverlayList() {
  const overlays = [];
  fs.readdirSync(path.resolve(dataFolder, 'overlays')).forEach(
    (overlayFile) => {
      overlays.push(
        JSON.parse(
          fs.readFileSync(path.resolve(dataFolder, 'overlays', overlayFile))
        )
      );
    }
  );
  return overlays;
}

function getFlagList() {
  return JSON.parse(
    fs.readFileSync(path.resolve(dataFolder, 'meta', 'flags.json'))
  );
}

function getCoinList() {
  return JSON.parse(
    fs.readFileSync(path.resolve(dataFolder, 'meta', 'coin.json'))
  );
}

const coverTypes = ['cover3D', 'cover', 'disc'];

const coverRegions = [
  'EN',
  'FR',
  'DE',
  'ES',
  'IT',
  'NL',
  'PT',
  'AU',
  'SE',
  'DK',
  'NO',
  'FI',
  'TR',
  'JP',
  'KO',
  'TW',
];

function getFonts() {
  return JSON.parse(
    fs.readFileSync(path.resolve(dataFolder, 'meta', 'fonts.json'))
  );
}

function editUser(id, key, value) {
  const userJson = path.resolve(dataFolder, 'users', `${id}.json`);
  const jdata = JSON.parse(fs.readFileSync(userJson));
  jdata[key] = value;
  fs.writeFileSync(userJson, JSON.stringify(jdata, null, 4));
}

function getUserData(id) {
  const p = path.resolve(dataFolder, 'users', `${id}.json`);
  try {
    return JSON.parse(fs.readFileSync(p));
  } catch {
    return null;
  }
}

async function createUser(user) {
  if (!fs.existsSync(path.resolve(dataFolder, 'users', `${user.id}.json`))) {
    const ujson = {
      name: user.username,
      id: user.id,
      avatar: user.avatar,
      games: [],
      lastplayed: [],
      coins: 0,
      friend_code: '0000 0000 0000 0000',
      region: 'rc24',
      overlay: 'overlay1.json',
      bg: 'img/1200x450/riiconnect241.png',
      sort: '',
      font: 'default',
    };

    fs.writeFileSync(
      path.resolve(dataFolder, 'users', `${user.id}.json`),
      JSON.stringify(ujson, null, 4)
    );
  }

  const userKey = await getUserKey(user.id);
  if (!userKey) {
    await db.insert(
      'users',
      ['snowflake', 'key'],
      [user.id, generateRandomKey(128)]
    );
  }

  const exists = await coinsDb.exists('coins', 'snowflake', user.id);
  if (!exists) {
    await coinsDb.insert(
      'coins',
      ['snowflake', 'count'],
      [user.id, getUserData(user.id).coins]
    );
  }
}

async function getUserID(key) {
  const dbres = await db.get('users', 'key', key);
  if (dbres === undefined) {
    return null;
  }
  return dbres.snowflake;
}

function getUserAttrib(id, key) {
  const p = path.resolve(dataFolder, 'users', `${id}.json`);
  const jdata = JSON.parse(fs.readFileSync(p));
  return jdata[key] || null;
}

function updateGameArray(games, game) {
  for (let i = games.length - 1; i >= 0; i -= 1) {
    if (games[i] === game) {
      games.splice(i, 1);
    }
  }
  games.unshift(game);
  return games;
}

function setUserAttrib(id, key, value) {
  const p = path.resolve(dataFolder, 'users', `${id}.json`);
  const jdata = JSON.parse(fs.readFileSync(p));
  jdata[key] = value;
  fs.writeFileSync(p, JSON.stringify(jdata, null, 4));
}

async function gamePlayed(id, console, user) {
  const exists = await gamesDb.exists('games', 'gameID', id);
  if (!exists) {
    await gamesDb.insert(
      'games',
      ['console', 'gameID', 'count'],
      [console, id, 0]
    );
  }
  await gamesDb.increment('games', 'gameID', id, 'count').catch((error) => {
    process.stdout.write(`${error}\n`);
  });
  await coinsDb
    .increment('coins', 'snowflake', user, 'count')
    .catch((error) => {
      process.stdout.write(`${error}\n`);
    });
}

async function getTagEP(id) {
  return new Promise((resolve, reject) => {
    try {
      const jstring = fs.readFileSync(
        path.resolve(dataFolder, 'users', `${id}.json`)
      );
      const banner = new Banner(jstring);
      banner.once('done', () => {
        resolve(banner);
      });
    } catch (error) {
      console.log(error);
      reject(error);
    }
  });
}

function getCemuGameRegion(gameName, coverRegion) {
  const ids = JSON.parse(
    fs.readFileSync(path.resolve(dataFolder, 'ids', 'cemu.json'))
  ); // 16 digit TID -> 4 or 6 digit game ID

  // eslint-disable-next-line no-restricted-syntax
  for (const Regions of ids[gameName]) {
    let userRegion = coverRegion;

    if (userRegion === 'FR' && Regions.EUR) return Regions.EUR;
    if (userRegion === 'DE' && Regions.EUR) return Regions.EUR;
    if (userRegion === 'ES' && Regions.EUR) return Regions.EUR;
    if (userRegion === 'IT' && Regions.EUR) return Regions.EUR;
    if (userRegion === 'NL' && Regions.EUR) return Regions.EUR;
    if (userRegion === 'KO' && Regions.EUR) return Regions.EUR;
    if (userRegion === 'TW' && Regions.EUR) return Regions.EUR;

    if (userRegion === 'JP' && Regions.JPN) return Regions.JPN;
    if (userRegion === 'JP') userRegion = 'EN'; // Fallback

    if (userRegion === 'EN' && Regions.USA) return Regions.USA;
  }

  // In case nothing was found, return the first ID.
  // This will happen if the cover type doesn't have a corresponding region.
  return ids[gameName][0];
}

function getCitraGameRegion(gameName, coverRegion) {
  const ids = JSON.parse(
    fs.readFileSync(path.resolve(dataFolder, 'ids', '3ds.json'))
  ); // 16 digit TID -> 4 or 6 digit game ID

  if (typeof ids[gameName] !== 'undefined' && ids[gameName]) {
    if (!ids[gameName][1]) {
      // Prevent pointless searching for a proper region
      return ids[gameName][0];
    }

    /*  Regions and Fallbacks
            Europe: P with V Fallback, then X, Y or Z, then J.
            America: E with X, Y, or Z fallback, then P
            Japan: J with E fallback
            Everything else: P Fallback

            This should hopefully create a safety net where there's always some region avalible.
            If not just return "ids[gameName][0]" to use the first entry for the game.
        */

    // eslint-disable-next-line no-restricted-syntax
    for (const IDs of ids[gameName]) {
      const gameRegion = IDs.slice(-1);
      let userRegion = coverRegion;

      if (userRegion === 'FR' && gameRegion === 'F') return IDs;
      if (userRegion === 'DE' && gameRegion === 'D') return IDs;
      if (userRegion === 'ES' && gameRegion === 'S') return IDs;
      if (userRegion === 'IT' && gameRegion === 'I') return IDs;
      if (userRegion === 'NL' && gameRegion === 'H') return IDs;
      if (userRegion === 'KO' && gameRegion === 'K') return IDs;
      if (userRegion === 'TW' && gameRegion === 'W') return IDs;

      if (userRegion === 'JP' && gameRegion === 'J') return IDs;
      if (userRegion === 'JP') userRegion = 'EN'; // Fallback

      if (userRegion === 'EN' && gameRegion === 'E') return IDs;
      if (
        userRegion === 'EN' &&
        (gameRegion === 'X' || gameRegion === 'Y' || gameRegion === 'Z')
      )
        return IDs;

      if (gameRegion === 'P') return IDs;
      if (gameRegion === 'V') return IDs;
      if (gameRegion === 'X' || gameRegion === 'Y' || gameRegion === 'Z')
        return IDs;
      if (gameRegion === 'E') return IDs;
      if (gameRegion === 'J') return IDs;
    }
    // In case nothing was found, return the first ID.
    return ids[gameName][0];
  }
  return null;
}

async function getGameLeaderboard(user, limit) {
  const games = await gamesDb.getTableSorted('games', 'count', true);

  return {
    user,
    wiiTDB,
    wiiuTDB,
    tdsTDB,
    games,
    limit,
  };
}

function getCoverType(consoletype) {
  if (consoletype === 'ds' || consoletype === '3ds') {
    return 'box';
  }
  return 'cover3D';
}

function getGameRegion(game) {
  const chars = game.split('');
  const rc = chars[3];
  if (rc === 'P') {
    return 'EN';
  }
  if (rc === 'E') {
    return 'US';
  }
  if (rc === 'J') {
    return 'JA';
  }
  if (rc === 'K') {
    return 'KO';
  }
  if (rc === 'W') {
    return 'TW';
  }
  return 'EN';
}

function getExtension(covertype, consoletype) {
  if (consoletype === 'wii') {
    return 'png';
  }
  if (consoletype !== 'wii' && covertype === 'cover') {
    return 'jpg';
  }
  return 'png';
}

function getCoverWidth(covertype) {
  if (covertype === 'cover') {
    return 160;
  }
  if (covertype === 'cover3D') {
    return 176;
  }
  if (covertype === 'disc') {
    return 160;
  }
  if (covertype === 'box') {
    return 176;
  }
  return 176;
}

function getCoverHeight(covertype, consoletype) {
  if (covertype === 'cover') {
    if (consoletype === 'ds' || consoletype === '3ds') {
      return 144;
    }
    return 224;
  }
  if (covertype === 'cover3D') {
    return 248;
  }
  if (covertype === 'disc') {
    return 160;
  }
  if (covertype === 'box') {
    return 158;
  }
  return 248;
}

function getCoverUrl(consoletype, covertype, region, game, extension) {
  return `https://art.gametdb.com/${consoletype}/${covertype}/${region}/${game}.${extension}`;
}

async function getImage(source) {
  const img = new Image();
  return new Promise((resolve, reject) => {
    let t;
    img.onload = () => {
      clearTimeout(t);
      resolve(img);
    };
    img.onerror = (err) => {
      clearTimeout(t);
      reject(err);
    };
    t = setTimeout(() => {
      console.log(`${source} - getImage Timed Out`);
      reject();
    }, 7500);
    console.log(source);
    img.src = source;
  });
}

async function savePNG(out, c) {
  return new Promise((resolve, reject) => {
    let t;
    c.createPNGStream()
      .pipe(fs.createWriteStream(out))
      .on('close', () => {
        clearTimeout(t);
        resolve();
      });

    t = setTimeout(() => {
      console.log(`${out} - savePNG Timed Out`);
      reject();
    }, 7500);
  });
}

async function downloadGameCover(
  game,
  region,
  covertype,
  consoletype,
  extension
) {
  const can = new Canvas.Canvas(
    getCoverWidth(covertype),
    getCoverHeight(covertype, consoletype)
  );
  const con = can.getContext('2d');
  const img = await getImage(
    getCoverUrl(consoletype, covertype, region, game, extension)
  );
  con.drawImage(
    img,
    0,
    0,
    getCoverWidth(covertype),
    getCoverHeight(covertype, consoletype)
  );
  await savePNG(
    path.resolve(
      dataFolder,
      'cache',
      `${consoletype}-${covertype}-${game}-${region}.png`
    ),
    can
  );
}

async function cacheGameCover(game, region, covertype, consoletype, extension) {
  if (!fs.existsSync(path.resolve(dataFolder, 'cache'))) {
    fs.mkdirSync(path.resolve(dataFolder, 'cache'));
  }
  if (
    fs.existsSync(
      path.resolve(
        dataFolder,
        'cache',
        `${consoletype}-${covertype}-${game}-${region}.png`
      )
    )
  ) {
    return true;
  }
  try {
    await downloadGameCover(game, region, covertype, consoletype, extension);
  } catch {
    try {
      await downloadGameCover(game, 'EN', covertype, consoletype, extension); // Cover might not exist?
    } catch {
      try {
        await downloadGameCover(game, 'US', covertype, consoletype, extension); // Small chance it's US region
      } catch {
        return false;
      }
    }
  }
  return true;
}

module.exports = {
  config,
  dataFolder,
  createDatabases,
  generateRandomKey,
  getHomeTags,
  cacheGameTDB,
  populateGameTDBCache,
  getTag,
  getUserKey,
  getBackgroundList,
  getOverlayList,
  getFlagList,
  getCoinList,
  coverTypes,
  coverRegions,
  getFonts,
  editUser,
  guestList,
  createUser,
  getUserID,
  getUserAttrib,
  updateGameArray,
  setUserAttrib,
  gamePlayed,
  getTagEP,
  getCemuGameRegion,
  getCitraGameRegion,
  getUserData,
  getGameLeaderboard,
  getCoverType,
  getGameRegion,
  getExtension,
  cacheGameCover,
};
