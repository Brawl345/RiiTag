const Canvas = require('canvas');
const path = require('path');
const utils = require('./utils');

const options = {};

module.exports = async function (data, id, dataFolder) {
  const endpoint = 'https://studio.mii.nintendo.com/miis/image.png?data=';
  const epargs = '&amp;type=face&amp;width=512&amp;bgColor=FFFFFF00';

  const c = new Canvas.Canvas(512, 512);
  const ctx = c.getContext('2d');
  let img;
  try {
    img = await utils.getImage(`${endpoint}${data}${epargs}`);
    ctx.drawImage(img, 0, 0, 512, 512);
    await utils.savePNG(path.join(dataFolder, 'miis', `${id  }.png`), c);
  } catch (error) {
    console.error(error);
  }
};

function editUser(id, key, value) {
  const p = path.resolve(dataFolder, 'users', `${id  }.json`);
  const jdata = JSON.parse(fs.readFileSync(p));
  jdata[key] = value;
  fs.writeFileSync(p, JSON.stringify(jdata, null, 4));
}
