
/**
 * 스토리지에 row는 foler만
 * 오그는 칼럼 하나에 전부 다 담아버리자
 */
class Folder {
    Id; // fol + 12자리 랜덤 문자열
    ORGs;
    Name;
    SortNumber;
    constructor(Id, ORGs,Name,SortNumber) {
        this.Id = Id;
        this.ORGs = ORGs;
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
    constructor(Id, FolderId, Name,OrgType, URL, UserName, Password,Description) {
        this.Id = Id;
        this.FolderId = FolderId;
        this.Name = Name;
        this.OrgType = OrgType;
        this.URL = URL;
        this.UserName = UserName;
        this.Password = Password;
        this.Description = Description;
    }
}
const SVG_NS = "http://www.w3.org/2000/svg";
const XLINK_NS = "http://www.w3.org/1999/xlink";
let targetOrgId;
let targetFolderId;
document.addEventListener("DOMContentLoaded", init);
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
   console.log('tabs :: '+JSON.stringify(tabs));
  const tabId = tabs[0].id;

  // content_script.js 동적 주입
  chrome.scripting.executeScript(
    {
      target: { tabId: tabId },
      files: ['home.js'],
    },
    () => {
      // 주입 완료 후 메시지 전달
      chrome.tabs.sendMessage(tabId, { action: "initData", data: "전달할 데이터" }, (response) => {
        console.log("content_script 응답:", response);
      });
    }
  );
});

