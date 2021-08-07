const fs = require('fs');
const Canvas = require('canvas');

const { Image } = Canvas;

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

module.exports = {
  savePNG,
  getImage,
};
