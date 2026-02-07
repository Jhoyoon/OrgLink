
// =====================
// XOR 난독화 유틸리티
// =====================
const XOR_KEY = 'OrgLinkSecretKey2024';

function xorObfuscate(str) {
    const bytes = new TextEncoder().encode(str);
    const key = new TextEncoder().encode(XOR_KEY);
    const result = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
        result[i] = bytes[i] ^ key[i % key.length];
    }
    // 각 바이트를 Latin-1 문자로 변환
    return Array.from(result).map(b => String.fromCharCode(b)).join('');
}

function xorDeobfuscate(str) {
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
        bytes[i] = str.charCodeAt(i);
    }
    const key = new TextEncoder().encode(XOR_KEY);
    const result = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
        result[i] = bytes[i] ^ key[i % key.length];
    }
    return new TextDecoder().decode(result);
}

/**
 * 스토리지에 row는 foler만
 * 오그는 칼럼 하나에 전부 다 담아버리자
 */
class Folder {
    Id; // fol + 12자리 랜덤 문자열
    OrgIds;
    Name;
    SortNumber;
    constructor(Id, OrgIds,Name,SortNumber) {
        this.Id = Id;
        this.OrgIds = OrgIds;
        this.Name = Name;
        this.SortNumber = SortNumber;
    }
}
class ORG {
    Id = ''; // org + 12자리 랜덤 문자열
    FolderId = '';
    Name = '';
    OrgType = '';
    URL = '';
    UserName = '';
    Password = '';
    Description = '';
    FaviconColor = '#0070d2';
    SecurityToken = '';
    TabGroupEnabled = false;
    TabGroupColor = 'blue';
    constructor(Id, FolderId, Name,OrgType, URL, UserName, Password,Description,FaviconColor,SecurityToken,TabGroupEnabled,TabGroupColor) {
        this.Id = Id;
        this.FolderId = FolderId;
        this.Name = Name;
        this.OrgType = OrgType;
        this.URL = URL;
        this.UserName = UserName;
        this.Password = Password;
        this.Description = Description;
        this.FaviconColor = FaviconColor || '#0070d2';
        this.SecurityToken = SecurityToken || '';
        // TabGroupEnabled는 boolean이므로 명시적으로 체크 (false도 유효한 값)
        this.TabGroupEnabled = typeof TabGroupEnabled === 'boolean' ? TabGroupEnabled : false;
        this.TabGroupColor = TabGroupColor || 'blue';
    }
}
const ORG_TYPE_LABELS = {
    'production': '운영',
    'sandbox': '샌드박스',
    'developer': '데브',
    'SDO': 'SDO'
};
function getOrgTypeLabel(value) {
    return ORG_TYPE_LABELS[value] || value;
}
const SVG_NS = "http://www.w3.org/2000/svg";
const XLINK_NS = "http://www.w3.org/1999/xlink";
const MAX_FOLDERS = 10;
const MAX_TOTAL_ORGS = 200;
let targetOrgId;
let targetFolderId;

// =====================
// 스토리지 캐시 (성능 최적화)
// =====================
const StorageCache = {
    _data: null,
    _lastFetch: 0,
    _maxAge: 5000, // 5초 캐시 유효

    async getAll() {
        const now = Date.now();
        if (this._data && (now - this._lastFetch) < this._maxAge) {
            return this._data;
        }
        this._data = await new Promise((resolve, reject) => {
            chrome.storage.sync.get(null, (result) => {
                if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
                else resolve(result);
            });
        });
        this._lastFetch = now;
        return this._data;
    },

    invalidate() {
        this._data = null;
        this._lastFetch = 0;
    },

    update(key, value) {
        if (this._data) {
            this._data[key] = value;
        }
    },

    remove(key) {
        if (this._data) {
            if (Array.isArray(key)) {
                key.forEach(k => delete this._data[k]);
            } else {
                delete this._data[key];
            }
        }
    }
};

// =====================
// 폼 유효성 검사 / 모달 헬퍼
// =====================
function validateRequired(value, divId, formId, errorText) {
    const div = document.querySelector(divId);
    const form = document.querySelector(formId);
    if (!value) {
        if (!div.classList.contains('slds-has-error')) {
            div.classList.add('slds-has-error');
            const msg = createDom('div', ['slds-form-element__help']);
            msg.textContent = errorText;
            form.appendChild(msg);
        }
        return false;
    } else {
        if (div.classList.contains('slds-has-error')) {
            div.classList.remove('slds-has-error');
            form.querySelector('.slds-form-element__help')?.remove();
        }
        return true;
    }
}

function clearFormErrors(container) {
    container.querySelectorAll('.slds-has-error').forEach(el => el.classList.remove('slds-has-error'));
    container.querySelectorAll('.slds-form-element__help').forEach(el => el.remove());
}

function closeModal(modalEl, backdropEl) {
    modalEl.classList.add('slds-hidden');
    modalEl.classList.remove('slds-fade-in-open');
    backdropEl.classList.remove('slds-backdrop_open');
    clearUIState();
}

// =====================
// 이벤트 위임 핸들러 (성능 최적화)
// =====================
function handleAccordionClick(event) {
    const target = event.target;

    // 아코디언 토글 버튼
    if (target.closest('.slds-accordion__summary-action')) {
        onClickSectionIconOnly(event);
        return;
    }

    // 드롭다운 메뉴 아이템 (트리거 체크보다 먼저!)
    const dropdownItem = target.closest('.slds-dropdown__item');
    if (dropdownItem) {
        const text = dropdownItem.textContent;
        if (text.includes('편집')) {
            onClickDropDownEdit(event);
            return;
        }
        if (text.includes('오그추가')) {
            onClickDropDownOrgAdd(event);
            return;
        }
        if (text.includes('폴더삭제')) {
            onClickDropDownFolderDelete(event);
            return;
        }
    }

    // 드롭다운 토글
    if (target.closest('.slds-dropdown-trigger')) {
        onClickDropDownDiv(event);
        return;
    }

    // Org 행 클릭
    const orgRow = target.closest('.org-row');
    if (orgRow) {
        event.stopPropagation();

        // Org 액션 아이콘 확인
        const actionIcon = target.closest('.org-action-icon');
        if (actionIcon) {
            const use = actionIcon.querySelector('use');
            const href = use?.getAttributeNS(XLINK_NS, 'href') || '';

            if (href.includes('#logout')) {
                orgLinkClick(event);
                return;
            }
            if (href.includes('#edit')) {
                onClickOrgEdit(event);
                return;
            }
            if (href.includes('#delete')) {
                onClickOrgDelete(event);
                return;
            }
        }

        onClickOrgRow(event);
        return;
    }
}

function handleDragStart(event) {
    const orgRow = event.target.closest('.org-row');
    if (orgRow) {
        onOrgDragStart(event);
        return;
    }

    const folderLi = event.target.closest('li.slds-accordion__list-item');
    if (folderLi) {
        onFolderDragStart(event);
        return;
    }
}

function handleDragOver(event) {
    if (draggingOrgId) {
        const orgRow = event.target.closest('.org-row');
        if (orgRow) {
            onOrgDragOver(event);
            return;
        }

        const content = event.target.closest('.slds-accordion__content');
        if (content) {
            onContentDragOver(event);
            return;
        }

        const section = event.target.closest('section.slds-accordion__section');
        if (section) {
            onSectionOrgDragOver(event);
            return;
        }
    }

    if (draggingFolderDragId) {
        const folderLi = event.target.closest('li.slds-accordion__list-item');
        if (folderLi) {
            onFolderDragOver(event);
            return;
        }
    }
}

function handleDragLeave(event) {
    if (draggingOrgId) {
        onOrgDragLeave(event);
    }
}

function handleDrop(event) {
    if (draggingOrgId) {
        const orgRow = event.target.closest('.org-row');
        if (orgRow) {
            onOrgDrop(event);
            return;
        }

        const content = event.target.closest('.slds-accordion__content');
        if (content) {
            onContentDrop(event);
            return;
        }

        const section = event.target.closest('section.slds-accordion__section');
        if (section) {
            onSectionOrgDrop(event);
            return;
        }
    }

    if (draggingFolderDragId) {
        onFolderDrop(event);
    }
}

function handleDragEnd(event) {
    if (draggingOrgId) {
        onOrgDragEnd(event);
        return;
    }

    if (draggingFolderDragId) {
        onFolderDragEnd();
        return;
    }
}

function showToast(message, type = 'error') {
    const existing = document.querySelector('.orglink-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = `orglink-toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function debounceGlobal(fn, wait) {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(null, args), wait);
    };
}

// 전체 오그 수 계산 함수
async function getTotalOrgCount() {
    const allData = await StorageCache.getAll();
    let count = 0;
    for (const key of Object.keys(allData)) {
        if (key.startsWith('org_')) count++;
    }
    return count;
}