async function init() {
    //   chrome.storage.sync.clear(() => {
    //     console.log('확장 프로그램 로컬 스토리지 삭제 완료');
    //   });
    //   const folder = {
    //     Id: 'Id',
    //     Name: 'TestFolder',
    //     ORGs: []
    //   };
    //   await setStorage(folder.Id, folder);
    
    
    console.log("popup.js run");
    const foldersContainer = document.querySelector('#folders-container');    
    const sectionFolderModal = document.querySelector('#forlder-edit-modal');
    const buttonFolderEditModalX = sectionFolderModal.querySelector('#forlder-edit-modal-x');
    const buttonFolderCloseButton =  sectionFolderModal.querySelector('#folder-modal-close-button');
    const buttonFolderAddButton = sectionFolderModal.querySelector('#folder-modal-add-button');
    const buttonGroundFolderAdd = document.querySelector('#ground-folder-add');
    const divOrgTypeDropdown = document.querySelector('#org-type-dropdown');
    const ulOrgType = document.querySelector('#org-type-ul');
    const buttonOrgModalX = document.querySelector('#org-modal-x');
    const buttonOrgModalClose = document.querySelector('#org-modal-close-button');
    const buttonOrgModalSave = document.querySelector('#org-modal-save-button');
    const orgDeleteCancle = document.querySelector('#org-delete-cancle');
    const orgDeleteConfirm = document.querySelector('#org-delete-fonfirm');
    const orgDeleteX = document.querySelector('#org-delete-x');
    const headerFolderAdd = document.querySelector('#header-folder-add');
    const folderDeleteX = document.querySelector('#folder-delete-x');
    const folderDeleteCancle = document.querySelector('#folder-delete-cancle');
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
    orgDeleteCancle.addEventListener('click',onClickOrgDeleteCancle);
    orgDeleteConfirm.addEventListener('click',onClickOrgDeleteConfirm);
    orgDeleteX.addEventListener('click',onClickOrgDeleteCancle);
    headerFolderAdd.addEventListener('click',onClickGroundFolderAdd);
    folderDeleteX.addEventListener('click',onClickFolderDeleteModalX);
    folderDeleteCancle.addEventListener('click',onClickFolderDeleteModalCancel);
    folderDeleteConfirm.addEventListener('click',onClickFolderDeleteModalDelete);
    renderFolderList(); 
}
let folderSize = null;
async function renderFolderList() {
    console.log('renderFolderList run');
    // 로컬 스토리지에서 모든 데이터 싹 가져와야 됨
    const folders = Object.values(await getStorage(null));
    folderSize = folders.length-1;
    folders.sort((a, b) => a.SortNumber - b.SortNumber);
    const accordionUl = document.getElementById("folders-container").querySelector('ul.slds-accordion');
    accordionUl.innerHTML = "";
    console.log('folders :: ');
    console.log(folders);
    for(const folder of folders || []){
        const li = createDom('li',['slds-accordion__list-item','slds-m-bottom_small'],{border : '1px solid black'},{ draggable: true } );
        li.addEventListener('dragstart',onFolderDragStart);
        li.addEventListener('dragover',onFolderDragOver);
        li.addEventListener('dragleave',onFolderDragLeave);
        li.addEventListener('drop',onFolderDrop);
        li.addEventListener('dragend', onFolderDragEnd);
        // slds-is-open
        const section = createDom('section',['slds-accordion__section','slds-is-open']);
        section.dataset.folderId = folder.Id;

        const accordionSummaryDiv = createDom('div',['slds-accordion__summary','lds-theme_shade'],{backgroundColor : '#e5e5e5'});
    
        const accordionSummaryH2 = createDom('h2',['slds-accordion__summary-heading']);
        const accordionSummaryButton = createDom('button',['slds-button','slds-button_reset','slds-accordion__summary-action'],null,{'aria-controls' : 'referenceId-24','aria-expanded' : 'true','title' : 'Accordion summary'});
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
        section.appendChild(divAccordionContent);
        for(let ORG of Object.values(folder.ORGs)){
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
            let divOrgUrl = createDom('div',['slds-col','slds-size_1-of-12']); // TODO 오그이동 onclick이벤트 필요
            let svgOrgUrl = createSVG(['slds-button__icon'],null,{'aria-hidden' : 'true',cursor: 'pointer'} );
            let useOrgUrl = createUse(null,null,null,{'xlink:href' : {namespace : XLINK_NS,value : './assets/icons/utility-sprite/svg/symbols.svg#logout'}});
            svgOrgUrl.addEventListener('click',orgLinkClick);
            svgOrgUrl.appendChild(useOrgUrl);
            divOrgUrl.appendChild(svgOrgUrl);
            // ORG Edit
            let divOrgEdit = createDom('div',['slds-col','slds-size_1-of-12']); // TODO edit onclick이벤트 필요
            let svgOrgEdit = createSVG(['slds-button__icon'],null,{'aria-hidden' : 'true',cursor: 'pointer'});
            let useOrgEdit = createUse(null,null,null,{'xlink:href' : {namespace : XLINK_NS,value : './assets/icons/utility-sprite/svg/symbols.svg#edit'}});
            svgOrgEdit.appendChild(useOrgEdit);
            divOrgEdit.appendChild(svgOrgEdit);
            svgOrgEdit.addEventListener('click',onClickOrgEdit);
            // ORG Delete
            let divOrgDelete = createDom('div',['slds-col','slds-size_1-of-12'] ); // TODO delete onclick이벤트 필요
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
  }
  let draggingFolderDragId = null;
  function onFolderDragStart(event){
    console.log('onFolderDragStart run');
    event.dataTransfer.effectAllowed = 'move'; // 해당 코드 있어야 드래그 작동
    console.log(event.currentTarget.querySelector('section'));
    draggingFolderDragId = event.currentTarget.querySelector('section').dataset.folderId;
    console.log('draggingFolderDragId :: '+draggingFolderDragId);

  }
  let lastDragOverFolder = null;
  function onFolderDragOver(event){
    if(draggingOrgId) return;
    event.preventDefault();
    if(lastDragOverFolder && lastDragOverFolder !== event.currentTarget){
        lastDragOverFolder.classList.remove('drag-over');
    }
    event.currentTarget.classList.add('drag-over');
    lastDragOverFolder = event.currentTarget;
  }
  function onFolderDragLeave(event){
    console.log('onFolderDragLeave run');
    // lastDragOverFolder = null;
    // draggingFolderDragId = null;

  }
  // 구현
function onFolderDragEnd(){
    if (lastDragOverFolder){
      lastDragOverFolder.classList.remove('drag-over');
      lastDragOverFolder = null;
    }
    draggingFolderDragId = null;
  }
  async function onFolderDrop(event){
    console.log('onFolderDrop run');
    if (draggingOrgId) return;   
    event.preventDefault();
    const targetFolderDom = event.currentTarget;
    console.log('event.currentTarget.querySelector()');
    console.log(event.currentTarget.querySelector('section'));
    const targetFolderId = event.currentTarget.querySelector('section').dataset.folderId;
    const sourceFolderId = draggingFolderDragId;   // ★ 스냅샷(이 값만 사용)
    if(targetFolderDom){
        targetFolderDom.classList.remove('drag-over');
    }
    console.log('targetFolderId :: '+targetFolderId);
    console.log('sourceFolderId '+sourceFolderId);
    if(sourceFolderId !== targetFolderId){
        const dragFolder = (await getStorage(sourceFolderId))[sourceFolderId];   
        const targetFolder = (await getStorage(targetFolderId))[targetFolderId];
        console.log(dragFolder);
        console.log(targetFolder);
        const dragFolderSortNumber = dragFolder.SortNumber;
        const targetFolderSortNumber = targetFolder.SortNumber;
        dragFolder.SortNumber = targetFolderSortNumber;
        targetFolder.SortNumber = dragFolderSortNumber;
        await setStorage(dragFolder.Id, dragFolder);
        await setStorage(targetFolder.Id, targetFolder);
    }    
    // drag 시작한 folder랑 내려놓은 folder가 필요함
    console.log(targetFolderDom);
    if(lastDragOverFolder){
        lastDragOverFolder = null;
    }
    renderFolderList();

  }

  let deleteFolderId = null;
  function onClickDropDownFolderDelete(event){
    console.log('onClickDropDownFolderDelete run');
    // 폴더 삭제 모달 활성화
    const rootSection = event.currentTarget.closest('.slds-accordion__section');
    deleteFolderId = rootSection.dataset.folderId;
    const orgDeleteConfirmModal = document.querySelector('#folder-delete-cofirm-modal');
    orgDeleteConfirmModal.classList.remove('slds-hidden');
    orgDeleteConfirmModal.classList.add('slds-fade-in-open');
    const divEditBackdrop = document.querySelector('#folder-delete-backdrop');
    divEditBackdrop.classList.add('slds-backdrop_open');
  }
  function onClickFolderDeleteModalCancel(event){
    console.log('onClickFolderDeleteModalCancel run');
    deleteFolderId = null;
    const orgDeleteConfirmModal = document.querySelector('#folder-delete-cofirm-modal');
    orgDeleteConfirmModal.classList.remove('slds-fade-in-open');
    orgDeleteConfirmModal.classList.add('slds-hidden');
    const divEditBackdrop = document.querySelector('#folder-delete-backdrop');
    divEditBackdrop.classList.remove('slds-backdrop_open');
  }
  function onClickFolderDeleteModalX(event){
    console.log('onClickFolderDeleteModalX run');
    const orgDeleteConfirmModal = document.querySelector('#folder-delete-cofirm-modal');
    orgDeleteConfirmModal.classList.remove('slds-fade-in-open');
    orgDeleteConfirmModal.classList.add('slds-hidden');
    const divEditBackdrop = document.querySelector('#folder-delete-backdrop');
    divEditBackdrop.classList.remove('slds-backdrop_open');
  }
  async function onClickFolderDeleteModalDelete(event){
    console.log('onClickFolderDeleteModalDelete run');
    // folderId로 찾음
    // const folder = (await getStorage(deleteFolderId))[deleteFolderId];
    // 해당 folder를 삭제함
    await deleteStorage(deleteFolderId);
    const orgDeleteConfirmModal = document.querySelector('#folder-delete-cofirm-modal');
    orgDeleteConfirmModal.classList.remove('slds-fade-in-open');
    orgDeleteConfirmModal.classList.add('slds-hidden');
    const divEditBackdrop = document.querySelector('#folder-delete-backdrop');
    divEditBackdrop.classList.remove('slds-backdrop_open');
    renderFolderList();
  }

  function onClickSectionIconOnly(event) {
    console.log('onClickSectionIconOnly run');
    event.stopPropagation(); // 상위로 이벤트 안 올림(권장)
    // 아이콘(svg.slds-accordion__summary-action-icon) 이 아니면 아무 것도 안 함
    // if (!event.target.closest('svg.slds-accordion__summary-action-icon')) return;
    console.log('작동 하냐?');
    const section = event.currentTarget.closest('.slds-accordion__section');
    const nowOpen = !section.classList.contains('slds-is-open');
    section.classList.toggle('slds-is-open', nowOpen);
  
    // 접근성 업데이트(권장)
    event.currentTarget.setAttribute('aria-expanded', String(nowOpen));
  }
let draggingOrgId = null; // 현재 드래그중인 ORG id
let draggingFolderId = null; // 현재 드래그중인 Folder id

function onOrgDragStart(event) {
    console.log('onOrgDragStart run');
    // orgRow.dataset.orgId = ORG.Id;
    event.dataTransfer.effectAllowed = 'move'; // 해당 코드 있어야 드래그 작동
    // move 적용 완료
    // event.currentTarget.style.opacity = '0.4';
    draggingOrgId = event.currentTarget.closest('.org-row').dataset.orgId;
    draggingFolderId = event.currentTarget.closest('section.slds-accordion__section').dataset.folderId;
    console.log('draggingOrgId :: '+draggingOrgId);
    console.log('draggingFolderId :: '+draggingFolderId);
    // 시각적 효과
    // section.currentTarget.style.opacity = '0.4';
}

let lastDragOverOrgRow = null;
function onOrgDragOver(event) {
    console.log('onOrgDragOver run');
    console.log(draggingOrgId);
    if (!draggingOrgId) return;       
    // 내가 끌고 온 폴더와, 지금 올라간(hover) 행의 폴더가 같은지 확인
  const hoveredSection = event.currentTarget.closest('section.slds-accordion__section');
  const hoveredFolderId = hoveredSection?.dataset.folderId;

  // 다른 폴더면: 기존 하이라이트만 정리하고 끝 (preventDefault도 하지 않음 → 드롭 불가)
  if (hoveredFolderId !== draggingFolderId) {
    if (lastDragOverOrgRow) {
      lastDragOverOrgRow.classList.remove('drag-over');
      lastDragOverOrgRow = null;
    }
    return;
  }
    event.preventDefault();
    event.stopPropagation();    
    const orgRow = event.currentTarget.closest('.org-row');
    if (!orgRow) return;

    if (lastDragOverOrgRow && lastDragOverOrgRow !== orgRow) {
        lastDragOverOrgRow.classList.remove('drag-over');
    }
    orgRow.classList.add('drag-over');
    lastDragOverOrgRow = orgRow;
}
// function onOrgDragEnter(event) {
//     console.log('onOrgDragEnter run');
//     const divOrg = event.currentTarget.closest('.org-row');
//     if(divOrg) {
//         divOrg.classList.add('drag-over');
//     }
// }
function onOrgDragLeave(event) {
    // 드래그가 정말 orgRow 바깥으로 나갈 때만 제거
    const orgRow = event.currentTarget.closest('.org-row');
    // 아래는 실제로 orgRow를 벗어났을 때만 작동하는 보조로, 꼭 필요하지 않을 수도 있음
    if (orgRow && orgRow === lastDragOverOrgRow) {
        orgRow.classList.remove('drag-over');
        lastDragOverOrgRow = null;
    }
    // lastDragOverOrgRow = null;
    // draggingFolderId = null;
    // draggingOrgId = null;
}
async function onOrgDrop(event) {
    if (!draggingOrgId) return;       
    console.log('hi');
    event.preventDefault();
    event.stopPropagation(); 
    console.log('event.currentTarget');
    console.log(event.currentTarget);
    console.log('event.currentTarget.dataset.orgId :: '+event.currentTarget.dataset.orgId);
    
    const folderId = event.currentTarget.closest('section').dataset.folderId;
    console.log('return 직전');
    if (folderId !== draggingFolderId) return; // ← 이 경우도 드래그 상태는 해제되어야 함
    console.log('return 탈출');
    const cloneDraggingOrgId = draggingOrgId;
    const cloneTargetOrgId = event.currentTarget.dataset.orgId;
    const folder = (await getStorage(folderId))[folderId];
    const orgs = folder.ORGs;    
    const fromIdx = orgs.findIndex(o => o.Id === cloneDraggingOrgId);   // 끌던 org
    const toIdx   = orgs.findIndex(o => o.Id === cloneTargetOrgId);     // 놓인 자리의 org
    console.log('fromIdx :: '+fromIdx);
    console.log('toIdx :: '+toIdx);
    console.log('두번째 직전');
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return; // ← 여기서도 바로 return되면 상태가 안 풀림
    console.log('두번째 직후');
    const [moved] = orgs.splice(fromIdx, 1);
    orgs.splice(toIdx, 0, moved);
    await setStorage(folderId, folder);
    renderFolderList();
    
        // // 항상 실행: 하이라이트/플래그 정리
        // const row = event.currentTarget.closest('.org-row');
        // row && row.classList.remove('drag-over');
        // if (lastDragOverOrgRow) {
        //   lastDragOverOrgRow.classList.remove('drag-over');
        //   lastDragOverOrgRow = null;
        // }
        // draggingOrgId = null;
        // draggingFolderId = null;
      
}

function onOrgDragEnd(event) {
    if (lastDragOverOrgRow){
        lastDragOverOrgRow.classList.remove('drag-over');
        lastDragOverOrgRow = null;
      }
      draggingOrgId = null;
      draggingFolderId = null;
}
async function onClickOrgDeleteCancle(event){
    console.log('onClickOrgDeleteCancle run');
    // 모달을 꺼버릴것
    const orgDeleteFonfirmSection =event.currentTarget.closest('#org-delete-cofirm-modal');
    const divEditBackdrop = document.querySelector('#org-delete-backdrom');
    orgDeleteFonfirmSection.classList.add('slds-hidden');
    orgDeleteFonfirmSection.classList.remove('slds-fade-in-open');
    divEditBackdrop.classList.remove('slds-backdrop_open');
}
async function onClickOrgDeleteConfirm(event){
    console.log('onClickOrgDeleteConfirm run');
    console.log('folderId :: '+targetFolderId);
    console.log('orgId :: '+targetOrgId);
    const folder = (await getStorage(targetFolderId))[targetFolderId];
    folder.ORGs = folder.ORGs.filter(org => org.Id !== targetOrgId);
    await setStorage(targetFolderId,folder);
    const orgDeleteFonfirmSection = document.querySelector('#org-delete-cofirm-modal');
    const divEditBackdrop = document.querySelector('#org-delete-backdrom');
    orgDeleteFonfirmSection.classList.add('slds-hidden');
    orgDeleteFonfirmSection.classList.remove('slds-fade-in-open');
    divEditBackdrop.classList.remove('slds-backdrop_open');
    renderFolderList();
}
  async function onClickOrgDelete(event){
    console.log('onClickOrgDelete run');
    // modal open
    const orgDeleteConfirmModal = document.querySelector('#org-delete-cofirm-modal');
    orgDeleteConfirmModal.classList.remove('slds-hidden');
    orgDeleteConfirmModal.classList.add('slds-fade-in-open');
    // backDrop open
    const divOrgModalBackdrop = document.querySelector('#org-delete-backdrom');
    divOrgModalBackdrop.classList.add('slds-backdrop_open');
    //  // 1. orgLink(=currentTarget)에서 가장 가까운 section 찾기
     const section = event.currentTarget.closest('section.slds-accordion__section');
    //  // 2. folderId 읽기
     const folderId = section ? section.dataset.folderId : null;
     const orgRow = event.currentTarget.closest('div.org-row');
     const orgId = orgRow.dataset.orgId;
     targetFolderId = folderId;
     targetOrgId = orgId;
  }
  async function onClickOrgEdit(event){
    console.log('onClickOrgEdit run');
    const section = event.currentTarget.closest('section.slds-accordion__section');
    // 2. folderId 읽기
    const folderId = section ? section.dataset.folderId : null;
    const orgRow = event.currentTarget.closest('div.org-row');
    const orgId = orgRow.dataset.orgId;
    targetOrgId = orgId;
    targetFolderId = folderId;
    console.log('folderId :: '+folderId);
    console.log('orgId :: '+orgId);
    const folder = (await getStorage(folderId))[folderId];
    console.log('folder :: ');
    console.log(folder);
    let targetOrg = {};
    for(const tempOrg of folder.ORGs){
        if(tempOrg.Id == orgId){
            targetOrg = tempOrg;
            break;
        }
    }
    console.log('targetOrg :: ');
    console.log(targetOrg);
    const sectionOrgModal = document.querySelector('#org-modal');
    // 그 안에서 텍스트 span 찾아서 값 가져오기
    sectionOrgModal.dataset.folderId = folderId;
    console.log('sectionModal.dataset.folderId :: '+sectionOrgModal.dataset.folderId);
    sectionOrgModal.querySelector('#org-name').value = targetOrg.Name;
    sectionOrgModal.querySelector('#org-type-value').dataset.value = targetOrg.OrgType;
    sectionOrgModal.querySelector('#org-type-value').textContent = targetOrg.OrgType;
    sectionOrgModal.querySelector('#org-username').value = targetOrg.UserName;
    sectionOrgModal.querySelector('#password').value = targetOrg.Password;
    sectionOrgModal.querySelector('#org-description').value = targetOrg.Description;
    // modal open
    sectionOrgModal.classList.remove('slds-hidden');
    sectionOrgModal.classList.add('slds-fade-in-open');
    // backDrop open
    const divOrgModalBackdrop = document.querySelector('#add-org-backdrop');
    divOrgModalBackdrop.classList.add('slds-backdrop_open');
  }
function onClickOrgRow(event){
    event.stopPropagation();
}
function onClickSection(event){
    event.stopPropagation();
    console.log('onClickSection run');
    const target = event.currentTarget.closest('.slds-accordion__section');
    if (target.classList.contains('slds-is-open')) {
        target.classList.remove('slds-is-open');
    } else {
        target.classList.add('slds-is-open');
    } 
}
function onClickDropDownDiv(event){
    event.stopPropagation();
    console.log('onClickDropDownDiv run');
    const target = event.currentTarget;
    if(target.classList.contains('slds-is-open')){
        target.classList.remove('slds-is-open');
    }else{
        target.classList.add('slds-is-open');
    }
}
function onClickDropDownEdit(event){
    // event.stopPropagation();
    console.log('onClickDropDownEdit run');
    const rootSection = event.currentTarget.closest('.slds-accordion__section');
    console.log(rootSection);
    const folderId = rootSection.dataset.folderId;
    // 그 안에서 텍스트 span 찾아서 값 가져오기
    const summarySpan = rootSection.querySelector('.slds-accordion__summary-content');
    const folderName = summarySpan?.textContent?.trim();
    const sectionModal = document.querySelector('#forlder-edit-modal');
    sectionModal.dataset.folderId = folderId;
    console.log('sectionModal.dataset.folderId');
    console.log(sectionModal.dataset.folderId);
    const inputFolderName = sectionModal.querySelector('#folder-name');
    // input에 folder set
    if(folderName) inputFolderName.value = folderName; 
    // modal open
    sectionModal.classList.remove('slds-hidden');
    sectionModal.classList.add('slds-fade-in-open');
    // backDrop open
    const divEditBackdrop = document.querySelector('#folder-edit-backdrop');
    divEditBackdrop.classList.add('slds-backdrop_open');
}
function onClickFolderModalX(event){
    const section =event.currentTarget.closest('#forlder-edit-modal');
    const divEditBackdrop = document.querySelector('#folder-edit-backdrop');
    const folderName = document.querySelector('#folder-name');
    folderName.value = null;
    section.querySelectorAll('.slds-has-error').forEach(el => el.classList.remove('slds-has-error'));
    section.querySelectorAll('.slds-form-element__help').forEach(el => el.remove());   
    section.classList.add('slds-hidden');
    section.classList.remove('slds-fade-in-open');
    divEditBackdrop.classList.remove('slds-backdrop_open');
}
function onClickFolderModalClose(event){
    console.log('onClickFolderModalClose run');
    console.log(event.currentTarget);
    const section = event.currentTarget.closest('#forlder-edit-modal');
    const divEditBackdrop = document.querySelector('#folder-edit-backdrop');
    const folderName = document.querySelector('#folder-name');
    folderName.value = null;
    section.querySelectorAll('.slds-has-error').forEach(el => el.classList.remove('slds-has-error'));
    section.querySelectorAll('.slds-form-element__help').forEach(el => el.remove());
    console.log('folderName.value :: '+folderName.value);
    section.classList.add('slds-hidden');
    section.classList.remove('slds-fade-in-open');
    divEditBackdrop.classList.remove('slds-backdrop_open');
}
async function onClickFolderSave(event){
    console.log('onClickFolderAdd run');
    // folder-modal-add-button
    const section = event.currentTarget.closest('#forlder-edit-modal');
    const divEditBackdrop = document.querySelector('#folder-edit-backdrop');
    const folderModal = event.currentTarget.closest('#forlder-edit-modal');    
    const folderId = folderModal.dataset.folderId;
    const inputValue = folderModal.querySelector('input').value;
    console.log('inputValue :: '+inputValue);
    let isRequired = false;
    if(inputValue == undefined || inputValue == null || inputValue ==''){
        console.log('조건 맞음')
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
    console.log(isRequired);
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
        folderModal.querySelector('input').value = null;
        folderSpan.textContent = inputValue;
        // data update
        const result = await getStorage(folderId);
        const folder = result[folderId];
        folder.Name = inputValue;
        await setStorage(folderId,folder);
        section.classList.add('slds-hidden');
        section.classList.remove('slds-fade-in-open');
        divEditBackdrop.classList.remove('slds-backdrop_open');
    }else{ // 새로 생성
        const inputValue = folderModal.querySelector('input').value;
        folderModal.querySelector('input').value = null;
        const folder = new Folder('fol_'+generateRandomId(12),[],inputValue,folderSize+1);

        await setStorage(folder.Id,folder);
        section.classList.add('slds-hidden');
        section.classList.remove('slds-fade-in-open');
        divEditBackdrop.classList.remove('slds-backdrop_open');
        renderFolderList();
    }
    
}
function onClickGroundFolderAdd(event){
    console.log('onClickGroundFolderAdd run');
    console.log(event.currentTarget);
    const section = document.querySelector('#forlder-edit-modal');
    // section.querySelector('#folder-name').value = null;
    // modal open
    section.classList.remove('slds-hidden');
    section.classList.add('slds-fade-in-open');
    // backDrop open
    const divEditBackdrop = document.querySelector('#folder-edit-backdrop');
    divEditBackdrop.classList.add('slds-backdrop_open');

}
function onClickDropDownOrgAdd(event){
    // event.stopPropagation();
    console.log('onClickDropDownOrgAdds run');
    const sectionOrgModal = document.querySelector('#org-modal');
    const rootSection = event.currentTarget.closest('.slds-accordion__section');
    console.log(rootSection);
    const folderId = rootSection.dataset.folderId;
    // 그 안에서 텍스트 span 찾아서 값 가져오기
    const sectionModal = document.querySelector('#org-modal');
    sectionModal.dataset.folderId = folderId;
    console.log('sectionModal.dataset.folderId :: '+sectionModal.dataset.folderId);
    // modal open
    sectionOrgModal.classList.remove('slds-hidden');
    sectionOrgModal.classList.add('slds-fade-in-open');
    // backDrop open
    const divOrgModalBackdrop = document.querySelector('#add-org-backdrop');
    divOrgModalBackdrop.classList.add('slds-backdrop_open');
}
function onClickOrgTypeDropdown(event){
    console.log('onClickOrgTypeDropdown run');
    const divCombobox = event.currentTarget.querySelector('.slds-combobox');
    if(divCombobox.classList.contains('slds-is-open')){
        console.log('제거');
        divCombobox.classList.remove('slds-is-open');
        console.log('after divCombobox');
        console.log(divCombobox);
    }else{
        console.log('추가');
        divCombobox.classList.add('slds-is-open');
    }
}
function onClickUlOrgType(event){
    event.stopPropagation();
    console.log('onClickUlOrgType run');
    const span = event.target;
    const orgTypeValue = document.querySelector('#org-type-value');
    console.log('orgTypeValue');
    console.log(orgTypeValue);
    orgTypeValue.textContent = span.textContent.trim();
    console.log('span.textContent.trim()');
    console.log(span.textContent.trim());
    console.log('span.dataset.value');
    console.log(span.dataset.value);
    orgTypeValue.dataset.value = span.textContent.trim();
    const divOrgTypeCombobox = document.querySelector('#org-type-dropdown .slds-combobox');
    divOrgTypeCombobox.classList.remove('slds-is-open');

}
function onClickButtonOrgModalX(event){
    console.log('onClickButtonOrgModalX run');
    console.log('event.currentTarget');
    console.log(event.currentTarget);
    const divOrgModal =event.currentTarget.closest('#org-modal');
    const divOrgBackdrop = document.querySelector('#add-org-backdrop');        
    const sectionOrgModal = event.currentTarget.closest('#org-modal');    
    sectionOrgModal.querySelector('#org-name').value = null;
    sectionOrgModal.querySelector('#org-type-value').dataset.value = null;
    sectionOrgModal.querySelector('#org-type-value').textContent = '선택해주세요.';
    sectionOrgModal.querySelector('#org-username').value = null;
    sectionOrgModal.querySelector('#password').value = null;
    sectionOrgModal.querySelector('#org-description').value = null;
    
    sectionOrgModal.querySelectorAll('.slds-has-error').forEach(el => el.classList.remove('slds-has-error'));
    sectionOrgModal.querySelectorAll('.slds-form-element__help').forEach(el => el.remove());
    divOrgModal.classList.add('slds-hidden');
    divOrgModal.classList.remove('slds-fade-in-open');
    divOrgBackdrop.classList.remove('slds-backdrop_open');
}
function onClickButtonOrgModalClose(event){
    console.log('onClickButtonOrgModalClose run');
    console.log(event.currentTarget);
    const sectionOrgModal = event.currentTarget.closest('#org-modal');    
    sectionOrgModal.querySelector('#org-name').value = null;
    sectionOrgModal.querySelector('#org-type-value').dataset.value = null;
    sectionOrgModal.querySelector('#org-type-value').textContent = '선택해주세요.';
    sectionOrgModal.querySelector('#org-username').value = null;
    sectionOrgModal.querySelector('#password').value = null;
    sectionOrgModal.querySelector('#org-description').value = null;
    sectionOrgModal.querySelectorAll('.slds-has-error').forEach(el => el.classList.remove('slds-has-error'));
    sectionOrgModal.querySelectorAll('.slds-form-element__help').forEach(el => el.remove());
    const divOrgBackdrop = document.querySelector('#add-org-backdrop');        
    

    sectionOrgModal.classList.add('slds-hidden');
    sectionOrgModal.classList.remove('slds-fade-in-open');
    divOrgBackdrop.classList.remove('slds-backdrop_open');
}
async function onClickOrgModalSave(event){
    console.log('onClickOrgModalSave run');
    const sectionOrgModal = event.currentTarget.closest('#org-modal');    
    const folderId = sectionOrgModal.dataset.folderId;
    const folder = (await getStorage(folderId))[folderId];
    const orgName = sectionOrgModal.querySelector('#org-name').value;
    const orgType = sectionOrgModal.querySelector('#org-type-value').dataset.value;
    const userName = sectionOrgModal.querySelector('#org-username').value;
    const password = sectionOrgModal.querySelector('#password').value;
    const description = sectionOrgModal.querySelector('#org-description').value;
    let isRequired = false;
    console.log('orgName :: '+orgName);
    console.log('orgType :: '+orgType);
    console.log('userName :: '+userName);
    console.log('password :: '+password);
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
            console.log(orgNameForm.querySelector('.slds-form-element__help'));
            orgNameForm.querySelector('.slds-form-element__help').remove();
        }
    }
    if(orgType == undefined || orgType == null || orgType == ''){
        console.log('orgType 걸림');
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
        const orgTypeDiv = document.querySelector('#org-name-div');
        const orgTypeForm = document.querySelector('#org-name-form');
        if(orgTypeDiv.classList.contains('slds-has-error')){
            orgTypeDiv.classList.remove('slds-has-error');
            orgTypeForm.querySelector('.slds-form-element__help').remove();
        }
    }
    if(userName == undefined || userName == null || userName ==''){
        console.log('userName 걸림');
        if(!isRequired) isRequired = true;
        const userNameDiv = document.querySelector('#user-name-div');
        if(!userNameDiv.classList.contains('slds-has-error')){
            const userNameForm = document.querySelector('#user-name-form');
            userNameDiv.classList.add('slds-has-error');
            const errorMessage = createDom('div',['slds-form-element__help']); // TODO edit onclick이벤트 필요
            errorMessage.textContent = '사용자 이름을 입력해 주세요.';
            userNameForm.appendChild(errorMessage);
        }
    }else{
        const userNameDiv = document.querySelector('#org-name-div');
        const userNameForm = document.querySelector('#org-name-form');
        if(userNameDiv.classList.contains('slds-has-error')){
            userNameDiv.classList.remove('slds-has-error');
            userNameForm.querySelector('.slds-form-element__help').remove();
        }
    }
    if(password == undefined || password == null || password == ''){
        console.log('password 걸림');
        if(!isRequired) isRequired = true;
        const passwordDiv = document.querySelector('#password-div');
        if(!passwordDiv.classList.contains('slds-has-error')){
            const passwordForm = document.querySelector('#password-form');
            passwordDiv.classList.add('slds-has-error');
            const errorMessage = createDom('div',['slds-form-element__help']); // TODO edit onclick이벤트 필요
            errorMessage.textContent = '비밀번호를 입력해 주세요.';
            passwordForm.appendChild(errorMessage);
        }
    }else{
        const passwordDiv = document.querySelector('#org-name-div');
        const passwordForm = document.querySelector('#org-name-form');
        if(passwordDiv.classList.contains('slds-has-error')){
            passwordDiv.classList.remove('slds-has-error');
            passwordForm.querySelector('.slds-form-element__help').remove();
        }
    }
    if(isRequired) return;
    sectionOrgModal.querySelectorAll('.slds-has-error').forEach(el => el.classList.remove('slds-has-error'));
    sectionOrgModal.querySelectorAll('.slds-form-element__help').forEach(el => el.remove());
    const url = getOrgLoginUrl(orgType);
    console.log('orgName :: '+orgName);
    console.log('orgType :: '+orgType);
    console.log('userName :: '+userName);
    console.log('password :: '+password);
    console.log('description :: '+description);
    console.log('url :: '+url);
    console.log('targetOrgId :: '+targetOrgId);
// edit
    if(targetOrgId){
        console.log('edit');
        const org = new ORG(targetOrgId,folderId,orgName,orgType,url,userName,password,description);
        console.log('org :: ');
        console.log(org);
        // TODO 이거 folder 안에 들어있는 ORGs가 안 바뀌는거 같음. 확인해 봐야 함
        for(let index in folder.ORGs){
            if(folder.ORGs[index].Id == targetOrgId){
                console.log('targetOrg 발견');
                folder.ORGs[index] = org;
                break;
            }
        }
        console.log('folder :: ');    
        console.log(folder);
    }else{ // new           
        console.log('new');
        const orgId ='org_'+ generateRandomId(12);
        const org = new ORG(orgId,folderId,orgName,orgType,url,userName,password,description);
        folder.ORGs.push(org);
    }

    await setStorage(folderId,folder);
    sectionOrgModal.querySelector('#org-name').value = null;
    sectionOrgModal.querySelector('#org-type-value').dataset.value = null;
    sectionOrgModal.querySelector('#org-type-value').textContent = '선택해주세요.';
    sectionOrgModal.querySelector('#org-username').value = null;
    sectionOrgModal.querySelector('#password').value = null;
    sectionOrgModal.querySelector('#org-description').value = null;
    const divOrgModal =document.querySelector('#org-modal');
    const divOrgBackdrop = document.querySelector('#add-org-backdrop');    
    divOrgModal.classList.add('slds-hidden');
    divOrgModal.classList.remove('slds-fade-in-open');
    divOrgBackdrop.classList.remove('slds-backdrop_open');
    targetOrgId = null;
    renderFolderList();
}
function getOrgLoginUrl(orgType){
    console.log('orgType :: '+orgType);
    let result;
    if(orgType == '운영') result = 'https://login.salesforce.com';
    else if(orgType == '샌드박스') result = 'https://test.salesforce.com';
    else if(orgType == 'SDO') result = 'https://login.salesforce.com';
    else if(orgType == '데브') result = 'https://login.salesforce.com';
    return result;
}
async function renderFolderOptions() {
    const selectElement = document.getElementById('what-folder');

    if (!selectElement) {
        console.error('what-folder 요소를 찾을 수 없습니다.');
        return;
    }

    // 기존 옵션 제거
    selectElement.textContent = '';

    // 모든 폴더 데이터 가져오기
    const allStorages = Object.values(await getStorage(null));
    const folders = [];
    for(const storage of allStorages){
        if(storage.Id != undefined && storage.Id.startsWith('fol')){
            folders.push(storage);
        }
    }
    if (folders.length === 0) {
        console.warn('저장된 폴더가 없습니다.');
        return;
    }

    // 기본 선택 옵션 추가
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '폴더를 선택하세요';
    defaultOption.disabled = true;
    defaultOption.selected = true;
    selectElement.appendChild(defaultOption);

    // 폴더 리스트 옵션 추가
    for(const folder of folders){
        const option = document.createElement('option');
        option.value = folder.Id;
        option.textContent = folder.Name;
        selectElement.appendChild(option);
    }
}

