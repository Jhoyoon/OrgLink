// backgroud.js
chrome.runtime.onInstalled.addListener(async () => {
    const storageKeys = Object.values(await getStorage(null));
//    chrome.storage.sync.clear();
    if(storageKeys == undefined || storageKeys.length == 0){

      const defaultKey = 'fol_'+generateRandomId(12);
      // 기본 폴더 하나만 생성
      const defaultData = {
        Id : defaultKey,
        ORGs : [],
        Name : '기본 폴더',
        SortNumber : 0
      }
      const result = await setStorage(defaultKey, defaultData);
    }
  });
  function generateRandomId(length) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    const randomPart = Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, length);
    const timestamp = Date.now().toString();
    return timestamp + randomPart;
}
  function getStorage(keys) {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result);
        }
      });
    });
  }
  function setStorage(keys,value) {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.set({[keys] : value}, (result) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(result);
            }
        });
    });
}
