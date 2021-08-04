# RiiTag

RiiTag is a customizable gamertag (not only) for the Wii. By sharing your gamertag (a dynamic image), you can show what you've been playing to your friends! You connect it to a USB Loader, and the tag updates on-the-fly.

## Build

### Create a new application

1. Create a new Discord application on https://discord.com/developers/applications
2. Go to "OAuth2" in the sidebar and add a new Redirect URI `http://localhost:3000/callback`
3. Copy the Client ID and secret directly above, make a copy of the `config.json.example` to `config.json` and insert your tokens there (adjust the Redirect URI if you change it obviously)

### Build and start

1. `npm i`
2. `npm run start`

WSL is recommended on Windows, since you have to build `canvas` otherwise and it requires a bloaty Visual Studio installation. Just install `node` via `nvm` for example.

### Test

Run tests with `npm run test`.

## Credits

- [Nintendo U Ver. 3](https://www.deviantart.com/dledeviant/art/Nintendo-U-Version-3-595000916) by DLEDeviant