document.addEventListener("DOMContentLoaded", init);
async function init() {
    const foldersContainer = document.querySelector('#folders-container');    
    const sectionFolderModal = document.querySelector('#folder-edit-modal');
    const buttonFolderEditModalX = sectionFolderModal.querySelector('#folder-edit-modal-x');
    const buttonFolderCloseButton =  sectionFolderModal.querySelector('#folder-modal-close-button');
    const buttonFolderAddButton = sectionFolderModal.querySelector('#folder-modal-add-button');
    const buttonGroundFolderAdd = document.querySelector('#ground-folder-add');
    const divOrgTypeDropdown = document.querySelector('#combobox-div');
    const ulOrgType = document.querySelector('#org-type-ul');
    const buttonOrgModalX = document.querySelector('#org-modal-x');
    const buttonOrgModalClose = document.querySelector('#org-modal-close-button');
    const buttonOrgModalSave = document.querySelector('#org-modal-save-button');
    const orgDeleteCancel = document.querySelector('#org-delete-cancel');
    const orgDeleteConfirm = document.querySelector('#org-delete-confirm');
    const orgDeleteX = document.querySelector('#org-delete-x');
    const headerFolderAdd = document.querySelector('#header-folder-add');
    const folderDeleteX = document.querySelector('#folder-delete-x');
    const folderDeleteCancel = document.querySelector('#folder-delete-cancel');
    const folderDeleteConfirm = document.querySelector('#folder-delete-confirm');

    buttonFolderEditModalX.addEventListener('click',onClickFolderModalX);
    buttonFolderCloseButton.addEventListener('click',onClickFolderModalClose);
    buttonFolderAddButton.addEventListener('click',onClickFolderSave);
    buttonGroundFolderAdd.addEventListener('click',onClickGroundFolderAdd);
    divOrgTypeDropdown.addEventListener('click',onClickOrgTypeDropdown);
    ulOrgType.addEventListener('click',onClickUlOrgType);
    buttonOrgModalX.addEventListener('click',onClickButtonOrgModalX);
    buttonOrgModalClose.addEventListener('click',onClickButtonOrgModalClose);
    buttonOrgModalSave.addEventListener('click',onClickOrgModalSave);
    orgDeleteCancel.addEventListener('click',onClickOrgDeleteCancel);
    orgDeleteConfirm.addEventListener('click',onClickOrgDeleteConfirm);
    orgDeleteX.addEventListener('click',onClickOrgDeleteCancel);
    headerFolderAdd.addEventListener('click',onClickGroundFolderAdd);
    folderDeleteX.addEventListener('click',onClickFolderDeleteModalX);
    folderDeleteCancel.addEventListener('click',onClickFolderDeleteModalCancel);
    folderDeleteConfirm.addEventListener('click',onClickFolderDeleteModalDelete);

    // 설정 모달
    document.querySelector('#header-settings').addEventListener('click', onClickOpenSettings);
    document.querySelector('#settings-modal-x').addEventListener('click', onClickCloseSettings);
    document.querySelector('#settings-modal-close').addEventListener('click', onClickCloseSettings);
    // 설정 모달 아코디언 토글
    document.querySelectorAll('#settings-modal .slds-accordion__summary-action').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const section = e.currentTarget.closest('.slds-accordion__section');
            const nowOpen = !section.classList.contains('slds-is-open');
            section.classList.toggle('slds-is-open', nowOpen);
            e.currentTarget.setAttribute('aria-expanded', String(nowOpen));
        });
    });
    // 내보내기/가져오기
    document.querySelector('#btn-export').addEventListener('click', onClickExport);
    document.querySelector('#btn-import').addEventListener('click', () => {
        document.querySelector('#import-file-input').click();
    });
    document.querySelector('#import-file-input').addEventListener('change', onFileImport);

    // 설명 글자 수 카운터
    const descriptionTextarea = document.querySelector('#org-description');
    const descCountDiv = document.createElement('div');
    descCountDiv.id = 'org-description-count';
    descCountDiv.className = 'desc-char-count';
    descCountDiv.textContent = '0 / 1,000';
    descriptionTextarea.parentElement.appendChild(descCountDiv);
    descriptionTextarea.addEventListener('input', () => {
        descCountDiv.textContent = `${descriptionTextarea.value.length.toLocaleString()} / 1,000`;
    });

    // UI 상태 자동 저장 (모달 입력 변경 시)
    const autoSaveUI = debounceGlobal(saveUIState, 300);
    document.querySelector('#org-name')?.addEventListener('input', autoSaveUI);
    document.querySelector('#org-username')?.addEventListener('input', autoSaveUI);
    document.querySelector('#password')?.addEventListener('input', autoSaveUI);
    document.querySelector('#security-token')?.addEventListener('input', autoSaveUI);
    document.querySelector('#org-description')?.addEventListener('input', autoSaveUI);
    // 파비콘 색상 박스 클릭 → color picker 열기
    const faviconBox = document.querySelector('#favicon-color-box');
    const faviconInput = document.querySelector('#org-favicon-color');
    if (faviconBox && faviconInput) {
        faviconBox.addEventListener('click', (e) => {
            if (e.target === faviconInput) return;
            faviconInput.click();
        });
        faviconInput.addEventListener('input', (e) => {
            const icon = document.querySelector('#favicon-cloud-icon path');
            if (icon) icon.setAttribute('fill', e.target.value);
        });
        faviconInput.addEventListener('change', () => {
            saveUIState();
        });
    }
    // 탭 그룹 색상 선택기
    const tabGroupColorPicker = document.querySelector('#tab-group-color-picker');
    if (tabGroupColorPicker) {
        tabGroupColorPicker.addEventListener('click', (e) => {
            const btn = e.target.closest('.tab-group-color-btn');
            if (!btn) return;
            // 비활성화 상태면 무시
            if (tabGroupColorPicker.classList.contains('disabled')) return;
            const color = btn.dataset.color;
            document.querySelector('#tab-group-color').value = color;
            // 선택 표시 업데이트
            tabGroupColorPicker.querySelectorAll('.tab-group-color-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            saveUIState();
        });
    }
    // 고급 설정 아코디언 토글
    const advancedSettingsToggle = document.querySelector('#advanced-settings-toggle');
    if (advancedSettingsToggle) {
        advancedSettingsToggle.addEventListener('click', (e) => {
            const section = document.querySelector('#advanced-settings-section');
            const isOpen = section.classList.contains('slds-is-open');
            section.classList.toggle('slds-is-open', !isOpen);
            advancedSettingsToggle.setAttribute('aria-expanded', String(!isOpen));
        });
    }
    // 탭 그룹 기능 체크박스
    const tabGroupEnabledCheckbox = document.querySelector('#tab-group-enabled');
    if (tabGroupEnabledCheckbox) {
        tabGroupEnabledCheckbox.addEventListener('change', (e) => {
            updateTabGroupColorPickerState(e.target.checked);
            saveUIState();
        });
    }
    document.querySelector('#folder-name')?.addEventListener('input', autoSaveUI);
    document.querySelector('#org-folder-select')?.addEventListener('change', saveUIState);
    window.addEventListener('beforeunload', saveUIState);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') saveUIState();
    });

    // 메모리 정리: popup 종료 시 전역 상태 및 캐시 정리
    window.addEventListener('unload', cleanupOnClose);

    // 이벤트 위임 (성능 최적화): 개별 리스너 대신 상위 컨테이너에 단일 핸들러
    const accordionUl = document.querySelector('#folders-container > ul.slds-accordion');
    accordionUl.addEventListener('click', handleAccordionClick);
    accordionUl.addEventListener('dragstart', handleDragStart);
    accordionUl.addEventListener('dragover', (e) => {
        // 기존 폴백 처리 유지
        if (draggingFolderDragId) e.preventDefault();
        if (draggingOrgId) e.preventDefault();
        // 위임 핸들러 호출
        handleDragOver(e);
    });
    accordionUl.addEventListener('dragleave', handleDragLeave);
    accordionUl.addEventListener('drop', (e) => {
        // 기존 폴백 처리 유지
        if (draggingFolderDragId) {
            e.preventDefault();
            folderDropDone = true;
        }
        if (draggingOrgId) {
            e.preventDefault();
            orgDropSuccess = true;
        }
        // 위임 핸들러 호출
        handleDrop(e);
    });
    accordionUl.addEventListener('dragend', handleDragEnd);

    renderFolderList();
    await restoreUIState();
}

// =====================
// DOM 정리 함수 (메모리 누수 방지)
// =====================
function cleanupAccordionDOM() {
    const accordionUl = document.getElementById("folders-container")?.querySelector('ul.slds-accordion');
    if (!accordionUl) return;

    // FLIP 애니메이션의 transform/transition 스타일 정리
    accordionUl.querySelectorAll('[style*="transform"]').forEach(el => {
        el.style.transform = '';
        el.style.transition = '';
    });

    // 드래그 상태 클래스 정리
    accordionUl.querySelectorAll('.dragging, .drag-settled').forEach(el => {
        el.classList.remove('dragging', 'drag-settled');
    });
}

// Popup 종료 시 메모리 정리
function cleanupOnClose() {
    // 전역 상태 정리
    targetOrgId = null;
    targetFolderId = null;
    draggingFolderDragId = null;
    draggingOrgId = null;
    draggingFolderId = null;
    deleteFolderId = null;
    folderDropDone = false;
    orgDropSuccess = false;

    // 검색 캐시 정리
    if (window.__fullDatasetForSearch) {
        window.__fullDatasetForSearch = null;
    }

    // 스토리지 캐시 정리
    StorageCache.invalidate();

    // pendingFavicon 정리 (30초 이상 된 것)
    chrome.storage.local.get(null, (result) => {
        const keysToRemove = [];
        for (const key of Object.keys(result)) {
            if (key.startsWith('pendingFavicon_') && result[key].timestamp) {
                if (Date.now() - result[key].timestamp > 30000) {
                    keysToRemove.push(key);
                }
            }
        }
        if (keysToRemove.length > 0) {
            chrome.storage.local.remove(keysToRemove);
        }
    });
}

