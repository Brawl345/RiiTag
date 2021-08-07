const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const xml = require('xml');
const {
  getHomeTags,
  config,
  dataFolder,
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
} = require('./functions');
const renderMiiFromEntryNo = require('../src/rendermiifromentryno');
const renderMiiFromHex = require('../src/rendermiifromhex');
const renderGen2Mii = require('../src/renderGen2Mii');
const Banner = require('../src/index');

function checkAdmin(req, res, next) {
  if (req.isAuthenticated()) {
    if (req.user.admin) {
      return next();
    }
  }
  return res.render('notfound.pug', {
    user: req.user,
  });
}

function checkAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.redirect('/login');
}

function indexRoute(req, res) {
  res.render('index.pug', { user: req.user, tags: getHomeTags() });
}

function loginRoute(req, res, next) {
  if (req.isAuthenticated()) {
    res.redirect('/');
  }
  next();
}

function logoutRoute(req, res) {
  req.logout();
  res.redirect('/');
}

function callbackRoute(req, res) {
  res.cookie('uid', req.user.id);
  req.user.admin = config.admins.includes(req.user.id);
  res.redirect('/create');
}

function adminRoute(req, res) {
  res.render('admin.pug', { user: req.user });
}

async function adminRefreshRoute(req, res) {
  if (!req.params.id) {
    res.redirect(`/${req.user.id}`);
  }
  setTimeout(() => {
    getTag(req.user.id, res).catch((error) => {
      if (error === 'Redirect') {
        res.redirect(`/${req.user.id}`);
      } else {
        res.status(404).render('notfound.pug');
      }
    });
  }, 2000);
  res.redirect(`/${req.params.id}`);
}

async function editGetRoute(req, res) {
  let jstring;
  try {
    jstring = fs
      .readFileSync(path.resolve(dataFolder, 'users', `${req.user.id}.json`))
      .toString();
    const userKey = await getUserKey(req.user.id);
    if (userKey === null) {
      console.log('User Key is undefined');
      return res.redirect('/create');
    }
    return res.render('edit.pug', {
      jstring,
      backgrounds: getBackgroundList(),
      jdata: JSON.parse(jstring),
      overlays: getOverlayList(),
      flags: getFlagList(),
      coins: getCoinList(),
      covertypes: coverTypes,
      coverregions: coverRegions,
      fonts: getFonts(),
      userKey,
      user: req.user,
    });
  } catch (error) {
    console.log(error);
    return res.redirect('/create');
  }
}

async function editPostRoute(req, res) {
  const {
    miidata,
    font,
    usemii,
    overlay,
    games,
    miinumber,
    flag,
    coverregion,
    covertype,
    wiinumber,
    background,
    name,
    useavatar,
    MiiType,
    coin,
  } = req.body;
  editUser(req.user.id, 'bg', background);
  editUser(req.user.id, 'overlay', overlay);
  editUser(req.user.id, 'region', flag);
  editUser(req.user.id, 'coin', coin);
  editUser(req.user.id, 'name', name);
  editUser(req.user.id, 'friend_code', wiinumber);
  editUser(req.user.id, 'games', games.split(';'));
  editUser(req.user.id, 'covertype', covertype);
  editUser(req.user.id, 'coverregion', coverregion);
  editUser(req.user.id, 'useavatar', useavatar);
  editUser(req.user.id, 'usemii', usemii);
  editUser(req.user.id, 'font', font);
  editUser(req.user.id, 'mii_data', miidata);
  editUser(req.user.id, 'mii_number', miinumber);
  editUser(req.user.id, 'avatar', req.user.avatar);
  switch (MiiType) {
    case 'CMOC': {
      await renderMiiFromEntryNo(miinumber, req.user.id, dataFolder).catch(
        () => {
          console.log('Failed to render mii from mii entry number');
        }
      );

      break;
    }
    case 'Upload':
    case 'Guest': {
      if (!guestList.includes(miidata)) {
        await renderMiiFromHex(miidata, req.user.id, dataFolder).catch(() => {
          console.log('Failed to render mii');
        });
      }

      break;
    }
    case 'Gen2': {
      await renderGen2Mii(miidata, req.user.id, dataFolder).catch((error) => {
        console.log(`Failed to render mii from QR Code: ${error}`);
      });

      break;
    }
    default: {
      console.log('Invalid/No Mii Type chosen.');
    }
  }
  setTimeout(() => {
    getTag(req.user.id, res).catch((error) => {
      if (error === 'Redirect') {
        res.redirect(`/${req.user.id}`);
      } else {
        res.status(404).render('notfound.pug');
      }
    });
  }, 2000);
}

