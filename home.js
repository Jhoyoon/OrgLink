window.homeScriptExecuted = true;

// 파비콘 로그 기록 함수
function logFavicon(message) {
    const timestamp = new Date().toLocaleTimeString();
    const log = `[${timestamp}] ${message}`;
    console.log(log);

    // localStorage에도 저장
    let logs = JSON.parse(localStorage.getItem('faviconLogs') || '[]');
    logs.push(log);
    // 최대 100개까지만 저장
    if (logs.length > 100) logs.shift();
    localStorage.setItem('faviconLogs', JSON.stringify(logs));
}

// 파비콘 생성 함수
function generateFavicon(color) {
    try {
        console.log('[파비콘] generateFavicon 시작, 색상:', color);
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            console.error('[파비콘] Canvas context를 생성할 수 없습니다');
            return null;
        }

        // Salesforce1 클라우드 아이콘에 색상 적용 (배경 없음)
        ctx.save();
        const scale = 32 / 520;
        ctx.scale(scale, scale);
        ctx.fillStyle = color;
        const cloudPath = new Path2D('M217 119c17-17 40-28 66-28 34 0 64 19 80 47 14-6 29-10 45-10 62 0 112 50 112 112s-50 112-112 112c-8 0-15-1-22-2a82.4 82.4 0 01-72 42c-13 0-25-3-36-8a92.7 92.7 0 01-86 56c-40 0-75-25-88-61-6 1-12 2-18 2a87 87 0 01-44-162 100.5 100.5 0 0193-140c35 1 64 16 82 40');
        ctx.fill(cloudPath);
        ctx.restore();

        const dataUrl = canvas.toDataURL('image/png');
        console.log('[파비콘] Data URL 생성 완료, 길이:', dataUrl.length);
        return dataUrl;
    } catch (error) {
        console.error('[파비콘] 파비콘 생성 중 오류:', error);
        return null;
    }
}

// 파비콘 적용 함수
function applyFavicon(color) {
    try {
        // 같은 색상이면 캐시된 URL 재사용
        if (color !== currentFaviconColor || !currentFaviconUrl) {
            currentFaviconUrl = generateFavicon(color);
        }
        if (!currentFaviconUrl) return;

        // Observer 일시 중단 (무한 루프 방지)
        if (faviconObserver) faviconObserver.disconnect();

        // 다른 확장/Salesforce 파비콘 모두 제거
        document.querySelectorAll('link[rel*="icon"]:not([data-orglink])').forEach(el => el.remove());

        // 기존 우리 파비콘이 있으면 href만 갱신, 없으면 새로 생성
        let link = document.querySelector('link[data-orglink="true"]');
        if (link) {
            link.href = currentFaviconUrl;
        } else {
            link = document.createElement('link');
            link.rel = 'icon';
            link.type = 'image/png';
            link.href = currentFaviconUrl;
            link.dataset.orglink = 'true';
            document.head.appendChild(link);
        }

        // Observer 재개
        if (faviconObserver) {
            faviconObserver.observe(document.head, {
                childList: true,
                attributes: true,
                subtree: true,
                attributeFilter: ['href']
            });
        }
    } catch (error) {
        console.error('[파비콘] 파비콘 적용 중 오류:', error);
    }
}

// chrome.storage.local 헬퍼 함수
function getLocalStorage(key) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(key, (result) => {
            if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
            else resolve(result);
        });
    });
}
function setLocalStorage(key, value) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set({[key]: value}, () => {
            if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
            else resolve();
        });
    });
}
function removeLocalStorage(key) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.remove(key, () => {
            if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
            else resolve();
        });
    });
}

// 현재 적용 중인 파비콘 색상 및 캐시된 Data URL
let currentFaviconColor = null;
let currentFaviconUrl = null;
let faviconObserver = null;
let debounceTimer = null;

// MutationObserver로 파비콘 변경 감시 (debounce로 다른 확장보다 나중에 실행)
function startFaviconGuard(color) {
    if (faviconObserver) faviconObserver.disconnect();
    if (debounceTimer) clearTimeout(debounceTimer);
    currentFaviconColor = color;

    faviconObserver = new MutationObserver((mutations) => {
        let changed = false;
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.tagName === 'LINK' && node.rel && node.rel.includes('icon') && !node.dataset.orglink) {
                    changed = true;
                }
            }
            if (mutation.type === 'attributes' && mutation.target.tagName === 'LINK'
                && mutation.target.rel && mutation.target.rel.includes('icon')
                && !mutation.target.dataset.orglink) {
                changed = true;
            }
        }
        if (changed) {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                console.log('[파비콘 Guard] Observer 감지 → 200ms 지연 후 재적용');
                applyFavicon(currentFaviconColor);
            }, 200);
        }
    });

    faviconObserver.observe(document.head, {
        childList: true,
        attributes: true,
        subtree: true,
        attributeFilter: ['href']
    });
}

// background.js에서 탭 업데이트 메시지 수신 시 파비콘 재적용
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'reapplyFavicon' && currentFaviconColor) {
        applyFavicon(currentFaviconColor);
    }
});

