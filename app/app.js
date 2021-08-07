const express = require('express');
const Sentry = require('@sentry/node');
const Datadog = require('connect-datadog')({
  response_code: true,
  tags: ['app:riitag'],
});
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const {
  indexRoute,
  loginRoute,
  logoutRoute,
  callbackRoute,
  adminRoute,
  checkAdmin,
  adminRefreshRoute,
  checkAuth,
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
} = require('./routes');
const {
  config,
  generateRandomKey,
  cacheGameTDB,
  createDatabases,
  populateGameTDBCache,
} = require('./functions');

const app = express();
const port = config.port || 3000;

passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((obj, done) => {
  done(null, obj);
});

passport.use(
  new DiscordStrategy(
    {
      clientID: config.clientID,
      clientSecret: config.clientSecret,
      callbackURL: `${config.hostURL.replace('{{port}}', port)}callback`,
    },
    (accessToken, refreshToken, profile, done) => done(null, profile)
  )
);

if (config.sentryURL !== null && config.sentryURL !== '') {
  Sentry.init({ dsn: config.sentryURL });

  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.errorHandler());
}

app.use(Datadog);

app.use(
  session({
    secret: generateRandomKey(512),
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public/'));
app.use(express.static('data/'));
app.set('view-engine', 'pug');

app.get('/', indexRoute);
app.get(
  '/login',
  loginRoute,
  passport.authenticate('discord', { scope: ['identify'] })
);
app.get('/logout', logoutRoute);
app.get(
  '/callback',
  passport.authenticate('discord', { failureRedirect: '/' }),
  callbackRoute
);
app.get('/admin', checkAdmin, adminRoute);
app.get('^/admin/refresh/:id([0-9]+)', checkAdmin, adminRefreshRoute);
app.route('/edit').get(checkAuth, editGetRoute).post(checkAuth, editPostRoute);
app.get('/create', checkAuth, createRoute);
app.get('^/:id([0-9]+)/tag.png', tagRoute);
app.get('^/:id([0-9]+)/tag.max.png', tagMaxRoute);
app.get('^/:id([0-9]+)/riitag.wad', checkAuth, wadRoute);
app.get('/wii', wiiRoute);
app.get('/wiiu', wiiuRoute);
app.get('/3ds', tdsRoute);
app.get('/Wiinnertag.xml', checkAuth, wiinertagRoute);
app.get('^/:id([0-9]+)', userIdRoute);
app.get('^/:id([0-9]+)/json', userIdJsonRoute);
app.get('/game-leaderboard', gameLeaderboardRoute);
app.get('/cover', coverRoute);

app.use((req, res, next) => {
  const allowed = ['/img', '/overlays', '/flags'];
  // eslint-disable-next-line no-restricted-syntax
  for (const index of allowed) {
    if (req.path.indexOf(index)) {
      console.log(req.path);
      next();
    }
  }
  res.status(404);
  res.render('notfound.pug', {
    user: req.user,
  });
});

app.listen(port, async () => {
  await Promise.all([createDatabases(), populateGameTDBCache()]);
  console.log(`RiiTag Server listening on port ${port}`);
});