async function createRoute(req, res) {
  if (!fs.existsSync(path.resolve(dataFolder, 'tag'))) {
    fs.mkdirSync(path.resolve(dataFolder, 'tag'));
  }
  await createUser(req.user);
  getTag(req.user.id, res).catch((error) => {
    if (error === 'Redirect') {
      res.redirect(`/${req.user.id}`);
    } else {
      res.status(404).render('notfound.pug');
    }
  });
}

async function tagRoute(req, res) {
  try {
    if (!fs.existsSync(path.resolve(dataFolder, 'tag'))) {
      fs.mkdirSync(path.resolve(dataFolder, 'tag'));
    }
    if (
      !fs.existsSync(
        path.resolve(dataFolder, 'users', `${req.params.id}.json`)
      ) ||
      !fs.existsSync(path.resolve(dataFolder, 'tag', `${req.params.id}.png`))
    ) {
      res.status(404).render('notfound.pug');
    }
    const file = path.resolve(dataFolder, 'tag', `${req.params.id}.png`);
    const s = fs.createReadStream(file);
    s.on('open', () => {
      res.set('Content-Type', 'image/png');
      s.pipe(res);
    });
  } catch {
    res.status(404).render('notfound.pug');
  }
}

async function tagMaxRoute(req, res) {
  try {
    if (!fs.existsSync(path.resolve(dataFolder, 'tag'))) {
      fs.mkdirSync(path.resolve(dataFolder, 'tag'));
    }
    if (
      !fs.existsSync(
        path.resolve(dataFolder, 'users', `${req.params.id}.json`)
      ) ||
      !fs.existsSync(
        path.resolve(dataFolder, 'tag', `${req.params.id}.max.png`)
      )
    ) {
      res.status(404).render('notfound.pug');
    }
    const file = path.resolve(dataFolder, 'tag', `${req.params.id}.max.png`);
    const s = fs.createReadStream(file);
    s.on('open', () => {
      res.set('Content-Type', 'image/png');
      s.pipe(res);
    });
  } catch {
    res.status(404).render('notfound.pug');
  }
}

async function wadRoute(req, res) {
  if (!fs.existsSync(path.resolve(dataFolder, 'wads'))) {
    return;
  }
  if (
    !fs.existsSync(
      path.resolve(dataFolder, 'users', `${req.params.id}.json`)
    ) ||
    !fs.existsSync(path.resolve(dataFolder, 'tag', `${req.params.id}.max.png`))
  ) {
    res.status(404).render('notfound.pug');
  }
  if (
    !fs.existsSync(path.resolve(dataFolder, 'wads', `${req.params.id}.wad`))
  ) {
    execSync(
      `sharpii WAD -u ${dataFolder}/wads/riitag.wad ${dataFolder}/wads/${req.params.id}`
    );

    const fd = fs.openSync(
      path.resolve(dataFolder, 'wads', `${req.params.id}`, '00000001.app'),
      'r+'
    );
    const text = `tag.rc24.xyz/${req.params.id}/tag.max.png`;
    const position = 0x1f3a4;
    fs.writeSync(fd, text, position, 'utf8');

    execSync(
      `sharpii WAD -p ${dataFolder}/wads/${req.params.id} ${dataFolder}/wads/${req.params.id}.wad`
    );

    fs.rm(`${dataFolder}/wads/${req.params.id}`, { recursive: true }, (err) => {
      if (err) {
        // File deletion failed
        console.error(err.message);
      }
    });
  }
  const file = path.resolve(dataFolder, 'wads', `${req.params.id}.wad`);
  const s = fs.createReadStream(file);
  s.on('open', () => {
    res.set('Content-Type', 'application/octet-stream');
    s.pipe(res);
  });
}