let folderSize = null;
async function renderFolderList() {
    try {
        // 로컬 스토리지에서 모든 데이터 싹 가져와야 됨
        const allData = await StorageCache.getAll();
        const folders = Object.values(allData).filter(d => d && d.Id && d.Id.startsWith('fol_'));
        folderSize = folders.length;
        folders.sort((a, b) => a.SortNumber - b.SortNumber);
        const accordionStates = await getAccordionStates();
        const accordionUl = document.getElementById("folders-container").querySelector('ul.slds-accordion');

        // DOM 정리 후 innerHTML 클리어
        cleanupAccordionDOM();
        accordionUl.innerHTML = "";

        // 검색 캐시 무효화
        window.__fullDatasetForSearch = null;
        for(const folder of folders || []){
        // 이벤트 위임 사용으로 개별 리스너 제거됨
        const li = createDom('li',['slds-accordion__list-item','slds-m-bottom_small'],{border : '1px solid #d8dde6', borderRadius: '12px'},{ draggable: true } );
        // slds-is-open
        const isOpen = accordionStates[folder.Id] !== undefined ? accordionStates[folder.Id] : true;
        const sectionClasses = ['slds-accordion__section'];
        if (isOpen) sectionClasses.push('slds-is-open');
        const section = createDom('section', sectionClasses);
        section.dataset.folderId = folder.Id;

        const accordionSummaryDiv = createDom('div',['slds-accordion__summary','lds-theme_shade'],{backgroundColor : '#f3f3f3', borderRadius: '12px 12px 0 0'});
    
        const accordionSummaryH2 = createDom('h2',['slds-accordion__summary-heading']);
        const accordionSummaryButton = createDom('button',['slds-button','slds-button_reset','slds-accordion__summary-action'],null,{'aria-controls' : folder.Id,'aria-expanded' : String(isOpen),'title' : 'Accordion summary'});
        // 이벤트 위임 사용
        const accordionSvg = createSVG(['slds-accordion__summary-action-icon','slds-button__icon','slds-button__icon_left'],null,{'aria-hidden' : 'true', "pointer-events": "auto"});
        const accordionUse = createUse(null,null,null,{'xlink:href' : {namespace : XLINK_NS,value : './assets/icons/utility-sprite/svg/symbols.svg#switch'}});

        const accordionSpan = createDom('span',['slds-accordion__summary-content']);
        accordionSpan.textContent = folder.Name;
        accordionSvg.appendChild(accordionUse);
        accordionSummaryButton.append(accordionSvg,accordionSpan);
        accordionSummaryH2.appendChild(accordionSummaryButton);
        accordionSummaryDiv.appendChild(accordionSummaryH2);
        // h2까지 세팅 완료
        // slds-is-open
        const dropDownDiv = createDom('div',['slds-dropdown-trigger','slds-dropdown-trigger_click']);
        // 이벤트 위임 사용
        const showMoreButton = createDom('button',['slds-button','slds-button_icon','slds-button_icon-border-filled','slds-button_icon-x-small'],null,{'aria-haspopup':'true','title':'Show More'});
        const showMoreSvg = createSVG(['slds-button__icon'],null,{'aria-hidden' : 'true'});
        
        const showMoreUse = createUse(null,null,null,{'xlink:href' : {namespace : XLINK_NS,value : './assets/icons/utility-sprite/svg/symbols.svg#down'}});
        const showMoreSpan = createDom('span',['slds-assistive-text']);
        showMoreSpan.textContent = 'Show More';
        const dropDownActionDiv=  createDom('div',['slds-dropdown','slds-dropdown_actions','slds-dropdown_right']);
        const dropDownActionUl = createDom('ul',['slds-dropdown__list'],null,{'role':'menu'});
        const dropwDownActionLiEdit = createDom('li',['slds-dropdown__item'],null,{'role':'presentation'});
        // 이벤트 위임 사용
        const dropwDownActionLiEditA = createDom('a',null,null,{'role' : 'menuitem','tabindex':'0'});
        const dropDownActionLiEditSpan = createDom('span',['slds-truncate'],null,{'title' : '편집'});
        dropDownActionLiEditSpan.textContent = '편집';

        const dropDownActionLiOrgAdd = createDom('li',['slds-dropdown__item'],null,{'role' : 'presentation'});
        const dropDownActionLiOrgAddA = createDom('a',null,null,{'role' : 'menuitem','tabindex':'1'});
        const dropDownActionLiOrgAddSpan = createDom('span',['slds-truncate'],null,{'title' : '오그추가'});
        // 이벤트 위임 사용
        dropDownActionLiOrgAddSpan.textContent = '오그추가';
        // button에 붙이자
        showMoreSvg.appendChild(showMoreUse);
        showMoreButton.appendChild(showMoreSvg);
        // 폴더 삭제
        const dropDownActionLiFolderDelete = createDom('li',['slds-dropdown__item'],null,{'role' : 'presentation'});
        const dropDownActionAFolderDelete = createDom('a',null,null,{'role' : 'menuitem','tabindex':'1'});
        const dropDownActionSpanFolderDelete = createDom('span',['slds-truncate'],null,{'title' : '폴더 삭제'});
        // 이벤트 위임 사용
        dropDownActionSpanFolderDelete.textContent = '폴더삭제';
        dropDownActionAFolderDelete.appendChild(dropDownActionSpanFolderDelete);
        dropDownActionLiFolderDelete.appendChild(dropDownActionAFolderDelete);
        
        // drop down div
        dropwDownActionLiEditA.appendChild(dropDownActionLiEditSpan);
        dropwDownActionLiEdit.appendChild(dropwDownActionLiEditA);
        dropDownActionLiOrgAddA.appendChild(dropDownActionLiOrgAddSpan);
        dropDownActionLiOrgAdd.appendChild(dropDownActionLiOrgAddA);
        // 모든 액션을 동일한 드롭다운 리스트(ul) 안에 포함
        dropDownActionUl.append(
          dropwDownActionLiEdit,
          dropDownActionLiOrgAdd,
          dropDownActionLiFolderDelete
        );
        dropDownActionDiv.append(dropDownActionUl);
        // dropDownDiv에는 버튼 + 드롭다운 컨테이너만 배치
        dropDownDiv.append(showMoreButton, dropDownActionDiv);
        // summary div
        accordionSummaryDiv.appendChild(dropDownDiv);
        // section
        section.appendChild(accordionSummaryDiv);
        // 이제 내부 컨텐츠 채우면 됨
        // slds-is-open
        // const divAccordionContent = createDom('div',['slds-accordion__content','slds-grid','slds-m-top_small','slds-is-open'],{borderBottom : '1px solid rgba(128, 128, 128, 0.5)'},{'id' : folder.Id});
        // 해당 dom에 dropOver 이벤트 걸기
        const divAccordionContent = createDom('div',['slds-accordion__content','slds-m-top_small','slds-is-open'],null,{'id' : folder.Id});
        // 이벤트 위임 사용
        section.appendChild(divAccordionContent);
        const orgs = (folder.OrgIds || []).filter(id => allData[id]).map(id => allData[id]);
        for(let ORG of orgs){
            // 각 오그를 감싸는 row div 생성 (이게 핵심!)
            // 해당 orgRow에 drag 허용
            // 이벤트 위임 사용으로 개별 리스너 제거됨
            let orgRow = createDom('div', ['slds-grid', 'slds-p-vertical_x-small', 'org-row'],{
                borderBottom: '1px solid rgba(128, 128, 128, 0.5)',
                cursor: 'grab'
            },{draggable: true});
            orgRow.dataset.orgId = ORG.Id;

            let divOrgName = createDom('div',['slds-col','slds-size_9-of-12']);
            let pOrgName = createDom('p',null);
            pOrgName.textContent = ORG.Name;
            divOrgName.appendChild(pOrgName);
            // ORG URL (이벤트 위임 사용)
            let divOrgUrl = createDom('div',['slds-col','slds-size_1-of-12','org-action-icon']);
            let svgOrgUrl = createSVG(['slds-button__icon'],null,{'aria-hidden' : 'true',cursor: 'pointer'} );
            let useOrgUrl = createUse(null,null,null,{'xlink:href' : {namespace : XLINK_NS,value : './assets/icons/utility-sprite/svg/symbols.svg#logout'}});
            svgOrgUrl.appendChild(useOrgUrl);
            divOrgUrl.appendChild(svgOrgUrl);
            // ORG Edit (이벤트 위임 사용)
            let divOrgEdit = createDom('div',['slds-col','slds-size_1-of-12','org-action-icon']);
            let svgOrgEdit = createSVG(['slds-button__icon'],null,{'aria-hidden' : 'true',cursor: 'pointer'});
            let useOrgEdit = createUse(null,null,null,{'xlink:href' : {namespace : XLINK_NS,value : './assets/icons/utility-sprite/svg/symbols.svg#edit'}});
            svgOrgEdit.appendChild(useOrgEdit);
            divOrgEdit.appendChild(svgOrgEdit);
            // ORG Delete (이벤트 위임 사용)
            let divOrgDelete = createDom('div',['slds-col','slds-size_1-of-12','org-action-icon']);
            let svgOrgDelete = createSVG(['slds-button__icon'],null,{'aria-hidden' : 'true',cursor: 'pointer' });
            let useOrgDelete = createUse(null,null,null,{'xlink:href' : {namespace : XLINK_NS,value : './assets/icons/utility-sprite/svg/symbols.svg#delete'}});
            svgOrgDelete.appendChild(useOrgDelete);
            divOrgDelete.appendChild(svgOrgDelete);
            // ***여기서 한 줄로 묶기***
            orgRow.append(divOrgName, divOrgUrl, divOrgEdit, divOrgDelete);
            // 그리고 row div를 accordionContent에 넣기!
            divAccordionContent.appendChild(orgRow);
            // divAccordionContent.append(divOrgName,divOrgUrl,divOrgEdit,divOrgDelete);
        }
        li.appendChild(section);
        accordionUl.appendChild(li);
    }
    } catch (error) {
        console.error('폴더 목록 렌더링 중 오류:', error);
    }
  }
  // 진행 중인 FLIP 트랜지션 즉시 완료 (정확한 위치 계산용)
  function clearFlipTransforms(parent, selector) {
    parent.querySelectorAll(selector).forEach(item => {
        item.style.transform = '';
        item.style.transition = '';
    });
  }

  // FLIP 애니메이션 헬퍼 (First-Last-Invert-Play) - 메모리 최적화 버전
  function flipAnimate(parent, selector) {
    let items = Array.from(parent.querySelectorAll(selector));

    // 뷰포트 내 요소만 애니메이션 적용 (성능 최적화)
    if (items.length > 20) {
        const viewportBottom = window.innerHeight;
        items = items.filter(item => {
            const rect = item.getBoundingClientRect();
            return rect.top < viewportBottom && rect.bottom > 0;
        });
    }

    const rects = new Map();
    items.forEach(item => rects.set(item, item.getBoundingClientRect()));

    return () => {
        const moved = [];
        items.forEach(item => {
            const oldRect = rects.get(item);
            if (!oldRect) return;
            const newRect = item.getBoundingClientRect();
            const dy = oldRect.top - newRect.top;
            const dx = oldRect.left - newRect.left;
            if (dy === 0 && dx === 0) return;
            item.style.transform = `translate(${dx}px, ${dy}px)`;
            item.style.transition = 'none';
            moved.push(item);
        });

        // 메모리 정리: 이동 없으면 즉시 참조 해제
        if (moved.length === 0) {
            rects.clear();
            items = null;
            return;
        }

        void parent.offsetHeight;
        moved.forEach(item => {
            item.style.transition = 'transform 150ms ease';
            item.style.transform = '';
            item.addEventListener('transitionend', function handler() {
                item.style.transition = '';
                item.removeEventListener('transitionend', handler);
            }, { once: true });
        });

        // 애니메이션 완료 후 메모리 정리
        setTimeout(() => {
            rects.clear();
            items = null;
        }, 200);
    };
  }

  let draggingFolderDragId = null;
  let folderDropDone = false;
  function onFolderDragStart(event){
    event.dataTransfer.effectAllowed = 'move';
    // 이벤트 위임 호환: event.target에서 li 찾기
    const li = event.target.closest('li.slds-accordion__list-item');
    if (!li) return;
    draggingFolderDragId = li.querySelector('section').dataset.folderId;
    requestAnimationFrame(() => li.classList.add('dragging'));
  }
  function onFolderDragOver(event){
    if(!draggingFolderDragId) return;
    event.preventDefault();
    const draggedLi = document.querySelector(`section[data-folder-id="${draggingFolderDragId}"]`)?.closest('li.slds-accordion__list-item');
    // 이벤트 위임 호환: event.target에서 li 찾기
    const targetLi = event.target.closest('li.slds-accordion__list-item');
    if (!draggedLi || !targetLi || draggedLi === targetLi) return;
    const parent = targetLi.parentNode;
    clearFlipTransforms(parent, ':scope > li.slds-accordion__list-item');
    const rect = targetLi.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const insertTarget = event.clientY < midY ? targetLi : targetLi.nextSibling;
    if (draggedLi === insertTarget || draggedLi.nextSibling === insertTarget) return;
    const playFlip = flipAnimate(parent, ':scope > li.slds-accordion__list-item');
    parent.insertBefore(draggedLi, insertTarget);
    playFlip();
  }
  async function onFolderDragEnd(){
    if (!draggingFolderDragId) return;
    const draggedLi = document.querySelector(`section[data-folder-id="${draggingFolderDragId}"]`)?.closest('li.slds-accordion__list-item');
    if (draggedLi) draggedLi.classList.remove('dragging');
    clearFlipTransforms(draggedLi?.parentNode, ':scope > li.slds-accordion__list-item');
    await saveFolderOrderFromDOM();
    if (draggedLi) {
        draggedLi.classList.add('drag-settled');
        setTimeout(() => draggedLi.classList.remove('drag-settled'), 400);
    }
    folderDropDone = false;
    draggingFolderDragId = null;
  }
  function onFolderDrop(event){
    if(!draggingFolderDragId) return;
    event.preventDefault();
    folderDropDone = true;
  }

  async function saveFolderOrderFromDOM() {
    const accordionUl = document.getElementById("folders-container").querySelector('ul.slds-accordion');
    const lis = Array.from(accordionUl.querySelectorAll(':scope > li.slds-accordion__list-item'));
    for (let i = 0; i < lis.length; i++) {
        const folderId = lis[i].querySelector('section')?.dataset.folderId;
        if (folderId) {
            const folderData = (await getStorage(folderId))[folderId];
            folderData.SortNumber = i + 1;
            await setStorage(folderId, folderData);
        }
    }
  }

  let deleteFolderId = null;
  function onClickDropDownFolderDelete(event){
    // 폴더 삭제 모달 활성화
    // 이벤트 위임 호환: event.target에서 요소 찾기
    const rootSection = event.target.closest('.slds-accordion__section');
    deleteFolderId = rootSection.dataset.folderId;
    const orgDeleteConfirmModal = document.querySelector('#folder-delete-confirm-modal');
    orgDeleteConfirmModal.classList.remove('slds-hidden');
    orgDeleteConfirmModal.classList.add('slds-fade-in-open');
    const divEditBackdrop = document.querySelector('#folder-delete-backdrop');
    divEditBackdrop.classList.add('slds-backdrop_open');
    saveUIState();
  }
  function onClickFolderDeleteModalCancel(event){
    deleteFolderId = null;
    closeModal(document.querySelector('#folder-delete-confirm-modal'), document.querySelector('#folder-delete-backdrop'));
  }
  function onClickFolderDeleteModalX(event){
    closeModal(document.querySelector('#folder-delete-confirm-modal'), document.querySelector('#folder-delete-backdrop'));
  }
  async function onClickFolderDeleteModalDelete(event){
    // 폴더에 속한 ORG 아이템도 함께 삭제
    const folder = (await getStorage(deleteFolderId))[deleteFolderId];
    const orgIdsToDelete = folder?.OrgIds || [];
    await deleteStorageKeys([...orgIdsToDelete, deleteFolderId]);
    closeModal(document.querySelector('#folder-delete-confirm-modal'), document.querySelector('#folder-delete-backdrop'));
    renderFolderList();
  }

  function onClickSectionIconOnly(event) {
    event.stopPropagation();
    // 이벤트 위임 호환: event.target에서 요소 찾기
    const button = event.target.closest('.slds-accordion__summary-action');
    const section = event.target.closest('.slds-accordion__section');
    if (!section || !button) return;
    const nowOpen = !section.classList.contains('slds-is-open');
    section.classList.toggle('slds-is-open', nowOpen);
    button.setAttribute('aria-expanded', String(nowOpen));
    saveAccordionStates();
  }
