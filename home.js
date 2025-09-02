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