async function wiiRoute(req, res) {
  const key = req.query.key || '';
  const gameID = req.query.game || '';

  if (key === '' || gameID === '') {
    res.status(400).send();
    return;
  }

  const userID = await getUserID(key);
  if (userID === null) {
    res.status(400).send();
    return;
  }

  if (getUserAttrib(userID, 'lastplayed') !== null) {
    if (
      Math.floor(Date.now() / 1000) - getUserAttrib(userID, 'lastplayed')[1] <
      60
    ) {
      res.status(429).send(); // Cooldown
      return;
    }
  }

  const c = getUserAttrib(userID, 'coins');
  const games = getUserAttrib(userID, 'games');
  const newGames = updateGameArray(games, `wii-${gameID}`);
  setUserAttrib(userID, 'coins', c + 1);
  setUserAttrib(userID, 'games', newGames);
  setUserAttrib(userID, 'lastplayed', [
    `wii-${gameID}`,
    Math.floor(Date.now() / 1000),
  ]);

  await gamePlayed(gameID, 0, userID);
  res.status(200).send();

  await getTagEP(userID).catch(() => {
    res.status(404).render('notfound.pug');
  });
}

async function wiiuRoute(req, res) {
  const key = req.query.key || '';
  let gameTID = req.query.game || '';
  const origin = req.query.source || '';

  gameTID = gameTID.replace(/%26/g, '&').replace(/ - /g, '\n').toString();

  if (key === '' || gameTID === '') {
    res.status(400).send();
    return;
  }

  const userID = await getUserID(key);
  if (userID === null) {
    res.status(400).send();
    return;
  }

  if (getUserAttrib(userID, 'lastplayed') !== null) {
    if (
      Math.floor(Date.now() / 1000) - getUserAttrib(userID, 'lastplayed')[1] <
      60
    ) {
      res.status(429).send(); // Cooldown
      return;
    }
  }

  if (origin === 'Cemu') {
    const userRegion = JSON.parse(
      fs
        .readFileSync(path.resolve(dataFolder, 'users', `${userID}.json`))
        .toString()
    ).coverregion;
    gameTID = getCemuGameRegion(gameTID, userRegion); // Returns a game Title ID
    if (gameTID === 1) {
      res.status(400).send();
      return;
    }
  }

  gameTID = gameTID.toUpperCase();

  let ids = JSON.parse(
    fs.readFileSync(path.resolve(dataFolder, 'ids', 'wiiu.json'))
  ); // 16 digit TID -> 4 or 6 digit game ID
  let console = 'wiiu-';

  if (!ids[gameTID]) {
    ids = JSON.parse(
      fs.readFileSync(path.resolve(dataFolder, 'ids', 'wiiVC.json'))
    ); // 16 digit TID -> 4 or 6 digit game ID WiiVC Inject
    console = 'wii-';
  }

  const c = getUserAttrib(userID, 'coins');
  const games = getUserAttrib(userID, 'games');
  const newGames = updateGameArray(games, console + ids[gameTID]);
  setUserAttrib(userID, 'coins', c + 1);
  setUserAttrib(userID, 'games', newGames);
  setUserAttrib(userID, 'lastplayed', [
    console + ids[gameTID],
    Math.floor(Date.now() / 1000),
  ]);

  await gamePlayed(ids[gameTID], 1, userID);
  res.status(200).send();

  await getTagEP(userID).catch(() => {
    res.status(404).render('notfound.pug');
  });
}

async function tdsRoute(req, res) {
  const key = req.query.key || '';
  const gameName = req.query.game || '';

  if (key === '' || gameName === '') {
    res.status(400).send();
    return;
  }

  const userID = await getUserID(key);
  if (userID == null) {
    res.status(400).send();
    return;
  }

  if (getUserAttrib(userID, 'lastplayed') !== null) {
    if (
      Math.floor(Date.now() / 1000) - getUserAttrib(userID, 'lastplayed')[1] <
      60
    ) {
      res.status(429).send(); // Cooldown
      return;
    }
  }

  const userRegion = JSON.parse(
    fs
      .readFileSync(path.resolve(dataFolder, 'users', `${userID}.json`))
      .toString()
  ).coverregion;

  const gameID = getCitraGameRegion(gameName, userRegion); // Returns an ID4

  const c = getUserAttrib(userID, 'coins');
  const games = getUserAttrib(userID, 'games');
  const newGames = updateGameArray(games, `3ds-${gameID}`);
  setUserAttrib(userID, 'coins', c + 1);
  setUserAttrib(userID, 'games', newGames);
  setUserAttrib(userID, 'lastplayed', [
    `3ds-${gameID}`,
    Math.floor(Date.now() / 1000),
  ]);

  await gamePlayed(gameID, 2, userID);
  res.status(200).send();

  await getTagEP(userID).catch(() => {
    res.status(404).render('notfound.pug');
  });
}

