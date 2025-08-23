// // background.js
// let orgId = null;
// let folderId = null;

// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   console.log('첫번째 run');
//     console.log('message :: '+JSON.stringify(message));
//     console.log('sender :: '+JSON.stringify(sender));
//     console.log('sendResponse :: '+JSON.stringify(sendResponse));
//   if (message.type === "sendOrgId") {
//       console.log('popup.js로부터 데이터를 받았습니다.');
//     orgId = message.data.orgId;
//     folderId = message.data.folderId;
//   } else if (message.type === "checkOrgId") {
//       const data = {folderId : folderId,orgId : orgId};
//     // content_script가 로드되어 준비되었다면 데이터 전달
//     sendResponse({ data: data });
//     orgId = null;
//     folderId = null;
//     // 전달 후 데이터 초기화(필요시)
//     storedData = null;
//   }
//   // true를 반환하면 비동기 응답을 할 수 있음
//   return true;
// });
// chrome.runtime.onInstalled.addListener(async () => {
//     // console.log('onInstalled run');
//     // chrome.action.setBadgeText({
//     //   text: "OFF",
//     // });
//     // 폴더 목록을 담은 객체 예시
//     const storageKeys = Object.values(await getStorage(null));
// //    chrome.storage.sync.clear();

//     if(storageKeys == undefined || storageKeys.length == 0){

//       const defaultKey = 'fol'+generateRandomId(12);

//       // // 기본 폴더 하나만 생성
//       // const defaultData = {
//       //   Id : defaultKey,
//       //   ORGs : [],
//       //   Name : '기본 폴더'
//       // }
//       // const result = await setStorage(defaultKey, defaultData);
//     }
//   });
//   chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//     console.log('두번째 run');
//       if (request.action === "sendOrgId") {
//           console.log("Received ORG ID:", request.orgId);
//           sendResponse({ status: "success", orgId: request.orgId });
//           orgId = request.orgId;
//       }
//       return true; // 비동기 응답을 위해 true 반환
//   });
//   function generateRandomId(length) {
//     const array = new Uint8Array(length);
//     crypto.getRandomValues(array);
//     return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, length);
//   }
//   function getStorage(keys) {
//     return new Promise((resolve, reject) => {
//       chrome.storage.sync.get(keys, (result) => {
//         if (chrome.runtime.lastError) {
//           reject(chrome.runtime.lastError);
//         } else {
//           resolve(result);
//         }
//       });
//     });
//   }
//   function setStorage(key,value) {
//     return new Promise((resolve, reject) => {
//       chrome.storage.sync.set({keys : value}, (result) => {
//         if (chrome.runtime.lastError) {
//           reject(chrome.runtime.lastError);
//         } else {
//           resolve(result);
//         }
//       });
//     });
//   }


//   const extensions = 'https://developer.chrome.com/docs/extensions';
// const webstore = 'https://developer.chrome.com/docs/webstore';

// chrome.action.onClicked.addListener(async (tab) => {
//     console.log('callback run');
//     // Retrieve the action badge to check if the extension is 'ON' or 'OFF'
//     const prevState = await chrome.action.getBadgeText({ tabId: tab.id });
//     // Next state will always be the opposite
//     const nextState = prevState === 'ON' ? 'OFF' : 'ON';
//     console.log(prevState);
//     console.log(nextState);

//     // Set the action badge to the next state
//     await chrome.action.setBadgeText({
//       tabId: tab.id,
//       text: nextState,
//     });
//     if (nextState === "ON") {
//         // Insert the CSS file when the user turns the extension on
//         console.log('ON');
//         await chrome.scripting.insertCSS({
//           files: ["focus-mode.css"],
//           target: { tabId: tab.id },
//         });
//       }else if (nextState === "OFF") {
//         console.log('OFF');
//         // Remove the CSS file when the user turns the extension off
//         await chrome.scripting.removeCSS({
//           files: ["focus-mode.css"],
//           target: { tabId: tab.id },
//         });
//       }

// });