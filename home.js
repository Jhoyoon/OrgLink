window.homeScriptExecuted = true;

// =====================
// 파비콘 적용 함수
// =====================
function applyFavicon(color) {
    if (!color) return;

    // Canvas로 파비콘 생성
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');

    // Salesforce 공식 구름 아이콘 (viewBox 0 0 520 520 → 32x32 스케일)
    const scale = 32 / 520;
    ctx.save();
    ctx.scale(scale, scale);
    ctx.fillStyle = color;
    const path = new Path2D('M217 119c17-17 40-28 66-28 34 0 64 19 80 47 14-6 29-10 45-10 62 0 112 50 112 112s-50 112-112 112c-8 0-15-1-22-2a82.4 82.4 0 01-72 42c-13 0-25-3-36-8a92.7 92.7 0 01-86 56c-40 0-75-25-88-61-6 1-12 2-18 2a87 87 0 01-44-162 100.5 100.5 0 0193-140c35 1 64 16 82 40');
    ctx.fill(path);
    ctx.restore();

    // 기존 파비콘 제거
    const existingLinks = document.querySelectorAll("link[rel*='icon']");
    existingLinks.forEach(link => link.remove());

    // 새 파비콘 적용
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/png';
    link.href = canvas.toDataURL('image/png');
    document.head.appendChild(link);
}

// 현재 탭의 pendingFavicon 확인 및 적용
async function checkAndApplyFavicon() {
    try {
        // background.js에 현재 탭 ID 요청
        const tabId = await new Promise(resolve => {
            chrome.runtime.sendMessage({ type: 'getTabId' }, (response) => {
                resolve(response && response.tabId);
            });
        });
        if (!tabId) return;

        const key = 'pendingFavicon_' + tabId;
        const result = await new Promise(resolve => {
            chrome.storage.local.get(key, resolve);
        });

        if (result[key]) {
            const { color, timestamp } = result[key];
            // 5분 이내의 pendingFavicon만 적용
            if (Date.now() - timestamp < 5 * 60 * 1000) {
                applyFavicon(color);
            }
            // 삭제하지 않음 — 탭 내 페이지 이동(로그인→Lightning) 시 재적용 필요
            // 정리는 탭 닫힐 때 background.js onRemoved에서 처리
        }
    } catch (e) {
        // 파비콘 확인 실패 시 무시
    }
}

// background.js에서 reapplyFavicon 메시지 수신
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'reapplyFavicon') {
        checkAndApplyFavicon();
    }
});

// 페이지 로드 시 파비콘 확인
window.addEventListener("load", async (event) => {
    // 파비콘 적용 확인
    checkAndApplyFavicon();

    const params = new URLSearchParams(window.location.search);
    const encodeFolderId = params.get('Zm9sZGVySWQ');
    const encodeOrgId = params.get('b3JnSWQ');
    let decodeFolderId;
    let decodeOrgId;
    if(!encodeFolderId || !encodeOrgId) return;
    decodeFolderId = decode(encodeFolderId);
    decodeOrgId = decode(encodeOrgId);

    // 새 데이터 모델: org가 개별 아이템(org_<id>)으로 저장됨
    const orgData = await getStorage(decodeOrgId);
    const targetOrg = orgData[decodeOrgId];
    if (!targetOrg) return;

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
