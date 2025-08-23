/**
 * 해당 파일에서 처리해야 할 기능들
 * 2. 사용자가 디테일 페이지에 진입했을 때, 자동으로 value들에 이벤트 리스너들을 달아줘야 한다.
 * 일단은 1번에 집중해서 개발
 */
// content.js
// backgroud.js를 찔러서 org Id를 받아온 이후에 스크립트를 실행시키자!
window.homeScriptExecuted = true;
window.addEventListener("load", async (event) => {
    console.log('DOMContentLoaded run');
    const params = new URLSearchParams(window.location.search);
    const encodeFolderId = params.get('Zm9sZGVySWQ');
    const encodeOrgId = params.get('b3JnSWQ');
    let decodeFolderId;
    let decodeOrgId;
    if((encodeFolderId == null || encodeFolderId == undefined) 
        ||
        (encodeOrgId == null || encodeOrgId == undefined)) return;
    decodeFolderId = decode(encodeFolderId);
    decodeOrgId = decode(encodeOrgId);
    
    const folder = (await getStorage(decodeFolderId))[decodeFolderId];
    let targetOrg = {};
    for(const tempOrg of folder.ORGs){
        if(tempOrg.Id == decodeOrgId){
            targetOrg = tempOrg;
            break;
        }
    }
    const form = document.querySelector("#login_form");
    console.log('form 가져옴');
    if(form && targetOrg){
        const h1 = document.createElement("h1");
        h1.innerText = '로그인 연결 중입니다...';
        // form 내부 모든 요소를 가져오기
        const formEls = form.querySelectorAll("*");
        formEls.forEach((element) => {
            element.style.display = "none";
        });
        form.prepend(h1);
        const Login = document.querySelector("#login_form #Login");
        const username = form.querySelector('#username');
        const password = form.querySelector('#password');
        username.value = targetOrg.UserName;
        password.value = targetOrg.Password;
        // form의 이벤트를 강제로 실행시킴
        form.dispatchEvent(new Event('submit', {cancelable: true, bubbles: true}))
    }
});
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
function decode(string){
    return decodeURIComponent(escape(atob(string)));
}