async function wiinertagRoute(req, res) {
  const userKey = await getUserKey(req.user.id);
  const tag = {
    Tag: {
      _attr: {
        URL: 'http://tag.rc24.xyz/wii?game={ID6}&key={KEY}',
        Key: userKey,
      },
    },
  };
  res.type('application/xml');
  res.send(
    xml(tag, {
      declaration: true,
    })
  );
}

function userIdRoute(req, res) {
  const userData = getUserData(req.params.id);

  if (!userData) {
    res.status(404).render('notfound.pug');
    return;
  }

  res.render('tagpage.pug', {
    id: req.params.id,
    tuser: userData,
    user: req.user,
    flags: getFlagList(),
    backgrounds: getBackgroundList(),
    overlays: getOverlayList(),
  });
}

function userIdJsonRoute(req, res) {
  const userData = getUserData(req.params.id);
  res.type('application/json');

  if (!userData) {
    res
      .status(404)
      .send(JSON.stringify({ error: 'That user ID does not exist.' }));
    return;
  }

  let lastPlayed = {};
  if (userData.lastplayed.length !== 0) {
    const banner = new Banner(JSON.stringify(userData), false);
    const game = userData.lastplayed[0];
    const time = userData.lastplayed[1];
    const gameid = game.split('-')[1];

    const consoletype = banner.getConsoleType(game);
    const covertype = banner.getCoverType(consoletype);
    const region = banner.getGameRegion(gameid);
    const extension = banner.getExtension(covertype, consoletype);

    lastPlayed = {
      game_id: gameid,
      console: consoletype,
      region,
      cover_url: banner.getCoverUrl(
        consoletype,
        covertype,
        region,
        gameid,
        extension
      ),
      time,
    };
  }

  const tagUrl = `https://tag.rc24.xyz/${userData.id}/tag.png`;
  res.send(
    JSON.stringify({
      user: { name: userData.name, id: userData.id },
      tag_url: { normal: tagUrl, max: tagUrl.replace('.png', '.max.png') },
      game_data: { last_played: lastPlayed, games: userData.games },
    })
  );
}

async function gameLeaderboardRoute(req, res) {
  let limit = Number.parseInt(req.query.limit, 10);
  if (!limit) {
    limit = 100;
  }
  const leaderboard = await getGameLeaderboard(req.user, limit);
  res.render('gameleaderboard.pug', leaderboard);
}

async function coverRoute(req, res) {
  let { game } = req.query;
  const { console } = req.query;
  if (!game) {
    res.status(500).send('Error 500 - No game provided.');
  }
  const covertype = getCoverType(console);
  game = game
    .replace('wii-', '')
    .replace('wiiu-', '')
    .replace('3ds-', '')
    .replace('ds-', '');
  const region = getGameRegion(game);
  const extension = getExtension(covertype, console);
  const cache = await cacheGameCover(
    game,
    region,
    covertype,
    console,
    extension
  );
  if (cache) {
    res.sendFile(
      path.resolve(
        dataFolder,
        'cache',
        `${console}-${covertype}-${game}-${region}.png`
      )
    );
  } else {
    res.status(500).send('Error 500 - Cache was not available.');
  }
}

module.exports = {
  checkAdmin,
  checkAuth,
  indexRoute,
  loginRoute,
  logoutRoute,
  callbackRoute,
  adminRoute,
  adminRefreshRoute,
  editGetRoute,
  editPostRoute,
  createRoute,
  tagRoute,
  tagMaxRoute,
  wadRoute,
  wiiRoute,
  wiiuRoute,
  tdsRoute,
  wiinertagRoute,
  userIdRoute,
  userIdJsonRoute,
  gameLeaderboardRoute,
  coverRoute,
};