let draggingOrgId = null;
let draggingFolderId = null;
let orgDropSuccess = false;

function onOrgDragStart(event) {
    event.stopPropagation();
    event.dataTransfer.effectAllowed = 'move';
    // 이벤트 위임 호환: event.target에서 요소 찾기
    const orgRow = event.target.closest('.org-row');
    if (!orgRow) return;
    draggingOrgId = orgRow.dataset.orgId;
    draggingFolderId = orgRow.closest('section.slds-accordion__section').dataset.folderId;
    requestAnimationFrame(() => orgRow.classList.add('dragging'));
}

function onOrgDragOver(event) {
    if (!draggingOrgId) return;
    event.preventDefault();
    event.stopPropagation();
    // 이벤트 위임 호환: event.target에서 요소 찾기
    const orgRow = event.target.closest('.org-row');
    if (!orgRow) return;
    const draggedRow = document.querySelector(`.org-row[data-org-id="${draggingOrgId}"]`);
    if (!draggedRow || draggedRow === orgRow) return;
    const parent = orgRow.parentNode;
    clearFlipTransforms(parent, '.org-row');
    const rect = orgRow.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const insertTarget = event.clientY < midY ? orgRow : orgRow.nextSibling;
    if (draggedRow === insertTarget || draggedRow.nextSibling === insertTarget) return;
    const playFlip = flipAnimate(parent, '.org-row');
    parent.insertBefore(draggedRow, insertTarget);
    playFlip();
}
function onOrgDragLeave(event) {
    // no-op
}
async function onOrgDrop(event) {
    if (!draggingOrgId) return;
    event.preventDefault();
    event.stopPropagation();
    orgDropSuccess = true;
}
async function onOrgDragEnd(event) {
    event.stopPropagation();
    if (!draggingOrgId) {
        orgDropSuccess = false;
        return;
    }
    const draggedRow = document.querySelector(`.org-row[data-org-id="${draggingOrgId}"]`);
    if (draggedRow) draggedRow.classList.remove('dragging');
    const parentContent = draggedRow?.parentNode;
    if (parentContent) clearFlipTransforms(parentContent, '.org-row');
    await saveOrgOrderFromDOM();
    if (draggedRow) {
        draggedRow.classList.add('drag-settled');
        setTimeout(() => draggedRow.classList.remove('drag-settled'), 400);
    }
    orgDropSuccess = false;
    draggingOrgId = null;
    draggingFolderId = null;
}

async function saveOrgOrderFromDOM() {
    const draggedRow = document.querySelector(`.org-row[data-org-id="${draggingOrgId}"]`);
    if (!draggedRow) return;
    const newSection = draggedRow.closest('section.slds-accordion__section');
    const newFolderId = newSection?.dataset.folderId;
    if (!newFolderId) return;
    if (newFolderId === draggingFolderId) {
        // 같은 폴더 내 순서 변경: OrgIds 순서만 갱신
        const folder = (await getStorage(newFolderId))[newFolderId];
        const contentDiv = newSection.querySelector('.slds-accordion__content');
        const orgRows = Array.from(contentDiv.querySelectorAll('.org-row'));
        const newOrder = orgRows.map(row => row.dataset.orgId);
        folder.OrgIds = newOrder.filter(id => (folder.OrgIds || []).includes(id));
        await setStorage(newFolderId, folder);
    } else {
        // 폴더 간 이동: 양쪽 폴더 OrgIds 갱신 + ORG의 FolderId 갱신
        const sourceFolder = (await getStorage(draggingFolderId))[draggingFolderId];
        const targetFolder = (await getStorage(newFolderId))[newFolderId];
        // 소스 폴더에서 제거
        sourceFolder.OrgIds = (sourceFolder.OrgIds || []).filter(id => id !== draggingOrgId);
        // 타겟 폴더에 DOM 순서대로 추가
        const contentDiv = newSection.querySelector('.slds-accordion__content');
        const orgRows = Array.from(contentDiv.querySelectorAll('.org-row'));
        const newOrder = orgRows.map(row => row.dataset.orgId);
        targetFolder.OrgIds = newOrder;
        // ORG의 FolderId 갱신
        const org = await getOrgById(draggingOrgId);
        if (org) {
            org.FolderId = newFolderId;
            await setStorage(draggingOrgId, org);
        }
        await setStorage(draggingFolderId, sourceFolder);
        await setStorage(newFolderId, targetFolder);
    }
}

function onContentDragOver(event) {
    if (!draggingOrgId) return;
    event.preventDefault();
    event.stopPropagation();
    // 이벤트 위임 호환: event.target에서 요소 찾기
    const targetContent = event.target.closest('.slds-accordion__content');
    if (!targetContent) return;
    const draggedRow = document.querySelector(`.org-row[data-org-id="${draggingOrgId}"]`);
    if (!draggedRow) return;
    if (draggedRow.parentNode !== targetContent) {
        const sourceContent = draggedRow.parentNode;
        clearFlipTransforms(sourceContent, '.org-row');
        clearFlipTransforms(targetContent, '.org-row');
        const playFlipSource = flipAnimate(sourceContent, '.org-row');
        const playFlipTarget = flipAnimate(targetContent, '.org-row');
        targetContent.appendChild(draggedRow);
        playFlipSource();
        playFlipTarget();
    }
}

function onContentDrop(event) {
    if (!draggingOrgId) return;
    event.preventDefault();
    event.stopPropagation();
    orgDropSuccess = true;
}

function onSectionOrgDragOver(event) {
    if (!draggingOrgId) return;
    event.preventDefault();
    // 이벤트 위임 호환: event.target에서 요소 찾기
    const section = event.target.closest('section.slds-accordion__section');
    if (!section) return;
    if (!section.classList.contains('slds-is-open')) {
        section.classList.add('slds-is-open');
        saveAccordionStates();
    }
    const draggedRow = document.querySelector(`.org-row[data-org-id="${draggingOrgId}"]`);
    if (!draggedRow) return;
    const contentDiv = section.querySelector('.slds-accordion__content');
    if (contentDiv && draggedRow.parentNode !== contentDiv) {
        const sourceContent = draggedRow.parentNode;
        clearFlipTransforms(sourceContent, '.org-row');
        clearFlipTransforms(contentDiv, '.org-row');
        const playFlipSource = flipAnimate(sourceContent, '.org-row');
        const playFlipTarget = flipAnimate(contentDiv, '.org-row');
        contentDiv.appendChild(draggedRow);
        playFlipSource();
        playFlipTarget();
    }
}

function onSectionOrgDrop(event) {
    if (!draggingOrgId) return;
    event.preventDefault();
    event.stopPropagation();
    orgDropSuccess = true;
}
async function onClickOrgDeleteCancel(event){
    closeModal(event.currentTarget.closest('#org-delete-confirm-modal'), document.querySelector('#org-delete-backdrop'));
}
async function onClickOrgDeleteConfirm(event){
    // ORG 아이템 삭제
    await deleteStorage(targetOrgId);
    // 폴더의 OrgIds에서 제거
    const folder = (await getStorage(targetFolderId))[targetFolderId];
    folder.OrgIds = (folder.OrgIds || []).filter(id => id !== targetOrgId);
    await setStorage(targetFolderId,folder);
    closeModal(document.querySelector('#org-delete-confirm-modal'), document.querySelector('#org-delete-backdrop'));
    renderFolderList();
}
  async function onClickOrgDelete(event){
    // modal open
    const orgDeleteConfirmModal = document.querySelector('#org-delete-confirm-modal');
    orgDeleteConfirmModal.classList.remove('slds-hidden');
    orgDeleteConfirmModal.classList.add('slds-fade-in-open');
    // backDrop open
    const divOrgModalBackdrop = document.querySelector('#org-delete-backdrop');
    divOrgModalBackdrop.classList.add('slds-backdrop_open');
    //  // 1. 이벤트 위임 호환: event.target에서 가장 가까운 section 찾기
     const section = event.target.closest('section.slds-accordion__section');
    //  // 2. folderId 읽기
     const folderId = section ? section.dataset.folderId : null;
     const orgRow = event.target.closest('div.org-row');
     const orgId = orgRow.dataset.orgId;
     targetFolderId = folderId;
     targetOrgId = orgId;
     saveUIState();
  }
  async function onClickOrgEdit(event){
    try {
        // 이벤트 위임 호환: event.target에서 요소 찾기
        const section = event.target.closest('section.slds-accordion__section');
        // 2. folderId 읽기
        const folderId = section ? section.dataset.folderId : null;
        const orgRow = event.target.closest('div.org-row');
        const orgId = orgRow.dataset.orgId;
        targetOrgId = orgId;
        targetFolderId = folderId;
        const targetOrg = await getOrgById(orgId);

        if (!targetOrg) {
            console.error('오그 데이터를 찾을 수 없습니다');
            return;
        }

        // FaviconColor 필드가 없으면 추가 (하위 호환성)
        if (!targetOrg.FaviconColor) {
            targetOrg.FaviconColor = '#0070d2';
        }
        // TabGroupEnabled 필드가 없으면 추가 (하위 호환성)
        if (targetOrg.TabGroupEnabled === undefined) {
            targetOrg.TabGroupEnabled = false;
        }
        // TabGroupColor 필드가 없으면 추가 (하위 호환성)
        if (!targetOrg.TabGroupColor) {
            targetOrg.TabGroupColor = 'blue';
        }
    const sectionOrgModal = document.querySelector('#org-modal');
    // 그 안에서 텍스트 span 찾아서 값 가져오기
    sectionOrgModal.dataset.folderId = folderId;
    sectionOrgModal.querySelector('#org-name').value = targetOrg.Name;
    sectionOrgModal.querySelector('#org-type-value').dataset.value = targetOrg.OrgType;
    sectionOrgModal.querySelector('#org-type-value').textContent = getOrgTypeLabel(targetOrg.OrgType);
    sectionOrgModal.querySelector('#org-username').value = targetOrg.UserName;
    sectionOrgModal.querySelector('#password').value = targetOrg.Password || '';
    sectionOrgModal.querySelector('#security-token').value = targetOrg.SecurityToken || '';
    sectionOrgModal.querySelector('#org-description').value = targetOrg.Description;
    setFaviconColor(targetOrg.FaviconColor || '#0070d2');
    setTabGroupEnabled(targetOrg.TabGroupEnabled || false);
    setTabGroupColor(targetOrg.TabGroupColor || 'blue');
    // 소속 폴더 select 채우기
    await populateFolderSelect(folderId);
    // 글자 수 카운터 갱신
    const descCount = document.querySelector('#org-description-count');
    if (descCount) descCount.textContent = `${(targetOrg.Description || '').length.toLocaleString()} / 1,000`;
    // modal open
    sectionOrgModal.classList.remove('slds-hidden');
    sectionOrgModal.removeAttribute('hidden');
    sectionOrgModal.classList.add('slds-fade-in-open');
    // backDrop open
    const divOrgModalBackdrop = document.querySelector('#add-org-backdrop');
    divOrgModalBackdrop.classList.add('slds-backdrop_open');
    saveUIState();
    } catch (error) {
        console.error('오그 편집 로드 중 오류:', error);
        showToast('오그 정보를 불러오는 중 오류가 발생했습니다.');
    }
  }