// 오그 식별 및 파비콘 적용
async function applyOrgFavicon() {
    try {
        console.log('[파비콘] applyOrgFavicon 시작');
        const hostname = window.location.hostname;
        const isLoginPage = hostname === 'login.salesforce.com' || hostname === 'test.salesforce.com';
        const isOrgPage = !isLoginPage;

        // URL 파라미터에서 orgId 추출
        const params = new URLSearchParams(window.location.search);
        const encodeOrgId = params.get('b3JnSWQ');
        const encodeFolderId = params.get('Zm9sZGVySWQ');

        if (encodeOrgId && encodeFolderId) {
            // URL 파라미터가 있는 경우 (로그인 페이지에서 오그 클릭 직후)
            const decodeOrgId = decode(encodeOrgId);

            // ORG 직접 조회
            const orgData = await getStorage(decodeOrgId);
            const targetOrg = orgData[decodeOrgId];

            if (!targetOrg) return;

            if (targetOrg.FaviconColor) {
                applyFavicon(targetOrg.FaviconColor);

                if (isLoginPage) {
                    // 로그인 페이지: 리다이렉트 후 Lightning 페이지에서 사용할 수 있도록 pendingFavicon 저장
                    await setLocalStorage('pendingFavicon', {
                        color: targetOrg.FaviconColor,
                        timestamp: Date.now()
                    });
                    console.log('[파비콘] pendingFavicon 저장 완료');
                }

                if (isOrgPage) {
                    // Lightning 페이지: 서브도메인 매핑 저장 + Observer 시작
                    const subdomain = window.location.hostname.split('.')[0];
                    await setLocalStorage('favicon_' + subdomain, { color: targetOrg.FaviconColor });
                    startFaviconGuard(targetOrg.FaviconColor);
                }
            }
            return;
        }

        // URL 파라미터가 없는 경우 (Lightning 페이지 직접 접속 또는 로그인 후 리다이렉트)
        if (isOrgPage) {
            const subdomain = window.location.hostname.split('.')[0];

            // 1. pendingFavicon 우선 확인 (로그인 직후 리다이렉트 — 최신 색상)
            const pendingResult = await getLocalStorage('pendingFavicon');
            if (pendingResult && pendingResult.pendingFavicon) {
                const pending = pendingResult.pendingFavicon;
                const elapsed = Date.now() - pending.timestamp;
                // 60초 이내의 pending만 유효
                if (elapsed < 60000) {
                    console.log('[파비콘] pendingFavicon으로 파비콘 적용:', pending.color);
                    applyFavicon(pending.color);
                    startFaviconGuard(pending.color);
                    // 서브도메인 매핑 갱신 (다음번 접속 시 바로 적용)
                    await setLocalStorage('favicon_' + subdomain, { color: pending.color });
                    await removeLocalStorage('pendingFavicon');
                    return;
                }
            }

            // 2. 서브도메인 매핑으로 시도 (이전에 저장된 색상)
            const subdomainResult = await getLocalStorage('favicon_' + subdomain);
            if (subdomainResult && subdomainResult['favicon_' + subdomain]) {
                const color = subdomainResult['favicon_' + subdomain].color;
                console.log('[파비콘] 서브도메인 기반 파비콘 적용:', color);
                applyFavicon(color);
                startFaviconGuard(color);
                return;
            }
        }
    } catch (error) {
        console.error('[파비콘] 파비콘 적용 중 오류:', error);
    }
}

// 페이지 로드 시 파비콘 적용 (기존 로그인 로직과 독립적으로 실행)
applyOrgFavicon().catch(err => console.error('[파비콘] 파비콘 초기화 오류:', err));

window.addEventListener("load", async (event) => {
    try {
        console.log('[로그인] 페이지 로드 이벤트 발생');
        const params = new URLSearchParams(window.location.search);
        const encodeFolderId = params.get('Zm9sZGVySWQ');
        const encodeOrgId = params.get('b3JnSWQ');

        console.log('[로그인] URL 파라미터:', { encodeFolderId, encodeOrgId });

        if((encodeFolderId == null || encodeFolderId == undefined)
            ||
            (encodeOrgId == null || encodeOrgId == undefined)) {
            console.log('[로그인] URL 파라미터 없음, 자동 로그인 스킵');
            return;
        }

        const decodeOrgId = decode(encodeOrgId);

        // ORG 직접 조회
        const orgData = await getStorage(decodeOrgId);
        const targetOrg = orgData[decodeOrgId];

        if (!targetOrg) {
            console.error('[로그인] 오그 데이터 없음');
            return;
        }

        console.log('[로그인] 대상 오그:', targetOrg);

        const form = document.querySelector("#login_form");
        if(form && targetOrg){
            console.log('[로그인] 자동 로그인 시작');
            // 비동기 작업을 먼저 완료 (DOM 조작 전)
            let decryptedPassword = '';
            try {
                decryptedPassword = await decryptPassword(targetOrg.Password);
            } catch (decryptErr) {
                console.error('[로그인] 비밀번호 복호화 실패:', decryptErr);
                // 평문 문자열이면 그대로 사용, 아니면 빈 문자열
                decryptedPassword = (typeof targetOrg.Password === 'string') ? targetOrg.Password : '';
            }
            // 이후 모든 DOM 조작을 동기 블록으로 실행
            const h1 = document.createElement("h1");
            h1.innerText = '로그인 연결 중입니다...';
            const formEls = form.querySelectorAll("*");
            formEls.forEach((element) => {
                element.style.display = "none";
            });
            form.prepend(h1);
            const username = form.querySelector('#username');
            const password = form.querySelector('#password');
            username.value = targetOrg.UserName;
            password.value = decryptedPassword;
            // form의 이벤트를 강제로 실행시킴
            form.dispatchEvent(new Event('submit', {cancelable: true, bubbles: true}))
        }
    } catch (error) {
        console.error('[로그인] 로그인 자동 채우기 중 오류:', error);
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