const uidRegex = /uid=(\d*);?/;
const uid = uidRegex.exec(document.cookie)[1];
const user = getUser();

const guests = {
  a: 'Guest A',
  b: 'Guest B',
  c: 'Guest C',
  d: 'Guest D',
  e: 'Guest E',
  f: 'Guest F',
};
const guestList = Object.keys(guests);

function showPassword(inputBoxID, inputButtonID) {
  const x = document.getElementById(inputBoxID);
  const y = document.getElementById(inputButtonID);
  if (x.type == 'password') {
    x.type = 'text';
    y.value = 'Hide Key';
  } else {
    x.type = 'password';
    y.value = 'Show Key';
  }
}

function httpFetch(uri) {
  let res = null;
  const x = new XMLHttpRequest();
  x.open('GET', uri, false);
  x.send();
  if (x.status == 200) {
    res = x.responseText;
  }
  return res;
}

function getOverlay(overlayFile) {
  return httpFetch(overlayFile);
}

function getUser() {
  const j = httpFetch(`/users/${uid}.json`);
  if (j) {
    return JSON.parse(j);
  } 
    return null;
  
}

const sel = document.getElementById('background');
const sel2 = document.getElementById('flag');
const sel3 = document.getElementById('overlay');
const sel4 = document.getElementById('coin');
const sel6 = document.getElementById('font');
const sel7 = document.getElementById('mii-select');
const sel8 = document.getElementById('guest-select');

const miiUploadButton = document.getElementById('mii-upload');

sel.onchange = function () {
  document.getElementById('background-img').src = `/${  this.value}`;
};

sel2.onchange = function () {
  document.getElementById('flag-img').src = `/flags/${  this.value  }.png`;
};

sel3.onchange = function () {
  let cimg;
  document.getElementById('overlay-img').src =
    `/img/overlays/${  this.value.replace('.json', '')  }.png`;
  const overlay = JSON.parse(getOverlay(`/overlays/${this.value}`));
  if (sel4.value == 'default') {
    cimg = `${overlay.coin_icon.img  }.png`;
    document.getElementById('coin-img').src = `/img/coin/${  cimg}`;
  }
};

sel4.onchange = function () {
  let cimg;
  const overlay = JSON.parse(getOverlay(`/overlays/${sel3.value}`));
  cimg = this.value == 'default' ? `${overlay.coin_icon.img  }.png` : `${this.value  }.png`;
  document.getElementById('coin-img').src = `/img/coin/${  cimg}`;
};

sel6.onchange = function () {
  let cimg;
  const overlay = JSON.parse(getOverlay(`/overlays/${sel3.value}`));
  console.log(this.value);
  cimg = this.value == 'default' ? `${overlay.username.font_family  }.png` : `${this.value  }.png`;
  document.getElementById('font-img').src = `/img/font/${  cimg}`;
};

sel7.onchange = function () {
  miiImg = document.getElementById('mii-img');

  if (this.value == 'Upload') {
    unhideMiiUpload();
    hideMiiGen2();
    hideMiiNumber();
    hideGuest();
    document.getElementById('mii-data').value = user.mii_data;
    document.getElementById('mii-number').value = '';
    document.getElementById('mii-type').value = this.value;
  } else if (this.value == 'CMOC') {
    hideMiiUpload();
    hideMiiGen2();
    unhideMiiNumber();
    hideGuest();
    document.getElementById('mii-data').value = user.mii_data;
    document.getElementById('mii-number').value = user.mii_number;
    document.getElementById('mii-type').value = this.value;
  } else if (this.value == 'Gen2') {
    hideMiiUpload();
    unhideMiiGen2();
    hideMiiNumber();
    hideGuest();
    document.getElementById('mii-data').value = user.mii_data;
    document.getElementById('mii-number').value = '';
    document.getElementById('mii-type').value = this.value;
  } else if (this.value == 'Guest') {
    hideMiiUpload();
    hideMiiGen2();
    hideMiiNumber();
    unhideGuest();
    document.getElementById('mii-type').value = this.value;
  } else {
    hideMiiUpload();
    hideMiiGen2();
    hideMiiNumber();
    hideGuest();
    document.getElementById('mii-data').value = this.value;
    document.getElementById('mii-number').value = '';
    document.getElementById('mii-type').value = this.value;
  }

  if (guestList.includes(user.mii_data)) {
    miiImg.src = `/miis/guests/${user.mii_data}.png`;
  } else if (
    user.mii_data == '' ||
    user.mii_data == null ||
    user.mii_data.length >= 1000
  ) {
    miiImg.src = `/miis/guests/undefined.png`;
  } else if (user.mii_data.length == 94) {
    miiImg.src = `https://studio.mii.nintendo.com/miis/image.png?data=${user.mii_data}&amp;type=face&amp;width=512&amp;bgColor=FFFFFF00`;
  } else {
    miiImg.src = `http://miicontestp.wii.rc24.xyz/cgi-bin/render.cgi?data=${user.mii_data}`;
  }
};