async function orgLinkClick(event){
    console.log('orgLinkClick run');
    event.preventDefault(); // 기본 이동 동작 막기
    // 1. orgLink(=currentTarget)에서 가장 가까운 section 찾기
    const section = event.currentTarget.closest('section.slds-accordion__section');
    // 2. folderId 읽기
    const folderId = section ? section.dataset.folderId : null;
    const orgRow = event.currentTarget.closest('div.org-row');
    const orgId = orgRow.dataset.orgId;
    const folder = (await getStorage(folderId))[folderId];
    let targetOrg = {};
    for(const tempOrg of folder.ORGs){
        if(tempOrg.Id == orgId){
            targetOrg = tempOrg;
            break;
        }
    }
    targetOrg.URL = targetOrg.URL +'?' +encode('folderId')+'='+encode(folderId)+'&'+encode('orgId') + '=' + encode(orgId);
    window.open(targetOrg.URL, "_blank");
}
function encode(string){
    return btoa(unescape(encodeURIComponent(string))).replace(/=+$/, '');
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

function generateRandomId(length) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    const randomPart = Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, length);
    const timestamp = Date.now().toString();
    return timestamp + randomPart;
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
          const filteredOrgs = (f.orgs || []).filter(o => includesIC(o.name, q));
          if (folderMatches) return { ...f, orgs: f.orgs.slice() }; // 폴더명이 맞으면 전부 표시
          return { ...f, orgs: filteredOrgs };
        })
        .filter(f => f.orgs.length > 0 || includesIC(f.name, q));
    }
  
    // rrenderFolderList가 없을 때 DOM만으로 필터링(숨김/표시)
    function domFilter(query) {
      const q = (query || '').trim();
      document.querySelectorAll(ACCORDION_LIST_SELECTOR).forEach(li => {
        const folderName = (li.querySelector(FOLDER_NAME_SELECTOR)?.textContent || '').trim();
        const folderMatched = includesIC(folderName, q);
        let matchedOrgs = 0;
  
        li.querySelectorAll(ORG_ROW_SELECTOR).forEach(row => {
          const orgName = (row.querySelector(ORG_NAME_IN_ROW_SELECTOR)?.textContent || '').trim();
                // 규칙:
        // - 검색어가 비어있으면 전부 표시
        // - 폴더명이 매치되면 폴더 내 전체 표시
        // - 폴더명이 매치되지 않으면, 오그명이 매치된 row만 표시
        const match = !q ? true : (folderMatched ? true : includesIC(orgName, q));
          row.style.display = match ? '' : 'none';
          if (match) matchedOrgs++;
        });
  
        const showFolder = !q || folderMatched || matchedOrgs > 0;
        li.style.display = showFolder ? '' : 'none';
      });
    }
  
    function filterAndRender(query) {
      // 1) 데이터 → rrenderFolderList 경로
      if (typeof window.rrenderFolderList === 'function') {
        if (!window.__fullDatasetForSearch) {
          window.__fullDatasetForSearch = captureDatasetFromDOM(); // 초기 1회 스냅샷
        }
        const filtered = filterData(query, window.__fullDatasetForSearch);
        try {
          // 필요시 rrenderFolderList 시그니처에 맞춰 파라미터만 조정
          window.rrenderFolderList(filtered);
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
    }
  
    // popup.html에서 스크립트가 본문 이후에 로드되므로 즉시 init 가능
    try { initLiveSearch(); } catch (_) {}
  })();