// background.js

// 기존 데이터 구조 → 새 데이터 구조 마이그레이션 매핑
const ORG_TYPE_MIGRATION_MAP = {
    '운영': 'production',
    '샌드박스': 'sandbox',
    '데브': 'developer',
    'SDO': 'SDO'
};

// 데이터 마이그레이션 함수
async function migrateDataIfNeeded() {
    const allData = await getStorage(null);
    let needsMigration = false;

    // 1. 마이그레이션 필요 여부 확인
    // folder.ORGs 배열이 존재하면 기존 구조 → 마이그레이션 필요
    for (const [key, value] of Object.entries(allData)) {
        if (key.startsWith('fol_') && Array.isArray(value.ORGs)) {
            needsMigration = true;
            break;
        }
    }

    if (!needsMigration) {
        return;
    }

    // 2. 마이그레이션 수행
    for (const [key, folder] of Object.entries(allData)) {
        if (!key.startsWith('fol_') || !Array.isArray(folder.ORGs)) continue;

        const orgIds = [];

        // 각 ORG를 별도 키로 저장
        for (const org of folder.ORGs) {
            // OrgType 한글 → 영어 변환
            const newOrgType = ORG_TYPE_MIGRATION_MAP[org.OrgType] || org.OrgType;

            // Description 1000자 제한 적용
            let description = org.Description || '';
            if (description.length > 1000) {
                description = description.substring(0, 1000);
            }

            const migratedOrg = {
                Id: org.Id,
                FolderId: org.FolderId || folder.Id,
                Name: org.Name,
                OrgType: newOrgType,
                URL: org.URL,
                UserName: org.UserName,
                Password: org.Password,
                Description: description,
                FaviconColor: '#0070d2',  // 새 필드 기본값
                SecurityToken: ''          // 새 필드 기본값
            };

            await setStorage(org.Id, migratedOrg);
            orgIds.push(org.Id);
        }

        // 폴더 구조 변환: ORGs → OrgIds
        const migratedFolder = {
            Id: folder.Id,
            Name: folder.Name,
            SortNumber: folder.SortNumber,
            OrgIds: orgIds
        };

        await setStorage(folder.Id, migratedFolder);
    }
}

chrome.runtime.onInstalled.addListener(async () => {
    // 기존 사용자 데이터 마이그레이션 (업데이트 시)
    await migrateDataIfNeeded();

    const storageKeys = Object.values(await getStorage(null));
    if(!storageKeys || storageKeys.length === 0){

      const defaultKey = `fol_${generateRandomId(12)}`;
      // 기본 폴더 하나만 생성
      const defaultData = {
        Id : defaultKey,
        OrgIds : [],
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
                const error = chrome.runtime.lastError;
                // 용량 초과 에러 로깅
                if (error.message && (error.message.includes('QUOTA') || error.message.includes('quota') || error.message.includes('exceeded'))) {
                    console.error('[OrgLink] 저장 용량 초과:', error.message);
                }
                reject(error);
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

// content script에서 자신의 탭 ID를 조회하기 위한 핸들러
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'getTabId') {
        sendResponse({ tabId: sender.tab ? sender.tab.id : null });
        return false;
    }
});

// 탭 닫힐 때 해당 탭의 pendingFavicon 정리
chrome.tabs.onRemoved.addListener((tabId) => {
    chrome.storage.local.remove('pendingFavicon_' + tabId);
});

// 탭 열기 + 탭 그룹 지정 메시지 핸들러 (popup이 닫혀도 동작하도록 background에서 처리)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'openTabWithGroup') {
        (async () => {
            try {
                const { url, useTabGroup, groupName, tabGroupColor, faviconColor } = message;
                const tab = await chrome.tabs.create({ url, active: true });

                // 파비콘 색상을 탭 ID 기반으로 저장 (popup이 닫혀도 background에서 처리)
                if (faviconColor) {
                    chrome.storage.local.set({ ['pendingFavicon_' + tab.id]: { color: faviconColor, timestamp: Date.now() } });
                }

                if (useTabGroup && groupName) {
                    // 기존 탭 그룹 중 같은 이름의 그룹 찾기
                    const groups = await chrome.tabGroups.query({});
                    let existingGroup = groups.find(g => g.title === groupName);

                    if (existingGroup) {
                        // 기존 그룹에 탭 추가
                        await chrome.tabs.group({ tabIds: tab.id, groupId: existingGroup.id });
                    } else {
                        // 새 그룹 생성
                        const groupId = await chrome.tabs.group({ tabIds: tab.id });
                        // 그룹 이름(오그 이름)과 색상 설정
                        await chrome.tabGroups.update(groupId, {
                            title: groupName,
                            color: tabGroupColor || 'blue'
                        });
                    }
                }
                sendResponse({ success: true, tabId: tab.id });
            } catch (e) {
                console.error('[OrgLink] openTabWithGroup 오류:', e);
                sendResponse({ success: false, error: e.message });
            }
        })();
        return true; // 비동기 응답을 위해 true 반환
    }
});