sel8.onchange = function () {
  miiImg = document.getElementById('mii-img');

  if (this.value == 'NoSelection') {
    document.getElementById('mii-data').value = user.mii_data;
    document.getElementById('mii-number').value = '';
  }

  if (guestList.includes(this.value)) {
    document.getElementById('mii-data').value = this.value;
    document.getElementById('mii-number').value = '';
    miiImg.src = `/miis/guests/${this.value}.png`;
  } else if (guestList.includes(user.mii_data)) {
      miiImg.src = `/miis/guests/${user.mii_data}.png`;
    } else if (
      user.mii_data == '' ||
      user.mii_data == null ||
      user.mii_data.length >= 1000
    ) {
      miiImg.src = `/miis/guests/undefined.png`;
    } else if (user.mii_data.length == 94) {
      miiImg.src = `https://studio.mii.nintendo.com/miis/image.png?data=${user.mii_data}&amp;type=face&amp;width=512&amp;bgColor=FFFFFF00`;
    } else {
      miiImg.src = `http://miicontestp.wii.rc24.xyz/cgi-bin/render.cgi?data=${user.mii_data}`;
    }
};

const miiUploadBox = document.getElementById('mii-box');
const miiEntryNumberBox = document.getElementById('mii-number');
const miiGen2 = document.getElementById('mii-gen2');
var miiGuest = document.getElementById('guest-selection');
const miiErrorBox = document.getElementById('mii-error-box');
var miiGuest = document.getElementById('guest-selection');

function unhideMiiUpload() {
  miiUploadBox.style = '';
}

function hideMiiUpload() {
  miiUploadBox.style = 'display: none;';
}

function unhideMiiNumber() {
  miiEntryNumberBox.style = '';
}

function hideMiiNumber() {
  miiEntryNumberBox.style = 'display: none;';
}

function unhideGuest() {
  miiGuest.style = '';
}

function hideGuest() {
  miiGuest.style = 'display: none;';
}

function unhideMiiGen2() {
  miiGen2.style = '';
}

function hideMiiGen2() {
  miiGen2.style = 'display: none;';
}

function unhideMiiError() {
  miiErrorBox.style = '';
}

function hideMiiError() {
  miiErrorBox.style = 'display: none;';
}

function showMiiError(message) {
  document.getElementById('mii-success').style = 'display: none;';
  document.getElementById('mii-error-text').textContent = message;
  unhideMiiError();
}

function showMiiSuccess() {
  document.getElementById('mii-success').style = '';
  hideMiiError();
}

document.getElementById('mii-QRfile').onchange = async function () {
  const formData = new FormData();
  const data = document.getElementById('mii-QRfile').files[0];
  formData.append('platform', 'gen2');
  formData.append('data', data);
  hideMiiError();
  try {
    const r = await fetch('https://miicontestp.wii.rc24.xyz/cgi-bin/studio.cgi', {
      method: 'POST',
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        mii = data.mii;
      });
    document.getElementById('mii-data').value = mii;
    miiImg.src = `https://studio.mii.nintendo.com/miis/image.png?data=${mii}&amp;type=face&amp;width=512&amp;bgColor=FFFFFF00`;
    showMiiSuccess();
  } catch (error) {
    if (error instanceof TypeError) {
      showMiiError('Unable to use this QR code. Try again!');
    } else {
      console.log('Error when fetching', error);
    }
  }
};

document.getElementById('mii-file').onchange = function () {
  const file = document.getElementById('mii-file').files[0];
  hideMiiError();
  if (!file) {
    console.log('No file');
    showMiiError('No file has been selected.');
    return;
  }
  const reader = new FileReader();
  reader.onload = function () {
    const buffer = reader.result;
    if (buffer.byteLength != 74) {
      console.log('Not a mii');
      showMiiError('The file selected is not a valid Mii.');
      return;
    }
    const dv = new DataView(buffer, 0);
    const byteArray = [];
    for (let i = 0; i < 74; i++) {
      byteArray.push(dv.getUint8(i));
    }
    const hexString = [...byteArray].map((byte) => (`0${  (byte & 0xff).toString(16)}`).slice(-2)).join('');
    document.getElementById('mii-data').value = hexString;
    const miiImg = '';
    miiImg.src = `http://miicontestp.wii.rc24.xyz/cgi-bin/render.cgi?data=${hexString}`;
    showMiiSuccess();
    console.log(`Set data to ${  hexString}`);
  };
  reader.readAsArrayBuffer(file);
};
