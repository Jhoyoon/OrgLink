# 오그 바로가기

## 릴리즈 노트
### v1.22
- 파비콘 버그 수정
- 설정 모달 잔여 스토리지 용량 표시
- 설정 모달 사용성 아코디언 추가
- 북마크 기능 추가
- 오그 및 북마크 파비콘 표시 추가
### v1.21
- 아이콘 표시 안 되던 버그 수정

### v1.2

- 기존에 설명 필드에 1000자 이상 적어놨을시 데이터가 잘리게 됩니다.

#### 추가 및 변경된 사항들
- **탭 아이콘 색깔 설정**: 오그별로 아이콘 색상을 지정할수 있습니다.
- **탭 그룹 기능**: 오그별로 탭 그룹을 자동 생성하고 색상을 지정할수 있습니다.
- **Security Token 필드 추가**: 오그별 보안 토큰을 저장할수 있게 됐습니다. 입력 할시, 2차 인증(MFA, email)이 필요치 않습니다.
- **드래그 앤 드랍 개선**: 오그를 다른 폴더로 드래그 앤 드랍 할수 있습니다.
- **용량 제한 설정**: 폴더 최대 10개, 오그 총 200개로 제한됩니다. 데이터 양에 따라 200개보다 적을수 있으며, 한도 도달시 설명 필드의 내용을 줄여주세요.
- **정보 내보내기, 가져오기**: 저장된 데이터를 파일로 내보낼수 있고, 가져올수 있습니다.

---

#### TODO
- 2.23 추가 내용들
  - 확장 프로그램 자체 제한 이외의 모든 제한들 해제
  - 설정 모달 아코디언 border 통일
  - 탭 그룸 기능 사용시, 이전 그룹 내역 안 남도록 수정
    - Claude 확장 프로그램 기능 참조
- 테스트 사용자 로그인 세션 분리
  - 구현 가능한걸까
- 언어 선택
  - 설정 모달 언어 선택 picklist 추가
  - English, 한국어
  - default 한국어
  - 모든 화면 표시 라벨에 대한 언어 분리 필요
- 오그 테마 브랜드 이미지로 파비콘 설정
  - 최초 오그 저장시, 비동기로 get thema brand image api 호출. 응답을 기다리지 말것
  - 저장시, 직후에는 기본 오그 파비콘 표시
  - 이후 thema brand image 응답 받을시, canvas 리사이즈 => base64 JPEG => CachedFavicon 저장
  - 이후 화면 재렌더링 및 로그인 시도시 해당 파비콘 설정
  - 테마 이미지 수동 갱신 버튼 추가
## Privacy Policy
This Chrome extension ("the Extension") is developed and published by hooon Jung.

Information Collection and Use
•	The Extension only collect Salesforce login information
•	All data processed by the Extension remains on the user’s device and is not transmitted to external servers.

Permissions

The Extension may request limited permissions such as:
•	Storage: To save user's salesforce login information locally.

These permissions are used solely for the Extension’s operation and are not used to collect personal data.

Third-Party Services

The Extension does not integrate with or share data with third-party services.

Changes to This Policy

This Privacy Policy may be updated from time to time. Updates will be reflected on this page.

Contact

If you have any questions about this Privacy Policy, please contact:
📧 [junghoyoon505@gmail.com]