function onClickOrgRow(event){
    event.stopPropagation();
}
function onClickDropDownDiv(event){
    event.stopPropagation();
    // 이벤트 위임 호환: event.target에서 요소 찾기
    const target = event.target.closest('.slds-dropdown-trigger');
    if (!target) return;
    if(target.classList.contains('slds-is-open')){
        target.classList.remove('slds-is-open');
    }else{
        target.classList.add('slds-is-open');
    }
}
async function onClickDropDownEdit(event){
    // 이벤트 위임 호환: event.target에서 요소 찾기
    const rootSection = event.target.closest('.slds-accordion__section');
    const folderId = rootSection.dataset.folderId;
    // 그 안에서 텍스트 span 찾아서 값 가져오기
    const summarySpan = rootSection.querySelector('.slds-accordion__summary-content');
    const folderName = summarySpan?.textContent?.trim();
    const sectionModal = document.querySelector('#folder-edit-modal');
    sectionModal.dataset.folderId = folderId;
    const inputFolderName = sectionModal.querySelector('#folder-name');
    // input에 folder set
    if(folderName) inputFolderName.value = folderName;
    // modal open
    sectionModal.classList.remove('slds-hidden');
    sectionModal.classList.add('slds-fade-in-open');
    // backDrop open
    const divEditBackdrop = document.querySelector('#folder-edit-backdrop');
    divEditBackdrop.classList.add('slds-backdrop_open');
    saveUIState();
}
function onClickFolderModalX(event){
    const section =event.currentTarget.closest('#folder-edit-modal');
    const divEditBackdrop = document.querySelector('#folder-edit-backdrop');
    document.querySelector('#folder-name').value = '';
    clearFormErrors(section);
    closeModal(section, divEditBackdrop);
}
function onClickFolderModalClose(event){
    const section = event.currentTarget.closest('#folder-edit-modal');
    const divEditBackdrop = document.querySelector('#folder-edit-backdrop');
    document.querySelector('#folder-name').value = '';
    clearFormErrors(section);
    closeModal(section, divEditBackdrop);
}
async function onClickFolderSave(event){
    // folder-modal-add-button
    const section = event.currentTarget.closest('#folder-edit-modal');
    const divEditBackdrop = document.querySelector('#folder-edit-backdrop');
    const folderModal = event.currentTarget.closest('#folder-edit-modal');    
    const folderId = folderModal.dataset.folderId;
    const inputValue = folderModal.querySelector('input').value;
    if (!validateRequired(inputValue, '#folder-name-form', '#folder-name-form', '폴더 이름을 입력해 주세요.')) return;
    clearFormErrors(folderModal);
    // // edit
    if(folderId){
        const listSection = document.querySelector(`[data-folder-id="${folderId}"]`);
        const folderSpan = listSection.querySelector('.slds-accordion__summary-content');
        const divDropDown = listSection.querySelector('.slds-dropdown-trigger');
        divDropDown.classList.remove('slds-is-open');
        const inputValue = folderModal.querySelector('input').value;
        folderModal.querySelector('input').value = '';
        folderSpan.textContent = inputValue;
        // data update
        const result = await getStorage(folderId);
        const folder = result[folderId];
        folder.Name = inputValue;
        await setStorage(folderId,folder);
        closeModal(section, divEditBackdrop);
    }else{ // 새로 생성
        // 폴더 수 제한 체크
        const allFolders = Object.values(await StorageCache.getAll()).filter(d => d && d.Id && d.Id.startsWith('fol_'));
        if (allFolders.length >= MAX_FOLDERS) {
            showToast(`폴더는 최대 ${MAX_FOLDERS}개까지 생성할 수 있습니다.`);
            return;
        }
        const inputValue = folderModal.querySelector('input').value;
        folderModal.querySelector('input').value = '';
        const folder = new Folder(`fol_${generateRandomId(12)}`,[],inputValue,folderSize+1);

        await setStorage(folder.Id,folder);
        closeModal(section, divEditBackdrop);
        renderFolderList();
    }
    
}
async function onClickGroundFolderAdd(event){
    // 폴더 수 제한 체크
    const allData = Object.values(await StorageCache.getAll());
    const folderCount = allData.filter(d => d && d.Id && d.Id.startsWith('fol_')).length;
    if (folderCount >= MAX_FOLDERS) {
        showToast(`폴더는 최대 ${MAX_FOLDERS}개까지 생성할 수 있습니다.`);
        return;
    }
    const section = document.querySelector('#folder-edit-modal');
    section.dataset.folderId = '';
    // modal open
    // 새로 만들기이므로 반드시 초기화
    section.dataset.folderId = '';   // ← 이게 중요! (수정 분기 타지 않게)
    const input = section.querySelector('#folder-name');
    input.value = '';
    section.classList.remove('slds-hidden');
    section.classList.add('slds-fade-in-open');
    // backDrop open
    const divEditBackdrop = document.querySelector('#folder-edit-backdrop');
    divEditBackdrop.classList.add('slds-backdrop_open');
    saveUIState();
}
async function onClickDropDownOrgAdd(event){
    try {
        const sectionOrgModal = document.querySelector('#org-modal');
        // 이벤트 위임 호환: event.target에서 요소 찾기
        const rootSection = event.target.closest('.slds-accordion__section');
        const folderId = rootSection.dataset.folderId;

        if (!folderId) {
            showToast('폴더 정보를 찾을 수 없습니다.');
            return;
        }

        // 전체 오그 수 제한 체크
        const totalOrgs = await getTotalOrgCount();
        if (totalOrgs >= MAX_TOTAL_ORGS) {
            showToast(`오그는 최대 ${MAX_TOTAL_ORGS}개까지 생성할 수 있습니다.`);
            return;
        }
        const sectionModal = document.querySelector('#org-modal');
        sectionModal.dataset.folderId = folderId;
        targetOrgId = null;
        // 새 오그 추가 시 기본값 설정
        setFaviconColor('#0070d2');
        setTabGroupEnabled(false);
        setTabGroupColor('blue');
        // 소속 폴더 select 채우기
        await populateFolderSelect(folderId);
        // modal open
        sectionOrgModal.classList.remove('slds-hidden');
        sectionOrgModal.removeAttribute('hidden');
        sectionOrgModal.classList.add('slds-fade-in-open');
        // backDrop open
        const divOrgModalBackdrop = document.querySelector('#add-org-backdrop');
        divOrgModalBackdrop.classList.add('slds-backdrop_open');
        saveUIState();
    } catch (error) {
        console.error('오그 추가 로드 중 오류:', error);
        showToast('오그 추가 화면을 로드하는 중 오류가 발생했습니다.');
    }
}
function onClickOrgTypeDropdown(event){
    const divCombobox = event.currentTarget;
    if(divCombobox.classList.contains('slds-is-open')){
        divCombobox.classList.remove('slds-is-open');
    }else{
        divCombobox.classList.add('slds-is-open');
    }
}
function onClickUlOrgType(event){
    event.stopPropagation();
    const option = event.target.closest('.slds-listbox__option');
    if (!option) return;
    const span = option.querySelector('[data-value]');
    if (!span) return;
    const orgTypeValue = document.querySelector('#org-type-value');
    orgTypeValue.dataset.value = span.dataset.value;
    orgTypeValue.textContent = span.textContent.trim();
    const divOrgTypeCombobox = document.querySelector('#org-type-dropdown .slds-combobox');
    divOrgTypeCombobox.classList.remove('slds-is-open');
    saveUIState();
}
function onClickButtonOrgModalX(event){
    const sectionOrgModal = event.currentTarget.closest('#org-modal');
    sectionOrgModal.querySelector('#org-name').value = '';
    sectionOrgModal.querySelector('#org-type-value').dataset.value = '';
    sectionOrgModal.querySelector('#org-type-value').textContent = '선택해주세요.';
    sectionOrgModal.querySelector('#org-username').value = '';
    sectionOrgModal.querySelector('#password').value = '';
    sectionOrgModal.querySelector('#security-token').value = '';
    sectionOrgModal.querySelector('#org-description').value = '';
    setFaviconColor('#0070d2');
    const descCount = document.querySelector('#org-description-count');
    if (descCount) descCount.textContent = '0 / 1,000';
    targetOrgId = null;
    clearFormErrors(sectionOrgModal);
    closeModal(sectionOrgModal, document.querySelector('#add-org-backdrop'));
}
function onClickButtonOrgModalClose(event){
    const sectionOrgModal = event.currentTarget.closest('#org-modal');
    sectionOrgModal.querySelector('#org-name').value = '';
    sectionOrgModal.querySelector('#org-type-value').dataset.value = '';
    sectionOrgModal.querySelector('#org-type-value').textContent = '선택해주세요.';
    sectionOrgModal.querySelector('#org-username').value = '';
    sectionOrgModal.querySelector('#password').value = '';
    sectionOrgModal.querySelector('#security-token').value = '';
    sectionOrgModal.querySelector('#org-description').value = '';
    setFaviconColor('#0070d2');
    const descCount = document.querySelector('#org-description-count');
    if (descCount) descCount.textContent = '0 / 1,000';
    targetOrgId = null;
    clearFormErrors(sectionOrgModal);
    closeModal(sectionOrgModal, document.querySelector('#add-org-backdrop'));
}
async function onClickOrgModalSave(event){
    try {
        const sectionOrgModal = event.currentTarget.closest('#org-modal');
        const folderId = sectionOrgModal.dataset.folderId;

        if (!folderId) {
            showToast('폴더 정보가 없습니다. 다시 시도해주세요.');
            return;
        }

        const folderData = await getStorage(folderId);
        const folder = folderData[folderId];

        if (!folder) {
            showToast('폴더를 찾을 수 없습니다. 다시 시도해주세요.');
            return;
        }

        const orgName = sectionOrgModal.querySelector('#org-name').value;
    const orgType = sectionOrgModal.querySelector('#org-type-value').dataset.value;
    const userName = sectionOrgModal.querySelector('#org-username').value;
    const password = sectionOrgModal.querySelector('#password').value;
    const securityToken = sectionOrgModal.querySelector('#security-token').value;
    const description = sectionOrgModal.querySelector('#org-description').value;
    let valid = true;
    if (!validateRequired(orgName, '#org-name-div', '#org-name-form', '오그 이름을 입력해 주세요.')) valid = false;
    if (!validateRequired(orgType, '#combobox-div', '#org-type-form', '오그 유형을 선택해 주세요.')) valid = false;
    if (!validateRequired(userName, '#user-name-div', '#user-name-form', '사용자 이름을 입력해 주세요.')) valid = false;
    if (!validateRequired(password, '#password-div', '#password-form', '비밀번호를 입력해 주세요.')) valid = false;
    if (!valid) return;
    clearFormErrors(sectionOrgModal);
    const url = getOrgLoginUrl(orgType);
    const selectedFolderId = document.querySelector('#org-folder-select')?.value || folderId;
    const faviconColor = document.querySelector('#org-favicon-color').value;
    const tabGroupEnabledCheckbox = document.querySelector('#tab-group-enabled');
    const tabGroupEnabled = tabGroupEnabledCheckbox ? tabGroupEnabledCheckbox.checked : false;
    const tabGroupColor = document.querySelector('#tab-group-color').value || 'blue';
// edit
    if(targetOrgId){
        const org = new ORG(targetOrgId,selectedFolderId,orgName,orgType,url,userName,password,description,faviconColor,securityToken,tabGroupEnabled,tabGroupColor);
        // ORG 객체를 plain object로 변환하여 저장
        const orgData = {
            Id: org.Id,
            FolderId: org.FolderId,
            Name: org.Name,
            OrgType: org.OrgType,
            URL: org.URL,
            UserName: org.UserName,
            Password: org.Password,
            Description: org.Description,
            FaviconColor: org.FaviconColor,
            SecurityToken: org.SecurityToken,
            TabGroupEnabled: org.TabGroupEnabled,
            TabGroupColor: org.TabGroupColor
        };
        // Chrome Storage에 직접 저장
        await new Promise((resolve, reject) => {
            chrome.storage.sync.set({ [targetOrgId]: orgData }, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
        });

        // 캐시 무효화
        StorageCache.invalidate();

        if (selectedFolderId !== folderId) {
            // 다른 폴더로 이동
            const newFolder = (await getStorage(selectedFolderId))[selectedFolderId];
            // 기존 폴더에서 제거
            folder.OrgIds = (folder.OrgIds || []).filter(id => id !== targetOrgId);
            await setStorage(folderId, folder);
            // 새 폴더에 추가
            newFolder.OrgIds = newFolder.OrgIds || [];
            newFolder.OrgIds.push(targetOrgId);
            await setStorage(selectedFolderId, newFolder);
        }
        // 같은 폴더 내 수정은 ORG 아이템만 저장하면 됨 (위에서 완료)
    }else{ // new
        const targetFolder = selectedFolderId !== folderId
            ? (await getStorage(selectedFolderId))[selectedFolderId]
            : folder;
        // 전체 오그 수 제한 체크
        const totalOrgs = await getTotalOrgCount();
        if (totalOrgs >= MAX_TOTAL_ORGS) {
            showToast(`오그는 최대 ${MAX_TOTAL_ORGS}개까지 생성할 수 있습니다.`);
            return;
        }
        const orgId = `org_${generateRandomId(12)}`;
        const org = new ORG(orgId,selectedFolderId,orgName,orgType,url,userName,password,description,faviconColor,securityToken,tabGroupEnabled,tabGroupColor);

        // ORG 객체를 plain object로 변환하여 저장
        const orgData = {
            Id: org.Id,
            FolderId: org.FolderId,
            Name: org.Name,
            OrgType: org.OrgType,
            URL: org.URL,
            UserName: org.UserName,
            Password: org.Password,
            Description: org.Description,
            FaviconColor: org.FaviconColor,
            SecurityToken: org.SecurityToken,
            TabGroupEnabled: org.TabGroupEnabled,
            TabGroupColor: org.TabGroupColor
        };

        // Chrome Storage에 직접 저장
        await new Promise((resolve, reject) => {
            chrome.storage.sync.set({ [orgId]: orgData }, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
        });

        // 캐시 무효화
        StorageCache.invalidate();

        // 폴더의 OrgIds에 추가
        targetFolder.OrgIds = targetFolder.OrgIds || [];
        targetFolder.OrgIds.push(orgId);
        await setStorage(selectedFolderId, targetFolder);
    }
    sectionOrgModal.querySelector('#org-name').value = '';
    sectionOrgModal.querySelector('#org-type-value').dataset.value = '';
    sectionOrgModal.querySelector('#org-type-value').textContent = '선택해주세요.';
    sectionOrgModal.querySelector('#org-username').value = '';
    sectionOrgModal.querySelector('#password').value = '';
    sectionOrgModal.querySelector('#security-token').value = '';
    sectionOrgModal.querySelector('#org-description').value = '';
    setFaviconColor('#0070d2');
    setTabGroupEnabled(false);
    setTabGroupColor('blue');
    const descCountSave = document.querySelector('#org-description-count');
    if (descCountSave) descCountSave.textContent = '0 / 1,000';
    targetOrgId = null;
    closeModal(document.querySelector('#org-modal'), document.querySelector('#add-org-backdrop'));
    StorageCache.invalidate();
    renderFolderList();
    } catch (error) {
        console.error('오그 저장 중 오류:', error);
        if (error.message && (error.message.includes('QUOTA') || error.message.includes('quota') || error.message.includes('exceeded'))) {
            showToast('저장 용량을 초과했습니다. 오그나 폴더의 개수를 줄이거나 설명을 줄여주세요.', 'error');
        } else {
            showToast(`오그 저장 중 오류가 발생했습니다: ${error.message}`);
        }
    }
}
function setFaviconColor(color) {
    const input = document.querySelector('#org-favicon-color');
    if (input) input.value = color;
    const icon = document.querySelector('#favicon-cloud-icon path');
    if (icon) icon.setAttribute('fill', color);
}
function setTabGroupColor(color) {
    const input = document.querySelector('#tab-group-color');
    if (input) input.value = color;
    const picker = document.querySelector('#tab-group-color-picker');
    if (picker) {
        picker.querySelectorAll('.tab-group-color-btn').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.color === color);
        });
    }
}
function setTabGroupEnabled(enabled) {
    const checkbox = document.querySelector('#tab-group-enabled');
    if (checkbox) checkbox.checked = enabled;
    const section = document.querySelector('#advanced-settings-section');
    const toggle = document.querySelector('#advanced-settings-toggle');
    if (section && toggle) {
        // 체크박스 상태에 따라 아코디언 열기/닫기
        section.classList.toggle('slds-is-open', enabled);
        toggle.setAttribute('aria-expanded', String(enabled));
    }
    updateTabGroupColorPickerState(enabled);
}
function updateTabGroupColorPickerState(enabled) {
    const picker = document.querySelector('#tab-group-color-picker');
    const container = document.querySelector('#tab-group-color-container');
    if (picker) {
        picker.classList.toggle('disabled', !enabled);
    }
    if (container) {
        container.classList.toggle('disabled', !enabled);
    }
}
function getOrgLoginUrl(orgType){
    if(orgType === 'sandbox' || orgType === '샌드박스') return 'https://test.salesforce.com';
    return 'https://login.salesforce.com';
}
// 탭 열기 + 탭 그룹 지정 (background.js로 메시지 전송하여 popup이 닫혀도 동작)
async function openTabWithGroup(url, orgName = null, tabGroupEnabled = false, tabGroupColor = null, faviconColor = null) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({
            type: 'openTabWithGroup',
            url: url,
            useTabGroup: tabGroupEnabled && !!orgName,
            groupName: orgName,
            tabGroupColor: tabGroupColor || 'blue',
            faviconColor: faviconColor
        }, (response) => {
            resolve(response || { success: true });
        });
    });
}

