"use strict";

// let socket = io.connect("http://52.25.225.108");
let socket = io.connect("http://jibinmathews.in",{
  // TODO:  Remove this in production
  reconnection : true
});

/* 
*   Variable declaration 
*/
let __chrome_unique_id = undefined;
let __storage = undefined;
let secret = {};
let QRPopup = undefined;



socket.on('connect', ()=>{
  // console.log("Socket Connected");
  setupConnection();
});

socket.on('notification', (data)=>{
  // console.log(data);
  chrome.notifications.create("123456789", {
    "type": "basic",
    "iconUrl": "https://image.flaticon.com/icons/png/128/107/107822.png",
    "title": data.AppName,
    "message": data.title+"\n\n"+data.text
  });
});

/*
* Helper function declarations
*/
const getStorage = ()=>{
  return new Promise((resolve)=>{
    chrome.storage.local.get((data)=>{
      // console.log("Storage");
      // console.log(data);
      resolve(data);
    });
  });
};

const setStorage = (object)=>{
  chrome.storage.local.set(object);
};


/* 
* Initial Connection
* ================== 
* Connect to socket server with assigned chromeId.
* If not assigned then request is from the server.
* Reconnect when assigned
*/
function setupConnection(){
  getStorage()
  .then((data)=>{
    __storage = data;
  // If chrome id is not assigned, get it from server. Else connect to server with assigned chromeid
  if(data.__chrome_unique_id===undefined){
    socket.emit('join', {});
  }else{
    __chrome_unique_id = data.__chrome_unique_id;
    socket.emit('join', {
      id: __chrome_unique_id
    });
    sendFCMMap();
  }
})

}

socket.on('join-with', (data)=>{
  setStorage({'__chrome_unique_id': data});

  __chrome_unique_id = data;

  // Reconnect with server with assigned chromeid
  socket.emit('join', {
    id: __chrome_unique_id
  });
});

/*
*  Pairing Phone and Chrome Extension
*  ==================================
*  Generate a barcode with chromeId as data and a (secret key to authorize pairing request via server).
*  When chrome receives pairing request from phone, check secret key to see if request authenticated.
*  if authenticated, store FCMid and Phoneid in storage.
*  Send a set of random field names to phone which will be used to send password from android to chrome over socket and store this in localstorage.
*  Pairing complete
*/
chrome.extension.onConnect.addListener((popup)=>{
  if(popup.name==='PairingInquirer'){

    // console.log(popup);
    // Send QR code and secret to popup if not paired
    getStorage()
    .then((data)=>{
      let isPaired = !(!data.__phone_unique_id || !data.__phone_fcm_id);
      __storage = data;
      __storage.isPaired = isPaired;
      if(!isPaired){
        let secretKey = Random.getQRCode();
        secret.secretKey = secretKey;
        popup.postMessage({
          isPaired: isPaired,
          __chrome_unique_id: __chrome_unique_id,
          secret: secretKey
        });
      }else{
        popup.postMessage({
          isPaired: true
        });
      }
    });
    QRPopup = popup;
    popup.onMessage.addListener((msg)=>{
      // console.log(msg);
      if(msg==="deletePairing"){
        chrome.storage.local.clear();
        socket.emit('deletePairing', {
          fcm: __storage.__phone_fcm_id
        });
      }
    });
  }
});

socket.on('pairing', (data)=>{
  // console.log("Pairing");
  // console.log(data);
  // console.log(secret);
  if(data.secretKey !== secret.secretKey){
    // console.log("error");
    return socket.emit('error', {
      when: 'Pairing',
      what: 'Secret Key does not match'
    });
  }
  setStorage({
    __phone_fcm_id: data.fcm,
    __phone_unique_id: data.phoneId
  });
  __storage.__phone_unique_id = data.phoneId;
  __storage.__phone_fcm_id = data.fcm;
  QRPopup.postMessage({
    event: 'Pairing complete'
  });
  socket.emit('pairing-successful', {
    fcm: __storage.__phone_fcm_id,
    phoneId: __storage.__phone_unique_id,
    success: true
  });
  sendFCMMap();
});


/*
*  On Removing Pairing from phone, delete all data from here
*
*/
socket.on('deletePairing', (data)=>{
  // console.log("deletePairing");
  chrome.storage.local.clear();
  socket.emit('deletePairing-ack', {chromeId: __chrome_unique_id});
  __chrome_unique_id = undefined;
  __storage = undefined;
  socket.emit('join',{});
});

/*
*  Send a start notification sending request to phone
*/
function sendDisconnectEvent(){
  socket.emit('chrome-stopped', {
    fcm: __storage.__phone_fcm_id,
    chromeId: __chrome_unique_id
  });
}

chrome.windows.onRemoved.addListener((wid)=>{
  chrome.windows.getAll((windows)=>{
    if(windows.length <= 0){
      sendDisconnectEvent();
    }
  });
});



function sendFCMMap(){
  if(__storage.__phone_fcm_id){
    socket.emit('fcm-map', {
      chromeId: __chrome_unique_id,
      fcm: __storage.__phone_fcm_id
    });
  }else{
    return;
  }
}