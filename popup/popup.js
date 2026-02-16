
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
    Id; // org + 12자리 랜덤 문자열
    Name;
    OrgType;
    URL;
    UserName;
    Password;
    Description;
    FaviconColor;
    constructor(Id, FolderId, Name,OrgType, URL, UserName, Password,Description,FaviconColor) {
        this.Id = Id;
        this.FolderId = FolderId;
        this.Name = Name;
        this.OrgType = OrgType;
        this.URL = URL;
        this.UserName = UserName;
        this.Password = Password;
        this.Description = Description;
        this.FaviconColor = FaviconColor || '#0070d2';
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
const MAX_FOLDERS = 100;
const MAX_ORGS_PER_FOLDER = 200;
let targetOrgId;
let targetFolderId;

function showToast(message, type = 'error') {
    const existing = document.querySelector('.orglink-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'orglink-toast toast-' + type;
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

// 파비콘 로그 확인 함수 (콘솔에서 getFaviconLogs()로 호출 가능)
window.getFaviconLogs = function() {
    const logs = JSON.parse(localStorage.getItem('faviconLogs') || '[]');
    console.log('=== 파비콘 로그 ===');
    logs.forEach(log => console.log(log));
    console.log('=== 끝 ===');
    return logs;
};

// 파비콘 로그 초기화 함수
window.clearFaviconLogs = function() {
    localStorage.removeItem('faviconLogs');
    console.log('파비콘 로그 삭제됨');
};

document.addEventListener("DOMContentLoaded", init);
async function init() { 
    //   chrome.storage.sync.clear(() => {
    //     console.log('확장 프로그램 로컬 스토리지 삭제 완료');
    //   });
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
    document.querySelector('#folder-name')?.addEventListener('input', autoSaveUI);
    document.querySelector('#org-folder-select')?.addEventListener('change', saveUIState);
    window.addEventListener('beforeunload', saveUIState);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') saveUIState();
    });

    // 폴더/오그 드래그 폴백: li 사이 빈 공간에 드롭해도 인식되도록 ul에 핸들러 등록
    const accordionUl = document.querySelector('#folders-container > ul.slds-accordion');
    accordionUl.addEventListener('dragover', (e) => {
        if (draggingFolderDragId) e.preventDefault();
        if (draggingOrgId) e.preventDefault();
    });
    accordionUl.addEventListener('drop', (e) => {
        if (draggingFolderDragId) {
            e.preventDefault();
            folderDropDone = true;
        }
        if (draggingOrgId) {
            e.preventDefault();
            orgDropSuccess = true;
        }
    });

    renderFolderList();
    await restoreUIState();
}
let folderSize = null;
async function renderFolderList() {
    try {
        // 로컬 스토리지에서 모든 데이터 싹 가져와야 됨
        const allData = await getStorage(null);
        const folders = Object.values(allData).filter(d => d.Id && d.Id.startsWith('fol_'));
        folderSize = folders.length;
        folders.sort((a, b) => a.SortNumber - b.SortNumber);
        const accordionStates = await getAccordionStates();
        const accordionUl = document.getElementById("folders-container").querySelector('ul.slds-accordion');
        accordionUl.innerHTML = "";
        for(const folder of folders || []){
        const li = createDom('li',['slds-accordion__list-item','slds-m-bottom_small'],{border : '1px solid #d8dde6', borderRadius: '12px'},{ draggable: true } );
        li.addEventListener('dragstart',onFolderDragStart);
        li.addEventListener('dragover',onFolderDragOver);
        li.addEventListener('drop',onFolderDrop);
        li.addEventListener('dragend', onFolderDragEnd);
        // slds-is-open
        const isOpen = accordionStates[folder.Id] !== undefined ? accordionStates[folder.Id] : true;
        const sectionClasses = ['slds-accordion__section'];
        if (isOpen) sectionClasses.push('slds-is-open');
        const section = createDom('section', sectionClasses);
        section.dataset.folderId = folder.Id;

        const accordionSummaryDiv = createDom('div',['slds-accordion__summary','lds-theme_shade'],{backgroundColor : '#f3f3f3', borderRadius: '12px 12px 0 0'});
    
        const accordionSummaryH2 = createDom('h2',['slds-accordion__summary-heading']);
        const accordionSummaryButton = createDom('button',['slds-button','slds-button_reset','slds-accordion__summary-action'],null,{'aria-controls' : folder.Id,'aria-expanded' : String(isOpen),'title' : 'Accordion summary'});
        accordionSummaryButton.addEventListener('click', onClickSectionIconOnly);        
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
        dropDownDiv.addEventListener('click', onClickDropDownDiv);
        const showMoreButton = createDom('button',['slds-button','slds-button_icon','slds-button_icon-border-filled','slds-button_icon-x-small'],null,{'aria-haspopup':'true','title':'Show More'});
        const showMoreSvg = createSVG(['slds-button__icon'],null,{'aria-hidden' : 'true'});
        
        const showMoreUse = createUse(null,null,null,{'xlink:href' : {namespace : XLINK_NS,value : './assets/icons/utility-sprite/svg/symbols.svg#down'}});
        const showMoreSpan = createDom('span',['slds-assistive-text']);
        showMoreSpan.textContent = 'Show More';
        const dropDownActionDiv=  createDom('div',['slds-dropdown','slds-dropdown_actions','slds-dropdown_right']);
        const dropDownActionUl = createDom('ul',['slds-dropdown__list'],null,{'role':'menu'});
        const dropwDownActionLiEdit = createDom('li',['slds-dropdown__item'],null,{'role':'presentation'});
        dropwDownActionLiEdit.addEventListener('click',onClickDropDownEdit);
        const dropwDownActionLiEditA = createDom('a',null,null,{'role' : 'menuitem','tabindex':'0'});
        const dropDownActionLiEditSpan = createDom('span',['slds-truncate'],null,{'title' : '편집'});
        dropDownActionLiEditSpan.textContent = '편집';

        // dropDownActionLiEditSpan.addEventListener(dropDownActionLiEditSpan,onClickdropDownEditSpan);
        const dropDownActionLiOrgAdd = createDom('li',['slds-dropdown__item'],null,{'role' : 'presentation'});
        const dropDownActionLiOrgAddA = createDom('a',null,null,{'role' : 'menuitem','tabindex':'1'});
        const dropDownActionLiOrgAddSpan = createDom('span',['slds-truncate'],null,{'title' : '오그추가'});
        dropDownActionLiOrgAdd.addEventListener('click',onClickDropDownOrgAdd);
        dropDownActionLiOrgAddSpan.textContent = '오그추가';
        // button에 붙이자
        showMoreSvg.appendChild(showMoreUse);
        showMoreButton.appendChild(showMoreSvg);
        // 폴더 삭제
        const dropDownActionLiFolderDelete = createDom('li',['slds-dropdown__item'],null,{'role' : 'presentation'});
        const dropDownActionAFolderDelete = createDom('a',null,null,{'role' : 'menuitem','tabindex':'1'});
        const dropDownActionSpanFolderDelete = createDom('span',['slds-truncate'],null,{'title' : '폴더 삭제'});
        dropDownActionLiFolderDelete.addEventListener('click',onClickDropDownFolderDelete);
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
        divAccordionContent.addEventListener('dragover', onContentDragOver);
        divAccordionContent.addEventListener('drop', onContentDrop);
        section.addEventListener('dragover', onSectionOrgDragOver);
        section.addEventListener('drop', onSectionOrgDrop);
        section.appendChild(divAccordionContent);
        const orgs = (folder.OrgIds || []).filter(id => allData[id]).map(id => allData[id]);
        for(let ORG of orgs){
            // 각 오그를 감싸는 row div 생성 (이게 핵심!)
            // 해당 orgRow에 drag 허용
            let orgRow = createDom('div', ['slds-grid', 'slds-p-vertical_x-small', 'org-row'],{
                borderBottom: '1px solid rgba(128, 128, 128, 0.5)',
                cursor: 'grab'
            },{draggable: true});
            orgRow.addEventListener('click',onClickOrgRow);
            orgRow.addEventListener('dragstart', onOrgDragStart);
            orgRow.addEventListener('dragover', onOrgDragOver);
            // orgRow.addEventListener('dragenter', onOrgDragEnter);
            orgRow.addEventListener('dragleave', onOrgDragLeave);
            orgRow.addEventListener('drop', onOrgDrop);
            orgRow.addEventListener('dragend', onOrgDragEnd);
            orgRow.dataset.orgId = ORG.Id;

            let divOrgName = createDom('div',['slds-col','slds-size_9-of-12']);
            let pOrgName = createDom('p',null);
            pOrgName.textContent = ORG.Name;
            divOrgName.appendChild(pOrgName);
            // ORG URL
            let divOrgUrl = createDom('div',['slds-col','slds-size_1-of-12','org-action-icon']);
            let svgOrgUrl = createSVG(['slds-button__icon'],null,{'aria-hidden' : 'true',cursor: 'pointer'} );
            let useOrgUrl = createUse(null,null,null,{'xlink:href' : {namespace : XLINK_NS,value : './assets/icons/utility-sprite/svg/symbols.svg#logout'}});
            svgOrgUrl.addEventListener('click',orgLinkClick);
            svgOrgUrl.appendChild(useOrgUrl);
            divOrgUrl.appendChild(svgOrgUrl);
            // ORG Edit
            let divOrgEdit = createDom('div',['slds-col','slds-size_1-of-12','org-action-icon']);
            let svgOrgEdit = createSVG(['slds-button__icon'],null,{'aria-hidden' : 'true',cursor: 'pointer'});
            let useOrgEdit = createUse(null,null,null,{'xlink:href' : {namespace : XLINK_NS,value : './assets/icons/utility-sprite/svg/symbols.svg#edit'}});
            svgOrgEdit.appendChild(useOrgEdit);
            divOrgEdit.appendChild(svgOrgEdit);
            svgOrgEdit.addEventListener('click',onClickOrgEdit);
            // ORG Delete
            let divOrgDelete = createDom('div',['slds-col','slds-size_1-of-12','org-action-icon']);
            let svgOrgDelete = createSVG(['slds-button__icon'],null,{'aria-hidden' : 'true',cursor: 'pointer' });
            let useOrgDelete = createUse(null,null,null,{'xlink:href' : {namespace : XLINK_NS,value : './assets/icons/utility-sprite/svg/symbols.svg#delete'}});
            svgOrgDelete.addEventListener('click',onClickOrgDelete);
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

  // FLIP 애니메이션 헬퍼 (First-Last-Invert-Play)
  function flipAnimate(parent, selector) {
    const items = Array.from(parent.querySelectorAll(selector));
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
        if (moved.length === 0) return;
        void parent.offsetHeight;
        moved.forEach(item => {
            item.style.transition = 'transform 150ms ease';
            item.style.transform = '';
            item.addEventListener('transitionend', function handler() {
                item.style.transition = '';
                item.removeEventListener('transitionend', handler);
            }, { once: true });
        });
    };
  }

  let draggingFolderDragId = null;
  let folderDropDone = false;
  function onFolderDragStart(event){
    event.dataTransfer.effectAllowed = 'move';
    draggingFolderDragId = event.currentTarget.querySelector('section').dataset.folderId;
    const li = event.currentTarget;
    requestAnimationFrame(() => li.classList.add('dragging'));
  }
  function onFolderDragOver(event){
    if(!draggingFolderDragId) return;
    event.preventDefault();
    const draggedLi = document.querySelector(`section[data-folder-id="${draggingFolderDragId}"]`)?.closest('li.slds-accordion__list-item');
    const targetLi = event.currentTarget;
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
    const rootSection = event.currentTarget.closest('.slds-accordion__section');
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
    const orgDeleteConfirmModal = document.querySelector('#folder-delete-confirm-modal');
    orgDeleteConfirmModal.classList.remove('slds-fade-in-open');
    orgDeleteConfirmModal.classList.add('slds-hidden');
    const divEditBackdrop = document.querySelector('#folder-delete-backdrop');
    divEditBackdrop.classList.remove('slds-backdrop_open');
    clearUIState();
  }
  function onClickFolderDeleteModalX(event){
    const orgDeleteConfirmModal = document.querySelector('#folder-delete-confirm-modal');
    orgDeleteConfirmModal.classList.remove('slds-fade-in-open');
    orgDeleteConfirmModal.classList.add('slds-hidden');
    const divEditBackdrop = document.querySelector('#folder-delete-backdrop');
    divEditBackdrop.classList.remove('slds-backdrop_open');
    clearUIState();
  }
  async function onClickFolderDeleteModalDelete(event){
    // 폴더에 속한 ORG 아이템도 함께 삭제
    const folder = (await getStorage(deleteFolderId))[deleteFolderId];
    const orgIdsToDelete = folder?.OrgIds || [];
    await deleteStorageKeys([...orgIdsToDelete, deleteFolderId]);
    const orgDeleteConfirmModal = document.querySelector('#folder-delete-confirm-modal');
    orgDeleteConfirmModal.classList.remove('slds-fade-in-open');
    orgDeleteConfirmModal.classList.add('slds-hidden');
    const divEditBackdrop = document.querySelector('#folder-delete-backdrop');
    divEditBackdrop.classList.remove('slds-backdrop_open');
    clearUIState();
    renderFolderList();
  }

  function onClickSectionIconOnly(event) {
    event.stopPropagation();
    const section = event.currentTarget.closest('.slds-accordion__section');
    const nowOpen = !section.classList.contains('slds-is-open');
    section.classList.toggle('slds-is-open', nowOpen);
    event.currentTarget.setAttribute('aria-expanded', String(nowOpen));
    saveAccordionStates();
  }
let draggingOrgId = null;
let draggingFolderId = null;
let orgDropSuccess = false;

function onOrgDragStart(event) {
    event.stopPropagation();
    event.dataTransfer.effectAllowed = 'move';
    const orgRow = event.currentTarget.closest('.org-row');
    draggingOrgId = orgRow.dataset.orgId;
    draggingFolderId = orgRow.closest('section.slds-accordion__section').dataset.folderId;
    requestAnimationFrame(() => orgRow.classList.add('dragging'));
}

function onOrgDragOver(event) {
    if (!draggingOrgId) return;
    event.preventDefault();
    event.stopPropagation();
    const orgRow = event.currentTarget.closest('.org-row');
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
    const targetContent = event.currentTarget;
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
    const section = event.currentTarget;
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
    const orgDeleteConfirmSection =event.currentTarget.closest('#org-delete-confirm-modal');
    const divEditBackdrop = document.querySelector('#org-delete-backdrop');
    orgDeleteConfirmSection.classList.add('slds-hidden');
    orgDeleteConfirmSection.classList.remove('slds-fade-in-open');
    divEditBackdrop.classList.remove('slds-backdrop_open');
    clearUIState();
}
async function onClickOrgDeleteConfirm(event){
    // ORG 아이템 삭제
    await deleteStorage(targetOrgId);
    // 폴더의 OrgIds에서 제거
    const folder = (await getStorage(targetFolderId))[targetFolderId];
    folder.OrgIds = (folder.OrgIds || []).filter(id => id !== targetOrgId);
    await setStorage(targetFolderId,folder);
    const orgDeleteConfirmSection = document.querySelector('#org-delete-confirm-modal');
    const divEditBackdrop = document.querySelector('#org-delete-backdrop');
    orgDeleteConfirmSection.classList.add('slds-hidden');
    orgDeleteConfirmSection.classList.remove('slds-fade-in-open');
    divEditBackdrop.classList.remove('slds-backdrop_open');
    clearUIState();
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
    //  // 1. orgLink(=currentTarget)에서 가장 가까운 section 찾기
     const section = event.currentTarget.closest('section.slds-accordion__section');
    //  // 2. folderId 읽기
     const folderId = section ? section.dataset.folderId : null;
     const orgRow = event.currentTarget.closest('div.org-row');
     const orgId = orgRow.dataset.orgId;
     targetFolderId = folderId;
     targetOrgId = orgId;
     saveUIState();
  }
  async function onClickOrgEdit(event){
    try {
        const section = event.currentTarget.closest('section.slds-accordion__section');
        // 2. folderId 읽기
        const folderId = section ? section.dataset.folderId : null;
        const orgRow = event.currentTarget.closest('div.org-row');
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
    const sectionOrgModal = document.querySelector('#org-modal');
    // 그 안에서 텍스트 span 찾아서 값 가져오기
    sectionOrgModal.dataset.folderId = folderId;
    sectionOrgModal.querySelector('#org-name').value = targetOrg.Name;
    sectionOrgModal.querySelector('#org-type-value').dataset.value = targetOrg.OrgType;
    sectionOrgModal.querySelector('#org-type-value').textContent = getOrgTypeLabel(targetOrg.OrgType);
    sectionOrgModal.querySelector('#org-username').value = targetOrg.UserName;
    let decryptedPw = '';
    try {
        decryptedPw = await decryptPassword(targetOrg.Password);
    } catch (decryptErr) {
        console.error('비밀번호 복호화 실패:', decryptErr);
        // 암호화 키 손실 시 원본 표시 불가 → 빈 값 처리
        decryptedPw = '';
        showToast('비밀번호를 복호화할 수 없습니다. 다시 입력해주세요.', 'error');
    }
    sectionOrgModal.querySelector('#password').value = decryptedPw;
    sectionOrgModal.querySelector('#org-description').value = targetOrg.Description;
    setFaviconColor(targetOrg.FaviconColor || '#0070d2');
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
function onClickSection(event){
    event.stopPropagation();
    const target = event.currentTarget.closest('.slds-accordion__section');
    if (target.classList.contains('slds-is-open')) {
        target.classList.remove('slds-is-open');
    } else {
        target.classList.add('slds-is-open');
    } 
}
function onClickDropDownDiv(event){
    event.stopPropagation();
    const target = event.currentTarget;
    if(target.classList.contains('slds-is-open')){
        target.classList.remove('slds-is-open');
    }else{
        target.classList.add('slds-is-open');
    }
}
function onClickDropDownEdit(event){
    const rootSection = event.currentTarget.closest('.slds-accordion__section');
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
    const folderName = document.querySelector('#folder-name');
    folderName.value = '';
    section.querySelectorAll('.slds-has-error').forEach(el => el.classList.remove('slds-has-error'));
    section.querySelectorAll('.slds-form-element__help').forEach(el => el.remove());
    section.classList.add('slds-hidden');
    section.classList.remove('slds-fade-in-open');
    divEditBackdrop.classList.remove('slds-backdrop_open');
    clearUIState();
}
function onClickFolderModalClose(event){
    const section = event.currentTarget.closest('#folder-edit-modal');
    const divEditBackdrop = document.querySelector('#folder-edit-backdrop');
    const folderName = document.querySelector('#folder-name');
    folderName.value = '';
    section.querySelectorAll('.slds-has-error').forEach(el => el.classList.remove('slds-has-error'));
    section.querySelectorAll('.slds-form-element__help').forEach(el => el.remove());
    section.classList.add('slds-hidden');
    section.classList.remove('slds-fade-in-open');
    divEditBackdrop.classList.remove('slds-backdrop_open');
    clearUIState();
}
async function onClickFolderSave(event){
    // folder-modal-add-button
    const section = event.currentTarget.closest('#folder-edit-modal');
    const divEditBackdrop = document.querySelector('#folder-edit-backdrop');
    const folderModal = event.currentTarget.closest('#folder-edit-modal');    
    const folderId = folderModal.dataset.folderId;
    const inputValue = folderModal.querySelector('input').value;
    let isRequired = false;
    if(inputValue == undefined || inputValue == null || inputValue ==''){
        if(!isRequired) isRequired = true;
        const folderNameDiv = document.querySelector('#folder-name-form');
        if(!folderNameDiv.classList.contains('slds-has-error')){
            const folderNameForm = document.querySelector('#folder-name-form');
            folderNameForm.classList.add('slds-has-error');
            const errorMessage = createDom('div',['slds-form-element__help']);
            errorMessage.textContent = '폴더 이름을 입력해 주세요.';
            folderNameForm.appendChild(errorMessage);
        }
    }else{
        const folderNameDiv = document.querySelector('#folder-name-form');
        const folderNameForm = document.querySelector('#folder-name-form');
        if(folderNameDiv.classList.contains('slds-has-error')){
            folderNameDiv.classList.remove('slds-has-error');
            folderNameForm.querySelector('.slds-form-element__help').remove();
        }
    }
    if(isRequired) return;
    folderModal.querySelectorAll('.slds-has-error').forEach(el => el.classList.remove('slds-has-error'));
    folderModal.querySelectorAll('.slds-form-element__help').forEach(el => el.remove());
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
        section.classList.add('slds-hidden');
        section.classList.remove('slds-fade-in-open');
        divEditBackdrop.classList.remove('slds-backdrop_open');
        clearUIState();
    }else{ // 새로 생성
        // 폴더 수 제한 체크
        const allFolders = Object.values(await getStorage(null)).filter(d => d.Id && d.Id.startsWith('fol_'));
        if (allFolders.length >= MAX_FOLDERS) {
            showToast('폴더는 최대 ' + MAX_FOLDERS + '개까지 생성할 수 있습니다.');
            return;
        }
        const inputValue = folderModal.querySelector('input').value;
        folderModal.querySelector('input').value = '';
        const folder = new Folder('fol_'+generateRandomId(12),[],inputValue,folderSize+1);

        await setStorage(folder.Id,folder);
        section.classList.add('slds-hidden');
        section.classList.remove('slds-fade-in-open');
        divEditBackdrop.classList.remove('slds-backdrop_open');
        clearUIState();
        renderFolderList();
    }
    
}
async function onClickGroundFolderAdd(event){
    // 폴더 수 제한 체크
    const allData = Object.values(await getStorage(null));
    const folderCount = allData.filter(d => d.Id && d.Id.startsWith('fol_')).length;
    if (folderCount >= MAX_FOLDERS) {
        showToast('폴더는 최대 ' + MAX_FOLDERS + '개까지 생성할 수 있습니다.');
        return;
    }
    const section = document.querySelector('#folder-edit-modal');
    section.dataset.folderId = '';
    // modal open
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
        const rootSection = event.currentTarget.closest('.slds-accordion__section');
        const folderId = rootSection.dataset.folderId;

        if (!folderId) {
            showToast('폴더 정보를 찾을 수 없습니다.');
            return;
        }

        // 오그 수 제한 체크
        const folderData = await getStorage(folderId);
        const folder = folderData[folderId];

        if (!folder) {
            showToast('폴더 정보를 불러올 수 없습니다.');
            return;
        }

        if ((folder.OrgIds || []).length >= MAX_ORGS_PER_FOLDER) {
            showToast('폴더당 오그는 최대 ' + MAX_ORGS_PER_FOLDER + '개까지 생성할 수 있습니다.');
            return;
        }
        const sectionModal = document.querySelector('#org-modal');
        sectionModal.dataset.folderId = folderId;
        targetOrgId = null;
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
    const divOrgModal =event.currentTarget.closest('#org-modal');
    const divOrgBackdrop = document.querySelector('#add-org-backdrop');
    const sectionOrgModal = event.currentTarget.closest('#org-modal');
    sectionOrgModal.querySelector('#org-name').value = '';
    sectionOrgModal.querySelector('#org-type-value').dataset.value = '';
    sectionOrgModal.querySelector('#org-type-value').textContent = '선택해주세요.';
    sectionOrgModal.querySelector('#org-username').value = '';
    sectionOrgModal.querySelector('#password').value = '';
    sectionOrgModal.querySelector('#org-description').value = '';
    setFaviconColor('#0070d2');
    const descCount = document.querySelector('#org-description-count');
    if (descCount) descCount.textContent = '0 / 1,000';
    targetOrgId = null;

    sectionOrgModal.querySelectorAll('.slds-has-error').forEach(el => el.classList.remove('slds-has-error'));
    sectionOrgModal.querySelectorAll('.slds-form-element__help').forEach(el => el.remove());
    divOrgModal.classList.add('slds-hidden');
    divOrgModal.classList.remove('slds-fade-in-open');
    divOrgBackdrop.classList.remove('slds-backdrop_open');
    clearUIState();
}
function onClickButtonOrgModalClose(event){
    const sectionOrgModal = event.currentTarget.closest('#org-modal');
    sectionOrgModal.querySelector('#org-name').value = '';
    sectionOrgModal.querySelector('#org-type-value').dataset.value = '';
    sectionOrgModal.querySelector('#org-type-value').textContent = '선택해주세요.';
    sectionOrgModal.querySelector('#org-username').value = '';
    sectionOrgModal.querySelector('#password').value = '';
    sectionOrgModal.querySelector('#org-description').value = '';
    setFaviconColor('#0070d2');
    const descCount = document.querySelector('#org-description-count');
    if (descCount) descCount.textContent = '0 / 1,000';
    targetOrgId = null;
    sectionOrgModal.querySelectorAll('.slds-has-error').forEach(el => el.classList.remove('slds-has-error'));
    sectionOrgModal.querySelectorAll('.slds-form-element__help').forEach(el => el.remove());
    const divOrgBackdrop = document.querySelector('#add-org-backdrop');

    sectionOrgModal.classList.add('slds-hidden');
    sectionOrgModal.classList.remove('slds-fade-in-open');
    divOrgBackdrop.classList.remove('slds-backdrop_open');
    clearUIState();
}
async function onClickOrgModalSave(event){
    try {
        console.log('onClickOrgModalSave run');
        const sectionOrgModal = event.currentTarget.closest('#org-modal');
        const folderId = sectionOrgModal.dataset.folderId;
        console.log('folderId :: '+folderId);

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

        console.log('folder');
        console.log(JSON.stringify(folder));
        const orgName = sectionOrgModal.querySelector('#org-name').value;
    const orgType = sectionOrgModal.querySelector('#org-type-value').dataset.value;
    const userName = sectionOrgModal.querySelector('#org-username').value;
    const password = sectionOrgModal.querySelector('#password').value;
    const description = sectionOrgModal.querySelector('#org-description').value;
    let isRequired = false;
    if(orgName == undefined || orgName == null || orgName ==''){
        const orgNameDiv = document.querySelector('#org-name-div');
        if(!orgNameDiv.classList.contains('slds-has-error')){
            const orgNameForm = document.querySelector('#org-name-form');
            orgNameDiv.classList.add('slds-has-error');
            const errorMessage = createDom('div',['slds-form-element__help']);
            errorMessage.textContent = '오그 이름을 입력해 주세요.';
            orgNameForm.appendChild(errorMessage);
            if(!isRequired) isRequired = true;
        }
    }else{
        const orgNameDiv = document.querySelector('#org-name-div');
        const orgNameForm = document.querySelector('#org-name-form');
        if(orgNameDiv.classList.contains('slds-has-error')){
            orgNameDiv.classList.remove('slds-has-error');
            orgNameForm.querySelector('.slds-form-element__help').remove();
        }
    }
    if(orgType == undefined || orgType == null || orgType == ''){
        if(!isRequired) isRequired = true;
        const orgTypeDiv = document.querySelector('#combobox-div');
        if(!orgTypeDiv.classList.contains('slds-has-error')){
            const orgTypeForm = document.querySelector('#org-type-form');
            orgTypeDiv.classList.add('slds-has-error');
            const errorMessage = createDom('div',['slds-form-element__help']); // TODO edit onclick이벤트 필요
            errorMessage.textContent = '오그 유형을 선택해 주세요.';
            orgTypeForm.appendChild(errorMessage);
        }
    }else{
        const orgTypeDiv = document.querySelector('#combobox-div');
        const orgTypeForm = document.querySelector('#org-type-form');
        if(orgTypeDiv.classList.contains('slds-has-error')){
            orgTypeDiv.classList.remove('slds-has-error');
            orgTypeForm.querySelector('.slds-form-element__help').remove();
        }
    }
    if(userName == undefined || userName == null || userName ==''){
        if(!isRequired) isRequired = true;
        const userNameDiv = document.querySelector('#user-name-div');
        if(!userNameDiv.classList.contains('slds-has-error')){
            const userNameForm = document.querySelector('#user-name-form');
            userNameDiv.classList.add('slds-has-error');
            const errorMessage = createDom('div',['slds-form-element__help']);
            errorMessage.textContent = '사용자 이름을 입력해 주세요.';
            userNameForm.appendChild(errorMessage);
        }
    }else{
        const userNameDiv = document.querySelector('#user-name-div');
        const userNameForm = document.querySelector('#user-name-form');
        if(userNameDiv.classList.contains('slds-has-error')){
            userNameDiv.classList.remove('slds-has-error');
            userNameForm.querySelector('.slds-form-element__help').remove();
        }
    }
    if(password == undefined || password == null || password == ''){
        if(!isRequired) isRequired = true;
        const passwordDiv = document.querySelector('#password-div');
        if(!passwordDiv.classList.contains('slds-has-error')){
            const passwordForm = document.querySelector('#password-form');
            passwordDiv.classList.add('slds-has-error');
            const errorMessage = createDom('div',['slds-form-element__help']);
            errorMessage.textContent = '비밀번호를 입력해 주세요.';
            passwordForm.appendChild(errorMessage);
        }
    }else{
        const passwordDiv = document.querySelector('#password-div');
        const passwordForm = document.querySelector('#password-form');
        if(passwordDiv.classList.contains('slds-has-error')){
            passwordDiv.classList.remove('slds-has-error');
            passwordForm.querySelector('.slds-form-element__help').remove();
        }
    }
    if(isRequired) return;
    sectionOrgModal.querySelectorAll('.slds-has-error').forEach(el => el.classList.remove('slds-has-error'));
    sectionOrgModal.querySelectorAll('.slds-form-element__help').forEach(el => el.remove());
    const url = getOrgLoginUrl(orgType);
    const selectedFolderId = document.querySelector('#org-folder-select')?.value || folderId;
    const faviconColor = document.querySelector('#org-favicon-color').value;
    const encryptedPassword = await encryptPassword(password);
// edit
    if(targetOrgId){
        const org = new ORG(targetOrgId,selectedFolderId,orgName,orgType,url,userName,encryptedPassword,description,faviconColor);
        // ORG 아이템 저장
        await setStorage(targetOrgId, org);
        if (selectedFolderId !== folderId) {
            // 다른 폴더로 이동
            const newFolder = (await getStorage(selectedFolderId))[selectedFolderId];
            if ((newFolder.OrgIds || []).length >= MAX_ORGS_PER_FOLDER) {
                showToast('이동할 폴더의 오그 수가 최대 한도(' + MAX_ORGS_PER_FOLDER + '개)에 도달했습니다.');
                return;
            }
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
        if ((targetFolder.OrgIds || []).length >= MAX_ORGS_PER_FOLDER) {
            showToast('폴더당 오그는 최대 ' + MAX_ORGS_PER_FOLDER + '개까지 생성할 수 있습니다.');
            return;
        }
        const orgId ='org_'+ generateRandomId(12);
        const org = new ORG(orgId,selectedFolderId,orgName,orgType,url,userName,encryptedPassword,description,faviconColor);
        // ORG 아이템 별도 저장
        await setStorage(orgId, org);
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
    sectionOrgModal.querySelector('#org-description').value = '';
    setFaviconColor('#0070d2');
    const descCountSave = document.querySelector('#org-description-count');
    if (descCountSave) descCountSave.textContent = '0 / 1,000';
    const divOrgModal =document.querySelector('#org-modal');
    const divOrgBackdrop = document.querySelector('#add-org-backdrop');
    divOrgModal.classList.add('slds-hidden');
    divOrgModal.classList.remove('slds-fade-in-open');
    divOrgBackdrop.classList.remove('slds-backdrop_open');
    targetOrgId = null;
    clearUIState();
    renderFolderList();
    } catch (error) {
        console.error('오그 저장 중 오류:', error);
        showToast('오그 저장 중 오류가 발생했습니다: ' + error.message);
    }
}
function setFaviconColor(color) {
    const input = document.querySelector('#org-favicon-color');
    if (input) input.value = color;
    const icon = document.querySelector('#favicon-cloud-icon path');
    if (icon) icon.setAttribute('fill', color);
}
function getOrgLoginUrl(orgType){
    let result;
    if(orgType == 'production' || orgType == '운영') result = 'https://login.salesforce.com';
    else if(orgType == 'sandbox' || orgType == '샌드박스') result = 'https://test.salesforce.com';
    else if(orgType == 'SDO') result = 'https://login.salesforce.com';
    else if(orgType == 'developer' || orgType == '데브') result = 'https://login.salesforce.com';
    return result;
}
async function orgLinkClick(event){
    console.log('[orgLinkClick] 함수 호출됨!', event);
    const orgRow = event.currentTarget.closest('div.org-row');
    let spinner = null;
    try {
        event.preventDefault(); // 기본 이동 동작 막기
        console.log('[orgLinkClick] 이벤트 기본 동작 방지됨');
        // 1. orgLink(=currentTarget)에서 가장 가까운 section 찾기
        const section = event.currentTarget.closest('section.slds-accordion__section');
        console.log('[orgLinkClick] section 찾음:', !!section);
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

        // spinner 표시
        spinner = document.createElement('div');
        spinner.className = 'org-row-spinner';
        spinner.innerHTML = '<div role="status" class="slds-spinner slds-spinner_small slds-spinner_brand"><span class="slds-assistive-text">로딩중</span><div class="slds-spinner__dot-a"></div><div class="slds-spinner__dot-b"></div></div>';
        orgRow.appendChild(spinner);

        // 세션 쿠키 기반 로그인 우선 시도
        const session = await trySessionLogin(targetOrg);
        if (session) {
            // 파비콘 처리: pendingFavicon 저장 (frontdoor.jsp 이후 Lightning 페이지에서 적용)
            if (targetOrg.FaviconColor) {
                chrome.storage.local.set({ pendingFavicon: { color: targetOrg.FaviconColor, timestamp: Date.now() } });
            }
            const frontdoorUrl = `${session.instanceUrl}/secur/frontdoor.jsp?sid=${encodeURIComponent(session.sessionId)}`;
            console.log('[오그 링크] 세션 기반 로그인:', frontdoorUrl);
            window.open(frontdoorUrl, "_blank");
            return;
        }

        // 세션 없으면 기존 form 기반 로그인
        const url = targetOrg.URL +'?' +encode('folderId')+'='+encodeURIComponent(encode(folderId))+'&'+encode('orgId') + '=' + encodeURIComponent(encode(orgId));
        console.log('[오그 링크] form 기반 로그인:', url);
        window.open(url, "_blank");
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

        console.log(`[세션 로그인] ${candidates.length}개의 sid 쿠키 발견, 검증 시작`);

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

        if (raceResult) {
            console.log(`[세션 로그인] 유효한 세션 발견: ${raceResult.instanceUrl}`);
        } else {
            console.log('[세션 로그인] 유효한 세션 없음, form 기반 로그인으로 폴백');
        }

        return raceResult;
    } catch (error) {
        console.error('[세션 로그인] 쿠키 기반 세션 확인 실패:', error);
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
        chrome.storage.sync.set({[keys] : value}, (result) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
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
                resolve(result);
            }
        });
    });
}
function deleteStorageKeys(keys) {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.remove(keys, () => {
            if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
            else resolve();
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
    return data[orgId] || null;
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
function onClickOpenSettings() {
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
    const allData = Object.values(await getStorage(null));
    const folders = allData.filter(d => d.Id && d.Id.startsWith('fol_'));
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
    const allData = await getStorage(null);
    const folders = Object.values(allData).filter(d => d.Id && d.Id.startsWith('fol_'));
    folders.sort((a, b) => a.SortNumber - b.SortNumber);

    // 내보내기용: OrgIds → embedded ORGs 형식으로 변환 (호환성)
    const exportFolders = [];
    for (const folder of folders) {
        const orgIds = folder.OrgIds || [];
        const orgs = orgIds.filter(id => allData[id]).map(id => JSON.parse(JSON.stringify(allData[id])));
        for (const org of orgs) {
            try {
                org.Password = await decryptPassword(org.Password);
            } catch (e) {
                console.error('내보내기 중 비밀번호 복호화 실패:', org.Id, e);
                org.Password = '';
            }
        }
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

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OrgLink_backup_${new Date().toISOString().slice(0, 10)}.json`;
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
        const importData = JSON.parse(text);

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
            showToast('폴더 수가 최대 한도(' + MAX_FOLDERS + '개)를 초과합니다.');
            return;
        }
        for (const folder of importData.folders) {
            const orgCount = (folder.ORGs || []).length;
            if (orgCount > MAX_ORGS_PER_FOLDER) {
                showToast('"' + folder.Name + '" 폴더의 오그 수가 최대 한도(' + MAX_ORGS_PER_FOLDER + '개)를 초과합니다.');
                return;
            }
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

        // embedded 형식(ORGs 배열) → 분리 형식으로 저장
        for (const folder of importData.folders) {
            const orgIds = [];
            const orgs = folder.ORGs || [];
            for (const org of orgs) {
                if (typeof org.Password === 'string' && org.Password !== '') {
                    org.Password = await encryptPassword(org.Password);
                }
                org.FolderId = folder.Id;
                await setStorage(org.Id, org);
                orgIds.push(org.Id);
            }
            await setStorage(folder.Id, {
                Id: folder.Id,
                Name: folder.Name,
                SortNumber: folder.SortNumber,
                OrgIds: orgIds
            });
        }

        showToast('데이터를 성공적으로 가져왔습니다.', 'success');
        renderFolderList();

    } catch (e) {
        showToast('파일을 읽는 중 오류가 발생했습니다: ' + e.message);
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
            description: orgModal.querySelector('#org-description')?.value || '',
            faviconColor: orgModal.querySelector('#org-favicon-color')?.value || '#0070d2',
            selectedFolderId: document.querySelector('#org-folder-select')?.value || ''
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
            sectionOrgModal.querySelector('#org-description').value = data.description;
            setFaviconColor(data.faviconColor || '#0070d2');

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
    console.log('initLiveSearch run');
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