async function orgLinkClick(event){
    // 이벤트 위임 호환: event.target에서 요소 찾기
    const orgRow = event.target.closest('div.org-row');
    let spinner = null;
    try {
        event.preventDefault(); // 기본 이동 동작 막기
        // 1. 이벤트 위임 호환: event.target에서 가장 가까운 section 찾기
        const section = event.target.closest('section.slds-accordion__section');
        // 2. folderId 읽기
        const folderId = section ? section.dataset.folderId : null;
        const orgId = orgRow.dataset.orgId;

        if (!folderId || !orgId) {
            showToast('오그 정보를 찾을 수 없습니다.');
            return;
        }

        const targetOrg = await getOrgById(orgId);

        if (!targetOrg) {
            showToast('오그 정보를 찾을 수 없습니다.');
            return;
        }

        if (!targetOrg.URL) {
            showToast('오그 URL을 찾을 수 없습니다.');
            return;
        }

        // 오그 이름 (탭 그룹용)
        const orgName = targetOrg.Name;

        // spinner 표시
        spinner = document.createElement('div');
        spinner.className = 'org-row-spinner';
        spinner.innerHTML = '<div role="status" class="slds-spinner slds-spinner_small slds-spinner_brand"><span class="slds-assistive-text">로딩중</span><div class="slds-spinner__dot-a"></div><div class="slds-spinner__dot-b"></div></div>';
        orgRow.appendChild(spinner);

        const faviconColor = targetOrg.FaviconColor || null;

        // Security Token이 있으면 SOAP API 로그인 우선 시도
        if (targetOrg.SecurityToken) {
            const soapSession = await trySoapLogin(targetOrg);
            if (soapSession) {
                const frontdoorUrl = `${soapSession.instanceUrl}/secur/frontdoor.jsp?sid=${encodeURIComponent(soapSession.sessionId)}`;
                await openTabWithGroup(frontdoorUrl, orgName, targetOrg.TabGroupEnabled, targetOrg.TabGroupColor, faviconColor);
                return;
            }
            // SOAP 실패 시 form 기반 폴백
            const url = `${targetOrg.URL}?${encode('folderId')}=${encodeURIComponent(encode(folderId))}&${encode('orgId')}=${encodeURIComponent(encode(orgId))}`;
            await openTabWithGroup(url, orgName, targetOrg.TabGroupEnabled, targetOrg.TabGroupColor, faviconColor);
            return;
        }

        // Security Token 없으면 기존 로직: 세션 쿠키 → form 기반
        const session = await trySessionLogin(targetOrg);
        if (session) {
            const frontdoorUrl = `${session.instanceUrl}/secur/frontdoor.jsp?sid=${encodeURIComponent(session.sessionId)}`;
            await openTabWithGroup(frontdoorUrl, orgName, targetOrg.TabGroupEnabled, targetOrg.TabGroupColor, faviconColor);
            return;
        }

        // 세션 없으면 기존 form 기반 로그인
        const url = `${targetOrg.URL}?${encode('folderId')}=${encodeURIComponent(encode(folderId))}&${encode('orgId')}=${encodeURIComponent(encode(orgId))}`;
        await openTabWithGroup(url, orgName, targetOrg.TabGroupEnabled, targetOrg.TabGroupColor, faviconColor);
    } catch (error) {
        console.error('[오그 링크] 오류:', error);
        showToast('오그 링크를 열 수 없습니다.');
    } finally {
        if (spinner && spinner.parentNode) {
            spinner.remove();
        }
    }
}
function encode(string){
    return btoa(unescape(encodeURIComponent(string))).replace(/=+$/, '');
}

// 세일즈포스 세션 쿠키 기반 로그인 시도
async function trySessionLogin(targetOrg) {
    try {
        if (!targetOrg.UserName) return null;

        // sid 쿠키 수집 (salesforce.com + force.com 도메인)
        const [sfCookies, forceCookies] = await Promise.all([
            chrome.cookies.getAll({ name: 'sid', domain: 'salesforce.com' }),
            chrome.cookies.getAll({ name: 'sid', domain: 'force.com' })
        ]);
        const allCookies = [...sfCookies, ...forceCookies];
        // 로그인 페이지 쿠키 제외 + 중복 제거
        const seen = new Set();

        const candidates = [];
        for (const cookie of allCookies) {
            const domain = cookie.domain.replace(/^\./, '');
            if (domain === 'login.salesforce.com' || domain === 'test.salesforce.com') continue;
            if (seen.has(cookie.value)) continue;
            seen.add(cookie.value);
            candidates.push(cookie);
        }

        if (candidates.length === 0) return null;

        // 전체 타임아웃 (5초)
        const overallTimeout = new Promise((resolve) => setTimeout(() => resolve(null), 5000));

        // 병렬로 각 쿠키의 유효성 검증
        const raceResult = await Promise.race([
            overallTimeout,
            (async () => {
                const results = await Promise.allSettled(
                    candidates.map(async (cookie) => {
                        const domain = cookie.domain.replace(/^\./, '');
                        const instanceUrl = `https://${domain}`;
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 3000);

                        try {
                            const response = await fetch(`${instanceUrl}/services/oauth2/userinfo`, {
                                headers: { 'Authorization': `Bearer ${cookie.value}` },
                                signal: controller.signal
                            });
                            clearTimeout(timeoutId);

                            if (!response.ok) return null;

                            const userInfo = await response.json();
                            const targetUsername = targetOrg.UserName.toLowerCase();
                            const matchUsername = userInfo.preferred_username?.toLowerCase();
                            const matchEmail = userInfo.email?.toLowerCase();

                            if (matchUsername === targetUsername || matchEmail === targetUsername) {
                                return { sessionId: cookie.value, instanceUrl };
                            }
                            return null;
                        } catch (e) {
                            clearTimeout(timeoutId);
                            return null;
                        }
                    })
                );

                for (const result of results) {
                    if (result.status === 'fulfilled' && result.value) {
                        return result.value;
                    }
                }
                return null;
            })()
        ]);

        return raceResult;
    } catch (error) {
        console.error('[세션 로그인] 쿠키 기반 세션 확인 실패:', error);
        return null;
    }
}

