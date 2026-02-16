// background.js
importScripts('crypto.js');
chrome.runtime.onInstalled.addListener(async () => {
    const storageKeys = Object.values(await getStorage(null));
//    chrome.storage.sync.clear();
    if(storageKeys == undefined || storageKeys.length == 0){

      const defaultKey = 'fol_'+generateRandomId(12);
      // 기본 폴더 하나만 생성
      const defaultData = {
        Id : defaultKey,
        OrgIds : [],
        Name : '기본 폴더',
        SortNumber : 0
      }
      const result = await setStorage(defaultKey, defaultData);
    }

    // 기존 평문 비밀번호를 암호화로 마이그레이션
    await migrateOrgPasswords();
    // 기존 embedded ORGs → 개별 아이템으로 분리 마이그레이션
    await migrateToSeparateOrgs();
  });
  function generateRandomId(length) {
    console.log('generateRandomId run');
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

// Salesforce 탭 업데이트 시 콘텐츠 스크립트에 파비콘 재적용 메시지 전송
const salesforceUrlPattern = /\.(lightning\.force\.com|salesforce\.com|salesforce-setup\.com)/;
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tab.url && salesforceUrlPattern.test(tab.url) && changeInfo.status === 'complete') {
        chrome.tabs.sendMessage(tabId, { type: 'reapplyFavicon' }).catch(() => {});
    }
});