// XML 특수문자 이스케이프
function escapeXml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

// SOAP API 로그인 시도
async function trySoapLogin(targetOrg) {
    // Security Token 없으면 null 반환
    if (!targetOrg.SecurityToken) {
        return null;
    }

    const loginUrl = targetOrg.URL || 'https://login.salesforce.com';
    const soapEndpoint = `${loginUrl}/services/Soap/u/59.0`;

    const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:partner.soap.sforce.com">
  <soapenv:Body>
    <urn:login>
      <urn:username>${escapeXml(targetOrg.UserName)}</urn:username>
      <urn:password>${escapeXml(targetOrg.Password)}${escapeXml(targetOrg.SecurityToken)}</urn:password>
    </urn:login>
  </soapenv:Body>
</soapenv:Envelope>`;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(soapEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/xml; charset=utf-8',
                'SOAPAction': 'login'
            },
            body: soapBody,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        const responseText = await response.text();
        // sessionId 추출
        const sessionIdMatch = responseText.match(/<sessionId>([^<]+)<\/sessionId>/);
        // serverUrl에서 인스턴스 URL 추출
        const serverUrlMatch = responseText.match(/<serverUrl>([^<]+)<\/serverUrl>/);

        if (sessionIdMatch && serverUrlMatch) {
            const sessionId = sessionIdMatch[1];
            // serverUrl: https://na1.salesforce.com/services/Soap/u/59.0/00D... -> https://na1.salesforce.com
            const serverUrl = serverUrlMatch[1];
            const instanceUrl = serverUrl.replace(/\/services\/Soap\/.*$/, '');

            return { sessionId, instanceUrl };
        }

        return null;

    } catch (error) {
        return null;
    }
}

function createSVG(classNames=[],styleObj={}, attributes={}){
    const dom = document.createElementNS(SVG_NS,'svg');
    if (Array.isArray(classNames)) {
        dom.classList.add(...classNames);
    }
    if (styleObj && typeof styleObj === 'object') {
        for (const [key, value] of Object.entries(styleObj)) {
            dom.style[key] = value;
        }
    }
    if (attributes && typeof attributes === 'object') {
        for (const [key, value] of Object.entries(attributes)) {
            dom.setAttribute(key, value);
        }
    }
    return dom;
}
function createUse(classNames=[],styleObj={}, attributes={},attributesNS={}){
    const dom = document.createElementNS(SVG_NS,'use');
    if (Array.isArray(classNames)) {
        dom.classList.add(...classNames);
    }
    if (styleObj && typeof styleObj === 'object') {
        for (const [key, value] of Object.entries(styleObj)) {
            dom.style[key] = value;
        }
    }
    if (attributes && typeof attributes === 'object') {
        for (const [key, value] of Object.entries(attributes)) {
            dom.setAttribute(key, value);
        }
    }
    if (attributesNS && typeof attributesNS === 'object') {
        for (const [key, { namespace, value }] of Object.entries(attributesNS)) {
            dom.setAttributeNS(namespace, key, value);
        }
    }
    return dom;
}
function createDom(tagName, classNames = [], styleObj = {}, attributes = {}) {
    if (!tagName) return null;
    const dom = document.createElement(tagName);
    if (Array.isArray(classNames)) {
        dom.classList.add(...classNames);
    }

    if (styleObj && typeof styleObj === 'object') {
        for (const [key, value] of Object.entries(styleObj)) {
            dom.style[key] = value;
        }
    }

    if (attributes && typeof attributes === 'object') {
        for (const [key, value] of Object.entries(attributes)) {
            dom.setAttribute(key, value);
        }
    }
    return dom;
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
        // 저장할 데이터를 plain object로 변환 (클래스 인스턴스 직렬화 보장)
        const dataToStore = JSON.parse(JSON.stringify(value));
        chrome.storage.sync.set({[keys] : dataToStore}, (result) => {
            if (chrome.runtime.lastError) {
                const error = chrome.runtime.lastError;
                // 용량 초과 에러 감지
                if (error.message && (error.message.includes('QUOTA') || error.message.includes('quota') || error.message.includes('exceeded'))) {
                    showToast('저장 용량을 초과했습니다. 오그나 폴더의 개수를 줄이거나 설명을 줄여주세요.', 'error');
                }
                reject(error);
            } else {
                StorageCache.update(keys, dataToStore); // 캐시 업데이트
                resolve(result);
            }
        });
    });
}
function deleteStorage(key){
    return new Promise((resolve, reject) => {
        chrome.storage.sync.remove(key, (result) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                StorageCache.remove(key); // 캐시에서 제거
                resolve(result);
            }
        });
    });
}
function deleteStorageKeys(keys) {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.remove(keys, () => {
            if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
            else {
                StorageCache.remove(keys); // 캐시에서 제거
                resolve();
            }
        });
    });
}
async function getOrgsByIds(orgIds) {
    if (!orgIds || orgIds.length === 0) return [];
    const data = await getStorage(orgIds);
    return orgIds.filter(id => data[id]).map(id => data[id]);
}
async function getOrgById(orgId) {
    if (!orgId) return null;
    const data = await getStorage(orgId);
    const org = data[orgId] || null;
    return org;
}

function generateRandomId(length) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    const randomPart = Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, length);
    const timestamp = Date.now().toString();
    return timestamp + randomPart;
}
// =====================
// 설정 모달
// =====================
async function onClickOpenSettings() {
    const modal = document.querySelector('#settings-modal');
    const backdrop = document.querySelector('#settings-backdrop');
    modal.classList.remove('slds-hidden');
    modal.classList.add('slds-fade-in-open');
    backdrop.classList.add('slds-backdrop_open');
}
function onClickCloseSettings() {
    const modal = document.querySelector('#settings-modal');
    const backdrop = document.querySelector('#settings-backdrop');
    modal.classList.add('slds-hidden');
    modal.classList.remove('slds-fade-in-open');
    backdrop.classList.remove('slds-backdrop_open');
}

// =====================
// 소속 폴더 select 채우기
// =====================
async function populateFolderSelect(currentFolderId) {
    const select = document.querySelector('#org-folder-select');
    if (!select) return;
    select.innerHTML = '';
    const allData = Object.values(await StorageCache.getAll());
    const folders = allData.filter(d => d && d.Id && d.Id.startsWith('fol_'));
    folders.sort((a, b) => a.SortNumber - b.SortNumber);
    for (const folder of folders) {
        const option = document.createElement('option');
        option.value = folder.Id;
        option.textContent = folder.Name;
        if (folder.Id === currentFolderId) option.selected = true;
        select.appendChild(option);
    }
}

// =====================
// 데이터 내보내기
// =====================
async function onClickExport() {
    const allData = await StorageCache.getAll();
    const folders = Object.values(allData).filter(d => d && d.Id && d.Id.startsWith('fol_'));
    folders.sort((a, b) => a.SortNumber - b.SortNumber);

    // 내보내기용: OrgIds → embedded ORGs 형식으로 변환 (호환성)
    const exportFolders = [];
    for (const folder of folders) {
        const orgIds = folder.OrgIds || [];
        const orgs = orgIds.filter(id => allData[id]).map(id => JSON.parse(JSON.stringify(allData[id])));
        exportFolders.push({
            Id: folder.Id,
            Name: folder.Name,
            SortNumber: folder.SortNumber,
            ORGs: orgs
        });
    }

    const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        folders: exportFolders
    };

    // XOR 난독화
    const jsonStr = JSON.stringify(exportData);
    const obfuscated = xorObfuscate(jsonStr);
    const blob = new Blob([obfuscated], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OrgLink_backup_${new Date().toISOString().slice(0, 10)}.orglink`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('데이터를 내보냈습니다.', 'success');
}

// =====================
// 데이터 가져오기
// =====================
async function onFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    event.target.value = '';

    try {
        const text = await file.text();
        let importData;
        try {
            // XOR 디코딩 시도 (새 형식)
            const decoded = xorDeobfuscate(text);
            importData = JSON.parse(decoded);
        } catch {
            // 실패 시 기존 JSON 파싱 (하위 호환성)
            importData = JSON.parse(text);
        }

        if (!importData.folders || !Array.isArray(importData.folders)) {
            showToast('유효하지 않은 파일 형식입니다.');
            return;
        }

        for (const folder of importData.folders) {
            if (!folder.Id || !folder.Name || !Array.isArray(folder.ORGs || folder.OrgIds || [])) {
                showToast('파일에 잘못된 폴더 데이터가 포함되어 있습니다.');
                return;
            }
        }

        if (importData.folders.length > MAX_FOLDERS) {
            showToast(`폴더 수가 최대 한도(${MAX_FOLDERS}개)를 초과합니다.`);
            return;
        }
        // 전체 오그 수 체크
        let totalImportOrgs = 0;
        for (const folder of importData.folders) {
            totalImportOrgs += (folder.ORGs || []).length;
        }
        if (totalImportOrgs > MAX_TOTAL_ORGS) {
            showToast(`전체 오그 수가 최대 한도(${MAX_TOTAL_ORGS}개)를 초과합니다. (가져오기: ${totalImportOrgs}개)`);
            return;
        }

        const confirmed = confirm(
            importData.folders.length + '개의 폴더를 가져오시겠습니까?\n' +
            '기존 데이터는 모두 덮어쓰기 됩니다.'
        );
        if (!confirmed) return;

        await new Promise((resolve, reject) => {
            chrome.storage.sync.clear(() => {
                if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
                else resolve();
            });
        });

        // 캐시 무효화
        StorageCache.invalidate();

        // 배치 쓰기 (성능 최적화): 순차 쓰기 대신 단일 호출
        const batchData = {};

        for (const folder of importData.folders) {
            const orgIds = [];
            const orgs = folder.ORGs || [];

            for (const org of orgs) {
                org.FolderId = folder.Id;
                batchData[org.Id] = org;
                orgIds.push(org.Id);
            }

            batchData[folder.Id] = {
                Id: folder.Id,
                Name: folder.Name,
                SortNumber: folder.SortNumber,
                OrgIds: orgIds
            };
        }

        // 단일 배치 쓰기
        await new Promise((resolve, reject) => {
            chrome.storage.sync.set(batchData, () => {
                if (chrome.runtime.lastError) {
                    const error = chrome.runtime.lastError;
                    if (error.message?.includes('QUOTA')) {
                        showToast('저장 용량을 초과했습니다. 오그나 폴더의 개수를 줄이거나 설명을 줄여주세요.', 'error');
                    }
                    reject(error);
                } else {
                    resolve();
                }
            });
        });

        // 캐시 업데이트
        StorageCache._data = batchData;
        StorageCache._lastFetch = Date.now();

        showToast('데이터를 성공적으로 가져왔습니다.', 'success');
        renderFolderList();

    } catch (e) {
        showToast(`파일을 읽는 중 오류가 발생했습니다: ${e.message}`);
    }
}

// =====================
// UI 상태 저장/복원 (chrome.storage.local)
// =====================
function getLocalStorage(keys) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(keys, (result) => {
            if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
            else resolve(result);
        });
    });
}

function setLocalStorage(keys, value) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [keys]: value }, () => {
            if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
            else resolve();
        });
    });
}

function saveAccordionStates() {
    const states = {};
    document.querySelectorAll('section.slds-accordion__section').forEach(section => {
        const folderId = section.dataset.folderId;
        if (folderId) {
            states[folderId] = section.classList.contains('slds-is-open');
        }
    });
    setLocalStorage('accordionStates', states);
}

async function getAccordionStates() {
    try {
        const result = await getLocalStorage('accordionStates');
        return result.accordionStates || {};
    } catch(e) {
        return {};
    }
}

function clearUIState() {
    setLocalStorage('uiState', { activeModal: null, modalData: {} });
}

function saveUIState() {
    const orgModal = document.querySelector('#org-modal');
    const folderModal = document.querySelector('#folder-edit-modal');
    const orgDeleteModal = document.querySelector('#org-delete-confirm-modal');
    const folderDeleteModal = document.querySelector('#folder-delete-confirm-modal');

    let state = { activeModal: null, modalData: {} };

    if (orgModal && orgModal.classList.contains('slds-fade-in-open')) {
        state.activeModal = 'org-modal';
        state.modalData = {
            folderId: orgModal.dataset.folderId || '',
            orgId: targetOrgId || '',
            orgName: orgModal.querySelector('#org-name')?.value || '',
            orgType: orgModal.querySelector('#org-type-value')?.dataset?.value || '',
            orgTypeText: orgModal.querySelector('#org-type-value')?.textContent || '',
            userName: orgModal.querySelector('#org-username')?.value || '',
            password: orgModal.querySelector('#password')?.value || '',
            securityToken: orgModal.querySelector('#security-token')?.value || '',
            description: orgModal.querySelector('#org-description')?.value || '',
            faviconColor: orgModal.querySelector('#org-favicon-color')?.value || '#0070d2',
            selectedFolderId: document.querySelector('#org-folder-select')?.value || '',
            tabGroupEnabled: document.querySelector('#tab-group-enabled')?.checked || false,
            tabGroupColor: document.querySelector('#tab-group-color')?.value || 'blue'
        };
    } else if (folderModal && folderModal.classList.contains('slds-fade-in-open')) {
        state.activeModal = 'folder-modal';
        state.modalData = {
            folderId: folderModal.dataset.folderId || '',
            folderName: folderModal.querySelector('#folder-name')?.value || ''
        };
    } else if (orgDeleteModal && orgDeleteModal.classList.contains('slds-fade-in-open')) {
        state.activeModal = 'org-delete';
        state.modalData = {
            folderId: targetFolderId || '',
            orgId: targetOrgId || ''
        };
    } else if (folderDeleteModal && folderDeleteModal.classList.contains('slds-fade-in-open')) {
        state.activeModal = 'folder-delete';
        state.modalData = {
            folderId: deleteFolderId || ''
        };
    }

    setLocalStorage('uiState', state);
}

async function restoreUIState() {
    try {
        const result = await getLocalStorage('uiState');
        const state = result.uiState;
        if (!state || !state.activeModal) return;

        const data = state.modalData;

        if (state.activeModal === 'org-modal') {
            const sectionOrgModal = document.querySelector('#org-modal');
            sectionOrgModal.dataset.folderId = data.folderId;
            targetOrgId = data.orgId || null;
            targetFolderId = data.folderId;

            sectionOrgModal.querySelector('#org-name').value = data.orgName;
            sectionOrgModal.querySelector('#org-type-value').dataset.value = data.orgType;
            sectionOrgModal.querySelector('#org-type-value').textContent = data.orgTypeText || data.orgType || '선택해주세요.';
            sectionOrgModal.querySelector('#org-username').value = data.userName;
            sectionOrgModal.querySelector('#password').value = data.password;
            sectionOrgModal.querySelector('#security-token').value = data.securityToken || '';
            sectionOrgModal.querySelector('#org-description').value = data.description;
            setFaviconColor(data.faviconColor || '#0070d2');
            setTabGroupEnabled(data.tabGroupEnabled || false);
            setTabGroupColor(data.tabGroupColor || 'blue');

            await populateFolderSelect(data.selectedFolderId || data.folderId);

            const descCount = document.querySelector('#org-description-count');
            if (descCount) descCount.textContent = `${(data.description || '').length.toLocaleString()} / 1,000`;

            sectionOrgModal.classList.remove('slds-hidden');
            sectionOrgModal.removeAttribute('hidden');
            sectionOrgModal.classList.add('slds-fade-in-open');
            document.querySelector('#add-org-backdrop').classList.add('slds-backdrop_open');

        } else if (state.activeModal === 'folder-modal') {
            const sectionModal = document.querySelector('#folder-edit-modal');
            if (data.folderId) sectionModal.dataset.folderId = data.folderId;
            sectionModal.querySelector('#folder-name').value = data.folderName;

            sectionModal.classList.remove('slds-hidden');
            sectionModal.classList.add('slds-fade-in-open');
            document.querySelector('#folder-edit-backdrop').classList.add('slds-backdrop_open');

        } else if (state.activeModal === 'org-delete') {
            targetFolderId = data.folderId;
            targetOrgId = data.orgId;
            const modal = document.querySelector('#org-delete-confirm-modal');
            modal.classList.remove('slds-hidden');
            modal.classList.add('slds-fade-in-open');
            document.querySelector('#org-delete-backdrop').classList.add('slds-backdrop_open');

        } else if (state.activeModal === 'folder-delete') {
            deleteFolderId = data.folderId;
            const modal = document.querySelector('#folder-delete-confirm-modal');
            modal.classList.remove('slds-hidden');
            modal.classList.add('slds-fade-in-open');
            document.querySelector('#folder-delete-backdrop').classList.add('slds-backdrop_open');
        }
        // 복원 후 상태를 다시 저장하여, 추가 입력 없이 팝업이 닫혀도 상태가 유지되도록 함
        saveUIState();
    } catch (e) {
        console.error('UI 상태 복원 실패:', e);
    }
}

// =====================
// Live search (folders & orgs)
// =====================
(function () {
    const INPUT_ID = 'search-input';
    const ACCORDION_LIST_SELECTOR = 'ul.slds-accordion > li.slds-accordion__list-item';
    const FOLDER_NAME_SELECTOR = '.slds-accordion__summary .slds-accordion__summary-content';
    const ORG_ROW_SELECTOR = '.org-row'; // 각 오그의 실제 row
    const ORG_NAME_IN_ROW_SELECTOR = '.slds-col.slds-size_9-of-12';
  
    // 간단 디바운스(타이핑 중 과도한 렌더 방지)
    function debounce(fn, wait) {
      let t;
      return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(null, args), wait);
      };
    }
  
    function includesIC(str, q) {
      if (!q) return true;             // 빈 검색어면 전부 매치
      if (!str) return false;
      return str.toLowerCase().includes(q.toLowerCase());
    }
  
    // 현재 DOM에서 최소 데이터 스냅샷 추출(폴더+오그 이름만)
    function captureDatasetFromDOM() {
      const out = [];
      document.querySelectorAll(ACCORDION_LIST_SELECTOR).forEach(li => {
        const folderName = (li.querySelector(FOLDER_NAME_SELECTOR)?.textContent || '').trim();
        const orgs = [];
        li.querySelectorAll(ORG_ROW_SELECTOR).forEach(row => {
          const orgName = (row.querySelector(ORG_NAME_IN_ROW_SELECTOR)?.textContent || '').trim();
          if (orgName) orgs.push({ name: orgName });
        });
        if (folderName) out.push({ name: folderName, orgs });
      });
      return out;
    }
  
    // 데이터 기반 필터
    function filterData(query, data) {
      if (!query) return data.slice();
      const q = query.toLowerCase();
      return data
        .map(f => {
          const folderMatches = includesIC(f.name, q);
          // 폴더명이 일치하더라도, 하위 오그들 중 검색어가 포함된 항목만 남김
          const filteredOrgs = (f.orgs || []).filter(o => includesIC(o.name, q));
          return { ...f, orgs: folderMatches ? filteredOrgs : filteredOrgs };
        })
        // 폴더명이 일치하면(orgs가 0개여도) 폴더는 남기고, 아니면 하위 오그가 1개 이상일 때만 노출
        .filter(f => f.orgs.length > 0 || includesIC(f.name, q));
    }
  
    // renderFolderList가 없을 때 DOM만으로 필터링(숨김/표시)
    function domFilter(query) {
      const q = (query || '').trim();
      const scope = document.getElementById('search-scope')?.value || 'all';
      document.querySelectorAll(ACCORDION_LIST_SELECTOR).forEach(li => {
        const folderName = (li.querySelector(FOLDER_NAME_SELECTOR)?.textContent || '').trim();
        const folderMatched = (scope === 'all' || scope === 'folder') ? includesIC(folderName, q) : false;
        let matchedOrgs = 0;

        li.querySelectorAll(ORG_ROW_SELECTOR).forEach(row => {
          const orgName = (row.querySelector(ORG_NAME_IN_ROW_SELECTOR)?.textContent || '').trim();
          let match;
          if (!q) {
            match = true;
          } else if (scope === 'folder') {
            // 폴더 검색: 매칭된 폴더의 모든 오그 표시
            match = folderMatched;
          } else if (scope === 'org') {
            // 오그 검색: 오그명만 매칭
            match = includesIC(orgName, q);
          } else {
            // 전체 검색: 오그명 매칭
            match = includesIC(orgName, q);
          }
          row.style.display = match ? '' : 'none';
          if (match) matchedOrgs++;
        });

        let showFolder;
        if (!q) {
          showFolder = true;
        } else if (scope === 'folder') {
          showFolder = folderMatched;
        } else if (scope === 'org') {
          showFolder = matchedOrgs > 0;
        } else {
          showFolder = folderMatched || matchedOrgs > 0;
        }
        li.style.display = showFolder ? '' : 'none';
      });
    }
  
    function filterAndRender(query) {
      // 1) 데이터 → renderFolderList 경로
      if (typeof window.renderFolderList === 'function') {
        if (!window.__fullDatasetForSearch) {
          window.__fullDatasetForSearch = captureDatasetFromDOM(); // 초기 1회 스냅샷
        }
        const filtered = filterData(query, window.__fullDatasetForSearch);
        try {
          // 필요시 renderFolderList 시그니처에 맞춰 파라미터만 조정
          window.renderFolderList(filtered);
          return;
        } catch (e) {
          // 시그니처 불일치 시 DOM 필터로 폴백
        }
      }
      // 2) 폴백: DOM만으로 필터
      domFilter(query);
    }
  
    function initLiveSearch() {
      const input = document.getElementById(INPUT_ID);
      if (!input) return;
      const run = debounce(() => filterAndRender(input.value), 150);
      input.addEventListener('input', run);
      // 검색 scope 변경 시 재필터
      const scopeSelect = document.getElementById('search-scope');
      if (scopeSelect) {
          scopeSelect.addEventListener('change', () => filterAndRender(input.value));
      }
    }
  
    // popup.html에서 스크립트가 본문 이후에 로드되므로 즉시 init 가능
    try { initLiveSearch(); } catch (_) {}
  })();